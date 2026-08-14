---
story_id: "ml5-5"
jira_key: "ml5-5"
epic: "ml5"
workflow: "tdd"
---
# Story ml5-5: COUNT3 new-head speed ramp + the 10k-boundary SCORE2 carry

## Story Details
- **ID:** ml5-5
- **Jira Key:** ml5-5
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/ml5-5-count3-speed-ramp-10k-score2-carry
- **PR:** #382 (code → develop)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-14T18:38:00Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-14T18:10:06+00:00 | 2026-08-14T18:12:40Z | 2m 34s |
| red | 2026-08-14T18:12:40Z | 2026-08-14T18:24:55Z | 12m 15s |
| green | 2026-08-14T18:24:55Z | 2026-08-14T18:26:39Z | 1m 44s |
| review | 2026-08-14T18:26:39Z | 2026-08-14T18:38:00Z | 11m 21s |
| finish | 2026-08-14T18:38:00Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA/red] Conflict, non-blocking — RADIX misread in the story & context: the EASY floor is 0x31 = 49, not decimal 31.** The story title ("EASY floors at 31 (3/8s)") and `context-story-ml5-5.md` AC4 ("floor = 31") read the ROM literal `CMP I,31` (MLSUB.MAC:1066) as decimal. But `MLSUB.MAC:3 .INCLUD MLDEF` and `MLDEF.MAC:2 .RADIX 16` (no override in MLSUB), so the bare `31` (no trailing period) is **hex 0x31 = 49 decimal**. Corroborated by the existing codebase: `millipede.ts:103 COUNT3_FLOOR = 0x60` reads this same file's sibling `CMP I,60` (:809) as hex. The failing tests pin the ROM value 49 (decrement iff COUNT3 ≥ 0x31), with the decisive discriminator `EASY, COUNT3=40 → held at 40` (40 < 49) — a decimal-31 implementation gets this wrong (40 ≥ 31 → 38). **Dev must implement against 0x31, not 31.** The context's AC3 (50→48) and AC4 (30→held) examples still hold by luck; only values in [31,49) expose the misread. SM should note the context/epic still assert "31 decimal".
- **[TEA/red] Gap, non-blocking — AC5 (SCORE2 carry) requires NO new code.** score.ts models the score as a plain integer with SCORE2 DERIVED (`score2Of`), so the ROM's `:1070-1074 ADC I,1 → SCORE2` is automatic on any 10k crossing. The two AC5 tests pass GREEN today against existing `awardScore`/`score2Of`; they are regression guards, not RED. The sole new deliverable is `rampCount3` (the COUNT3 ramp). Confirmed by score.ts:8-10's own comment.

### Reviewer (code review)

- **Improvement, non-blocking — citation sweep (2 stale comments; [RULE]-corroborated).** (1) `score.ts:9` header cites `(:1061-1074)` for "increment SCORE2 on a 10K carry is automatic" — but only `:1070-1074` is the SCORE2 bump; `:1061-1069` is the COUNT3 ramp this PR now implements as `rampCount3`. The *claim* stays true (SCORE2 carry is automatic) but the span over-includes new code — narrow to `:1070-1074` (e.g. add "(the :1061-1069 COUNT3 ramp is rampCount3, below)"). (2) `scoring.test.ts:26-27` still calls the COUNT3 ramp `(:1062-1069)` and the bonus tail "cited-forward, not implemented here" — both have since shipped (`awardBonus` ml5-2, `rampCount3` ml5-5); update to say they landed later, awardScore here is still the pure accumulator. NOTE: #2 is pre-existing-class debt — ml5-2 shipping awardBonus already made half of it false and did not sweep it, so this is not a regression this PR introduced. Low severity, does not block; captured for a citation touch-up.
- **Gap, non-blocking — `rampCount3` ships as an UNWIRED pure reducer.** No sim call site yet: the sim awards score inline (`sim.ts:115/119/130/154` `score += …`), `awardScore` (ml5-1) is itself unwired, the spawn-timer consumer `newHead` (millipede.ts) has no `sim.ts` caller, and there is no `count3` field in the GameState. So there is no wiring point today and this matches the established reducer-by-reducer pattern — correctly out of this 2pt reducer story's ACs. FOLLOW-UP: when the new-head spawn timer is wired into the live sim, the caller must invoke `rampCount3` at the SAME award site as `awardScore`/`awardBonus` (identical `{score, points, attract}`) so no path updates score without feeding the ramp, and reconcile it with `millipede.ts`'s per-spawn COUNT3 ramp.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

## Sm Assessment

Setup complete for ml5-5 (2pt, p3, millipede, tdd/phased). Sibling probes clean at setup: no `ml5-5` branch on origin, no sibling session claims it (a-1=ml8-1, a-3=jt11-12). Claim now pushed — branch `feat/ml5-5-count3-speed-ramp-10k-score2-carry` (commit `42937ec0`, context + `in_progress` stamp) so the sibling probe lights up.

Premise verified against the tree and the quarry — no stale claim to bust. `score.ts:44-45` itself flags this ramp as "still deferred", which corroborates the story; ml5-1 then ml5-2 both routed the finding forward. I read the ROM anchor myself: `reference/original-source/millipede/MLSUB.MAC:1049-1080`. The SCORNG block at :1061-1075 is exactly as titled — on a 10K carry-out of SCORE1, `LDA OPTNS1/LSR/BCS` gates HARD (`SBC I,2`, no floor) vs EASY (`CMP I,31/BCC` floor at 31 = 3/8s, else `SBC I,2`), then both paths `ADC I,1` into SCORE2. Citations in the context are copied from those verified lines, not fabricated.

The one real trap, banner'd prominently in the context (lines 63-80, 123): a DIFFERENT COUNT3 ramp already lives in `millipede.ts:331-350` — the spawn-timer ramp (`COUNT3_FLOOR=0x60`/`COUNT3_STEP=0x08`, MT-31/32 at :809/811). Same register name, unrelated mechanism. TEA/Dev must extend `score.ts` (pure core — purity/core-boundary test scans it) and must NOT touch or conflate the spawn-timer ramp.

ACs were `null` in the epic; sm-setup derived seven from the verified facts (10K-boundary gate, HARD −2, EASY decrement, EASY floor-at-31, SCORE2 +1 carry, purity, and resolving the score.ts:44-45 deferral note). Verified on disk: one Phase pointer, disambiguation present, anchor accurate.

Handing to Leeloo (TEA) for RED. → tea / red.
## Tea Assessment

RED complete for ml5-5. Wrote `plugins/millipede/tests/count3-ramp.test.ts` (24 tests) pinning the SCORNG 10k tail (MLSUB.MAC:1061-1075). Verified state: **22 failing / 2 passing**, `npm run lint` clean (commit `e4683e79`).

**The one thing Dev must not miss — the RADIX.** The EASY floor comparator is `0x31 = 49 decimal`, NOT decimal 31 (see the blocking-shaped but non-blocking Delivery Finding above). Implement `rampCount3` against 0x31. The decisive test is `EASY, COUNT3=40 → 40 (held)`; a decimal-31 impl decrements it to 38 and fails.

**Contract handed to Dev (GREEN) — extend `plugins/millipede/src/core/score.ts`:**
```
export interface Count3RampInput { count3; score; points; attract; optns1 }  // all readonly
export function rampCount3(input: Readonly<Count3RampInput>): number  // new COUNT3
```
Semantics (MLSUB.MAC:1061-1069): fire only when `floor((score+points)/10000) !== floor(score/10000)` (the SCORE1 carry-out, :1061) AND `!attract` (:1050). HARD = `(optns1 & 1) !== 0` (LSR bit0 → carry, :1063): `count3 - 2` with 8-bit wrap, no floor. EASY: `count3 - 2` iff `count3 >= 0x31`, else held (:1066-1067). No crossing / attract → return `count3` unchanged. Pure, no clock/DOM. Then resolve the score.ts:44-45 "still deferred" note (AC7).

**AC5 needs no code** — SCORE2's carry is automatic in the integer model (2 green guard tests already prove it). AC6 purity is covered by the existing `tests/purity.test.ts` core scan plus my determinism/no-mutation tests.

**Do NOT touch the spawn-timer COUNT3 ramp** in `millipede.ts:331-350` (COUNT3_FLOOR=0x60/COUNT3_STEP=0x08) — different mechanism, out of scope (disambiguation banner in context lines 63-80).

### Rule Coverage (lang-review typescript.md)
- **#4 (falsy `0` via `||` vs `??`):** `zero points never crosses (9,999+0) → unchanged` and `HARD COUNT3=0 → 254` guard a `points || fallback` / `count3 || …` mishandling of legitimate zeros.
- **#14 (derived edge/transition computed where all paths are visible):** the 10k crossing is a `floor(before) !== floor(after)` transition; pinned in both directions — crossing (9,950+100, 9,900+100 landing exactly on 10,000, 69,700+900), non-crossing (10,050+100 in-band, 9,800+100 just-under), so a boundary computed in one branch can't silently miss a case.
- **#8 (test quality / vacuous assertions):** Phase-C self-check caught my own vacuous AC7 test — a `/still\s+deferred/` regex passed vacuously because the phrase wraps across a `\n * ` comment prefix. Fixed to collapse `[*\s]+` first, re-ran, confirmed it now goes RED. Every test asserts an exact value with a labeled message; no `let _ =`, no `assert(true)`, no always-None checks.

Handing to Korben Dallas (Dev) for GREEN. → dev / green.
## Dev Assessment

GREEN complete for ml5-5 (commit `14b5198d`). Implemented `rampCount3` in `plugins/millipede/src/core/score.ts` exactly to TEA's contract, and resolved the score.ts:44-45 deferral note (AC7). Results: **millipede 1103/1103 green** (67 files, purity/core-boundary intact), `npm run lint` clean.

Implementation (minimal, ROM-cited):
- Attract → return count3 unchanged (:1050).
- Boundary gate `floor((score+points)/10000) !== floor(score/10000)` (:1061 carry-out of SCORE1); no crossing → unchanged.
- `hard = (optns1 & 0x01) !== 0` (LSR bit0 → carry, :1062-1063).
- EASY holds when `count3 < 0x31`; else (and always on HARD) `(count3 - 0x02) & 0xff` (:1066-1068). Used the **0x31 = 49** ROM value per TEA's radix finding, not decimal 31 — the `EASY COUNT3=40 → held` discriminator passes.
- SCORE2 +1 needed no code (derived `score2Of`); AC5's 2 green guards confirm it.

No scope creep: did not touch the spawn-timer COUNT3 ramp (millipede.ts:331-350), no new abstractions, no error handling beyond the ROM's own branches.

Handing to the Thought Police / Zorg (Reviewer). → reviewer / review.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (all green) | confirmed 0, dismissed 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings (hand-covered) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings (hand-covered) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings (hand-covered) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings (hand-covered) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings (hand-covered) |
| 7 | reviewer-security | Yes | clean | none | confirmed 0, dismissed 0 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings (hand-covered) |
| 9 | reviewer-rule-checker | Yes | findings | 2 (both Low, #17 + #24 citation staleness) | confirmed 2, dismissed 0 |

**All received:** Yes (3 enabled returned; 6 disabled pre-filled per settings)
**Total findings:** 2 confirmed (both Low, non-blocking citation staleness), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

No Critical or High issues. Logic, ROM transcription, purity, tests, and security are clean and independently verified; the only findings are two Low citation-staleness comments, captured as a non-blocking Delivery Finding (a citation touch-up), not a merge blocker. Per the severity rule, only Critical/High block — and one of the two (scoring.test.ts) is pre-existing-class debt that ml5-2 already left, so rejecting ml5-5 for it would be inconsistent.

**Data flow traced:** `{score, points, attract, optns1, count3}` (internal sim scoring state) → `rampCount3` arithmetic → new COUNT3 byte. Safe: pure integer/bitwise math, no external/untrusted input, no I/O. Attract and no-crossing both return `count3` unchanged.

**Observations (subagents + my hand-review of the 6 disabled dimensions):**
- [VERIFIED] EASY floor = `0x31` (49 dec), not decimal 31 — evidence: `MLSUB.MAC:1066 CMP I,31` under `.RADIX 16` (MLDEF.MAC:2), corroborated by `millipede.ts:103` reading sibling `CMP I,60` as `0x60`. The decisive test `EASY COUNT3=40 → held` (score.ts:85, test:191) reddens a decimal-31 impl. [RULE] confirmed.
- [VERIFIED] SBC borrow-in is always clear when the decrement runs — evidence: EASY reaches `SBC` only via `CMP I,31` with A≥0x31 (carry set); HARD reaches it via `LSR`→BCS (carry set). So `(count3 - 0x02) & 0xff` (score.ts:86) is exactly −2 on both paths.
- [VERIFIED] 10k-crossing gate is a single-entry transition, not computed per-branch — evidence: `score.ts:81` sits above the HARD/EASY split; lang-review #14 [RULE] confirmed clean.
- [VERIFIED] HARD 8-bit wrap (0→254) vs EASY no-wrap (min 47) — evidence: test:165 (0xfe) and the EASY floor guarantee; byte semantics pinned.
- [VERIFIED] Purity intact — evidence: score.ts adds no imports, only Math.floor/bitwise; `tests/purity.test.ts` green; millipede 1103/1103, orchestrator 498/498, lint clean (preflight [PRE]).
- [SEC] Security scan clean — no injection/auth/secret/info-leak surface (pure integer reducer, no untrusted input); the test's `readFileSync`/dynamic `import` use fully static repo-relative paths, no traversal, and the regexes are non-backtracking on trusted committed source. Confirmed 0 findings.
- [VERIFIED] Test quality — I caught & fixed a vacuous AC7 regex during RED (wrap-across-comment); rule-checker #8/#15/#26 [RULE] confirmed every assertion pins an exact value with independent literals (STEP/EASY_FLOOR test-local).
- [RULE-Low] `score.ts:9` citation span `(:1061-1074)` over-wide for the SCORE2-automatic claim → narrow to `:1070-1074`. Non-blocking.
- [RULE-Low] `scoring.test.ts:26-27` "cited-forward, not implemented here" now false (rampCount3 ml5-5, awardBonus ml5-2). Non-blocking.

**Rule Compliance (lang-review typescript.md):** 30 rules checked by rule-checker + my read. Clean on #1 (no `as any`/`!`/ts-ignore), #2 (all `readonly`, `Readonly<>` param), #4 (`Math.floor`/`!==`, no `||`-on-0), #7 (all `loadRamp()` awaited), #8 (no vacuous asserts), ADDITIONAL-purity, ADDITIONAL-rom-constants (0x31/0x02/bit0 all match source). Two Low #17/#24 doc-staleness — non-blocking.

**Devil's Advocate:** Could a malicious/confused caller break it? (a) Non-byte `count3` (e.g. 300)? `& 0xff` masks the result, but a caller passing a non-byte is a caller bug; the sibling awardScore is equally unvalidated — acceptable, consistent. (b) `points` large enough to cross two 10k boundaries (+25000)? The ROM's SCORE1 carry is one bit → one decrement; `floor(new/10000)!==floor(old/10000)` also fires once — matches, and millipede awards are ≤900 anyway. (c) Negative points? Not producible by the kill-value path. (d) The real risk is INVISIBILITY: `rampCount3` is unwired, so in live play COUNT3 never actually speeds up on score — but that is scoped-out (no sim count3 exists yet; awardScore is likewise unwired), captured as a non-blocking follow-up. (e) Difficulty on the wrong bit? `LSR`→bit0 is ROM-exact transcription; the 0xFF/0xFE tests prove only bit0 decides. No Critical/High surfaced.

**Design deviations audit:** none logged by TEA/Dev; none undocumented found (`(count3-2)&0xff` byte-wrap and the 0x31 radix reading are both ROM-faithful, not deviations). Section clean.

**Handoff:** To SM for finish-story.
## Impact Summary

**Delivered (ml5-5, 2pt, millipede, tdd — single review round, APPROVED):** `rampCount3` in `plugins/millipede/src/core/score.ts` — the SCORNG 10k-boundary COUNT3 speed ramp + SCORE2 carry (`MLSUB.MAC:1061-1075`). Fires only on a 10,000-point crossing; HARD −2 (no floor), EASY −2 while `COUNT3 ≥ 0x31`; attract short-circuits; SCORE2's +1 is automatic in the integer model. AC7 deferral note resolved. 24 new tests (`tests/count3-ramp.test.ts`), millipede 1109/1109 + orchestrator 498 green on the develop-merged tree, lint clean. Code PR #382 merged to develop (`514bcd72`).

**Key finding (saved to memory):** the story/context misread `CMP I,31` as decimal 31; under `.RADIX 16` it is `0x31` = **49 decimal**. Implemented against 49. The epic YAML title still says "floors at 31" — cosmetic, left as-is (the shipped code and tests are correct).

**Non-blocking follow-ups filed (Reviewer Delivery Findings):**
1. Citation sweep — `score.ts:9` header span `(:1061-1074)` should narrow to `:1070-1074` (the :1061-1069 ramp is now `rampCount3`); `scoring.test.ts:26-27` still says the COUNT3 ramp is "cited-forward, not implemented here" (now false; also stale since ml5-2's awardBonus).
2. Wiring — `rampCount3` ships as an unwired pure reducer (no `count3` in GameState; `awardScore`/`newHead` likewise unwired). When the new-head spawn timer is wired into the live sim, call `rampCount3` at the same award site as `awardScore`/`awardBonus` and reconcile with `millipede.ts`'s per-spawn ramp.
