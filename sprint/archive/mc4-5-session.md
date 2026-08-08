---
story_id: "mc4-5"
jira_key: "mc4-5"
epic: "mc4"
workflow: "tdd"
---
# Story mc4-5: Bonus city at a score threshold (CHEKBO/BONINL): recover the real bonus interval + claim

## Story Details
- **ID:** mc4-5
- **Jira Key:** mc4-5
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** mc4-2 (dependency)
- **Branch:** feat/mc4-5-bonus-city-bonus-interval
- **PR:** https://github.com/slabgorb/arcade/pull/118

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-08T15:36:41Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-08T14:19:31Z | 2026-08-08T14:22:38Z | 3m 7s |
| red | 2026-08-08T14:22:38Z | 2026-08-08T14:56:26Z | 33m 48s |
| green | 2026-08-08T14:56:26Z | 2026-08-08T15:10:09Z | 13m 43s |
| review | 2026-08-08T15:10:09Z | 2026-08-08T15:24:36Z | 14m 27s |
| red | 2026-08-08T15:24:36Z | 2026-08-08T15:31:03Z | 6m 27s |
| green | 2026-08-08T15:31:03Z | 2026-08-08T15:33:28Z | 2m 25s |
| review | 2026-08-08T15:33:28Z | 2026-08-08T15:36:41Z | 3m 13s |
| finish | 2026-08-08T15:36:41Z | - | - |

## Acceptance Criteria

1. The bonus-city mechanic follows CHEKBO (W3MAIN.MAC:5621): the bonus interval is selected via OPTIO2 masked by BONMSK indexing the BONINL table, and one bonus city is awarded per interval the running score crosses.

2. A new claim is created for the bonus interval (BONINL / shipped default DIP setting) derived byte-exact from the source; the incorrect MC-SCITYM citation is NOT reused.

3. Bonus cities are added via the mc4-2 regeneration path, respecting the city cap; the same threshold is not double-counted; citations.test.ts and purity.test.ts stay green.

## Technical Approach

### Quarry (confirmed from sprint assessment)
- **CHEKBO routine:** `W3MAIN.MAC:5621` (label); called from `W3MAIN.MAC:4783` (`JSR CHEKBO ;CHECK FOR BONUS CITIES`). Reads OPTIO2 masked by BONMSK, shifts to index BONINL, then counts bonus cities via a `SBC AY,BONINL` divide loop (`:5661`).
- **BONINL interval table:** `W3MAIN.MAC:5703` → `BONINL: .WORD 0100,0120,0140,0150,0180,0200,0080` ; `BONINH = BONINL+1` (`:5705`).
- **BONMSK:** `70` at `W3COMN.MAC:197` (`;BONUS INTERVAL OPTION (OPTIO2) MASK`).
- **MC-SCITYM (incorrect citation):** `03` at `W3COMN.MAC:195` (`;5 CITIES AT START (OPTIO2 MASK)`) — used only as `AND I,SCITYM` for starting cities, NEVER compared to score. Do NOT reuse for bonus interval.
- **Dependency:** mc4-2 (DONE) provides city-cap + regeneration path in `plugins/missile-command/src/core/wave.ts`; award bonus cities through that path, respecting city cap.

### Implementer-Owned Derivation
The BONINL byte-exact interval + shipped-default DIP selection is a **derivation the TEA/Dev must perform**. A key tell: `W3MAIN.MAC` has NO `.RADIX` directive, and BONINL contains the digit `8` (`0180`, `0080`), ruling out octal despite leading zeros. The implementer must resolve the radix from the source and create a NEW claim (not MC-SCITYM).

**Note on citation gates:** The project's citation gate checks for uncited literals in JSDoc (`/** */`) comments. Use `//` line comments for cited numbers in core instead. New `.BYTE`/`.WORD` tables need a DERIVED note + a value-consistency block.

## Delivery Findings

No upstream findings at setup.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): the GREEN design is fixed by the user's "Faithful PLIVES" ruling — Dev adds a cumulative `citiesLost` counter to `GameState` (ROM CIDOWN, `W3MAIN.MAC:2255`), incremented in the damage path when a real city dies, and changes `game.ts`'s `'between'` reserve from the flat `START_CITIES` to `START_CITIES − citiesLost + bonusCitiesEarned(score, interval)`. `bonusInterval`/`bonusCitiesEarned` land in `src/core/wave.ts` (it owns the regen path). Affects `plugins/missile-command/src/core/{wave.ts,game.ts}` (new pure fns + reserve wiring + counter). *Found by TEA during test design.*
- **Improvement** (non-blocking): BONLVL dedupe needs NO separate state field — `bonusCitiesEarned(score)` is the cumulative `floor(score/interval)`, so `earned − 0` is inherently the delta and re-evaluating at a higher score in the same band adds nothing. Affects `plugins/missile-command/src/core/wave.ts` (keep the reserve a pure function of `score`+`citiesLost`, no `bonusLevel` field required). *Found by TEA during test design.*
- **Gap** (non-blocking): stale forward-reference — `wave.ts:104-106` and `game.ts:127-128` both attribute the bonus-city entitlement to "mc4-3 … (CHEKBO)", but that award was split out to **mc4-5** (this story). Affects `plugins/missile-command/src/core/{wave.ts,game.ts}` (retarget the comments to mc4-5 when GREEN lands). *Found by TEA during test design.*
- **Question** (non-blocking): the AC2 guard `NO bonus claim reuses the MC-SCITYM citation` is VACUOUS until Dev files the `BONINL`/`BONMSK` claims — it is paired with the two claim-existence tests (RED now) and gains teeth the moment they land. Reviewer: treat it as an activates-with-feature guard, not a live one at RED. Affects `plugins/missile-command/tests/bonus-city.test.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking): `citations.test.ts §4` will force the new `wave.ts` constants (the BONINL table + BONMSK) to be claim-backed — use `//` line comments (not `/** */`) for cited numbers in core, and give the new `.WORD` table a DERIVED note + a value-consistency block (project memory: mc citations scanner leaks JSDoc numbers). Affects `plugins/missile-command/src/core/wave.ts` + `docs/rom-study/claims/`. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): all three stale forward-references TEA flagged were fixed in this commit — `wave.ts:104` (`mc4-3 → mc4-5 feeds the entitlement`) and the `game.ts` `'between'` comment (dropped the "START_CITIES until mc4-5" placeholder note, replaced with the PLIVES derivation). Affects `plugins/missile-command/src/core/{wave.ts,game.ts}` (done). *Found by Dev during implementation.*
- **Improvement** (non-blocking, transparency for Reviewer): Dev extended `citations-source.test.ts` — added `BONINL` to the `DERIVED` exemption and a new BCD `×100` value-consistency `it` block. This is the required apparatus for a numeric non-EQU `.WORD` claim (the mc4-1 wave-table / mc8-2 sound-table precedent): without the exemption the "non-EQU claim must be a kind-tag" guard would reject a numeric BONINL claim. The block ADDS a check (each claimed interval must be a real BCD entry ×100 of its cited `.WORD` line) — it hardens AC2, never weakens it. Affects `plugins/missile-command/tests/citations-source.test.ts`. *Found by Dev during implementation.*
- **Note** (non-blocking): the disabled-DIP interval is represented as `Infinity` (so `floor(score/Infinity) === 0`), satisfying TEA's observable "no bonus at any score" without a magic sentinel. `bonusInterval(0)` (bits-clear default) is used in `game.ts` because OPTIO2/DIP switches are not modelled until a later epic. Affects `plugins/missile-command/src/core/{wave.ts,game.ts}`. *Found by Dev during implementation.*

### Dev (implementation, round 2 rework)
- **Note** (non-blocking): no production code change this round — the Reviewer's finding was a test-coverage gap and `game.ts:212`'s `citiesLost` increment was already correct. Confirmed GREEN after TEA's guard tests (missile-command 817/817, lint clean). Affects nothing (verification only). *Found by Dev during implementation (round 2).*

### TEA (test design, round 2 rework)
- **Resolved** (non-blocking): closed the Reviewer's blocking gap — added a `mc4-5 AC1/AC3 — the award through REAL stepGame play` block to `bonus-city.test.ts` (3 tests). They drive a genuine city destruction through `stepGame`'s damage path (an inbound `arrived` ICBM at city 0, budget spent), asserting (a) `citiesLost` increments to 1, (b) a real loss stays lost at the wave-end without a bonus (heals to 5), (c) it is recovered once the score crosses the 10,000 threshold (heals to 6). Verified to FAIL against the increment-removed mutant (2/3 red), so the guard has teeth; passes on the delivered (correct) code. Affects `plugins/missile-command/tests/bonus-city.test.ts` (done, committed `f22a1c85`). *Found by TEA during test design (round 2).*

### Reviewer (code review)
- **Gap** (blocking): the `citiesLost` INCREMENT path (`game.ts:212`, real city-death → counter) has NO test coverage — a mutation removing it passed 61/61. Every integration test presets `citiesLost` via `betweenState`, and `mc4-playthrough` fakes deaths, so AC1/AC3's *observable* ("a bonus city is awarded as the running score crosses… via the regen path") is never exercised through real `stepGame` play. Affects `plugins/missile-command/tests/` (add an integration test that drives a real city death through `stepGame`, then a wave-end, asserting the loss is tracked and — end-to-end — a lost city stays lost without a bonus and is recovered when the score crosses a threshold). The production code is correct; this is a missing test. *Found by Reviewer during code review.* → **RESOLVED (round 2):** TEA added the play-driven guard block; re-running the increment-removal mutation now FAILS 2 tests (was 0). Gap closed.
- No further upstream findings during round-2 code review. *Found by Reviewer during code review (round 2).*

## Design Deviations

No deviations at setup.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Faithful PLIVES entitlement replaces the flat START_CITIES regen reserve**
  - Spec source: context-story-mc4-5.md, AC3 (+ user scope ruling, 2026-08-08)
  - Spec text: "Bonus cities are added via the mc4-2 regeneration path, respecting the city cap; the same threshold is not double-counted"
  - Implementation: the integration tests pin the wave-end reserve as `START_CITIES − citiesLost + bonusCitiesEarned(score)` (ROM PLIVES = STCITY − CIDOWN + Σbonus, healed to `min(PLIVES, NCITY)`), so a genuinely destroyed city STAYS lost until a bonus threshold recovers it — where mc4-2/mc4-4 shipped a placeholder that heals every dead city back to 6 each wave.
  - Rationale: bonus cities are only observable if losses persist; with `START_CITIES == NCITY == 6` a naive additive reserve is capped away, so the user ruled the faithful model.
  - Severity: major
  - Forward impact: minor — mc4-5 GREEN rewires `game.ts`'s between-branch reserve; `mc4-playthrough.test.ts:152-157` keeps passing (its dead city is faked, not counted, so `citiesLost == 0` → still heals to 6), so no sibling test needs editing.

### Dev (implementation)
- No deviations from spec — the implementation matches TEA's tests and the ACs. (TEA's `citiesLost` field + `START_CITIES − citiesLost + bonusCitiesEarned(score)` reserve, per the user's Faithful-PLIVES ruling, was implemented as specified; `mc4-playthrough.test.ts:152-157` was confirmed to still pass unchanged, as TEA predicted.)

### Reviewer (audit)
- **Faithful PLIVES entitlement replaces the flat START_CITIES regen reserve** → ✓ ACCEPTED by Reviewer: matches the user's 2026-08-08 scope ruling and the ROM (PLIVES = STCITY − CIDOWN + Σbonus, healed to min(PLIVES, NCITY)); verified `mc4-playthrough.test.ts:152-157` still passes because its dead city is faked (citiesLost stays 0), so no sibling test is silently broken. Sound.
- **Dev's `citiesLost`/reserve implementation** → ✓ ACCEPTED by Reviewer: `game.ts:212` `state.citiesLost + cityDeaths` is correct and carried in both play-path returns; the `game.ts` reserve `START_CITIES − state.citiesLost + bonusCities` matches spec (mutation M3 confirms the sign is guarded). The Infinity disabled-sentinel and the `BONMSK & -BONMSK` low-bit index are both correct (mutations M4, M6 caught their corruption).
- **Dev's extension of `citations-source.test.ts` (BONINL → DERIVED + BCD block)** → ✓ ACCEPTED by Reviewer: required apparatus for a numeric non-EQU `.WORD` claim (mc4-1/mc8-2 precedent); the block ADDS teeth (mutation M5: a fabricated claim value is caught), never weakens. Transparent and correct.
- **Round 2:** the rework added only a test block (`bonus-city.test.ts`), no production-code change — no new spec deviations introduced. Existing deviations remain ACCEPTED.

## SM Assessment

Setup complete; routing to TEA for the RED phase. Premise measured against the current tree before setup (SM discipline — `sm-setup` renders the description into Background as fact).

**Premise verified — current and accurate, not stale.** This story is the corrected split-out of mc4-3 part (b); mc4-3's archive confirms the split was made at that story's setup. Every citation resolves against `plugins/missile-command/reference/source/`:
- CHEKBO at `W3MAIN.MAC:5621` (called `:4783`); BONINL table `.WORD 0100,0120,0140,0150,0180,0200,0080` at `:5703`; BONMSK=`70` at `W3COMN.MAC:197`.
- MC-SCITYM=`03` at `W3COMN.MAC:195` is confirmed the starting-cities mask — used only as `AND I,SCITYM` (`W3INT.MAC:1291`, `W3MAIN.MAC:3871`), never compared to score. Its only appearance in game code is a correct JSDoc in `core/field.ts` (starting cities); no score-threshold residue exists to remove.

**Dependency mc4-2 (DONE)** provides the city-cap + regen path in `core/wave.ts`; **relation mc4-3 (DONE)** provides the running score. No either/or in the ACs — a single unambiguous deliverable, so no user ruling was required. ACs cross-checked verbatim against `sprint/epic-mc4.yaml` (three distinctive phrases, one match each side).

**Handed to the implementer (not resolved by SM):** the BONINL byte-exact interval + shipped-default DIP selection is a derivation TEA/Dev own. Tell passed along: `W3MAIN.MAC` has no `.RADIX` directive and BONINL contains the digit `8` (`0180`, `0080`), which rules out octal — the radix must be resolved from source, and a NEW claim created (never MC-SCITYM).

**Board:** sibling branch probe clean, no live session elsewhere owns mc4-5; claim committed (`dff44f81`) and branch `feat/mc4-5-bonus-city-bonus-interval` pushed for sibling visibility; story stamped `in_progress`.

## TEA Assessment

**Tests Required:** Yes
**Reason:** New pure game logic (bonus interval + bonus-city award), a new byte-exact ROM claim, and an end-to-end award through the regen path — all falsifiable.

**Test Files:**
- `plugins/missile-command/tests/bonus-city.test.ts` — the whole RED for mc4-5.

**Tests Written:** 19 tests (15 RED, 4 passing guards) across all three ACs.
**Status:** RED (failing — ready for Dev).

### ROM derivation encoded (the byte-exact truth Dev must match)
- Radix: `W3MAIN/W3COMN` are `.RADIX 16` (`W3COMN.MAC:1`; W3MAIN inherits via `.INCLUDE`). CHEKBO's divide runs under `SED`, so the hex `.WORD`s are read as **BCD**.
- `BONMSK = 0x70` (`W3COMN.MAC:197`) → DIP field is **bits 4-6**; index `= (optio2 & 0x70) >> 4` ∈ 0..7. Field all-ones (index 7) → bonus **disabled** (`CMP BONMSK / IFNE`).
- `BONINL = .WORD 0100,0120,0140,0150,0180,0200,0080` (`W3MAIN.MAC:5703`) → BCD `100,120,140,150,180,200,80`; CHEKBO divides `LSCORM:LSCORH` (score/100), so interval **in points = BCD × 100** → `[10000,12000,14000,15000,18000,20000,8000]`. Every entry is a ×100 multiple, so `bonusCitiesEarned(score) = floor(score / intervalPoints)` exactly (nested-floor identity; dropped low BCD byte never shifts the floor).
- Shipped default DIP = OPTIO2 bits clear (same convention as `field.ts` `START_CITIES = STCITY[0]`) → index 0 → **10,000 pts/city** (matches the real machine's factory bonus).
- `MC-SCITYM` (=3, `W3COMN.MAC:195`) is the starting-cities mask (`AND I,SCITYM` only), NOT a score threshold — explicitly guarded against reuse.

### Test map
- **AC1/AC2** `bonusInterval(optio2)` — default 10,000; full BONINL mapping; BONMSK-bit isolation (SCITYM bits ignored); disabled field earns 0; interval ≠ MC-SCITYM's 3.
- **AC1/AC3** `bonusCitiesEarned(score, interval)` — floor per interval crossed; boundary exactness; same-band no-double-count; scales; honours a non-default 8,000 DIP.
- **AC2** a committed **BONINL** claim (`W3MAIN.MAC:5703`) + **BONMSK** claim (`W3COMN.MAC:197`); no bonus claim reuses line 195 / symbol SCITYM / value 3.
- **AC1/AC3 integration** via `stepGame` wave-end: lost city stays lost sans bonus (heals to 5); a threshold recovers one; banking (one bonus → one of two losses); same threshold not double-counted across the beat; NCITY cap respected.

### Rule Coverage
| Rule / project invariant | Test(s) | Status |
|---|---|---|
| No uncited src/core literal (citations.test.ts §4) | drives Dev to file BONINL/BONMSK claims; `a claim pins BONINL…` / `…BONMSK…` | RED |
| Byte-exact claim verbatim (checker) | claim-existence tests point at the exact source lines | RED |
| Core purity (purity.test.ts) | pure fns specified clock-/entropy-/shell-free in the loader contract | green (unchanged) |
| ROM-faithful mechanism, not a paraphrase | index→interval→floor + disabled field + BCD×100 mapping | RED |
| Regression: MC-SCITYM must not reappear | `interval is NOT MC-SCITYM (=3)` + `NO bonus claim reuses…195/SCITYM/3` | RED / guard |
| Determinism of the award | integration observables are pure functions of `score`+`citiesLost` | RED |

**Rules checked:** the AC3-named gates (citations, purity) plus the derivation/regression invariants above.
**Self-check:** no `let _ =`, no `assert(true)`. One guard — `NO bonus claim reuses MC-SCITYM` — is vacuous *at RED* (empty filter until the claims exist) but is paired with the two claim-existence tests that ARE red and gains teeth with the feature; kept deliberately and flagged in Delivery Findings for the Reviewer.

**RED verified:** `npx vitest run --project missile-command` → **15 failed | 797 passed**; all 15 failures are in `bonus-city.test.ts`. `npm run lint` (tsc --noEmit) is green (new exports dynamic-imported; `citiesLost` read/written through a widened view). `citations.test.ts` and `purity.test.ts` remain green.

**Handoff:** To Dev (Loki Silvertongue) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/missile-command/src/core/wave.ts` — new pure exports `bonusInterval(optio2)` (BONINL indexed by `optio2 & BONMSK`, bits 4-6; all-ones ⇒ `Infinity`/disabled; BCD ×100 → points, default 10,000) and `bonusCitiesEarned(score, intervalPoints)` = `floor(score/interval)`; constants `BONMSK`, `BONINL_POINTS`; stale mc4-3 comment retargeted to mc4-5. Citations kept in `//` comments (JSDoc has no bare numbers) so the §4 scanner stays clean.
- `plugins/missile-command/src/core/game.ts` — `GameState.citiesLost` (ROM CIDOWN), init 0, incremented by city deaths in both play-path returns; wave-end REGEN reserve is now `START_CITIES − citiesLost + bonusCitiesEarned(state.score, bonusInterval(0))`, capped at NCITY by `regenerateCities`; placeholder comment replaced with the PLIVES derivation.
- `plugins/missile-command/docs/rom-study/claims/bonus.json` — new byte-exact claims: `MC-BONMSK` (=112, `W3COMN.MAC:197`) and `MC-BONINL-{10000,12000,14000,15000,18000,20000,8000}` (`W3MAIN.MAC:5703`). MC-SCITYM is not reused.
- `plugins/missile-command/tests/citations-source.test.ts` — `BONINL` added to `DERIVED`; new BCD-×100 value-consistency block (each claimed interval must be a real BONINL BCD entry ×100 of its cited `.WORD` line). See the Dev delivery finding for the transparency note.

**Tests:** missile-command **814/814** (bonus-city 19/19); orchestrator **457/457**; `npm run lint` (tsc --noEmit) green. `citations.test.ts`, `citations-source.test.ts`, `purity.test.ts` green.
**Branch:** `feat/mc4-5-bonus-city-bonus-interval` (pushed — `466345dd`).

**Self-review:** wired end-to-end through `stepGame` (not just pure fns); follows the mc4-1/mc4-2 claim + citation patterns; all three ACs met (AC1 interval mechanism + one-per-crossing; AC2 new byte-exact claim, not MC-SCITYM; AC3 award via the mc4-2 regen path, cap respected, no double-count, citations/purity green). Disabled DIP handled via `Infinity`. No debug code.

**Handoff:** To Reviewer (Heimdall) for code review.

## Subagent Results

Only `reviewer-preflight` is enabled on this project; the other eight specialists are disabled in `.pennyfarthing/config.local.yaml` (`workflow.reviewer_subagents.*: false`). With the specialists off, the Reviewer's primary tool is a MUTATION BATTERY (below), run against both the behavior gate (`bonus-city.test.ts`) and the citation gates (`citations.test.ts`, `citations-source.test.ts`).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — green suite (1314 tests), lint pass, no debug code; confirmed code sound but is mechanical-only (cannot see coverage gaps) |
| 2 | reviewer-edge-hunter | Skipped | disabled | — | covered by mutation battery |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | — | covered by mutation battery |
| 4 | reviewer-test-analyzer | Skipped | disabled | — | covered by mutation battery (M1 = the test-coverage finding) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | — | comments audited manually (stale mc4-3 refs fixed) |
| 6 | reviewer-type-design | Skipped | disabled | — | covered by mutation battery |
| 7 | reviewer-security | Skipped | disabled | — | N/A — pure sim core, no I/O/auth |
| 8 | reviewer-simplifier | Skipped | disabled | — | manual: `BONMSK & -BONMSK` low-bit index noted, defensible |
| 9 | reviewer-rule-checker | Skipped | disabled | — | manual rule pass (purity, citations, HUD-figure) |

**All received:** Yes (1 enabled returned; 8 disabled)
**Total findings:** 1 confirmed (blocking), 0 dismissed, 0 deferred

### Mutation Battery (6 mutations — the teeth check with specialists off)
| # | Mutation | Expected | Result |
|---|----------|----------|--------|
| M1 | `game.ts` remove `citiesLost` increment | a test fails | **SURVIVED (61/61)** — increment path untested |
| M2 | `wave.ts` `BONINL_POINTS[0]` 10000→9000 | fail | CAUGHT (behavior + citations §4) |
| M3 | `game.ts` reserve `− citiesLost` → `+` | fail | CAUGHT (integration ×3) |
| M4 | `wave.ts` remove disabled-interval guard | fail | CAUGHT (disabled test) |
| M5 | `bonus.json` claim value 10000→10500 | fail | CAUGHT (citations-source BCD block + §4) |
| M6 | `wave.ts` index divisor `/16`→`/2` | fail | CAUGHT (mapping test) |

## Reviewer Assessment (Round 1 — REJECTED, superseded by Round 2 APPROVED below)

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [TEST] | The `citiesLost` increment — real city-death → the counter that drives the whole faithful-PLIVES reserve — has zero test coverage (mutation M1 survived 61/61). Integration tests preset `citiesLost`; `mc4-playthrough` fakes deaths; nothing exercises AC1/AC3's observable award through real `stepGame` play. A regression reverts to the placeholder (free-heal) behavior mc4-5 exists to fix, with CI green. | `plugins/missile-command/src/core/game.ts:212` (untested); `plugins/missile-command/tests/` (missing test) | Add an integration test that drives a REAL city death through `stepGame` (not preset state) into a wave-end, asserting (a) the loss is counted and (b) end-to-end a lost city stays lost without a bonus and is recovered once the score crosses a BONINL threshold. Code is correct — this is a test gap. |

**Data flow traced:** running score → `bonusCitiesEarned(score, bonusInterval(0))` → wave-end reserve `START_CITIES − citiesLost + bonus` → `regenerateCities(cities, reserve)` capped at NCITY. The consumer side is correct and guarded (M3/M4/M6 caught corruption); the producer side (`citiesLost` populated from real deaths) is correct but unguarded (M1).

**Pattern observed:** faithful ROM port (CHEKBO/BONINL/PLIVES) with byte-exact claims — good; mirrors mc4-1/mc4-2 (`wave.ts:90+`, `bonus.json`).

**Error handling:** negative/oversized reserve is safe — `regenerateCities` clamps via `Math.max(0, target − alive)` and `min(reserve, cap)`; disabled DIP → `Infinity` → 0 cities. Verified.

**Devil's Advocate:** The strongest case that this is broken: the entire story is "make lost cities persist so a score threshold can recover them," yet not one test watches a city actually die in play and then be recovered (or not) at the next wave-end — every integration test hand-builds the wave-end state with `citiesLost` already set to the number it wants. So the suite proves the *reserve arithmetic* and proves the *pure functions*, but it never proves the two are *connected to real gameplay*. If a careless refactor drops the `+ cityDeaths` (or a future frame-order change stops routing city deaths through the counted path), the game silently reverts to healing every city to 6 each wave — the exact bug mc4-5 was filed to kill — and every test, lint, and the citation gates stay green. That is false confidence on the headline AC, which is why this is HIGH rather than a nit. Everything else survived adversarial mutation: the BCD×100 decode, the bit-field index, the disabled sentinel, the no-double-count floor, the cap, and the claim-value consistency all have teeth. The one hole is real and cheap to close with a single play-driven integration test.

**Handoff:** Back to TEA (red rework) for the missing play-driven integration test.

## Subagent Results (Round 2)

Round-2 change is a single test file (`bonus-city.test.ts`, +47 lines); production code unchanged since round 1. Specialists remain disabled; the Reviewer re-ran the decisive mutation against the delivered code.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | round-1 preflight still valid (code unchanged); re-verified mechanically — full suite 817/817, lint clean, no debug code in the +47 lines |
| 2 | reviewer-edge-hunter | Skipped | disabled | — | covered by mutation re-verification |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | — | n/a |
| 4 | reviewer-test-analyzer | Skipped | disabled | — | mutation M1 re-run IS the test-quality check (now caught) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | — | n/a |
| 6 | reviewer-type-design | Skipped | disabled | — | n/a |
| 7 | reviewer-security | Skipped | disabled | — | n/a — pure sim core |
| 8 | reviewer-simplifier | Skipped | disabled | — | n/a |
| 9 | reviewer-rule-checker | Skipped | disabled | — | n/a |

**All received:** Yes (1 enabled; 8 disabled)
**Total findings:** 0 new; the 1 round-1 blocking finding is RESOLVED.

### Mutation re-verification (round 2)
| Mutation | Round 1 | Round 2 (delivered code) |
|----------|---------|-------------------------|
| Remove `citiesLost` increment (M1) | SURVIVED (61/61) | **CAUGHT** — 2 play-driven tests fail |

## Reviewer Assessment

**Verdict:** APPROVED

**Round-2 verification:** The one blocking finding from round 1 (untested `citiesLost` increment) is closed. TEA added `mc4-5 AC1/AC3 — the award through REAL stepGame play` (3 tests) that drive a genuine city death through `stepGame`'s damage path; re-running the increment-removal mutation against the delivered code now fails 2 of them (was 0 in round 1). Full missile-command suite 817/817, orchestrator unaffected, `tsc --noEmit` clean, `citations.test.ts`/`citations-source.test.ts`/`purity.test.ts` green.

**Data flow traced:** running score → `bonusCitiesEarned(score, bonusInterval(0))` → wave-end reserve `START_CITIES − citiesLost + bonus` → `regenerateCities(cities, reserve)` capped at NCITY. Both ends are now guarded — the consumer by M2/M3/M4/M6, the producer (`citiesLost` from real deaths) by the round-2 play-driven block.

**Pattern observed:** faithful ROM port (CHEKBO/BONINL/PLIVES, byte-exact claims) mirroring mc4-1/mc4-2 — `wave.ts:90+`, `docs/rom-study/claims/bonus.json`.

**Error handling:** negative/oversized reserve safe (`regenerateCities` clamps); disabled DIP → `Infinity` → 0 cities. Verified.

**Observations (≥5):**
- `[VERIFIED]` BCD×100 interval decode is source-consistent — evidence: `citations-source.test.ts` mc4-5 block re-derives each BONINL value from the `.WORD` line; mutation M5 catches a fabricated value.
- `[VERIFIED]` bit-field index correct — evidence: `wave.ts` `field / (BONMSK & -BONMSK)`; mutation M6 (`/2`) is caught.
- `[VERIFIED]` no double-count — evidence: `bonusCitiesEarned` is a cumulative floor; same-band tests + integration threshold tests pass.
- `[VERIFIED]` NCITY cap respected — evidence: cap test + `regenerateCities(min(reserve,cap))`.
- `[VERIFIED]` MC-SCITYM not reused — evidence: `bonus.json` cites `W3COMN.MAC:197`/`W3MAIN.MAC:5703`, never `:195`; AC2 regression guard active now that claims exist.
- `[VERIFIED]` `citiesLost` increment now guarded — evidence: round-2 mutation re-run fails 2 tests.

**Deviations:** all ACCEPTED (see `### Reviewer (audit)`); round-2 introduced none.

**Handoff:** To SM (Baldur) for finish-story.