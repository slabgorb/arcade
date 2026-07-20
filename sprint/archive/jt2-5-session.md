---
story_id: "jt2-5"
jira_key: "jt2-5"
epic: "jt2"
workflow: "tdd"
---
# Story jt2-5: Wave machine core — the CIA process, full 80-row WAVTBL decode, six-type dispatch skeleton, degrade laws, seeding

## Story Details
- **ID:** jt2-5
- **Jira Key:** jt2-5
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-20T16:11:56Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T15:00:11Z | 2026-07-20T15:01:56Z | 1m 45s |
| red | 2026-07-20T15:01:56Z | 2026-07-20T15:35:11Z | 33m 15s |
| green | 2026-07-20T15:35:11Z | 2026-07-20T15:48:49Z | 13m 38s |
| review | 2026-07-20T15:48:49Z | 2026-07-20T16:04:42Z | 15m 53s |
| green | 2026-07-20T16:04:42Z | 2026-07-20T16:11:55Z | 7m 13s |
| review | 2026-07-20T16:11:55Z | 2026-07-20T16:11:56Z | 1s |
| finish | 2026-07-20T16:11:56Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): Own-line targeting deferred. The carried seam (JT22-028/029) asks bounder/hunter to track their OWN line (`BOLEV: LDD PPOSY,U`, JOUSTRV4.SRC:3905) vs the shadow lord's PLAYER line (`SHLEP: LDB PPOSY+1,X`, JOUSTRV4.SRC:4279). enemy.ts's `smartDecision` currently seeks the passed `player.pixelY` for ALL three smart brains. **Deferred with reasoning:** this is an enemy-BRAIN refinement living in `src/core/enemy.ts`, orthogonal to jt2-5's wave-machine job (seeding + dispatch + BCD + beats); the wave machine never determines enemy targeting, and modeling the bounder's own-line memory is a jt2-2 behaviour concern that would balloon this 3-pt wave story into re-architecting the smart brains. Recommend a dedicated enemy-targeting successor story. *Found by TEA during test design.*
- **Gap** (non-blocking): VRAND ledge-egg disposition deferred. jt2-4's tail asked jt2-5 to own the VRAND hatch-selection seam IF its wave-start path lands ledge eggs. It does NOT: jt2-5 seeds ENEMIES (bounders/hunters/lords/pteros, entering via jt2-6's pads), not eggs; egg WAVES emit only the `EGG1` message beat here, and the egg lifecycle (bounce/settle/ledge/hatch) already landed in jt2-4. The ledge-egg VRAND hatch selection is egg BEHAVIOUR (jt3/jt4), not wave-machine. **Explicit deferral per the carried seam's instruction.** *Found by TEA during test design.*
- **Improvement** (non-blocking): The story title + AC-1 say "80-row WAVTBL decode", but the vendored table (WAVTBL @ JOUSTRV4.SRC:2439 → the row before WTBEND @ 2546) is **90 rows** — 80 played-once rows (waves 1-80) plus a 10-row loop region (WTBRST waves 81-90, JOUSTRV4.SRC:2535-2545) that repeats forever. The gate + WAVE_TABLE commit all 90 so the loop-at-81 and the `$00,$AF` plateau are provable. No spec change needed; noting the "80" is the played-once count, not the committed row count. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): Source radix quirk in the WAVTBL status column — wave 58's status operand is `WBPER+010` (JOUSTRV4.SRC:2507) where the type-offset is written `010`, not `10` as its sibling ptero rows (e.g. wave 8 `WBPER+WBCL12+10`, :2447). The 6809 assembler (and TEA's `evalOperand`) reads a bare leading-zero token as **decimal 10**, NOT octal 8 — so wave 58 resolves to status `$0B` → `(& $0E)>>1 = 5 = ptero`, matching its "WAVE 58- PTERODACTYL WAVE" comment. Had it been octal 8 the wave would have mis-typed to egg. The committed decode + the independent byte-gate both agree, so this is settled data — flagged only so a future ROM auditor recognizes `010` as an intentional-looking source typo the radix rule already absorbs, not a decode error. *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (RESOLVED round 2): Gladiator degrade law's both-out combo `{p1:false,p2:false}` was unpinned (wave.test.ts:280-286) — a `both-out → 'gladiator'` mutant survived all 36 wave tests. FIXED by commit `58bf7d0` (TEA, tests-only): assertion added at wave.test.ts:290, mutant-kill reverified first-hand by Reviewer. No longer blocking. *Found by Reviewer round 1, closed round 2.*
- **Gap** (non-blocking): Own-line targeting (JT22-028/029) remains UNLANDED. TEA's deferral to a dedicated enemy-targeting successor is sound — the wave machine never sets enemy targets — but the carried-seam obligation persists and must be re-carried to that successor, not dropped. Affects `joust/src/core/enemy.ts` (successor story). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Committed 90 rows, not 80:** AC-1 says "80 WAVTBL rows". Tests commit + byte-gate all 90 (waves 1-90). Reason: the ROM's WTBRST loop region (waves 81-90, JOUSTRV4.SRC:2535-2545) must be decoded to prove the loop-at-81 law and the `$00,$AF` plateau; 80 is the played-once count. No behaviour change vs spec.
- **Gladiator-solo resolves to `'nop'`:** the ROM's WGLAD solo path is `WAVRT2 RTS` (does nothing). Tests model `dispatchWaveType(gladiatorStatus, solo) === 'nop'` (emitting zero beats), faithful to the RTS. The raw status still records `gladiator` (via `waveTypeIndex`); only the RESOLVED type degrades.


## Impact Summary

**Forward to successors (must carry):**

1. **Own-line targeting (JT22-028/029) — deferred fidelity item.** The carried seam asks bounder/hunter to track their OWN line (`BOLEV: LDD PPOSY,U`, JOUSTRV4.SRC:3905) vs the shadow lord's PLAYER line (`SHLEP: LDB PPOSY+1,X`, JOUSTRV4.SRC:4279); currently enemy.ts's `smartDecision` seeks the passed `player.pixelY` for ALL three smart brains. This is an enemy-brain refinement orthogonal to jt2-5's wave-machine job. **A dedicated enemy-targeting successor story must re-carry this seam** — the wave machine never sets targets, so the obligation lives downstream in `src/core/enemy.ts`. Affects jt2-2 behaviour scope, not wave dispatch.

2. **Budget oracles NOT YET WIRED into cadence.** `growWanted` / `growthDue` (growth-frame gate, CIA_GROWTH_FRAMES=896) and `emytimForWave` (early-enemy timer for waves 1-2) are pure data-return oracles from `wave.ts` — they are SEEDED but NOT YET WIRED into `stepFrame`'s in-scheduler promotion cadence. **jt2-7 wiring or a successor must thread these into the promotion loop** — currently `stepFrame` debits NSMART on promotion but does not yet fire growthDue resets or apply the early-enemy delay. The wave machine exposes the contracts; the scheduler must consume them.

3. **"80-row" prose wording is broadened in jt2-8.** AC-1 says "80 WAVTBL rows" but the table is 90 (80 played-once + 10-row loop at 81-90). This spec wording discrepancy is already on **jt2-8's backlog** (per SM's noted scope); do not re-fix here.

4. **Wave 58's source radix watch item (informational).** The status operand `WBPER+010` (JOUSTRV4.SRC:2507) is written with a leading zero, which the 6809 assembler reads as decimal 10, not octal 8 — resolving wave 58 to ptero (`status $0B → (& $0E)>>1 = 5`), matching its ROM comment. Both the committed decode and the byte-gate agree (0/90 mismatches). **This is settled data — flag for future ROM auditors only:** the `010` looks intentional but is a source typo the radix rule absorbs, not a decode error.

**No upstream blocking issues.** All review findings resolved; PR merged; suite 854/854 passing.

## Sm Assessment

Setup verified: session file with bare workflow field at setup phase, branch feat/jt2-5-wave-machine-core off develop at 6c03a6f (jt2-4's merge), story in_progress. The generated story context omitted the carried seams from the jt2-2/jt2-4 archives, so SM appended a Carried Seams section to the context file naming the budget input wiring, the stepFrame budget threading, the reviewer-required per-brain dispatch assertions, the own-line targeting, and the VRAND ledge-egg disposition. Peloton mode continues; merges pre-authorized. Next owner is TEA for red: the full 80-row WAVTBL decode with a re-derivation byte-gate, BCD 0-99 wave counter, six-type WJSRTB dispatch with survival/co-op live + degrade laws, negative claims for phantom types 12/14 and unplayed wave 0, message beats with no exact-duration pins, budget/EMYTIM seeding into jt2-2's inputs, and the IFN DEBUG wave oracles.

## Tea Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev). Commit `eb749f9` on `feat/jt2-5-wave-machine-core`.

**Red counts (real vitest):** full suite `24 files → 22 passed | 2 failed`, `853 tests → 804 passed | 49 failed`. The 49 failed are ALL clean self-describing reds: 37 `loadWave` ("wave machine not built yet"), 1 `loadWaveScheduler` ("frame.ts budget seam not wired"), 11 claim-coverage/JT25-exists. The **pre-existing 737 stay green** (804 − 67 new-passing = 737; the 67 new-passing are the 53 byte-verified source law-checks + phantom-comment + 360-byte-count + EQU self-derivation + 8 headline ranges already cited by JT8-079..086 + claims plumbing). `tsc --noEmit` (src+tests) exits 0.

**Test files (all absolute):**
- `/Users/slabgorb/Projects/a-2/joust/tests/helpers/wave-contract.ts` — TEA CONTRACT: the `WaveModule` type surface + `loadWave()` / `loadWaveScheduler()` self-describing dynamic loaders (tsc-clean; no static import of the absent module). Declares the budget-bearing `GameState` (carried seam).
- `/Users/slabgorb/Projects/a-2/joust/tests/wave.test.ts` — behaviour suite (49 tests; all gated on `loadWave`/`loadWaveScheduler` → RED).
- `/Users/slabgorb/Projects/a-2/joust/tests/wave-source.test.ts` — provenance + byte-gate + JT25 claim coverage.

**Laws pinned (every citation byte-verified this session against `/Users/slabgorb/Projects/a-2/reference/williams-source/joust/JOUSTRV4.SRC`):**
1. Full 90-row WAVTBL decode (nibble packing `bounders:hunters / lords:pursuers / pterodactyls / status`, :175-181), loop-at-81 (:2015-2021, 2535-2546), `$00,$AF` plateau (byte0=$00, pursuit nibble=$F across waves ≥81). BOTH directions: loop ≠ wrap-to-1, ≠ modulo-90; early wave ≠ plateau.
2. BCD 0-99 counter (:2001-2004): `0x09→0x10` (DAA, not binary), `0x99→0x00` (rollover) — exact boundaries; independent of the table index (BCD wraps at 100 while the table sits in its plateau).
3. Six-type WJSRTB dispatch (`& $0E >> 1`, :2041-2044, 2586-2591); degrade laws BOTH directions across all 4 player combos: co-op→survival unless both alive (:2628-2631), gladiator→nop solo (:2697-2700); non-degrading types invariant to player count.
4. NEGATIVE claims: phantom indices 6/7 (offsets 12/14, :187) absent from every row + `rawWaveType` throws; wave 0 never played (`waveRowAt(0)` throws; fresh game's wave 1 = intro). Boundary: offset 10 (ptero) valid vs 12/14 phantom.
5. Message beats — count/shape only, NO durations: nop 0, intro 2, coop 2, survival 1, gladiator 3, egg 1, ptero 1; each beat is `{message}` ONLY (guarded against a `seconds`/`ms`/`duration`/`delay`/`frames` field); distinct types emit distinct runs. (:2045, 2601 the ~1 s `#180/6`/`#90/6`.)
6. Seeding into jt2-2: `seedWaveBudget(row) === enemy.seedBudget(row.pursuers)` (:2076-2077); `CIA_GROWTH_FRAMES === 896 === enemy.INTEL_GROWTH_FRAMES`, `growthDue` fires at each 896 (:2094-2096); EMYTIM=2 on waves 1-2 only, exact boundary (:2202-2205).
7. High-nibble cliff destruction as DATA only (`cliffBits = status & $F0`, :185-192) — no behaviour.
8. IFN DEBUG oracles: `assertWaveEndClean` throws on NSMART≠0 (:1983) and on negative enemy count (:2953-2958, 2966-2970); passes clean.
9. CARRIED SEAMS: budget threaded onto `GameState` (createState seeds `{0,0}`) + in-scheduler promotion LIVE in `stepFrame` (dumb enemy with `shouldPromote` → its decision brain, debit budget); budget exhaustion stops promotion (list order); already-smart never re-promoted. **Reviewer-required per-brain dispatch:** a promoted `b2undr`/`shadow` enemy's `runBrain` equals its own brain fn and ≠ `boundr` at velY $180 (between the $100/$200 brakes) — kills the b2undr/shadow→boundr reroute mutant.
10. Determinism: seed → withBudget → 20 stepFrames replays bit-for-bit.

**WAVTBL gate design (the jt1-3 byte-gate, independence preserved):** `wave-source.test.ts` re-derives the wave-status EQUs (WBPER/WBJSR*/WBCL*, :185-197) into a symbol table FROM the source, then flattens JOUSTRV4.SRC:2439-2545 to 360 bytes with its OWN resolver (never Dev's decoder), and asserts they equal the committed `WAVE_TABLE` flattened (nibble-repacked). First divergence reports `wave N, column`. Skips on CI (`!vendoredAvailable`); a self-check pins the derived composite masks ($30/$70/$B0/$C0/$F0). I did NOT edit the shared `joust-source.ts` reader — the wave symbols are resolved locally to keep the 5 other suites' blast radius at zero. Claim coverage: 8 headline ranges already cited by JT8-079..086; the 10 decode/oracle lines (WAVTBL data :2438-2439, WTBEND, dispatch mask :2041-2044, composite masks :193-197, PWAVE-seed :1878, beats :2045/2601, phantom :187, oracles :2953-2958/2966-2970) require new **JT25-*** claims.

**Delivery Findings:** own-line targeting (JT22-028/029) and VRAND ledge-egg both DEFERRED with reasoning; 80-vs-90-row wording noted — see `## Delivery Findings`.

**Dev briefing (GREEN, Julia):**
- Create `joust/src/core/wave.ts` satisfying `tests/helpers/wave-contract.ts`: the committed 90-row `WAVE_TABLE` (decode each FCB row's nibbles; the byte-gate is the oracle), `waveRowAt` (waves 1-90 direct; ≥91 → `80 + ((n-81) mod 10)`; throw for <1), `nextWaveBcd` (BCD DAA + 0x99→0x00), `waveTypeIndex`/`rawWaveType`/`dispatchWaveType`/`cliffBits`, `waveBeats` (`{message}` only), `emytimForWave`, `seedWaveBudget` (reuse enemy.seedBudget), `CIA_GROWTH_FRAMES`/`growthDue`, `withBudget`, `assertWaveEndClean`, plus the `WAVE_TABLE_LEN`/`WAVE_LOOP_START`/`WAVE_TYPES`/`PHANTOM_TYPE_INDICES` constants.
- Thread the budget onto `GameState` in `src/core/frame.ts`: add `budget: IntelBudget` (import from enemy.ts), `createState` seeds `{nsmart:0, wsmart:0}`, and `stepFrame` promotes a waking dumb (`pchase===0`) `kind:'enemy'` process when `shouldPromote(state.budget)` — set `brain = enemy.decision`, `pchase = 1`, debit `state.budget.nsmart` (in list order; multiple wakers each consume). Do NOT re-promote a smart enemy. Keep it pure; the jt1-5 determinism replay must survive.
- Commit `docs/rom-study/claims/wave.json` with **JT25-*** claims covering the 10 red ranges (verbatims must byte-match the source — the exact lines are in `wave-source.test.ts`'s LAWS array). Each JT25 claim's text must name its own FILE:LINESPEC (the jt1-2 R2 standard, enforced).
- Do NOT import the test-side reader from `src/` (the independence gate). Watch the purity guard (no clock/Math.random in core).

**Handoff:** To Dev for GREEN.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `joust/src/core/wave.ts` (new) — the wave machine core: committed 90-row `WAVE_TABLE` (byte-gated against JOUSTRV4.SRC:2439-2545), `waveRowAt` (loop-at-81 via 0-based index `80 + ((n-81) mod 10)`), `nextWaveBcd` (BCD DAA + 0x99→0x00 via decimal round-trip), the six-type WJSRTB dispatch (`waveTypeIndex`/`rawWaveType`/`dispatchWaveType`/`cliffBits`) with coop→survival & gladiator→nop-solo degrades, `waveBeats` ({message}-only, TEA's cited labels), `emytimForWave`, `seedWaveBudget` (delegates to enemy.seedBudget), `CIA_GROWTH_FRAMES`=896/`growthDue`, `withBudget`, `assertWaveEndClean`, plus `WAVE_TABLE_LEN`/`WAVE_LOOP_START`/`WAVE_TYPES`/`PHANTOM_TYPE_INDICES`.
- `joust/src/core/frame.ts` (modified) — threaded `budget: IntelBudget` onto `GameState`; `createState` seeds `{nsmart:0, wsmart:0}`; `stepFrame` now promotes a waking dumb `kind:'enemy'` process in-scheduler (pchase 0 + `shouldPromote` → `promote` → its decision brain, debiting NSMART, in list order, never re-promoting a smart enemy). Budget passes through by reference when no enemy wakes, so the jt1-5/jt2-1 determinism replays stay bit-for-bit.
- `joust/docs/rom-study/claims/wave.json` (new) — 31 `JT25-*` claims (verbatims extracted byte-exact from JOUSTRV4.SRC) covering all 18 `CITED_RANGES`; each names its own `JOUSTRV4.SRC:NNN`.

**Tests:** 854/854 passing (GREEN) — full suite `24 files passed`, real `npx vitest run` exit 0. Baseline was 853 (804 pass | 49 fail); +1 test is the purity sweep picking up the new `wave.ts`. `npx tsc --noEmit` exit 0. Byte-gate + citations gate confirmed RAN (not skipped): "every one of the 90 rows matches its source bytes (THE GATE)" ✓ 23ms, "every committed claim re-opens byte-for-byte" ✓.
**Branch:** feat/jt2-5-wave-machine-core (pushed)

**Diff scope:** src/core + claims only; no test/contract files touched.

**Handoff:** To Reviewer.

## Subagent Results

| Specialist | Verdict | Findings |
|---|---|---|
| reviewer-preflight | Clean | 6 files +1857/−12; suite 854/854; tsc clean; zero leftovers; clean TDD split (red tests-only, green src+claims-only); branch synced; origin/develop unmoved since base 6c03a6f. |
| reviewer-test-analyzer | 1 finding | [HIGH-conf] gladiator degrade missing `{p1:false,p2:false}` case (wave.test.ts:280) — a both-out→'gladiator' mutant passes all 36 wave tests; same shape as jt2-3/jt2-4. 4 mutants correctly reddened (promote() b2undr/shadow reroute, budget thread-through, shouldPromote off-by-one, WAVE_LOOP_LEN off-by-one); cp-restore verified; tree clean. |
| reviewer-security | Clean | Zero findings (pure core, no I/O / auth / injection surface). |
| reviewer-rule-checker | 5/5 PASS + ITEM 0 | 90-row table + loop-at-81 independently CONFIRMED source-true via own nibble-splitter + EQU resolver (0/90 mismatches, WAVTBL:2438→WTBEND:2546, WTBRST=row 81); 31 JT25 claims byte-exact; determinism replays unperturbed. Non-blocking: 1 anomalous startup run showed 2 waveRowAt failures that did NOT reproduce across 7 full-suite + isolated + direct-module runs; logic independently verified correct. |

**All received:** Yes

## Reviewer Assessment

[PREFLIGHT] clean · [SEC] clean · [RULE] 5/5 pass + ITEM 0 confirmed · [TEST] gap closed (round 2)

**Verdict:** APPROVED (round 2 — see `## Reviewer Assessment (round 2)` at the end of this file). The round-1 REJECT recorded here was resolved by commit `58bf7d0` (TEA, tests-only): the gladiator both-out assertion is now pinned and the mutant killed. The round-1 analysis below is retained as the historical record.

**Round-1 verdict (superseded by round 2):** REJECTED — one blocking test-coverage gap.

Not a rubber-stamp: I re-verified every specialist claim first-hand rather than inheriting it. The shipping code is correct — this REJECT closes one mutation hole on a headline-AC law, consistent with the jt2-3/jt2-4 bar, and is a one-line test fix.

**Independent verification performed (specialists are input, not substitute):**
- **Data flow traced (budget seam, end-to-end):** a wave's pursuit nibble → `seedWaveBudget(row)` → `enemy.seedBudget(row.pursuers)` → `IntelBudget` → `withBudget(state,budget)` onto `GameState.budget` → `stepFrame` promotes a waking dumb enemy (`pchase===0` guard) with `shouldPromote(budget)` to its decision brain and debits NSMART, in list order across both passes (frame.ts:243-273). SAFE: budget is threaded by value through `runBehaviour`, mutated ONLY for `kind:'enemy'`; non-enemy sims pass it through by reference, so the jt1-5/jt2-1 determinism replays are unperturbed. Exhaustion stops promotion; an already-smart enemy is never re-promoted.
- **Loop-at-81 arithmetic — reproduced independently:** `80 + ((n-81) mod 10)` gives wave 91→81, 92→82, 100→90, 101→81. The rule-checker's anomalous "91→82" corresponds to NO code path in this decoder; the module is pure + `Object.freeze`d with zero entropy sources (git-diff grep: no Math.random/Date/clock added to core). Ran both wave suites twice — 116/116 each, clean.
- **Carried reviewer-required seam LANDED + mutation-killing:** the b2undr/shadow per-brain dispatch (wave.test.ts:463-501) asserts `promoted.brain` AND `runBrain(velY $180) === b2undr/shadow ≠ boundr` — genuinely kills the jt2-2 copy-paste reroute mutant the carried seam demanded. Verified real, not scenery.
- **Wave 58 radix (Dev's watch item):** `WBPER+010` → decimal 10 → status $0B → `(& $0E)>>1 = 5 = ptero` (wave.ts:131, pterodactyls:3) — the radix rule absorbed the `010` source typo correctly; byte-gate + rule-checker both agree. Settled data.
- **Error handling:** `waveRowAt` throws on non-integer/<1 (wave 0 never played), `rawWaveType`/`dispatchWaveType` throw on phantom index 6/7, `assertWaveEndClean` throws on NSMART≠0 / negative enemies — every guard self-describing and test-covered. Good.

**Findings by severity:**

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] — RESOLVED r2 | Gladiator degrade law leaves the both-out combo `{p1:false,p2:false}` unpinned; the coop sibling pins all 4, so this asymmetry lets a `both-out → 'gladiator'` mutant survive all 36 wave tests — a surviving mutant on a headline-AC degrade law. **Code is correct; the gap is test-only.** FIXED in commit `58bf7d0` (assertion at wave.test.ts:290). | joust/tests/wave.test.ts:280-286 | Add `expect(w.dispatchWaveType(GLAD, { p1: false, p2: false })).toBe('nop')`, mirroring coop's 4th combo at :277. One line. |

No Critical/High correctness, security, or design defects. Everything else is APPROVED-quality.

**KEY RULING (a) — the gladiator both-out gap: BLOCKING (High).** The production code (`bothAlive ? 'gladiator' : 'nop'`) is correct and the AC "gladiator no-ops solo" ships satisfied — so this is a test-coverage gap, not a bug. I still block it, for three reasons that outweigh "code is correct": (1) it is a surviving mutant on a degrade law the AC names by name; (2) it is the SAME shape that blocked in jt2-3 and jt2-4 — ruling it non-blocking now would lower the epic's established bar mid-stream; (3) the coop sibling pins the identically-unreachable both-out case (→survival), so the omission is an oversight, not a principled "skip unreachable" decision — and the fix is literally one assertion. Per "when in doubt, REJECT," and to keep the mutation bar consistent across the epic, this blocks. Bounces to TEA (testable), not Dev.

**KEY RULING (b) — the unreproducible startup flake: NO action; not blocking, no follow-up warranted.** I independently disproved it as a code defect: the reported values (91→82) match no path in a pure, frozen decoder with zero entropy sources; my own arithmetic and two clean suite runs give 91→81. Combined with the rule-checker's 7 clean full-suite runs + isolated + direct-module invocation and its 0/90 byte-gate, the most parsimonious cause is a known test-infra artifact — a concurrent specialist mutation in the LIVE tree briefly holding an off-by-one loop mutant (the documented "reviewer subagents mutate the live tree; their failures look like yours" pattern), since reverted. Opening a determinism-hunting story would chase a ghost against code that is deterministic by construction (purity scanner enforces no clock/RNG in core). Recorded as an observation; no successor obligation.

**Deviation audit (both ACCEPTED):**
- **Committed 90 rows, not 80 (AC-1 says 80):** ACCEPTED. 90 ⊇ 80; the extra 10 rows are the WTBRST loop region (81-90) required to prove loop-at-81 and the $00,$AF plateau, all byte-gated (0/90 mismatches). The "80-row" prose is a third wrong-prose instance already broadened into jt2-8 by SM — no spec change needed here.
- **Gladiator-solo resolves to 'nop' (WAVRT2 RTS):** ACCEPTED. Faithful to the ROM's `WGLAD` solo RTS; the raw status still records `gladiator` via `waveTypeIndex`, only the RESOLVED type degrades — matches AC-2 exactly.

**Carried-seam disposition:** budget INPUTS (seedWaveBudget→enemy.seedBudget; CIA_GROWTH_FRAMES=896) LANDED; stepFrame in-scheduler promotion LIVE; reviewer-required per-brain dispatch LANDED + mutation-killing; VRAND ledge-egg seam DISCHARGED (condition false — jt2-5 seeds enemies not eggs — deferral recorded per the seam's own instruction); own-line targeting DEFERRED with sound reasoning (must re-carry to an enemy-targeting successor, logged as a Delivery Finding).

**Handoff:** Back to TEA — add the single `{p1:false,p2:false} → 'nop'` gladiator assertion, then re-review (fast path; everything else is clear).
## Tea Assessment (round 2 — hardening)

**Reviewer required (one item):** the gladiator degrade test carried only 3 of 4 player-state combos; the co-op test (`tests/wave.test.ts:277`) carries all 4. The missing `{p1:false, p2:false} → 'nop'` left a both-out short-circuit to `'gladiator'` unpinned.

**Fix:** added one assertion in the existing gladiator `it()` (faithful mirror of the co-op both-out case), `tests/wave.test.ts:290`:
`expect(w.dispatchWaveType(GLAD, { p1: false, p2: false }), 'both out → nop').toBe('nop')`
Gladiator no-ops whenever ANY player is out (WGLAD `BEQ WAVRT2` twice, JOUSTRV4.SRC:2697-2700), so two-out is still solo → nop.

**Mutant-kill evidence (cp-backup discipline, not git checkout):**
- Backup: `cp src/core/wave.ts <scratch>/wave.ts.bak`; original sha256 `94b5fa10ecdac671ac4c87a818dd30ddb3f453d7a66dd58d8381af0d0bf682a7`.
- Mutation injected at `src/core/wave.ts:249` — `if (raw === 'gladiator') return bothAlive || (!players.p1 && !players.p2) ? 'gladiator' : 'nop'` (the "both-same"/XNOR survivor: TT→glad, TF→nop, FT→nop, **FF→glad**).
- Against the mutant: `vitest -t "gladiator wave runs"` → **1 failed**, failing on EXACTLY the new line — `AssertionError: both out → nop: expected 'gladiator' to be 'nop'` (`tests/wave.test.ts:290`). The 3 pre-existing combos stayed green, confirming they did NOT catch it (the reviewer's "survives all 36 wave tests").
- Restored: `cp <scratch>/wave.ts.bak src/core/wave.ts`; restored sha256 `94b5fa10…` — **matches original exactly**. `git status` after restore showed only `tests/wave.test.ts` modified (src/ untouched).
- Control run: `tsc --noEmit` exit 0; full suite **24 files, 854 passed** (green).

**Counts:** 854 passed (NOT 855 — the fix is an added `expect` inside the existing gladiator `it()`, mirroring the co-op test's single-`it` 4-combo structure; the assertion count grows, the test-case count is unchanged). tsc clean.

**Commit / push:** `58bf7d0` (tests-only), pushed `0f1618d..58bf7d0` → `origin/feat/jt2-5-wave-machine-core`. Working tree clean.

**Handoff:** back to Reviewer for re-review.

## Reviewer Assessment (round 2)

[PREFLIGHT] clean · [SEC] clean · [RULE] 5/5 pass · [TEST] gap closed + mutant-kill reverified

**Verdict:** APPROVED

The single round-1 required item is closed. I re-verified the fix first-hand rather than accepting TEA's evidence on faith:

- **Diff is tests-only, +5 lines, no scope creep.** `git diff 0f1618d..58bf7d0` touches only `tests/wave.test.ts` (+5: 4 comment lines + 1 assertion), inside the existing gladiator `it()` at :290 — a faithful mirror of coop's in-`it()` 4th combo at :277, exactly the shape I required. No source, contract, or claims file moved. My round-1 core verification (budget-seam data flow, loop-at-81 arithmetic, six-type dispatch, byte-gate, determinism, security) is therefore undisturbed and still stands.
- **Mutant-kill reproduced independently.** I injected the both-out→'gladiator' XNOR survivor at wave.ts:249 (`bothAlive || (!players.p1 && !players.p2) ? 'gladiator' : 'nop'`) and ran the gladiator test: it failed on EXACTLY the new line — `both out → nop: expected 'gladiator' to be 'nop'` (:290) — while the three pre-existing combos stayed green, first-hand proof they never caught it. Restored from a sha256-pinned cp backup (`94b5fa10…`, matches original); tree clean, src untouched.
- **Control green.** Full suite 24 files / 854 passed (count unchanged — an added `expect`, not a new `it()`, matching coop's single-`it` 4-combo structure); `tsc --noEmit` exit 0; working tree clean.

**Carried-seam disposition (unchanged from round 1):** budget inputs + in-scheduler promotion + reviewer-required per-brain dispatch LANDED and mutation-killing; VRAND ledge-egg DISCHARGED; own-line targeting (JT22-028/029) DEFERRED with sound reasoning — logged as a non-blocking Delivery Finding to re-carry to an enemy-targeting successor. The unreproducible round-1 startup flake remains a disproven-defect observation (no action).

**Remaining items:** none.

**Handoff:** To SM for finish-story.