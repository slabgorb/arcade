---
story_id: "ml4-4"
jira_key: "ml4-4"
epic: "ml4"
workflow: "tdd"
---
# Story ml4-4: DDT bombs

## Story Details
- **ID:** ml4-4
- **Jira Key:** ml4-4
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 3
- **Repos:** arcade
- **Branch:** feat/ml4-4-ddt-bombs
- **PR:** https://github.com/slabgorb/arcade/pull/331

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-13T17:14:16Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-13T16:07:25.258606+00:00 | 2026-08-13T16:10:03Z | 2m 37s |
| red | 2026-08-13T16:10:03Z | 2026-08-13T16:39:47Z | 29m 44s |
| green | 2026-08-13T16:39:47Z | 2026-08-13T16:44:31Z | 4m 44s |
| review | 2026-08-13T16:44:31Z | 2026-08-13T17:08:40Z | 24m 9s |
| green | 2026-08-13T17:08:40Z | 2026-08-13T17:12:57Z | 4m 17s |
| review | 2026-08-13T17:12:57Z | 2026-08-13T17:14:16Z | 1m 19s |
| finish | 2026-08-13T17:14:16Z | - | - |

<!-- Reviewer round-1 REJECT: the phase machine misrouted review->finish; per
the rework recovery (target_phase: green) this block was repaired by hand.
Dev is fixing F1-F8 from the round-1 Reviewer Assessment below. -->

## Delivery Findings

Upstream findings at setup:

- **[SM / Gap / routed from ml3-5]** The DDT-bomb halves of SCROLD/SCROLU
  (`MLSUB.MAC:1231-1295`, `:1379-1399` — DDTADD pointer moves, off-screen clears,
  one-per-scroll top-row bomb seeding; claims SC-49/SC-50) were descoped from
  ml3-5 and routed to ml4-4. Scroll-time DDT-table maintenance is IN SCOPE here.
  Source: `sprint/archive/ml3-5-session.md` Delivery Findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA / Gap / non-blocking]** The ml4-1/2/3 seam inversion carries over: the
  DDTEX1→SHOOT2 kill dispatch, SCORNG BCD scoring, CHAN2 sounds ($24 hit / $14
  cloud kill), HITDDT reset at new wave (CENTPC `MILLI.MAC:508`), NOCENT/DELAY/
  BOMBV application, the DDTS2 standalone restore callers (`MLSUB.MAC:68/673/1038`)
  and the player-2 bank select (DDTS1 PLAYR<<3) stay CALLER-SIDE. The reducers
  return pure decisions; wiring lands with ml7 (claims DD-33..35, DD-10).
- **[TEA / Question / non-blocking]** `bombs()` specifies precondition
  centin 0..11: the ROM's `LDA Y,90$` with CENTIN 12 would read past the 6-byte
  creature table (index 6). BOMBSL only arms at CENTIN ≤ $0B so the state is
  unreachable in legit play; the contract documents rather than models it.
- **[TEA / Note / non-blocking]** Cloud stamp $42 appears in BOTH the 96$ and
  94$ stamp rows (`MILLI.MAC:970/:989`) where the neighbouring progressions
  suggest $6A was intended in the 94$ row. Transcribed FAITHFULLY (the shipped
  ROM byte is $42); any "fix" would be a deviation and is not taken.
- **[TEA / Note / non-blocking]** The scroll gate's OR-of-hi-bytes trick
  (`MLSUB.MAC:1117-1123`, SC-7) is sound ONLY because the seed path rejects
  column-page 3 (DD claim on :1253): intact hi bytes stay ≤ $12 < $14. The
  right-edge rejection is load-bearing twice; both suites now pin it.

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

## Sm Assessment

Setup complete. Story ml4-4 (3pt, tdd, epic ml4 millipede) claimed from backlog;
branch `feat/ml4-4-ddt-bombs` cut from develop; story status backlog → in_progress.
Context at `sprint/context/context-story-ml4-4.md` enriched beyond the YAML stub
with: the four title citations to verify against the vendored quarry
(`reference/original-source/millipede`, CRLF), the ml3-5-routed SC-49/SC-50
scroll-maintenance scope, the ml4-1/2/3 seam-inversion carry-over (DDTEXP/OBSTAC/
PLAY/MUSHER stay caller-side), house-style and claims-JSON conventions, and
explicit out-of-scope routing (ml7 wiring, ml3-3 SCROL0, ml8-3 cocktail, ml4-6
extraction, ml4-5 spider). No Jira in this project — claim is local YAML only.
Handoff to TEA for RED.

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->
## TEA Assessment

**RED delivered** (commit f6ed8e16 on `feat/ml4-4-ddt-bombs`): `tests/ddt.test.ts`
(61 tests) + `docs/rom-study/claims/13-ddt.json` (218 byte-anchored claims,
DD-1..218, GENERATED from the vendored lines by a scratchpad script — never
hand-transcribed) under `plugins/millipede/`. All four title citations verified
against the vendored tree before writing: MLSUB.MAC:420 (DDTS), MILLI.MAC:446
(BOMBS), MLDEF.MAC:202/203 (CLOUD/DDT stamps), MLDEF.MAC:191 (NDDT=4). The
ml3-5-routed Delivery Finding (SC-49/SC-50 scroll-time DDT-table maintenance,
MLSUB.MAC:1231-1295/:1379-1400) is absorbed into this suite as `ddtScrollDown`/
`ddtScrollUp`.

**Gate integrity proven, not assumed:** 13-ddt.json enrolls itself via
`loadClaims()` glob; the byte sweep lives in `tests/audit/brief-dossier.test.ts`
(NOT citations.test.ts, which tests the checker with fixtures). Verified by
mutation: a tampered DD-1 verbatim reddened the sweep; regenerated clean.

**RED verified** (testing-runner ml4-4-tea-red): 61 failed / 602 passed —
exactly the new file fails, every failure the self-describing loader error.
`npm run lint` clean (computed-specifier pattern keeps tsc green with the
module absent).

**Contract for Dev (GREEN):** `src/core/ddt.ts` — pure cited reducers in the
conway.ts house style (in-place, bytes 0..255, upright, player-1 bank). Full
export contract at the top of the test file. Load-bearing traps the suite pins:
- DdtEntry is the DDTADD byte pair VERBATIM (hi 0 vacant / $10|page intact /
  ≥$14 exploding); sweep order is index 3→0 (DDTS1's descending X).
- BOMBS makes TWO separate RND0 reads — the gate read has bits 0-2 clear, so
  reusing it degenerates dispatch to always-bee (the earwig four-reads lesson).
- bombModeStart has NO CLC: NOCENT = (score2>>1) + 20 DECIMAL + the LSR carry
  (`ADC I,20.` — the dot is decimal; odd score2 adds one).
- ddtShoot stores the BASE cell's grey byte at BOTH cleared cells (the ROM's
  A register survives, MILLI.MAC:2046); anchor = base-$61, hi = $B4|page.
- The explosion index is (oldHi>>4)-2 (four LSRs leave carry CLEAR before
  `SBC I,01`); index 0 clears the entry AND still draws the 90$ erase frame.
- Explosion writes preserve bit 7; DDTS2 restore writes are RAW (they clobber
  grey) and block on $01..$6F, overwriting ≥ ROCK $70 (boundary pinned AT $70).
- 91$/92$/93$ offset lists FALL THROUGH into 97$/96$/95$; stamps come from the
  PARALLEL 99$ table by cursor. All ten frames pinned with toEqual in ROM order.
- SCROLD cull-then-reseed: a bomb cleared at rows 0/1 falls THROUGH into the
  seed branch the same pass; one seed per scroll, highest vacant index first;
  seed rejects rnd1&3==3 (right edge) and page-$10 lo<$80 (left edge).
- ddtScrollUp takes NO randomness — the signature itself pins "no seeding".
- FRAME&7 gate probed at frames 1,2,4,6,7 (even non-multiples kill &1/&3
  mutants — the ml4-3 residue-probe lesson).

### Rule Coverage

- **Claim-cited constants (repo rule):** every exported constant asserted
  against its DD-* claim; claims byte-verified by the enrolled gate. Mutation-
  tested the gate itself (tamper → red → regenerate → green).
- **Boundary fixtures AT thresholds (ml3-5 convention):** $13/$14 exploding,
  $2D/$2E and $6D/$6E cloud band, $6F/$70 restore + destroy thresholds, rows
  2/3 (down-cull) and $1E/$1F (up-cull), rnd1&3 3-vs-not, lo $7F/$80 left edge
  — a >=/> mutant dies on each.
- **Mutation direction restrictive (memory rule):** negative cases assert the
  RESTRICTIVE outcome (none/false/null/preserved), not just the permissive one.
- **lang-review TS #1/#4 (type escapes, null handling):** contract uses
  discriminated unions (`DdtShot`, `BombsDecision`), `readonly` on non-mutated
  params, `number | null` for bombModeStart — no `any`, no `!`.
- **Vacuous-assertion self-check (Phase C):** every `it` asserts concrete
  bytes/objects via toBe/toEqual; no `let _`, no always-true asserts; table
  data pinned with toEqual (content AND order), not lengths alone.
### Dev (implementation)
- No deviations from spec. The TEA contract was implemented verbatim; the one
  judgment call — DDT_CLOUD_FRAMES indexes 3/5 and 4/6 SHARING the same list
  references — mirrors the ROM (98$ points two rows at 93$/94$) and the suite
  pins equality, not identity.

## Dev Assessment

**GREEN delivered** (commit 99888781, one pass): `src/core/ddt.ts` (413 lines) —
pure cited reducers in the conway.ts house style (in-place, bytes, upright,
player-1 bank). Millipede suite 664/664 green (the +1 over RED's 663 is the
ml1-1 purity sweep auto-enrolling ddt.ts — it passes), `npm run lint` clean.

Implementation notes:
- DdtEntry keeps the DDTADD byte pair verbatim; every reducer sweeps 3→0
  (DDTS1's descending X). The ten cloud frames are built from per-list
  offset/stamp arrays zipped in ROM order, with the 91$/92$/93$ fall-through
  tails composed by spread — the $42 stamp at MILLI.MAC:989 transcribed
  faithfully (see TEA's note: likely a shipped-ROM quirk, NOT "fixed").
- ddtShoot stores the base cell's grey byte at BOTH cleared cells (the ROM's
  A-register behaviour); explosion writes preserve bit 7, DDTS2 restore writes
  are RAW — both per contract.
- bombs() takes rnd0 (gate) and rndPick (dispatch) as SEPARATE bytes; the
  no-CLC carry lives in bombModeStart as (score2>>1) + 20 + (score2 & 1).
- The scroll halves: cull-then-reseed fall-through implemented by letting the
  cleared branch drop into the seed branch inside the same loop iteration;
  rejection paths (rnd1&3==3, left edge) do NOT set the one-per-scroll flag,
  matching the ROM (a retry on a later vacant entry re-checks the same bytes
  and fails identically — behaviourally equivalent, no extra draw).
- No new caller-side seams beyond those TEA already filed; nothing to add to
  Delivery Findings.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (664/664 green, lint clean, tree clean; one stray stash it created was popped and verified) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 6 | confirmed 5 (F1-F5; F1/F2/F4/F5 mutation-PROVEN by my battery), confirmed-low 1 (F6) |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A (30+ citations independently re-opened against the vendored tree; 108/108 DD ids resolve; contract matches exports) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2 (F7 byte-mask defense, F8 test-fixture cast) — both narrow, both cheap |

**All received:** Yes (4 enabled returned, 5 disabled skipped)
**Total findings:** 8 confirmed, 0 dismissed, 0 deferred

### Mutation battery (Reviewer-run, covering the disabled specialists)

Sequential, each mutant verified with `git diff --numstat` (1/1) before the run
and restored with `git checkout --` after; suite = tests/ddt.test.ts (61 tests).

| Mutant | Site | Result |
|--------|------|--------|
| S2 | mushDelta `row < 0x0c` → `< 0x0b` | **SURVIVED** (61 pass) → F2 |
| S4 | bombModeStart drop `& 0xff` | **SURVIVED** (61 pass) → F4 |
| S5 | ddtShoot drop `& 0x7f` on stamp | **SURVIVED** (61 pass) → F5 |
| S1b | explosion `v >= DDT_STAMP` → `>= DDT_STAMP - 1` | **SURVIVED** (61 pass) → F1 |
| C1 | bombs `pick === 6` → `=== 2` (control) | KILLED (3 fail) — battery has teeth |

## Reviewer Round-1 Assessment (superseded by the round-2 approval below)

**Status: REJECTED — round 1.** The implementation reads faithful to the ROM
(citations independently re-verified [DOC], rules clean bar two narrow items
[RULE]) and every acceptance surface has tests — but the suite's boundary
discipline has four PROVEN holes: ROM-divergent mutants at four distinct
mechanisms pass all 61 tests. The story's own bar (thresholds pinned AT the
boundary) is not yet met inside `ddtExplosionStep`/`mushDelta`, and two byte-
masks are test-dead. Findings, most severe first:

- **F1 [TEST] (mutation-proven)** `ddtExplosionStep`'s stamp classifier is
  unpinned at both interior boundaries: no `$2D` (letter side) and no `$6D`
  (erasable-cloud side) fixture inside the machine — `v >= DDT_STAMP-1`
  survived (S1b). Fix: extend the write-rules test with cells at `$2D`
  (preserved) and `$6D` (overwritten).
- **F2 [TEST] (mutation-proven)** `mushDelta` band edges never probed at
  `$0B/$0C/$13/$14` — `row < 0x0b` survived (S2). Fix: four boundary-row
  fixtures pinning mush/uncounted/mushTop AT the edges (DD-47/48/49).
- **F4 [TEST] (mutation-proven)** `bombModeStart`'s `& 0xff` is test-dead —
  dropping it survived (S4). Fix: a wrap fixture (e.g. score2 `$1E0` →
  `(0xf0 + 20 + 0) & 0xff = 4`).
- **F5 [TEST] (mutation-proven)** `ddtShoot`'s `stamp & 0x7f` is test-dead —
  dropping it survived (S5). Fix: one call with `0x80 | (DDT+1)` asserting
  normalization still happens (a grey-carrying stamp read is legit input).
- **F3 [TEST] (argued, high-confidence)** seed mushTop counting only tested
  symmetrically (0 and -2); an AND-fused mutant passes. Fix: one-cell-occupied
  fixture asserting `-1`.
- **F6 [TEST] (low)** `centin >> 1` only cross-checked at the 10/11 pair; a
  `(centin+1)>>1` mis-shift passes every current fixture. Fix: odd-centin
  fixtures (1,3,5,7,9) with rndPick values that discriminate adjacent codes
  (e.g. centin 3 + rndPick 4: `$81`-mask → bee, `$C0`/`$83` would differ).
- **F7 [RULE]** `ddt.ts:221` `e.hi = DDT_EXPLOSION_START | (anchor >> 8)`
  lacks `& 0xff`; safe today only via ddtScrollDown's left-edge guard in a
  DIFFERENT function. Fix: mask it (in-domain no-op) and/or comment the
  DD-61/62 coupling at the site.
- **F8 [RULE] (low)** test fixture `t[Number(i)] = { ...(e as DdtEntry) }`
  casts away a compiler-caught `| undefined`. Fix: type the builder so no cast
  is needed (e.g. iterate a typed entries array).

**Round-1 verdict:** REJECT → back to Dev. All eight fixes are small and
test-side except F7's one-line mask; no design change requested. Re-review
will re-run the battery (expect S1b/S2/S4/S5 all KILLED) before approval.

**Verified good (observations):** RED discipline (61 self-describing failures,
computed-specifier lint-clean); claims GENERATED with a tamper-proven gate;
the cull-then-reseed fall-through, two-RND-read dispatch, no-CLC carry and
A-register grey trap all pinned; frames pinned toEqual in ROM order including
the 3/5-4/6 pulse aliasing; purity sweep auto-enrolled the module.
## Dev Assessment — fix round (review round-1 F1-F8)

**Delivered** (commit 80d03ab4): all eight round-1 findings addressed —
F1/F2/F3/F4/F5/F6 as new/extended boundary tests (suite now 669), F7 as the
masked hi write plus the DD-61/62 coupling comment at the site, F8 as the
cast-free typed fixture builder. Verified by re-running the Reviewer's exact
mutants: S1b, S2, S4, S5 and an AND-fused S3 all now KILLED (1 red each);
full millipede suite 669/669 green; lint clean.

Process note (for the sidecar): the first F7 edit was WIPED by the mutation
battery's `git checkout --` restore — the commit-before-mutating rule bit
exactly as the memory says. Caught by `git status` before commit; re-applied.
## Reviewer Assessment

**Status: APPROVED — round 2.** Commit 80d03ab4 addresses all eight round-1
findings; I re-verified by EXECUTION, not by reading: the Reviewer's exact
surviving mutants S1b (explosion classifier $6D side), S2 (mush band edge),
S4 (bombModeStart byte mask), S5 (ddtShoot stamp mask) plus an AND-fused S3
(asymmetric seed count) were re-applied one at a time — each now KILLED
(1 red), each restored, each mutant confirmed by `git diff --numstat` before
its run. Full suite 669/669 green, `npm run lint` clean, tree clean bar the
sprint bookkeeping.

- **[TEST]** F1-F6 all closed with real boundary fixtures (explosion-machine
  $2D/$6D cells, MUSHD1 edges AT $0B/$0C/$13/$14, one-cell seed counts, the
  defensive wrap fixture, the grey-carrying stamp read, odd-CENTIN pairs with
  a discriminating rndPick). No new vacuous assertions; the new fixtures
  assert exact bytes/deltas.
- **[RULE]** F7 landed as the masked hi write with the DD-61/62 coupling
  comment at the site; F8's fixture builder is now cast-free (lint green under
  strict proves the `| undefined` gap is gone).
- **[DOC]** The comment-analyzer's round-1 clean verdict stands — the fix
  round added one comment (the F7 coupling note), which correctly cites
  DD-61/62 and matches the guard it describes.

Round-2 subagents: not re-spawned — the delta is 78 lines of tests plus a
one-line mask, and every round-1 finding was verified by direct mutant
re-execution above; the round-1 Subagent Results table remains the coverage
record. All specialist domains re-checked in the delta by the Reviewer.

**Verdict: APPROVED.** Story ready for finish: PR into develop, status
in_review → done via `story finish`.