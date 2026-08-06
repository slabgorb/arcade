---
story_id: mc2-4
jira_key: mc2-4
epic: mc2
workflow: tdd
---
# Story mc2-4: O-4: pin the actual starting-city count

## Story Details
- **ID:** mc2-4
- **Jira Key:** mc2-4
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** none
- **PR:** https://github.com/slabgorb/arcade/pull/23 (MERGED into develop)
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T19:51:28Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T19:09:35Z | 2026-08-06T19:12:32Z | 2m 57s |
| red | 2026-08-06T19:12:32Z | 2026-08-06T19:27:24Z | 14m 52s |
| green | 2026-08-06T19:27:24Z | 2026-08-06T19:34:46Z | 7m 22s |
| review | 2026-08-06T19:34:46Z | 2026-08-06T19:51:28Z | 16m 42s |
| finish | 2026-08-06T19:51:28Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA][Question→resolved, non-blocking]** O-4 answer measured from source: the REV-01
  default starting count is **6** = `STCITY[0]` (`OPTIO2 & SCITYM` = 0), read at NEW GAME
  SETUP (`W3MAIN.MAC:3869` `LDA OPTIO2` → `:3871` `AND I,SCITYM` → `:3877` `LDA AY,STCITY`).
  The option field selects among `STCITY: .BYTE 6,4,5,7` (`W3MAIN.MAC:3895`) → {0:6, 1:4,
  2:5, 3:7}, with matching alive-city bitmasks `STCIMA: .BYTE 0FC,0E8,0F8,0FC` (`:3897`).
- **[TEA][Gap, non-blocking for mc2-4 / relevant to mc3]** `NCITY=6` (W3COMN:39) is the MAX
  and coincides with the default start count, but they are DISTINCT facts. SCITYM's
  ";5 CITIES AT START" comment names the **Y=2 option** (`STCITY[2]=5`), NOT the default —
  a documentation trap the note must call out. mc3's "all cities gone" end-game counts down
  from the per-game `STCITY[Y]`, not from NCITY.
- **[TEA][Improvement, non-blocking]** The second `AND I,SCITYM` (`W3INT.MAC:1291`) sits
  under `.SBTTL DISPLAY OPTIONS` (self-test options screen) and only reads STCITY to DISPLAY
  the setting — it is NOT a gameplay start path. NEW GAME SETUP is the one authoritative site.
- **[TEA][Improvement, non-blocking]** `STCIMA` (`:3897`) is the alive-city BITMASK paired
  with the count — likely useful to mc3 damage/end-game (which city slots are occupied at
  start), though mc2-4 only pins the COUNT.

### Dev (implementation)
- **Improvement** (non-blocking): `START_CITIES = 6` is now exported from `src/core/field.ts`
  (cited to `STCITY` / `W3MAIN.MAC:3895`, claim `MC-STCITY-START`) for mc3 to consume as the
  end-game countdown base. Affects mc3 damage/end-game (import `START_CITIES`, not `NCITY`).
- **Improvement** (non-blocking): the paired `STCIMA` alive-city bitmask (`W3MAIN.MAC:3897`,
  `.BYTE 0FC,0E8,0F8,0FC`) is documented in `starting-cities.md` but NOT yet pinned as a claim
  or exported — mc3 will likely want it. Affects `docs/rom-study/claims/field.json` + `field.ts`
  (add an STCIMA claim/export when mc3 needs which city slots start occupied).

### Reviewer (code review)
- **Improvement** (non-blocking): three RED-test guards in `starting-cities-docs.test.ts` are
  whole-file / bare-token scoped and can pass vacuously under a decoy (rule-checker `[RULE]`
  #15/#25, mutation-demonstrated) — `includes('6')` (L137, satisfied by `.RADIX 16` / a line
  cite), the glossary "points at resolution" `||` (L416, not scoped to O-4 lines), and the
  field.ts citation scan (L293, whole-file). Non-blocking because the value 6 and O-4
  coherence are ALSO pinned by mutation-resistant sibling assertions (byte-gated STCITY[0]
  re-derivation, the ordered `6,4,5,7` table, the claim `.toBe(6)`, `START_CITIES === 6`, and
  the `o4Lines`+STILL_OPEN coherence guard) — no claim is left as the sole responsibility of a
  weak guard. Affects `plugins/missile-command/tests/starting-cities-docs.test.ts` (scope L137
  to the "default…count is 6" sentence, L416 to `o4LinesOf(gloss)`, L293 to the START_CITIES
  region). A worthwhile fast-follow for a guardrail epic; not worth an extra rework round on a
  correct, fully-verified 2-pt story.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Registered STCITY in a sibling test's DERIVED set (edited a pre-existing test file)**
  - Spec source: tests/citations-source.test.ts (mc2-1), the `every claim value is the radix
    decode of its own verbatim` block; AC2 requires a committed claim.
  - Spec text: "EQU claims whose RHS is not a plain radix literal — value is derived/resolved
    and is checked explicitly below instead." `const DERIVED = new Set(['IVMAX','MAX_BLAST_RADIUS'])`
  - Implementation: Added `'STCITY'` to `DERIVED` and extended the explicit "derived values
    are internally consistent" test to assert the STCITY claim value is 6 and equals entry
    [0] of its `.BYTE` verbatim table.
  - Rationale: the STCITY claim's verbatim is a `.BYTE 6,4,5,7` table (no `=` RHS), so the
    generic auto-decode cannot parse it — identical to the existing OLDRAD/`MAX_BLAST_RADIUS`
    table claim, which is already in `DERIVED`. This is the test's documented extension point,
    not a weakening: value coverage is preserved (and strengthened) by the explicit check.
  - Severity: minor
  - Forward impact: none — future `.BYTE`-table claims follow the same DERIVED registration.
  - → ✓ **ACCEPTED by Reviewer**: correct and necessary. STCITY's verbatim is a `.BYTE`
    table with no `=` RHS, identical in shape to the already-registered `MAX_BLAST_RADIUS`
    (OLDRAD) claim; `DERIVED` is the documented extension point, not a weakening. The added
    explicit check (STCITY value 6 = entry [0] of the verbatim table) preserves and
    strengthens value coverage. Verified: 335/335 green, checker byte-verifies 38 claims.

### Reviewer (audit)
- No UNDOCUMENTED deviations. The one Dev deviation is accurate and accepted above. All ROM
  citations independently re-verified byte-for-byte against the vendored source; O-4 marked
  resolved coherently across brief.md/glossary.md/field.ts with the `O-4` tag preserved.
- **Process note (not a code finding):** the `reviewer-rule-checker` subagent overwrote the
  tracked `glossary.md` with a mutation probe. The tree was already clean by the time I
  checked (it self-restored); I additionally `git checkout HEAD --` it and confirmed an empty
  diff + 335/335 green. No lasting effect on the deliverable.

## Sm Assessment

**Routing:** tdd (phased) → hand off to TEA (Han Solo) for the RED phase. The phase
pointer read `setup` on arrival and is being advanced to red by the exit protocol.

**Contention probes (all clear):**
- No `feat/mc2-4-*` branch existed on origin before this setup — nobody owned the story.
- Sibling `.session/` sweep: a-1 on jt9-41, a-2 on sw8-22 — neither touches mc2-4.
- One open-looking PR (#19, sw8-22) is in fact `MERGED` on direct `gh pr view` — the
  `--state open` list was the stale-gh-cache phantom. No real blocking PR; merge gate clear.

**Premise verified against the current tree (so the copied context is ground truth, not
a stale claim):** every ROM citation in the description is real and coherent —
`W3COMN:39 NCITY=6` (the MAX), `W3COMN:195 SCITYM=03` (option-2 "5 cities" mask),
`.SBTTL SETUP STATE` at physical 561 (≈ logical 281), `.SBTTL NEW GAME SETUP` at physical
3831 (≈ logical 1916). O-4 is still listed OPEN in `docs/rom-study/brief.md:120-121`, so
the deliverable is genuinely unfinished work. This is an open question, not a stale fact —
correct to copy forward as-is.

Branch — `feat/mc2-4-pin-starting-city-count`, cut from `origin/develop`. repos.yaml is
authoritative: `branch_strategy: gitflow`, `default_branch: develop` (protected) — so the
claim (epic stamp + context) was committed on the feature branch and pushed, not committed
to develop. Story stamped `in_progress` (sm-setup left it `backlog`, as always).

**For TEA:** do NOT let the RED test presuppose an answer to O-4 — the story's job is to
DERIVE which of NCITY=6 / SCITYM=03 / MAME's default is the REV-01 starting count by
reading where the option is consumed (SETUP STATE / NEW GAME SETUP), then pin it as a
machine-verified claim. Honor the three citation traps recorded in the context: W3MAIN is
double-spaced (cite LOGICAL lines ≈ physical/2, anchor on `.SBTTL`), `.RADIX 16` at
W3COMN:1 (bare = hex, trailing `.` = decimal), and the `.MAC` files are CR-terminated
non-UTF8 (`grep -a`). AC2 wants the count expressed as a cited claim mc3's field.ts can
consume.

## Tea Assessment

**RED established and isolated.** New file `plugins/missile-command/tests/starting-cities-docs.test.ts`
(26 tests). Full missile-command project: **21 failing / 314 passing (335 total, 14 files)** —
the 21 failures are all in the new file; the pre-existing baseline (13 files) is green, so the
RED is cleanly attributable to mc2-4's absent feature. `npm run lint` (tsc --noEmit) is clean.
The 5 green tests in the new file are intentional floors/source-facts (see below), not vacuous.

**On SM's "don't presuppose the answer": derived, not presupposed.** I resolved O-4 from the
Atari macro-assembler before writing a single assertion, exactly the mc2-3 "measured, not
assumed" discipline. NEW GAME SETUP reads the start count as a TABLE LOOKUP, not a bare NCITY:
`LDA OPTIO2` (`W3MAIN.MAC:3869`) → `AND I,SCITYM` (`:3871`, SCITYM=03 masks the low 2 bits) →
`TAY` → `LDA AY,STCITY` (`:3877`), where `STCITY: .BYTE 6,4,5,7` (`:3895`). Default (option
bits clear, Y=0) = **6** — agreeing with NCITY=6 (the max) and MAME's 6-city dip default.
SCITYM's ";5 CITIES AT START" comment is the **Y=2 option** (`STCITY[2]=5`), not the default.
One byte-gated test independently re-reads `W3MAIN.MAC:3895` and re-derives `[6,4,5,7]` / `[0]==6`
from source, so the baked-in value is a source-checked fact, not my assertion.

**Deliverable for Dev (GREEN — Yoda), four artifacts:**
1. `docs/rom-study/starting-cities.md` — the derivation note: default = 6, NCITY is the MAX,
   the STCITY option table `6,4,5,7` selected by `OPTIO2 & SCITYM` at NEW GAME SETUP, and the
   "5 cities" = option-2 (Y=2) path. Cite PHYSICAL W3MAIN lines (`:3871`/`:3877`/`:3895`) and
   W3COMN (`SCITYM :195` / `NCITY :39`). Do NOT copy brief.md's logical ordinals (`:281`/`:1916`).
2. A claim in `docs/rom-study/claims/*.json` (e.g. extend `field.json`) with
   `source: {file:"W3MAIN.MAC", line:3895, verbatim:"STCITY:\t.BYTE 6,4,5,7"}` and `value: 6`.
   The verbatim must byte-match the physical line (checker does `split('\n')[3894]`, trimEnd both).
3. `src/core/field.ts`: a `start`-named numeric export == 6 (e.g. `export const START_CITIES = 6`),
   DISTINCT from `NCITY`, carrying a source citation (STCITY / `W3MAIN:3895` / the note). This is
   AC2's "field.ts can consume" seam for mc3.
4. Flip O-4 to resolved: `brief.md` (positive "resolved" marker + record 6 + NEW GAME SETUP/STCITY,
   retire the "pin the actual…" imperative) and `glossary.md` (retire "O-4 open"/"still open"/
   "unpinned"; keep the `O-4` tag; reference STCITY or link the note). O-2 lines stay untouched.

**AC2 target decision:** AC2 says "field.ts (or a setup/wave module)". No setup/wave module
exists in mc yet and `field.ts` (src/core) already owns `NCITY`/`CITIES`, so I targeted
`field.ts`. If Dev prefers a new module, that's a reasonable review conversation — but the
constant must remain a cited, claim-backed core value (mc2-1's no-un-cited-literal convention).

### Rule Coverage (lang-review: typescript.md + mc2 citation conventions)
- **Exact-value assertions, never a loose band (check #24):** `toBe(6)`, `toEqual([6,4,5,7])`,
  claim `value` `toBe(6)` — every numeric fact is pinned exactly.
- **Guards that can fail for the defect they name (check #15/#26):** floors ("claims non-empty",
  "cites ≥1 W3MAIN + ≥1 W3COMN anchor") stop a note passing on vocabulary alone; the byte-gated
  non-blank-line guard catches the double-space logical-ordinal trap.
- **Citation-verbatim discipline (mc2-1/2/3):** claim-coverage on `W3MAIN.MAC:3895` + the
  byte-gated physical-line re-derivation tie the docs to source; anchors are required on
  NON-BLANK physical lines (W3MAIN double-space trap).
- **No un-cited numeric literal in core:** the AC2 field.ts test requires a source citation AND
  a backing claim for the new constant.
- **Coherence across source-of-record (mc2-3 review #24):** the resolution must land in brief.md
  AND glossary.md, not just one — with STILL_OPEN excluding negated "resolved".
- **Meaningful assertions (Phase C self-check):** no `let _ =`, no `assert(true)`, no always-None
  checks; the 5 green tests are deliberate floors/source-facts, each able to fail.

**Handoff → Dev (Yoda) for GREEN.**

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `docs/rom-study/starting-cities.md` (new) — the O-4 derivation note: default = 6, NCITY is
  the max, the `STCITY: .BYTE 6,4,5,7` option table selected by `OPTIO2 & SCITYM` at NEW GAME
  SETUP, the "5 cities" = Y=2 option path, and the W3INT display-only non-start path. Cites
  physical W3MAIN lines (`:561`/`:3869`/`:3871`/`:3877`/`:3895`/`:3897`) + W3COMN (`:39`/`:195`).
- `docs/rom-study/claims/field.json` — added claim `MC-STCITY-START` (symbol STCITY, value 6,
  `source: W3MAIN.MAC:3895`, verbatim `STCITY:\t.BYTE 6,4,5,7`). Checker verifies byte-exact.
- `src/core/field.ts` — added `export const START_CITIES = 6`, distinct from `NCITY`, cited to
  STCITY / `W3MAIN:3895` / the note (AC2's consumable seam).
- `docs/rom-study/brief.md` — O-4 bullet flipped to *(RESOLVED)* with the answer (6),
  the site (NEW GAME SETUP / STCITY), and the option table; the open imperative retired.
- `docs/rom-study/glossary.md` — the open-question section + the SCITYM-vs-NCITY row flipped
  to resolved, referencing STCITY and the note; the `O-4` tag kept.
- `tests/citations-source.test.ts` — registered STCITY in the `DERIVED` set + explicit value
  check (see Design Deviation; the documented extension point for `.BYTE`-table claims).

**Tests:** missile-command project **335/335 passing (GREEN, 14 files)**; `npm run lint`
(tsc --noEmit) clean; citation checker CLI: **38 claims, all verified** (STCITY verbatim
byte-matches source). RED file `starting-cities-docs.test.ts` (26 tests) now fully green.

**Minimalism:** no abstractions beyond the four specced artifacts; `START_CITIES` is a plain
cited constant. STCIMA left unpinned (out of mc2-4 scope — noted for mc3 in Delivery Findings).

**Branch:** `feat/mc2-4-pin-starting-city-count` (pushed).

**Handoff:** To next phase.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (335/335 green, 0 smells, 38 claims verified, tsc clean) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — I covered test-quality myself |
| 5 | reviewer-comment-analyzer | Yes | clean | none (all 10 citations byte-verified; O-4 coherence confirmed) | N/A |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 4 | confirmed 4 (2 downgraded→Medium, 2→Low), dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned; 5 disabled skipped)
**Total findings:** 4 confirmed (severity-adjusted with rationale), 0 dismissed, 0 deferred

### Rule Compliance (lang-review: typescript.md + mc2 conventions)
- **#15 (source-text assertions match a token, not the claim):** one Medium instance
  (`includes('6')`, L137) — but the value is independently pinned by the ordered `6,4,5,7`
  table check, the byte-gated STCITY[0] re-derivation, the claim `.toBe(6)`, and `START_CITIES
  === 6`. Other #15-class assertions (SCITYM/NCITY/STCITY/OPTIO2 identifiers, `6,4,5,7`) are
  compliant — distinctive anchors, not bare keywords.
- **#24 (retirement applied where AC names it, not just there):** COMPLIANT — O-4 retired in
  brief.md AND glossary.md AND field.ts, coherently; whole-repo grep shows no stale open-O-4
  framing.
- **#25 (source-text guard scoped to whole file):** two instances (glossary points-at-resolution
  L416; field.ts citation scan L293) — Medium/Low, non-blocking (siblings carry the real
  signal). The AC1 anchor cross-check IS correctly scoped and is the model of this rule.
- **#26 (assertion terms all local to the test):** COMPLIANT — every value assertion ties a
  source-read or committed-claim value to an independent expectation.
- **#11 (catch(e) cast without narrowing):** Low — `(e as Error).message` at L119 matches the
  pervasive repo-wide test idiom (10+ sibling files); accepted convention, not a new defect.
- **A1 core purity:** COMPLIANT — `START_CITIES` is a plain literal, no clock/entropy/DOM/shell
  import; purity.test.ts 85/85 green.
- **A2 no un-cited literal in core:** COMPLIANT — cited (STCITY/W3MAIN:3895) + claim
  `MC-STCITY-START`, byte-verified by the checker.
- **A3 mc source hazards:** COMPLIANT — all citations are PHYSICAL non-blank lines; radix
  unambiguous (single-digit table values); `.MAC` read byte-safely.

### Observations
- [VERIFIED] All 10 ROM citations byte-accurate — evidence: `sed -n` re-read of
  W3MAIN.MAC:561/3869/3871/3873/3877/3895/3897 and W3COMN.MAC:39/195 and W3INT.MAC:1291 each
  matches the prose/claim exactly; complies with the mc2 physical-line convention.
- [VERIFIED] O-4 answer is correct — data flow: `LDA OPTIO2` → `AND SCITYM` → `LDA STCITY,Y` →
  `STA PLIVES` (W3MAIN:3869-3879); STCITY[0]=6 is the default (option bits clear), matching
  NCITY=6 and MAME's 6-city dip default; "5 cities" is the Y=2 option only.
- [VERIFIED] Core purity preserved — field.ts:36 `START_CITIES = 6` is a plain const, no shell
  import; purity.test.ts 85/85.
- [SEC] reviewer-security clean — regex is bounded (no ReDoS), `module` is regex-restricted to
  `W3MAIN|W3COMN` (no path traversal), dynamic-import specifiers are static literals, no secrets.
- [DOC] reviewer-comment-analyzer clean — no misleading/stale documentation; O-4 coherence intact.
- [RULE][MEDIUM] Vacuous-passable guard `doc.includes('6')` (starting-cities-docs.test.ts:137) —
  redundant with strong value guards; recorded as a fast-follow, not a block.
- [RULE][MEDIUM] Whole-file glossary "points-at-resolution" guard (L416) — sibling L402
  (o4Lines+STILL_OPEN) catches a revert; recorded as a fast-follow.
- [RULE][LOW] Whole-file field.ts citation scan (L293) — not exploitable; mc2-1 convention
  independently requires the citation.
- [RULE][LOW] `catch(e)`→`(e as Error)` (L119) — pervasive accepted repo idiom.

### Devil's Advocate

Argue this is broken. First: is the answer wrong — could the default be 5, matching SCITYM's
";5 CITIES AT START" comment? That is the most seductive trap in the whole story, because the
comment sits right on the mask. But the code is unambiguous: `STCITY[OPTIO2 & SCITYM]` is stored
into `PLIVES`, and the table is `.BYTE 6,4,5,7`. Index 0 (option bits clear) is 6; the "5" is
`STCITY[2]`, reachable only when the option-2 field is set to 2. MAME's dip default is 6, so the
default index is 0. If the author had wrongly copied the comment into the constant, `START_CITIES`
would be 5 and the byte-gated re-derivation (which reads `.byte`[0] from the physical line) would
have caught it — it did not, because 6 is right. Second: could a fresh checkout break? The tests
that touch the vendored `.MAC` are `describe.skipIf(!sourceAvailable)`-gated, and the always-on
file/claim/const contracts still carry signal on CI — the jt1-3 degradation pattern, correctly
applied. Third: does the new constant pollute core? `START_CITIES` is a plain number with a
citation, no clock/entropy/DOM — purity holds (85/85). Fourth: what would a confused later reader
misunderstand? That `NCITY` and `START_CITIES` are the same thing — but both the JSDoc and the note
explicitly separate max-vs-default, and mc3's end-game must count from `START_CITIES` (flagged in
Delivery Findings). Fifth: the real weakness — three test guards can pass under a hand-built decoy
(mutation-demonstrated by rule-checker). Does that mean the feature is untested? No: the value 6
and the O-4 coherence are each pinned by multiple mutation-resistant sibling assertions, so a decoy
that defeats one weak guard still reddens the describe block. The guards are redundant weak links,
not sole verifiers. Conclusion: the deliverable is correct and robustly verified; the guard-scoping
nits are a worthwhile fast-follow in a guardrail epic but do not leave anything broken or unproven.

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `OPTIO2` DIP byte → `AND SCITYM` (mask 03) → `Y` → `STCITY[Y]` →
`PLIVES` (starting cities), W3MAIN:3869-3879. Default Y=0 → 6. Pinned as `START_CITIES=6` in
`src/core/field.ts:36` (cited, claim-backed), consumable by mc3. Safe: pure constant, no input.

**Pattern observed:** the mc2-3 (O-2) resolution shape faithfully followed — dedicated
derivation note + byte-verified claim + cited core constant + coherent brief.md/glossary.md
retirement, at `docs/rom-study/starting-cities.md` and `field.ts:36`.

**Error handling:** N/A for a constants/docs change; test import failures throw
self-describing messages (starting-cities-docs.test.ts:118).

**Subagent dispatch (all 8 domains accounted for):**
- [EDGE] edge-hunter — disabled via settings; no boundary/geometry logic in this diff (constants + docs).
- [SILENT] silent-failure-hunter — disabled; no error-swallowing surface (no try/catch fallbacks in prod code).
- [TEST] test-analyzer — disabled; I covered test-quality myself: exact-value assertions,
  source-tied, non-vacuous; three redundant weak guards flagged (Medium/Low, see [RULE]).
- [DOC] comment-analyzer — clean; all citations byte-verified, O-4 coherence confirmed.
- [TYPE] type-design — disabled; no new types/enums, only a numeric const + a JSON claim.
- [SEC] security — clean; bounded regex, regex-restricted file access, static import specifiers.
- [SIMPLE] simplifier — disabled; change is minimal (one const, one claim, four docs, one test edit).
- [RULE] rule-checker — 4 findings, all confirmed & severity-adjusted with rationale (2 Medium,
  2 Low); none Critical/High. Recorded as a non-blocking fast-follow.

**No Critical or High findings.** All four rule-checker findings are Medium/Low test-guard
robustness improvements; the feature is correct, all citations byte-accurate, 335/335 green,
tsc clean, 38 claims verified, core purity intact.

**Handoff:** To SM for finish-story.
## Impact Summary

**O-4: pin the actual starting-city count — RESOLVED (single review round, APPROVED).**

- **Answer (measured from source):** the REV-01 default starting-city count is **6** =
  `STCITY[0]` (`OPTIO2 & SCITYM` = 0), read at NEW GAME SETUP. Data flow: `LDA OPTIO2`
  (W3MAIN:3869) → `AND I,SCITYM` (:3871) → `LDA AY,STCITY` (:3877) → `STA PLIVES`. Option
  table `STCITY: .BYTE 6,4,5,7` (:3895) → {0:6, 1:4, 2:5, 3:7}. `NCITY=6` is the MAX;
  SCITYM's ";5 CITIES AT START" is the Y=2 option only.
- **Deliverables (4):** `docs/rom-study/starting-cities.md` (derivation note); claim
  `MC-STCITY-START` in `claims/field.json` (W3MAIN.MAC:3895, value 6, byte-verified);
  `export const START_CITIES = 6` in `src/core/field.ts` (cited, consumable by mc3);
  O-4 marked resolved coherently in `brief.md` + `glossary.md`.
- **Verification:** missile-command 335/335, orchestrator 408/408, tsc clean, 38 claims
  verified by the checker, core purity 85/85. Blocking count: 0.
- **Non-blocking fast-follow (recorded, not a block):** three RED-test guards
  (starting-cities-docs.test.ts L137/L416/L293) can pass vacuously under a decoy
  (rule-checker #15/#25); the value and coherence are independently pinned by
  mutation-resistant sibling assertions, so nothing is left unverified. Worth tightening
  in this guardrail epic; not worth an extra rework round on a correct 2-pt story.
- **For mc3:** import `START_CITIES` (not `NCITY`) as the end-game countdown base; the
  paired `STCIMA` alive-city bitmask (W3MAIN:3897) is documented but not yet claimed/exported.
