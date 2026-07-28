---
story_id: "jt8-1"
jira_key: "jt8-1"
epic: "jt8"
workflow: "tdd"
---
# Story jt8-1: Target aggro subsystem (TARPLY/TARTM) plus wire the targeted player into the enemy step

## Story Details
- **ID:** jt8-1
- **Jira Key:** jt8-1
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-28T20:02:54Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-28T11:41:45Z | 2026-07-28T11:44:44Z | 2m 59s |
| red | 2026-07-28T11:44:44Z | 2026-07-28T12:05:49Z | 21m 5s |
| green | 2026-07-28T12:05:49Z | 2026-07-28T12:23:55Z | 18m 6s |
| review | 2026-07-28T12:23:55Z | 2026-07-28T20:02:54Z | 7h 38m |
| finish | 2026-07-28T20:02:54Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Improvement** (non-blocking): The SELPLY nearest-of-two tiebreak (JOUSTRV4.SRC:4476-4514, "FIND CLOSEST CO-ORDINANT") is a subtle 6809 min-of-coordinate decode — per candidate, distance ≈ `min(|dx|, |dy|)`, pick the smaller, tie keeps the primary (TARPLY). The behaviour suite pins an UNAMBIGUOUS nearest case only (P1 nearer on both axes); the exact metric is pinned by the CITATION, not a discriminating behavioural case, so I would not ship a discriminating unit test I might mis-decode. Affects `src/core/target.ts` (`selectTarget`) — transcribe the metric faithfully from the source; add a discriminating case once the decode is confirmed. *Found by TEA during test design.*
- **Gap** (non-blocking): The aggro state needs a carried seat on the sim. The wiring fixture (`target-wiring.test.ts`) seats it as `DemoSim.targets` — the seat `budget` already occupies, the object `stepFrame` receives — so `DemoSim`/`DemoState` (and the frame.ts `GameState`) grow a `targets: TargetState`. Update `tests/helpers/demo-contract.ts` / `scheduler-contract.ts` to match, seed it in `createWaveDemo`, tick it in `stepDemo`, and thread `selectTarget` into the enemy step at `frame.ts:265`. Affects `src/core/demo.ts`, `src/core/frame.ts`, the demo/scheduler contracts. *Found by TEA during test design.*
- **Question** (non-blocking): `registerPlayer` takes an explicit `grace`; the sim wiring must pass the ROM `TARTIM` value (JOUSTRV4.SRC:960 initialises it). The pure tests use an explicit grace so they do not depend on the value; Dev should cite TARTIM's actual value when seeding. Affects `src/core/target.ts` seeding in `createWaveDemo`. *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): SELPLY reads the player's PRE-step position this frame — `stepFrame` gathers the player list from `state.processes` before either pass runs, so an enemy reacts to the players' previous-frame positions (a 1-frame lag). The ROM steps primaries (players) before secondaries (enemies), so a faithful enemy sees the current-frame player. The lag is deterministic and negligible for pursuit; closing it (read partially-stepped primaries from `next[]` during the secondary pass) is a possible fidelity follow-up. Affects `src/core/frame.ts` (`stepFrame`). *Found by Dev during implementation.*
- **Improvement** (non-blocking): the SELPLY nearest-of-two tiebreak is implemented as the intuitive closest-coordinate metric (`min(|dx|,|dy|)`, smaller wins, tie keeps primary) and cited (JT81-003). TEA's finding stands: a discriminating unit case for the exact 6809 decode (:4476-4514) is still deferred — the behaviour suite pins only an unambiguous case. Affects `src/core/target.ts` (`selectTarget` / `coordDistance`). *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): `tests/game.test.ts:264`'s round-1 tighten to `expect(after.players[0].score % 50).toBe(0)` closed the "137 slips through" slack, but is directionally WEAKER than the old `toBeLessThan(kill!.value)` on one axis: every DVALUE in this codebase is a multiple of 50 (killScore 500/750/1500, SCRTEN death 50, bounty 3000), so this LINE alone cannot catch a hypothetical late/second in-window attribution leak of P2's kill value onto P1's ledger. Net it-block coverage is intact — the unchanged kill-frame `toBe(0)` at :247-248 kills hardcode-P1 (live-mutation-confirmed) — and no constructible single-token mutation exploits the gap today (the finite all-÷50 DVALUE table forecloses it), so this is LOW / non-blocking, not a rejection. Recommended close: keep BOTH assertions (the `% 50` invariant AND `toBeLessThan(kill!.value)`) — belt-and-suspenders, one line, strictly stronger. Affects `tests/game.test.ts` (the AC-3 integration `it`). *Found by Reviewer during code review (round 2, corroborated by test-analyzer + rule-checker).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- No deviations. The tests follow the approved design (aggro subsystem carried on the sim like IntelBudget/BaiterClock; `selectTarget` fed into the existing `stepEnemy`). The one implementation-shaping choice — seating the aggro state on `DemoSim.targets` — is recorded as a Delivery Finding (Gap), not a deviation, since the spec left the exact carried seat to implementation.

### Dev (implementation)
- **Updated one jt4-1 co-op-independence assertion for the now-hunting enemies**
  - Spec source: tests/game.test.ts — jt4-1 AC-3 integration ("a P2 kill credits ONLY ledger 1"), line 257
  - Spec text: "expect(after.players[0].score, 'and P1 still untouched').toBe(0)"
  - Implementation: changed to `.toBeLessThan(kill!.value)` — P1's ledger never receives P2's kill DVALUE, but may now bank its OWN 50-for-dying once a hunting enemy catches an idle P1.
  - Rationale: jt8-1 wires enemies to HUNT (the story's whole point). This jt4-1 test assumed an idle P1 survives untouched — true only under the pre-jt8-1 non-hunting bug. The change preserves the mutation-killing intent: the hardcode-P1 mutation would credit ledger 0 the kill value (>= 500); P1's own death credit (50) is far below, so the assertion still discriminates it. The kill-frame assertion (line 248, `toBe(0)`) is untouched and still passes (P1 is alive at the kill).
  - Severity: minor
  - Forward impact: none — the assertion still kills all three jt4-1 mutations (hardcode-P1 / dedupe-drop / drain-disconnect); jt8-2/jt8-3 do not touch it.

### Reviewer (audit)

- **Dev's jt4-1 co-op-independence assertion change** (now `expect(after.players[0].score % 50).toBe(0)` after the round-1 tighten) → ✓ ACCEPTED by Reviewer: the deviation is sound and necessary — jt8-1 wires enemies to HUNT, so the pre-jt8-1 "idle P1 stays at 0" premise no longer holds; P1 may bank its own 50-for-dying. The mutation-killing intent is preserved (hardcode-P1 dies at the unchanged kill-frame `toBe(0)`, :247-248, live-confirmed). One caveat recorded as a non-blocking Delivery Finding (Reviewer, code review): the `% 50` line alone is directionally weaker than `< kill.value` for a late in-window leak — recommend keeping both assertions. Non-blocking; does not reverse the deviation.
- No UNDOCUMENTED deviations found in the round-2 diff (test/citation/doc changes + a behaviour-preserving reconcileTargets hardening).

## Sm Assessment

**Story:** jt8-1 — the first story of epic jt8 (joust playability). Build the enemy
**aggro subsystem** and wire it in so the (already-faithful, already-tested) vertical-seek
brains finally receive the player.

**Setup:** session + context written; feature branch `feat/jt8-1-target-aggro-wiring`
cut on joust from `develop`; story moved to `in_progress`. Jira disabled (id-as-key).

**Approach (from the approved design — cite, do not re-derive):**
- New pure module `joust/src/core/target.ts` carrying the global aggro state
  `TARPLY`/`TARPL2` + grace timers `TARTM1`/`TARTM2` (reload `TARTIM`). It rides the
  sim as a carried field on `DemoSim`/`DemoState` **exactly like `IntelBudget` and
  `BaiterClock` already do** (`demo.ts` `budget`/`baiterClock`), advanced inside
  `stepDemo`. No second stepping path — the jt2-1 one-sim seam holds. The purity
  guard must sweep `target.ts`.
- `frame.ts` `runBehaviour` (the `kind === 'enemy'` branch, ~line 265) computes THIS
  enemy's target as a `PlayerView | null` and passes it into the EXISTING
  `stepEnemy(enemy, { player })`. `enemy.ts` `smartDecision` already seeks the player's
  altitude faithfully — it only lacked the player.

**Ground truth:** `reference/williams-source/joust/JOUSTRV4.SRC` (red-label RV4) +
`joust/docs/rom-study/`; full design at
`joust/docs/superpowers/specs/2026-07-28-joust-playability-design.md`. Verified anchors
in the ACs (SELPLY :4462-4520, STPLY1/2 :4655-4665, grace gate :4464-4469, nearest-pick
:4476-4514, death slot-shift :4746-4753, timer tick :4857-4862, reset :969-970). **Do
NOT fabricate or "correct" a line number** — cite the LABEL and verify against the
vendored source (the sm-setup-fabricates-citations lesson).

**Chain:** jt8-1 → jt8-2 (horizontal homing) → jt8-3 (cliff look-ahead + shadow);
jt8-4 (egg collection) is independent.

**Handoff:** Leeloo (TEA) — RED phase. Pin the SELPLY selection (grace-gated, nearest),
the lifecycle (register/tick/shift/reset), and a seeded trace proving a smart enemy now
flaps toward a targetable player's altitude. Mutation-check the selection.

## Tea Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev)

**Test Files:**
- `tests/helpers/target-contract.ts` — the `TargetModule` contract (seedTargets / registerPlayer / tickTargetTimers / removeTarget / selectTarget + the `TargetState`/`PlayerView` shapes) and the `loadTarget()` runtime-specifier loader (the `loadEnemy` pattern → clean "feature absent" red).
- `tests/target.test.ts` — SELPLY selection (grace-gate, primary/secondary slots, unambiguous nearest, null) + the aggro lifecycle (seed/register/tick-floor/shift-on-death/no-op) + a purity test. 16 tests, all mutation-sensitive.
- `tests/target-source.test.ts` — the double-entry citation suite. 33 vendored-source LAWS PASS (every SELPLY/STPLY/TARTM/reset line + the RAMDEF decls verified against `JOUSTRV4.SRC`/`RAMDEF.SRC` — my line numbers are correct), claim-coverage RED until Dev commits `JT81-*` claims for the 7 cited ranges.
- `tests/target-wiring.test.ts` — AC-4 seeded discriminator: a promoted bounder below a targetable player must reach `velY < 0` (flap up); impossible while the enemy is stepped without the player.

**AC coverage:**
- AC-1 (pure `target.ts`, carried on the sim, purity-swept) → `target.test.ts` contract + purity test; the existing `purity.test.ts` `it.each` auto-sweeps `target.ts` once it lands; the wiring fixture seats it as `DemoSim.targets`.
- AC-2 (SELPLY selection, mutation-checked, cited :4462-4520) → `target.test.ts` SELPLY describe + `target-source.test.ts` LAWS + claim-coverage.
- AC-3 (lifecycle cited: register/tick/shift/reset) → `target.test.ts` lifecycle describe + `target-source.test.ts` STPLY/timer/reset/RAMDEF citations + claim-coverage.
- AC-4 (frame.ts passes the target; seeded trace) → `target-wiring.test.ts`.

**Verification (ran directly — testing-runner is known to confabulate names):**
full joust suite = **1584 passed / 8 failed / 17 skipped**; the ONLY failures are the 3 new jt8-1 files (`target.test.ts` + `target-wiring.test.ts` feature-absent, `target-source.test.ts` claim-coverage). No regressions. The citation block's 33 passes independently prove the ROM line numbers are accurate.

### Rule Coverage (lang-review/typescript.md)

| Rule | Test / mechanism | Status |
|------|------------------|--------|
| #1 type-safety escapes | contract carries no `as any`; `selectTarget` returns `PlayerView \| null` narrowed via `?.` — `target.test.ts` null-vs-value cases | RED |
| #2 readonly generics | `TargetState`/`TargetPlayer` fields `readonly`; `players: readonly TargetPlayer[]`; purity test | RED |
| #4 null with `??` not `||` | `selectTarget` null paths pinned explicitly (grace/empty/absent) via `toBeNull` | RED |
| #5 `.js` ESM imports | every test + contract import carries the `.js` extension | passing |
| #8 test quality | self-check: every test asserts a concrete value; nearest case discriminates slot-from-distance; no vacuous assertions | RED / self-checked |

**Rules checked:** 5 of 5 applicable (the rest — enums/React/async/config/security/perf — are N/A for a pure numeric core).
**Self-check:** 0 vacuous tests found.

**Delivery Findings:** 3 (non-blocking) — the SELPLY nearest-metric decode, the `DemoSim.targets` carried seat, and the `TARTIM` grace value. See `### TEA (test design)` above.

**Handoff:** Korben (Dev) — GREEN. Build `src/core/target.ts` to the contract, add the `JT81-*` claims (`docs/rom-study/claims/target.json`), seat `targets` on `DemoSim`, seed it in `createWaveDemo`, tick it in `stepDemo`, and thread `selectTarget` into `frame.ts:265`.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/target.ts` (new) — the pure aggro subsystem: `TARPLY`/`TARPL2` slots + `TARTM1`/`TARTM2` grace timers (`TARTIM`=90 cited). `seedTargets` / `registerPlayer` / `tickTargetTimers` / `removeTarget` / `selectTarget`, every law radix-cited to `JOUSTRV4.SRC`.
- `src/core/frame.ts` — `GameState` grows an OPTIONAL `targets`; `stepFrame` gathers the live players and, per waking enemy, `selectTarget`s its quarry and hands it to the existing `stepEnemy(enemy, { player })`. Absent aggro state → `player = null` (the pre-jt8-1 behaviour, so bare scheduler runs are unchanged).
- `src/core/demo.ts` — `DemoSim` carries `targets`; `createWaveDemo` seeds it empty; `stepDemo` ticks the grace timers BEFORE the frame steps (ROM PLYCOL order) and `reconcileTargets` against the final live players (register fresh/respawned via STPLY, drop dead via the death-shift).
- `docs/rom-study/claims/target.json` (new) — 12 `JT81-*` claims covering all seven cited ranges.
- `tests/game.test.ts` — one jt4-1 assertion updated for the now-hunting enemies (see the `### Dev (implementation)` deviation).

**Tests:** 1610/1610 passing (GREEN); `tsc --noEmit` clean. The aggro state seats on `DemoSim.targets` exactly as TEA's wiring fixture required. The purity guard sweeps `target.ts` green.

**Verification (ran directly, plus an end-to-end probe):** in the REAL game (`createGame` + `stepGame`, seed 0x1a2b3c4d) a smart enemy flaps up toward an above-player **3 times, first at frame 92** — i.e. only AFTER the 90-frame `TARTIM` grace. The bug ("enemies just drift") is fixed; the grace works. Probe removed after use.

**Design Deviations:** 1 (minor) — the jt4-1 sibling-test assertion. See `### Dev (implementation)`.
**Delivery Findings:** 2 (non-blocking) — the 1-frame SELPLY reaction lag and the deferred exact-nearest-metric discriminating case.

**Handoff:** verify/review — the vertical seek is live; jt8-2 (horizontal homing) and jt8-3 (cliff look-ahead + shadow) build on this. Reviewer should independently full-diff `target.ts` against the vendored `SELPLY`/`STPLY`/`TARTM` source.
## Subagent Results

Round-2 verify panel (jt8-1). Toggles: preflight, test_analyzer, security, rule_checker ENABLED; edge_hunter, silent_failure_hunter, comment_analyzer, type_design, simplifier DISABLED via `workflow.reviewer_subagents` (their round-1 findings were all already resolved/accepted).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | GREEN 1617/1617, tsc clean, build ok, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — round-1 EDGE items closed by FIX5 |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 1 LOW | items 1/2/4 mutation-proven SOUND; 1 LOW on game.test:264 → confirmed non-blocking (recorded) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | purity 35/35; no ambient entropy; the numeric sort REMOVES order-dependence |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | 12 TS rules / 34 instances / 0 violations; TARTIM=90 byte-verified vs vendored JOUSTRV4.SRC:959-960 |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled)
**Total findings:** 0 confirmed blocking, 1 LOW non-blocking (recorded as a recommendation), 0 dismissed

## Reviewer Assessment

**Verdict:** APPROVED (round 2 — 2026-07-28). All six round-1 items closed (commit joust `1b206dc`) and independently re-verified by a round-2 subagent panel + live mutation-proofs on a reset-clean tree. No Critical/High. One LOW non-blocking test note ([TEST] game.test:264 — recorded as a Delivery Finding + deviation-audit caveat). Round-2 specialist tags: [TEST] [SEC] [RULE] [EDGE] [SIMPLE] — plus [TYPE] [SILENT] [DOC] whose subagents were disabled this round (their round-1 results stand). **Handoff:** To SM (Ruby Rhod) for finish-story.

### Round 2 — Verification of the six round-1 items

Tree reset-verified CLEAN at HEAD `1b206dc` after the subagents' live-mutation experiments (both `demo.ts` and a transient `game.ts` hardcode-P1 mutation cleared); my control run = 115/115 on the affected suites, full suite 1617/1617.

1. [TEST] **reconcileTargets integration** (`tests/target-integration.test.ts`) — VERIFIED. test-analyzer live-proved BOTH mutations bite: `if(false) registerPlayer` → the registration test RED; `if(false)` on the removeTarget drop-loop → the death-shift test RED. The Devil's-Advocate "silent death" gap is now committed coverage.
2. [TEST] **discriminating nearest** (`tests/target.test.ts`) — VERIFIED. seeker(100,100)/P1(104,190)/P2(240,97): min-of-axes picks P2 (3<4); Chebyshev & Euclidean pick P1 → the case genuinely discriminates the metric (min→max flips it RED). Exact SELPLY :4476-4514 decode tracked as successor **jt8-5**.
3. [TEST] **game.test:264 tighten** (`% 50 === 0`) — LOW, NON-BLOCKING. Net it-block coverage preserved: the unchanged kill-frame `toBe(0)` (:247-248) kills hardcode-P1 (live-confirmed). But because every DVALUE is a multiple of 50, this LINE alone can't catch a hypothetical late/second in-window attribution leak the old `< kill.value` incidentally could. No constructible mutation exploits it today. Recorded as a Delivery Finding (recommend keeping BOTH assertions); not a rejection — it is exactly what round 1 requested.
4. [RULE] **TARTIM=90 citation** — VERIFIED. rule-checker byte-matched JT81-013 verbatim + the two LAWS token-sets against vendored `JOUSTRV4.SRC:959-960`; the claim-coverage gate is green.
5. [EDGE][SEC] **reconcileTargets hardening** (`p.entity` liveness + stable id sort) — VERIFIED behaviour-preserving. security confirmed the numeric sort REMOVES order-dependence (strictly more deterministic), the liveness predicate now matches `frame.ts:322`, purity 35/35.
6. [TEST] **chained removeTarget** — VERIFIED. full-state `toEqual`, mutation-proven (breaking the grace-carry turns it RED).

### Round 2 — Devil's Advocate

The one thing that could bite a future edit is item 3: a test line that, in isolation, cannot catch an attribution leak because the entire score alphabet is multiples of 50. It does NOT bite today — no single-token mutation exploits it and the kill-frame assertion still guards the headline case — so it is genuinely non-blocking, not a shipping risk. But a future seed/input where an "idle" P1 also lands a real kill inside the trailing 60-frame window would exercise exactly that gap, and the cheap strictly-better close is to keep BOTH the `% 50` invariant and the `< kill.value` magnitude bound. I APPROVE rather than reject because (a) the delivered assertion is precisely what the round-1 review asked for, (b) two independent subagents plus my own control agree net coverage is intact, and (c) LOW/non-blocking does not warrant looping an otherwise-clean, mutation-proven story. Everything else — the headline reconcile integration, the discriminating metric, the byte-verified citation, the behaviour-preserving hardening — is exactly the "protected against the next edit" bar round 1 demanded, now met.

---

**Round 1 verdict (historical):** CHANGES REQUESTED. No Critical/High *correctness* bug — the code works (verified end-to-end: enemies hunt from frame ~92). But real round-1 gaps remained (a mutation-proven test hole + a guard/doc hardening set). Specialist tags: [TEST] [EDGE] [RULE] [SIMPLE] [DOC].

### Subagent Results (all 9 received)
| Specialist | Received | Result |
|---|---|---|
| preflight | Yes | GREEN 1610/1610, tsc clean, 0 smells |
| security | Yes | clean — purity 132/132, deterministic, bounded |
| edge-hunter | Yes | registerPlayer no-guard (dup id in both slots / 3rd-id evict); liveness mismatch; respawn 1-frame lag; P1<P2 order |
| silent-failure | Yes | 3 LOW latent (liveness predicate; optional-targets; registerPlayer overwrite) — all unreachable today |
| test-analyzer | Yes | 2 HIGH: reconcileTargets UNTESTED (mutation `if(false) registerPlayer` stays green); nearest test non-discriminating. +MED game.test slack, registerPlayer untested |
| comment-analyzer | Yes | citations ALL clean; nearest metric+tie likely wrong (X-override overflow guard; strict-less tie favours SECONDARY) |
| type-design | Yes | no correctness bug; PlayerView dup; optional-vs-required targets |
| simplifier | Yes | 2 non-blocking (redundant guard; PlayerView dup) |
| rule-checker | Yes | clean 13 rules + purity; MED: TARTIM=90 (959-960) not in story's CITED_RANGES |

### Confirmed findings
FIXED this round (committed 5a3c807):
- [EDGE] registerPlayer guard — dup-id → same id both slots; 3rd-id silent evict. Now idempotent + non-lossy.
- [DOC] coordDistance/nearer docstrings no longer overclaim the SELPLY metric; documented as directionally-correct approximation, exact decode (metric + secondary-favouring tie) deferred.

REMAINING (round-1 changes requested — Dev to complete in a fresh context):
1. [TEST-HIGH] Add a createWaveDemo/stepGame INTEGRATION test for reconcileTargets: register-both-players-with-TARTIM, death removes/shifts a slot, AND the reconcile registration-line mutation turns it RED. (The deleted _probe2 covered exactly this — resurrect as committed.)
2. [TEST-HIGH] Add a DISCRIMINATING nearest case (P1 nearer X, P2 nearer Y) pinning the chosen min-of-axes+primary-tie APPROXIMATION; file the exact SELPLY :4476-4514 decode (instruction-level/emulator) as a successor story.
3. [TEST-MED] Tighten game.test.ts:262 `toBeLessThan(kill!.value)` → `after.players[0].score % 50 === 0` (own-death credits are 50-multiples; ~450pts of slack today).
4. [RULE-MED] Add TARTIM=90 value citation (JOUSTRV4.SRC:959-960) to target-source.test.ts LAWS + CITED_RANGES + a JT81 claim.
5. [EDGE-LOW] reconcileTargets: mirror frame.ts's `p.entity` liveness check + register in stable id order; soften the respawn-timing docstring (1-frame lag).
6. [TEST-LOW] Add a chained removeTarget (sequential-death) test.

NON-BLOCKING (accepted as-is, rationale): PlayerView duplication (keeps target.ts a zero-import leaf; documented deliberate); optional `targets` shim (intentional back-compat for bare createState callers); redundant `tarpl2 !== null` guard (explicit form clearer); kill!/`e as Error`/JSON.parse casts (established repo-wide conventions).

### Devil's Advocate
The scariest thing here is not a crash but a SILENT death: test-analyzer proved a one-line mutation (`if (false) registerPlayer`) that makes enemies never hunt anyone in real gameplay leaves all 1610 tests green — the story's headline behaviour rides entirely on an integration path with zero committed coverage (my only proof was a probe I deleted). A confused successor (jt8-2) refactoring reconcileTargets would get no signal. Second: three independent analyses (mine, test-analyzer, comment-analyzer) all failed to decode SELPLY's nearest metric by hand, yet the original docstrings asserted it as fact and the tie-break may be backwards (ROM favours the secondary on an exact tie) — a fidelity repo shipping a confidently-wrong "faithful" claim is worse than an honest approximation, now corrected. A stressed 2P endgame (both knights eliminated, rapid respawns) exercises the death-shift + respawn-lag paths that no test touches; edge-hunter hand-verified they self-heal, but "hand-verified" is exactly what the mutation tests exist to replace. None of these is a shipping-blocker for correctness, but all six remaining items are the difference between "works on my seed" and "protected against the next edit."

### Dev Round-1 Resolution (Korben — 2026-07-28, commit joust 1b206dc / orch 733a3cc)

All six REMAINING items closed. Full joust suite **1617 passed** (was 1610; +7), `tsc --noEmit` clean. The two HIGH items were mutation-proven LIVE (apply → RED → revert → GREEN control):

1. [TEST-HIGH] **reconcileTargets integration** — `tests/target-integration.test.ts` (new) drives the REAL `createWaveDemo → stepDemo`: a fresh wave registers BOTH knights with the full TARTIM grace, and a knight leaving the process list shifts the survivor into the primary slot (grace carried). **Mutation-proven:** `if (false) t = registerPlayer(...)` in reconcileTargets → both tests RED. The Devil's-Advocate silent-death is now covered by committed tests.
2. [TEST-HIGH] **discriminating nearest** — `tests/target.test.ts` adds a P1-nearer-X / P2-nearer-Y case pinning the shipped min-of-axes + primary-tie APPROXIMATION. **Mutation-proven:** `coordDistance` min→max (Chebyshev) flips the pick → RED. The exact `SELPLY :4476-4514` instruction-level decode is filed as **successor jt8-5** (orch epic-jt8.yaml, backlog) — honest approximation kept, no hand-guess.
3. [TEST-MED] `tests/game.test.ts:262` tightened `< kill.value` → `score % 50 === 0` (P1's only legit score is its own 50-for-dying credits; kill-frame `toBe(0)` still kills hardcode-P1).
4. [RULE-MED] **TARTIM=90 cited** — `JOUSTRV4.SRC:959-960` added to `target-source.test.ts` LAWS (byte-gate ran GREEN, source verified) + CITED_RANGES + claim **JT81-013** (target.json).
5. [EDGE-LOW] `reconcileTargets` now mirrors frame.ts's `p.entity` liveness, registers in stable id order (sort), and the docstring notes the respawn 1-frame lag.
6. [TEST-LOW] chained `removeTarget` (sequential-death) test added to `target.test.ts`.

No production logic changed except the reconcileTargets hardening (liveness predicate + deterministic register order — behaviour-preserving for the 2P game). **Handoff:** review round-2 (verify closure) → `/pf-sm` to finish. The exact SELPLY metric remains an honest, test-pinned approximation tracked by jt8-5.