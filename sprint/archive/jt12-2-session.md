---
story_id: "jt12-2"
jira_key: "jt12-2"
epic: "jt12"
workflow: "tdd"
---
# Story jt12-2: Wire the WSMART budget refund/debit so smart-enemy pressure is sustained

## Story Details
- **ID:** jt12-2
- **Jira Key:** jt12-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/jt12-2-wire-wsmart-budget-refund-debit
- **PR:** https://github.com/slabgorb/arcade/pull/475 (merged 2026-08-16)

## Story Description

Three ROM behaviours are fully implemented, unit-tested, and reachable in the sim's data model, but have ZERO production callers, so the live game silently diverges from JOUSTRV4.SRC. This story wires the second: the WSMART intelligence-budget economy only ever DEBITS.

Currently:
- `promote` (wired, frame.ts:407) increments `nsmart`
- `creditDeath` (core/enemy.ts:566, CREEM JOUSTRV4.SRC:2962) **never called** — should decrement nsmart when a smart enemy dies
- `remountBudgetDebit` (core/egg.ts:339) **never called** — should increment nsmart on the egg->remount transition

Result: mid-wave nsmart climbs monotonically, latches at wsmart, and no further enemy can turn smart no matter how many the player kills — the game gets EASIER than the ROM.

Ground truth: JOUSTRV4.SRC (RV4 revision)

## Acceptance Criteria

1. Call `creditDeath` (core/enemy.ts:566) in the death/removal path (alongside bookDeath/countBaiterDeaths) to decrement nsmart when a smart enemy dies
2. Call `remountBudgetDebit` (core/egg.ts:339) on the egg->remount transition
3. Assert that after a smart enemy dies mid-wave a replacement can be promoted (nsmart no longer latches at wsmart)
4. Verify against JOUSTRV4.SRC:2962 CREEM

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T17:59:14Z
**Branch Strategy:** gitflow (feat/jt12-2-wire-wsmart-budget-refund-debit)

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T17:09:09Z | 2026-08-16T17:11:28Z | 2m 19s |
| red | 2026-08-16T17:11:28Z | 2026-08-16T17:40:12Z | 28m 44s |
| green | 2026-08-16T17:40:12Z | 2026-08-16T17:52:00Z | 11m 48s |
| review | 2026-08-16T17:52:00Z | 2026-08-16T17:59:14Z | 7m 14s |
| finish | 2026-08-16T17:59:14Z | - | - |

## Delivery Findings

No upstream findings

### Reviewer (code review)
- **Improvement** (non-blocking): `refundEnemyDeaths` (`sim.ts`) builds its after-set from ALL processes (`after.map(p => p.id)`), whereas the pattern it mirrors, `countBaiterDeaths`, filters to live enemies of the tracked kind. Both are correct today because a dead enemy's original id is always removed and its egg/dissolve is given a fresh namespaced id (`+0x10000` / `+0x20000`, `collisionPass`), so no id-reuse can mask a death. Affects `plugins/joust/src/core/sim.ts` (optional: filter `after` to `p.kind === 'enemy'` for defensive parity with `countBaiterDeaths` should the id-namespacing invariant ever change). *Found by Reviewer during code review — not required for approval.*

## Design Deviations

None logged by TEA/Dev.

### Reviewer (audit)
- **Count-guard removal beyond the story's ACs** (audio-seam-scope.test.ts −670 lines, README −66 lines): Dev disclosed this in the Dev Assessment "scope note" but the section above reads "None." → ✓ ACCEPTED by Reviewer: it was an explicit, on-record user directive during this session ("rip that bullshit out"), the deletion is confined to documentation-count guards that reddened on every file add for zero real protection, and the three genuine safety guards (no `.wav` committed, manifest names absent, no source claims samples hosted) are verified still present (security subagent read the kept file). All 3683 joust tests + orchestrator green after removal. No undocumented CODE deviation found in the sim wiring itself.

## Sm Assessment

Setup complete for jt12-2 (5pt, joust, tdd). The phase pointer read `setup` on arrival; state was `NEW_WORK_STATE` and the story was cleanly unclaimed.

**Premise verified against `develop` before setup (measured, not inferred):**
- `creditDeath` — exported at `plugins/joust/src/core/enemy.ts:566`, does `nsmart -= enemy.pchase`, and has ZERO callers (`grep 'creditDeath('` minus the definition is empty). Dead export awaiting wiring, exactly as the story asserts.
- `remountBudgetDebit` — exported at `plugins/joust/src/core/egg.ts:339`, does `nsmart + 1` (MOUNRI INC NSMART, JOUSTRV4.SRC:3669), ZERO callers.
- `nsmart`/`wsmart` appear NOWHERE in `plugins/joust/src/core/sim.ts` — the budget is never debited in the live loop, so it latches at `wsmart` monotonically. This is the divergence the story targets.
- Death/removal path for TEA to hook: `bookDeath` (`core/game.ts:301`), `countBaiterDeaths` (`core/sim.ts:2487`). Egg->remount transition lives in `core/egg.ts` (remount machinery around `remountEntryEdge` :327).

**No stale-description correction needed** — the description is accurate and current as written.

**ACs:** the epic YAML records none for jt12-2; the session file derived 4 faithful to the description (wire `creditDeath` in the death path, wire `remountBudgetDebit` on remount, assert a replacement can be promoted mid-wave after a smart death, verify vs JOUSTRV4.SRC:2962 CREEM). TEA owns finalising the RED assertions.

**Blast-radius note for TEA/Dev:** the core/shell purity boundary is enforced by joust's own `src/core/` scan test — both `creditDeath` and `remountBudgetDebit` are pure and already in `core/`, so wiring them into the death/remount seams stays core-side. The testable behaviour is "after a smart enemy dies mid-wave, `nsmart` drops so a subsequent `promote` can re-mint a smart enemy instead of latching at `wsmart`."

**Predecessor cleanup:** merged the blocking PR #470 (jt12-1 sprint-complete, user-authorized) before setup; `develop` is current.

**Claim pushed:** commit `7be665cc` on `feat/jt12-2-wire-wsmart-budget-refund-debit`, branch pushed to origin — sibling probe (`git branch -r | grep jt12-2`) lights up.

Handing off to Leeloo (TEA) for the RED phase.

## Tea Assessment

RED landed. New suite `plugins/joust/tests/wsmart-budget-wiring-jt12-2.test.ts` — **4 failing (the wires), 2 passing (the controls)**. Verified directly (`npx vitest run --project joust`): `4 failed | 3679 passed`; tsc `--noEmit` clean; orchestrator suite `505/505`. Committed `4ba99ff3`, pushed.

**The two seams Dev must wire (both in `stepSim`, core/sim.ts):**
1. **`creditDeath` in the death/removal path** — beside `countBaiterDeaths(materialised, processes)` (the pre-collision-vs-survivors diff). For each enemy present in `materialised` and gone from the post-collision `processes`, apply `budget = creditDeath(deadEnemy, budget)`. A dumb death (pchase 0) must refund nothing — the transform already does `nsmart -= pchase`, so pass the real dead enemy, don't hardcode `-1`.
2. **`remountBudgetDebit` on the egg→remount transition** — where the hatch walk terminates and returns `remountEnemyProcess(...)`. Apply `budget = remountBudgetDebit(budget)` (nsmart += 1) exactly when the buzzard flies in, NOT on every egg frame. Note the egg flatMap currently runs before `let budget = stepped.budget` is in scope — Dev will need to thread the budget through it (move the declaration up, or count remounts and apply after). That's a GREEN structural choice, not pinned by the tests.

**What the tests pin (so Dev knows what "done" means):**
- smart death → `nsmart` drops by the dead enemy's pchase; dumb death → unchanged.
- after a smart death `shouldPromote(budget)` flips true (no longer latched at wsmart).
- integration: a parked dumb enemy actually promotes within a few frames once the refund frees room — the AC's headline, unreachable on today's latch.
- remount → `nsmart` +1 and a remount buzzard appears; a mid-cutscene egg (not last row) → no debit.

**Mutation-resistance built in:** every test first proves its staging (the death/remount really happened) so a red is the missing wire, not bad staging; the dumb-death control kills a flat `-1` mutant; the mid-cutscene control kills an every-frame-debit mutant.

**Rule coverage:** joust's `src/core/` purity scan — both transforms are pure and already in `core/`, so wiring them stays core-side (no shell import creeps in). comment-line-refs guard: the new file uses symbol names, not `file.ts:NNN` anchors (green). No new ROM constants transcribed — this is pure wiring of byte-verified functions.

**Scope note (done per the sole-dev directive, folded into this commit):** ripped out the count-guarding apparatus in `audio-seam-scope.test.ts` (file/claim/event/story-tally counts, skipIf-counting, README-prose greps) and stripped the transcribed counts from `plugins/joust/README.md`. Those derived-count guards reddened on every legitimate test-file add and protected only a number transcribed in a doc. Kept the real guards: no `.wav` committed, the TS review checklist on the audio modules, and the no-invented-cue check.

Handing off to Korben (Dev) for GREEN.

## Dev Assessment

GREEN. Wired both budget seams into `stepSim` (`plugins/joust/src/core/sim.ts`), commit `7907826e`, pushed. Full joust suite **197 files / 3683 tests, 0 failures**; tsc `--noEmit` clean.

**Implementation (minimal, ROM-cited):**
- `refundEnemyDeaths(before, after, budget)` — a helper mirroring `countBaiterDeaths`: every enemy in the pre-collision `materialised` set that's gone from the survivors restores its own `pchase` via `creditDeath` (CREEM `LDA NSMART / SUBA PCHASE,U`, JOUSTRV4.SRC:2962-2963). Applied right where the DBAIT settle runs — the story's specified seam. A dumb death (pchase 0) refunds nothing; the smart death frees one slot.
- `remountBudgetDebit` — a `remounts` counter incremented in the egg-hatch flatMap beside the existing `population += 1`, then applied once `budget` is in scope (MOUNRI `INC NSMART`, JOUSTRV4.SRC:3669). Fires exactly on the buzzard-flies-in transition, not per egg frame.

**Correctness verified before re-baselining goldens (not assumed):**
- Traced the `materialised → processes` pipeline: an enemy leaves that list only by death (collision → egg, or troll → lava); gripped-but-alive birds keep a `grippedBy` flag and stay. So the diff credits only real deaths — same guarantee `countBaiterDeaths` relies on.
- Instrumented seeded replays (0xbeef/0x2468/0xface, 2000 frames): `nsmart` stays in `[0, WSMART+1]`, never negative, promotions single-digit — **no runaway**. The `+1` overshoot is the expected transient from a remount debit at latch.

**Two frozen-fingerprint goldens re-baselined** (deliberate behavior change moved them; both files already carry many prior re-baselines):
- `audio-events.test.ts` AC3 (0xbeef/2400): **`rng` UNMOVED** (2_006_456_271), `wave` and `procs` unmoved, P2 unmoved — only P1 `scores` 200→150 and `lives` 1→2 (one contact reshaped). The pure transforms draw no randomness, so the group's headline law holds.
- `dumb-wingbeat.test.ts` AC6 census: counts move in BOTH directions (0xbeef down 174→277, 0xface down 250→206, 0x2468 unmoved) — a trajectory perturbation signature, not a population change. Knight cues moved only where knight-death timing shifted.

**Scope discipline:** no new ROM constants transcribed; both wired functions were already byte-verified. No shell imports crept into core (purity scan green). The count-guard removal from the RED commit is unchanged.

Handing off to Zorg (Reviewer).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (lint clean, 197 files/3683 tests pass, 0 smells) | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered below |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered below |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered below |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered below |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered below |
| 7 | reviewer-security | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered below |
| 9 | reviewer-rule-checker | Yes | clean | none (11 rules, 34 instances, 0 violations) | confirmed 0, dismissed 0, deferred 0 |

**All received:** Yes (3 enabled returned clean; 6 disabled via `workflow.reviewer_subagents`, hand-covered)
**Total findings:** 0 confirmed blocking, 0 dismissed, 1 deferred (a non-blocking robustness Improvement — see Delivery Findings)

## Reviewer Assessment

**Verdict:** APPROVED

The change wires two byte-verified pure functions (`creditDeath`, `remountBudgetDebit`) into `stepSim`, closing the WSMART latch. I read the diff independently, traced the death/remount data flow to the ROM seams, and confirmed every enabled subagent (preflight, security, rule_checker) came back clean. The six disabled specialists are hand-covered below and tagged.

**Data flow traced:** a smart enemy (`kind:'enemy'`, `pchase:1`) → jousted/lava death in `collisionPass`/`stepTrolls` → original id `removed.add(loser.id)` and a fresh egg id `0x1_0000 + loser.id` spawned (`sim.ts` collisionPass:135,141) → at `stepSim` the dead enemy is in the pre-collision `materialised` set but absent from `processes`, so `refundEnemyDeaths` restores its `pchase` via `creditDeath`. Safe because the dead enemy's id is never reused (egg `+0x10000`, dissolve `+0x20000`, remount `+0x40000` — all distinct namespaces), so `afterIds` cannot mask a death.

**Key observations (≥5, no rubber-stamp):**
- [VERIFIED] `refundEnemyDeaths` credits only real deaths — evidence: `collisionPass` removes `loser.id` and spawns the egg under `0x1_0000 + loser.id` (sim.ts:135,141); `dissolveProcess` uses `0x2_0000 + id` (sim.ts:1770). No id reuse → the by-id diff is exact. Complies with core-purity rule (pure, no ambient I/O).
- [VERIFIED] `nsmart` stays bounded and non-negative — evidence: measured over seeded replays (0xbeef/0x2468/0xface, 2000 frames) `nsmart ∈ [0, wsmart+1]`, promotions single-digit; `creditDeath` subtracts `pchase ∈ {0,1}` (enemy.ts:566, `pchase: 0|1` at :179), `remountBudgetDebit` +1 is consumed only by `shouldPromote`'s `<` (enemy.ts:494), and `seedWaveBudget` overwrites per wave (sim.ts). Corroborated by [SEC].
- [SEC] security subagent — status clean: no randomness, no unbounded loop (remount count bounded by egg population), no injection/secrets; the deleted guards removed only doc-count bookkeeping, and the three real safety guards (no committed `.wav`, manifest-names-absent, no hosted-claim in `src/`) are verified still present.
- [RULE] rule_checker — 11 rules / 34 instances / 0 violations: the test staging casts `as unknown as SimProcess` match the established `game-jt4-5.test.ts` pattern; every relative import carries `.js`; `purity.test.ts` green against the modified `sim.ts`; no `file.ts:NNN` comment anchors (jt9-30).
- [TEST] hand-covered (analyzer disabled): the 6 new tests each assert staging validity (the death/remount really happened) before the budget delta, with two mutation-resistant controls (dumb-death → no refund kills a flat `-1`; mid-cutscene egg → no debit kills an every-frame mutant) and an end-to-end promotion integration. Non-vacuous — all four wire assertions failed on RED. Corroborated by [RULE] rule 8.
- [EDGE] hand-covered (edge-hunter disabled): boundary paths checked — empty `materialised`/`processes` (loops no-op), an enemy with `enemy` undefined (guarded by `&& p.enemy`), a wave-clear frame (refund runs then `seedWaveBudget` overwrites — no stale carry), a remount at latch (`nsmart` transiently `wsmart+1`, expected). No unhandled path found.
- [SILENT] hand-covered (silent-failure-hunter disabled): the new code contains no `try/catch`, no swallowed errors, no silent fallbacks — pure arithmetic that always returns a value.
- [TYPE] hand-covered (type-design disabled): `refundEnemyDeaths(before: readonly SimProcess[], after: readonly SimProcess[], budget: IntelBudget): IntelBudget` — proper types, `readonly` params never mutated, returns the domain `IntelBudget`. No stringly-typed API, no unsafe cast in production code. Corroborated by [RULE] rules 1–2.
- [DOC] hand-covered (comment-analyzer disabled): new comments cite ROM lines (`JOUSTRV4.SRC:2962-2963`, `:3669`) and symbol names, not stale file:line anchors; the two golden re-baseline notes accurately describe the trajectory shift; the deletion left no dangling references (other files cite `audio-seam-scope.test.ts` only for its KEPT no-`.wav` discipline).
- [SIMPLE] hand-covered (simplifier disabled): `refundEnemyDeaths` mirrors the neighbouring `countBaiterDeaths`; the `remounts` counter mirrors the existing `population += 1` in the same flatMap. Minimal, idiomatic, no over-engineering.
- [LOW] `refundEnemyDeaths` uses `after.map(all ids)` vs `countBaiterDeaths`'s filter-to-kind — correct today (see data flow), logged as a non-blocking robustness Improvement in Delivery Findings.

### Rule Compliance
Applicable rules: core-purity (src/core no DOM/time/random), joust ESM `.js` imports, jt9-30 no comment line-anchors, TS lang-review checklist.
- **core-purity** — every new/changed `src/core` symbol enumerated: `refundEnemyDeaths` (pure Array/Set ops), `remounts` counter + debit loop (integer arithmetic), the two imported transforms (pure spreads). `purity.test.ts` PASSES. Compliant.
- **ESM `.js`** — all four new/changed relative imports (`./enemy.js`, `./egg.js`, `../src/core/sim.js`, `../src/core/enemy.js`, `./helpers/wave-entry.js`) carry `.js`; no bare `@shared/*` added. Compliant.
- **jt9-30 comment anchors** — every new comment in the 5 touched test/src files checked: ROM citations only, no `<our>.ts:NNN`. Compliant.
- **TS checklist (rules 1–8)** — rule_checker enumerated 34 instances, 0 violations; independently spot-checked the `?? / ||` and non-null-assertion classes in the new code — none present. Compliant.

### Devil's Advocate
Suppose this code is broken. The most dangerous failure mode would be `refundEnemyDeaths` OVER-crediting — crediting a process that left `processes` for a reason other than death — which would drive `nsmart` negative, make `shouldPromote` permanently true, and promote every enemy on every wake: a runaway that turns the game into a smart-swarm and looks superficially like "sustained pressure" while actually being a corruption. I hunted this specifically. The only ways an enemy leaves the list between `materialised` and my refund point are collision death (→ egg, new id) and troll-lava death (→ removed); a gripped-but-alive bird keeps a `grippedBy` flag and stays. There is no "enemy temporarily removed then re-added later in the same frame" path — the transporter only ADDS enemies (materialise), and the wave-advance rebuild happens only when no enemies remain and re-seeds the budget wholesale. I confirmed empirically that `nsmart` never goes negative across three seeds. A second attack: id reuse — if `spawnEgg`'s process reused the dead enemy's id, the death would be MASKED (under-credit), leaving the latch partly intact and the fix a no-op for some deaths; I traced the id to `0x1_0000 + loser.id`, distinct, so this is closed. A third: the remount debit double-firing or firing on a non-remount — it is gated behind the exact `nextRow >= EGGTBL.length` branch that returns `remountEnemyProcess`, counted once, applied once; the mid-cutscene control test proves it does NOT fire on an egg still walking rows. A confused maintainer might "simplify" the two-step counter into a side-effect inside the flatMap — that would still work but is uglier; the existing `population += 1` precedent justifies the current shape. A stressed input (thousands of eggs) bounds `remounts` by live egg population, itself bounded by the wave quota — no unbounded loop. Finally, the golden re-baselines: could they be hiding a regression? They move in BOTH directions across seeds (a perturbation signature, not a population blow-up), `rng` is byte-identical (no randomness leak), and the audio-events fingerprint shows `wave`/`procs`/P2 unmoved with only one localized P1 contact changing — consistent with a single altered promotion, not chaos. I could not break it.

**Error handling:** the two new functions are total (always return an `IntelBudget`); no null/throw paths. Null inputs: an enemy with `enemy: undefined` is skipped by the `&& p.enemy` guard.
**Handoff:** To SM for finish-story.