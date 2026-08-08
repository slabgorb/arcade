---
story_id: "jt9-49"
jira_key: "jt9-49"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-49: Scope the horizontal-homing throttle to a live level interval — stop homingWake ticking off-level

## Story Details
- **ID:** jt9-49
- **Jira Key:** jt9-49
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/jt9-49-scope-homing-throttle-live-level-interval
- **PR:** 40

## Impact Summary

**Shipped (PR #40, merged to develop 2026-08-07):** joust's horizontal-homing throttle (`BOLEVB` and twins) is now scoped to a live level interval — one call-site gate, `enemy.pjoy?.kind === 'interval'`, in `stepEnemyDetailed`. `homingWake` is byte-unchanged. Retires jt8-2's every-wake read and jt9-18's stale-PPVELX-during-seek residue. One review round, APPROVED.

- **Blocking:** 0. No Critical/High at any point; the single review round found only two Low items.
- **Low #1 (DOC):** jt9-18 AC-3's rationale comment went stale under the scoping — FIXED in place at review (commit `7fb1f6c5`), test 9/9 green.
- **Low #2 (TEST):** homing-wiring AC-4's four seeds now reverse at the same frame (chase-gated) — the round-2 "four distinct pads" diversity is no longer obtainable; teeth preserved via per-seed control (0 reversals), documented honestly. Accepted, non-blocking.
- **Migrations (all faithful, verified by probe + mutation battery):** homing.test.ts AC-4, homing-wiring AC-1/2/4 (seed 0xabc→0x2a), jt9-18 AC-1 (cliff-free posX 200). Determinism re-baseline: audio-events 0xface 4714→4182. README census 147→148.
- **Follow-ups filed:** none required. A latent-fragility note (a future story arming a non-level `interval` would silently re-open off-level throttling) is recorded in the Reviewer's Devil's Advocate — documentation, not a defect.
- **Out of scope / not this story:** 3 pre-existing missile-command file-load failures (active `mc2` epic WIP, sibling a-3); confirmed independent by stash.

## Story Type
Refactor (behaviour change scoped to WHEN the throttle ticks)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Repos:** arcade
**Phase Started:** 2026-08-07T10:01:25Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T23:30:52Z | 2026-08-06T23:33:41Z | 2m 49s |
| red | 2026-08-06T23:33:41Z | 2026-08-06T23:47:20Z | 13m 39s |
| green | 2026-08-06T23:47:20Z | 2026-08-07T09:54:58Z | 10h 7m |
| review | 2026-08-07T09:54:58Z | 2026-08-07T10:01:25Z | 6m 27s |
| finish | 2026-08-07T10:01:25Z | - | - |

## Background

From jt9-18 session archive, Reviewer "Improvement" finding (sprint/archive/jt9-18-session.md:109-116):

> `homingWake` gates on a STALE `ppvelx` during a seek entered after a level interval — the down/up decide does not clear the snapshot (`seekWake` :1256-1257 set `pjoy: undefined` but leave `homing` intact). The ROM never reaches the throttle (BOLEVB) off the level path, so faithfully the throttle should not tick during seeks at all; jt8-2's pre-existing "run homingWake every wake" deviation is the root, and jt9-18 only changes WHICH non-faithful value it reads there (stale snapshot vs live). Affects `plugins/joust/src/core/enemy.ts` (`homingWake`) — a follow-up could scope the throttle to a live level interval, retiring both this and jt8-2's every-wake deviation. Filed as jt9-49.

## ROM Ground Truth

- The horizontal-homing throttle is BOLEVB (`LDA PPVELX,U / CMPA PVELX,U`, JOUSTRV4.SRC:3939-3940). In the ROM the throttle is ONLY REACHED on the level-flight path — BOLEVB sits after BOLEV; the twin throttles B2LE11 (hunter, after B2LEV) and SHLEPB (shadow, after SHLEP) likewise sit on their level path. Off the level path (during down/up seeks) the ROM NEVER reaches the throttle.
- PPVELX is snapshotted at exactly THREE level-decide sites: BOLEV (:3907-3908), B2LEV (:4058-4059), SHLEP (:4281-4282), each right before that brain's decision-timer load.
- SHLEV steers via SHDIR (:4330), NOT the throttle — so SHLEV has no snapshot and no throttle tick.

## Current Port State

- `plugins/joust/src/core/enemy.ts` `homingWake` currently runs on EVERY wake (jt8-2's deviation), gating on `enemy.homing.ppvelx ?? target.velXIndex` (the jt9-18 snapshot override with a live-read fallback).
- jt9-18 (jt9-19) added `snapshotHoming` at the three level-decide sites; `seekWake` (enemy.ts ~1256-1257) sets `pjoy: undefined` but LEAVES `homing` intact — that stale snapshot surviving into a seek is the specific nuance this story retires.

## Scope Subtlety — Flag for TEA

jt9-18 DELIBERATELY chose the `?? target.velXIndex` fallback to AVOID migrating jt8-2's 127 hardened homing tests (homing.test.ts / homing-wiring), because a strict "throttle only on level wakes" rule changes their meaning. jt9-18's forward-impact note states: "any future story tightening the throttle to level-only wakes would revisit this. homing.test.ts is UNCHANGED." So jt9-49 legitimately MAY need to touch homing.test.ts / homing-wiring — TEA and the Reviewer decide whether the tightening forces migrating those tests. Do not pre-decide it in the ACs; write ACs about the OBSERVABLE behaviour.

## Acceptance Criteria

1. **Throttle ticks only during a live level interval.** The horizontal-homing throttle operates on level-flight wakes only — it does not tick during down/up seeks or on off-level/freshly-mounted wakes. Guard: a seeded replay sweep asserts that homingWake never increments PRDIR while `pjoy` carries a seek state (any pjoy without a level-flight correspondence).

2. **Stale PPVELX path is eliminated.** The stale-ppvelx-during-seek code path introduced as a workaround in jt9-18 is no longer exercised. Guard: `enemy.homing.ppvelx` is not read after a seek; verify by mutation and assertion.

3. **Test suite migration is optional.** jt9-18's jt8-2 homing tests may require re-baselining; if the tightening forces migrating homing.test.ts or homing-wiring, state that decision and justify it. If no test migration is needed, verify that existing homing tests still pass.

4. **Determinism is preserved.** Any change to when the throttle ticks must be validated against seeded-replay fingerprints (jt2 baseline); if any digests move, re-find them by sweeping for their own precondition, not by nudging a number toward the new output.

## Sm Assessment

**Setup by Baldur (SM), 2026-08-06.** Story jt9-49 (3pt, joust, tdd, type refactor) — a jt9-18 follow-up filed by that story's Reviewer.

- **Sibling probes clean before setup:** `git fetch --prune` + `git branch -r | grep jt9-49` → no remote branch; `.session/` sweep across `a-*` → only a-3 on mc2-6 (unrelated); merge gate → no open PRs. jt9-49 was free to claim.
- **Null description AND null acceptance_criteria in the epic YAML.** ACs were DERIVED (not copied) from the authoritative filing: the jt9-18 session archive's Reviewer "Improvement" finding (`sprint/archive/jt9-18-session.md:109-116`) plus the ROM ground truth (BOLEVB throttle sits on the level path only; PPVELX snapshotted at three level-decide sites). Both are quoted into Background / ROM Ground Truth above.
- **One real scope subtlety flagged to TEA (do not let it be mistaken for out-of-scope):** jt9-18 deliberately used the `?? target.velXIndex` fallback to avoid migrating jt8-2's 127 hardened homing tests; its own forward-impact note says a story "tightening the throttle to level-only wakes would revisit this." So touching `homing.test.ts` / `homing-wiring` is legitimately in play here — TEA + Reviewer decide, ACs pin OBSERVABLE behaviour rather than pre-deciding the migration.
- **Claim pushed** on `feat/jt9-49-scope-homing-throttle-live-level-interval` (commit `91045e33`): epic stamp `in_progress` + context file. `.session/` is gitignored. Story status verified `in_progress`.
- The phase pointer read `setup` on arrival; required fields (Workflow / Repos / phase pointer) all present, exactly one phase-pointer occurrence.

**Route:** → TEA (Tyr One-Handed) for the RED phase. No code was read for planning; discovery reads only.

## Tea Assessment

**RED by Tyr One-Handed (TEA), 2026-08-06.** New file `plugins/joust/tests/joust-jt9-49-throttle-scope.test.ts` — 7 failing + 3 guard, all whole-wake via `stepEnemyDetailed` (representation-agnostic about HOW the scoping is done).

**What the code says (verified firsthand, not inferred):**
- `stepEnemyDetailed` calls `homingWake` on every wake's entry state (`enemy.ts:1430`), before the seek/brain runs — jt8-2's every-wake deviation. `homingWake` (`enemy.ts:1056`) has no knowledge of level/seek state; it gates purely on `homing.ppvelx ?? target.velXIndex` vs the enemy's own index.
- `seekWake` routes a down/up decide to `pjoy: undefined` + `seek: {mode}` but LEAVES `homing` intact (`enemy.ts:1383-1384`) — the stale-ppvelx-during-seek residue.
- **PROBE (file-dumped; vitest swallows console.log):** a bounder below a player, both at FLYX index 8, primed — on wake 0 it enters an UP-seek (`seek.mode='up'`, `pjoy.kind='wing'`) and the current throttle nonetheless flips its facing (`-1`) and clears `prdir` (`0`) that same off-level wake. That is the retired behaviour, measured.

**Test design:** `prdir` is the observable (the throttle is its ONLY writer); `facing` corroborates for the BOUNDER only (it never steers — a hunter's facing is also written by `steerWake`/B2DIR). RED = no-tick-during-seek; GUARD = tick-during-interval. Only a *correctly-scoped* throttle satisfies both — a fix that deleted the throttle entirely would redden the GUARD (mutation-sound per typescript.md #15).

**Scope call I made (the Subtlety above, resolved):** I pin the ROM-UNAMBIGUOUS off-level cases (down-seek, up-seek, mount-decides-UP — the ROM runs BODN1/BOUP1, never BOLEVB). I deliberately do NOT pin the mount-to-LEVEL wake, where the ROM's decide falls through into BOLEVB the same wake — that read-vs-decide ordering is a Dev/Reviewer design choice, not a TEA mandate.

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)
| Rule | How covered |
|------|-------------|
| #15 every guard mutation-tested (delete mechanism ⇒ red) | GUARD reddens if the throttle is deleted; RED tests reddens under the current every-wake read. Triangulated, not vacuous. |
| #15 assert where the mechanism fires | Observable is `prdir`/`facing` on the assembled `stepEnemyDetailed` state, not a source-text token. |
| #17/#18 no unre-run mechanism claims | Assertions are on runtime counters; ROM cites live only in comments, never in `expect(...)`. |
| test-quality self-check (Phase C) | No `let _ =`, no `assert(true)`, no always-true predicate. AC-3's `.toBe('up')` sanity-guards the fixture actually routes up. `tsc --noEmit` clean. |

## Dev Assessment

**GREEN by Loki Silvertongue (Dev), 2026-08-07.** joust suite 3018/3018; `tsc --noEmit` clean. Two commits: `4fad7d8c` (fix + behavioural migrations), `a639da42` (seeded/in-play re-baselines) — kept separate per the joust fingerprint-mover convention.

- **The fix is a one-line call-site gate:** `const inLevelInterval = enemy.pjoy?.kind === 'interval'; const flipped = inLevelInterval ? homingWake(enemy, target) : enemy`. `homingWake` is untouched (stays a pure throttle → jt8-2's 127 direct-call tests all green). This is the low-collateral mechanism TEA recommended.
- **User ruling drove the scope:** full-fidelity (`pjoy==='interval'`) over seeks-only. Confirmed all 7 RED + 3 GUARD pass, then migrated every casualty.
- **Migration surface was LARGER than TEA predicted** (see Findings). Every casualty was verified faithful by file-dumped probe before migrating (vitest swallows console.log): the reversal/tick now happens in a `pjoy.kind==='interval'` state in each case.
- **Determinism:** only two seeded fingerprints moved (audio-events 0xface 4714→4182; homing-wiring AC-4 seed set), both re-swept for their own precondition. The full joust replay/fingerprint suite is otherwise bit-identical — matching jt9-18/jt9-45's narrow-movement precedent.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Gap / non-blocking] The migration surface exceeded TEA's RED prediction.** TEA foresaw only `homing-wiring` AC-1/2/4. GREEN also had to migrate: (a) `homing.test.ts` AC-4 ×2 — it drives the whole wake (`stepEnemy`) with a target ABOVE (up-seek) to force a flap, so it asserted the off-level tick; re-staged to a level interval keeping the flip-before-step discriminator. (b) `joust-jt9-18-ppvelx-snapshot` AC-1 b2undr — its posX-100 hunter fell into a B2AV `dwell` (where the ROM also skips the throttle, so the gate is right); moved to a cliff-free posX 200. Both are faithful consequences; TEA's "homing.test.ts unaffected" held only for its DIRECT-`homingWake` tests, not the whole-wake AC-4. *Found by Dev during GREEN.*
- **[Question / non-blocking, PRE-EXISTING, NOT jt9-49] missile-command has 3 file-load failures on this branch:** `tests/cursor.test.ts`, `tests/explosion.test.ts`, `tests/field.test.ts` (0 failed tests — collection/load errors). CONFIRMED pre-existing by stashing my `enemy.ts` change and re-running: they still fail. jt9-49 touches only `plugins/joust/**`; missile-command does not import joust. Almost certainly the active `mc2` epic's WIP (sibling a-3 on `mc2-6`, branch `feat/mc2-6-dossier-prose-citation-sweep`). Flagged here so it is not forgotten — owner is the mc2 epic, not this story. *Found by Dev during the full-suite check.*

- **[Conflict / blocking-for-GREEN] `homing-wiring.test.ts` AC-1 & AC-4 are CASUALTIES of the correct fix — migrate them to the LEVEL path.** Their player is placed HIGH on purpose (`player()` comment: "airborne HIGH (so the bounder seeks UP and therefore flaps)", pixelY 60 vs the bounder's 120), so they assert the throttle reversing the bounder DURING an up-seek — the exact off-level tick this story retires. The probe confirmed the bounder is still up-seeking at wake 5 (never reaches level within the 4-frame window), so `AC-1`'s `facings.toContain(-1)` and the seeded `AC-4` will go RED the moment Dev scopes the throttle. **This is not a bug in the fix; it is the pre-existing test asserting the removed behaviour.** *Migration recipe:* put the player at the SAME altitude as the bounder (level route → interval armed → `BOLEVB` faithfully reached), keeping the wiring assertion (player `velXIndex` → throttle) intact and the control (different index → no tick) unchanged. `homing.test.ts` (jt8-2's 127 tests) calls `homingWake` DIRECTLY and is UNAFFECTED if the scoping lives at the call site — strongly prefer that mechanism to keep collateral to these two wiring tests. *Found by TEA during RED.*
- **[Improvement / non-blocking] `joust-jt9-18-ppvelx-snapshot.test.ts` AC-3's RATIONALE COMMENT goes stale.** Its case-2 assertion ("absent snapshot ⇒ live fallback ⇒ flip") still holds as a pure-`homingWake` contract, but its comment says the fallback "keeps the off-level throttle and jt8-2's suite unchanged." After this story the off-level throttle is GONE (that's the point). If Dev scopes at the call site, `homingWake`'s pure behaviour is unchanged (assertion green) but the comment's justification is false — update it to "homingWake is now only CALLED on the level path." *Found by TEA during RED.*
- **[Question / non-blocking] Determinism re-baseline is Dev's to MEASURE, not assume.** Scoping the throttle changes WHICH wakes tick, so seeded replays MAY shift — but per jt9-18/jt9-45 precedent the throttle fires in narrow conditions and the fingerprint often does not move. Measure it (do not nudge digests toward output); re-baseline in a SEPARATE commit if any move. *Found by TEA during RED.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (RED) — pinned at the whole-wake level; hardened-test migration deferred to GREEN
- **What:** RED pins the scoping via `stepEnemyDetailed` (whole wake), NOT by calling `homingWake` directly with a level/seek argument. **Why:** the mechanism (call-site guard vs a state-read inside `homingWake`) is Dev's choice; a whole-wake pin is faithful to either. Pinning inside `homingWake` would have prescribed the more invasive mechanism and forced the `homing.test.ts` migration jt9-18 avoided.
- **What:** I did NOT pre-migrate `homing-wiring.test.ts` AC-1/AC-4 in the RED commit, though they WILL redden under the fix (see Delivery Findings). **Why:** this repo's convention is that re-baselines/migrations land in GREEN alongside the code change (jt9-18/jt9-45 precedent), and leaving them out keeps the RED signal clean (exactly 7 intended failures, nothing else). The migration recipe is handed to Dev in the Delivery Findings; the Reviewer confirms it (the SM setup assigned this call to "TEA and the Reviewer").
- **What:** README joust file count bumped 147→148 in the RED commit. **Why:** `audio-seam-scope`'s derived census reddens on any new `*.test.ts`; bumping at RED time is the standing joust convention.

### Dev (GREEN) — USER RULING: full fidelity gate + the migrations it entails
- **Fix:** `stepEnemyDetailed` gates the throttle on `enemy.pjoy?.kind === 'interval'` (a live level interval) at wake entry, BEFORE the brain (keeping jt8-3's same-wake steer). `homingWake` itself is unchanged — a pure throttle. One-wake-late on the level-DECIDE wake (documented at the call site) because the port cannot know the decide outcome before the brain.
- **Ruling (user, 2026-08-07):** offered *full-fidelity* (`pjoy==='interval'` — retires seeks + cliff dwells + mount-decides-up, matches the story TITLE) vs *seeks-only* (`seek===undefined` — minimal disruption). **User chose full-fidelity.** This EXPANDS the migration beyond TEA's predicted two wiring tests — TEA's "homing.test.ts unaffected" was proven wrong (probe): `homing.test.ts` AC-4 drives the whole wake with a target ABOVE (up-seek) and asserts the off-level flip, and `jt9-18` AC-1's b2undr fixture lands on a cliff (enters a B2AV `dwell`, where the ROM also skips the throttle). Both, plus `homing-wiring` AC-1/2/4, are migrated to level-path fixtures; determinism re-baselined. All are faithful consequences the story anticipated ("revisit jt8-2's tests").

### Deviation Audit (Reviewer)
- **TEA (RED) — whole-wake pinning + deferred migration** → ✓ ACCEPTED by Reviewer: agrees; the whole-wake pin is mechanism-agnostic and the deferred migration matches jt9-18/jt9-45 convention. The RED signal was clean (7 intended, verified by mutation M1).
- **TEA (RED) — README 147→148** → ✓ ACCEPTED: standing `audio-seam-scope` census convention.
- **Dev (GREEN) — `pjoy?.kind === 'interval'` gate, one-wake-late on decide** → ✓ ACCEPTED by Reviewer: the offset is real, disclosed at the call site, and strictly MORE faithful than jt8-2's every-wake read it replaces (the port cannot know the decide outcome before the brain without moving the flip after the steer, which jt8-3 forbids). Captured by the determinism re-baseline.
- **Dev (GREEN) — full-fidelity per user ruling + hardened-test migrations** → ✓ ACCEPTED by Reviewer: each migrated fixture verified faithful (reversal/tick now in a `pjoy==='interval'` state) and non-vacuous (mutation M2 reddens all 11 migrated level-path tests).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (3018 green, lint clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings |

**All received:** Yes (1 enabled subagent returned clean; 8 disabled via `workflow.reviewer_subagents`, so I ran a MUTATION BATTERY myself — the standing joust practice when specialists are off)
**Total findings:** 2 confirmed (both [LOW], 1 fixed-in-place), 0 dismissed, 0 deferred

## Reviewer Assessment

**Review by Heimdall (Reviewer), 2026-08-07. Verdict: APPROVED.** 8 of 9 specialists disabled, so the real hunting was a mutation battery + firsthand shadow-path analysis.

### Observations
1. **[VERIFIED] The gate is the correct faithful condition.** `pjoy?.kind === 'interval'` is armed ONLY by level decides — `seekWake` (enemy.ts:1391) and `shadowDwellWake` (enemy.ts:1779); every non-level state is `wing`/`seek`/`dwell`/`climb`/`lava`/`glide`/`undefined`. So an `interval` entry is always a live level interval — no false positive. Evidence: enemy.ts:1365-1391, 1768-1781.
2. **[VERIFIED] The gate is pinned in BOTH directions (mutation battery).** M1 (`= true`, restore every-wake) reddens exactly the 7 jt9-49 off-level RED tests. M2 (`= false`, dead throttle) reddens the 3 GUARDs PLUS all 11 migrated level-path tests (homing.test AC-4, jt9-18 AC-1, homing-wiring AC-1/2/4). The throttle is neither over-scoped nor dead code.
3. **[VERIFIED] The SHADOW path is sound — my top adversarial concern, cleared.** `shadowDwellWake` arms `interval` for BOTH SHLEP (target present → PPVELX snapshot, has throttle SHLEPB) and SHLEV (null target → no throttle, steers via SHDIR). My worry was the gate wrongly throttling during SHLEV — but `homingWake` returns early on `target === null` (enemy.ts:1062), and SHLEV is the null-target route by construction, so it holds regardless. SHLEP (target present) throttles correctly. No shadow regression.
4. **[VERIFIED] Low-collateral mechanism.** `homingWake` is byte-unchanged (the diff only wraps its CALL), so jt8-2's 127 direct-`homingWake` tests in homing.test.ts are untouched by construction — exactly the property that kept collateral to whole-wake tests.
5. **[LOW][DOC] jt9-18 AC-3 rationale comment was stale — FIXED in place.** It claimed "this port runs it every wake" and "leaving off-level/freshly-mounted wakes unchanged," both reversed by jt9-49. The assertions still hold (pure-`homingWake` contract), but the rationale described the pre-jt9-49 world. TEA predicted this; Dev missed it. I corrected the comment (doc-only; test stays 9/9 green) rather than bounce an otherwise-correct story for a Low.
6. **[LOW][TEST] homing-wiring AC-4 frame-diversity collapsed to frame 91.** Under the scoped throttle the reversal is chase-gated, so all four seeds now flip at the same frame — the round-2 Reviewer's "four distinct pads/frames" hardening is no longer obtainable. The guard's TEETH are preserved (per-seed control = 0 reversals proves causation; verified by sweep + mutation M2), and the collapse is documented honestly in the fixture comment. Non-blocking; a future refactor of the chase would fail all four identically rather than partially, which is an acceptable robustness trade for a faithful fix.
7. **[VERIFIED] Determinism.** Only two seeded fingerprints moved (audio-events 0xface 4714→4182; homing-wiring seed set), each re-swept for its own precondition (not nudged toward output). Full joust suite 3018/3018 — the rest of the replay/fingerprint corpus is bit-identical, matching the jt9-18/jt9-45 narrow-movement precedent.

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md`)
- **#15 (every guard mutation-tested):** satisfied — the jt9-49 tests are mutation-sound (M1/M2 confirm both directions); the migrated tests are non-vacuous (M2 reddens them).
- **No `!` non-null assertion / no `as any`:** the change uses `enemy.pjoy?.kind === 'interval'` — a clean optional-chain narrowing, no cast, no assertion. Compliant.
- **#17/#18 (comments asserting a mechanism nobody re-ran):** the gate's own comment is accurate (verified against the two probes); the one stale comment (jt9-18 AC-3) is fixed. Compliant after fix.
- **No new types/enums/constructors** in the diff, so the constructor/`non_exhaustive`/serde rules do not apply. **No security/tenant surface** (a deterministic pure-sim gate). N/A by inspection.

### Devil's Advocate
Suppose this is broken. The most dangerous claim is that `pjoy?.kind === 'interval'` cleanly means "on the level path." Could an `interval` ever be armed off the level path? I traced both arming sites: `seekWake:1387-1391` arms it only after `route` resolves to neither down nor up (the level fall-through), and `shadowDwellWake:1774-1779` only after the `level` predicate holds. Down/up seeks explicitly set `pjoy: undefined` (1383-1384). So no — but this is a load-bearing invariant: if a FUTURE story armed an `interval` for a non-level episode, this gate would silently throttle off-level again, and no test names that coupling. That is a latent fragility worth a comment, though not a defect today. Next, the one-wake-late offset: on the mount-decides-level wake the ROM ticks and the port now does not, so a wave of enemies that all mount into level flight will each flip one wake later than the arcade — does that compound? No: the counter still decrements once per matched interval wake; only the phase shifts by one, and it cannot desync because every held wake re-arms the same interval. A confused reader of homing-wiring AC-4 might now believe the four seeds prove pad-diversity — they no longer do; I downgraded that to a documented Low. What about a malicious fixture: could someone construct an `interval` enemy with a `ppvelx` that matches while the enemy is genuinely mid-seek? Only by hand-building an inconsistent state (interval + seek set simultaneously), which `seekWake` never produces — the two are mutually exclusive in every real wake. Finally, the null-target shadow: if `snapshotHoming` ever returned a non-null-derived snapshot for a null target, SHLEV could throttle — but it returns `enemy.homing` unchanged for `target === null` (enemy.ts:678), and `homingWake` early-returns on null anyway, a double guard. I could not turn any of these into a red test against the shipped code. The fix holds.

### Verdict
**APPROVED.** No Critical or High. Two Low findings: one DOC (fixed in place), one TEST-robustness (documented, teeth preserved). The gate is faithful, minimal, pinned in both directions by a mutation battery, and the shadow edge is doubly guarded. Determinism re-baselines are honest (swept for preconditions). The pre-existing missile-command failures are not this story's (confirmed by stash). Ready to merge.