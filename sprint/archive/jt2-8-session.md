---
story_id: jt2-8
jira_key: jt2-8
epic: jt2
workflow: trivial
---
# Story jt2-8: Correct the OSTBO wrong-prose — AC-1 in epic-jt2.yaml and docs/rom-study/subsystems.md say 'fraction included'; the ROM compares WHOLE PIXELS + PLANTZ (fraction EXCLUDED, PPOSY offset +0 vs the flight core's +1). Independently re-derived twice in jt2-3 (TEA triangulation + rule-checker item-0, quoted lines RAMDEF.SRC:174, JOUSTRV4.SRC:5008-5009, 6494, 6071-6072). Fix the dossier prose at subsystems.md:137-139; the corrected law is already pinned by tests/joust.test.ts + JT23 claims. Required by the jt2-3 Reviewer (tracked, not lost).

## Story Details
- **ID:** jt2-8
- **Jira Key:** jt2-8
- **Workflow:** trivial
- **Repo:** joust
- **Stack Parent:** none
- **Branch Strategy:** gitflow (chore/jt2-8-rom-prose-corrections)

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-07-27T11:37:55Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-27T11:01:00Z | 2026-07-27T11:02:50Z | 1m 50s |
| implement | 2026-07-27T11:02:50Z | 2026-07-27T11:15:07Z | 12m 17s |
| review | 2026-07-27T11:15:07Z | 2026-07-27T11:28:21Z | 13m 14s |
| implement | 2026-07-27T11:28:21Z | 2026-07-27T11:30:36Z | 2m 15s |
| review | 2026-07-27T11:30:36Z | 2026-07-27T11:37:55Z | 7m 19s |
| finish | 2026-07-27T11:37:55Z | - | - |

## Sm Assessment

**Story:** jt2-8 — prose-only ROM-fidelity dossier correction (1pt, trivial/phased, joust).

**Nature of the work (analysis):** This is a documentation correction, not a code change. Three
wrong-prose statements are to be fixed; all three describe laws that were **already re-derived twice
from ROM source and are already pinned green by existing tests**. The tests hold the corrected law;
the prose lags. The Dev's task is to make the prose agree with what the tests and ROM already say —
NOT to change behavior.

**The three corrections (with the ROM citations to preserve):**
1. **OSTBO landing** — `joust/docs/rom-study/subsystems.md:137-139` and the epic-jt2.yaml jt2-3 AC-1
   say "fraction included." The ROM compares WHOLE PIXELS + PLANTZ, fraction **EXCLUDED** (PPOSY
   offset +0 vs the flight core's +1). Cites: RAMDEF.SRC:174, JOUSTRV4.SRC:5008-5009, 6494,
   6071-6072. Pinned by `tests/joust.test.ts` (JT23).
2. **REMOUNT edge** — jt2-4's description + AC-3 + epic law say "NEARER" edge. The ROM enters from
   the **FARTHER** edge. Cites: JOUSTRV4.SRC:3270-3279, ELEFT/ERIGHT EQUs :38-39 → entry X −9/+291.
   Pinned by `tests/egg.test.ts` (JT24-030..033).
3. **WAVTBL row count** — epic description ("full 80-row WAVTBL decode," also jt2-5 entry +
   carried-seeds item 5 + context files) is wrong. The table is **90 ROWS** (WAVTBL :2438 to
   WTBEND :2546; WTBRST=row 81, loop cycles rows 81-90; the "WAVE 80" comment on the last row is a
   source copy-paste artifact). Pinned by `tests/wave-source.test.ts` (90-row byte-gate).

**Scope boundary for Dev:** Prose only. If a code/test change appears necessary to satisfy any of
these, STOP — that means the "already pinned green" premise is false and this becomes a Delivery
Finding to route back, not a silent scope expansion. Touch the joust dossier prose + the epic YAML
prose the story names; do not touch `src/core` or the sim.

**Files in scope:** `joust/docs/rom-study/subsystems.md` (OSTBO), the jt2-4/jt2-5 epic YAML law/AC
prose + related joust context/carried-seeds prose, and the `sprint/epic-jt2.yaml` jt2-3/jt2-4/jt2-5
entries as named. Verify each edit against the cited ROM lines and the already-green test.

**Routing:** Setup gates pass — session, context, branch (`chore/jt2-8-rom-prose-corrections` on
joust `develop`) all verified on disk. Handing off to Yoda (Dev) for the implement phase.

## Dev Assessment

**Implementation Complete:** Yes
**Nature of change:** PROSE ONLY — no source code, no test files touched. All three
corrected laws were already re-derived from ROM source and pinned green by existing
tests; this chore makes the tracked prose agree with the tests and the ROM.

**Files Changed:**

_joust_ (branch `chore/jt2-8-rom-prose-corrections`, commit `3b44559`):
- `docs/rom-study/subsystems.md` — (1) OSTBO: `PLANTZ + PPOSY` compared on WHOLE
  PIXELS, fraction EXCLUDED (OSTBO reads PPOSY at offset +0, not the flight core's
  +1); (2) hatch: buzzard remounts from the FARTHER edge (was "nearer").
- `docs/rom-study/open-questions.md` — (3) §4: WAVTBL is a 90-row decode (was "80-row").

_orchestrator_ (`main`, commit `166e9b2`):
- `sprint/epic-jt2.yaml` — jt2-3 desc + AC-1 (OSTBO whole-pixel / fraction-excluded),
  jt2-4 desc + AC-3 (remount farther edge), jt2-5 title/desc + carried-seed #5 (WAVTBL 90).
- `sprint/context/context-story-jt2-3.md` (OSTBO), `-jt2-4.md` (remount edge),
  `-jt2-5.md` (WAVTBL 90), `context-epic-jt2.md` (carried-seed #5 → 90) — mirror-consistency.

**Ground-truth verification (each correction traced to its already-green pin):**
- OSTBO fraction-EXCLUDED → `tests/joust.test.ts` AC-1 ("plantHeight is plantZ +
  (posY >> 8); the fraction is NOT part of it"; "same WHOLE pixel, DIFFERENT fraction
  ⇒ TIE") + `tests/joust-source.test.ts` ("PPOSY+1 is the 8.8 fraction word" @
  JOUSTRV4.SRC:6494); corrected claim already in `joust.json:58`.
- Remount FARTHER edge → `tests/egg.test.ts` (JT24-030..033); corrected claim already
  in `egg.json:274` (BHI EGGMRT: man-on-right selects the LEFT/farther start).
- WAVTBL 90 rows → `tests/wave-source.test.ts` byte-gate ("exactly 90 four-byte rows"
  = 360 bytes; WTBRST=wave 81, WTBEND :2546).

**Tests:** joust **1551/1551 passing across 63 files (GREEN, exit 0)**, run via
testing-runner AFTER the edits (no FILE:LINE citation tokens added or removed, so the
citation/byte gates are unaffected). Orchestrator `epic-jt2.yaml` validated as
well-formed and re-read cleanly by `pf`.
**Branch:** `chore/jt2-8-rom-prose-corrections` (joust, committed) + `main` (orchestrator, committed)

**Left intentionally untouched:** the jt2-8 story text itself (quotes the wrong prose
to describe the fix); the byte-gated claims JSON (`joust.json:58`, `egg.json:274`
already encode the corrected laws); `qualified.json:535` (jt1-8 historical record — see findings).

**Handoff:** To review (Obi-Wan / Reviewer).

### Dev Rework — Round 2 (orchestrator, commit `22e130b`)

Reviewer REJECTED round 1: correction #1 (OSTBO) was factually right where applied but
**incomplete** — the "sub-pixel" phrasing of the corrected-away law survived in four tracked
places my round-1 grep missed (it searched only "fraction included"). Root cause: the
context-story mirrors carry BOTH a description AND a separate acceptance-criteria list; I fixed
jt2-3's description (round 1) but not its AC-1 mirror, and the "sub-pixel" title/xref variants
never matched my search terms. Fix (all four, prose-only, no citations touched):

- `epic-jt2.yaml:40` jt2-3 title + `context-story-jt2-3.md:4` mirror: "OSTBO sub-pixel resolution"
  → "OSTBO whole-pixel resolution".
- `context-story-jt2-3.md:27` (jt2-3 AC-1 mirror): rewrote the full verbatim old lie to match the
  corrected epic AC-1 (`epic-jt2.yaml:49`) — whole-pixel, fraction EXCLUDED, PPOSY offset +0,
  tie = same whole pixel any fraction.
- `context-story-jt2-9.md:53` xref: "OSTBO sub-pixel resolution" → "whole-pixel resolution".

**Re-verification:** comprehensive re-sweep (`grep -riE "sub-?pixel|fraction included|fraction
level|1-fraction-unit|not integer Y"` across `sprint/`) now shows ZERO live OSTBO wrong-prose —
the only hits are jt2-8's own story text, the round-1 `review_findings` reject record, and the
corrected AC-1 lines that name "the false-'sub-pixel' trap, corrected in jt2-8". Corrections #2/#3
were already complete. `epic-jt2.yaml` valid YAML; `pf` reads the corrected jt2-3 title.
Orchestrator-only changes — joust suite unaffected (still 1551/1551 from round 1).
**Handoff:** back to review.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- **Question** (non-blocking): `qualified.json:535` still quotes the OLD "buzzard flies
  in from the nearer edge" prose. Affects `joust/docs/rom-study/claims/qualified.json`
  (a jt1-8 historical citation-resolution record — only its JOUSTRV4.SRC:3245-3278 citation
  is byte-gated, not the English prose). Left as an audit trail rather than falsified;
  `egg.json:274` is the corrected FARTHER-edge pin. Reviewer may decide whether to append a
  "(corrected in jt2-8)" note there. *Found by Dev during implementation.*
- **Improvement** (non-blocking): The joust suite prints 3 audit warnings before tests run
  ("a claim has no id", "(missing id): missing claim", "(missing id): missing or malformed
  source citation"). Affects `joust/docs/rom-study/claims/` (a claim lacking an id / malformed
  citation — PRE-EXISTING, not introduced by this prose change; suite is green regardless).
  Candidate for a claims-hygiene follow-up. *Found by Dev during implementation.*
- No blocking findings.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- **Scope propagation beyond the literal file list.** The story enumerated "context files"
  only for correction #3 (WAVTBL). I also propagated correction #1 (OSTBO fraction) and #2
  (remount edge) into their mirror context files (`context-story-jt2-3.md`,
  `context-story-jt2-4.md`) and corrected #3 in `joust/docs/rom-study/open-questions.md:119`
  ("80-row" → "90-row"). **Why:** those context files are regenerated-from-epic mirrors of
  the exact entries I corrected, and carried-seed #5 explicitly cites "open-questions §4 names
  it" — leaving §4 at "80-row" while the seed now says 90 would self-contradict the very
  correction this story exists to make. All prose-only, no citations added/removed, suite green.

### Reviewer (audit)

- **Dev's scope-propagation deviation** → ✓ ACCEPTED by Reviewer: sound and required, not
  overreach. The mirror context files (`context-story-jt2-3/4/5.md`, `context-epic-jt2.md`) are
  regenerated-from-epic copies of the exact entries corrected, and carried-seed #5 explicitly
  cites "open-questions §4 names it" — correcting the epic while leaving §4 or the mirrors at the
  old value would ship a self-contradicting dossier. Prose-only, no citation tokens touched,
  suite stays green (1551/1551). No blast radius.
- **Undocumented deviations:** none. I diffed both repos line-by-line; every hunk maps to one of
  the three named corrections. No silent scope creep, no stray files.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (R1+R2) | clean | none | R1+R2 mechanical: joust 1551/1551 green both rounds (exit 0), tsc clean, prose-only (0 code files), 0 citation tokens altered, epic-jt2.yaml valid YAML; R2 diff orchestrator-only, joust unchanged (3b44559, clean) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes (R1+R2) | clean (R2) | R1: found 4 OSTBO "sub-pixel" survivors → REJECT; R2: all 4 fixed + exhaustive 55-instance sweep = **0 live survivors** | R1 blocker RESOLVED in R2; 0 violations; 1 deferred (qualified.json) |

**All received:** Yes (2 enabled returned in both review rounds; 7 disabled pre-filled as skipped)
**Total findings:** Round 1 = 1 blocking (OSTBO incomplete, Reviewer-found) + 1 deferred → **fixed in round 2**. Round 2 = **0 blocking, 0 dismissed, 1 deferred** (qualified.json historical disclaimer, future story).

### Round-1 challenge to rule-checker's scope claim — RESOLVED in round 2

The round-1 rule-checker reported "confirmed no other live instance of these three laws was left
uncorrected." That was **wrong for correction #1**: it verified the "fraction included" phrasing paths
but did not grep the **"sub-pixel"** phrasing — the same variant the Dev's round-1 grep missed. My
independent Reviewer sweep (`grep -riE "sub-?pixel"`) found four surviving OSTBO-wrong-prose instances
→ REJECT. **RESOLVED (round 2):** Dev fixed all four (commit `22e130b`); the round-2 rule-checker ran
the exhaustive variant sweep (55 instances) and confirmed **0 live survivors** — every remaining hit is
corrected text, jt2-8's own self-quotation, an unrelated fact, or a frozen archive record predating the
correction. Lesson: an incomplete search reads as "clean." The Reviewer's independent read caught it.

### Rule Compliance

Enumerated every changed line against the joust ROM-study dossier rules (institutional memory —
the citations suite is their enforcement). All three rules, all instances, COMPLIANT:

- **R-CITE** (fully-qualified `FILE:LINE`, never bare `:N`; no existing token altered) — 3/3 compliant.
  `subsystems.md:137-139` (`JOUSTRV4.SRC:5014-5017` byte-identical pre/post), `subsystems.md:148`
  (`JOUSTRV4.SRC:3245-3278` unchanged), `open-questions.md:119` (no token in the line). Epic/context
  mirrors carry descriptive prose only — no citations. Preflight independently confirmed 0 tokens
  added/removed/altered.
- **R-GROUND** (prose must agree with the claims JSON + pinning tests) — 3/3 compliant. OSTBO ↔
  `claims/joust.json:58` + `joust-source.test.ts:62-69` (reads `PPOSY,X` offset +0, asserts
  `.not.toContain('PPOSY+1')`); remount ↔ `claims/egg.json:274` + `egg.test.ts` AC-3; WAVTBL ↔
  `wave-source.test.ts:231-232,263-266`.
- **R-NOLIE** (dossier must not state a law the tests/ROM contradict) — 3/3 compliant. In each case
  the OLD prose was the lie and the NEW prose is exactly what the passing tests assert (264/264 in
  the four relevant suites; 1551/1551 full).

### Observations

- [VERIFIED] OSTBO correction is factually true — evidence: `joust/tests/joust.test.ts:74-111`
  proves `plantHeight = plantZ + (posY>>8)` drops the fraction (`plantZ 2, posY (100<<8)|0xff → 102`,
  not 102.996) and "same WHOLE pixel, DIFFERENT fraction ⇒ TIE"; `claims/joust.json:58` already pins
  "WHOLE PIXELS, fraction EXCLUDED … offset +0 … NOT PPOSY+1". New prose (`subsystems.md:137-139`,
  epic jt2-3) matches. Complies with R-GROUND + R-NOLIE.
- [VERIFIED] Remount FARTHER edge is factually true — evidence: `joust/tests/egg.test.ts` AC-3:
  `remountEntryEdge(200)` → `REMOUNT_ENTRY_LEFT_X` (−9), `remountEntryEdge(100)` → `RIGHT_X` (291),
  each asserted as "the FARTHER edge"; `claims/egg.json:274` (`BHI EGGMRT`). New prose matches.
- [VERIFIED] WAVTBL 90 rows is factually true — evidence: `joust/tests/wave-source.test.ts:231-232`
  ("exactly 90 four-byte rows", 360 bytes) + `:263-266` (`WAVE_TABLE.length === 90`). The count is
  anchored to the WAVTBL→WTBEND byte range, not to the ROM's stale "WAVE 80" comment. New prose matches.
- [VERIFIED] Genuinely prose-only, no behavior risk — evidence: `git -C joust diff develop...HEAD`
  touches only 2 `.md` files; no `src/`/`tests/`; full suite 1551/1551 green, `tsc --noEmit` clean.
- [HIGH] **OSTBO correction is INCOMPLETE** — the "sub-pixel" phrasing of the corrected-away law
  survives in four tracked places (see Findings table). Worst: `context-story-jt2-3.md:27` still
  reads verbatim "resolves on the 16-bit sub-pixel … 1-fraction-unit … proven at the fraction
  level, not integer Y" — a direct contradiction of the corrected epic AC-1 (`epic-jt2.yaml:49`)
  it mirrors. The jt2-3 title (`epic-jt2.yaml:40`, mirror `context-story-jt2-3.md:4`) labels OSTBO
  "sub-pixel resolution," now self-contradicting its own corrected AC-1/description.
- [VERIFIED] Partial scope boundary correctly honored — `epic-jt2.yaml:115-116` (jt2-8's own text)
  quotes the wrong prose to *describe* the fix and is correctly untouched; `subsystems.md:25-26,45`
  generic "pixel + fraction" layout facts are true and NOT OSTBO claims (the flight core reads
  `PPOSY+1`), correctly untouched; `flight.json:166,175` "sub-pixel accumulator" is a true flight-X
  velocity fact, unrelated; `context-story-jt1-4.md` "sub-pixel-rests" is landing, unrelated.
  (These exclusions are right; the four in the Findings table are the miss.)
- [RULE] reviewer-rule-checker: 0 violations across R-CITE / R-GROUND / R-NOLIE at
  `subsystems.md:137-139,148`, `open-questions.md:119`, `epic-jt2.yaml` jt2-3/4/5, and the context mirrors.
- [LOW] `claims/qualified.json:535` still reads "nearer edge" — it is the check-citations
  frozen-evidence ledger (`tools/audit/check-citations.mjs:29-33` never parses claim prose), a
  jt1-8 historical record of what the dossier said when its bare citation was qualified. Leaving it
  preserves the audit trail (same frozen-evidence pattern red-baron uses). Non-blocking; a future
  story could add a one-line "Qualified in jt1-8 = historical" disclaimer atop the file. DEFERRED.

### Devil's Advocate

Argue this is broken. **Strongest attack: the prose and the tests both re-baked the same
misreading** — a fidelity project's classic failure, where a wrong constant gets copied into a
test that then "confirms" it. If that happened here, my APPROVED would ship a lie with a green
badge. But it is ruled out by construction: `joust-source.test.ts:62-69` and `wave-source.test.ts`
byte-gate read the *actual vendored `JOUSTRV4.SRC` bytes* (the `ADDD PPOSY,X` opcode at offset +0;
the 90×4-byte WAVTBL→WTBEND range), not a hand-typed value — so the whole-pixel/90-row facts are
derived from ROM source, not asserted against it. A shared misreading would require the disassembly
itself to be wrong, which is outside this story. **Second attack: an off-by-one in "90 rows"** — is
WTBRST (row 81) double-counted, or the plateau excluded? No: the gate counts the byte range to
exactly 360 = 90×4 and separately asserts `WAVE_TABLE.length === 90`; two independent anchors agree.
**Third: a confused reader** greps `fraction` in `subsystems.md`, sees lines 25-26 still say
"pixel + fraction," and concludes OSTBO includes the fraction. Mitigated — the corrected sentence
explicitly says "fraction EXCLUDED (OSTBO reads PPOSY at offset +0, not the flight core's +1),"
disambiguating the field's general layout from what the joust compare reads. **Fourth: cross-repo
hazard** — the orchestrator edit went straight to `main`; did it corrupt an unrelated AC via YAML
reserialization (a known sm-finish trap)? No: edits were targeted string replacements, the file
validates as YAML, and `pf` re-reads jt2-5's title cleanly — no reserialization occurred. **Fifth:
the stale `qualified.json:535`** — could a downstream consumer treat it as current ROM truth and
regress the fix? Only if something parsed that ledger's prose as an assertion; `check-citations.mjs`
explicitly does not. Logged as Low. No attack survives; verdict stands.

## Reviewer Assessment

**Verdict:** APPROVED

**Round history:** Round 1 REJECTED — correction #1 (OSTBO) was factually right where applied but
INCOMPLETE: the "sub-pixel" phrasing of the corrected-away law survived in four tracked places
(jt2-3 title `epic-jt2.yaml:40` + mirror `context-story-jt2-3.md:4`; the jt2-3 AC-1 **mirror**
`context-story-jt2-3.md:27`, which held the full verbatim old lie; and the `context-story-jt2-9.md:53`
xref). Root cause: the round-1 grep searched only "fraction included," missing the "sub-pixel"
variant. Round 2 (commit `22e130b`, orchestrator-only) fixed all four.

**Story:** jt2-8 — prose-only ROM-fidelity dossier correction (1pt, trivial, joust + orchestrator).
All three corrections are now complete and verified true against the ROM source and the pinning tests.

**Round-2 verification:**
- All four previously-flagged instances now read "whole-pixel"; `context-story-jt2-3.md:27` matches
  the corrected epic AC-1 (`epic-jt2.yaml:49`) verbatim (whole-pixel, fraction EXCLUDED, PPOSY
  offset +0, tie = same whole pixel any fraction). Confirmed by rule-checker + my own read.
- Exhaustive survivor sweep (rule-checker, 55 instances across `sprint/` + `joust/docs/rom-study/`):
  **zero genuine live OSTBO wrong-prose survivors**. All remaining hits are the corrected text,
  jt2-8's own self-quotation, unrelated facts (flight-X velocity accumulator, landing snap, other
  games), or frozen archive records (`archive/epic-jt1.yaml`, `archive/context-epic-jt1.md`,
  `sprint-2628-completed.yaml:923` = jt2-3's archived title, archived session files) that predate the
  correction — correctly out of scope by this project's frozen-evidence / no-reanchor-laundering
  convention (same basis as `qualified.json:535`). I reviewed each exclusion and agree.
- Preflight round 2: joust unchanged since round 1 (`3b44559`, clean), suite still 1551/1551 green
  (exit 0), `epic-jt2.yaml` valid YAML, round-2 diff orchestrator-only with 0 citation tokens altered.

**Corrections #2 (remount FARTHER edge) and #3 (WAVTBL 90 rows):** complete since round 1, verified
true — `egg.test.ts` AC-3 (`remountEntryEdge(200)`→−9 left/far, `(100)`→291 right/far) + `egg.json:274`;
`wave-source.test.ts` byte-gate (360 bytes = 90×4, `WAVE_TABLE.length===90`).

**Dispatch tags (all 8; enabled = preflight[mechanical] + [RULE]):**
- [EDGE] — disabled; no boundary code in a prose diff. No findings.
- [SILENT] — disabled; no error paths in a prose diff. No findings.
- [TEST] — disabled; no test files changed. Corrected laws pinned green (`joust.test.ts` AC-1,
  `egg.test.ts` AC-3, `wave-source.test.ts` byte-gate). Suite stays 1551/1551.
- [DOC] — comment-analyzer disabled; I audited the prose across both rounds. The round-1 incomplete
  OSTBO propagation is now fully resolved; no stale/misleading text remains in tracked docs.
- [TYPE] — disabled; N/A (no types/code).
- [SEC] — disabled; N/A (documentation only).
- [SIMPLE] — disabled; N/A (prose).
- [RULE] — reviewer-rule-checker (round 2): **0 violations**; all four fixes confirmed; exhaustive
  55-instance sweep = **0 live survivors**. 1 Low deferred (`qualified.json` historical disclaimer, future story).

**Rule compliance:** R-CITE / R-GROUND / R-NOLIE — COMPLIANT. The epic's "GROUND TRUTH … never
wrong-prose" rule is now satisfied for all three corrections in live/tracked docs.
**Data flow / wiring / tenant isolation / security:** N/A — documentation only.
**Verification:** joust 1551/1551 green, `tsc` clean, `epic-jt2.yaml` valid YAML, 0 citation tokens
altered across both rounds.
**Blocking issues:** none (round-1 blocker fixed; no Critical/High/Medium remain; one Low deferred).
**Deferred follow-up:** `qualified.json:535` (+ the frozen `archive/epic-jt1.yaml` / `sprint-2628-completed.yaml`
"sub-pixel" hits) — a future story could add a one-line "historical, pre-correction" disclaimer where
these frozen records live; retroactively editing them would be reanchoring-as-laundering, so NOT done here.
**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.