---
story_id: "ml1-4"
jira_key: "ml1-4"
epic: "ml1"
workflow: "tdd"
---
# Story ml1-4: Secondary source MAME milliped.cpp board facts as claims

## Story Details
- **ID:** ml1-4
- **Jira Key:** ml1-4
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** arcade
- **Branch:** feat/ml1-4-mame-milliped-board-facts
- **PR:** https://github.com/slabgorb/arcade/pull/281

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-12T14:45:15Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-12T14:11:02Z | 2026-08-12T14:13:43Z | 2m 41s |
| red | 2026-08-12T14:13:43Z | 2026-08-12T14:27:11Z | 13m 28s |
| green | 2026-08-12T14:27:11Z | 2026-08-12T14:31:01Z | 3m 50s |
| review | 2026-08-12T14:31:01Z | 2026-08-12T14:45:15Z | 14m 14s |
| finish | 2026-08-12T14:45:15Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **Finding [SOURCE]**: MAME Millipede implementation is NOT in a standalone `milliped.cpp` file. Millipede is defined *inside the Centipede driver family* at `centiped.cpp`, `centiped_v.cpp`, and `centiped.h` in `/Users/slabgorb/Projects/mame/src/mame/atari/`. The directory is `atari/`, not `milliped/`. Do not hunt for a phantom file.

- **Finding [OQ-1-HEDGE]**: The exact refresh rate for Millipede is stated in MAME at `centiped.cpp:25-26` WITH an explicit hedge preserved verbatim: `"Video frequency: VSYNC = HSYNC/263 ?? = 59.88593 Hz (not sure, could be /262)"`. This hedge MUST be recorded in the claims file exactly as stated, not resolved on faith to one divisor.

- **Finding [TENSION]**: There is a tension to flag: `m_screen->set_refresh_hz(60)` (line 1798) rounds the refresh, while the comment at :25-26 gives 59.88593 Hz. Record both values.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->


## Sm Assessment

**Setup complete — routing to TEA (red).** ml1-4 is a 3pt p2 tdd **claims/citation** story: audit MAME's Millipede board facts as prose citations (GPL — cite `file:line`, never copy source). Output is a dossier section, not game code.

**Measured before setup (falsifiable premises re-verified against the tree, not copied on faith):**
- **Source-location correction (decisive):** there is no `milliped.cpp` anywhere. Millipede lives in the Centipede driver family — `centiped.cpp`, `centiped_v.cpp`, `centiped.h` under `~/Projects/mame/src/mame/atari/`. The story's "milliped driver dir (atari/)" resolves to dir `atari/`, file `centiped.cpp`. TEA must not hunt a phantom file; the context warns of this at line 17.
- **OQ-1 answerable:** the refresh hedge is verbatim-present at `centiped.cpp:25-26` — same 59.88593 Hz as Centipede WITH `/263 ?? could be /262`. AC requires recording it verbatim, plus the `set_refresh_hz(60)` (:1798) vs 59.88593 tension.
- **Picture-ROMs 136013-106/107 confirmed** at `centiped.cpp:2226-2227` (106=p5, 107=r5; program ROMs 101-104; do not confuse with Centipede's 109/110).

**Setup notes:** epic `acceptance_criteria` was null, so sm-setup DERIVED 10 ACs bounded to the six enumerated fact-classes (no sim/graphics/sound scope). Story stamped `in_progress`; claim commit + context pushed on `feat/ml1-4-mame-milliped-board-facts` (sibling-visible). Merge gate clean, no sibling owns ml1-4 (a-3 is on jt11-4).

**For TEA (Leeloo):** the RED test is a citation-audit shape — align with ml1-3's dossier and the repo's `tests/audit/` citation convention (verify `source.line`/`verbatim` pairs against the MAME blobs). Each of the six fact-classes = one line-cited claim.
## Tea Assessment

**RED landed — 13 feature-absent drivers red, 8 safety guards green. Routing to Dev (Korben).**
Test: `plugins/millipede/tests/audit/board-facts.test.ts` (commit `66f975e2`). `tsc --noEmit`
clean; RED isolated (only this file red, 116 other millipede tests green).

**The design decision that shaped the whole RED (a Delivery Finding for Dev):** ml1-4 is a
MAME **secondary-source** dossier, and the citation gate treats MAME by construction as prose.
Three measured facts drove it:
1. **No `milliped.cpp` exists.** Millipede lives in the Centipede driver family:
   `centiped.cpp` / `centiped_v.cpp` / `centiped.h` under `~/Projects/mame/src/mame/atari/`.
2. **The sweep grammar excludes `.cpp` deliberately** (`dossier-sweep.ts` regex is
   `.MAC/.DOC/.MAP/.LNK` only). So a `centiped.cpp:N` prose citation is invisible to the
   coverage gate and demands NO byte-verifiable claim — which is correct, MAME is GPL and not
   vendored. The RED asserts the six MAME facts by **content** (values + prose `centiped*.cpp:N`),
   not via the gate.
3. **The four "source never states" facts (clock, refresh, geometry, rotation) have no vendored
   primary** — `brief.md:17` says so outright. So board-facts.md adds **NO new claims/*.json**;
   forcing a vendored `source` for them would be fabrication. The two facts the 1982 source DOES
   carry (picture-ROM part numbers, colour-RAM) are cross-referenced to the EXISTING claims
   **RS-4/RS-5** (`368X1.DOC:22-23`) and **SS-14** (`MLIRQ.MAC:242`) — coverage stays green with
   nothing new.

**What Dev must ship (GREEN):**
- `plugins/millipede/docs/rom-study/board-facts.md` — six facts, each with a MAME prose
  `centiped*.cpp:N` citation; the OQ-1 hedge quoted **verbatim** (`board-facts.test.ts` embeds the
  exact string); both divisors `/263` and `/262` preserved; the two vendored cross-refs backticked.
- Add `'board-facts.md'` to `DOSSIER_FILES` in `tests/audit/dossier-sweep.ts` (else vacuous sweep).
- MAME line anchors (measured this session, numbered output): master clock `centiped.cpp:22`
  (+CPU `:1778`); OQ-1 hedge `centiped.cpp:25`; rounding tension `set_refresh_hz(60)` `:1798`;
  geometry `:1799`/`:1800` (256×256 total, 256×240 visible); rotation `ROT270` `:2389`; colour
  `centiped_v.cpp:186`/`:390`; picture ROMs `:2226` (107.r5) / `:2227` (106.p5).

**GPL seam — three guards will bite if GREEN reaches for the file instead of quoting a line:**
no `.cpp` under the plugin; no MAME BSD-3-Clause header in the dossier; no claim with a `.cpp`
`source`. All green now on a clean baseline.

### Rule Coverage
- **lang-review #15 (vacuous universal sweeps):** every data-driven loop (`FACTS`) is preceded
  by `expectPopulated(FACTS.length, 7, …)` so an emptied table fails loudly instead of passing.
- **Meaningful assertions / no vacuity:** the 8 green tests are safety GUARDS (coverage-gate
  invariants, GPL no-copy, byte-verify) that stay green now and redden on wrong GREEN behaviour —
  verified by the 8/13 split matching prediction exactly; none is a driver passing by default.
- **Byte-fidelity (project rule: claims re-open byte-for-byte):** AC-7 runs `checkClaims` against
  the vendored tree (ran at 5ms locally, skipped on CI) — a drifted line/verbatim reddens.
- **GPL / licence (project rule: MAME cited in prose, never copied):** AC-6 enforces it three
  independent ways.
- **AC coverage:** every one of the 10 context ACs maps to a test (AC-1 exists/enrolled; AC-2 six
  facts + MAME prose; AC-3 verbatim hedge + divisor preservation = ACs 2/3; AC-4 vendored
  grounding = ACs 1/6/7; AC-5 gate green = AC-8; AC-6 = ACs 9; AC-7 byte-verify = AC-8/10).
## Dev Assessment

**GREEN — 21/21 on board-facts.test.ts, full millipede project 129/129, tsc clean, orchestrator
audit-refs 6/6 unaffected.** Routing to Reviewer (Zorg).

**Shipped (two files, minimal):**
- `plugins/millipede/docs/rom-study/board-facts.md` (commit `45f07391`) — the MAME
  secondary-source board-facts dossier. Six facts, each MAME-prose-cited (`centiped*.cpp:N`),
  OQ-1 hedge quoted **verbatim** with both `/263` and `/262` preserved, the `set_refresh_hz(60)`
  rounding tension recorded, and the two vendored-grounded facts cross-referenced to existing
  claims.
- `plugins/millipede/tests/audit/dossier-sweep.ts` — added `'board-facts.md'` to `DOSSIER_FILES`.

**No new claims/*.json** — as TEA designed. The four "source never states" facts (clock, refresh,
geometry, rotation) are MAME-prose-only; the two grounded facts reuse RS-4/RS-5 (`368X1.DOC:22-23`)
and SS-14 (`MLIRQ.MAC:242`).

### Design Deviations
- **One self-correction inside GREEN (no spec deviation):** first draft added a
  `` `MILLI.MAC:1167` `` ("1.5 MHZ") vendored corroboration to the master-clock section. That is a
  *new* backticked citation with no covering claim, so the coverage gate reddened
  (`uncoveredCitations` → `MILLI.MAC:1167`). Per TEA's "no new claims" design and minimalist
  discipline, I removed the cross-reference rather than add a claim — the master clock is genuinely
  a MAME-only fact (`brief.md:17`), and the sound-channel 1.5 MHz line was weak corroboration
  gilding. Fact still stated (12.096 → ÷8 → 1.512 MHz) with its MAME citation. Net deviation from
  the TEA spec: **none** — the final shape matches "cross-reference existing claims only."

**For Reviewer:** the GPL seam is the thing to probe. Three guards enforce "cited not copied"
(no `.cpp` under the plugin, no MAME BSD header in the dossier, no `.cpp` claim source) — all green.
The OQ-1 verbatim string is byte-checked by the test's embedded literal. MAME line numbers were
read from numbered tool output this session; they can drift between MAME releases (noted in the
doc's line-number-discipline paragraph).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 129 millipede / 21 board-facts / 6 audit-refs / 10 bootstrap / tsc clean / 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (no edge defects; byte-verify skipIf + coverage sweep boundaries reuse ml1-1 machinery) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (docs+test, no error paths to swallow) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered (see [TEST] finding, cross-confirmed by rule-checker) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered (all 17 citations re-verified accurate; minor DOC nits below) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered (types mirror sibling audit tests; rule-checker rule 1/2/5 clean) |
| 7 | reviewer-security | Yes | findings | 4 (GPL prose-vs-code) | confirmed 1 (consolidated), dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered (proportional; no over-engineering) |
| 9 | reviewer-rule-checker | Yes | findings | 2 ([RULE 15], [RULE 26]) | confirmed 1 (RULE 15), downgraded 1 (RULE 26 → accepted pattern) |

**All received:** Yes (3 enabled returned, 6 disabled hand-covered)
**Total findings:** 2 confirmed, 1 downgraded (accepted, with rationale), 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED (two findings caught in review, fixed in-place at user direction — commit `82e3589b`; re-verified 21/21 board-facts, 129/129 millipede, tsc clean)

**Scope reviewed:** a MAME secondary-source citation dossier (`board-facts.md`), its RED test, and a one-line `DOSSIER_FILES` enrolment. Docs+test only — no runtime code, so data-flow/wiring/tenant-isolation/error-path audits are N/A (no user input, no auth surface, no trait methods). Dispatch tags below cover all nine specialists (3 enabled, 6 disabled + hand-covered).

### Findings (both resolved)

| Severity | Tag | Issue | Location | Resolution |
|----------|-----|-------|----------|------------|
| [MEDIUM] | [SEC] | MAME's literal C++ call syntax reproduced verbatim (`M6502(config, m_maincpu, 12096000/8)`, `set_size`/`set_visarea` arg-lists, `m_screen->set_refresh_hz(60)`, and the full 10-arg `GAME( 1982, milliped, … )` macro) — contravenes AC-9 "cited in prose only, no MAME source code committed" | board-facts.md :30/:51/:58-60/:66-68 | FIXED `82e3589b` — paraphrased to prose facts; bare identifiers + citations + numbers kept; `grep` confirms zero verbatim call-syntax remains |
| [MEDIUM] | [RULE][TEST] | refresh-tension guard regex `…\|round\|…` unanchored; matched the dossier's pervasive "ground"/"grounded" vocabulary, so the guard passed even with the tension prose deleted (lang-review #15; independently verified: `/round/i.test('grounded')===true`) | board-facts.test.ts:159 | FIXED `82e3589b` — anchored to `\bround(s\|ed\|ing)?\b`; verified grounded→false, rounds/rounding/hard-coded→true |

### Rule Compliance
- **AC-2/AC-3 (verbatim OQ-1 hedge):** [VERIFIED] doc line == `centiped.cpp:25` byte-for-byte (`diff` IDENTICAL); the test's `OQ1_HEDGE_VERBATIM` literal drives `md.includes()` against GREEN's real doc (not a self-referential fixture). Both `/263` and `/262` preserved.
- **AC-9 (GPL — prose only, never copied):** [SEC] the verbatim-call-syntax gap is now closed; three structural guards remain green — no `.cpp` under the plugin, no MAME BSD/Salmoria header in `docs/rom-study/` (the only hit is the test's own detection literals, scoped out), no claim with a `.cpp` `source`.
- **AC-1/AC-5/AC-8 (gate health):** [VERIFIED] only three backticked vendored citations in the doc (`368X1.DOC:22`,`:23`,`MLIRQ.MAC:242`), all covered by existing RS-4/RS-5/SS-14; `uncoveredCitations`/`allMalformedCitations` both `[]`; no new claim invented.
- **lang-review #26 (self-referential assertion):** [RULE] `expectPopulated(FACTS.length, 7)` (board-facts.test.ts:219) compares two test-local constants — flagged by rule-checker. DOWNGRADED/ACCEPTED, not removed: it is an intentional suite-completeness tripwire (fails if a future edit deletes a fact row), identical to the shipped sibling pattern `expectPopulated(ENTITIES.length, 8)` / `(SUBSYSTEMS_MAP.length, 20)` in `glossary-subsystems-oq.test.ts`. Rationale cites a different accepted convention, per the downgrade rule.
- **lang-review #1/#2/#4/#5/#7 (TS hygiene):** [TYPE] [VERIFIED] zero `as any`/`@ts-ignore`/non-null; `import type { Claim }`; `??` fallback; awaited `loadChecker()` — all clean (rule-checker corroborated).

### Dispatch-tag coverage
[EDGE] disabled — hand-covered: byte-verify `skipIf(!vendoredAvailable)` and the coverage sweep reuse ml1-1 machinery; no unhandled boundary. [SILENT] disabled — N/A (no error paths). [TEST] the tension-regex vacuity (fixed) + RULE-26 (accepted). [DOC] all 17 citations re-verified accurate; POKEY citation precision improved (:1906–1910) and §5 EPROM/PROM wording tightened in `82e3589b`; note (non-blocking, pre-existing, out of scope) `dossier-sweep.ts:21,66` uses "milliped.cpp" as the illustrative `.cpp` example, whereas ml1-4 established the real driver is `centiped.cpp` — a future doc-hygiene item. [TYPE] clean. [SEC] the GPL finding (fixed). [SIMPLE] disabled — hand-covered: dossier is proportional, the `walk()` helper is the minimal way to sweep for GPL copies. [RULE] #15 (fixed) + #26 (accepted).

### Observations
- [VERIFIED] Every cited line is accurate — re-grepped independently: `centiped.cpp:22`=12.096 MHz, `:25`=the hedge, `:1798`=`set_refresh_hz(60)`, `:1799/1800`=geometry, `:2226/2227`=107.r5@0 / 106.p5@0x800, `:2389`=ROT270, `centiped_v.cpp:186`=no-color-PROM, `:390`=paletteram_w; vendored `368X1.DOC:22/23` and `MLIRQ.MAC:242`=CLRCH. No off-by-one, no fabrication.
- [VERIFIED] Picture-ROM addressing cross-checks between sources: MAME loads 107 low / 106 high (`:2226/2227`), the ledger gives 106 start 800 / 107 start 0 (`368X1.DOC:22/23`) — consistent.
- [VERIFIED] Preflight fully green (129/21/6/10, tsc, 0 smells).

### Devil's Advocate
Argue it is broken. The load-bearing risk in a citation dossier is that a cited line drifts and nobody notices — and here the MAME `.cpp` citations are, by GPL-necessity, **ungated**: the coverage/byte machinery cannot re-open `centiped.cpp` (it is not vendored), so a future MAME release that renumbers `centiped.cpp` would leave every `centiped.cpp:N` in this doc silently stale with no red test. That is real, but it is inherent to citing a GPL secondary source in prose, is disclosed in the doc's line-number-discipline paragraph, and is exactly why the two facts that *can* be gated (picture ROMs, colour RAM) are cross-referenced to vendored primaries that DO byte-verify. Second: a confused sim author could read `set_refresh_hz(60)` as the true rate — but the doc explicitly warns against this and names 59.88593 Hz as intended. Third: did I misread the geometry? Re-checked — `set_visarea(0*8,32*8-1,0*8,30*8-1)` = x∈[0,255], y∈[0,239] = 256×240 visible, two tile rows cropped; correct. Fourth: is Millipede actually ROT270? Confirmed against the `GAME()` row and it is a known vertical cabinet. Fifth, the sharpest one — the tension guard *was* vacuous via "grounded" and I nearly approved it; the rule-checker caught it and I independently reproduced the false-positive before fixing. Post-fix, the guard bites. Nothing else uncovered rises to blocking.

**Handoff:** To SM for finish-story.

### Reviewer (audit)
- **Dev's in-GREEN self-correction (removed the `MILLI.MAC:1167` cross-reference to keep "no new claims")** → ✓ ACCEPTED by Reviewer: net-zero deviation from the TEA spec; the master clock is genuinely MAME-only (`brief.md:17`), the removed 1.5 MHz line was weak corroboration, and the fact remains stated (12.096 → ÷8 → 1.512 MHz) with its MAME citation. Sound call.
- **Reviewer's own in-place fixes (`82e3589b`): GPL prose-only paraphrase + tension-regex anchor** → these are review-round corrections applied at user direction rather than a spec deviation; recorded in the Findings table above. No undocumented spec divergence found.

## Delivery Findings

<!-- Reviewer: append below. Append-only. -->

### Reviewer (code review)
- **Improvement** (non-blocking): `dossier-sweep.ts:21,66` uses `milliped.cpp` as the illustrative `.cpp`-excluded example in its grammar comment, but ml1-4 established the real MAME driver is `centiped.cpp` (there is no `milliped.cpp`). Affects `plugins/millipede/tests/audit/dossier-sweep.ts` (update the two illustrative comments to `centiped.cpp` for accuracy — pre-existing from ml1-1, out of this story's scope). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the MAME `centiped*.cpp:N` citations are ungated by GPL-necessity (MAME is not vendored, so the byte-verify machinery cannot re-open it) — a future MAME renumbering would leave them silently stale. Affects `plugins/millipede/docs/rom-study/board-facts.md` (a later story could pin the MAME revision, e.g. record the MAME version these line numbers were read against). Disclosed in the doc's line-discipline paragraph; no action required now. *Found by Reviewer during code review.*
## Impact Summary

**ml1-4 — MAME secondary-source board-facts dossier for Millipede. APPROVED, one review round.**

**Delivered:** `plugins/millipede/docs/rom-study/board-facts.md` (six MAME board facts, OQ-1 hedge recorded verbatim with both `/263` and `/262`, colour-is-RAM-driven, picture-ROMs 136013-106/107) + `board-facts.test.ts` (21 assertions) + enrolment in `DOSSIER_FILES`. MAME cited in prose only, never copied; two vendored-grounded facts cross-reference existing claims RS-4/RS-5/SS-14 — no new claims.

**Review (round 1, APPROVED):** two findings caught and fixed in-place at `82e3589b` — (1) [SEC] verbatim MAME call-syntax (full `GAME()` macro etc.) paraphrased to prose per AC-9; (2) [RULE-15] vacuous tension-guard regex anchored (`\bround(s|ed|ing)?\b`). Re-verified 21/21 board-facts, 129/129 millipede, tsc clean, orchestrator 6/6.

**Deferred (non-blocking Improvements, filed in Delivery Findings):** update `dossier-sweep.ts` illustrative "milliped.cpp"→"centiped.cpp" comments (pre-existing, out of scope); a later story could pin the MAME revision the `.cpp` line numbers were read against (MAME citations are ungated by GPL-necessity).

**PR:** #281 (feat → develop) — OPEN, awaiting boss merge.
