---
story_id: "jt4-2"
jira_key: "jt4-2"
epic: "jt4"
workflow: "tdd"
---
# Story jt4-2: Extra men — NSHIP starting lives, the REPLAY x16 threshold re-armed per award, the 50-for-dying credit

## Story Details
- **ID:** jt4-2
- **Jira Key:** jt4-2
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-26T12:03:08Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-26T11:09:43Z | 2026-07-26T11:12:03Z | 2m 20s |
| red | 2026-07-26T11:12:03Z | 2026-07-26T11:36:51Z | 24m 48s |
| green | 2026-07-26T11:36:51Z | 2026-07-26T11:47:07Z | 10m 16s |
| review | 2026-07-26T11:47:07Z | 2026-07-26T12:03:08Z | 16m 1s |
| finish | 2026-07-26T12:03:08Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Improvement** (non-blocking): The SCRLEV extra-man award carries a >300,000 BCD-overflow re-offset (the `CMPA #$30` magic + `ADDA #$A0-$20` "SUBTRACT BCD 20", JOUSTRV4.SRC:7395-7403) that jt4-2 does NOT model — the port awards linearly at every 20,000 with no high-score wrap. Affects `src/core/game.ts` (the award loop; the offset only matters at scores ≥ ~300,000, unreachable in normal play — port it only if deep-score fidelity is ever wanted). *Found by TEA during test design.*
- **Gap** (non-blocking): The sim emits no player-death event — `demo.ts` `collisionPass` SILENTLY removes a dead player process (no event, no respawn; players spawn once in `createWaveDemo`). jt4-2 books deaths via a frame-over-frame process-set diff in `stepGame`, but jt4-4 (GOVER / both-players-out) and any respawn story will need the same seam or an explicit death `DemoEvent`. Affects `src/core/demo.ts` (`DemoEvent` has no death variant) and `src/core/game.ts` (the stepGame death-diff). *Found by TEA during test design.*

### Dev (implementation)
- **Confirmed** (non-blocking): implemented TEA's process-set-diff death seam as specced — `stepGame` books a death for any player id in the previous sim frame absent from the stepped sim; `bookDeath` routes the 50 through `awardExtraMen` too, so the ROM's SCRLEV "runs on every score change" invariant holds even for a death that tips a player over a REPLAY level. TEA's two findings (SCRLEV >300k overflow, no death `DemoEvent`) stand unchanged — no new upstream findings. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): two mutation-confirmed test-coverage gaps on load-bearing behaviour — (1) `bookDeath`'s `awardExtraMen` re-check (a death whose +50 crosses `extraManAt`) has no test; removing the wrapper leaves all tests green. (2) `stepGame`'s death loop is never exercised with TWO players dying in one frame; booking only the first leaves all tests green. Both behaviours are CORRECT (verified) but unguarded. Affects `joust/tests/game-extra.test.ts` (add a near-threshold death test + a same-frame double-death integration test). **Best closed in jt4-4**, which already owns the death / lives / GOVER path. *Found by Reviewer during code review.*
- **Note** (non-blocking, Low): `loadClaims()` types `JSON.parse(...) as Claim | Claim[]` with no runtime schema (lang-review #10). Not introduced here — reproduces a pre-existing convention in 14 sibling `*-source.test.ts` files, reads a trusted committed fixture, and is cross-checked by the id-format assertions + `tools/audit/check-citations.mjs` (804/804 green). If claim-loading is ever hardened, do it fleet-wide. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **AC-4 two-threshold determinism proven by a scripted credit sequence, not natural sim accrual**
  - Spec source: context-story-jt4-2.md, AC-4
  - Spec text: "Determinism: a seeded run crossing two extra-man thresholds replays bit-for-bit"
  - Implementation: the two-threshold determinism test scripts a fixed deterministic credit sequence (15k → 10k → 20k) over `createGame`'s real ledgers rather than accruing 40,000 through the sim; a SEPARATE test proves a real seeded `stepGame` run (through the frame-49 mount death) replays bit-for-bit.
  - Rationale: natural play accrues ~500–1500 per kill, so reaching 40,000 in a unit-test window is impractical and fragile; the scripted credits exercise the identical `creditScoreEvents` award/re-arm path deterministically, and the real-sim replay test covers sim + drain + death determinism. Both are non-vacuous (two awards actually fire; a life is actually spent).
  - Severity: minor
  - Forward impact: none

### Dev (implementation)
- **Updated one jt4-1 test assertion for jt4-2's new death-credit behaviour** (flag for Reviewer)
  - Spec source: `tests/game.test.ts` (jt4-1, already merged), "AC-3 integration — a P1 kill credits ONLY ledger 0 (the mirror)"
  - Spec text: `expect(game.players[1].score, 'P2 (ledger 1) is independent — untouched by P1s kill').toBe(0)`
  - Implementation: changed that one assertion to `.toBe(50)`. Under this test's input `{1:flap(1),2:flap(-1)}` P2 also LOSES a joust (~frame 99); jt4-1 removed the dead player silently (P2 stayed 0), but jt4-2's `stepGame` death-diff now books P2 its OWN 50-for-dying credit. Nothing else in the test changed.
  - Rationale: the death credit legitimately accrues into the shared per-player register (the story's own AC-3), so the `=== 0` assertion pinned the now-superseded silent-removal behaviour. The test's real intent — P1's 500-point kill credits ledger 0 and never ledger 1 — is preserved and arguably strengthened: ledger 1 reads its own death 50, provably NOT P1's 500. No production behaviour was weakened; only a stale test expectation was corrected.
  - Severity: minor
  - Forward impact: none — jt4-1's other tests + the full 1435-test suite stay green; `tsc` + `vite build` clean.

### Reviewer (audit)
- **TEA's scripted-credits deviation (AC-4):** accurate and justified — reaching 40,000 through natural sim accrual in a bounded window is impractical; the scripted `creditScoreEvents` path is the same code, and a separate real-sim replay test covers the sim/drain/death axis. No masking. Accepted. Severity: L.
- **Dev's jt4-1 test-assertion change (`0 → 50`):** audited independently and by two subagents (preflight + test-analyzer). It is a legitimate stale-expectation fix, NOT a masked regression — under `{1:flap(1),2:flap(-1)}` P2 loses a joust ~frame 99 and books its OWN 50-for-dying credit; the new `=== 50` still catches any P1→P2 leak (`550 ≠ 50`) and additionally pins P2's death credit, so the mirror is *strengthened*, not weakened. Removing the death-booking makes this exact assertion fail (mutation-confirmed). Accepted. Severity: L.

## Sm Assessment

Story jt4-2 set up and routed to TEA (Leeloo) for the red phase.

**Scope:** Extra men — three mechanics from the Joust ROM's life/award ledger:
1. **NSHIP starting lives** — the initial credit of men at game start.
2. **REPLAY x16 threshold, re-armed per award** — the extra-man bonus fires at the REPLAY score interval and re-arms for the *next* multiple after each award (not a one-shot).
3. **The 50-for-dying credit** — the score adjustment applied on death.

**Foundation:** Builds directly on jt4-1 (BCD scoring core), just merged to joust/develop (`d370f8d`). The scoring/BCD primitives jt4-2 keys off of already exist — this story adds the lives ledger + extra-man threshold on top of that score.

**Repo/branch:** joust · `feat/jt4-2-extra-men` off `develop`. Local tracking only (no Jira). TDD/phased.

**For TEA:** Acceptance criteria are in `sprint/context/context-story-jt4-2.md`. Pin the three mechanics as failing core-sim tests before Dev implements — especially the *re-arm* behaviour of the REPLAY threshold (a one-shot vs. per-award-rearm mistake would pass a naive "award at 16k" test). Keep it in `src/core` (deterministic sim); the extra-man award is a sim-state transition, not a shell concern. Cite the ROM constant (NSHIP / REPLAY) source in the red tests per the jt4 fidelity convention.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 2pt TDD sim story — three ROM mechanics, each needs a cited failing core test.

**Test Files:**
- `joust/tests/game-extra.test.ts` — the BEHAVIOUR suite (NSHIP seed, the REPLAY award + re-arm, `bookDeath` + the 50-for-dying, a real frame-49 mount death through `stepGame`, determinism).
- `joust/tests/game-extra-source.test.ts` — the independent SOURCE re-derivation (NSHIP/REPLAY/50 out of the vendored 1982 tree with the `joust-source` reader) + JT42-* claim coverage.
- `joust/tests/helpers/game-contract.ts` — extended the TEA-authored contract: optional `extraManAt` ledger field, `bookDeath`, and `loadGameExtra()` (self-describing RED until Dev ships).

**Tests Written:** 27 tests (17 behaviour + 10 source) across 4 ACs. Of these, **21 are RED** for the right reason (`loadGameExtra` throws "jt4-2 not built" + the JT42 claim file is absent); the **6 green** are pure-source anchors that verify my citations against the vendored tree (NMEN `$05`, REPLAY `$20`/`@20,000`, the four `ASLB/ROLA` ×16, "SCORE 50 POINTS FOR DYING").
**Status:** RED (failing — ready for Dev). Verified directly: full joust suite `21 failed | 1414 passed`; only the two jt4-2 files are red; `tsc --noEmit` clean.

**Verified ROM citations (independent reader, all green):**
- NSHIP = 5 — `TB12REV3.SRC:135` `FCB $05 NMEN` / `EQU.SRC:111` `NSHIP … # OF SHIPS`.
- REPLAY → 20,000 — `TB12REV3.SRC:134` `FCB $20  REPLAY @20,000`, justified ×16 (four `ASLB`/`ROLA`, `JOUSTRV4.SRC:918-925`) into `LEVPAS`/`SPLY1+8`/`SPLY2+8`; BCD 20 × 1000 = 20,000. Re-arm: `SCRLEV` `JOUSTRV4.SRC:7385` "PAST LEVEL FOR EXTRA MAN?" → `:7405` `JSR INCLIV` → `:7411` `BRA SCRLEV` "RE-CHECK FOR LEVEL PASS (LOW LEVELS)".
- 50-for-dying — `JOUSTRV4.SRC:4730-4732` `LDA #$50 / JSR SCRTEN`; `decodeDvalue('SCRTEN',0x50)=50` (the jt4-1 backwards caveat — SCRHUN would be 5000).

**Key mutation kills for Dev to satisfy (not just pass):**
- The re-arm is per-award: two separate awards (20k→40k) AND one 45,000 jump awarding TWO men (the ROM's `BRA SCRLEV` re-check) — a one-shot / award-once-per-call impl fails both.
- The threshold is exactly 20,000: 19,999 awards nothing, the next point does (kills a 16k/10k mutant).
- The death credit flows through SCRTEN ($50 → 50), not a fresh `+50` literal read forwards (5000).
- Death detection is a **process-set diff** in `stepGame` (the sim removes the player silently — no event, no respawn), booked EXACTLY once (no per-frame re-book).

### Rule Coverage

| Rule (TS lang-review) | Test(s) | Status |
|------|---------|--------|
| #4 `??` (not `\|\|`) for the optional threshold default | `an absent extraManAt defaults to the 20,000 threshold` | failing |
| #2 `readonly` array params / no-mutation purity | `does not mutate its argument ledgers (pure)` (creditScoreEvents + bookDeath) | failing |
| #1 type-safety escapes avoided | no `as any` / `@ts-ignore`; the one `!` on `parseStatement` is guarded (`fcbByte`) | n/a (clean) |
| #8 meaningful assertions, no vacuous | self-check below | n/a |
| core/shell purity sweep of `game.ts` | inherited from jt4-1 AC-1 (`game.ts lives in src/core`) | green (jt4-1) |
| determinism (SOUL: seeded bit-for-bit) | AC-4 real-sim replay + scripted two-threshold replay | failing |

**Rules checked:** the applicable TS checks (type-safety escapes, `??`-default #4, readonly-purity #2, test-quality #8) plus the project determinism/purity rules have jt4-2 coverage; `game.ts`'s purity sweep is inherited green from jt4-1 (no new core module).
**Self-check:** 0 vacuous tests — every test asserts a concrete expected value with a message; the determinism/integration guards are proven non-vacuous (a real death spends a life; two awards actually fire; a real kill/death is in the seeded window).

**Handoff:** To Dev (Korben) for GREEN — implement in `joust/src/core/game.ts` and commit `docs/rom-study/claims/game-extra.json` (JT42-*).
## Dev Assessment

**Status:** GREEN — all tests pass, `tsc --noEmit` + `vite build` clean.
**Verification:** full joust suite **1435 passed / 0 failed** (54 files); jt4-2 files 27/27 green; production build exits 0.

**Implemented (`src/core/game.ts`):**
- `createGame` seeds each ledger `lives = NSHIP (5)` and `extraManAt = REPLAY_INTERVAL (20,000)`; added the optional `extraManAt` ledger field.
- `awardExtraMen` (folded into `creditScoreEvents`): a `while (score >= extraManAt) { lives++; extraManAt += 20,000 }` loop — awards a man at each REPLAY multiple, re-armed per award; one big jump awards several (the ROM `BRA SCRLEV` re-check). Absent `extraManAt` defaults to 20,000 (jt4-1 ledgers).
- `bookDeath(players, player)`: dying player `lives - 1` + credit `decodeDvalue('SCRTEN', $50) = 50` (the SCRTEN caveat is structural — not a fresh literal), then re-checks the threshold; only that ledger moves.
- `stepGame` books deaths off a **process-set diff** (`livePlayerIds(game.sim)` minus `livePlayerIds(sim)`) — the sim removes a dead player silently, no event, no respawn.

**Claims:** `docs/rom-study/claims/game-extra.json` — JT42-001..007, full-line verbatims that pass BOTH the source byte-gate and the global `tools/audit/check-citations.mjs` audit (which does exact `trimEnd()` match, not `toContain` — first attempt failed on substring verbatims; corrected to full lines).

**⚠ FLAG FOR REVIEWER (logged as a Dev deviation):** one **merged jt4-1 test** assertion was changed — `tests/game.test.ts` "P1 kill credits ONLY ledger 0" now expects `players[1].score === 50` (was `=== 0`). Under `{1:flap(1),2:flap(-1)}` P2 loses a joust ~frame 99 and now books its OWN 50-for-dying credit (jt4-1 removed it silently). The test's intent — P1's 500 credits ledger 0, never ledger 1 — is preserved (ledger 1 reads its death 50, provably not P1's 500). No production behaviour weakened. Please confirm this is a correct stale-expectation fix, not a masked regression.

**Files changed:** `src/core/game.ts`, `docs/rom-study/claims/game-extra.json`, `tests/game.test.ts` (jt4-1 assertion). Commit `487c7d4`; branch `feat/jt4-2-extra-men` pushed to origin.

**Handoff:** To Reviewer (Zorg) for adversarial review.
## Subagent Results

**All received: Yes** (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`).

| # | Subagent | Received | Findings | Decision |
|---|----------|----------|----------|----------|
| 1 | reviewer-preflight | Yes | 0 (GREEN: 1435/0/0, tsc+build 0, 0 smells, 7 claims byte-verified, source suite ran 10/10) | Confirmed clean |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A — Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A — Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | 2 (F1 bookDeath award re-check untested; F2 same-frame double-death untested) | Both CONFIRMED, Medium (see below) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A — Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A — Disabled via settings |
| 7 | reviewer-security | Yes | 0 (clean; negative-lives floor correctly deferred to jt4-4) | Confirmed clean |
| 8 | reviewer-simplifier | Skipped | disabled | N/A — Disabled via settings |
| 9 | reviewer-rule-checker | Yes | 1 (F3 JSON.parse `as Claim` — lang-review #10) | CONFIRMED, downgraded to Low (not dismissed) |

### Finding decisions
- **F1 — bookDeath `awardExtraMen` re-check untested** (test-analyzer, mutation-confirmed): CONFIRMED, **Medium**. Behaviour is correct (a death whose +50 crosses `extraManAt` awards a man back — ROM-faithful, SCRLEV runs on every score change) but unguarded. Non-blocking. → Delivery Finding; close in jt4-4.
- **F2 — same-frame double-death loop untested** (test-analyzer, mutation-confirmed): CONFIRMED, **Medium**. `stepGame`'s `for…of` books every dead id, but no test drives two players dying in one frame. Correct-but-unguarded. Non-blocking. → Delivery Finding; close in jt4-4.
- **F3 — `JSON.parse(...) as Claim`** (rule-checker, lang-review #10): CONFIRMED as a literal rule match, **downgraded to Low** with rationale (NOT dismissed): not introduced by this diff, reproduces a pre-existing convention across 14 sibling test files, reads a trusted committed fixture, and is cross-checked by id-format assertions + the citation audit. → Delivery Finding (fleet-wide, not a jt4-2 blocker).

## Rule Compliance

Mapped to the TypeScript lang-review checklist (13 checks) + 4 joust-project rules; verified by the rule-checker (17 categories, 58 instances) and independently by me.

| Rule | Verdict | Evidence |
|------|---------|----------|
| #1 type-safety escapes | PASS | No `as any`/`@ts-ignore`; the one `!` (`fcbByte`) is guarded by a prior `expect(st).not.toBeNull()`. |
| #2 generics/readonly | PASS | `bookDeath`/`creditScoreEvents` keep `readonly` params; `awardExtraMen`/`livePlayerIds` single-object pure-transform (repo convention, spread-only). |
| #4 `??` not `\|\|` | PASS | `ledger.extraManAt ?? REPLAY_INTERVAL` — correct (a legit 0 is preserved; `\|\|` would be a bug). |
| #5 module/`.js`/`import type` | PASS | `.js` extensions present; type-only imports marked. |
| #8 test quality | PASS (2 gaps) | No `as any`/vacuous assertions; source suite independent of generation path. Coverage gaps = F1/F2 (Medium). |
| #10 input validation | Low note | F3 — `JSON.parse as Claim` (trusted fixture, cross-checked). |
| #12 performance | PASS | Per-frame death-diff is O(processes) (tens); award `while` terminates; no hot-path `JSON.stringify`. |
| CORE/SHELL purity | PASS | No clock/random/browser/shell in `game.ts`; `purity.test.ts` green on the file. |
| Determinism | PASS | Both AC-4 replay tests green; Set iteration is insertion-order (deterministic); multi-death booking is order-independent. |
| Citation double-entry | PASS | Nothing under `src/` imports `joust-source`; `check-citations.mjs` 804/804 (incl. JT42-001..007). |
| Purity of new fns | PASS | `creditScoreEvents`/`bookDeath`/`awardExtraMen` spread-only, no arg mutation (purity tests green). |

## Devil's Advocate

I tried to break this. Attack surface, in order of promise:

1. **False death-booking.** `stepGame` books a death for ANY player id that leaves `sim.processes`. If the sim removed a player for a NON-death reason, it would fabricate a life-loss + 50. I traced every per-frame removal path: `collisionPass` (`demo.ts:662` joust loss, `:705` ptero loss) — both genuine deaths — and the `kill()`/KLPROC id-mask remover (`frame.ts:180`), which I confirmed has **zero callers** anywhere in `src/` (the `kill` grep hits are all the `kind:'kill'` outcome variant, not the function). No respawn re-adds players. So every player disappearance IS a mount death. No false positive.

2. **The changed jt4-1 assertion masks a leak.** If Dev's death-diff mis-credited P1's 500 kill to P2, the OLD `=== 0` would catch it and the NEW `=== 50` would ALSO catch it (`500`/`550 ≠ 50`). Both preflight and test-analyzer mutation-confirmed the `=== 50` is load-bearing on the death feature. The change is strictly stricter. No masking.

3. **Runaway award loop.** `while (score >= extraManAt) extraManAt += 20_000` — could a crafted score hang it? `score` is a finite integer sourced only from ROM-derived kill/egg/ptero/death constants (never external input); `extraManAt` increases monotonically. Terminates in ≤ score/20000 iterations. No DoS.

4. **Negative / underflowing lives.** `bookDeath` does `lives - 1` with no floor. Could a player go to −1? In jt4-2 a player dies at most once (no respawn), so lives ≥ 4. Unreachable now; correctly deferred to jt4-4 (GOVER). A future respawn story MUST add the floor — captured as a finding lineage (security + TEA both noted it).

5. **`extraManAt` optionality.** It's optional to preserve jt4-1 ledger literals. Could a live ledger lose it and re-award at 20k? In the live flow `createGame` seeds it and every transform spreads/returns it, so it always persists; only externally-built test ledgers omit it (→ default 20k, un-awarded). Low risk; the "bare ledger defaults to 20k" test pins the fallback.

6. **Confused/stressed inputs.** No user input, no filesystem in the sim path, no config. The claims JSON is inert committed data verified byte-for-byte. Nothing to confuse.

The two things the devil's advocate DID surface — the death-credit-crosses-threshold path and the same-frame double-death path — are exactly F1 and F2: correct behaviour, no guard. Medium, non-blocking, routed to jt4-4.

## Reviewer Assessment

**Verdict:** APPROVED

**Rationale:** No Critical or High findings. The implementation is verified correct end-to-end: NSHIP seed, the REPLAY award with per-award re-arm (incl. the multi-level `BRA SCRLEV` re-check), the SCRTEN-decoded 50-for-dying, and the silent-process-removal death seam — all confirmed by independent reading, four subagents, and mutation testing. Every key guard is mutation-pinned; core purity, determinism, citation double-entry (804/804), and function purity all green; `tsc`, `vite build`, and the full 1435-test suite pass. The two Medium findings (F1, F2) are test-coverage gaps on correct-but-unguarded edge behaviour, and the one Low finding (F3) reproduces a pre-existing repo convention — none block the PR. All three are recorded as Delivery Findings; F1/F2 are best closed in jt4-4, which owns the death/lives/GOVER path.

**[TEST]** F1/F2 — two Medium mutation-confirmed coverage gaps (death-credit crossing threshold; same-frame double death), non-blocking, routed to jt4-4.
**[RULE]** F3 — Low, pre-existing `JSON.parse as Claim` convention; fleet-wide if ever hardened.
**[SEC]** Clean — no vulnerabilities; negative-lives floor deferred to jt4-4.

**Handoff:** To SM (Ruby Rhod) for the finish ceremony — merge PR to `develop`, archive, mark done.