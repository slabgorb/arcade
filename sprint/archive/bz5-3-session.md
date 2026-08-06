---
story_id: "bz5-3"
jira_key: "bz5-3"
epic: "bz5"
workflow: "tdd"
---
# Story bz5-3: Timing cross-check — reconcile the 15.625 Hz sim game-frame against MAME's clock chain

## Story Details
- **ID:** bz5-3
- **Jira Key:** bz5-3
- **Workflow:** tdd
- **Phase:** finish
- **Repos:** arcade
- **Branch:** none
- **PR:** none

## Background

The prior epics fixed the sim to a 15.625 Hz game-frame (vs a 60 Hz shell sub-step, ~divide-by-4; see the bz3 timebase work and tests/core/timebase.test.ts). MAME gives an independent, executable clock chain to check that against: BZONE_MASTER_CLOCK = XTAL 12.096 MHz (bzone.h:20); the 6502 runs at master/8 = 1.512 MHz (bzone.cpp:611); BZONE_CLOCK_3KHZ = master/4096 ~= 2953 Hz (bzone.h:21); the NMI is periodic at CLOCK_3KHZ/12 ~= 246 Hz, GATED by IN0 bit 0x10 self-test (bzone.cpp:613, 261-266); the vector refresh is CLOCK_3KHZ/12/6 ~= 41 Hz (bzone.cpp:619); and clock_r toggles on CPU total_cycles & 0x100 (bzone.cpp:275-278). Trace how the ROM's main loop derives its game-logic tick from that chain (NMI-counted frames vs vector-draw sync) and confirm the effective game-logic rate is 15.625 Hz — or, if the chain says otherwise, quantify the drift and correct the timebase. This is a verification-first story: the deliverable is a reconciled, cited answer plus any needed correction, NOT a speculative rewrite.

## Acceptance Criteria

1. The clone's game-logic frame rate is reconciled against the MAME clock chain (bzone.h:20-21, bzone.cpp:611/613/619) with the derivation written up in the findings doc — showing whether 15.625 Hz matches the executed ROM and by what path.

2. If a drift is found the timebase is corrected and every cadence-gated counter (shot/saucer/AI/radar) still ticks at its ROM-correct rate; if no drift, the 15.625 Hz value gains an explicit second-source citation and the tests assert it.

3. No regression in the existing timebase/cadence suites (timebase, radar-sweep, firing, saucer, enemies) after the reconcile.

## Setup Context & Findings

### MAME Source Location
MAME source lives **outside the arcade repo** in a sibling checkout at `/Users/slabgorb/Projects/mame/src/mame/atari/` — `bzone.cpp`, `bzone.h`, `bzone_a.cpp`. It is NOT vendored in this repo. The next agent reads the cited line numbers from THAT path. All citations have been verified as of 2026-08-06:
- `bzone.h:20` → `#define BZONE_MASTER_CLOCK (XTAL(12'096'000))`
- `bzone.h:21` → `#define BZONE_CLOCK_3KHZ (BZONE_MASTER_CLOCK / 4096)` (≈2953 Hz)
- `bzone.cpp:611` → `M6502(config, m_maincpu, BZONE_MASTER_CLOCK / 8);` (1.512 MHz)
- `bzone.cpp:613` → periodic NMI at `attotime::from_hz(BZONE_CLOCK_3KHZ / 12)` (≈246 Hz), gated by IN0 self-test (bzone.cpp:261-266)
- `bzone.cpp:619` → `m_vector->set_refresh_hz(BZONE_CLOCK_3KHZ / 12 / 6);` (≈41 Hz)
- `bzone.cpp:275-278` → clock_r toggles on CPU total_cycles & 0x100

### Established MAME Cross-Check Pattern
This epic already has an established MAME cross-check pattern. Prior stories bz5-1 (windshield/CRACK), bz5-2 (colour geometry), bz5-4 (enemy AI) all cross-check the clone against MAME as an "independent second primary source." The running ledger is `plugins/battlezone/docs/battlezone-1980-source-findings.md` §11 (§11.1 colour, §11.2 enemy AI). bz5-3's reconciled answer belongs in a new §11.x subsection there. Model the test shape on `plugins/battlezone/tests/core/enemies-mame-crosscheck.test.ts`.

### Existing Timebase Pinning
The sim's current timebase is already pinned. `plugins/battlezone/tests/core/timebase.test.ts` pins the 15.625 Hz game-frame vs the 60 Hz shell sub-step (~divide-by-4), from the bz3 timebase work. The open question the story poses: trace how the ROM main loop derives its game-logic tick (NMI-counted frames vs vector-draw sync) and confirm the effective rate is 15.625 Hz, or quantify the drift and correct the timebase.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T11:53:34Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T11:16:26Z | 2026-08-06T11:20:15Z | 3m 49s |
| red | 2026-08-06T11:20:15Z | 2026-08-06T11:38:15Z | 18m |
| green | 2026-08-06T11:38:15Z | 2026-08-06T11:40:55Z | 2m 40s |
| review | 2026-08-06T11:40:55Z | 2026-08-06T11:53:34Z | 12m 39s |
| finish | 2026-08-06T11:53:34Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA / Improvement / non-blocking] The reconciled answer is a documented ~1.59% drift, not a clean confirmation.**
  MAME's executable chain confirms the ROM mechanism (game frame = NMI÷16, vector = NMI÷6) but the exact
  NMI is `BZONE_CLOCK_3KHZ/12 = 246.094 Hz` (bzone.cpp:613), NOT the round 250 Hz the ROM's "END OF FRAME
  (64 MS)" comment implies. So the executed hardware frame is 246.094/16 = **15.381 Hz (65.02 ms)** and the
  clone's 15.625 Hz is **~1.59% fast**; vector refresh is likewise 41.016 Hz exact vs the bz3 audit's nominal
  41.67. **User ruling (2026-08-06): ACCEPT — keep `GAME_FRAME_HZ = 15.625` (the ROM-documented 64 ms intent),
  DOCUMENT the delta with MAME citations, NO magnitude rewrite** (verification-first, and the bz5-1 pre-ruling
  at findings :499-501 already held "the difference does not materially change the window"). This closes the
  reconcile that bz5-1 explicitly deferred to bz5-3 (findings :501).

### Reviewer (code review)

- **Conflict** (non-blocking): the new §11.3 resolves the NMI-rate reconcile, but a TWIN
  "deferred to bz5-3" note left over in §11.2 now contradicts it. Affects
  `plugins/battlezone/docs/battlezone-1980-source-findings.md:605` (change "deferred to bz5-3"
  → "resolved in §11.3", matching the fix already applied at :501). *Found by Reviewer during code review.*
- **Gap** (non-blocking): §12 provenance/changelog has a dated row for every prior bz5 story
  (e.g. :686 for bz5-1) but none for bz5-3's §11.3 addition. Affects
  `plugins/battlezone/docs/battlezone-1980-source-findings.md` §12 (add a 2026-08-06 row citing
  the MAME driver + §11.3). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the "MAME clock chain" derivation tests
  (`timebase-mame-crosscheck.test.ts:35-61,78-92`) assert arithmetic among test-local constants
  only, so they cannot redden on a production defect (rule-#26). They are intentional documentary
  pins and the transcription IS cross-checked by the AC1/AC2 live file reads in the same file, so
  this is Low — but a one-line clarifying comment (or binding one derived value to the live doc
  read) would retire the rule-#26 flag. *Found by Reviewer (confirmed rule-checker) during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

No design deviations

### Reviewer (audit)
No undocumented spec deviations. The one non-obvious call — keeping `GAME_FRAME_HZ = 15.625`
rather than correcting to the MAME-exact 15.381 Hz — is not a spec deviation but an explicit
user ruling (2026-08-06), recorded in Delivery Findings and honoured verbatim by the code
(no magnitude changed). The story's AC2 "if drift → correct" branch was consciously not taken
per that ruling and the "verification-first, NOT a speculative rewrite" mandate. ✓ ACCEPTED.

## Sm Assessment

Setup complete for bz5-3 (3pt, p2, tdd, verification-first). The phase pointer read `setup`
on arrival; routing to TEA (Leeloo) for the RED phase.

**What this story is.** A cross-check, not a rewrite. The sim already pins a 15.625 Hz
game-frame (`plugins/battlezone/tests/core/timebase.test.ts`, from bz3). bz5-3 checks that
number against MAME's executable clock chain and either confirms it with citations or
quantifies the drift and corrects the timebase. The deliverable is a reconciled, CITED
answer — the RED test should pin/verify the derived rate, NOT assume a rewrite.

**Ground truth is verified and off-repo.** MAME's driver is NOT vendored in this repo; it
lives in a sibling checkout at `/Users/slabgorb/Projects/mame/src/mame/atari/`
(`bzone.cpp`, `bzone.h`, `bzone_a.cpp`). I verified every citation in the story resolves
there: `bzone.h:20` master clock XTAL 12.096 MHz, `:21` CLOCK_3KHZ = master/4096; `bzone.cpp:611`
6502 at master/8, `:613` periodic NMI at CLOCK_3KHZ/12 (gated by IN0 self-test 261-266),
`:619` vector refresh at CLOCK_3KHZ/12/6. TEA reads those line numbers from that path.

**Established pattern to follow.** This epic already cross-checks the clone against MAME as
an independent second primary source (bz5-1 windshield, bz5-2 colour, bz5-4 enemy AI). The
running ledger is `plugins/battlezone/docs/battlezone-1980-source-findings.md` §11; bz5-3's
answer belongs in a new §11.x. Model the test shape on
`plugins/battlezone/tests/core/enemies-mame-crosscheck.test.ts`.

**Board state.** Claim pushed to `main` (in_progress stamp + context file); empty beacon
branch `feat/bz5-3-timebase-mame-crosscheck` pushed for sibling visibility. Trunk-based:
work commits land on `main`; Story Details carries `Branch: none` / `PR: none` for the
finish ceremony. Only sibling session at setup was a-3 on mc1-5 (unrelated).

## Tea Assessment

RED committed (`cb12a22b`): `plugins/battlezone/tests/core/timebase-mame-crosscheck.test.ts`,
**16 tests — 11 pass (CONFIRMED pins), 5 fail (the RED deliverables)**. This is a
verification-first story, so per the bz5-4 precedent the numeric cross-check is a green
regression pin, not a fabricated failure; the genuine RED is the missing findings write-up
and second-source citation.

**The reconciled answer (traced, not assumed).** MAME's exact chain — master 12.096 MHz
(bzone.h:20) → ÷4096 CLOCK_3KHZ ≈2953.125 Hz (bzone.h:21) → ÷12 NMI **246.094 Hz**
(bzone.cpp:613) → ÷6 vector **41.016 Hz** (bzone.cpp:619); CPU master÷8 = 1.512 MHz
(bzone.cpp:611) — confirms the ROM mechanism (frame = NMI÷16, vector = NMI÷6) but proves the
NMI is 246.094 Hz, not the round 250 the "64 MS" comment implies. Exact frame = **15.381 Hz**;
clone's 15.625 is **~1.59% fast**. **User ruled ACCEPT + document** (see Delivery Findings).

**What Dev must do in GREEN (make the 5 reds pass — NO magnitude changes):**
1. **Findings §11.3** in `plugins/battlezone/docs/battlezone-1980-source-findings.md` — a new
   `### 11.3` timebase cross-check subsection recording: mechanism confirmed, exact NMI
   **246.09** Hz, exact frame **15.381** Hz, drift **~1.59%** (or `1.6 %`), cite **bzone.cpp:613**.
   Closes the reconcile bz5-1 deferred (findings :501) — update that deferral note to "resolved in §11.3".
2. **`src/core/timebase.ts`** — add MAME as the second source next to the existing BZONE.MAC
   citation: reference the MAME driver (`bzone.cpp` / `BZONE_CLOCK_3KHZ`) and reconcile the
   comment's bare "250 Hz" with the exact **246**.094 Hz (nominal-vs-exact note). KEEP
   `GAME_FRAME_HZ = 15.625` and KEEP the BZONE.MAC citation (tests assert both).
3. Do **NOT** change any magnitude (`GAME_FRAME_HZ`, MAX_SPEED, MAX_TURN_RATE, SHELL_SPEED,
   radar sweep, cadence counters). A test explicitly guards against a rewrite to 15.381.
4. AC3: run the full battlezone suite (timebase, radar-sweep, firing, saucer, enemies) — must
   stay green; this story adds only docs + a comment citation, so no regression is expected.

**MAME source is off-repo** at `/Users/slabgorb/Projects/mame/src/mame/atari/` — cite its line
numbers in PROSE only (the vendored citations gate cannot blob-verify an out-of-repo tree; same
convention as `enemies-mame-crosscheck.test.ts`).

### Rule Coverage (typescript lang-review)
- **Meaningful assertions (test-quality rule):** every one of the 16 tests asserts a concrete
  value or match; no `let _ =`, no `assert(true)`, no `is-none-on-always-none`. Self-checked.
- **No magic-number drift:** the chain is derived from the documented MAME constants
  (`MASTER_HZ/4096/12/...`), not hard-pasted, so a constant typo surfaces as an arithmetic mismatch.
- **Core purity:** the test lives under `tests/core/`, reads source as text and imports only the
  pure `GAME_FRAME_HZ` constant — no shell/DOM/wall-clock, so the core-boundary purity scan is unaffected.
- **Float comparison:** all derived-value checks use `toBeCloseTo` with explicit precision, never `===` on floats.

**Handing off to Dev (Korben Dallas) for GREEN.**

## Dev Assessment

GREEN committed (`9551f410`). All five reds pass; **crosscheck 16/16, full battlezone suite
1078/1078**. Followed TEA's spec exactly — accept + document, zero magnitude changes.

**What changed (two files, no behaviour):**
1. `plugins/battlezone/docs/battlezone-1980-source-findings.md` — new **§11.3 · Timebase
   cross-check against MAME's clock chain (bz5-3)**: the full MAME chain as a table
   (master 12.096 MHz → CLOCK_3KHZ 2953.125 → NMI 246.094 Hz → vector 41.016 Hz; CPU 1.512 MHz),
   mechanism CONFIRMED (frame = NMI÷16 via `AND I,0F`/`INC SYNC`; vector a *separate* NMI÷6 node,
   so display refresh ≠ game-logic rate), the **~1.59%** nominal-250-vs-exact-246.094 delta, and
   the ruling to keep 15.625. Also updated the bz5-1 deferral note (was "deferred to bz5-3") to
   **"resolved in §11.3."**
2. `plugins/battlezone/src/core/timebase.ts` — added the MAME second-source block + JSDoc citing
   `bzone.cpp:613` / `BZONE_CLOCK_3KHZ` and the 246.094-vs-250 reconcile; relabelled the comment's
   "250 Hz" as **nominal**. `GAME_FRAME_HZ = 15.625` unchanged; BZONE.MAC first-source citation
   retained. No other core constant touched.

**Verification:** `npx vitest run --project battlezone` → 77 files / 1078 tests green (AC3). The
only executable change is a comment; the constant and every derived magnitude are byte-identical.
MAME line numbers cited in prose only (off-repo tree — the vendored citations gate is not invoked).

**Handing off to Reviewer (Jean-Baptiste Emanuel Zorg) for review.**

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1078/1078 battlezone, 398/398 orchestrator, lint green, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings; hand-reviewed — pure arithmetic/doc, no boundary paths |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings; hand-reviewed — no error handling/catches in diff |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings; hand-covered — see rule-checker #26 + my read |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings; HAND-COVERED (doc-heavy story) — found F1, F2 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings; hand-reviewed — no new types, comment-only src edit |
| 7 | reviewer-security | Yes | clean | none | N/A — static repo-local paths, no network/secrets/DOM |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings; hand-reviewed — minimal, no over-engineering |
| 9 | reviewer-rule-checker | Yes | findings | 2 (rule-#26) | confirmed 2 (downgraded to Low w/ rationale), dismissed 0 |

**All received:** Yes (3 enabled returned: preflight clean, security clean, rule-checker 2 findings; 6 disabled pre-filled)
**Total findings:** 3 confirmed (F1 Medium, F2 Low, F3/rule-#26 Low), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED (all findings fixed in-place — user-authorized direct fix instead of a rework round)

This is a verification-first story whose entire deliverable is a correct, cited reconciliation
in the findings ledger. The numbers and citations are impeccable. My review found three
doc-domain issues (none Critical/High); rather than bounce a rework round for one-line doc fixes,
the user directed me to fix them directly. All three are now resolved in commit `f6169e09` and
the full battlezone suite stays green (1078/1078):
- **F1 [MEDIUM] → FIXED:** `findings.md:605` now reads "resolved in §11.3" (was the stale
  "deferred to bz5-3" that contradicted the new section).
- **F2 [LOW] → FIXED:** added the §12 provenance/changelog row for bz5-3.
- **F3 [LOW/rule-26] → FIXED:** added a comment marking the MAME-chain block as documentary
  transcription pins and pointing at the AC1/AC2 live-read guards that actually cover production.

No outstanding blocking issues. Verified post-fix: `npx vitest run --project battlezone` → 1078/1078.

**Coverage (all 8 specialist domains accounted for; enabled = live subagent, disabled = hand-covered):**
- [SEC] reviewer-security returned CLEAN — verified: `readFileSync` targets are fixed
  `import.meta.url`-relative repo paths, no external input, no network/secrets/DOM. Agree.
- [RULE] reviewer-rule-checker — 2 rule-#26 findings CONFIRMED (see F3), downgraded to Low with
  rationale; all other 27 rules checked compliant (no type-escapes, null handling N/A, module
  conventions match sibling `timebase.test.ts`, source-text guards are uniquely-anchored).
- [DOC] comment_analyzer disabled → I hand-covered the comment/citation domain (the heart of this
  story): found F1 (stale deferral note) and F2 (missing changelog). Every MAME line citation
  independently re-verified against the off-repo source (`bzone.cpp:611/613/619`, `bzone.h:20-21`,
  gate at `:261-266`) — all land exactly. Every derived number independently recomputed — all match.
- [TEST] test_analyzer disabled → hand-covered: the genuine regression pin (`GAME_FRAME_HZ` imported
  live + drift computed from it, test.ts:94-108) and the AC1/AC2 live file-read blocks are sound;
  the chain block is documentary (F3). No vacuous `assert(true)`/`let _ =`.
- [EDGE] edge_hunter disabled → hand-covered: no branches/boundaries — pure constants, doc, string matches.
- [SILENT] silent_failure_hunter disabled → hand-covered: no try/catch, no fallbacks, no swallowed errors.
- [TYPE] type_design disabled → hand-covered: no new types; `GAME_FRAME_HZ` stays a `number` literal export.
- [SIMPLE] simplifier disabled → hand-covered: minimal and on-scope; no dead code or over-engineering.

**Findings (all resolved in `f6169e09`):**

| Severity | Issue | Location | Resolution |
|----------|-------|----------|------------|
| [MEDIUM] | New §11.3 resolves the reconcile, but a twin "deferred to bz5-3" note remained in §11.2 — the ledger contradicted itself | `plugins/battlezone/docs/battlezone-1980-source-findings.md:605` | ✓ FIXED — "deferred to bz5-3" → "resolved in §11.3" |
| [LOW] | No §12 provenance/changelog row for bz5-3, though every prior bz5 story has one | `plugins/battlezone/docs/battlezone-1980-source-findings.md` §12 | ✓ FIXED — added 2026-08-06 §11.3 row, source = MAME `bzone.{cpp,h}` |
| [LOW] | [RULE] rule-#26: "MAME clock chain" derivation tests assert arithmetic among test-local constants only | `plugins/battlezone/tests/core/timebase-mame-crosscheck.test.ts:35-61,78-92` | ✓ FIXED — comment marks them documentary pins; production guards are the AC1/AC2 live file reads |

### Rule Compliance (typescript lang-review, via rule-checker + my read)
- Rules 1-25, 27-29: **compliant** (rule-checker checked 29 rules / 41 instances; type-safety escapes 0,
  null-handling N/A, module/import conventions match the sibling test byte-for-byte, source-text guards
  #15/#25 uniquely anchored — grep-verified, retirement sweep #24 N/A: story documents the 250 Hz model
  as nominal, does not retire it).
- Rule 26 ("assertion whose terms are ALL local to the test"): **2 violations** → F3 above. Not dismissed
  (project rule); downgraded to Low because the assertions are intentional off-repo-derivation pins and
  the transcription IS guarded by the sibling AC1/AC2 live file reads. Genuine production pins (test.ts:94-108) compliant.

### Devil's Advocate
Argue this is broken. First attack: the whole 15.381-vs-15.625 reconciliation could be numerology —
if the ROM does NOT actually count 16 NMIs per frame, the "~1.59% drift" is fiction. Rebuttal: the
÷16 mechanism is triple-sourced — the bz3 audit's `AND I,0F`/`INC SYNC` at BZONE.MAC:1084-1088, MAME's
independent `set_periodic_int(CLOCK_3KHZ/12)` giving 246.094 Hz, and MAME's separate `set_refresh_hz(.../6)`
confirming the vector node is ÷6 not ÷16 — so the frame divisor is not invented. Second attack: keeping
15.625 while MAME says 15.381 means the clone is knowingly wrong — a fidelity regression smuggled in as
"documentation." Rebuttal: this is an explicit user ruling with a ~1.59% magnitude that the ROM's own
"64 MS" comment already rounds away, and the bz5-1 pre-ruling ("does not materially change the window")
predates it; correcting would re-baseline the entire audited bz3 magnitude suite for sub-2%, which the
story's mandate forbids. It is documented, not hidden. Third attack: a Dev could later "fix" GAME_FRAME_HZ
to 15.381 and break every magnitude — is that guarded? Yes: test.ts:105-108 pins `GAME_FRAME_HZ === 15.625`
AND `not.toBeCloseTo(15.381)`, so the rewrite reddens immediately. Fourth attack: could the MAME citations
be to the wrong lines? Checked — I `sed`-read all six cited lines from the off-repo tree; each is exact.
Fifth: does the change break any existing suite (AC3)? Preflight says 1078/1078 + 398/398, lint green.
The only genuine miss the devil finds is the one already caught: the stale §11.2 cross-reference (F1).

**Handoff:** To SM (Ruby Rhod) for finish-story. All three findings fixed in-place (`f6169e09`);
suite green 1078/1078; no outstanding blocking issues.

## Impact Summary

**Delivery Outcome:** APPROVED (single review round, all findings fixed in-place). The story
reconciles the clone's 15.625 Hz game-frame against MAME's independent executable clock chain,
confirming the ROM mechanism (game frame = NMI÷16, vector refresh = NMI÷6) while documenting a
~1.59% nominal-vs-exact frequency delta. Per explicit user ruling (2026-08-06) the magnitude is
kept unchanged; the reconciliation and delta are documented in the findings ledger (§11.3) and a
MAME second-source citation in `src/core/timebase.ts`.

**Core finding (TEA + Reviewer aligned):** MAME's chain proves the ROM's NMI is exactly
246.094 Hz (`bzone.cpp:613`), not the round 250 Hz implied by the "64 MS" comment → exact frame
15.381 Hz vs the clone's pinned 15.625 Hz (~1.59% fast, which the ROM's own 64 ms label already
rounds away). Closes the reconcile bz5-1 deferred (AC1). No magnitude corrected (verification-first).

**Three non-blocking findings — ALL FIXED in `f6169e09`:**
1. [MEDIUM] Stale ledger contradiction: §11.2's "deferred to bz5-3" note contradicted the new
   §11.3. FIXED — updated to "resolved in §11.3"; ledger self-consistent.
2. [LOW] Missing §12 provenance row for bz5-3. FIXED — added 2026-08-06 row citing MAME source + §11.3.
3. [LOW / rule-26] MAME-chain derivation tests assert test-local arithmetic only. FIXED — comment
   marks them documentary pins; production guards are the compliant AC1/AC2 live file-read blocks.

**Suite status:** battlezone 1078/1078, orchestrator 398/398, lint clean. No regressions. Blockers: 0.

**Files delivered:** `plugins/battlezone/tests/core/timebase-mame-crosscheck.test.ts` (new, 16 pins),
`plugins/battlezone/src/core/timebase.ts` (MAME second-source citation; `GAME_FRAME_HZ` unchanged),
`plugins/battlezone/docs/battlezone-1980-source-findings.md` (§11.3 + §12 row + §11.2/§11 deferral updates).
Commits: `0f0deaed` RED, `9551f410` GREEN, `f6169e09` review fixes.