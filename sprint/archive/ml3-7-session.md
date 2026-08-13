---
story_id: "ml3-7"
jira_key: "ml3-7"
epic: "ml3"
workflow: "tdd"
---
# Story ml3-7: Enroll citation claims for the ml3-3 mushroom reducers

## Story Details
- **ID:** ml3-7
- **Jira Key:** ml3-7
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** gitflow (feat/ml3-7-enroll-ml3-3-mushroom-reducer-claims)
- **Branch:** feat/ml3-7-enroll-ml3-3-mushroom-reducer-claims
- **PR:** https://github.com/slabgorb/arcade/pull/328

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-13T17:01:43Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-13T16:27:54Z | 2026-08-13T16:31:09Z | 3m 15s |
| red | 2026-08-13T16:31:09Z | 2026-08-13T16:42:38Z | 11m 29s |
| green | 2026-08-13T16:42:38Z | 2026-08-13T16:47:02Z | 4m 24s |
| review | 2026-08-13T16:47:02Z | 2026-08-13T17:01:43Z | 14m 41s |
| finish | 2026-08-13T17:01:43Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Conflict** (non-blocking): The story lists ROCK (MLDEF.MAC:204) as un-enrolled, but it is already claimed TWICE — BT-33 (beetle) and SC-51 (scroll), and SC-51 already frames it as the CMP I,70 count threshold the mushroom bookkeeping includes. Affects `plugins/millipede/docs/rom-study/claims/` (Dev enrolls NO new ROCK claim — reuse; the RED guard holds the set at `{BT-33, SC-51}`, mutation-proven). *Found by TEA during test design.*
- **Conflict** (non-blocking): The story lists the OBSTAC probe (MLSUB.MAC:887-889) as un-enrolled, but its defining AND-mask (MLSUB.MAC:888 "AND I,7F") is already claimed as BT-46 from the beetle side. Affects `plugins/millipede/docs/rom-study/claims/` (Dev reuses BT-46 for the mask; the :887 LDA / :889 RTS framing may optionally be added mushroom-side but is not required, and is NOT in the RED floor). *Found by TEA during test design.*
- **Improvement** (non-blocking): The four genuinely net-new mechanics are FULL_MUSHROOM (:741), MUSHER body (:738-769, beyond CW-61/62), MUSHDC body (:708-729, beyond CW-63's :707 header) and RESTOR (:919-949). The claim-file NAMING (extend `CW-*` in 08-conway.json vs a dedicated `MUSH-*` file) is left open — the RED filters by ROM line, not filename, so either lands green. *Found by TEA during test design.*

### Reviewer (code review)

- **Improvement** (non-blocking): The `.MAC$` half of the "every net-new reducer claim quotes a vendored .MAC file" guard is decorative — `reducerClaims()` already filters `source.file === 'MLSUB.MAC'` before the loop, so `toMatch(/\.MAC$/)` is tautological (mutation-proven: flipping MUSH-1 to `MLSUB.TXT` leaves that guard green and instead drops the claim from the population). Affects `plugins/millipede/tests/audit/mushroom-claims.test.ts:114-118` (strengthen it to iterate the raw `08-mushroom-field.json` entries — the palette-claims.test.ts:78-86 pattern — so a future non-.MAC MUSH claim is caught directly). Shipped claims are all correct .MAC, so this is a future-proofing gap, not a live defect. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- No spec deviations. The claim-file NAMING was an explicitly OPEN decision (story: "extend the 08/09 series"; TEA Improvement finding). Resolved by creating a dedicated `docs/rom-study/claims/08-mushroom-field.json` with a `MUSH-*` id series — sitting beside `08-conway.json` in the playfield series, matching the ml2-3 palette precedent of one file per study topic. The RED filters by ROM line (not filename), so this lands green either way; recording the choice here for the record, not as a deviation.

### Reviewer (audit)
- **Dev naming decision (dedicated `08-mushroom-field.json`, `MUSH-*` ids)** → ✓ ACCEPTED by Reviewer: extends the 08 series as the story asked, matches the ml2-3 palette precedent (one file per topic), no id collisions (MUSH-1..12 globally unique), no line-level overlap with CW-61/62/63 or BT-46. Sound.
- No undocumented spec deviations found: all 12 claims byte-match the vendored MLSUB.MAC, the claim prose accurately describes each cited mechanic, and ROCK/OBSTAC were reused (BT-33/SC-51/BT-46) rather than re-minted, exactly as the ACs and TEA findings required.

## Sm Assessment

**Routing:** ml3-7 (2pt, chore, tdd) → TEA for the RED phase. Phased workflow, next owner `tea`.

**Premise verified before setup (measured against the current tree):**
- The ml3-3 mushroom reducers in `plugins/millipede/src/core/mushroom.ts` ship with inline ROM comment cites but have NO claim entries — premise TRUE.
- The ml1-1 gate (`plugins/millipede/tools/audit/check-citations.mjs`) is SINGLE-SIDED: it byte-verifies each claim JSON entry against the vendored ROM (`historicalsource/millipede @ 29f3e05`); it does NOT scan comments for coverage. So this story ADDS verified claim entries — it is not satisfying a comment-coverage requirement.

**One wrinkle carried to TEA (see context AC-5):** ROCK@`MLDEF.MAC:204` is ALREADY claimed as **BT-33** in `09-beetle-spider.json` with identical verbatim. The clean resolution is to reuse/reference BT-33, not mint a byte-duplicate (the gate only requires unique `id`, so a duplicate would pass but be redundant). Not a backlog-shape question — a technical-design call for TEA/Architect. The other five (FULL_MUSHROOM=7F `MLSUB.MAC:741`, MUSHER `:732-772`, MUSHDC `:707-729`, RESTOR `:919-949`, OBSTAC probe `:887-889`) are genuinely un-enrolled. MUSHDC/MUSHER have conway-SIDE seam claims CW-61/62/63 (seam-declaration, deferred-to-ml3-3) — the reducer-MECHANIC claims here are a distinct proposition, not redundant. Highest existing id is CW-68; whether to continue `CW-*` or add a `MUSH-*` prefix is a naming decision left to the pipeline.

**Sibling contention:** clean. No remote branch existed for ml3-7 at setup; the only live session anywhere was a-1's ml4-4 (different story/files). Claim now pushed as `feat/ml3-7-enroll-ml3-3-mushroom-reducer-claims` for visibility.

**Setup verification (on disk):** session created; context accurate and non-self-contradictory; branch cut from `develop`; story stamped `in_progress` (sm-setup left it `backlog`).
## TEA Assessment

**Tests Required:** Yes
**Reason:** Data/claims story, but a "gate passes" assertion would be vacuous — the RED pins that the SPECIFIC net-new reducer mechanics gain byte-verifiable claims.

**Test Files:**
- `plugins/millipede/tests/audit/mushroom-claims.test.ts` — the CLAIMS arm for the ml3-3 mushroom reducers (mirrors the ml2-3 palette-claims pattern: floor + per-mechanic anchors + byte-verify + GPL guard + dedup guards).

**Tests Written:** 9 tests. RED split verified DIRECTLY (not via testing-runner — confabulation risk): **5 failed | 4 passed**, isolated to this file (full millipede project: 5 failed | 606 passed, zero regressions).

- **RED teeth (5, go green when Dev enrolls claims):** floor ≥4 net-new; FULL_MUSHROOM (:741); MUSHER body (:738-769); MUSHDC body (:708-729); RESTOR (:919-949). Each window verified byte-for-byte against the vendored MLSUB.MAC this session.
- **Green guards (4):** byte-verify + vendored-only (.MAC/GPL) gain teeth on populate; ROCK dedup `{BT-33, SC-51}` and OBSTAC dedup `BT-46` — **both mutation-tested** (added a spurious 3rd ROCK claim → ROCK guard RED; renamed BT-46 → OBSTAC guard RED; restored from scratchpad backup, tree clean).

**Status:** RED (failing — ready for Dev)

### Rule Coverage

| Rule (lang-review/typescript.md) | Test(s) | Status |
|------|---------|--------|
| #15 assert the COUNT/claim, not a token; guards mutation-tested | floor `≥4` asserted first; dedup guards mutation-proven | teeth proven |
| #18 apparatus fails-by-passing; helper reimplements platform algo | byte-verify duplicates the gate's compare, scoped narrow to localize a RED; noted as a localizer, whole-gate `citations.test.ts` remains authoritative | acknowledged |
| #19 population filtered by neighbouring field | `reducerClaims()` filters file+line-window+id; windows verified vs vendored source; contaminants MT-*/MS-*/BT-46 fall outside all 4 windows | verified |

Most TS lang-review checks (validated constructors, enum exhaustiveness, Deserialize bypass, private fields, tenant context) are **N/A** — ml3-7 ships no new source code, only JSON claim data and a test.
**Rules checked:** 3 of 3 applicable test-apparatus rules covered.
**Self-check:** 0 harmful vacuous tests. The two pass-on-empty guards (byte-verify, vendored-only) iterate real data and are documented as populate-time teeth, not `assert(true)`.

**Handoff:** To Dev (Korben) for GREEN — author the claim JSON for the four net-new mechanics (generated from vendored bytes, never hand-typed; ml1-2 lesson). Reuse BT-33/SC-51 for ROCK and BT-46 for the OBSTAC mask — enroll NO duplicates. See Delivery Findings for the two dedup Conflicts and the open naming decision.
## Dev Assessment

**Status:** GREEN — all 5 RED teeth pass; zero regressions.

**Implemented:** `plugins/millipede/docs/rom-study/claims/08-mushroom-field.json` — 12 claims (MUSH-1..12), the CLAIMS arm for the ml3-3 mushroom-field reducers. **Generated from vendored MLSUB.MAC bytes** (`scratchpad/gen-mushroom-claims.py` pulls each line by number → verbatim is byte-correct by construction; the ml1-2 "never hand-type" lesson), then byte-verified.

| Mechanic | Claims | ROM lines |
|----------|--------|-----------|
| FULL_MUSHROOM | MUSH-1 | :741 |
| MUSHER (presence / top-row / player-row / row-band INC) | MUSH-2..5 | :740, :747, :760, :767 |
| MUSHDC (row-mask / middle-band skip / DEC) | MUSH-6..8 | :712, :725, :728 |
| RESTOR (frame gate / pexpld / cdone / restore-to-full) | MUSH-9..12 | :925, :927, :929, :949 |

**Dedup honored (per TEA Delivery Findings):** enrolled NO ROCK claim (reused BT-33 + SC-51) and NO OBSTAC-mask claim (reused BT-46). The two mutation-tested dedup guards stay green.

**Verification (run directly):**
- Story suite `tests/audit/mushroom-claims.test.ts`: **9 passed** (was 5 failed).
- Whole-gate `tests/audit/citations.test.ts`: **25 passed** — the new claims byte-verify against the vendored source alongside every other claim.
- Full millipede project: **611 passed / 26 files**, zero regressions (was 606 + 5 failing).
- `npm run lint` (repo-wide `tsc --noEmit`): clean.

**Note on the ';EVERY 16 FRAMES' comment (MUSH-9, :925):** the ROM comment says 16 but the mask is `AND I,03` = every 4th frame. MUSH-9's claim text states the true cadence (mask 03) and attributes the "16" to the ROM author — consistent with the ml3-3 behaviour suite's own observation.

**Handoff:** To Reviewer (Zorg) for code review.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — GREEN 611/611, lint clean, no smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (window boundaries + empty-population verified) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (no error handling / no swallowed errors in diff) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered (vacuous `.MAC$` sub-assertion found; substantive guards mutation-proven) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — **hand-covered (primary domain): all 12 claim prose descriptions verified accurate vs vendored ROM** |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered (local Claim interface matches palette idiom; no stringly-typed issues) |
| 7 | reviewer-security | Yes | clean | none | N/A — no path traversal, .MAC-only (GPL), no secrets; runtime vuln classes N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered (12 claims proportionate; redundant PREEXISTING entries are harmless belt-and-suspenders) |
| 9 | reviewer-rule-checker | Yes | findings | 1 substantive | confirmed 1 (vacuous `.MAC$` guard, MEDIUM), independently reproduced by mutation |

**All received:** Yes (3 enabled returned: preflight clean, security clean, rule-checker 1 finding; 6 disabled pre-filled and hand-covered)
**Total findings:** 1 confirmed (MEDIUM, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** the 12 new claim objects in `08-mushroom-field.json` → `loadClaims()` globs `claims/*.json` → the ml1-1 gate (`check-citations.mjs`) byte-verifies each `verbatim` against the vendored `MLSUB.MAC` at its cited line, and the whole-gate `citations.test.ts` re-runs that verification (25/25 green). Safe: static citation data, no runtime surface, no user input.

**Independent claim-prose audit (the comment/citation domain — its specialist is disabled, so hand-covered as the highest-value check):** I opened every cited line in the vendored `MLSUB.MAC` with surrounding context and confirmed all 12 claim descriptions are accurate:
- [VERIFIED] MUSHER MUSH-1..5 — FULL_MUSHROOM load (:741), presence no-op AND 7F/BNE (:740), row-1F exclusion (:747), player-row-01 exclusion correctly from the upright `5$` path (:760), row-band INC (:767). Evidence: MLSUB.MAC:737-772.
- [VERIFIED] MUSHDC MUSH-6..8 — row mask AND 1F (:712), middle-band `[0C,14)` skip `BCC 10$`→RTS with no DEC (:725), DEC X,MUSH (:728). Evidence: MLSUB.MAC:711-729; the middle-band-uncounted behaviour is real.
- [VERIFIED] RESTOR MUSH-9..12 — frame gate (:925) with the claim **correctly disclosing** the mask is `AND 03` = every 4th frame despite the ROM's ";EVERY 16 FRAMES" comment; pexpld (:927) and cdone (:929) gates; restore-to-full AND 80/ORA 7F/STA (:949). Evidence: MLSUB.MAC:922-949.

**Confirmed findings (tagged by source):**
- [TEST] [RULE] [MEDIUM] The `.MAC$` half of the vendored-only guard is tautological — `reducerClaims()` pre-filters `source.file === 'MLSUB.MAC'`, so `expect(c.source.file).toMatch(/\.MAC$/)` can never fail. Mutation-proven by rule-checker AND independently reproduced by me (MUSH-1 → `MLSUB.TXT`: the `.MAC$` guard stayed green; the claim dropped from the population and reddened the FULL_MUSHROOM window test instead). `plugins/millipede/tests/audit/mushroom-claims.test.ts:114-118`. Non-blocking (Medium): shipped claims are all correct `.MAC` and byte-verified; the substantive guards have teeth. Fix (future-proofing): iterate the raw `08-mushroom-field.json` entries like `palette-claims.test.ts:78-86`. Filed as a Delivery Finding.

**Hand-covered specialist domains (subagents disabled):**
- [EDGE] window boundaries (741; 738-769; 708-729; 919-949) and the empty-population case verified; contaminants MT-27..32/MS-1..6/BT-46 fall outside all four windows. No unhandled boundary.
- [SILENT] no try/catch, no fallbacks, no swallowed errors in the diff — N/A.
- [DOC] claim prose accuracy — the crux — fully audited above; all 12 accurate.
- [TYPE] local `Claim` interface mirrors the imported type (palette idiom, not new); `Record<string,(n:number)=>boolean>` properly typed; no `as any`/`!`/`@ts-ignore`.
- [SIMPLE] 12 claims is proportionate to four mechanics; the redundant `PREEXISTING` entries CW-62/CW-63 (outside their windows anyway) are harmless belt-and-suspenders, not over-engineering.
- [SEC] covered by reviewer-security (clean): bare `MLSUB.MAC` citations can't traverse (`check-citations.mjs:142-154` guard unmodified); `.MAC`-only honours the GPL wall; no secrets.

### Rule Compliance

| Rule | Applies to | Result |
|------|-----------|--------|
| ROM-citation claims quote vendored `.MAC` only (GPL) — data | all 12 MUSH claims | COMPLIANT — every claim cites MLSUB.MAC, byte-matches the vendored line |
| Claim ids globally unique | all claims | COMPLIANT — MUSH-1..12 unique, no collision across any claims file |
| No line-level duplication with existing claims | vs CW-61/62/63, BT-46, BT-33, SC-51 | COMPLIANT — zero overlap; ROCK/OBSTAC reused not re-minted |
| TS lang-review #15/#18/#19/#26 (guard teeth, apparatus, population filter) | mushroom-claims.test.ts | 8 of 9 assertions mutation-proven with teeth; 1 (`.MAC$`) tautological — see finding above |
| core/shell purity | N/A — no src/core or src/shell touched | N/A |

### Devil's Advocate

Argue this is broken. First: the suite could be green for the wrong reason — a `reducerClaims()` filter that silently excludes everything would make the floor and four window tests vacuously... no: they assert `>= 4` and `.some(...)===true`, which FAIL on an empty population (that was the RED state), so an over-narrow filter reddens rather than passes — checked. Second: a claim could byte-match its line yet describe the WRONG mechanic — the gate can't catch a plausible-but-wrong prose claim, so I read all 12 against the ROM by hand; the riskiest was MUSH-9 (the ";EVERY 16 FRAMES" comment vs `AND 03`), and the claim gets it right, calling out the discrepancy. Third: a malicious/careless editor could add a MUSH claim citing a MAME `.cpp` to smuggle GPL text past the wall — and here the devil scores a point: the `.MAC$` guard that should stop exactly that is tautological, so a `.cpp` citation on a multi-claim window (MUSHER/MUSHDC/RESTOR) would slip past this suite (though the whole-gate would ERROR on a missing file, and a single-anchor window like FULL_MUSHROOM would still redden). That is the confirmed Medium finding, not a new one. Fourth: could the restore claim (MUSH-12) mislead by omitting that RESTOR's `[70,7F)` gate arguably includes ROCK? The claim cites only the STA write and describes it faithfully; the gate lines (:942-945) are out of its scope and unclaimed here — a fair descope, not a falsehood. Fifth: line numbers drift if the vendored file is re-vendored — but the byte-match test pins verbatim to line, so drift reddens loudly. Net: one real future-proofing gap (the Medium), no live defect, no misdescribed claim.

**Pattern observed:** faithful reuse of the ml2-3 palette-claims pattern (per-topic file, floor + anchors + byte-verify + dedup guards) at `plugins/millipede/tests/audit/mushroom-claims.test.ts`.
**Error handling:** N/A — static citation data, no failure paths; the byte-verification gate reddens loudly on any mismatch.
**Handoff:** To SM for finish-story.