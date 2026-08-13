---
story_id: "ml4-3"
jira_key: "ml4-3"
epic: null
workflow: "tdd"
---
# Story ml4-3: Earwig + inchworm + bee reducers

## Story Details
- **ID:** ml4-3
- **Jira Key:** ml4-3
- **Workflow:** tdd
- **Stack Parent:** none

**Branch:** feat/ml4-3-earwig-inchworm-bee-reducers
**PR:** https://github.com/slabgorb/arcade/pull/313

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-13T12:57:34Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-13T12:05:52Z | 2026-08-13T12:07:04Z | 1m 12s |
| red | 2026-08-13T12:07:04Z | 2026-08-13T12:25:23Z | 18m 19s |
| green | 2026-08-13T12:25:23Z | 2026-08-13T12:31:47Z | 6m 24s |
| review | 2026-08-13T12:31:47Z | 2026-08-13T12:48:30Z | 16m 43s |
| red | 2026-08-13T12:48:30Z | 2026-08-13T12:54:29Z | 5m 59s |
| green | 2026-08-13T12:54:29Z | 2026-08-13T12:55:31Z | 1m 2s |
| review | 2026-08-13T12:55:31Z | 2026-08-13T12:57:34Z | 2m 3s |
| finish | 2026-08-13T12:57:34Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Improvement (non-blocking, TEA):** bee.ts is the THIRD consumer of the BEE helper family (BEEMV1 mushroom curve, BEEMV2 spawn init, BEEOFF) after dragonfly.ts and mosquito.ts — the ml4-1 extraction rule's "third consumer" trigger is now MET. This story keeps the copies module-local (the suites pin byte-identical behaviour, not sharing); the extraction decision is routed to the Reviewer, and if deferred it needs a filed story ID. Owner: Reviewer this round, else ml4-5 or a new chore story.
- **Gap (non-blocking, TEA):** the ml4-1/ml4-2 seam inversion carries over — OBSTAC (the earwig's stamp read and WRMMV's tail), DDTEXP/DDTEX1, PLAY player collision, MUSHER planting and the CHAN7/8/9 sound writes stay caller-side; the reducers expose pure decisions (`earwigStamp`, `plantMushroom` on the bee move, `slow` on the inchworm kill). Wiring order lands with ml3/ml7.

### Reviewer (code review)

- **Improvement (non-blocking):** the third-consumer extraction decision TEA routed here is taken: DEFERRED, filed as **ml4-6** (epic ml4, refactor, 2 pts). The trigger is real — `spawnH` now has 3 byte-identical copies (dragonfly/mosquito/bee), BEEOFF has 4 (plus earwig), `mushroomsNeeded` 2, `comp` 4 — but extracting inside a review round would cross two shipped stories' modules with no story of its own; the four suites pin the behaviour, so ml4-6 is a pure refactor under an existing net. Affects `plugins/millipede/src/core/{dragonfly,mosquito,bee,earwig}.ts` (lift the shared BEE-family helpers into one core module). *Found by Reviewer during code review.*
- **Gap (non-blocking):** the ROM FALLS THROUGH from spawn into the same-frame move for all three critters — EARWIG :724→50$ (a frame-0 spawn immediately adds dh to H AND flaps, since 0 & 3 === 0), WRMMV :2580→20$ (H becomes dh; no cycle possible since frame 0x13 is odd), BEEMV spawn→sweep :80→5$ (the fresh bee flaps and dives in its spawn frame). The reducers split spawn and move, which supports this exactly — but ml7 wiring must call the move after a successful trySpawn IN THE SAME TICK or every trajectory is one frame late and the earwig's first picture is wrong. Not documented in any of the three module headers. Affects `plugins/millipede/src/core/{earwig,inchworm,bee}.ts` callers (ml7 wiring order). *Found by Reviewer during code review, verified against MILLI.MAC.*
- **Conflict (non-blocking):** the star-wars v0.0.45 release is STRANDED LOCAL — commit d9bb0abc and tag `star-wars-v0.0.45` exist in this checkout but neither is on origin (`git ls-remote origin | grep star-wars-v0.0.45` → 0 hits; d9bb0abc is not an ancestor of origin/develop), so the deploy workflow never fired and production still serves 0.0.44. The commit also rides in this story's PR base. Affects release bookkeeping (`git push origin develop && git push origin star-wars-v0.0.45` from the checkout that cut it, or re-cut). *Found by Reviewer during code review.* Owner: SM.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **The BEEMV2 spawn-column reroll spin is modelled as a DEFERRED spawn**
  - Spec source: story title (Earwig + inchworm + bee reducers, BEEMV MILLI.MAC:56); vendored source MILLI.MAC:228-232
  - Spec text: "10$: LDA RND0 … AND I,0F8 / BEQ 10$ … CMP I,10 / BCC 10$ ;OFF SCREEN"
  - Implementation: `spawnH(rnd0)` returns null on the 16 invalid RND0 bytes and `trySpawnBee` returns false — the spawn happens on a later tick instead of spinning until the live POKEY register yields a valid byte in the same frame
  - Rationale: the reducer is pure and takes RND0 as an env byte, so a same-frame reroll loop is unrepresentable; identical to the deviation ml4-2 logged for the dragonfly and mosquito, keeping the three slot-12 critters' spawn model uniform
  - Severity: minor
  - Forward impact: minor — ml7 wiring can recover frame-exact parity caller-side by re-invoking trySpawnBee with fresh bytes in one tick, per the ml4-2 deviation's note
  - → ✓ ACCEPTED by Reviewer: read the ROM spin myself — `10$: LDA RND0 / AND I,0F8 / BEQ 10$ / CMP I,10 / BCC 10$` (MILLI.MAC:228-232) is a live-POKEY-register busy-wait (the source's own comment warns it "WILL HANG IF POKEY IS GONE"), unrepresentable in a pure reducer taking RND0 as one env byte; the deferred-spawn model is identical to the ml4-2 precedent and keeps the three slot-12 critters uniform.

### Reviewer (audit)

- No undocumented deviations found: the diff was walked against MILLI.MAC:56-240, :672-760, :2085-2145, :2559-2635 and MLDEF.MAC equates line-by-line; every divergence from the ROM is either the one logged deviation above (accepted), a documented caller-side seam (OBSTAC/DDTEXP/DDTEX1/PLAY/MUSHER/CHAN7-9 — TEA's Gap finding), or a documented scope exclusion (SECURA anti-piracy, cocktail EOR CKF8/CKFF identity upright, sound folds). The spawn-tick fall-through is not a deviation — the split reducers reproduce it when the caller invokes move after trySpawn in the same tick — but it is unrecorded, so it is filed as a Reviewer Delivery Finding for ml7.

## TEA Assessment

**Tests Required:** Yes

**RED delivered** (commit 0c8d305f): `tests/earwig.test.ts` (26 tests) + `tests/inchworm.test.ts` (22 tests) + `tests/bee.test.ts` (27 tests) + `docs/rom-study/claims/11-earwig-inchworm-bee.json` (130 byte-anchored claims, EW-1..42 / IW-1..37 / BE-1..51) under `plugins/millipede/`. All three title citations verified against the vendored tree before writing: MILLI.MAC:672 (EARWIG), :2559 (WRMMV), :56 (BEEMV). The title's "PTS scoring" premise re-measured per the ml4-1/ml4-2 precedent: PTS (MLDEF.MAC:398) is the kill-points STAMP array (BEEOFF clears the slot entry, BE-26); the VALUES live in SHOOT2's dispatch — earwig 1000/3000-by-DDT (:2134/:2139), inchworm 100/300 plus SLOW=0xE0 set FIRST (:2111-2118), bee 200/600 behind the TWO-HIT rule (:2099-2108). The claims JSON was GENERATED from the vendored lines (scratchpad script), never hand-transcribed, and the ml1-1 citation gate sweeps all 130 with 0 errors.

**Contract for Dev (GREEN):** `src/core/earwig.ts`, `src/core/inchworm.ts`, `src/core/bee.ts` — pure cited reducers in the conway.ts house style (in-place mutation, byte semantics 0..255 with -1 as 0xFF, upright cabinet per the ml3-4/ml4-1 precedent). Full export contracts sit at the top of each test file. Load-bearing traps the suites pin: the bee's TWO-HIT kill (a first hit — even in a DDT cloud — STORES dv=4 and scores nothing; only dv already 4 explodes for 200/600); the bee flaps on EVEN frames with no slow-mode override (opposite parity from the mosquito) and its plant mask is 3 EVERYWHERE (rnd1 0x04/0x02 discriminate it from the dragonfly's area-halved 7/1); the earwig's spawn makes FOUR separate RND0 reads (env carries rnd0/rndSpeed/rndDir/rndV — collapsing them onto one byte forces every over-20k earwig slow); the earwig adds H BEFORE the flap so the exit tick never flaps, while the inchworm cycles its picture BEFORE the H add so the exit tick still animates; the inchworm's off-screen exit clears ONLY color (NOT BEEOFF — pts survives); the inchworm requires the centipede ALIVE (DEAD ≠ 0) where every other flier tolerates it dead; the earwig stamp classifier poisons mushrooms ≥ 0x7C with AND 0xFB and dies only inside [CLOUD 0x2E, DDT 0x6E); the inchworm kill returns slow 0xE0 unconditionally, DDT or not.

**RED verification (testing-runner, ml4-3-tea-red):** millipede 75 failed / 0 other, failures confined to the three new files, every failure the self-describing module-absent loader error (no collect crashes); full cabinet 1002 files, 15,246 passing / 75 RED, no cross-app regression; orchestrator 478/478 green; `npm run lint` clean. The byte gate (brief-dossier.test.ts checkClaims) sweeps the 130 new claims and passes.

### Rule Coverage

Per `.pennyfarthing/gates/lang-review/typescript.md`, applied to test design:
- **#15/#25 (source-text/anchor guards):** no source-text grepping in these suites — every assertion runs the module's exports against hand-derived ROM bytes.
- **#18 (fixture = expectation):** discriminating fixtures chosen where a wrong port passes the lazy byte — rnd1 0x04/0x02 split bee mask 3 from dragonfly masks 7/1; rnd0 vs rndSpeed split the earwig's correlated-read trap; adjacent boundary pairs pin every CMP/BCC edge (CENTIN 10/11, SCORE2 0x05/0x06, 0x07/0x08, 0x11/0x12, cap 0x52/0x54, V 4/3, H 0/non-0).
- **#26 (all-local assertions):** every expected value is an independent literal derived from the cited 6502 lines; no assertion derives its expectation from another export.
- **#4/#21 (degenerate inputs):** byte-wrap paths pinned (H 0x40+0xFF, 0x01+0xFE, 0xFE+2 → exact 0 exit); free-slot (color 0) negative cases on every `is*` predicate.
- **Vacuous-assertion self-check:** done — no `let _`, no `assert(true)`, every `toEqual` on a discriminated union pins the full shape.

**Scope notes:** CHAN7/CHAN8/CHAN9/AUDF1 sound writes are ml6 seams (the bee's lowest-frequency fold across slots is sound pacing, not motion — nothing crosses the contract); the SECURA block in BEEMV3 is anti-piracy, not modelled; cocktail is ml8-3; attract sequencing is ml7. The two Delivery Findings route the third-consumer extraction trigger and the seam inversion; the one Design Deviation (deferred spawn reroll, the ml4-2 model) is logged in 6-field format.

**Status:** RED (failing — ready for Dev)

### TEA Rework (round-trip 1, commit 920d46a0)

Reviewer round 1 REJECTED with one [MEDIUM] and three optional [LOW]s. All test-side; no source touched.

- **[MEDIUM] fixed — earwig flap-cadence probe:** the no-flap probe sampled only residue 1 (frame 5), which every plausible permissive mask also skips. The probe now walks residues 1, 2, 3 (frames 5, 2, 7) plus the second even discriminator (frame 6), with messages naming the AND I,03 vs AND I,01 distinction. **Mutation re-run as the Reviewer demanded:** true code green (507/507); `(env.frame & 0x03)` → `(env.frame & 0x01)` in `moveEarwig` now reddens exactly this test (1 failed | 506 passed); source restored byte-identical after the probe.
- **[LOW] taken — full union pins:** the two `.kind`-only assertions in the bee movement tests (V-subtract, V-exactly-4) now pin `{ kind: 'moved', plantMushroom: false }`.
- **[LOW] taken — SBC wrap fixture:** new test pins `(2 - 3) & 0xff === 0xff` → still on screen, with a comment stating the domain is unreachable via legal spawns and the pin is against a clamping port (per the byte rule the Reviewer cited).
- **[LOW] left — fixed-point poison test:** Reviewer marked it no-action; untouched.

**Counts after rework:** earwig 26, inchworm 22, bee 28 — 76 story tests, millipede 507 total.

**Verification (testing-runner, ml4-3-tea-rework):** millipede 22 files, 507/507; full cabinet 1002 files, 15,325 passed + 1 todo, 0 failures; orchestrator 478/478; `npm run lint` clean.

**Status:** rework complete — ready for Dev (GREEN phase; expected no-op on source, the fixes are test-side guards)

## Dev Assessment

**GREEN delivered** (commit 1e52c35e, pushed to `origin/feat/ml4-3-earwig-inchworm-bee-reducers`): `src/core/earwig.ts` (EARWIG — FRAME==0 spawn tick, four-separate-RND0-read spawn with the slow/direction/row rolls, horizontal walk with the H==0 BEEOFF exit before the flap, the [CLOUD,DDT) death band + AND-0xFB mushroom-poison stamp classifier, 1000/3000 kill), `src/core/inchworm.ts` (WRMMV — slot 0, frame 0x13 + frameHi&3 window, DEAD≠0 entry gate, speed-derived flap cadence via |dh| ORA 1 EOR 2, picture cycle (pic+1)&0x13 BEFORE the H add, colour-only off-screen exit that preserves pts, kill returning slow 0xE0 with 100/300), `src/core/bee.ts` (BEEMV — BEEMV1 needed-count vs MUSH with the dead+beetle+CENTIN≥10 direct path, BEEMV3/BEEMV2 spawn, EVEN-frame flap, straight-down dive, mask-3 plant decision, and the TWO-HIT beeHit — first hit stores dv 4 and scores nothing, DDT included). All pure, in-place, byte semantics, conway.ts house style; every constant cited to an EW-*/IW-*/BE-* claim in claims/11-earwig-inchworm-bee.json.

**Implementation notes:** the BEEMV1/BEEMV2/BEEOFF helpers are module-local copies in bee.ts (and BEEOFF again in earwig.ts) per the one-subsystem-per-file rule — this is the family's third consumer, and the extraction decision stays routed in TEA's Delivery Finding rather than being taken silently here. The earwig's env carries the four RND0 reads as separate bytes (rnd0/rndSpeed/rndDir/rndV), exactly as the contract demands. No test was modified; minimal code beyond the contract.

**Verification (testing-runner, ml4-3-dev-green):** millipede 22/22 files, 506/506 tests (the ml1-1 purity sweep auto-enrolled all three new core modules); full cabinet 1002 files, 15,324 passed + 1 todo, 0 failures (no cross-app regression); orchestrator 478/478; `npm run lint` clean.

**Design deviations:** none beyond TEA's logged spawn-reroll deferral, which the implementation follows exactly.

### Dev GREEN (round-trip 1)

**No source change — and that is the point.** The review round-trip was test-side guard strengthening: TEA's rework (920d46a0) added probes and pins that the EXISTING implementation already satisfies, because the [MEDIUM] was a gap in the net, not a defect in the code (the shipped `frame & 0x03` cadence was correct; the suite just couldn't prove it against `& 0x01`). Minimalist discipline: the simplest code that passes 507/507 is the code already there. Zero lines changed in `src/`.

**Verification:** HEAD is 920d46a0, byte-identical to the tree the testing-runner verified as ml4-3-tea-rework (millipede 22 files 507/507; full cabinet 1002 files, 15,325 passed + 1 todo, 0 failures; orchestrator 478/478; lint clean) — re-cited rather than re-run, since no file changed between that run and this assessment. Rework commit pushed to `origin/feat/ml4-3-earwig-inchworm-bee-reducers` (1e52c35e..920d46a0).

**Status:** GREEN — ready for re-review

## Reviewer Assessment

**Verdict:** APPROVED

**Round 2 of 2.** Round 1 (superseded above) rejected on one mutation-proven [MEDIUM]: the earwig flap-cadence guard's no-flap probe sampled only residue 1, so a `frame & 0x03` → `frame & 0x01` mutant survived all 506 tests. The rework (commit 920d46a0, test-only, +20/−3, pushed) is verified closed by re-derivation AND by instrument:

- **[TEST] The MEDIUM is closed:** the probe now walks residues 1, 2, 3 plus a second even discriminator (frames 5/2/7/6, `earwig.test.ts:363-371`), the fixture walk stays on-screen throughout (h 0x42→0x48, never 0), and re-applying the exact round-1 survivor reddens exactly one test. The two optional [LOW]s taken are sound: both bee movement assertions pin the full `{ kind, plantMushroom }` union shape (`bee.test.ts:356,374`), and the new SBC wrap fixture (`bee.test.ts:378-388`) honestly states its unreachable domain and kills the clamping port it names (M2: `Math.max(0, v - dv)` → 1 failed). The remaining [LOW] (fixed-point poison test) was no-action by round 1's own disposition.
- **Round-2 battery (surface the fix created):** M1 round-1 survivor → RED (1 failed); M2 clamping port → RED (1 failed); M3 `plantMushroom` default inversion → RED (5 failed, the new union pins among them); true code GREEN 507/507; mutated sources restored byte-identical, `git status` clean.
- **[DOC] the new test's comment claims re-verified:** "dv ∈ {2,3,4} and every live entry has V >= 4, so V − dv >= 0" matches the round-1 domain analysis (spawn dv is 2 or 3 per BEEMV3 :199-222, first-hit stores 4 per :2107, and a live entry survived the previous tick's `< 4` check); the probe messages name the AND I,03 / AND I,01 distinction accurately.
- **[EDGE][SILENT][TYPE][SEC][SIMPLE][RULE] unchanged from round 1:** the rework touches no source file and no rule surface — round 1's exhaustive sweep (rule-checker 0 violations across 30 checks, 130 claims byte-verified, purity green) still describes the tree; the only delta since is the two test files re-verified above.
- **Verification:** testing-runner (ml4-3-tea-rework, at this exact commit): millipede 507/507, full cabinet 15,325 passed + 1 todo / 0 failures, orchestrator 478/478, lint clean.

**Data flow traced:** unchanged from round 1 (POKEY env bytes → gates → slot bytes → decision unions → caller seams); the rework adds observation points, not flow.
**Pattern observed:** the residue-class probe set at `earwig.test.ts:363-371` is the correct complete negative-probe idiom for a `& 3` gate — recorded in both the reviewer and TEA sidecars.
**Error handling:** unchanged — total functions over closed byte domain, nothing new to narrow.
**Deviations:** no new deviations in the rework (test-only); round 1's single deviation remains ACCEPTED, audit unchanged.
**Delivery findings:** no new upstream findings in round 2; round 1's three stand (ml4-6 filed, ml7 fall-through, stranded star-wars v0.0.45 for SM).

**Handoff:** To SM for finish-story

## Impact Summary

**Delivered (PR #313, MERGED 2026-08-13, merge commit 23d2af88):** three pure cited reducers — `earwig.ts` (EARWIG, MILLI.MAC:672), `inchworm.ts` (WRMMV, :2559), `bee.ts` (BEEMV, :56) — plus 76 tests and 130 byte-anchored claims. Two review rounds: round 1 REJECTED on one mutation-proven MEDIUM (flap-cadence probe gap), closed by test-only rework 920d46a0 and verified by instrument in round 2 (APPROVED). Final state: millipede 507/507, cabinet green including trial-merge against moved develop (1006 files, 15,376 passed), orchestrator 478/478, lint clean, citation gate 499/499, 26-mutant battery fully resolved (24 caught, 1 equivalent, survivor fixed).

**Blocking:** none.

**Non-blocking follow-ups:** ml4-6 (BEE-family helper extraction — third-consumer trigger, filed); ml7 wiring must call move after trySpawn in the same tick (ROM spawn fall-through, recorded above); stranded star-wars v0.0.45 release (SM pushing the tag at finish now that d9bb0abc is reachable from origin/develop via this PR).

## Sm Assessment

Setup complete for ml4-3 (5 pts, tdd). The title is the spec: pure-core reducers for three millipede insects — EARWIG move/start (MILLI.MAC:672), WRMMV enter/move inchworm (MILLI.MAC:2559), BEEMV move bee down screen (MILLI.MAC:56), plus PTS scoring. Follow the reducer pattern established by ml4-1 (beetle + spider) and ml4-2 (dragonfly + mosquito); ml4-2's archive claims a bee-helper crib at DF-33..52 and flags a BEEMV1 carry trap. ROM quarry is in-repo at reference/original-source/millipede (CRLF — grep may come up empty, use awk). Verify whether kill scores live in SHOOT2 vs PTS as ml4-1 found. Branch feat/ml4-3-earwig-inchworm-bee-reducers cut from develop; merge gate clear; no open PRs. Handing off to TEA for RED.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — millipede 506/506, lint clean, orchestrator 478/478, no smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain hand-covered: boundary pairs verified in ROM + 7 boundary mutants (E1/I3/B1/B2/B3/B4/B7) all caught |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain hand-covered: pure reducers, no catch blocks, no fallbacks; test loaders rethrow descriptive errors |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 1 (partial-union pins, downgraded LOW — load-bearing shape IS pinned at bee.test.ts:401-414), dismissed 1 (v<dv wrap fixture: domain unreachable, dv∈{2,3,4} ∧ entry v≥4 ⇒ v−dv≥0 — noted as optional robustness), noted 2 (LOW tautological fixed-point test; its own ROM cross-check corroborated mine) |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | dismissed 2 with rationale — both low-confidence wording nits whose SUBSTANCE the analyzer itself verified correct against dragonfly.ts/mosquito.ts ("area-halved" accurately describes the dragonfly's screen-area-split mask `v>=0x48?1:7`; "inverse" accurately describes the DEAD gate's inverted direction: dead relaxes bee/dragonfly spawning, blocks the inchworm). All 130 ROM citations and every sibling cross-reference verified accurate |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain hand-covered: discriminated unions on every multi-outcome return, `Readonly<Env>` on every non-mutating param, no type escapes (corroborated by rule-checker #1/#2: 0 violations) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain hand-covered: zero imports, zero I/O, pure byte-domain functions; no user input, no tenant surface in this repo |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain hand-covered: house style matches conway/dragonfly/mosquito exactly; the only duplication (BEE-family helpers) is deliberate, routed, and now filed as ml4-6 |
| 9 | reviewer-rule-checker | Yes | clean | 1 observation | 0 violations across 30 TS rules + JS rules + purity/house-style/citation rules; all 130 claims byte-verified + ~45 extents hand-reopened. Its one transient red ("NOCENT vetoes planting", 1 of 11 runs) is EXPLAINED and dismissed: my concurrent mutation battery had B11 (drop-attract-bypass) applied in the shared tree at that moment — B11 produces exactly that failure; 10 clean re-runs + standalone vite-node repro confirm |

**All received:** Yes (4 returned, 5 disabled via settings)
**Total findings:** 2 confirmed (1 MEDIUM mine by mutation, 1 LOW), 4 dismissed (with rationale), 3 noted LOW

**Round 2 note:** the specialist fleet was NOT re-dispatched — a proportionate round for a 2-file, test-only, +20/−3 rework (commit 920d46a0) whose round-1 sweep had already cleared the whole diff. Round-2 coverage was the lead reviewer's own: full rework diff read, probe walk and wrap arithmetic re-derived from the fixtures, and a three-mutant battery on the fixed surface (M1 the round-1 survivor, now caught; M2 the clamping port the new wrap test exists to kill, caught; M3 a plant-flag default inversion against the new union pins, caught — 5 red). True code 507/507 green; sources restored byte-identical.

### Rule Compliance

Per `.pennyfarthing/gates/lang-review/typescript.md` (30 checks), verified by reviewer-rule-checker exhaustively and spot-audited by me:

- **#1/#2 (type escapes, generics):** every function and interface in the three modules enumerated — no `as any`, no `@ts-ignore`, no non-null assertions; all 6 interfaces properly shaped, `Env` params `Readonly<>`, `Slot` params mutable by design (conway house style). Compliant.
- **#4/#21 (nullish, degenerate inputs):** `spawnH`'s `number | null` checked with `=== null` (0 is a valid H); byte wrap exercised for every ADD path (earwig/inchworm H). The bee's SBC wrap is unreachable in the legal domain (see test-analyzer decision). Compliant.
- **#14 (edges in one branch):** all three offscreen transitions computed at the single unconditional post-update point — traced against the ROM's own single exits (:734, :2604, :126). Compliant.
- **#15/#25/#26/#28 (guard anatomy):** no source-text guards in this diff; every assertion runs exports against independent hand-derived ROM literals; the one guard-strength defect found is the [TEST] MEDIUM below (probe choice, not anchor choice). One violation (fixed via rework).
- **#17/#20 (comments asserting unrun mechanisms/numbers):** every mechanism claim in the module headers was RE-RUN by me or a specialist — the WRMMV3 dead-`LDY PLAYR` claim verified against :2574-2627 (single caller, X untouched); the four-separate-RND0-reads claim verified at :692/:702/:706|:712/:719; the DF-33..52 crib claim verified against claims/10-dragonfly-mosquito.json. Compliant.
- **#18/#19 (apparatus vacuity, filtered populations):** fixtures vary the discriminating byte independently of the expectation (rnd0 vs rndSpeed, rnd1 0x04/0x02); no collection sweeps exist to filter. Compliant.
- **#22 (accept/reject inversion):** every comparison keeps the ROM's CMP/BCC acceptance direction (`>=`/`<`); no reject-style rewrites. Compliant.
- **#29 (ordering vs magnitude):** every cadence assertion pins exact frames and exact bytes. Compliant — with the caveat that the earwig cadence's negative probe under-samples the residue classes (the MEDIUM finding).
- **Purity rule (CLAUDE.md core boundary):** zero imports, zero nondeterminism; the ml1-1 AST purity sweep auto-enrolled and passes all three modules. Compliant.
- **Citation rule:** `node tools/audit/check-citations.mjs` — 499/499 repo-wide claims byte-verified, 0 errors, including all 130 new EW-/IW-/BE- claims; no MC-style line-based literal scanner exists in millipede, so the JSDoc-leak trap does not apply. Compliant.

### Devil's Advocate

Assume this code is broken; where would it bite? First, slot 12 is SHARED — bee, earwig, dragonfly and mosquito all spawn into `BEEC+12`. The reducers each guard `slot.color !== 0`, but that mutual exclusion only holds if ml7 wires all four families to the SAME slot record; give each module its own object and two critters occupy "slot 12" at once, every occupancy test passes, and nothing in this story's suites can see it — they test each module in isolation by design. That is a wiring hazard, not a defect here, and it lands with the fall-through Delivery Finding. Second, the spawn-tick fall-through itself: a caller that spawns and does NOT move in the same tick ships trajectories one frame late and an earwig whose first visible picture is 0x1C where the ROM shows 0x1D — invisible to every unit test, filed for ml7. Third, `earwigStamp` classifies whatever the caller read; the ROM reads OBSTAC at the POST-move position (TEMP1 written at :733 from the just-updated H). A caller reading pre-move coordinates poisons the wrong cell — the claim EW-30 pins the read, but the position contract lives only in the ROM. Fourth, `moveBee` flaps before checking `isBee` — the caller contract says "for ONE live bee", but a caller that sweeps all slots without the pic-band test would flap a dragonfly's picture; same caller-contract shape as the siblings, so consistent, but worth naming. Fifth, what would a wrong port get away with? That question is what the mutation battery answers empirically: 24 of 26 mutants die, one is equivalent (proven by re-running its true form, which dies), and exactly one survives — the earwig flap-cadence probe gap. That survivor is the review's finding. The devil found nothing else the pipeline missed.

## Reviewer Assessment (round 1 — superseded by the round-2 APPROVED below)

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] [TEST] | The earwig flap-cadence guard (EW-28/29, a cited AC) cannot distinguish the shipped `frame & 0x03` from `frame & 0x01` (flap every 2nd frame — a visible 2× fidelity regression): the only no-flap probe is frame 5, an ODD frame both masks skip. Mutation-proven: `(env.frame & 0x03)` → `(env.frame & 0x01)` in `moveEarwig` leaves all 506 millipede tests green. The assertion message "frames 1..3 mod 4 do not flap" claims three residues; only residue 1 is probed. | `plugins/millipede/tests/earwig.test.ts:363-365` | Add an EVEN off-cadence probe: move a fresh earwig at frame 2 (and/or 6) and assert `pic` unchanged. Then re-apply the mutant and require red. |

**Optional, non-blocking (take-or-leave in the same touch):** [LOW] pin the full union shape at `bee.test.ts:356` and `:374` (`toEqual({ kind: 'moved', plantMushroom: false })`) — the load-bearing case is already pinned at :401-414, this is style-consistency with TEA's own stated rule; [LOW] a `bee({ v: 2, dv: 3 })` fixture pinning the SBC wrap to 0xff (unreachable domain today, pure robustness); [LOW] the fixed-point poison test at `earwig.test.ts:388` is low-value (no action needed).

**Battery:** 26 mutants across the three producers, serial, tree-restoring: 24 caught, 1 equivalent (I6 order-swap — proven equivalent by re-running the true-form mutant, cycle-after-offscreen-return, which reddens the exit-tick test), 1 survivor (the MEDIUM above). First battery run printed 26/26 SURVIVED — a harness lie (`execSync` piped to `tail` returns tail's exit status); re-run with exit-code detection fixed.

**Why reject on a MEDIUM:** the blocking rule is a floor, not a ceiling. This is safety-net erosion on the story's own deliverable — the finding is in this diff's new tests, mutation-verified, and the fix is one probe line; per house precedent a Delivery Finding is for pre-existing issues, not for a gap this story's own diff wrote. The rework is surgical and routes red (testable finding).

**Data flow traced:** POKEY env bytes (rnd0/rndSpeed/rndDir/rndV, rnd1) + frame/score/game state → spawn gates (`mayStart*`, verified against MILLI.MAC CMP/BCC directions) → in-place slot byte writes (`start*`, all `& 0xff`) → per-tick unions (`*Move`, `BeeHit`, `EarwigStamp`) → caller seams (OBSTAC/DDTEXP/MUSHER/PLAY/CHAN7-9, documented and routed). Safe because the domain is closed bytes, the functions are pure, and every branch direction was read in the assembler, not inferred.

**Pattern observed:** [VERIFIED] exemplary port discipline — the CMP X,MUSH / BCC carry direction at MILLI.MAC:77-78 lands as `mushroomsNeeded(env.score2) >= env.mush` (`bee.ts:129`), the BEEMV1 LSR/CLC/ADC at :186-188 as `(score2 >> 1) + 6` (`bee.ts:117`), and the carry-set `ADC I,0 / AND I,13` picture cycle at :2586-2587 as `(pic + 1) & 0x13` (`inchworm.ts:112`) — all three checked against radix-16 semantics and all exactly right. Complies with the purity and citation rules (sweeps green).

**Error handling:** [VERIFIED] no throw paths in the modules (total functions over closed byte domain — `earwig.ts:93-95` comp, every write masked `& 0xff`); test loaders rethrow descriptive module-absent errors. Checked against #11 — nothing to narrow, nothing swallowed.

**Specialist coverage:** [EDGE][SILENT][TYPE][SEC][SIMPLE] disabled via settings — domains hand-worked as recorded in the Subagent Results table (boundary mutants, purity/import audit, union/Readonly audit, house-style comparison); [TEST] test-analyzer findings adjudicated above; [DOC] comment-analyzer clean with 2 dismissed nits; [RULE] rule-checker 0 violations, its transient anomaly attributed to my own concurrent battery (B11) with a 10-run clean confirmation.

**Handoff:** Back to TEA (red rework — the finding is testable). One required fix, three optional LOWs, nothing else open: deviation audited (ACCEPTED), extraction decision taken (deferred → ml4-6 filed), three Delivery Findings recorded (ml4-6 extraction, ml7 spawn-tick fall-through wiring, stranded star-wars v0.0.45 release for SM).