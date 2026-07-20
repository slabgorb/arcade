---
story_id: "td1-4"
jira_key: "td1-4"
epic: "td1"
workflow: "tdd"
---
# Story td1-4: Triage the two orchestrator extract-audio reds — tempest/red-baron link-5 audits

## Story Details
- **ID:** td1-4
- **Jira Key:** td1-4
- **Type:** bug
- **Points:** 2
- **Workflow:** tdd
- **Repos:** .
- **Stack Parent:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

## Story Description

Two tests in the ORCHESTRATOR suite (`tests/extract-audio.test.mjs`, run with `node --test`) have been red since at least 2026-07-19 and are unowned:

1. "audit: tempest sfx — link 5 catches the 4 sounds whose shipped bake omits the ROM terminal-zero write"
2. "audit: red-baron — link 5 catches the 3 inverted envelopes (TP/BN/WP/TH synthesised, TK real)"

Confirmed still failing 2026-07-20 (19 pass / 2 fail of 21). These failures are pre-existing, not caused by any recent changes.

## Acceptance Criteria

- Both failures are diagnosed and the diagnosis is recorded: environment gap vs real regression, with the evidence that distinguishes them.
- Either the audits pass, or they SKIP self-describingly when the vendored assets are absent — never a silent pass; the orchestrator suite is green either way.

## Technical Approach

The two test failures depend on gitignored vendored Atari source/audio assets. The leading hypothesis is an ENVIRONMENT gap in this checkout rather than a code defect. The RED phase (TEA) will:

1. Run the test suite to confirm the failure state
2. Inspect the test file (`tests/extract-audio.test.mjs`) to understand what assets are required
3. Check for presence/absence of vendored assets (`reference/` directories, ROM sources, etc.)
4. Distinguish between:
   - **Environment gap**: Assets are missing from this checkout
   - **Real regression**: Code defect or asset corruption
5. Document findings with evidence
6. Either implement a fix (GREEN phase) or add proper skip logic to gracefully handle missing assets

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-20T11:36:59Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T10:20:32Z | 2026-07-20T10:23:16Z | 2m 44s |
| red | 2026-07-20T10:23:16Z | 2026-07-20T10:33:02Z | 9m 46s |
| green | 2026-07-20T10:33:02Z | 2026-07-20T10:44:11Z | 11m 9s |
| review | 2026-07-20T10:44:11Z | 2026-07-20T11:36:59Z | 52m 48s |
| finish | 2026-07-20T11:36:59Z | - | - |

## Sm Assessment

**Routing:** tdd (phased) → TEA owns RED. Story is a *bug*, but the deliverable is a
**diagnosis**, not a patch — AC1 demands recorded evidence distinguishing environment gap
from real regression. TEA must open the failures before anyone writes a fix.

**Why this story is first in the td1 run:** repo is the orchestrator (`.`), which is
trunk-based on `main` — no branch, no PR, no merge ceremony. Lowest-friction story in the
epic, so it validates the peloton pipeline before td1-1 fans out across seven subrepos.

**Load-bearing constraints for TEA (do not rediscover these the hard way):**
- The suite is `node --test tests/extract-audio.test.mjs`. **Not vitest.** Baseline to
  reproduce and cite: 19 pass / 2 fail of 21.
- The "environment gap" framing is the *prior*, NOT a finding. It arrived as a hypothesis
  and has been repeated ever since without anyone opening the tests. Treat it as unproven.
  A checkout-shaped explanation is exactly what a real regression would hide behind.
- jt1-1's TEA already proved these reds **pre-existing** by moving his own new test file
  aside and re-running. That control is the method to repeat, not a result to inherit —
  it establishes "not jt1's fault", not "not a defect".
- AC2 forbids a silent pass. A skip must be self-describing (name the missing input). The
  epic's own discipline: a test that silently passes without its inputs is worse than one
  that skips.

**Assets:** the audits depend on gitignored vendored Atari source/audio. Absence in this
checkout is expected and is not by itself evidence of either verdict — check whether the
test *knows* the difference between "input absent" and "input present but wrong".

## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `tests/helpers/link5-inputs.mjs` — link-5 shipped-input presence probe (self-describing skip reason)
- `tests/extract-audio-link5-triage.test.mjs` — 11 tests: 6 controls (pass) + 5 diagnostic (RED)

**Tests Written:** 11 tests covering AC1 (diagnosis + evidence) and AC2 (no silent pass)
**Status:** RED — 5 failing, by design
**Baseline:** 239 tests / 237 pass / 2 fail → after RED: 250 tests / 243 pass / 7 fail
**Handoff:** To Dev for implementation

## Delivery Findings

### TEA (test design)

**VERDICT — both reds are REAL REGRESSIONS in the orchestrator's own audit tooling.
The "environment gap" hypothesis is FALSE for both.**

Control that kills it (`tests/extract-audio-link5-triage.test.mjs:44`, PASSES): every
link-5 shipped input is present — `tempest/tools/pokey-bake/sfx-data.mjs`,
`tempest/tools/pokey-bake/bake-sfx.mjs`, `red-baron/src/shell/pokey.ts`. Corroborating:
both failure messages carry *compared data* ("ROM emits 44 events, shipped emits 20";
"AUDF: ROM holds flat, shipped port sweeps"), which an absent input cannot produce — a
missing input routes to `unverified(...)` in `shipped.mjs:89` / `:197`, never to MISMATCH.

- **Regression** (blocking): **red-baron link-5 scanner degraded into a constant.**
  `scripts/audio/compare/shipped.mjs:182-183` classifies a register slot as held only via
  `!/^held\(/.test(arg)`. rb4-10 (`585943b`, 2026-07-18) replaced pokey.ts's vocabulary:
  before, `TK: table(1, held(0x30), { start: 0xa4, hold: 7, change: -1, steps: 4 })`; now,
  `red-baron/src/shell/pokey.ts:142` `TK: table(1, [seq(0x30, 7, 0, 4)], [seq(0xa4, 7, -1, 4)])`.
  `held(` occurs **0 times** in that file (`seq(` occurs 16). `parseRedBaronPokeySounds`
  therefore returns `{audfSweeps: true, audcSweeps: true}` for **all five tones** — verified
  by execution. It did not fail; it silently answered "sweeps" to every question.
  *Found by TEA during test design.*

- **Gap** (blocking): **three assertions in the existing red-baron audit test pass
  vacuously.** ROM shapes are TK/TP `holds,sweeps`; BN/WP `sweeps,holds`; TH `holds,holds`
  (`tests/extract-audio-link5-triage.test.mjs:145`, PASSES). Against an all-`true` scanner
  every tone mismatches unless the ROM sweeps both — so `extract-audio.test.mjs:313-316`'s
  BN/WP/TH MISMATCH expectations are satisfied regardless of what the port says, and TH
  (ROM holds both) could never go green even if perfectly ported. This is precisely the
  silent pass AC2 forbids. *Found by TEA during test design.*

- **Gap** (non-blocking): **the red-baron test's premise is obsolete.**
  `extract-audio.test.mjs:301` is named for "the 3 inverted envelopes"; rb4-10's commit body
  states it re-sourced TP/BN/WP/TH byte-exact from RBSOUN.MAC, i.e. **un-inverted them**.
  Decoding `seq(start, hold, change, number)` (`pokey.ts:109`, change 0 ⇒ held) all five
  tones now agree with the ROM. The old expectation is stale, not merely unmet. Note
  `scripts/audio/games/red-baron.mjs:6-9` still asserts the pre-rb4-10 story in prose
  ("three of them are INVERTED in the port") — also stale. *Found by TEA during test design.*

- **Regression** (blocking): **tempest adapter's cue→address map predates tp1-2.**
  tp1-2 (`2b6c62e`, 2026-07-13) un-crossed the mapping. `scripts/audio/games/tempest.mjs:26-40`
  still carries story 6-6's by-ear mapping, producing a three-way rotation against the
  shipped bake (test output, `:191`):
  ```
  player_fire:     shipped $cbe9 vs orchestrator $cc5d
  enemy_explosion: shipped $cc5d vs orchestrator $cc81
  thrust_space:    shipped at $cc81, orchestrator has no such cue
  ```
  Link 5 is comparing the ROM slice for one cue against the shipped bake for a *different*
  cue and reporting the difference as a port defect. tp1-2 is the better-evidenced side
  (pinned by address and byte in `tempest/tests/audit/alsoun-cue-mapping.test.ts`); the
  orchestrator adapter's `WARNING: the source COMMENTS ARE LIES` header (`tempest.mjs:11-13`)
  is the 6-6 claim tp1-2 overturned. *Found by TEA during test design.*

- **Gap** (non-blocking): **absent-input vs wrong-input is only half distinguishable.**
  The comparators *do* distinguish absence (`shipped.mjs:89`, `:197` → `unverified` naming
  the path; confirmed passing at `:88`). But (a) the audit-level tests assert concrete
  verdicts, so absent inputs would surface as a misleading verdict failure rather than a
  skip — hence the new `link5SkipReason()` helper; and (b) `compareRedBaronShipped` cannot
  distinguish "present but written in a vocabulary I don't parse" from "present and
  inverted" — it returns a confident MISMATCH (`:102`, RED). That third state is the real
  hole. *Found by TEA during test design.*

- **Improvement** (non-blocking): `compareTempestSfx` (`shipped.mjs:86-87`) hardcodes its
  import URL, so absence cannot be simulated in a test the way red-baron's injectable
  `pokeyTsPath` allows. Consider a path/loader parameter. *Found by TEA during test design.*

**Recommended GREEN remedy — a real fix in both cases, not a skip.** The skip machinery is
in place for genuinely asset-less checkouts, but it must not be used here: the inputs are
present and both defects are ours.
1. Teach `parseRedBaronPokeySounds` the `seq()`/`repeat()` chain vocabulary (a chain sweeps
   iff any step's CHANGE ≠ 0), and make an unrecognised vocabulary return `unverified`.
2. Re-point `scripts/audio/games/tempest.mjs`'s `SOUNDS` at tp1-2's un-crossed mapping and
   refresh the stale header comments in `tempest.mjs` and `red-baron.mjs`.
3. Re-baseline `extract-audio.test.mjs:203` and `:301` to the corrected premises, wiring
   `link5SkipReason()` so an asset-less checkout skips loudly instead of failing.

## Design Deviations

### TEA (test design)
- **New triage test file rather than editing the two reds in place:** the story's deliverable
  is a *diagnosis*, and the existing tests' premises are themselves part of what is wrong.
  Rewriting them in RED would have destroyed the evidence. The two original reds are left
  untouched and still failing; GREEN re-baselines them from the findings above.

### Dev (implementation)
- **Two additional pre-existing tests needed a stale-label update, outside the "only two
  re-baselines" scope named in the brief.** `tests/extract-audio.test.mjs:160` ("vanished
  label as .missing") and `:178` ("becomes an UNVERIFIED row") hardcode `EX2F` as their
  example vanished label and assert the resulting row is named `player_fire` — true only
  under the pre-tp1-2 (buggy) mapping. Renaming `SOUNDS`'s `EX2F` entry to its correct name
  (`enemy_explosion`, per ALSOUN.MAC:181's own comment) reddened both as an unavoidable,
  mechanical consequence — they test the "vanished label" mechanism generically and just
  happened to use the (formerly wrong) cue name as their vehicle. Updated both to
  `enemy_explosion`, changing no assertion's substance. Left everywhere else in the file
  untouched beyond the two named re-baselines.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `scripts/audio/compare/shipped.mjs` — `parseRedBaronPokeySounds` now decodes rb4-10's
  `seq(start,hold,change,number)`/`repeat(n,seq)` chain vocabulary (sweeps iff any step's
  CHANGE ≠ 0) instead of the stale `held(...)`-only scan; an unrecognised call name inside
  a chain expression makes the tone `{ unparseable: true, reason }` instead of a false
  `{ audfSweeps:true, audcSweeps:true }`, and `compareRedBaronShipped` turns that into
  `unverified` (never a confident `mismatch`).
- `scripts/audio/games/tempest.mjs` — `SOUNDS` re-pointed at tp1-2's un-crossed mapping:
  `EX2F/EX2A` → `enemy_explosion` (was `player_fire`), `LA3F/LA3A` → `player_fire` (was
  `launch`), `T36F/T36A` → `thrust_space` (was `enemy_explosion`); `T26F/T26A` (`warp`) was
  already correct. Header comment rewritten — the "source COMMENTS ARE LIES" claim was the
  6-6 misreading; Theurer's per-slot comments are in fact correct and are what tp1-2 keyed on.
- `scripts/audio/games/red-baron.mjs` — header comment rewritten: "three of them are
  INVERTED" was true of the rb2-11 port, not the current rb4-10 one, which re-sourced
  TP/BN/WP/TH byte-exact and un-inverted them.
- `tests/extract-audio.test.mjs` — re-baselined the two named reds (tempest at the old
  `:203`, red-baron at the old `:301`) to the corrected premises, each wired to
  `link5SkipReason()` for a self-describing skip if run in an asset-less checkout; updated
  two more pre-existing tests (`:160`, `:178`) whose hardcoded `EX2F`→`player_fire` example
  went stale as a direct consequence of the `SOUNDS` rename (see Design Deviations).

**Tests:** 250/250 passing (GREEN) — full orchestrator suite (`npm test`), 0 fail, 0 skipped.
The 11-test triage file (`tests/extract-audio-link5-triage.test.mjs`) is 11/11 green,
including all 5 tests TEA left RED.

**Branch:** none — orchestrator repo, trunk-based on `main`, committed directly.

**Handoff:** To review

## Round 1 Review — REJECTED (superseded by Round 2)

*Heading deliberately does not read "Reviewer Assessment": the finish gate's tag scan
(`complete_phase.py:447`) matches the FIRST `## Reviewer Assessment` and truncates at the next
heading, so leaving this as the canonical heading would make the gate read the REJECTING round
and never see Round 2's specialist tags. The verdict record below is unaltered.*

**Verdict:** REJECTED
**Reviewed:** `82c90b7` (RED, test-only) + `74f57c9` (GREEN) as one unit.
**Suite:** 250 tests / 250 pass / 0 fail / 0 skipped — reproduced (`node --test`, node v25.9.0).

### Mirror-risk mutation check (the load-bearing ask): PASSES FOR 4 OF 5 TONES, FAILS FOR TH

The diagnosis is correct and the fix is real for TK/TP/BN/WP. It is **not** real for TH,
and TH ships stamped ROM_VERIFIED.

Harness: copy `red-baron/src/shell/pokey.ts` to a temp dir, perturb one `seq()` CHANGE,
run the real `compareRedBaronShipped(tone, romShape, mutatedPath)`. Every mutation was
verified to have actually applied (string-replace no-ops were caught and reported).

| Mutation | Expected | Got |
|---|---|---|
| M0 unmutated | all match | all match |
| M1 TK AUDF change 0→1 | TK mismatch | **mismatch** — "AUDF: ROM holds flat, shipped port sweeps" |
| M2 TK AUDC change −1→0 | TK mismatch | **mismatch** — "AUDC: ROM sweeps, shipped port holds flat" |
| M3 TK fully inverted | TK mismatch, both regs | **mismatch** — names AUDF *and* AUDC |
| M4 BN `repeat()` AUDF 1→0 | BN mismatch | **mismatch** |
| M8 WP `repeat()` AUDF −1→0 | WP mismatch | **mismatch** |
| M9 WP AUDC 0→3 | WP mismatch | **mismatch** |
| M10 TP AUDC −1→0 | TP mismatch | **mismatch** |
| M7 unknown `ramp()` vocabulary | TK unverified | **unverified** |
| **M5 TH real AUDC chain 0→−1** | **TH mismatch** | **match — NOT CAUGHT** |
| **M6 TH AUDF step 4 of 6, 0→1** | **TH mismatch** | **match — NOT CAUGHT** |

So the new scanner is genuinely a measurement, not a constant — except on TH, where it is
reading the wrong bytes.

### Severity table

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | `splitTopLevelArgs` is bracket-blind, so TH's register slots are mis-read; the audit reports `three_hundred` ROM_VERIFIED having never read TH's AUDC chain | `scripts/audio/compare/shipped.mjs:144-149`, consumed at `:229`; asserted at `tests/extract-audio.test.mjs:359-360` | Track `[`/`]` depth alongside `(`/`{`; add a regression test with a multi-element `seq()` array carrying a nonzero CHANGE |
| [HIGH] | The MISMATCH branch of `compareRedBaronShipped` — the whole point of the fix — is exercised by **no test**. Flipping either `!==` to `===` leaves all 250 tests green | `scripts/audio/compare/shipped.mjs:263-273`; nothing in either test file covers it | Add a synthetic *parseable* `seq()/repeat()` fixture genuinely inverted vs the ROM, asserting `'mismatch'` and that the diff names the right register. Include a TH-shaped multi-element array case |
| [MEDIUM] | A non-numeric CHANGE yields `NaN`, and `NaN !== 0` is `true` → a confident "sweeps" instead of `unverified` | `scripts/audio/compare/shipped.mjs:180-190` (`seqChanges`) | Reject non-finite CHANGE into the existing `unparseable` path |
| [MEDIUM] | `player_fire`'s reason regex is identical to the terminal-zero group's, so it cannot distinguish the two defects the comment claims are distinct | `tests/extract-audio.test.mjs:243` vs `:236` | Pin a reason substring unique to the AUDC-mask divergence — or defer to td1-5 |
| [LOW] | Triage file's narrative still describes both bugs in the present tense — "These tests fail on purpose. Do NOT green them by loosening an assertion" is now literally false (11/11 pass) | `tests/extract-audio-link5-triage.test.mjs:1-26`, `:172-181` | One-line "RESOLVED by 74f57c9 — kept as a regression suite" addendum |
| [LOW] | Pre-existing: test name claims "pokey.ts has it inverted" but the body never opens pokey.ts, so it passes forever regardless of the port | `tests/audio-red-baron.test.mjs:19` | Out of td1-4 scope — route to td1-5 |

### The blocking finding in detail

`splitTopLevelArgs` (`shipped.mjs:144-149`) increments depth on `(` and `{` and decrements
on `)` and `}` — but never on `[` or `]`. TH is the only tone whose register chain is a
multi-element **bare array literal** (six notes, not wrapped in a single `repeat()`), so the
commas *between* its `seq()` calls sit at depth 0 and are misread as `table()`'s own argument
separators. TH's args split into **10** fragments instead of 4:

- `args[1]`, read as AUDF = `"[\n      seq(0x79, 2, 0, 0x10)"` — the first note only
- `args[2]`, read as AUDC = `"seq(0x6c, 2, 0, 0x10)"` — **the second AUDF note**
- TH's actual AUDC chain, `[seq(0xa4, 2, 0, 0x80)]`, is never read at all

Proved through the public API (`parseRedBaronPokeySounds` on the real file):

```
BASELINE                                  TH = {"audfSweeps":false,"audcSweeps":false}
mutate TH AUDF step1 (0x79) change 0->9   TH = {"audfSweeps":true, "audcSweeps":false}
mutate TH AUDF step2 (0x6c) change 0->9   TH = {"audfSweeps":false,"audcSweeps":true}   <-- AUDF step read as AUDC
mutate TH AUDF step3 (0x60) change 0->9   TH = {"audfSweeps":false,"audcSweeps":false}  <-- invisible
mutate TH AUDC (0xa4,2,0,0x80) 0->9       TH = {"audfSweeps":false,"audcSweeps":false}  <-- invisible
```

`args.length < 3` never trips (misalignment only ever *adds* args) and `chainSweeps` never
returns `null` on the well-formed fragments, so the function returns a confident,
non-`unparseable` verdict computed from the wrong bytes. TH currently renders the right
answer **by coincidence**: both fragments it happens to read have CHANGE 0, which matches
the ROM's holds/holds. Independently reproduced by the silent-failure specialist in both
directions — a correctly-ported sweeping TH reported MISMATCH, and a genuinely broken flat
port reported MATCH.

`tests/extract-audio-link5-triage.test.mjs:141` makes the mistaken provenance explicit:
`TH: { audfSweeps: false, audcSweeps: false }, // six change-0 notes / seq(0xa4,2,0,0x80)`.
Neither half of that comment is how the value was actually obtained.

**Why this blocks a 2-point story.** The one thing this story cannot ship is an audit that
lies, and `three_hundred: ROM_VERIFIED` is exactly that. The defect in `splitTopLevelArgs`
pre-dates the diff, but under the old constant-scanner TH was *vacuously red*; this diff
converts it into a confident, shipped, wrong green and adds an assertion pinning it. It is
the same failure class the story exists to eliminate, in a new costume. The remediation is
one character class wider in each branch of the depth tracker — verified on the extracted TH
string: 10 mis-split args → 4 correct args, `args[2]` → `"[seq(0xa4, 2, 0, 0x80)]"`.

### What I verified as GOOD (do not re-litigate)

- **Tempest cue remap — CONFIRMED against primary source.** `reference/atari-source/tempest/ALSOUN.MAC`
  is present in this checkout; PNTRS at `:87-100` gives `OFFSET EX ;ENEMY EXPLOSION` → `$cc5d`,
  `OFFSET LA ;PLAYER FIRE` → `$cbe9`, `OFFSET T3 ;THRUST IN SPACE` → `$cc81`, `OFFSET T2 ;THRUST IN TUBE`
  → `$cc75`. All four agree with Dev's map, with `tempest/tests/audit/alsoun-cue-mapping.test.ts`,
  and with the shipped bake byte-for-byte. The dispatch chain (`ALSOUN.MAC:224,249,251,253`)
  corroborates the semantics, so this rests on more than comment-trust. The `launch`→`player_fire`
  rename was load-bearing, not cosmetic: `launch` matched no cue in the shipped bake, so link 5
  could never have compared `$cbe9` at all.
- **AC2 — satisfied, by execution.** `link5SkipReason` returns `null` for both audits in this
  checkout, so a skip cannot dodge the live reds; against an empty root it names each missing
  file and states "SKIPPED, not passed: the shipped port was NOT compared against the ROM."
- **Not weakened to get green.** `player_fire` still asserts MISMATCH with a reason match;
  red-baron went from 3 vacuous MISMATCHes to 5 asserted ROM_VERIFIEDs; counts are pinned
  (`sfx.length === 13`, `analog.length === 4`, `sfx.length === 5`).
- **Absence handling is sound.** Empty chain, spread-of-a-const, and unknown call names all
  route to `unparseable` → `unverified`, never a confident default.
- **The new `bake-sfx.mjs` `expandSeq()` finding is real and correctly scoped OUT.** It lives in
  a subrepo file (`tempest/tools/pokey-bake/`), td1-4's repo scope is `.`, and the audit
  *correctly reports it* as a MISMATCH rather than hiding it. Surfacing rather than silencing it
  is the right call; it belongs on tempest's backlog.
- **Header rewrites are accurate.** Both new headers check out against the game repos' commit
  history (`6505a60` rb2-11 vs `585943b` rb4-10; `2b6c62e` tp1-2).

### Deviation audit

- **TEA — new triage file rather than editing the two reds in place:** ACCEPTED. The premises
  under test were themselves part of the defect; rewriting them in RED would have destroyed
  the evidence.
- **Dev — two collateral test updates for the `EX2F` rename (`:160`, `:178`):** ACCEPTED.
  Mechanical and substance-preserving; `:163`'s guard (`'EX2F must exist in the real parsed
  labels for this test to mean anything'`) keeps them non-vacuous.
- **UNDOCUMENTED:** none found.

### The second blocking finding — why TH slipped through

The vacuity sweep found that `compareRedBaronShipped`'s MISMATCH branch
(`shipped.mjs:263-273`) is covered by **no test at all**. Every red-baron assertion in both
files exercises only `'match'` (the real, currently-matching `pokey.ts`), `'unverified'`
(absent file), or `'unverified'` (unknown vocabulary). There is no synthetic *parseable*
fixture that is genuinely inverted relative to the ROM.

Counterfactual: flip either `!==` to `===` at `:264`/`:267`, or delete the `diffs.push` lines.
`compareRedBaronShipped` then returns `'match'` unconditionally for any parseable input — and
**all 250 tests still pass**, because the real-file tests already expect `'match'`. The exact
failure mode this story exists to close would recur undetected.

This is a coverage *regression*, not a pre-existing gap: the old `held()`-only suite at least
traversed a mismatch-producing path (vacuously); the vocabulary changed and nothing replaced it.

The two HIGHs are one remediation. My mutation harness had to be written from scratch precisely
because the suite contains no negative fixture — and it is the absence of that fixture that let
the TH mis-split ship stamped ROM_VERIFIED. A negative fixture that includes a **TH-shaped
multi-element array with a nonzero CHANGE** closes both findings at once.

### Specialist coverage

All eight-way fan-out reported. Preflight, silent-failure, comment-analyzer, test-analyzer and
an independent tempest-remap verification all returned; the silent-failure and test-analyzer
findings were reproduced by execution before being accepted, and the comment-analyzer's
red-baron "three of the four inverted" nit was dismissed (inherited verbatim from `32cb7a9`,
not introduced here, and true enough for BN/WP).

**Handoff:** Back to Dev for the [HIGH]; the two [MEDIUM]s and two [LOW]s are Dev's call or
td1-5's, not blockers.

## Delivery Findings (continued)

### Reviewer (code review)
- **Gap** (blocking): `splitTopLevelArgs` tracks `(`/`{` but not `[`/`]`, so any `table()` whose
  register chain is a multi-element bare array literal has its args shredded. Affects
  `scripts/audio/compare/shipped.mjs:144-149` (add bracket depth; add a regression test with a
  >1-element `seq()` array carrying a nonzero CHANGE). Live on red-baron's TH today, currently
  masked by coincidence. *Found by Reviewer during code review.*
- **Gap** (blocking): `compareRedBaronShipped`'s MISMATCH branch is exercised by no test —
  flipping either `!==` to `===` leaves all 250 tests green. Affects
  `scripts/audio/compare/shipped.mjs:263-273` (add a parseable, genuinely-inverted `seq()`
  fixture asserting `'mismatch'` and the register named in the diff; include a TH-shaped
  multi-element array case, which closes the bracket-blindness finding above at the same time).
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): `seqChanges` coerces CHANGE with `Number()` and treats `NaN !== 0` as
  "sweeps", so an unresolvable CHANGE produces a confident verdict. Affects
  `scripts/audio/compare/shipped.mjs:180-190` (route non-finite CHANGE to the `unparseable`
  path). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `player_fire`'s reason assertion cannot distinguish the
  AUDC-mask defect from the terminal-zero defect. Affects `tests/extract-audio.test.mjs:243`
  (pin a unique reason substring). Candidate for td1-5. *Found by Reviewer during code review.*
- **Question** (non-blocking): `tests/audio-red-baron.test.mjs:19`'s name asserts "pokey.ts has
  it inverted" while the body only reads RBSOUN.MAC — it will pass forever regardless of the
  port. Pre-existing, outside td1-4. Route to td1-5. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the triage file's narrative header still describes both defects
  as present ("These tests fail on purpose"). Affects
  `tests/extract-audio-link5-triage.test.mjs:1-26`, `:172-181` (add a RESOLVED addendum).
  *Found by Reviewer during code review.*

### Dev (fix round — review response)

**Both HIGHs fixed, both MEDIUMs fixed, both LOWs fixed. SHA `2263db2`.**

- **HIGH #1 fixed:** `scripts/audio/compare/shipped.mjs:144-149`'s `splitTopLevelArgs`
  now tracks `[`/`]` depth alongside `(`/`{`/`)`/`}`. Verified directly against the real
  `red-baron/src/shell/pokey.ts`: `parseRedBaronPokeySounds` now reports TH as
  `{audfSweeps:false, audcSweeps:false}` via a correctly-grouped 4-arg split (was 10),
  reading TH's real `[seq(0xa4, 2, 0, 0x80)]` AUDC chain for the first time. Reproduced
  the Reviewer's M5/M6 mutations by hand against a scratch copy of pokey.ts: M5 (TH AUDC
  change 0→−1) now returns `mismatch` naming AUDC; M6 (TH AUDF step 4-of-6, 0→1) now
  returns `mismatch` naming AUDF. Both were silently `match` before the fix.
- **HIGH #2 fixed:** added two tests to `tests/extract-audio-link5-triage.test.mjs` — a
  TH-shaped multi-element bare-array regression test on `parseRedBaronPokeySounds`
  directly, and a synthetic-but-parseable TH-shaped fixture (AUDF genuinely agrees with
  the ROM, AUDC genuinely inverted) asserting `compareRedBaronShipped` returns
  `'mismatch'` naming AUDC and NOT AUDF. Mutation proof: flipped `shipped.mjs:269`'s
  `audfSweeps !==` to `===`, ran the suite, both the new fixture test and the pre-existing
  real-pokey.ts test went red; restored, re-ran clean. Repeated for `:272`'s
  `audcSweeps !==` → `===`: same result (both tests red, both independently catch either
  flip). Also reverted the HIGH #1 bracket fix itself and confirmed the two new tests
  redden without it, then restored.
- **TH's re-derived verdict: ROM_VERIFIED — same as before, now for the right reason.**
  With AUDC actually read, TH's shipped chain is `audfSweeps:false, audcSweeps:false`
  (all six AUDF notes and the one AUDC step have CHANGE 0), matching the ROM's own
  `holds/holds` shape (`tests/extract-audio-link5-triage.test.mjs`'s ROM-classification
  test, unchanged). `three_hundred` genuinely IS byte-shape-correct; the port and ROM
  agree. `tests/extract-audio.test.mjs:359-360`'s ROM_VERIFIED assertion for
  `three_hundred` needed no change — confirmed by re-running the full audit end to end
  (`node --test tests/extract-audio.test.mjs`) after the fix, still green.
- **MEDIUM (seqChanges NaN) fixed:** a `seq()` CHANGE that doesn't resolve to a finite
  number now makes `seqChanges` return `null`, which `chainSweeps` treats the same as an
  unrecognised call name — routes to `unparseable`/`unverified` instead of `NaN !== 0`
  reading as a confident "sweeps". Added a regression test with `seq(0x30, 7, HOLD, 4)`.
- **MEDIUM (player_fire reason indistinguishable) fixed:** `tests/extract-audio.test.mjs`'s
  terminal-zero group now additionally asserts `/shipped=null/` (the shipped stream ran
  out of events); `player_fire` now additionally asserts `doesNotMatch(/shipped=null/)`
  plus `/ROM=\[1,\d+\] shipped=\[1,\d+\]/` (both sides have an AUDC event at the
  divergence point, disagreeing only in value). The two assertions can no longer pass for
  each other's reason.
- **Both LOWs fixed:** triage file's header now says "RESOLVED by 74f57c9 — kept as a
  regression suite" instead of "These tests fail on purpose"; `tests/audio-red-baron.test.mjs:19`'s
  title no longer claims "pokey.ts has it inverted" (a claim the test body never checks) —
  renamed to note it's ROM ground truth from RBSOUN.MAC.
- **No subrepo path touched.** `git diff --stat` against the fix-round commit shows only
  `scripts/audio/compare/shipped.mjs`, `tests/audio-red-baron.test.mjs`,
  `tests/extract-audio-link5-triage.test.mjs`, `tests/extract-audio.test.mjs`.
- **Full suite:** 250/250 → 253/253 (3 new regression tests: HIGH #1, HIGH #2, MEDIUM
  seqChanges), 0 fail, 0 skipped, both before and after.

*Found by Dev during fix-round implementation.*
## Subagent Results

Transcribed by SM from the Reviewer's own recorded specialist coverage (round 1 §"Specialist
coverage", round 2 §"Specialist corroboration"). Both rounds fanned out and reported in prose;
this table is a reformat of that record, not a new claim.

**Round 1 (verdict: REJECTED):**

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-silent-failure-hunter | Yes | findings | TH's AUDC register never read; reproduced in both directions (correct port → MISMATCH, broken port → MATCH) | ACCEPTED — reproduced by execution; became HIGH #1 |
| 3 | reviewer-test-analyzer | Yes | findings | MISMATCH branch covered by no test | ACCEPTED — reproduced by execution; became HIGH #2 |
| 4 | reviewer-comment-analyzer | Yes | findings | red-baron "three of the four inverted" prose nit | DISMISSED — inherited verbatim from `32cb7a9`, not introduced by this diff, and true for BN/WP |
| 5 | independent tempest-remap verification | Yes | clean | cue map confirmed against ALSOUN.MAC PNTRS `:87-100` | ACCEPTED |

**Round 2 (verdict: APPROVED):**

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-test-analyzer | Yes | clean | none of its own; re-derived all four vacuity questions from scratch and agreed with each | ACCEPTED — added an instrumented trace proving the non-finite test exits via the intended `Number.isFinite` guard, not `callNamesIn`'s regex (`shipped.mjs:172`); independently reproduced both `!==`→`===` flips reddening `triage:239` |

**Round 3 (rule check — dispatched by SM after the gate correctly flagged it missing):**

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-rule-checker | Yes | findings | 7 categories / 24 instances; clean on 6 of 7 (subrepo isolation, node:test conventions, fixture hygiene, commit messages, import/module conventions, orchestrator role). 2 doc-accuracy violations, both in `tests/extract-audio-link5-triage.test.mjs`: stale line citations (`:203`/`:301` → now `:224`/`:355`) and a present-tense narrative of pre-fix behavior that the file's own test at `:143` disproves | ACCEPTED and FIXED in `e66b815` (comment-only, verified: no executable line changed; suite unmoved 253/253). Dev found and fixed a third instance of the same class at `:149-150`. Citations re-anchored to stable **test names** rather than line numbers, which had drifted twice within this story's own lifetime |

**All received: Yes** — every enabled specialist returned across all rounds; no row is outstanding.

**SM note:** the two round-1 HIGHs were additionally re-run by SM before being routed back to Dev,
and again after the fix round (both operator flips ⇒ 3 fails each; bracket-fix revert ⇒ 2 fails;
file restored byte-identical each time). Specialist findings on this story were never accepted on
report alone.

## Reviewer Assessment (Round 2)

**Verdict:** APPROVED
**Reviewed:** `2263db2` (fix round) as a diff against `74f57c9`.
**Suite:** 253 tests / 253 pass / 0 fail / 0 skipped — reproduced independently (`npm test`, node v25.9.0).

Round 1's two HIGHs were re-verified by execution by SM and are not re-litigated here. This
round asked a different question: are the fixes **correct**, or merely **present**? Five checks,
all first-hand.

### 1. Did the bracket fix regress the other four tones? NO — surgical.

The bracket-depth change alters how *every* `table()` call splits, so the classic fix-round
risk is a silently-moved verdict elsewhere. Ran both splitters over the real
`red-baron/src/shell/pokey.ts` and diffed the argument boundaries per tone:

```
=== TK  old args=3  new args=3  IDENTICAL SPLIT
=== TP  old args=3  new args=3  IDENTICAL SPLIT
=== BN  old args=3  new args=3  IDENTICAL SPLIT
=== WP  old args=3  new args=3  IDENTICAL SPLIT
=== TH  old args=10 new args=4  *** SPLIT CHANGED ***
  NEW args[1] (AUDF) = "[ seq(0x79,2,0,0x10), seq(0x6c,2,0,0x10), seq(0x60,2,0,0x10),
                          seq(0x40,2,0,0x20), seq(0x60,2,0,0x10), seq(0x40,2,0,0x20), ]"
  NEW args[2] (AUDC) = "[seq(0xa4, 2, 0, 0x80)]"
  OLD args[1] (AUDF) = "[\n      seq(0x79, 2, 0, 0x10)"
  OLD args[2] (AUDC) = "seq(0x6c, 2, 0, 0x10)"
```

Four tones' splits are **byte-identical**; only TH moved, and it moved to exactly the right
grouping — all six AUDF notes as one argument, and its real AUDC chain read for the first time.
End-to-end verdicts old-vs-new, all five tones: **same** (BN `true/false`, TH `false/false`,
TK `false/true`, TP `false/true`, WP `true/false`). No verdict silently moved; TH's is now
*derived* rather than coincidental. Confirmed the fix generalises rather than special-casing TH:
a nonzero CHANGE is found in the **last** element of a chain, and inside a nested
array-in-array, both correctly.

### 2a. MEDIUM (`seqChanges` → `null`) — correctly routed, and genuinely exercised.

Routing is a **single choke point**, not a scatter: `seqChanges` is called only from
`chainSweeps` (`shipped.mjs:220`) → `null` → `parseRedBaronPokeySounds` sets `unparseable`
(`:248`) → `compareRedBaronShipped:276` returns `unverified` → the one production consumer
(`scripts/extract-audio.mjs:98`) maps it to `VERDICT.UNVERIFIED`. There is no second path where
`null` can surface as a confident answer.

The new test is not vacuous — it could have passed via the earlier unknown-call-name guard
instead of the NaN guard. Proved which path it takes by reverting *only* the NaN guard in a
temp-dir copy:

```
WITH    NaN guard (shipped):  {"unparseable":true,"reason":"POKEY_SOUNDS.TK uses a chain vocabulary or a seq() CHANGE ar…
WITHOUT NaN guard (reverted): {"audfSweeps":true,"audcSweeps":true}
```

Without the fix the fixture yields the confident-and-wrong `true/true` — the exact failure class
the story exists to close. The test genuinely pins the new guard.

### 2b. MEDIUM (`player_fire` reason) — the distinction holds for ALL members, not one example.

Printed the real reason strings for every member of both groups:

```
segment_tick      mismatch  shipped=null:YES  ROM=[1,n]/shipped=[1,m]:no
     …expansion at event 2:  ROM=[0,0] shipped=null (ROM emits 4 events, shipped emits 2)
enemy_explosion   mismatch  shipped=null:YES  ROM=[1,n]/shipped=[1,m]:no
     …expansion at event 20: ROM=[0,0] shipped=null (ROM emits 22 events, shipped emits 20)
enemy_fire        mismatch  shipped=null:YES  ROM=[1,n]/shipped=[1,m]:no
     …expansion at event 18: ROM=[0,0] shipped=null (ROM emits 20 events, shipped emits 18)
spike_shot        mismatch  shipped=null:YES  ROM=[1,n]/shipped=[1,m]:no
     …expansion at event 10: ROM=[0,0] shipped=null (ROM emits 12 events, shipped emits 10)
player_fire       mismatch  shipped=null:no   ROM=[1,n]/shipped=[1,m]:YES
     …expansion at event 3:  ROM=[1,170] shipped=[1,154] (ROM emits 66 events, shipped emits 64)
```

The two predicates are **mutually exclusive across all five members** — the terminal-zero group
is uniformly `ROM=[0,0] shipped=null`, `player_fire` is uniquely a same-position value
disagreement on register 1. The remedy is correct, not merely applied. The `doesNotMatch` is not
vacuous because it is paired with a positive assertion on the same string.

### 3. The three new regression tests are falsifiable.

- `triage:211` (TH-shaped bare array, nonzero CHANGE in the **fourth of six** elements) —
  bracket-blind splitting reads only element one, giving `false/false` against an expected
  `true/false`. Reddens without the fix. Deliberately placing the sweep mid-array, not first,
  is what makes it a real test of the grouping.
- `triage:239` (parseable, genuinely inverted AUDC) — flipping `shipped.mjs:283`'s `!==` to
  `===` empties `diffs` → `'match'` → fails `:265`; flipping `:280`'s adds `AUDF:` to the
  reason → fails `:267`. Each flip is caught independently, and `:267`'s
  `doesNotMatch(/AUDF:/)` pins that the diff names the register that actually disagrees rather
  than just producing any mismatch.
- `triage:120` (non-finite CHANGE) — falsifiable, path proven above.

### 4. Nothing newly broken or hidden.

Diff touches four files, **no subrepo path**. `tests/helpers/link5-inputs.mjs` is untouched
since `82c90b7`, so round 1's AC2 verification still stands. `scripts/audio/games/tempest.mjs`
and `red-baron.mjs` are unchanged this round — the tempest side of the diff is
assertion-additive only, no production behaviour moved. No assertion was loosened to get green;
the round added three tests and strengthened two.

### 5. Acceptance criteria

- **AC1 (diagnosis recorded with distinguishing evidence):** MET. Both root causes are recorded
  with the evidence that separates environment gap from regression, and the triage file's header
  no longer contradicts its own passing state.
- **AC2 (never a silent pass; suite green either way):** MET. 253/253, 0 skipped in this
  checkout; the skip helper is unmodified and still names its missing inputs against an empty root.

### Residual findings — all MEDIUM-and-below, none blocking

| Severity | Issue | Location | Disposition |
|----------|-------|----------|-------------|
| [MEDIUM] | **Arity hole, same class as the two HIGHs.** `if (parts.length < 3) continue;` silently *skips* a malformed `seq()` rather than admitting it. A `seq()` with <3 args next to a well-formed one yields a confident verdict computed from partially-unread input — proved: `table(1, [seq(0x30, 7), seq(0x40, 2, 1, 0x20)], …)` → `{audfSweeps:true, audcSweeps:true}`, no `unparseable`. Alone it is caught (`changes.length === 0` → `null`). Not live on today's `pokey.ts`; requires malformed source. | `scripts/audio/compare/shipped.mjs:200` | → **td1-5** (route arity failure to the `unparseable` path the finiteness fix already uses) |
| [LOW] | `assert.doesNotMatch(res.reason, /AUDF:/)` depends on the trailing colon of the diff's formatting; a reason-format change would let it pass silently. | `tests/extract-audio-link5-triage.test.mjs:267` | → **td1-5** |
| [LOW] | `mkdtempSync` fixtures are never cleaned up (pre-existing pattern, `:89`, `:101`, `:121`, `:240`). | `tests/extract-audio-link5-triage.test.mjs` | → **td1-5** |

Round 1's two LOWs are discharged: the triage header now states RESOLVED accurately (the two
original defects *were* closed by `74f57c9`; the round-2 additions are called out separately),
and `tests/audio-red-baron.test.mjs:19`'s title no longer claims something its body never checks.
The port-side check that title used to imply now genuinely exists — BN is covered by
`triage:187-193`, which compares all five tones against `pokey.ts`.

### Deviation audit

- No new deviations declared this round. Round 1's two (TEA's separate triage file; Dev's two
  collateral `EX2F` label updates) remain ACCEPTED. **UNDOCUMENTED:** none found.

### Proportionality

A 2-point story on its second round. Round 1's block was on the one thing this story cannot
ship — an audit that lies — and that bar is now met by execution, not by report. What remains is
one MEDIUM that requires malformed source to trigger and two LOWs about test hygiene. None of
them makes an audit lie today. Blocking on them would author a rejection loop, so they go to
td1-5, the epic's dedicated text-match/vacuity sweep.

### Specialist corroboration

An independent test-analyzer pass re-derived all four vacuity questions from scratch and agreed
with every one, adding one piece of evidence I had not obtained: an instrumented trace proving
the non-finite test exits via the intended guard rather than the earlier unrecognised-call-name
guard — `callNamesIn`'s regex (`shipped.mjs:172`) only matches identifiers followed by `(`, so
the bare `HOLD` is never seen as a call, and control reaches `seqChanges`'s `Number.isFinite`
check. It also independently reproduced both `!==` → `===` flips reddening `triage:239`. It
reported no findings of its own.

### [RULE] reviewer-rule-checker — incorporated post-approval

*Recorded by SM. The rule-checker was not dispatched in either review round; the finish gate
correctly caught the omission and SM ran it before finishing rather than waiving it. Memory is
explicit that this specialist is the real independent check when one pipeline did test + code +
review — as happened here.*

**[RULE] Coverage:** 7 categories, 24 instances. **Clean on 6 of 7** — subrepo isolation (no path
under any subrepo across all three commits; `pokey.ts` and `sfx-data.mjs` were read, never
written), `node --test` conventions (zero vitest-isms; helper correctly named to avoid the
`*.test.mjs` glob), fixture hygiene (all `mkdtempSync` fixtures under OS tmpdir, nothing enters
the repo or build), commit-message conventions, import/module conventions (explicit `.mjs`
extensions throughout), and orchestrator-role compliance (tooling only, `repos.yaml` untouched,
trunk-based commits to `main` as documented).

**[RULE] Findings — 2 violations, both doc-accuracy, both in `tests/extract-audio-link5-triage.test.mjs`:**

1. **[LOW]** Stale line citations at `:3` and `:181` — `extract-audio.test.mjs:203`/`:301` were
   accurate at RED time but both later commits added lines above those tests, moving them to
   `:224`/`:355`. A reader following them landed mid-body of the wrong test.
2. **[LOW]** Lines `:13-18` described the pre-fix scanner bug in the **present tense**, scoped to
   the past only by a "RESOLVED" note 7 lines later. Read in isolation it asserted something the
   file's own test at `:143` now disproves about the current function.

**[RULE] Disposition: ACCEPTED and FIXED**, not deferred — these are the *exact class of stale
claim this story exists to eliminate*, reproduced inside the story's own triage file. Shipping
them would have been a self-contradicting artifact. Fixed in `e66b815` (comment-only; verified no
executable line changed; suite unmoved at 253/253). Dev found and fixed a third instance of the
same class at `:149-150`, and re-anchored citations to stable **test names** rather than line
numbers — which had already drifted twice within this single story's lifetime.

**Handoff:** To SM for finish-story. Residue named above routes to td1-5.