---
story_id: "tp1-8"
jira_key: "tp1-8"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-8: THE SKILL CONTOUR, part 2 — NYMCHA, the per-type population solver (the audit's second-largest rewrite)

## Story Details
- **ID:** tp1-8
- **Jira Key:** tp1-8
- **Workflow:** tdd
- **Stack Parent:** none
- **Type:** feature
- **Points:** 8
- **Priority:** p1
- **Status:** in_progress

## Story Description

Cluster C4, expensive half. Subsumes W-034. A per-type min/max population solver that RESERVES SLOTS for the cargo of tankers already on the board (so a board full of tankers cannot deadlock when they split) and BIASES SPIKERS TOWARD SHORT LANES. This is the second-largest rewrite in the audit. It needs tp1-6 (there are no slots to reserve without the nymph queue). Sized honestly at 8 — if it proves larger on contact, split it rather than absorbing the overrun silently.

## Acceptance Criteria

1. NYMCHA is implemented as the ROM has it: a per-type min/max population solver, cited to the source.
2. Slots are RESERVED for the cargo of tankers already live — a test proves a board of tankers can always split without exceeding the 7-cap or dropping a spawn.
3. Spikers are biased toward short lanes, per the ROM's rule.
4. Depends on tp1-6 (the nymph queue and the slot model).
5. npm test -- citations stays green.
6. Handle the ROM min>max self-contradiction on waves 35-39 (routed from tp1-7): WSPIMI min=1 but the assembled WSPIMX max=0 — a 1981 typo (ALWELG.MAC:633 has un-dotted 35 = hex 0x35 = 53, a dead range; tp1-7 kept it verbatim as start:53 at rules.ts:688). NYMCHA reads the full min/max pair per wave, so decode from the consuming ROM code what happens when min > max on those five waves (do not assume clamp-to-min or clamp-to-max) and pin it with a cited test.
7. Add radix-decoded source-rules pins for every WSPIMI/WSPIMX record whose start or end >= 0x0A (the tp1-7 WSPIMX-record-6 radix block is the template), so a future un-dotted-hex typo fails loudly instead of staying latent.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-15T18:38:57Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-15T15:34:58Z | 2026-07-15T15:37:03Z | 2m 5s |
| red | 2026-07-15T15:37:03Z | 2026-07-15T16:09:01Z | 31m 58s |
| green | 2026-07-15T16:09:01Z | 2026-07-15T17:41:17Z | rework (no impl) |
| red | 2026-07-15T17:41:17Z | 2026-07-15T17:52:22Z | 11m 5s |
| green | 2026-07-15T17:52:22Z | 2026-07-15T18:06:57Z | 14m 35s |
| review | 2026-07-15T18:06:57Z | 2026-07-15T18:34:28Z | 27m 31s |
| green | 2026-07-15T18:34:28Z | 2026-07-15T18:37:17Z | 2m 49s |
| review | 2026-07-15T18:37:17Z | 2026-07-15T18:38:57Z | 1m 40s |
| finish | 2026-07-15T18:38:57Z | - | - |

> **Green→red rework (user-directed):** during GREEN, Dev's decode of NYMCHA found
> that the ROM never spawns fresh flippers past wave 4 (WFLIMI min 0 from wave 5),
> so the AC-2 reservation test passed *trivially* (flippers=0), not via the
> reservation. No implementation was written. TEA reworks RED to (1) move AC-2 onto
> a fresh-spawning cargo wave so it bites, (2) pin the min-0-no-fresh-spawn rule,
> and (3) re-seat the merged tests that encode the superseded weighted roll.
> `pf workflow fix-phase` is forward-only, so the phase was set by hand.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Question** (non-blocking): AC-2's "without dropping a spawn" is an idealization — the ROM's reservation is per-cargo-TYPE headroom, NOT a global slot lock. `DEC OPFLIP[cargo]` twice per tanker (ALWELG.MAC:1298-1299) provably holds `cargoLive + 2*tankers <= cargoMax`, so a split never pushes the CARGO type past its max; but a board packed to 7 with OTHER types (e.g. spikers) can still drop a split child through ACTINV (the tp1-6 drop-on-full rule). Affects `tempest/src/core/rules.ts` (implement the per-type reservation loop) and the reading of AC-2. The CI-safe test pins the provable invariant, not the idealized no-drop; Reviewer/PM should confirm that satisfies AC-2, or rule whether a stronger global guarantee is in scope. *Found by TEA during test design.*
- **Improvement** (non-blocking, PM-visible): NYMCHA is an authentic difficulty-FEEL change. Spikers VANISH on waves 17-19/33-42 (today they appear every wave once introduced), fuseballs vanish on 17-21, every type is now capped at its per-wave max, and each wave's MIN is GUARANTEED (a wave-3 board always has a tanker, wave-4 always a spiker). All ROM-faithful per the epic's "follow the ROM" ruling. Affects whole-game balance — flag for PM/Reviewer visibility, not a defect. *Found by TEA during test design.*
- **Gap** (non-blocking): NYMCHA needs a per-lane "line length" (the ROM's LINEY) our sim does not store — derivable from `s.enemies` (the max depth per lane), not new state but new logic for the AC-3 smart launch. Affects `tempest/src/core/sim.ts` / `src/core/rules.ts` (compute a LINEY-equivalent at hatch and pick spiker-on-short / tanker-on-long). *Found by TEA during test design.*
- **Gap** (non-blocking): the AC-7 radix source-pins run only where `TEMPEST_SOURCE_DIR` is present (`describe.skipIf`), so the un-dotted-hex net is OFF in CI — the same limitation tp1-7 routed forward. The CI-safe biting tests are the behavioural suite (`tp1-8.nymcha`, reads through `stepGame`). Affects `tempest/tests/core/tp1-8.source-rules.test.ts`; a documented local test profile requiring `TEMPEST_SOURCE_DIR` would close it. Out of scope for tp1-8's ACs; noting the standing gap. *Found by TEA during test design.*
- **Question** (non-blocking): story size — the decode confirms tp1-8 is genuinely the second-largest rewrite (5 new MIN tables + flipper MAX + the solver + sim wiring + cargo reservation + smart launch + random fallback). It fits 8 points but sits at the top end; the smart launch (narrow trigger window) and the reservation semantics are the parts most likely to expand on contact. If it overruns, SPLIT per the story's own guidance rather than absorbing silently. Affects `tempest/src/core/rules.ts`. *Found by TEA during test design.*
- **Gap** (non-blocking): tp1-8 grows `rules.ts` (5 min tables + NYMCHA), which shifts cited lines in `docs/audit/findings/*.json` — Dev must run `node tools/audit/reanchor-citations.mjs --write` (AC-5) in addition to marking W-034 `remediated_by: tp1-8`. A comment-only edit to a cited file also shifts pins. Affects `tempest/docs/audit/findings/*.json`. *Found by TEA during test design.*

### TEA (test design — green→red rework)

- **Conflict** (blocking, for GREEN): **NYMCHA is MIN-DRIVEN — a min-0 type never hatches FRESH.** Every launch path gates on the type's min != 0 (single-type :1338, WFLMIN starvation :1355, random fallback :1392); the smart launch emits ONLY spiker or tanker. So flippers (WFLIMI min 0 from wave 5) never spawn fresh past wave 4 — they come ONLY from tanker splits. This reshapes the entire spawn model and is WHY the reservation matters. Affects `tempest/src/core/rules.ts` (every NYMCHA launch MUST be min-gated; a min-0 launch path silently re-floods flippers). Newly pinned by `tp1-8.nymcha` "a min-0 type never hatches fresh". *Found during the green→red rework (Dev decode + TEA).*
- **Gap** (non-blocking, for GREEN — the rollSpawnKind DELETION collateral): implementing NYMCHA deletes `rollSpawnKind` + `SPAWN_CYCLE_HARD_SCALE` + `weightedPick` + the four `*_INTRO_WAVE` consts + `firstNonZeroWave` (all only used by `rollSpawnKind`). That breaks the rollSpawnKind-DIRECT tests: remove `sim.spawn`'s `rolledKinds` helper + its "authentic ROM introduction schedule" describe; `sim.difficulty`'s `rollDistribution`/`hardFraction`/`rollSequence` helpers + its three `rollSpawnKind` describes (incl. the escalation); and `tp1-7.contour-tables`'s `rolledKinds` helper. KEEP the `levelParams`, `rolledCargo`, and `rulesCode`-grep tests. The intro schedule is now covered by tp1-8's per-wave-max NYMCHA tests. Log a Dev deviation for each removal. Affects `tempest/tests/core/{sim.spawn,sim.difficulty,tp1-7.contour-tables}.test.ts`. *Found by TEA during rework.*
- **Improvement** (non-blocking, PM-visible): removing `SPAWN_CYCLE_HARD_SCALE` is a real balance change — story 3-4's per-cycle hard-enemy multiplier (1 + cycle*0.5) has nothing to multiply once the weighted roll is gone, and the ROM has no per-cycle axis (its per-wave min/max tables ARE the escalation). Waves 17-32 etc. now follow the raw tables, not a 1.5x mix. ROM-faithful; flag for PM/Reviewer. Affects whole-game balance. *Found by TEA during rework.*
- **Question** (non-blocking, for GREEN run): expect further sim-driven collateral — other `sim.*` tests that assert the OLD monotonic/weighted composition (specific kinds on specific waves) may break under NYMCHA's per-wave gaps + min-driven spawning (the `sim.spawn` wave-4 re-seat here is one such, done in RED). Dev's full-suite GREEN run will surface them: re-seat ROM-truth assertions, harden RNG-fragile fixtures (the tp1-7 seeded-RNG landmine) — fix the FIXTURE, not the assertion. Affects `tempest/tests/core/sim.*.test.ts`. *Found by TEA during rework.*

### Reviewer (code review)

- **Conflict** (blocking, this story's rework): reservation clamp-at-0 carries a FALSE "unreachable" comment — reachable wave-6 underflow proven. Affects `tempest/src/core/rules.ts:896-901` (rule match-bytes-vs-deviation + correct the comment + pin the wave-6 state). *Found by Reviewer during code review (independent ROM decode).*
- **Improvement** (non-blocking, forward): the LINEY→depth constant used `/0xFF`; the file's own INVAY/along→depth convention is `(0xF0-byte)/WARP_ALONG_SPAN`. Any FUTURE INVAY-byte→depth conversion should use WARP_ALONG_SPAN, not an ad-hoc /0xFF, to stay consistent. Affects `tempest/src/core/rules.ts` (and future ports reading INVAY bytes). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the AC-7 radix source-pins + the independent ROM decode both skip in CI (ROM copyrighted) — the fidelity guarantee rests on the CI-safe behavioural suite + local decode, not on CI. Same standing gap tp1-7 routed; a documented `TEMPEST_SOURCE_DIR` local profile would close it. Affects `tempest/tests/core/tp1-8.source-rules.test.ts`. *Found by Reviewer during code review.*

### Dev (implementation)

- **Question** (non-blocking, for Reviewer): the single-type-min-0 branch returns null, so on a board FULL of the max-types where only a min-0 type (e.g. flipper) still has openings, the remaining nymphs do not hatch (slots sit temporarily unfilled). Verified this is NOT a hang: every wave has at least one min>0 type with a non-zero max (flipper 1-4, spiker 5-16, tanker/pulsar 17+, fuse/pulsar/tanker 33+), so from an EMPTY board NYMCHA always relaunches the mins — the queue drains as the player kills, and the wave clears on `enemies===0 && nymphs===0` (sim.ts:751). Faithful ROM behaviour; flagged for Reviewer awareness, not a defect. Affects `tempest/src/core/rules.ts` (nymcha step 4). *Found by Dev during implementation.*
- **Gap** (non-blocking): NYMCHA draws `s.rng` ONLY in the fallback type pick + the tanker-cargo slot — fewer/different draws than the old `rollSpawnKind` (one `nextFloat`) + `rollTankerCargo`. The full suite stayed 1411/1411, so no seeded fixture shifted this time, but the hatch-time RNG cursor advances differently now: any FUTURE change to a NYMCHA draw will re-break seeded siblings (the standing tp1-7 landmine — fix the fixture, not the assertion). Affects `tempest/tests/core/*` fixtures built on `playingState`/seeded rng. *Found by Dev during implementation.*
- **Improvement** (non-blocking, PM-visible): confirmed landed — removing `SPAWN_CYCLE_HARD_SCALE` (story 3-4's per-cycle hard-enemy multiplier) is a real, ROM-faithful balance change: deep-wave enemy MIX now follows the raw per-wave min/max tables, not a 1.5x/2x escalation on top. Enemy SPEED/COUNT still ramp (tp1-7 tables, untouched). Affects whole-game balance on waves 17+. *Found by Dev during implementation.*

## Subagent Results

Adversarial specialists are toggled OFF (`workflow.reviewer_subagents` — only `preflight` enabled), the same config as tp1-7. Per the self-authored/ROM-story protocol I ran preflight + an INDEPENDENT ROM auditor (general-purpose, opus) to re-decode NYMCHA from raw bytes, and personally covered each disabled specialist's domain (mutation tests, edge/silent-failure/type/simplify/rule/comment analysis).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 — stale comment `sim.ts:177-178` (NYMCHA framed as future work / rollSpawnKind stand-in) | 1 confirmed (LOW/doc) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Covered by Reviewer: empty/full board, openCount==1 findIndex, fallback wrap 1,0,4,3,2, tryLaunch 4-slot cycle, deep-wave fold, min-0-single-type no-hang |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Covered by Reviewer: nymcha returns EXPLICIT null (ROM TEMP0=0), sim handles it (nymph back+latch); contourValue returns explicit 0; no swallowed errors |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Covered by Reviewer: MUTATION-PROVEN — neuter reservation → AC-2 fuse test RED; swap smart-launch dir → AC-3 RED; AC-6 exact-0; no vacuous asserts |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Covered by Reviewer + preflight: NYMCHA inline comments cite accurate ROM lines; the ONE stale comment (sim.ts:177-178) is the preflight finding |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Covered by Reviewer: no `as any`; `Record<EnemyKind/TankerCargo,number>` exhaustive (missing key = tsc error); NymchaPick readonly; tsc clean |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled — N/A: pure deterministic sim core, no auth/injection/tenant/network/IO; RNG seeded |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Covered by Reviewer: 7-step solver, no over-engineering; deletions removed dead code (preflight: 0 refs to deleted symbols); rollTankerCargo kept (used by tryLaunch) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Covered by Reviewer: falsy-0 guarded (Math.max(0,..)/>0/!==0, no `\|\| default`); array-index dispatch; radix decode |
| + | INDEPENDENT ROM auditor (general-purpose, opus) | Yes | findings | 2 DIVERGENCE (Item 5 reservation clamp, Item 6 LINEY constant); AGREE on NYMCHA walk a-h, type order, all 6 tables byte-exact, min>max resolution | 2 confirmed (1 MED, 1 LOW) |

**Preflight:** tsc PASS, full suite 1411/1411, citations 25/25, reanchor `0 lost`, no smells.

**Independent ROM auditor — verdict:** the core reproduces the 1981 ROM faithfully (NYMCHA instruction sequence, the `[flipper,pulsar,tanker,spiker,fuseball]` type order confirmed independently from `OPFLIP/OPPULS/OPTANK/OPSPIN/OPFUSE` at ALCOMN.MAC:764-768 + NYMTAD, all six min/max tables byte-exact, and the min>max = max-governs/0-spikers decode with NO hidden clamp-to-min). TWO divergences:
- **Item 5 (MED):** reservation clamp-at-0 vs the ROM's raw byte `DEC` (wrap-then-cap). Auditor proved a REACHABLE wave-6 underflow (`WFLIMX=5`, 2 flipper-carrying tankers + 2 split flippers → `3-4 = 0xFF`, step-3 cap rescues to `free`=3; port clamps to 0). The `rules.ts:896-897` "unreachable" comment is FALSE. Impact muted (min-0 flippers never launch fresh) but the phantom opening can flip `openCount` → different branch/RNG draw.
- **Item 6 (LOW):** `LINE_LONG_DEPTH = 1 - 0xCC/0xFF ≈ 0.2` (rules.ts:865) normalizes INVAY by /0xFF, inconsistent with the file's own along→depth mapping `(0xF0-byte)/WARP_ALONG_SPAN`, under which `0xCC → 0.161`. Direction/inversion sound; the boundary constant is ~0.04 off.

**All received:** Yes (preflight + independent auditor; the 8 adversarial specialists disabled via settings, domains covered by Reviewer + the independent decode + mutation tests)
**Total findings:** 3 confirmed (1 MED — Item 5; 2 LOW — Item 6 + stale sim.ts:177-178 comment), 0 dismissed

## Dev Assessment

**Implementation Complete:** Yes — NYMCHA is the ROM's per-type min/max population solver, wired into the tp1-6 nymph hatch.

**Files Changed:**
- `src/core/rules.ts` — the five MIN tables (WFLIMI/WPULMI/WTANMI/WSPIMI/WFUSMI) + WFLIMX, the type-order infrastructure (`NYMCHA_KINDS`/indices, `TYPE_MIN`/`TYPE_MAX`, `IX_BY_KIND`, `CARGO_TYPE_IX`, `typeMin`/`typeMax`), and `nymcha()` + `tryLaunch()`/`lineIsLong()`. Deleted `rollSpawnKind`, `SPAWN_CYCLE_HARD_SCALE`, `weightedPick`, the four `*_INTRO_WAVE` consts, `firstNonZeroWave`, and the now-unused `nextFloat` import.
- `src/core/sim.ts` — the nymph hatch (`stepNymphs`) calls `nymcha(s.level, s.enemies, n.lane, s.rng)`; a `null` (decline) latches the queue exactly like a full board.
- `docs/audit/findings/*.json` — W-034 `remediated_by: tp1-8`; W-036 re-anchored to `rules.ts:699` (the WPULMX record, CONFIRMED not remediated); 17 shifted citations reanchored via `reanchor-citations.mjs --write`.
- Tests: re-seated `sim.spawn` / `sim.difficulty` / `tp1-7.contour-tables` (removed the rollSpawnKind-direct suites; the intro schedule + per-wave gaps are covered by `tp1-8.nymcha`).

**Tests:** **1411/1411 passing (GREEN)** · `tsc --noEmit` clean · `npm test -- citations` **25/25** (AC-5). Every tp1-8 RED test is green: AC-1 (per-type max cap + guaranteed min + min-driven no-fresh-flipper), AC-2 (fuseball reservation held to max-2, mutation-contrasted), AC-3 (spiker-short/tanker-long), AC-6 (0 spikers on the 13 max-0 waves incl. the 35-39 min>max), plus the source-rules ROM anchor.

**AC coverage:** AC-1 ✓ (solver cited to ALWELG.MAC:1266-1412) · AC-2 ✓ (per-cargo-type reservation) · AC-3 ✓ (smart launch) · AC-4 ✓ (reads the tp1-6 nymph queue + slot model) · AC-5 ✓ (citations green) · AC-6 ✓ (min>max = max governs, min inert → 0 spikers) · AC-7 ✓ (radix source-pins).

**Deviations:** 4 logged (rollSpawnKind/SPAWN_CYCLE_HARD_SCALE deletion; reservation clamp-at-0; LINEY→depth threshold; W-036 re-anchor). **No collateral** — the full suite stayed green with zero fixture surgery beyond the specified rollSpawnKind-direct removals.

**Handoff:** To The Thought Police (Reviewer) for code review.

## Reviewer Assessment

**Verdict:** REJECTED

An exemplary, near-byte-faithful port of the audit's second-largest rewrite — an INDEPENDENT opus ROM re-decode confirms the full NYMCHA instruction sequence (a-h), the high-risk `[flipper,pulsar,tanker,spiker,fuseball]` type order (cross-checked against the `OPFLIP/OPPULS/OPTANK/OPSPIN/OPFUSE` memory layout AND NYMTAD), all six min/max tables byte-exact, and the celebrated min>max resolution (max governs → 0 spikers on 35-39, with NO hidden clamp-to-min in the ROM). The reworked tests are mutation-proven to bite (reservation, smart-launch, min-0). But the same independent decode found TWO divergences plus a stale comment, and on a ROM-fidelity epic whose #1 AC is "as the ROM has it," a decode-proven divergence carrying a FALSE "unreachable" comment is not something I may rubber-stamp (the tp1-7 precedent).

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MED] | `[EDGE]`/`[DOC]` The cargo reservation clamps `Math.max(0, openings-2)`, but the ROM does a raw byte `DEC` twice (wrap-then-cap). The comment claims the wrap is "unreachable" — **FALSE**: independently proven reachable on WAVE 6 (WFLIMX=5, 2 flipper-carrying tankers + 2 split flippers → `3-4 = 0xFF`, step-3 cap rescues to free=3; port clamps to 0). Impact muted (min-0 flippers never launch fresh) but the phantom opening can flip `openCount` → a different branch / RNG draw. | `src/core/rules.ts:896-901` (ROM `ALWELG.MAC:1298-1299` + the `:1304-1320` cap) | EITHER emulate the ROM's byte-wrap-then-cap (fully faithful, consistent with tp1-7's match-bytes ruling), OR keep clamp-at-0 as an EXPLICIT conscious deviation — but the "unreachable" comment MUST be corrected to document the reachable wave-6 underflow + the muted-impact rationale. TEA to rule (match-bytes vs honor-intent) and pin the wave-6 reservation state with a test. |
| [LOW] | `[RULE]` `LINE_LONG_DEPTH = 1 - 0xCC/0xFF ≈ 0.2` normalizes LINEY (an INVAY byte) by /0xFF, inconsistent with the file's own along→depth mapping `(0xF0-byte)/WARP_ALONG_SPAN`, under which `0xCC → 0.161`. The "long line" boundary sits ~9 along-units too near the rim. Direction/inversion are sound; only the constant diverges. | `src/core/rules.ts:865` (ROM `ALWELG.MAC:1376` `CMP I,0CC`) | Set `LINE_LONG_DEPTH = (0xF0 - 0xCC) / WARP_ALONG_SPAN` (≈0.161) and pin it with a boundary test so it can't regress. |
| [LOW] | `[DOC]` Stale JSDoc frames NYMCHA as future work with `rollSpawnKind` as a stand-in — false since this diff (NYMCHA is live at `sim.ts:204`, rollSpawnKind deleted). Misleads readers of `stepNymphs`. | `src/core/sim.ts:177-178` | Update the comment to describe the live NYMCHA call. |

**Observations (≥5):**
- `[EDGE]` **[HIGH-CONF]** Reservation underflow is REACHABLE (Item 5) — independent opus decode built the wave-6 board (2 flipper-tankers + 2 flippers) and traced `3-2-2 = 0xFF` then the step-3 unsigned `CMP free,OPFLIP` rescue to 3. The port's clamp yields 0. The `[MED]` blocking finding.
- `[RULE]` **[VERIFIED]** Type-index order CORRECT — the highest-risk item. Independently derived `flipper/pulsar/tanker/spiker/fuseball` = 0-4 from `ALCOMN.MAC:764-768` (`OPFLIP/OPPULS/OPTANK/OPSPIN/OPFUSE`) + `NYMTAD:1423-1427`, matching `NYMCHA_KINDS`/`IX_BY_KIND`. A wrong order would silently mis-assign every min/max; it is right.
- `[RULE]` **[VERIFIED]** min>max resolution CORRECT — `WSPIMX:633` `35` un-dotted (`od -c`) → 0x35=53 dead range → max 0; `WSPIMI:625` `35.` dotted → min 1; every launch path gates on `OPFLIP!=0`, so `openings[spiker]=0` ⇒ 0 spikers. The auditor confirms "no hidden clamp-to-min exists in the ROM." AC-6 satisfied as decoded.
- `[TEST]` **[VERIFIED]** Tests MUTATION-PROVEN — I reverted the reservation (`-2`→no-op) → AC-2 fuseball test RED; swapped `TANKER_IX`/`SPIKER_IX` in the smart launch → AC-3 RED (spiker rate 0). The RED-phase rework fixed the previously-vacuous wave-10 AC-2. No tautologies.
- `[RULE]` **[VERIFIED]** LINEY direction sound (Item 6 is only the constant) — `LINEY:2214-2217` stores INVAY only when SMALLER (nearest-rim enemy); the port's `reach=max(depth)` is the correct reduction, and dead→spiker / long→tanker matches `:1371-1379`.
- `[SIMPLE]` **[VERIFIED]** Deletions clean — preflight confirms 0 remaining refs to `rollSpawnKind`/`weightedPick`/`SPAWN_CYCLE_HARD_SCALE`/the intro consts/`firstNonZeroWave`; `rollTankerCargo` correctly kept (used by `tryLaunch`). No dead code.
- `[DOC]` **[VERIFIED]** Two doc defects — the false "unreachable" (Item 5) and the stale stepNymphs JSDoc (Item 3). On a fidelity epic a false reachability claim is the exact latency trap that hid the tp1-7 typo.
- `[SEC]` **[VERIFIED]** No security surface — pure deterministic sim core; RNG seeded. N/A by scope.
- `[SILENT]` **[VERIFIED]** `nymcha` returns an EXPLICIT `null` (ROM TEMP0=0), handled by `sim.ts` (nymph back + latch); no swallowed error. The min-0-single-type null verified NON-hanging (every wave has a min>0 reachable type; wave clears on `enemies===0 && nymphs===0`).
- **[VERIFIED]** Race check — no tp1-8 on `origin/develop` (tempest) ahead of HEAD; branch fetched clean.

**Rule Compliance (lang-review/typescript + AC):**
- **AC-1/4/6/7:** ✓ byte-faithful (independent decode). **AC-2:** ✓ mechanism correct (per-cargo reservation), test now bites; Item 5 is an edge-case clamp fidelity issue, not an AC-2 failure. **AC-3:** ✓ direction correct; Item 6 is the boundary constant. **AC-5:** ✓ citations 25/25.
- **falsy-0 (lang #39):** ✓ `Math.max(0,..)`/`>0`/`!==0`, no `|| default`. **`as any` (lang #1):** ✓ none. **exhaustiveness:** ✓ `Record<EnemyKind/TankerCargo,number>` (missing key = tsc error).

**Data flow traced:** `stepNymphs` (sim.ts:204) → `nymcha(level, s.enemies, lane, s.rng)` → FLIPCO from `s.enemies`, openings from `typeMax/typeMin` (contour tables), reservation from each tanker's `contains`, LINEY from per-lane `depth` → `{kind,cargo}` or null → `makeEnemy`/nymph-back. The Item-5 divergence is confined to `openings[flipper]` on the reachable underflow; the Item-6 divergence to the smart-launch boundary.

### Devil's Advocate

Argue this is fine and I am over-rejecting. The core is byte-perfect and both divergences are muted: Item 5's phantom flipper opening never produces a flipper (min 0), and Item 6 shifts a bias boundary by ~9 along-units on a heuristic that is already "spiker-ish vs tanker-ish." True — but this is a FIDELITY epic where the deliverable IS byte-accuracy, and the most dangerous artifact here is a comment that AFFIRMATIVELY states a false fact ("unreachable") an independent auditor disproved in one board. That is precisely how the tp1-7 WSPIMX typo stayed latent — an unverified claim nobody re-decoded. Shipping it green tells the next author the edge is handled when it is not; the phantom opening CAN flip a branch and shift the seeded RNG, which on a deterministic sim is an observable, un-audited divergence exactly on the waves (5-16) players actually reach. Second: is the min>max celebration real or did the author reverse-engineer the tables to the tests? No — the auditor decoded WSPIMX/WSPIMI from raw `od -c` bytes without the port's conclusion and reached max-0/min-1 independently; the resolution is genuine. Third: could the reservation clamp actually be MORE correct than the ROM (which "bugs out" into a phantom opening)? Maybe — but "we fixed the ROM's bug" is a conscious deviation that must be DOCUMENTED as such, not mislabeled "unreachable," and on a match-bytes epic the default is to reproduce the byte behavior (tp1-7 ruled match-bytes on exactly this kind of call). Every attack lands back on: the finding is small, but it is real, decode-proven, and carries a false claim — reject, fix, re-verify.

**Handoff:** Back to Julia (Dev) for the GREEN rework — the three findings are comment + one constant, no test-design needed. **Reviewer ruling on Item 5:** clamp-at-0 is an ACCEPTABLE conscious deviation (it is solver LOGIC with muted impact — min-0 types never launch fresh — not a transcribed data byte, so match-bytes does not compel emulating the ROM's phantom-opening wrap); Dev keeps the clamp but REPLACES the false "unreachable" comment with an honest deviation documenting the reachable wave-6 underflow + the muted impact (and logs a Dev deviation). Item 6: set `LINE_LONG_DEPTH = (0xF0 - 0xCC) / WARP_ALONG_SPAN`. Item 3: fix the stale `sim.ts:177-178` JSDoc. A LINEY boundary test is recommended but not required (the AC-3 directional test holds). Do NOT merge.

## Dev Assessment — Green Rework (round-trip 2)

**Implementation Complete:** Yes — all 3 Reviewer findings resolved, no logic change to the solver.
- **Item 5 (MED):** kept clamp-at-0 (Reviewer ruled it an acceptable conscious deviation), REPLACED the false "unreachable" comment (`rules.ts:895-903`) with an honest deviation documenting the reachable wave-6 underflow + muted impact.
- **Item 6 (LOW):** `LINE_LONG_DEPTH = (0xf0 - 0xcc) / WARP_ALONG_SPAN` (`rules.ts:865`) — single-sourced from the file's own INVAY->depth mapping.
- **Item 3 (LOW):** stale `sim.ts:177-179` JSDoc corrected to the live NYMCHA hatch.

**Tests:** **1411/1411 (GREEN)** · `tsc --noEmit` clean · citations green · reanchor `0 lost` (15 comment-shifted citations re-anchored). No behavioural regression — the LINEY constant change is bracketed by the AC-3 directional test.

**Deviations:** 3 logged (rework). **Handoff:** To The Thought Police (Reviewer) for re-review.

## Subagent Results — Re-review (round-trip 2)

The rework is 3 comment/constant fixes with NO solver logic change, so the independent ROM decode and the mutation-proven test suite from round-trip 1 still stand — no adversarial re-spawn needed. Preflight verified directly: `tsc --noEmit` exit 0, full suite **1411/1411**, citations green, reanchor `0 lost` (15 comment-shifted citations re-anchored). Diff confirmed: `LINE_LONG_DEPTH = (0xf0-0xcc)/WARP_ALONG_SPAN = 0.1607` (matches the auditor's 0.161); reservation comment now documents the reachable wave-6 underflow honestly; stepNymphs JSDoc corrected.

## Reviewer Assessment — Re-review (round-trip 2)

**Verdict:** APPROVED

The prior REJECT's three findings are resolved, minimally and exactly, with no logic change to the byte-faithful solver:
- **Item 5 (MED):** the FALSE "unreachable" comment is gone — `rules.ts:895-903` now documents the reachable wave-6 byte underflow and labels clamp-at-0 a conscious deviation with the muted-impact rationale (a min-0 cargo type, the only over-subscribing case sub-33, never launches fresh, so the phantom opening only shifts openCount). The Reviewer-ruled resolution (keep clamp, honest comment) is implemented verbatim.
- **Item 6 (LOW):** `LINE_LONG_DEPTH = (0xf0 - 0xcc) / WARP_ALONG_SPAN` = 0.1607 — decodes 0xCC through the file's own INVAY→depth mapping (single-sourced from WARP_ALONG_SPAN), matching the independent auditor's 0.161. Full suite stayed green (the AC-3 directional test brackets the boundary).
- **Item 3 (LOW):** `sim.ts:177-179` JSDoc now describes the live NYMCHA hatch + decline path.

Nothing else changed (the diff is comment lines + one constant, confirmed by `git diff`). The round-trip-1 verdict stands otherwise: NYMCHA is byte-faithful (independent opus decode: instruction walk, type order, six tables, min>max = max-governs/0-spikers), the reworked tests are mutation-proven, and the citation gate is green.

**Deviations re-audit:** Dev rework #1 (reservation clamp + honest comment) → ✓ ACCEPTED — the correction is exactly the ruled resolution; the reachability claim is now true. Dev rework #2 (LINEY constant) → ✓ ACCEPTED — 0.1607 matches the decode; single-sourced from WARP_ALONG_SPAN. Dev rework #3 (stale JSDoc) → ✓ ACCEPTED — accurate.

### Devil's Advocate

Argue the rework is a dodge. Did keeping clamp-at-0 (rather than emulating the ROM's wrap) just paper over Item 5 with a comment? No — the divergence's impact was decode-proven MUTED (the phantom opening is only ever a flipper opening, and flippers min-0 never launch fresh), so the observable behavior already matches the ROM; the defect was the comment asserting a false fact, and that is now corrected to a true, specific, reproducible claim (wave 6, the exact arithmetic). The match-bytes principle governs transcribed DATA (the tables — all byte-exact); it does not compel bug-for-bug emulation of an arithmetic underflow in solver logic whose result is unobservable. Did the LINEY constant change break anything untested? The full suite is green and the change is a pure single-source of an existing constant (WARP_ALONG_SPAN) the file already uses. Every finding is closed at its root.

**Handoff:** To Winston Smith (SM) for finish-story. Do NOT merge here. **Note for finish:** this is an AI-authored + AI-reviewed PR — the self-approval guardrail applies, so the human must authorise the merge before `pf sprint story finish`.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **AC-2 pinned as the ROM's provable per-cargo-type reservation, NOT the idealized "never drops a spawn"**
  - Spec source: session AC-2
  - Spec text: "Slots are RESERVED for the cargo of tankers already live — a test proves a board of tankers can always split without exceeding the 7-cap or dropping a spawn."
  - Implementation: the source pin fixes the reservation loop byte-exact (`DEC OPFLIP[cargo]` twice per carrier, ALWELG.MAC:1298-1299); the CI-safe test asserts the invariant that loop provably produces — `cargoLive + 2*tankers <= cargoMax` on wave 10 (cargo always flipper) — so a tanker's split never exceeds the CARGO type's max. It does NOT assert a global "no split child ever dropped," because the ROM's reservation is per-cargo-TYPE headroom and a board packed to 7 by other types can still drop a child through ACTINV.
  - Rationale: asserting the idealized no-drop would pin behaviour the ROM does not guarantee — the rom-fidelity trap (an unverified claim looks exactly like a real one). The provable invariant is the faithful, decodable pin.
  - Severity: moderate (scopes what AC-2 provably promises)
  - Forward impact: routed as a Question Delivery Finding — Dev implements the per-type reservation; Reviewer/PM confirm the invariant satisfies AC-2 or rule whether a stronger guarantee is in scope.

- **AC-3 behavioural test brackets the DIRECTION (short->spiker, long->tanker), not the exact LINEY->depth mapping or 0xCC threshold**
  - Spec source: session AC-3
  - Spec text: "Spikers are biased toward short lanes, per the ROM's rule."
  - Implementation: the source pin fixes the smart-launch rule byte-exact (OPSPIN/OPTANK both open -> read LINEY at the nymph's line -> spiker on short/dead, tanker on long, CMP I,0CC). The CI-safe test stages the smart-launch window (mins met, both types open, one dead lane, one lane occupied near the rim) and asserts the DIRECTION via per-lane `depth`, not the literal 0xCC boundary in our coordinates.
  - Rationale: the LINEY-to-sim-depth mapping and the threshold are Dev's design; over-pinning them would couple the test to an unbuilt internal API. The source pin is the authoritative AC-3 assertion.
  - Severity: minor
  - Forward impact: Dev chooses the mapping; Reviewer verifies it against the source pin. If the mapping proves subtle the behavioural threshold (0.8) may need a Reviewer eye.

- **AC-1 min/max pinned through `stepGame` (the real hatch), not via a new `nymcha()` export**
  - Spec source: session AC-1
  - Spec text: "NYMCHA is implemented as the ROM has it: a per-type min/max population solver, cited to the source."
  - Implementation: the behavioural suite drives the real nymph hatch and asserts per-type caps and guaranteed mins on the resulting board, rather than importing the solver directly (mirrors the tp1-6/tp1-7 sim-integration convention). The solver's exports stay Dev's to shape.
  - Rationale: `stepGame` is the stable public surface; testing the internal signature would over-couple the RED to an unbuilt API and risk import-RED noise instead of assertion-RED.
  - Severity: minor
  - Forward impact: none — Dev is free to design the NYMCHA export.

### TEA (test design — green→red rework)

- **AC-2 re-scoped from wave 10 (flipper cargo, moot) to wave 33 (fuseball cargo, min-driven) so the reservation BITES**
  - Spec source: session AC-2; the green→red rework directive
  - Spec text: "a test proves a board of tankers can always split without exceeding the 7-cap or dropping a spawn."
  - Implementation: the reservation test now pre-seeds a FUSEBALL-carrying tanker on wave 33 (WWTAC2 slot 2 = fuse; WFUSMI min 1 / WFUSMX max 4) and asserts fresh fuseballs stay <= WFUSMX - 2 = 2, with a contrast (no tanker -> fuseballs exceed 2). The prior wave-10 test passed TRIVIALLY: flipper cargo has min 0, so no fresh flippers ever competed and the reservation was never exercised.
  - Rationale: the reservation only bites on a cargo type that ALSO spawns fresh (min > 0); wave 33 is the first such wave. Controlling the order (tanker present first) isolates the ROM's provable per-cargo-type headroom.
  - Severity: moderate (the original AC-2 test was vacuous for its label)
  - Forward impact: none — the strengthened test isolates the reservation; the min-0 rule is pinned separately.

- **Added the min-0-no-fresh-spawn pin — the property that made the old AC-2 vacuous**
  - Spec source: session AC-1; the NYMCHA decode (ALWELG.MAC:1338 / 1355 / 1392)
  - Spec text: "NYMCHA is implemented as the ROM has it: a per-type min/max population solver."
  - Implementation: a new test pins that a min-0 type never hatches fresh (wave 20 settle -> 0 flippers), guarded by wave 1 (min 1 -> flippers appear).
  - Rationale: every NYMCHA launch is min-gated; this is load-bearing (it is WHY the reservation matters) and the first RED did not capture it.
  - Severity: minor
  - Forward impact: Dev must gate every launch on min != 0; a min-0 launch path would silently re-flood flippers on deep waves.

- **sim.spawn wave-4 re-seated to NYMCHA's per-wave gap (no tanker on wave 4)**
  - Spec source: WTANMX (TZ 1-5 = 0,0,1,0,1); the per-wave availability gaps tp1-7 forwarded
  - Spec text: tp1-7 deviation — "if tp1-8 makes availability per-wave, re-seat it."
  - Implementation: "wave 4 spawns tankers and spikers" -> "wave 4 spawns spikers + flippers but NO tanker" (WTANMX wave 4 = 0 — the non-monotonic gap the tp1-7 monotonic intro could not express).
  - Rationale: a ROM-truth assertion NYMCHA makes false; TEA owns re-seating it in RED. The rollSpawnKind-DELETION collateral (the direct-roll tests) is specified as Dev's GREEN work (see Delivery Findings), matching the tp1-7 division (TEA re-seats ROM-truth in RED; Dev handles his deletion's collateral in GREEN).
  - Severity: minor
  - Forward impact: Dev removes the rollSpawnKind-direct tests when he deletes the function.

### Dev (implementation)

- **Deleted rollSpawnKind + SPAWN_CYCLE_HARD_SCALE + weightedPick + the four *_INTRO_WAVE consts + firstNonZeroWave; re-seated their direct tests**
  - Spec source: session AC-1; finding W-034; the TEA "deletion collateral" Delivery Finding
  - Spec text: "NYMCHA is implemented as the ROM has it: a per-type min/max population solver."
  - Implementation: NYMCHA is the sole spawn-type decision; the weighted roll and story-3-4's per-cycle `SPAWN_CYCLE_HARD_SCALE` multiplier are removed (the ROM has no per-cycle axis — its per-wave min/max tables ARE the ramp). Removed the rollSpawnKind-direct suites in `sim.spawn`/`sim.difficulty`/`tp1-7.contour-tables`; kept `levelParams`/`rolledCargo`/`rulesCode`-grep coverage.
  - Rationale: keeping the superseded weighted roll as dead code would violate the W-034 remediation and the epic's "follow the ROM." The escalation's coverage is superseded by tp1-8's per-wave NYMCHA tests.
  - Severity: moderate (removes a story-3-4 gameplay axis — PM-visible, ROM-faithful)
  - Forward impact: waves 17-32 etc. now follow the raw tables, not a 1.5x hard-enemy mix. Routed as a PM-visible finding.

- **The tanker-cargo reservation clamps openings at 0 (the ROM DECs raw)**
  - Spec source: AC-2; ALWELG.MAC:1298-1299
  - Spec text: "`DEC X,OPFLIP-1` twice" per live carrier tanker
  - Implementation: `openings[cargo] = Math.max(0, openings[cargo] - 2)`. The ROM's byte DEC can underflow, but the min/max tables never over-subscribe a reachable board (tanker max <= 3, cargo maxes leave headroom), so a wrap is unreachable; clamping at 0 is the faithful, safe reading (reserve everything, launch nothing of that type).
  - Rationale: reproducing a byte-wrap that no reachable state hits would be bug-for-bug fidelity to an unreachable path; clamping matches the ROM in every reachable state.
  - Severity: minor
  - Forward impact: if a future table change let carrier tankers over-subscribe a cargo type, revisit (the ROM would wrap-then-cap; we clamp).

- **LINEY mapped to per-lane max `depth` with the threshold LINE_LONG_DEPTH = 1 - 0xCC/0xFF (~0.2)**
  - Spec source: AC-3; ALWELG.MAC:1370-1379 (`CMP I,0CC`)
  - Spec text: "launch a SPIKER on a short/dead line or a TANKER on a long one"
  - Implementation: a lane's LINEY-equivalent is the deepest enemy's `depth` (0 if empty); since our `depth` (0 far → 1 near rim) is the inversion of the ROM's INVAY, the `0xCC` threshold maps to ~0.2 of our depth — any enemy past it makes the line "long" (tanker), else short/dead (spiker).
  - Rationale: the ROM's LINEY is not stored in our sim; it is derivable from `s.enemies`, and the inverted-axis threshold is the faithful translation of `CMP I,0CC`.
  - Severity: minor
  - Forward impact: none — `tp1-8.nymcha` AC-3 pins the direction; the exact threshold is bracketed by that test + the source pin.

- **W-036 (CONFIRMED) re-anchored, NOT remediated, after its cited line was deleted**
  - Spec source: AC-5; CLAUDE.md citation-gate rules; the tempest-citation-gate lesson
  - Spec text: "remediated_by is ONLY for defects you actually removed"
  - Implementation: W-036 ("pulsars enter at 17") cited the deleted `level >= PULSAR_INTRO_WAVE` gate. It is a CONFIRMED match (not a divergence), so it is RE-ANCHORED to the WPULMX record (`rules.ts:699`) NYMCHA now reads, and its stale "our gates are level >= 17" claim clause updated — NOT marked remediated (that would write a phantom fix on a non-defect).
  - Rationale: the introduction-at-17 still matches the ROM; only the port's EXPRESSION moved (gate → table). Re-quoting is the correct handling for a CONFIRMED finding whose line moved.
  - Severity: minor
  - Forward impact: none — citation gate green (25/25).

### Reviewer (audit)

Every logged deviation independently checked (opus ROM re-decode + mutation tests + citation gate):

- **TEA #1 (AC-2 provable invariant vs idealized no-drop)** → ✓ ACCEPTED. The reservation IS per-cargo-type headroom, confirmed against ALWELG.MAC:1286-1303; the idealized global no-drop is not what the ROM guarantees. Superseded by the rework's wave-33 test.
- **TEA #2 (AC-3 directional bracket, not exact threshold)** → ✓ ACCEPTED — but the un-bracketed threshold constant is itself off (see Reviewer Item 6 below); the DIRECTION bracket is sound and mutation-proven.
- **TEA #3 (AC-1 through stepGame, not a nymcha export)** → ✓ ACCEPTED. Stable-surface testing; assertion-RED confirmed.
- **TEA rework #1 (AC-2 re-scoped wave-10→wave-33 so it BITES)** → ✓ ACCEPTED. Mutation-proven: neutering the reservation reddens it. The wave-10 test WAS vacuous (min-0 flipper cargo); wave-33 fuseball cargo (min 1) is the first wave a fresh-spawning cargo can be reserved. Correct.
- **TEA rework #2 (min-0-no-fresh-spawn pin)** → ✓ ACCEPTED. Independently confirmed every launch path gates on min!=0; the pin bites (wave-20 → 0 flippers). This is the load-bearing property.
- **TEA rework #3 (sim.spawn wave-4 re-seat)** → ✓ ACCEPTED. WTANMX wave 4 = 0 decoded byte-exact; the per-wave gap is real.
- **Dev #1 (delete rollSpawnKind + SPAWN_CYCLE_HARD_SCALE; re-seat direct tests)** → ✓ ACCEPTED. Preflight confirms 0 remaining refs; the escalation axis is non-ROM and correctly removed; coverage moved to tp1-8's per-wave tests. PM-visible balance change correctly flagged.
- **Dev #2 (reservation clamp-at-0)** → ⚠ **FLAGGED** — see Reviewer Item 5. The clamp is a defensible conscious deviation given the muted impact, BUT the rationale's "a byte wrap is unreachable" is FALSE (reachable wave-6 underflow proven). The COMMENT must be corrected, and the clamp-vs-wrap decision ruled/pinned.
- **Dev #3 (LINEY → depth threshold ~0.2)** → ⚠ **FLAGGED** — see Reviewer Item 6. Direction/inversion sound, but `1 - 0xCC/0xFF ≈ 0.2` is inconsistent with the file's own `(0xF0-byte)/WARP_ALONG_SPAN` mapping (0xCC → 0.161). Correct the constant + pin it.
- **Dev #4 (W-036 re-anchored, not remediated)** → ✓ ACCEPTED. Correct handling of a CONFIRMED finding whose cited line moved (WPULMX record NYMCHA reads); no phantom `remediated_by`. Citation gate green.

### Dev (implementation — green rework, round-trip 2)

- **Reservation clamp-at-0 kept, but its FALSE "unreachable" comment corrected to an honest conscious deviation (Reviewer Item 5)**
  - Spec source: Reviewer Item 5 ruling; ALWELG.MAC:1298-1303
  - Spec text: Reviewer — "clamp-at-0 is an ACCEPTABLE conscious deviation ... the 'unreachable' comment MUST be corrected."
  - Implementation: `rules.ts:895-903` comment now documents the REACHABLE wave-6 byte underflow (the ROM DECs raw → 0xFF → step-3 cap rescues to a phantom `free` opening) and states we clamp at 0 instead, with the muted-impact rationale (a min-0 type — the only over-subscribing case sub-33, flippers — never launches fresh, so the phantom opening only ever shifts openCount, never the spawned type). No logic change.
  - Rationale: the reservation is solver LOGIC, not a transcribed data byte; the ROM's underflow yields a phantom opening (a bug), so clamp-at-0 ("reserve everything") is the safer reading — but it must be labelled a deviation, not "unreachable."
  - Severity: minor (documentation correction of a real reachability claim)
  - Forward impact: if a future table lets a NON-min-0 cargo type over-subscribe, revisit (then the phantom opening could change a spawned type, not just openCount).

- **LINE_LONG_DEPTH corrected to the file's own INVAY->depth mapping (Reviewer Item 6)**
  - Spec source: Reviewer Item 6; ALWELG.MAC:1376 `CMP I,0CC`; WARP_ALONG_SPAN
  - Spec text: "set `LINE_LONG_DEPTH = (0xF0 - 0xCC) / WARP_ALONG_SPAN` (≈0.161)."
  - Implementation: `rules.ts:865` `1 - 0xcc/0xff (~0.2)` → `(0xf0 - 0xcc) / WARP_ALONG_SPAN (~0.161)`, decoding 0xCC through the same along->depth mapping the file already uses for spike heights, instead of an ad-hoc /0xFF. Full suite stayed 1411/1411 (the AC-3 directional test brackets the boundary).
  - Rationale: consistency with the file's own coordinate convention; the prior /0xFF normalization put the "long line" boundary ~9 along-units too near the rim.
  - Severity: minor
  - Forward impact: none; a LINEY boundary test (recommended by Reviewer) is not added — the AC-3 direction test holds and the constant is now single-sourced from WARP_ALONG_SPAN.

- **Stale stepNymphs JSDoc corrected (Reviewer Item 3)** — `sim.ts:177-179` now describes the live NYMCHA hatch (+ its decline path), not "rollSpawnKind stands in." Doc-only. Severity: minor. Forward impact: none.

## Upstream Context from tp1-7

### Routed Blocking Finding for tp1-8

**Conflict (blocking):** The assembled ROM is self-contradictory on waves 35-39 — WSPIMI:625 (dotted `35.`) gives spiker MIN 1, while WSPIMX:633 (un-dotted `35` = hex `0x35` = 53 → dead range) gives spiker MAX 0. A 1981 assembler typo (the dropped dot). tp1-7 transcribed WSPIMX verbatim per the audit's match-bytes ruling (`rules.ts:688` `start:53`), which surfaces the contradiction rather than papering over it.

**AC-6 Requirement:** tp1-8's NYMCHA population solver reads the full WSPIMI/WSPIMX min/max pair per wave and MUST decode what happens when min > max on these five waves (35-39) from the consuming ROM code. Do not assume clamp-to-min or clamp-to-max. Pin the behavior with a cited test.

### Routed Non-Blocking Findings for tp1-8

1. **Source-rules radix pins:** Add a source-rules ROM pin for every WSPIMI/WSPIMX record whose start or end is ≥ 0x0A, radix-decoded. The tp1-7 WSPIMX-record-6 radix block (comparing hex `0x35=53` vs decimal `35` at ALWELG.MAC:633) is the template. This prevents future un-dotted-hex typos from staying latent.

2. **CI-safe test profile:** tp1-7's source-rules tests run only where the copyrighted ROM source is present (`describe.skipIf(!sourceAvailable)`); they skip in CI. Consider a documented local test profile requiring `TEMPEST_SOURCE_DIR` so the radix-catch net is not off in CI.

## SM Assessment

**Setup complete — routing to O'Brien (TEA) for the red phase.**

Story tp1-8 is the expensive half of Cluster C4: the per-type min/max population solver (NYMCHA) with slot reservation for tanker cargo and spiker bias toward short lanes. This is the second-largest rewrite in the audit after the CAM (tp1-4).

**Verified before handoff:**
- Both declared dependencies are landed on `origin/develop`: tp1-6 (NYMPHS + 7-invader cap) is `done` and shipped.
- No sibling-checkout race: fetch shows no new branches/PRs mentioning tp1-8.
- Feature branch `feat/tp1-8-nymcha-per-type-population-solver` created from tempest `origin/develop`.
- tp1-7's blocking finding routed and documented in acceptance criteria 6-7: the WSPIMX waves 35-39 min>max contradiction must be decoded from the consuming ROM code.

**Guidance for TEA (red phase):**
- This is a ROM-fidelity story. The NYMCHA algorithm (ALWELG.MAC) and the min/max tables (WSPIMI/WSPIMX) are the sources of truth — transcribe VERBATIM and cite.
- AC-2: Slot reservation means tanker cargo is pre-allocated; a tanker split cannot deadlock the board when every slot is full. This is the ONE mechanism that makes the 7-cap safe.
- AC-3: Spiker bias means spikers prefer short lanes (NEEDIEST). This changes the board's shape — it is why ROM spikers spread across the well while ours pile into one lane.
- AC-6 (blocking): The ROM has min=1 > max=0 on waves 35-39. NYMCHA reads both and must decide what the ROM's code does when min > max — decode from ALWELG.MAC's NYMCHA consumer (typically a clamp or skip, but verify by reading the bytecode, not by guessing). Pin the behavior with a test cited to the ROM.
- AC-5: `npm test -- citations` must stay green. A comment-only edit to a cited file shifts pinned line numbers and breaks the citation gate — re-anchor after any edit.

**No upstream blockers. Clean handoff.**

## Branch Information

**Branch Strategy:** gitflow
**Branch:** feat/tp1-8-nymcha-per-type-population-solver
**Based on:** tempest origin/develop (commit 1b604b4)

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev). Verified: `npx vitest run` → **21 failed | 1401 passed (1422)**; `tsc --noEmit` clean; main citation gate (`tests/audit/citations.test.ts`) GREEN. Every failure is a tp1-8 assertion-RED (a right-reason value mismatch against today's memoryless roll), zero collateral to the other 1401 tests. The source-rules ROM anchor is **20/20 GREEN** (ROM truth — the durable backbone; skips in CI).

**The decode — NYMCHA, the per-type population solver (ALWELG.MAC:1266-1412, finding W-034):**

A hatching nymph (CONYMP -> NYMCHA) becomes a type by constraint satisfaction over the live board:

| Step | ROM | AC |
|------|-----|----|
| 1 | `openings[t] = max(0, WFLMAX[t] - FLIPCO[t])` per type (:1273-1282) | AC-1 max |
| 2 | each live CARRIER tanker: `DEC OPFLIP[cargo]` **twice** — reserve 2 of its cargo type (:1286-1303) | AC-2 |
| 3 | cap every opening at total free slots `WINVMX+1 - sum(FLIPCO)` (:1304-1320) | AC-1 |
| 4/5 | one open type -> take it; else satisfy any below-`WFLMIN` type FIRST, **nested in `openings!=0`** (:1332-1364) | AC-1 min, AC-6 |
| 6 | smart launch: both spiker+tanker open -> LINEY at the nymph's line -> spiker on short/dead, tanker on long, `CMP I,0CC` (:1366-1385) | AC-3 |
| 7 | fallback `RANDO2 AND 3, +1` — a type EXCLUDING flippers (:1386-1389) | AC-1 |

**AC-6 resolved (the routed blocking finding):** On waves 35-39 `WSPIMI`=1 (dotted `35.`, decimal) but `WSPIMX`=0 (un-dotted `35`=0x35=53, dead range). NYMCHA reads both. **MAX governs -> ZERO spikers.** Step 1 leaves `openings[spiker]=0`; every launch path (steps 4/5/6/7) is gated on `openings!=0`, and the `WFLMIN` starvation pass is NESTED inside that gate, so the min is UNREACHABLE. Not clamp-to-min (would give 1), not clamp-to-max-as-spawn-1..0 — the type is simply absent. Decoded from the consuming code, pinned both at source (`tp1-8.source-rules`, step 5 regex) and behaviourally (`tp1-8.nymcha`, 0 spikers across 60 seeds × waves 17-19/33-42).

**Test Files (3):**
- `tests/core/tp1-8.source-rules.test.ts` — the ROM backbone (`skipIf(!TEMPEST_SOURCE_DIR)`, **20/20 GREEN**): quarry fingerprint; the WTABLE loader fixing the type-index order `[flipper,pulsar,tanker,spiker,fuse]`; the five MIN tables + flipper MAX verbatim; **AC-7** — a record-walker asserting every WSPIMI/WSPIMX bound `>= 0x0A` is radix-decoded and DOTTED except the one known `:633` typo (a future dropped dot fails loudly); and NYMCHA's seven steps pinned as instruction sequences.
- `tests/core/tp1-8.nymcha.test.ts` — CI-safe behaviour through `stepGame` (assertion-RED, no new import): AC-6 zero-spikers on the 13 max-0 waves + the min>max contradiction; AC-1 per-type max cap (wave 17 flipper<=3/fuse=0, wave 10 tanker<=2, wave 22 fuse returns) and guaranteed min (wave 3 tanker, wave 4 spiker, every seed); AC-2 reservation invariant `flippers + 2*tankers <= WFLIMX(5)`; AC-3 spiker-short/tanker-long directional bias. Fixture guards prove the zeros are non-vacuous (spikers DO appear on waves 20/43).
- `tests/audit/tp1-8.citations.test.ts` — AC-5: W-034 (the population-solver DIVERGENCE, `ours` = the `rollSpawnKind` signature) must be `remediated_by: tp1-8` and keep its frozen historical quote.

### Rule Coverage

| Rule (lang-review/typescript.md) | Test(s) | Status |
|------|---------|--------|
| `x \|\| default` where 0 is falsy-but-VALID (#39) — the load-bearing rule | AC-6 zero-spiker suite: a max of 0 must yield EXACTLY 0, never a `\|\|`-restored default (the class that hid the tp1-7 typo / tp1-25 walk-off) | RED |
| Exhaustive dispatch `default: assertNever` (#34) | source-rules NYMTAD pin (the 5-way 0..4 type order); the behavioural suite exercises all five kinds | RED (behaviour) / GREEN (source anchor) |
| `Map.get()` / lookup undefined vs 0 (#42) | table lookups return an explicit per-wave 0 (a real "no openings"), never `undefined` — same class as the falsy-0 pin | RED |
| `as any` / non-null in tests (#69) | Phase-C self-check: 0 `as any`, 0 `@ts-ignore`; `!`/`?.` only on known-present regex/JSON | GREEN |
| Test quality — no vacuous assertions | Phase-C self-check (below) | GREEN |

**Rules checked:** 5 of the applicable TS lang-review checks have coverage; the **falsy-0** class is load-bearing here (a `|| fallback` on any min/max/opening lookup silently re-introduces a nonzero default and undoes AC-6).

**Self-check (Phase C):** 0 vacuous assertions. Every `.toBe(true)` asserts a computed boolean that can be false (`sawSpiker`/`sawFuse`/`sawTanker` fixture guards; token `.endsWith('.')` dottedness; the `35<=wave<=39` band). Every RED failure was inspected for right-reason (value mismatch vs the unfixed code), not import/typo noise. The one fragile end-to-end split fixture was REMOVED in favour of the provable per-type reservation invariant (see Design Deviations).

**Handoff:** To Dev (Julia) for the GREEN implementation. Traps, in order of how they bite:
1. **Type-index order is `[flipper,pulsar,tanker,spiker,fuse]`** (WTABLE :733-742 / NYMTAD :1423-1427) — NOT the `EnemyKind` union order. `FLIPCO`/`WFLMIN`/`WFLMAX`/`OPFLIP` all use it.
2. **min>max = MAX wins, min inert.** `openings[spiker]=max(0, WSPIMX-count)`; on 35-39 that is 0, and the WFLMIN pass is nested inside `openings!=0`, so 0 spikers. Transcribe `WSPIMI` verbatim (dotted `35.`=decimal, min 1) even though it never fires. Do NOT clamp-to-min.
3. **Cargo reservation (AC-2):** `DEC OPFLIP[cargo]` twice per LIVE carrier tanker, mapping `ZCARFU`->fuse index (:1294-1297). It reserves headroom under the CARGO type's max — it does not globally lock slots (see the AC-2 Question finding).
4. **Smart launch (AC-3):** derive a per-lane LINEY-equivalent from `s.enemies` (max depth per lane); spiker on short/dead line, tanker on long. Pick our coordinate equivalent of the `0xCC` threshold and cite it.
5. **New data:** the five MIN tables (`WFLIMI/WPULMI/WTANMI/WSPIMI/WFUSMI`) + `WFLIMX` are new; the four other MAX tables (`WTANMX/WSPIMX/WFUSMX/WPULMX`) already exist from tp1-7 — reuse them, do not re-transcribe.
6. **Back-pressure:** NYMCHA can return "no launch" (`TEMP0=0`); wire that into `sim.ts:205` so the nymph goes back in the queue (`n.py += 1`, latch), never hatches a wrong-type filler — this is what makes the reservation and the 7-cap co-operate.
7. **AC-5:** mark W-034 `remediated_by: tp1-8` AND run `node tools/audit/reanchor-citations.mjs --write` after editing `rules.ts` (adding tables shifts many cited lines).
8. **RNG discipline:** only the fallback + tanker-cargo draw from `s.rng`; the min/max/reservation/smart-launch are deterministic. A changed hatch-time draw count shifts seeded fixtures (the tp1-7 Dev sidecar landmine) — fix the FIXTURE, not the assertion, and run `tsc --noEmit` before handoff.

**No upstream blockers introduced. Clean RED handoff.**

## TEA Assessment — Red Rework (green→red, round-trip 1)

**Trigger:** During GREEN, Dev's line-by-line decode of NYMCHA found that **every launch path is gated on the type's min != 0** (single-type :1338, WFLMIN starvation :1355, random fallback :1392; the smart launch emits only spiker/tanker). Since WFLIMI gives the flipper min as 0 from wave 5, **the ROM never spawns fresh flippers past wave 4** — they come only from tanker splits. Consequence: the first RED's AC-2 test (wave 10, flipper cargo) passed **trivially** (flippers = 0), never exercising the reservation. User directed a RED rework. No implementation was written.

**Status:** RED. `npx vitest run tp1-8.nymcha sim.spawn` → the strengthened tests fail for the right reason; `tsc --noEmit` clean. Source-rules ROM anchor still 20/20.

**What changed in RED:**
1. **AC-2 strengthened** — moved onto wave 33 (WWTAC2 slot 2 = fuseball; WFUSMI min 1 / WFUSMX max 4, so the cargo type spawns FRESH). A pre-seeded fuseball-carrying tanker holds fresh fuseballs to `WFUSMX - 2 = 2` (mutation-contrasted: no tanker → fuseballs exceed 2). This ISOLATES the reservation; RED reason confirmed (seed 30: 3 fuseballs > 2 with no reservation).
2. **Min-driven rule pinned** — new `tp1-8.nymcha` test: a min-0 type never hatches fresh (wave 20 → 0 flippers), guarded by wave 1 (min 1 → flippers appear).
3. **sim.spawn wave-4 re-seated** — "spawns tankers" → "NO tanker" (WTANMX wave 4 = 0, the per-wave gap NYMCHA enforces). RED confirmed; the other 11 tests in that file stay green.

**Specified for Dev (GREEN) — the rollSpawnKind-DELETION collateral (NOT done in RED, by design):**
NYMCHA replaces `rollSpawnKind`. Deleting it (+ `SPAWN_CYCLE_HARD_SCALE`, `weightedPick`, the four `*_INTRO_WAVE` consts, `firstNonZeroWave` — all rollSpawnKind-only) breaks the rollSpawnKind-DIRECT tests. When you delete the function, also remove: `sim.spawn`'s `rolledKinds` helper + its "authentic ROM introduction schedule" describe; `sim.difficulty`'s `rollDistribution`/`hardFraction`/`rollSequence` helpers + its three `rollSpawnKind` describes (incl. the `SPAWN_CYCLE_HARD_SCALE` escalation — the axis is deleted, ROM-faithful); `tp1-7.contour-tables`'s `rolledKinds` helper. KEEP `levelParams`/`rolledCargo`/`rulesCode`-grep tests. Log a deviation per removal. Then run the full suite and expect further sim-driven collateral (re-seat ROM-truth, harden RNG-fragile fixtures — fix the fixture, not the assertion).

**Implementation guide (from the decode):** NYMCHA `nymcha(level, enemies, hatchLane, rng) → {kind,cargo} | null`, in the type order `[flipper,pulsar,tanker,spiker,fuseball]`: (1) `openings[t]=max(0, WFLMAX[t]-FLIPCO[t])`; (2) reserve 2 per carrier tanker's cargo type (map fuse cargo → fuse index; clamp at 0 — the ROM DECs raw, a wrap is unreachable given the tables); (3) cap at `NINVAD - live` free slots; (4) 1 open type → launch iff its min != 0; (5) else satisfy any below-min type first; (6) else if spiker & tanker both open, smart-launch (spiker on a short/dead lane, tanker on a long one — derive LINEY from per-lane max `depth`); (7) else `nextInt(rng,4)+1` walk to a min!=0 type with openings; null → nymph goes back. Wire into `sim.ts:205`; on null, `n.py += 1; latched = true`.

**Handoff:** To Dev (Julia) for GREEN.