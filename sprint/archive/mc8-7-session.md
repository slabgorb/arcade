---
story_id: "mc8-7"
jira_key: "mc8-7"
epic: "mc8"
workflow: "tdd"
---
# Story mc8-7: Bonus-city cue timing

## Story Details
- **ID:** mc8-7
- **Jira Key:** mc8-7
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/mc8-7-bonus-city-cue-timing
- **PR:** 193

## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Phase:** finish
**Phase Started:** 2026-08-10T09:29:23Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-10T08:54:21Z | 2026-08-10T08:57:14Z | 2m 53s |
| red | 2026-08-10T08:57:14Z | 2026-08-10T09:05:34Z | 8m 20s |
| green | 2026-08-10T09:05:34Z | 2026-08-10T09:08:05Z | 2m 31s |
| review | 2026-08-10T09:08:05Z | 2026-08-10T09:21:00Z | 12m 55s |
| green | 2026-08-10T09:21:00Z | 2026-08-10T09:23:30Z | 2m 30s |
| review | 2026-08-10T09:23:30Z | 2026-08-10T09:29:23Z | 5m 53s |
| finish | 2026-08-10T09:29:23Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings.

### Reviewer (code review)
- **Improvement** (non-blocking): the audio-surface recording fakes widen `SoundName`/`LoopName` to bare `string` (the "mc8-2 idiom") in both mc8-4 and the new mc8-7 test files. Affects `plugins/missile-command/tests/mc8-4-event-wiring.test.ts` and `mc8-7-bonus-city-grant-timing.test.ts` (tighten the mock `play`/`startLoop`/`stopLoop` signatures to the real `AudioEngine` types — a fleet-wide test-hygiene cleanup, not this story). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the round-2 comment in `plugins/missile-command/src/shell/audio-dispatch.ts:~119` attributes the wave advance to `resumePlay`, but `resumePlay` only flips the phase 'between'→'play' — the increment is the sibling `wave: nextWave` (`core/game.ts:220`) in the same object literal. The substantive claim ("the between→play beat ALWAYS advances the wave") is true; only the attribution is imprecise. Tidy the parenthetical on a future touch. *Found by Reviewer during round-2 review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

No deviations.

### Reviewer (audit)
- **UNDOCUMENTED:** Dev chose a bare alive-delta (`alive(curr) > alive(prev)`) for the bonus-city edge, whereas the sibling `whoop`/`end-game` edges are self-correct at the function's single exit. Spec/local pattern implied a self-correct pure edge; the code instead relies on an unstated `main.ts` caller invariant (`prev` re-captured each frame absorbs the `startGame` restart). Severity: HIGH → **FLAGGED** (see Reviewer Assessment, `[RULE]` #14). Resolved by the wave-gate rework.
  - **Round-2 confirmation:** the wave-gate (`2e092865`) makes the edge self-correct off any (prev, curr) pair; rule-checker mutation-verified the fix. FLAG **CLEARED**.

## SM Assessment

**Story:** mc8-7 (2pt, missile-command, tdd/phased, type: refactor, p3) — move the bonus-city `BN`/`SBONUS` cue from the mid-play score-threshold crossing to the faithful between-wave city grant (W3MAIN:4845).

**Board:** Clean. No remote branch for mc8-7 at setup; sibling sessions (a-1: mc6-4, a-2: pm4-4) are unrelated stories; merge gate empty (no open PRs). No contention.

**Premise verified against the current tree (accurate, no correction block needed):**
- The cue fires today in `plugins/missile-command/src/shell/audio-dispatch.ts` `playEdgeCues` (line 118): `bonusCitiesEarned(curr.score, interval) > bonusCitiesEarned(prev.score, interval)` — the frame the running SCORE crosses a threshold DURING PLAY. Its own comment already cites `W3MAIN:4845` (the grant site) while firing at the wrong moment — that mismatch is the bug.
- The faithful grant site is the between-wave regen block in `plugins/missile-command/src/core/game.ts` (`if (state.phase === 'between')`, ~206-224): `bonusCitiesEarned(state.score, bonusInterval(0))` folded into `cityReserve`, applied by `regenerateCities`.
- Sound data `BN` in `core/sound-tables.ts:84`; `'bonus-city' -> 'BN'` in `shell/audio.ts:74`.

**Derived ACs:** Story YAML carried no `acceptance_criteria`, so sm-setup derived 5. Reviewed — faithful to the premise, correctly fence audio into the shell (core purity guard holds). Not rewritten.

**Setup gaps closed (both known-recurring):** sm-setup omitted `**Repos:**` (added `arcade`) and left status at `backlog` (stamped `in_progress`). Session has exactly one phase pointer.

**Claim pushed:** `feat/mc8-7-bonus-city-cue-timing` @ b0dee88f (epic stamp + context), sibling probe lit.

**Routing:** Phased tdd → RED phase → TEA (Han Solo). Core/shell boundary is the load-bearing constraint for TEA's RED test — the cue's grant-detection must be derivable from prev/curr GameState in the shell.
## TEA Assessment (RED)

**RED committed:** `797b078d` — 3 failing tests pin the corrected bonus-city cue-timing contract, 1115 passing (no collateral regression across the missile-command suite).

**The contract (what Dev must make GREEN):** `playEdgeCues` (`plugins/missile-command/src/shell/audio-dispatch.ts:115-120`) currently fires `bonus-city` the frame the running SCORE crosses a threshold (`bonusCitiesEarned(curr.score) > bonusCitiesEarned(prev.score)`) — i.e. mid-play, when a kill banks the points. Move it to the wave-end GRANT (W3MAIN:4845).

**New tests — `plugins/missile-command/tests/mc8-7-bonus-city-grant-timing.test.ts`:**
1. *(RED — currently fires, must not)* A mid-play threshold crossing (two `phase:'play'` frames, same wave) plays NO `bonus-city`. Two intervals covered (first + a higher one).
2. *(RED — currently silent, must fire once)* A **real wave-end grant** — `betweenState(1,1,10_000)` stepped through the actual `stepGame` regen so the bonus recovers a lost city (alive 5→6) — plays `bonus-city` exactly once. Also asserts the same edge still fires `whoop` (proves it's a genuine transition, not a forged pair).
3. *(passes now, guards forward)* The grant fires ONCE — the next in-wave frame does not re-announce.
4. *(passes now, mutation guard)* A bonus-FREE wave advance stays silent — catches a naive "fire bonus-city on wave++" (whoop's edge) mis-fix; asserts `whoop` fires but `bonus-city` does not.

**Design note for Dev — the detection seam:** the tests drive the grant through real `stepGame`, so they are AGNOSTIC to how you detect it. The (prev, curr) pair carries everything: at a between→play transition the alive-city count rises when the bonus recovers a loss. The natural faithful signal is the alive-city delta at the wave edge (dead cities never revive mid-wave, so an increase ⟺ a bonus grant). Compute it in the SHELL from prev/curr GameState — **do not add audio state to core** (the purity guard scans `src/core/`).

**Scope boundary (out of scope, noted so Reviewer doesn't flag it):** a bonus EARNED while the board is already full (banked against a later loss, NCITY-capped, no visible city this wave) is not exercised — AC1 says "when new cities are actually GRANTED." Keying on the visible grant is faithful to the AC as written; the capped-bank cue timing is a separate fidelity question, not this 2pt story.

**Superseded tests:** the refuted mc8-4 AC3 block (`mc8-4-event-wiring.test.ts`) asserted the mid-play crossing SHOULD fire — retired here with a pointer comment; the stale `edge: bonusCitiesEarned++` comments were corrected, and the now-orphaned `bonusInterval` import removed. `npm run lint` (tsc --noEmit) clean.

**Handoff → Dev (Yoda), GREEN phase.**
## Dev Assessment (GREEN)

**GREEN committed + pushed:** `21ade75f` — full missile-command suite 1118/1118, `npm run lint` (tsc --noEmit) clean.

**Change (shell-only, minimal):** `plugins/missile-command/src/shell/audio-dispatch.ts`, `playEdgeCues`. Replaced the mid-play bonus-city trigger — `bonusCitiesEarned(curr.score, interval) > bonusCitiesEarned(prev.score, interval)` — with a wave-end grant detector: `alive(curr) > alive(prev)` where `alive(s)` counts `s.cities` with `alive === true`. Removed the now-unused `bonusCitiesEarned, bonusInterval` import from `../core/wave.js`.

**Why the alive-delta is the faithful grant signal (per TEA's design note):** dead cities never revive within a wave (the mc3-4 invariant), so the alive-city count rises only when the between→play REGEN tops the board up from the reserve (`START_CITIES − citiesLost + bonusCitiesEarned`). That rise IS the W3MAIN:4845 grant. It reads purely off the (prev, curr) GameState pair, so the logic stays in the shell — **core carries no audio concern** (purity guard green).

**Verification:**
- mc8-7 contract: 5/5 pass (was 3 failing). Mid-play crossings (both intervals) now silent; the real `stepGame` wave-end grant sounds `bonus-city` once and still rides `whoop`; bonus-free wave advance stays silent.
- Whoop / end-game edges untouched; no other file changed.

**No design deviations.** Implementation matches the story scope and TEA's tests exactly; the NCITY-capped banked-bonus case remains out of scope as TEA flagged.

**Handoff → Reviewer (Obi-Wan Kenobi), review phase.**
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1118/0, lint clean) | — |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 (1 high, 1 med, 1 low) | confirmed 1 (HIGH comment), deferred 1 (restart test), noted 1 (LOW nit) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | — |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 3 (#14 risk, #17 comment, #8 low) | confirmed 2 (#14+#17, same root cause), noted 1 (#8 pre-existing) |

**All received:** Yes
**Total findings:** 2 confirmed (one root cause — #14 edge + #17 comment), 1 deferred (restart-guard test, recommended), 2 noted-not-actioned (#8 pre-existing mock idiom; LOW backtick nit)

## Reviewer Assessment

**Verdict:** REJECTED

**Summary:** The timing fix is functionally correct in the current wiring and all 1118 tests pass — but the new bonus-city predicate `alive(curr) > alive(prev)` (`audio-dispatch.ts:123-124`) violates lang-review **#14** (a derived state-machine edge computed without covering every transition that can move its value), and its justifying comment (`:120-122`) violates **#17** (a universal claim that is true only for the `stepGame` case). Three independent reviewers — comment-analyzer, rule-checker, and my own hunt — converged on ONE root cause: a new-game restart (`startGame`, `'over'`→fresh `'play'`, `core/game.ts:163-166`) ALSO raises the alive-city count from ~0 to 6 and is NOT a wave-end grant. The cue stays silent on it today only because `main.ts:70-72` re-captures `const prev = game` fresh each frame, so the restart (applied in the keydown handler via `fireOrStart`) is never presented to `playEdgeCues` as a `(prev, curr)` pair — an accident of wiring, not a property of the predicate. The sibling `whoop` (`:110`) and `end-game` (`:113`) edges one/two lines above ARE self-correct at the function's single exit; bonus-city is the odd one out. The fix is one line and matches `whoop` exactly.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] `[RULE]` #14 | Bonus-city edge has no wave/phase guard; both `stepGame` REGEN (the grant) and `startGame` reset raise the alive-count, so the predicate is correct only by an unstated `main.ts` caller invariant. A future refactor routing restart through the diffed exit (as whoop/end-game already are) silently sounds `bonus-city` on every new game — a missing/extra-output bug no snapshot test catches. | `audio-dispatch.ts:123-124` | Gate on the wave advance to match the sibling `whoop`: `if (curr.wave > prev.wave && alive(curr) > alive(prev)) audio.play('bonus-city')`. A grant always coincides with `wave++` (`resumePlay` 'between'→'play', `game.ts:218`), so no real grant is suppressed; a restart resets wave DOWN to 1, so it is excluded even if ever diffed. Verified test-safe: all 5 mc8-7 tests + full suite stay green. |
| [MEDIUM] `[DOC]`/`[RULE]` #17 | Comment asserts "a rise in the alive-city count IS a wave-end grant" as unconditional; false for the `startGame` reset (same root cause). | `audio-dispatch.ts:120-122` | Reword to the true, wave-gated claim: a bonus city is granted only at the wave-end regen, which increments the wave — so the cue keys on a wave-advance frame whose alive-count rose. Drop the unqualified "a rise IS a grant". |

**Recommended (not blocking) — lock the fix with a regression test (TEA's RED):**
- Add a restart-guard case to the authoritative `mc8-7-bonus-city-grant-timing.test.ts`: `playEdgeCues(over, startGame(over))` (or any wave-reset pair) asserts NO `bonus-city`. It is RED on the current code (fires) and GREEN once the wave-gate lands — a proper RED→GREEN that pins the self-correctness. This is why the rework routes through RED (TEA) first.

**Noted, NOT actioned (out of scope):**
- `[RULE]` #8 (LOW): the `recorder()` fake widens `SoundName`/`LoopName` to `string` (`mc8-7…test.ts:40,43,46`). Rule-checker confirms this is a verbatim copy of the pre-existing mc8-2 idiom (`mc8-4…test.ts:37,40,43`), not introduced here. Leave it; a fleet-wide mock-typing cleanup is its own story.
- `[DOC]` (LOW nit): the retired-AC3 comment (`mc8-4…test.ts`) paraphrases the old code without the `.score`/`interval` args. Trivial; Dev may correct the backticks while in the file.
- Scope boundary confirmed sound: the NCITY-capped banked-bonus case (bonus earned while board full, no visible city) stays out of scope per TEA — the AC says "cities actually granted." Not a finding.

### Dispatch tags
- `[RULE]` — **CONFIRMED (2, one root cause):** #14 edge (HIGH) + #17 comment (MEDIUM); #8 noted pre-existing. Rule-checker ran all 26 checks, 34 instances, 3 violations.
- `[DOC]` — **CONFIRMED:** comment-analyzer independently found + probe-verified the same `:120-122` overreach (its HIGH); corroborates #17. Its restart-test gap → the recommended TEA test. Backtick nit = LOW noted.
- `[SEC]` — **clean:** security-scan returned no findings; pure client-side audio cue, no user input / injection / secrets / auth. Verified: `audio.play('bonus-city')` is a literal, both inputs are engine-computed GameState.
- `[EDGE]` — specialist disabled via `workflow.reviewer_subagents`; I performed the edge analysis myself (the restart transition IS the edge — see #14).
- `[SILENT]` — specialist disabled; no swallowed errors possible (no try/catch, no fallbacks in the 2-line change).
- `[TEST]` — specialist disabled; I assessed test quality myself: the grant test drives REAL `stepGame` (non-vacuous, rule-checker #18/#26 compliant), fixture guards are pre-conditions separate from the outcome assertions. Gap: no restart-guard case (the recommended TEA test).
- `[TYPE]` — specialist disabled; `alive(s: GameState): number` is specifically typed, no casts/`any` (rule-checker #1/#2 clean).
- `[SIMPLE]` — specialist disabled; the change is already minimal — the wave-gate adds one term, not complexity.

### Rule Compliance (lang-review/typescript.md, applicable rules enumerated)
- **#1 Type-safety escapes** — COMPLIANT. `alive()` (:123) no `as any`/`@ts-ignore`/non-null; tests no casts.
- **#2 Generic/interface pitfalls** — COMPLIANT. `alive(s: GameState): number` specific, `s` not mutated (`reduce`).
- **#4 Null/undefined** — N/A. No `??`/`||`/optional-chaining added.
- **#5 Module/declaration** — COMPLIANT. Dead `bonusCitiesEarned, bonusInterval` import removed from both files; all relative imports carry `.js`; `type GameState` type-only.
- **#8 Test quality** — 1 LOW (mock signature widening, pre-existing idiom, noted not actioned). Otherwise real functions driven, not reimplemented.
- **#13 Fix-introduced regressions** — COMPLIANT. No `as any`/`||` introduced.
- **#14 Derived edges** — 1 HIGH VIOLATION (bonus-city, above). `whoop`/`end-game` COMPLIANT (self-correct at single exit).
- **#17 Comment mechanism** — 1 MEDIUM VIOLATION (:120-122 overreach). The grant-math comment (:114-119) COMPLIANT (matches `game.ts:206-224`); the mc8-4 retirement note COMPLIANT.
- **#18/#22/#24/#26** — COMPLIANT. Non-vacuous tests; `>`-comparison, `alive()` never NaN (non-neg int); old AC3 fully deleted not half-updated; assertion terms trace to real `playEdgeCues`.
- #3, #6, #7, #9, #10, #11, #12, #15, #16, #19, #20, #21, #23, #25 — N/A to this diff.

### Devil's Advocate
Assume this cue is broken. The loudest attack is the one all three reviewers landed on, so let me push it harder than "a future refactor might." The function is `export`ed and its OWN comment advertises the contract "main.ts keeps `prev` and calls this per frame" — i.e. it invites callers to diff any two frames. The test file already exercises it with hand-built states, not just main.ts's stream. So the "caller never feeds a restart pair" invariant is undocumented AND actively contradicted by how the function presents itself. A maintainer adding a "restart flash" cue, or moving `startGame` into `stepGame`'s `'over'` branch (the architecturally natural home, right next to where whoop/end-game already resolve), would diff `over(0 alive)`→`play(6 alive)` and hear a spurious bonus-city fanfare on every new game — and no existing test would go red, because the suite never diffs a restart. That is precisely the #14 failure mode: a missing/extra output invisible to snapshot and replay tests. What about a confused player? None audible today — I traced it: `fireOrStart`→`startGame` mutates `game` in the keydown handler (`input.ts:118`, `main.ts:62-68`), and `frame()` re-reads `prev` at the top (`main.ts:70`), so the 0→6 jump is baked into `prev` before the next diff. Verified in both directions. What about huge/degenerate inputs? `alive()` reduces a fixed 6-element array; never NaN, never throws. What about the pause phase (mc6-3)? `pauseFromKey` flips play↔pause without touching cities, so no alive-count move — safe. The residual, then, is not a today-bug but a latent one guarded only by luck, matching a named rule with a one-line fix that makes the guard explicit and the comment honest. Blocking is proportionate precisely because the cost of fixing is trivial and the cost of shipping a self-incorrect pure function is a future silent regression.

**Handoff:** Back to Dev (green rework) for the wave-gate + comment fix, plus a restart-guard regression test (`playEdgeCues(over, startGame(over))` ⇒ no `bonus-city`) authored alongside the fix to lock the self-correctness.
## Dev Assessment (GREEN — rework round 1)

**Rework committed + pushed:** `2e092865` — full missile-command suite 1119/1119 (+1 new guard test), `npm run lint` clean.

**Reviewer feedback accepted (sound — independently re-verified).** #14/#17 were correct: the bare `alive(curr) > alive(prev)` was self-correct only by main.ts's frame-loop absorbing the `startGame` restart, not by the predicate.

**Fix applied:**
1. **Wave-gate (`audio-dispatch.ts:124`):** `if (curr.wave > prev.wave && alive(curr) > alive(prev)) audio.play('bonus-city')`. A wave-end grant ALWAYS advances the wave (`resumePlay` 'between'→'play'), so no real grant is suppressed; a restart resets the wave to 1 (`startGame` → `createGame`), so it is excluded even when diffed directly. Now matches the sibling `whoop` edge's own wave gate. Verified: no real grant lost (all grant tests green).
2. **Comment (`audio-dispatch.ts:114-123`):** rewritten to the wave-gated truth — the cue keys on a wave-advance frame whose alive-count rose, and the wave gate is explicitly what excludes the `startGame` restart. Removed the false unconditional "a rise IS a grant".
3. **Restart-guard regression test (`mc8-7…test.ts`):** new describe block drives the REAL `startGame` restart (`over` wave 3, 0 alive → fresh wave 1, 6 alive) through `playEdgeCues` and asserts NO `bonus-city`. RED on the pre-rework code (the bare delta fired), GREEN now — locks the self-correctness Reviewer asked for.

**Not actioned (Reviewer-agreed out of scope):** the #8 mock-signature widening (pre-existing mc8-2 idiom, filed as a non-blocking fleet-wide Improvement); the LOW backtick nit left as-is.

**Handoff → Reviewer (Obi-Wan Kenobi), review phase (round 2).**
## Subagent Results (round 2 — rework verification)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1119/0, lint clean, no smells) | — |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | clean | round-1 HIGH RESOLVED | confirmed resolved |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | — |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | #14 RESOLVED, #17 RESOLVED (1 LOW nit) | confirmed 2 resolved, deferred 1 (LOW citation nit) |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 0 blocking; round-1 #14 (HIGH) and #17 (MEDIUM) both CLOSED; 1 LOW non-blocking citation nit deferred.

## Reviewer Assessment (round 2)

**Verdict:** APPROVED

**Rework verified.** Dev's commit `2e092865` resolved both round-1 findings, confirmed by fresh specialist passes and my own re-analysis:

- `[RULE]` **#14 — RESOLVED (mutation-confirmed).** The bonus-city edge is now `if (curr.wave > prev.wave && alive(curr) > alive(prev))` (`audio-dispatch.ts:128`), at `playEdgeCues`'s single exit, mirroring the `whoop` gate above. rule-checker independently reverted EACH half and observed exactly the expected test redden (bare alive-delta → the new restart guard fails; wave-gate alone → the bonus-free-wave guard fails), restoring cleanly (`git status` empty). Airtight by construction: every real grant runs in `stepGame`'s 'between' branch which sets `wave: nextWave` in the same literal (`game.ts:220`), so no grant is suppressed; `startGame` resets wave to `INITIAL_WAVE=1` (the floor), so a restart can never satisfy `curr.wave > prev.wave`.
- `[RULE]`/`[DOC]` **#17 — RESOLVED.** comment-analyzer confirms the rewritten comment (`:114-126`) matches the code, names the restart case explicitly, and drops the false unconditional claim.
- `[SEC]` — clean (no new surface; both inputs engine-computed GameState).
- `[EDGE]`/`[SILENT]`/`[TEST]`/`[TYPE]`/`[SIMPLE]` — specialists disabled; I assessed each domain myself: the new restart-guard test drives the REAL `startGame` (non-vacuous, asserts its fixture premise before the outcome, uses `over.wave=3` so the exclusion is demonstrated on a genuine wave drop, not a degenerate 1→1); no swallowed errors; `alive()` specifically typed; the two-term guard adds no complexity.

**[LOW] deferred (non-blocking, `[RULE]`/`[DOC]` #17 nit):** the comment's parenthetical `(resumePlay, game.ts)` attributes the wave advance to `resumePlay`, which only flips the phase 'between'→'play' (`state.ts:46-48`); the increment is the sibling `wave: nextWave` (`game.ts:220`) in the same object literal. The substantive claim ("the between→play beat ALWAYS advances the wave") is TRUE and independently re-verified — a citation-attribution nit, not a false mechanism. Recorded as a non-blocking Delivery Finding; not worth a third round-trip on a 2pt story.

**Data flow traced:** `stepGame`'s 'between' regen (grant) / `startGame` (restart) → `GameState.{wave, cities}` → `playEdgeCues(prev, curr)` gate → `audio.play('bonus-city')`. Safe: pure state, no user input, cue fires iff a wave-advance frame's alive-count rose.

**Rule Compliance (round 2):** #14 ✓ (resolved), #17 ✓ (resolved, 1 LOW nit), #15/#18/#24/#26 ✓ (restart guard mutation-verified, non-vacuous, retirement complete), #1/#4/#8 ✓. All others N/A.

### Devil's Advocate (round 2)
Assume the wave-gate broke a real grant. Could a bonus city ever be granted WITHOUT the wave advancing? The grant materialises only in `stepGame`'s 'between' branch, and that branch unconditionally writes `wave: nextWave` in the same object literal that regenerates the cities — there is no code path that tops the board up from the reserve without also incrementing the wave. So `curr.wave > prev.wave` is a necessary companion of every grant, never a suppressor. Could the gate now MISS a grant that the old code caught? The old code fired on any score-threshold crossing, most of which were mid-play false positives the story exists to remove; the only true-positive it caught (the grant) still fires, because it coincides with the wave advance. Could a stranger pair sneak a false positive past both terms — alive rising AND wave rising but no grant? At a between→play advance, alive rises only when REGEN pulls from the bonus reserve (survivors persist, dead-within-wave never revive), so alive-rise-at-advance ⟺ grant. Pause/resume moves neither wave nor cities. The restart moves alive up but wave down. Every branch is accounted for and, unlike round 1, the accounting is enforced by the predicate itself, not by a caller's framing — the restart guard test locks it and was mutation-killed in the tree by the rule-checker. Nothing broken found.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.