---
story_id: "jt9-47"
jira_key: "jt9-47"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-47: The hatched remount buzzard HARDCODES type 'bounder' — a hunter/shadow-lord loses its species on remount

## Story Details
- **ID:** jt9-47
- **Jira Key:** jt9-47
- **Workflow:** tdd
- **Stack Parent:** none

**Branch:** feat/jt9-47-hatched-remount-species
**PR:** https://github.com/slabgorb/arcade/pull/33

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Repos:** arcade
**Phase Started:** 2026-08-06T22:11:14Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T21:39:00Z | 2026-08-06T21:42:23Z | 3m 23s |
| red | 2026-08-06T21:42:23Z | 2026-08-06T21:56:47Z | 14m 24s |
| green | 2026-08-06T21:56:47Z | 2026-08-06T22:00:55Z | 4m 8s |
| review | 2026-08-06T22:00:55Z | 2026-08-06T22:06:09Z | 5m 14s |
| green | 2026-08-06T22:06:09Z | 2026-08-06T22:09:28Z | 3m 19s |
| review | 2026-08-06T22:09:28Z | 2026-08-06T22:11:14Z | 1m 46s |
| finish | 2026-08-06T22:11:14Z | - | - |

## Story Background

Filed by the Architect, 2026-08-05, split out of jt9-46 (the enemy-rider render fix) as the user directed. jt9-46 makes this VISIBLE — once enemies draw their DPLYR rider, a remounted hunter or shadow-lord will re-ride as a bounder — but the defect is in the SIM, not the render, so it is its own story.

**WHAT THE PORT DOES NOW.** `remountEnemyProcess` (**demo.ts:1124**) — the buzzard a SETTLED egg hatches into — builds its EnemyState with `const type: EnemyType = 'bounder'` hardcoded (**demo.ts:1126**), then `decision: brainFor(type)` (**demo.ts:1143**) and `enemyType: type` (**demo.ts:1150**). So EVERY hatched bird is a bounder regardless of the species that laid the egg. The one species-carrying field it DOES preserve is `eggsLeft` (**demo.ts:1148**, cited JOUSTRV4.SRC:3251-3252) — which the docblock there already frames as "what makes permadeath reachable" — so the omission of the TYPE is a visible inconsistency in the same function: it copies PEGG forward but not the species PEGG belongs to.

**WHAT THE ROM DOES.** The remount (EGGLND/MOUNRI) carries the bird's identity across the hatch. PEGG is maintained (`LDA PEGG,U / STA PEGG,Y`, JOUSTRV4.SRC:3251-3252, already ported). The species PID and its decision pointer come from the same egg/parent record — a hunter's egg remounts a hunter, a shadow lord's a shadow lord — not a fixed bounder. Read the exact fields at RED from the vendored EGGLND/MOUNRI block (JOUSTRV4.SRC:3239-3279); the vendored tree is not in this checkout (sibling a-2, like red-baron) and these suites degrade to committed fixtures on CI (vendoredAvailable).

**WHERE THE TYPE MUST COME FROM.** `EggState` (**egg.ts:37**) must carry the laying enemy's species so the remount can restore it. Check egg.ts — the egg is created at DEATH3 from the dying enemy (**egg.ts:158** region); if it does not already record the parent's EnemyType, adding that field is part of this story, threaded from the enemy that dropped it through to `remountEnemyProcess`. Do NOT infer the species from any other signal; carry it explicitly.

**WHY IT MATTERS BEYOND LOOKS.** `decision: brainFor(type)` means the remounted bird also gets the BOUNDER brain (boundr), so a hatched hunter loses its hunter pursuit (b2undr) and a shadow lord its SHADOW brain — a behaviour regression, not only a colour one. And `killScore(enemyType)` (**joust.ts:243** region) scores every remount as a bounder, so the 750/1500-point kills are unreachable on any bird that has hatched at least once.

**WATCH THE DETERMINISM BAR.** Changing the remounted bird's brain changes its flight, so a seeded replay that lets an egg hatch and then steps the bird will move. Expect a re-baseline on those fixtures; land it as its own commit per this epic's standing rule and RE-FIND the moved frames by re-running the seeded sweeps, not by nudging them to whatever the new code prints.

> ⚠ **Line number corrections:** The epic description's line cites have drifted from the live tree (2026-08-06). This session uses measured current line numbers; the acceptance criteria below are reproduced verbatim from the epic YAML and have not been edited.

## Acceptance Criteria

- AC-1 A REMOUNT PRESERVES THE LAYING SPECIES. A hunter's settled egg hatches into a hunter and a shadow-lord's into a shadow-lord — remountEnemyProcess takes the species from the egg, not the hardcoded 'bounder' (demo.ts:1058). Guard all THREE species through a full drop→settle→hatch cycle and assert the remount's enemyType matches the parent. MUTATION: restoring the `= 'bounder'` hardcode must redden a named test.

- AC-2 EGGSTATE CARRIES THE PARENT SPECIES, SET EXPLICITLY AT DEATH. The egg records the dropping enemy's EnemyType at creation (egg.ts, the DEATH3/egg-spawn site) and remountEnemyProcess reads it — the species is THREADED, never inferred from position, brain, or colour. Guard that an egg dropped by each species carries that species. MUTATION: dropping the field (defaulting to bounder) must redden.

- AC-3 THE REMOUNT KEEPS ITS BRAIN AND ITS SCORE. decision resolves via brainFor(remountType) so a remounted hunter carries the b2undr brain and a shadow-lord SHADOW (enemy.ts:531-539), and killScore(enemyType) (joust.ts:243) pays the species' real value on a bird that has hatched. Guard a hatched hunter's decision brain is b2undr (not boundr) and its kill scores as a hunter. This is the behaviour half — pin it distinctly from AC-1's identity.

- AC-4 PEGG IS STILL PRESERVED, AND THE 4-EGG PERMADEATH STILL TERMINATES. The existing eggsLeft carry-forward (demo.ts:1076-1080, JOUSTRV4.SRC:3251-3252) is untouched and the complement still walks to permadeath at 0 — adding the species must not perturb the egg-count ladder. Guard a full 4-egg depletion of a non-bounder species reaches permadeath (no regeneration), so the type thread did not reopen the count-to-zero the eggsLeft comment guards.

- AC-5 DETERMINISM RE-BASELINE LANDS AS ITS OWN COMMIT, RE-FOUND NOT NUDGED. Per this epic's standing rule: any seeded fixture that hatches a non-bounder and then steps it will move because the brain changed; re-run the seeded sweeps, take the moved frames from that run, and name in the commit message which seeds moved and why. Event-searching tests should survive; frame-pinned ones will not.

## Delivery Findings

No upstream findings

## Design Deviations

No design deviations

## SM Assessment

**Story premise: VERIFIED TRUE against the live tree (2026-08-06).** Before setup I confirmed
the defect exists rather than trusting the epic description:

- `remountEnemyProcess` (demo.ts:1124) hardcodes `const type: EnemyType = 'bounder'` (demo.ts:1126),
  threads it into `decision: brainFor(type)` (demo.ts:1143) and `enemyType: type` (demo.ts:1150),
  while preserving `eggsLeft: egg.eggsLeft` (PEGG, demo.ts:1148). The copies-PEGG-but-not-species
  inconsistency the story describes is real and sits in one function.
- `EggState` (egg.ts:37) currently carries **no** species/EnemyType field (grep-confirmed), so adding
  one — threaded from the dying enemy through `spawnEgg` (egg.ts ~:158, DEATH3) into the remount — is
  genuinely in scope, not already done.
- `killScore(victim.enemyType)` scores the remount (joust.ts ~:243), so a hatched non-bounder's
  750/1500 kills really are unreachable today.

**One correction applied:** the epic description's demo.ts line cites had drifted (it says :1056-1082
/:1058; live is :1124-1150/:1126). The Background uses measured current lines; the ACs are reproduced
**verbatim** from the epic YAML (drifted cites inside AC text left intact, flagged by the ⚠ note above
AC section).

**Sibling contention: clean.** No pushed branch matched `jt9-47`; session sweep found zero sessions
across checkouts. Claim now pushed (branch `feat/jt9-47-hatched-remount-species`, commit `ab141960`).

**For TEA (RED):** All 5 ACs carry explicit MUTATION obligations — honour them. AC-5 is the
determinism bar: hatching a non-bounder and stepping it changes flight (brain change), so frame-pinned
seeded fixtures WILL move — that re-baseline is a separate commit, re-found by re-running the seeded
sweeps, never nudged. Read the exact EGGLND/MOUNRI fields (JOUSTRV4.SRC:3239-3279) at RED; the vendored
ROM tree is not in this checkout (sibling a-2) — suites degrade to committed fixtures via `vendoredAvailable`.

**Setup defects handled:** sm-setup left status `backlog` (stamped `in_progress`) and omitted
`**Repos:**` (added `arcade`). ACs diffed clean against the epic YAML — no silent edit this round.

## TEA Assessment (RED)

**RED landed. `plugins/joust/tests/demo-jt9-47.test.ts` — 6 failing / 4 green (10 total), lint green,
zero collateral across the 147-file joust suite.** Commit `7a4c59ef`, pushed.

**What each test pins (with its mutation obligation):**

- **AC-1 (2 tests, RED):** a lone hatching egg carrying a species is driven through its wait + EGGMAN
  cutscene via `stepDemo` (the jt9-46 `hatchingEggProc` harness) until the remount buzzard appears;
  its `enemyType` must equal the laying species for all three. MUTATION: restoring the `'bounder'`
  hardcode collapses every remount to bounder → the hunter/shadowLord rows redden. Failing now with
  `expected 'hunter' … received 'bounder'`.
- **AC-2 (2 tests, RED):** `spawnEgg(victim{enemyType})` must write the species onto `EggState.enemyType`;
  a discriminator test proves two species yield two DIFFERENT eggs (not a constant, not undefined).
  MUTATION: dropping the field reddens. Failing now with `expected 'bounder' … received undefined`.
- **AC-3 (2 tests, RED):** the behaviour half — the remount's `enemy.decision` brain must be the
  species brain (`b2undr`/`shadow`, not `boundr`) AND `killScore(remount.enemyType)` must pay the
  species value (750/1500, not 500). Distinct from AC-1: a fix that sets `enemyType` but still calls
  `brainFor('bounder')` passes AC-1 and fails here. Failing now `expected 'b2undr' … received 'boundr'`.
- **AC-4 (3 tests, GREEN-on-arrival guards):** the species thread must NOT perturb the egg ladder —
  `spawnEgg` still DEC PEGGs, an eggsLeft-0 egg is permadeath regardless of species, and the remount
  still carries PEGG forward. Legitimate regression guards (they redden if GREEN breaks the count).
- **Fallback (1 test, GREEN-on-arrival guard):** a species-LESS wave egg still remounts a bounder
  scoring 500 — pins lang-review #21: the new optional field needs a `?? 'bounder'` default, never a
  raw read (which would make a wave remount `undefined` → `killScore(undefined)` crash/0).

**The shape Dev implements (GREEN), stated by the contract (`tests/helpers/egg-contract.ts`, added):**
1. `EggVictim.enemyType?: EnemyType` — the dying enemy's species (source: the killed enemy's
   `DemoProcess.enemyType`, threaded at the DEATH3 kill site into the victim `spawnEgg` receives).
2. `EggState.enemyType?: EnemyType` — `spawnEgg` copies `victim.enemyType` onto it. Add the field to
   `src/core/egg.ts` EggState + EggVictim and populate it in `spawnEgg`.
3. `remountEnemyProcess` (demo.ts): replace `const type: EnemyType = 'bounder'` with
   `const type = egg.enemyType ?? 'bounder'` (the `??` matters — see the fallback guard). The existing
   `decision: brainFor(type)`, `enemyType: type`, and `eggsLeft: egg.eggsLeft` then all flow correctly.
   The EGGMAN-cutscene spreads (`{ ...egg, hatchRow, hatchNap }`) already preserve the field.
4. Thread `enemyType` onto the victim at the DEATH3 site that calls `spawnEgg` from a dying enemy —
   grep `spawnEgg` in demo.ts/joust.ts for that call; the enemy carries `enemyType` on its process.

**AC-5 (determinism) is YOURS at GREEN, not a test here.** Giving a hatched hunter/shadow-lord its real
brain changes its flight, so seeded replay fixtures that hatch a non-bounder and step it WILL move.
Land that re-baseline as its OWN commit (epic standing rule), RE-FOUND by re-running the seeded sweeps —
never nudge a frame to whatever the new code prints. Every test in MY file is identity/event-searching
(reads type/brain/score, no frame-pinned coordinate), so none needs a re-baseline. Suspect the demo
replay/fingerprint fixtures; `git grep` for seeded sweeps that let an egg mature.

**Census fixes folded into the RED commit (so CI stays green):** adding the test file bumped the
audio-seam-scope derived README count (146→147) and my comments tripped `comment-line-refs` (jt9-30 bans
`<file>.ts:<line>` — converted to symbol refs). Both resolved and verified.

### Rule Coverage (lang-review/typescript.md)

- **#3 exhaustiveness on enum switch** (`brainFor`/`killScore` over `EnemyType`): AC-1/AC-3 exercise all
  three variants, so a missing arm surfaces. Dev's `?? 'bounder'` keeps `type` a total `EnemyType`.
- **#4 / #21 nullish handling of an optional field**: the Fallback guard pins `egg.enemyType ?? 'bounder'`
  directly — a `||` vs `??` slip is moot here (enemyType is never `''`), but a RAW read is caught.
- **#1 non-null assertion**: my tests use `remount.enemy!` — justified (a `kind:'enemy'` process always
  carries `enemy`); test-only, not production. Flagged here so the Reviewer needn't re-litigate it.
- Not applicable: Result/error-handling, Map.get, async — this is pure synchronous sim logic.
## Dev Delivery (GREEN)

**GREEN landed. Commit `57f1b815`, pushed.** Three-part thread, minimal:

1. `src/core/egg.ts` — `EggState` + `EggVictim` gain `enemyType?: EnemyType` (imported type-only from
   `./joust.js`; no cycle — joust.ts does not import egg.ts). `spawnEgg` copies `victim.enemyType`.
2. `src/core/demo.ts` `resolveContacts` (the DEATH3 kill site, the ONE `spawnEgg`-from-enemy producer) —
   threads `victim.enemyType` (a `JoustEntity.enemyType`, already carried for scoring) onto the egg.
3. `src/core/demo.ts` `remountEnemyProcess` — `const type = egg.enemyType ?? 'bounder'` replaces the
   hardcode. `decision: brainFor(type)`, `enemyType: type`, `eggsLeft: egg.eggsLeft` unchanged; the
   EGGMAN-cutscene spreads already carry the field through.

**Completeness:** the only enemy→egg path is `resolveContacts`→`spawnEgg`. `settledWaveEgg` (WAVEGG) is
correctly species-less → `?? 'bounder'` fallback (preserves jt9-46 Group 4's wave-egg-remount behaviour).
The lava-troll path grabs the player's bird, not an enemy laying an egg — no other producer to thread.

**AC-5 RE-BASELINE IS MEASURED EMPTY — there is no separate re-baseline commit, and that is correct.**
The full joust suite (147 files / 2978 tests) and the orchestrator suite (408/408) are green WITHOUT any
fixture edit. Reason: no existing seeded fixture hatches a NON-bounder — wave 1 and its eggs are bounders,
so a hatched egg resolves `?? 'bounder'` to the same species and identical flight. The behaviour change is
only reachable by a hatched hunter/shadow-lord, which no seeded replay exercises. Same zero-fingerprint
outcome as jt9-45. **For the Reviewer / sm-finish:** do NOT flag the absence of a re-baseline commit as an
unmet AC-5 — the re-baseline set is empty by measurement, and AC-5's "own commit" clause is conditional on
a fixture actually moving.

**Verification:** 10/10 demo-jt9-47 (RED→GREEN on AC-1/2/3; AC-4 + fallback guards green), lint clean
(`tsc --noEmit`), 2978 joust + 408 orchestrator green, zero collateral.
## Reviewer Assessment (Heimdall)

**Verdict: REJECTED** (one round — a single missing integration test on the story's core path).
All 8 reviewer subagents are disabled on this project, so this is a hand-run **adversarial mutation
battery**, not a rubber-stamp. Diff reviewed: `origin/develop...HEAD` (egg.ts +14, demo.ts +8,
demo-jt9-47.test.ts +277, egg-contract.ts +17, README +1).

**The code is CORRECT.** GREEN reproduced (10/10 jt9-47, 147 files/2978 tests, orchestrator 408/408,
lint clean). Every AC's mutation obligation was verified live (mutate → run → restore, each restore
confirmed clean by `git diff`):

| # | Mutation | Expected | Result |
|---|----------|----------|--------|
| 1 | drop `enemyType: victim.enemyType` in `resolveContacts` (DEATH3 wiring) | some test reddens | **SURVIVED — 0 red** |
| 2 | `remountEnemyProcess`: `egg.enemyType ?? 'bounder'` → `'bounder'` | AC-1 + AC-3 redden | 4 red ✓ |
| 3 | remount: `?? 'bounder'` → raw `egg.enemyType as EnemyType` | fallback guard reddens | 1 red ✓ |
| 4 | `spawnEgg`: `enemyType: victim.enemyType` → `'bounder'` | AC-2 reddens | 2 red ✓ |
| 5 | remount: `eggsLeft: egg.eggsLeft` → `0` | AC-4c reddens | 1 red ✓ |

**FINDING (R1-1, Medium, test-coverage) — the DEATH3 kill→egg-species WIRING is unguarded.**
Mutation 1 survived: deleting `enemyType: victim.enemyType` from `resolveContacts` (demo.ts, the ONE
`spawnEgg`-from-enemy producer) leaves the ENTIRE suite green. The AC-1/AC-3 end-to-end tests seed the
egg's `enemyType` DIRECTLY via `hatchingEggProc`, bypassing `resolveContacts`; AC-2 exercises `spawnEgg`
as a unit with a hand-built victim. So the seam that connects "a hunter enemy is killed in play" to
"its egg carries 'hunter'" — the story's actual gameplay path — has no test. A future edit that drops
that one line silently reintroduces the exact bug this story fixes (a killed hunter remounts a bounder),
and CI stays green. `resolveContacts` already threads `enemyType` for scoring, but nothing proves it
reaches `spawnEgg`.

**Why this blocks (one round):** it is the central behavioural claim of the story, not a peripheral
edge. The fix is a single integration test and the behaviour is already correct, so it lands as a
green regression guard — cheap to close, expensive to leave open.

**Required (route to TEA / RED):** add one test that drives the DEATH3 producer end-to-end — construct
two overlapping `JoustEntity`s where the loser is a `party:'enemy'` with `enemyType:'hunter'`, call
`resolveContacts`, and assert `result.egg.enemyType === 'hunter'` (and, ideally, step that egg through
to its remount and assert `enemyType`/`decision`='b2undr' — closing the whole kill→remount chain).
MUTATION obligation: deleting `enemyType: victim.enemyType` from `resolveContacts` must redden it.

**Nothing else flagged.** No design deviations to audit (session records none). Tests non-vacuous
(mutations 2–5). Types sound: `EnemyType` imported type-only into egg.ts (no cycle — joust.ts does not
import egg.ts); `enemyType?` optional is correct (wave eggs legitimately carry none). `??` (not `||`)
is right and load-bearing (mutation 3). The AC-5 "empty re-baseline" claim is verified — the full suite
is green with zero fixture edits, and the reason (no seeded fixture hatches a non-bounder) is sound.
## Dev Rework (round 1 → GREEN, review R1-1)

**R1-1 CLOSED.** Commit `116fba28`, pushed. Test-only — the Reviewer confirmed the production code
correct; the gap was a missing guard on the DEATH3 kill wiring.

Added two integration tests to `demo-jt9-47.test.ts` (same file — no README count change):
1. `resolveContacts(killed enemy, winning player).egg.enemyType === species` for all three (the direct
   kill of the surviving mutation — reuses the jt9-9 `enemyVictim`/`playerVictor` idiom).
2. Full chain: a REAL killed-hunter egg (species set ONLY by the kill, never hand-set) driven through
   `stepDemo` to its remount → `enemyType 'hunter'`, `decision 'b2undr'`.

**Mutation obligation re-verified:** dropping `enemyType: victim.enemyType` from `resolveContacts` now
reddens both new tests (`expected undefined to be 'bounder'`) — the survivor from round 1 is dead.
Full suite green: 147 files / 2980 joust tests, orchestrator 408/408, lint clean, zero collateral.
## Reviewer Assessment — Round 2 (Heimdall)

**Verdict: APPROVED.** Round-1's sole finding (R1-1) is closed.

- Round-2 diff (`57f1b815..HEAD`) is **test-only** — 56 insertions in `demo-jt9-47.test.ts`, zero `src/`
  change, so no regression could ride in with the fix.
- Independently re-ran the round-1 **survivor** mutation (delete `enemyType: victim.enemyType` from
  `resolveContacts`): it now **reddens both** new seam tests (`expected undefined to be 'bounder'`).
  The DEATH3 kill→egg-species wiring is guarded. Source restored clean (`git diff` empty).
- All round-1 mutation obligations still hold (production code unchanged): remount-hardcode → AC-1+AC-3,
  fallback raw-read → fallback guard, spawnEgg-hardcode → AC-2, PEGG-drop → AC-4c.
- Final state: 147 files / **2980** joust tests green, orchestrator 408/408, `tsc --noEmit` clean.
- No design deviations (session records none). AC-5's empty re-baseline verified (green with zero fixture
  edits). All 5 ACs met with verified mutation obligations; the story's real gameplay path now guarded.

No Critical/High/Medium findings remain. Approved for finish.

## Subagent Results

All 8 diff-based reviewer specialists are DISABLED in `.pennyfarthing/config.local.yaml`
(`reviewer_subagents: … all false`). Review was performed by Heimdall directly via an adversarial
**mutation battery** (5 mutations round 1 + the survivor re-verified round 2), recorded in the
Reviewer Assessments above.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | mutation-battery (manual, Heimdall) | Yes | complete | R1-1 (round 1, closed round 2) | verified |

All received: Yes
## Impact Summary (finish preflight)

APPROVED round 2, no blocking issues. R1-1 (Medium, test-coverage — DEATH3 kill→egg-species wiring
unguarded, a mutation survived in round 1) was CLOSED in round 2 by commit `116fba28` (test-only): two
integration tests through `resolveContacts`; the round-1 survivor mutation now reddens them. All AC
mutation obligations verified (AC-1/3 remount-hardcode, AC-2 spawnEgg-hardcode, AC-4c PEGG-drop, fallback
raw-read). AC-5 empty re-baseline verified. Final: 147 files / 2980 joust tests + 408 orchestrator green,
`tsc --noEmit` clean, no design deviations, zero collateral. PR #33.
