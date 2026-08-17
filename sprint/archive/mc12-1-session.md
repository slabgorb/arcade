---
story_id: "mc12-1"
jira_key: "mc12-1"
epic: "mc12"
workflow: "tdd"
---
# Story mc12-1: Bound the MIRV to a SINGLE split so one missile can't cascade into a swarm

## Story Details
- **ID:** mc12-1
- **Jira Key:** mc12-1
- **Type:** bug
- **Points:** 5
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none
- **Branch:** feat/mc12-1-bound-mirv-single-split
- **PR:** #490 (code, → develop) — awaiting user merge; archive PR to follow post-merge

## Story Summary

Bound the MIRV to a SINGLE split so one missile can't cascade into a swarm. Today mirvSplit (core/mirv.ts:50) launches 3 children AT parent.pos — inside the MIRV band [MIRVLO=128,MIRVHI=160] (W3COMN.MAC:159/161) — and game.ts:597-600 keeps the split parent with no spent-marker, so the in-band cluster re-qualifies (mirvEligible, mirv.ts:38) and re-splits every frame into the 6+ fan the owner screenshotted. Mark a MIRVed ICBM AND its children spent so mirvEligible returns false for both; pin the bound to REV-01's single-shot mechanism (MIRVIX single slot W3MAIN.MAC:227; consume W3MAIN.MAC:2011-2017; POTENT '<=3 shots from a MIRV' W3MAIN.MAC:2717). ROM-always-wins: no invented difficulty knob. Pure core; purity + citations gated.

## Acceptance Criteria

- AC1: an Icbm carries a one-shot MIRV-spent marker set on BOTH the split parent and every child in mirvSplit (core/mirv.ts); mirvEligible (mirv.ts:38) returns false for an already-split ICBM and for any MIRV child. A test drops ONE in-band ICBM and asserts the total children it produces across ALL frames it spends in [128,160] is at most MIRV_MAX_CHILDREN (3) — not a per-frame cascade. The test reddens against today's re-splitting code (mutation-proven).

- AC2: the single-shot bound is pinned to REV-01, not invented — the spent mechanism/comment cites the MIRVIX single-slot model (W3MAIN.MAC:227) and its consume (W3MAIN.MAC:2011-2017), and the POTENT cap 'NO MORE THAN 3 SHOTS FROM A MIRV' (W3MAIN.MAC:2717). Every new/changed src/core constant has a claims/*.json entry; citations.test.ts and purity.test.ts stay green (ROM-always-wins — no difficulty tuning parameter is added).

- AC3: a population invariant — from a seeded createGame stepped through a MIRV wave, the on-screen ICBM count never exceeds NICBMS=8 and the number of MIRV events per originating ICBM is exactly one; this holds where today's code violates it (mutation-proven). Felt winnability/progression is confirmed separately in the mc12-4 playtest.

- AC4: the authentic split SHAPE is unchanged — children still launch from the parent's position toward RNG-picked live structures at the parent's velocity; only the RE-qualification of already-split warheads is removed.

## Workflow Tracking

**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T23:16:47Z

### Phase History

| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T22:53:22Z | 2026-08-16T22:55:53Z | 2m 31s |
| red | 2026-08-16T22:55:53Z | 2026-08-16T23:07:38Z | 11m 45s |
| green | 2026-08-16T23:07:38Z | 2026-08-16T23:10:37Z | 2m 59s |
| review | 2026-08-16T23:10:37Z | 2026-08-16T23:16:47Z | 6m 10s |
| finish | 2026-08-16T23:16:47Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings yet.

### Reviewer (code review)
- No upstream findings. The story premise was accurate against the tree, the fix is minimal and complete, and all four ACs are covered by mutation-proven tests. mc12-4 (visual playtest) remains the correct owner of the felt-winnability confirmation, per AC3.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

**Dev (green, mc12-1) — no spec deviation; one edge-case decision worth the Reviewer's eye.**
In `stepCombat` I guard the parent-marking on `splitChildren.length === 0` rather than
`mirvAt < 0`. Effect: the parent is marked spent (consumes its MIRVIX slot) **only when a
split actually fires**. The sole case where `mirvAt >= 0` yet no child is produced is
`liveTargets === []` (no live structures → the game is effectively over), and there `mirvSplit`
returns `[]`; leaving the parent un-marked there preserves the exact pre-mc12 behaviour of that
dead-end frame. Whenever targets exist the `openSlots > 0` gate guarantees ≥1 child, so the
parent is always marked on a real split — this is the ROM's "consume on fire" semantics, not a
weakening. `mirvSpent` is `readonly` + optional; other roster entries pass through the `.map` by
reference (identity preserved), only the split index is a fresh `{...icbm, mirvSpent:true}`.

### Reviewer (audit)
- **Dev's `splitChildren.length === 0` guard (parent marked spent only on a real split)** → ✓ ACCEPTED by Reviewer: sound and faithful. Traced every branch: `suppressMirv`, `explosions ≥ 12`, and `openSlots === 0` all leave `mirvAt = -1` → `splitChildren = []` → returns `flownIcbms` unchanged (parent un-marked, correct — no split occurred). The only `mirvAt ≥ 0` yet `splitChildren = []` case is `liveTargets === []` (all structures dead → game effectively over), where not marking is behaviour-preserving and moot. Whenever targets exist the `openSlots > 0` gate guarantees ≥1 child, so the parent is always marked on a real split — this mirrors the ROM's "clear MIRVIX on fire" (W3MAIN.MAC:2011-2017), not a weakening. Sentinel handling verified: `mirvAt < 0` (not truthiness), so index `0` is a valid split target, not misrouted (rule-checker #21 concurs).
- **No UNDOCUMENTED deviations found.** The split SHAPE (origin/pos/target/velocity) is unchanged; only the `mirvSpent` marker is added — matches AC4 exactly.

## Implementation Notes

**Pure Core Story:** This story modifies src/core code (mirv.ts, game.ts). New/changed src/core constants require a claims/*.json entry. Gates: purity.test.ts and citations.test.ts must stay green.

**ROM-Always-Wins:** The MIRV spent mechanism is pinned to REV-01 (MIRVIX single-slot model, consume, and POTENT cap). No invented difficulty tuning parameters.

**Branch Strategy:** gitflow (feat/mc12-1-bound-mirv-single-split)

## Sm Assessment

**Story shape:** 5pt, p1, tdd, pure-core. Well-formed with unambiguous ACs — no either/or ruling needed, ROM-always-wins is baked into AC2/AC4 (no difficulty knob).

**Premise verified against the current tree (not stale):**
- `mirvEligible` (mirv.ts:38) returns `pos.v >= MIRV_LO && pos.v <= MIRV_HI` with NO spent guard — the re-qualification path is real.
- `mirvSplit` (mirv.ts:50) forks up to `MIRV_MAX_CHILDREN` at the parent's position.
- `game.ts` builds `withMirvs = [...flownIcbms, ...mirvSplit(...)]`, keeping the split parent in the roster, so it re-splits every frame it stays in-band. That is the cascade the owner screenshotted.

So the Background is CURRENT fact — no correction block was warranted.

**Contention:** clean. `git fetch --prune` then `git branch -r | grep -Ei mc12` = no branches; sibling `.session/` sweep shows only ml11-2 (a-1) and df4-2 (a-3), neither touching missile-command. Claim branch `feat/mc12-1-bound-mirv-single-split` pushed empty for sibling visibility.

**For TEA (RED):**
- AC1 + AC3 are the mutation-proven reddening tests: one in-band ICBM must produce **at most `MIRV_MAX_CHILDREN` (3)** children across ALL frames it spends in [128,160], and on-screen ICBM count never exceeds `NICBMS=8`. Both must go RED against today's re-splitting code.
- The fix touches pure core (mirv.ts, game.ts) — a MIRV-spent marker on BOTH the split parent and every child. Any new/changed `src/core` constant needs a `claims/*.json` entry; `purity.test.ts` and `citations.test.ts` are gated.
- AC2 pins the bound to REV-01 (MIRVIX single slot W3MAIN.MAC:227; consume :2011-2017; POTENT cap :2717) — cite, don't invent.
- AC4: split SHAPE is unchanged (children still launch from parent pos toward RNG live targets at parent velocity); only the re-qualification of already-split warheads is removed. mc12-4 owns the felt-winnability playtest — out of scope here.

**Verified on disk:** session Workflow/Repos/Phase fields all present, one phase pointer, status `in_progress`, ACs verbatim with all citations, context + branch created.

## Tea Assessment

**RED confirmed** (independently by `testing-runner`, RUN_ID `mc12-1-tea-red`): `tests/mc12-1-mirv-single-split.test.ts` → **5 failed | 4 passed | 9 total**. Committed `072a3f85`. `npm run lint` (tsc) clean; `purity` + `citations` + `citations-source` green (213/213).

### The marker contract GREEN must honour
The RED file DEFINES the interface (standard TDD). GREEN (Korben) implements:
1. **icbm.ts** — add `readonly mirvSpent?: boolean` to the `Icbm` interface. **Optional** (every pre-mc12 `Icbm` literal/test must stay valid) and **readonly** (core immutability rule, ts lang-review line 26). This is the ROM's MIRVIX single-slot consume (W3MAIN.MAC:227 / :2011-2017) modelled as a one-shot flag — no numeric constant, so **no new claims/*.json entry is required** (AC2 is satisfied vacuously on the constant clause; the prose citations below are the AC2 work).
2. **mirv.ts `mirvEligible`** — return `false` when `icbm.mirvSpent` is true (add the guard alongside the existing `cruise`/`arrived` guards).
3. **mirv.ts `mirvSplit`** — set `mirvSpent: true` on every child. Do **not** change the geometry (origin/pos/target/velocity) — AC4 locks it.
4. **game.ts `stepCombat`** (~line 597) — replace the split parent in the roster with its spent copy, e.g. mark `withMirvs[mirvAt] = { ...parent, mirvSpent: true }` (or fold the parent-marking into the split), so the parent drops out of the eligible set the very next frame.

### AC → test mapping (what reddens, and why it's mutation-proof)
- **AC1** — `mirvEligible(spent)=false` (unit, RED: `true`); every `mirvSplit` child is not re-eligible in-band (unit, field-name-agnostic via `mirvEligible`, RED: `true`); at the wiring level, after the split the parent+3 children stay physically in-band yet **0** re-qualify (integration, RED: `4`).
- **AC1/AC3 (decisive lever)** — one in-band ICBM over its whole in-band descent: `totalChildren === 3` (RED: **7**), `splitEvents === 1` (RED: 3), `maxOnScreen ≤ 4` (RED: **8**). This is the exact 4-vs-8 gap that IS the bug. Note: the multi-ICBM count is NOT a clean lever — the `NICBMS=8` slice-cap truncates within-window so counts coincide today/after; the single-originating case is the one that separates them, so that is what the suite uses.
- **AC3 ceiling** — `icbms.length ≤ NICBMS` across the descent. **Honest note:** this holds today too (the `.slice(0, openSlots)` cap enforces it); it is a regression anchor for that cap, explicitly labelled in-file, NOT a reddening assertion. Felt winnability/progression is deferred to the **mc12-4** playtest (per AC3).
- **AC4** — children preserve `origin===parent.pos`, `pos`, `target ∈ liveTargets`, `velocity===parent.velocity`, `arrived===false`, ballistic kind; the ONLY addition asserted is `mirvSpent===true` (RED: `undefined`). Locks "shape unchanged, only re-qualification removed."
- **AC2** — the **existing** `purity.test.ts` + `citations.test.ts` are the gate and stay green (I only added a test). No numeric constant is added, so no claim is required; GREEN must still add the **prose citations** in the mechanism comments — MIRVIX slot `W3MAIN.MAC:227`, consume `W3MAIN.MAC:2011-2017`, POTENT cap `W3MAIN.MAC:2717` — and add **no difficulty knob** (ROM-always-wins). A `comment_analyzer`/citation reviewer should confirm those three cites resolve.

### Rule Coverage (ts lang-review)
- **Missing `readonly` on new field (line 26)** — contract requires `readonly mirvSpent?: boolean`; enforced indirectly by tsc + the immutability convention. Covered by the backward-compat test proving the field is optional.
- **Optional-field handling (line 40 / 563)** — the backward-compat test asserts an `Icbm` literal that omits the marker behaves exactly as before (eligible in-band, not above band, arrived-guard intact).
- **Bare-keyword source-text tests (line 132) — AVOIDED** — every assertion is behavioural (`mirvEligible`, counts, geometry); no `toContain('readonly')`/regex-on-source anti-pattern.
- **No vacuous assertions (Phase C self-check)** — all 9 tests assert concrete values; the 4 green tests assert current-correct behaviour that must be preserved (eligible-in-band, lone-target shape, empty-target, ≤NICBMS), not `is_some()`/`assert(true)`.

### For Dev
Pure-core change, four files touched at most (icbm.ts, mirv.ts, game.ts + no claim file). After GREEN: all 9 in this file pass, and the FULL missile-command project must stay green — especially the existing `tests/mirv.test.ts` and `tests/mirv-integration.test.ts` (adding an optional field must not perturb their `toEqual`-on-field assertions). Run `npm run lint` (release gate) too.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered below |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — no error-handling surface in diff |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered by mutation testing below |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered by citation verification below |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered below |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered below |
| 9 | reviewer-rule-checker | Yes | clean | none (34 rules checked) | N/A |

**All received:** Yes (3 enabled returned clean; 6 disabled pre-filled and hand-covered by the Reviewer)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred

### Rule Compliance (lang-review/typescript.md + project rules)

`reviewer-rule-checker` enumerated 34 rules across 41 instances, 0 violations. I re-verified the ones that actually bite this diff:

- **Missing `readonly` on new field (ts #2)** — `Icbm.mirvSpent` is `readonly mirvSpent?: boolean` (icbm.ts:47). Every other `Icbm` field is `readonly`; compliant. [RULE][VERIFIED]
- **Optional-field / nullish handling (ts #4)** — `mirvEligible` reads it as `if (icbm.mirvSpent) return false` (mirv.ts:40); an omitted marker is `undefined` → falsy → treated as not-spent. Correct truthy check, no `??`/`||` needed. [RULE][VERIFIED]
- **Sentinel not truthiness (ts #21)** — the split site uses `mirvAt < 0` and `i === mirvAt` (game.ts:597-605), so index `0` is a real split target, never misrouted into the empty branch. [RULE][VERIFIED]
- **Immutability (project rule)** — both writes are new objects via spread: `{ ...launchIcbm(...), mirvSpent: true }` (mirv.ts:60) and `flownIcbms.map((icbm,i)=> i===mirvAt ? {...icbm, mirvSpent:true} : icbm)` (game.ts:605). `.map` returns a fresh array; `flownIcbms`/`parent` are never mutated in place. [RULE][VERIFIED]
- **`.js` extensions + `import type` (ts #5)** — the new test imports `../src/core/*.js` with inline `type` on type-only names. Compliant. [RULE][VERIFIED]
- **ROM-fidelity: numeric constant → claim (project rule)** — the diff adds ONE boolean field and NO numeric constant; `MIRV_LO/HI/MAX_CHILDREN/EXPLOSION_SUPPRESS` are untouched, no `claims/*.json` is added or needed. AC2's constant clause is vacuously satisfied; `citations.test.ts` + `purity.test.ts` stay green. [RULE][VERIFIED]
- **No invented difficulty knob (project rule / AC2)** — `mirvSpent` is a one-shot correctness marker enforcing the ROM's single MIRVIX slot, not a tunable; `MIRV_MAX_CHILDREN` stays 3. [RULE][VERIFIED]

### Observations

- **[VERIFIED] AC2 citations are accurate to the vendored source** — I read the cited lines myself: `W3MAIN.MAC:227` = `MIRVIX: .BLKB 1 ;ICBM TO MIRV (INDEX)` (single slot); `:2011-2017` = `CPY MIRVIX / IFEQ ;WAS ICBM TO BE MIRVED? / LDA I,-1 ;YES. CLEAR IT / STA MIRVIX` (consume/clear); `:2717` = `STA POTENT ;NO MORE THAN 3 SHOTS FROM A MIRV`. All three comments in icbm.ts/mirv.ts/game.ts match verbatim. [DOC]
- **[VERIFIED] Every marking site is independently guarded (mutation test, run by me)** — dropping the `mirvEligible` spent-guard → 4 red; dropping the child marking in `mirvSplit` → 4 red; dropping the parent marking in `game.ts` → 2 red. No zero-coverage mutant; the suite genuinely pins all three halves of the fix. Tree restored (`git checkout --`) and re-verified clean. [TEST]
- **[VERIFIED] No new entropy / no unbounded growth** — `mirvSplit` still draws only from the passed seeded `state.rng` via `nextInt`; growth is double-bounded by `openSlots = max(0, NICBMS - flownIcbms.length)` and `.slice(0, openSlots)`, and the marker now closes the re-qualification loop. Confirmed independently by `reviewer-security`. [SEC]
- **[VERIFIED] Split SHAPE unchanged (AC4)** — `mirvSplit` still calls `launchIcbm(parent.pos, target, parent.velocity)`; the only added field is `mirvSpent`. The existing `tests/mirv.test.ts` / `tests/mirv-integration.test.ts` (which assert child geometry field-by-field) stay green in the full 1413/1413 run. [VERIFIED] mirv.ts:60
- **[VERIFIED] Pure-core gates green** — `purity.test.ts` + `citations.test.ts` + `citations-source.test.ts` = 213/213; `npm run lint` (tsc) clean; full missile-command project 1413/1413 (preflight + rule-checker + my own runs concur). [PRE]
- **[VERIFIED] Test assertions bind to production constants, not restated literals** — counts compare against imported `MIRV_MAX_CHILDREN`/`NICBMS`; magnitudes are exact (`totalChildren === 3`, `splitEvents === 1`, `maxOnScreen ≤ 4`), disproving the cascade directly rather than via an ordering proxy. [TEST]

### Devil's Advocate

Let me try to break it. **Could a cruise missile be wrongly marked or mishandled?** No — `mirvEligible` returns false for `kind === 'cruise'` before it ever reaches the spent check, and `mirvAt` only ever indexes a mirv-eligible (ballistic, non-spent) warhead, so the `game.ts` `.map` never marks a cruise. **Could the parent-marking corrupt a neighbour's identity?** The `.map` replaces only index `mirvAt` with a fresh object and passes all others through by reference; no in-place mutation, and downstream reducers are identity-agnostic (they rebuild state each frame). **What if `openSlots` is 1 or 2 while `mirvSplit` yields 3?** The `.slice(0, openSlots)` truncates the children but the parent is still marked spent (a real split fired, `splitChildren.length > 0`), so no phantom re-split — and the on-screen ceiling holds (regression anchor test passes across the descent). **What about the empty-`liveTargets` edge?** `mirvSplit` returns `[]`, `splitChildren.length === 0`, the roster is returned unchanged and the parent is left un-marked; but with no live structures the game is already terminal, so this is behaviour-preserving, not a leak — and Dev documented it. **Could the marker leak into serialization / high-score / replay determinism?** It is a plain optional boolean on an in-memory `Icbm`; nothing serializes the ICBM roster, and determinism flows from the seeded RNG which is untouched. **Could a stressed run (12+ explosions then release) resurrect the cascade?** Suppression keys on the pre-aging `state.explosions` count (unchanged); once suppression lifts, any still-in-band originating ICBM splits at most once because it was never marked while suppressed and gets marked the first frame it fires — bounded either way. **Worst realistic case:** a confused reader assumes `mirvSpent` also stops the warhead from *arriving* or scoring — it does not; it only gates MIRV eligibility, and the arrival/scoring paths are untouched. I could not construct an input that re-opens the swarm or breaks an existing behaviour. The change is minimal, faithful, and fully fenced by tests.

## Reviewer Assessment

**Verdict:** APPROVED
**Data flow traced:** an in-band ballistic `Icbm` → `mirvEligible` (now gated on `mirvSpent`) → single `mirvSplit` in `stepCombat` that marks the parent spent and births spent children → next frame none re-qualifies. Safe because growth is double-bounded (`openSlots` + `.slice`) and the marker closes the re-qualification loop; entropy stays the seeded `state.rng`.
**Pattern observed:** one-shot spent marker modelling the ROM's single MIRVIX slot (consume/clear), at mirv.ts:40/60 and game.ts:597-605 — faithful, no invented knob.
**Error handling:** N/A (pure deterministic reducer, no I/O/throw paths); empty-`liveTargets` and `openSlots===0` edges fall through to the unchanged roster, verified.
**Subagents:** preflight + security [SEC] + rule-checker [RULE] all returned clean (0 findings); the six disabled specialists hand-covered (citations verified verbatim, all 3 guards mutation-proven, edge/type/simplify traced). [SEC] no new entropy and growth double-bounded; [RULE] 34 rules / 41 instances, 0 violations. Full suite 1413/1413, tsc clean, purity+citations 213/213.
**Handoff:** To SM for finish-story.