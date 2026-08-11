---
story_id: "pm4-7"
jira_key: "pm4-7"
epic: "pm4"
workflow: "tdd"
---
# Story pm4-7: Freeze pauses — level-clear + dying

## Story Details
- **ID:** pm4-7
- **Jira Key:** pm4-7
- **Workflow:** tdd
- **Stack Parent:** pm4-5 (required dependency: phase machine)
- **Type:** Feature
- **Points:** 5
- **Branch:** feat/pm4-7-freeze-pauses-level-clear-dying
- **PR:** https://github.com/slabgorb/arcade/pull/220

## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Phase:** finish
**Phase Started:** 2026-08-11T00:04:40Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-10T23:16:36Z | 2026-08-10T23:19:33Z | 2m 57s |
| red | 2026-08-10T23:19:33Z | 2026-08-10T23:30:37Z | 11m 4s |
| green | 2026-08-10T23:30:37Z | 2026-08-10T23:36:21Z | 5m 44s |
| review | 2026-08-10T23:36:21Z | 2026-08-10T23:51:33Z | 15m 12s |
| green | 2026-08-10T23:51:33Z | 2026-08-10T23:54:48Z | 3m 15s |
| review | 2026-08-10T23:54:48Z | 2026-08-11T00:04:40Z | 9m 52s |
| finish | 2026-08-11T00:04:40Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA, Improvement, non-blocking]** The `dying`/`level-clear` freeze **durations** have NO isolable ROM literal — confirmed against the quarry (glossary carries no death/level-complete/ready-delay cadence; `docs/rom-study/claims/*.json` cite no timing constant). They are honest-uncited shell-timing choices, exactly like the shipped `READY_HOLD_FRAMES` (256, §Music-derived) and `FRUIT_VISIBLE_FRAMES` (9*60). Dev must NOT fabricate a `pacman.asm:<addr>` for a duration; follow the `FLASH_HALF_PERIOD`/`FRUIT_VISIBLE_FRAMES` comment posture. `citations.test.ts` only bites on a `pacman.asm:<addr>` prose citation, so honest-uncited constants need no claim.
- **[TEA, Gap, non-blocking]** game.ts:102 already flags "pm4-7 owns the SHORTER post-death READY when it wires dying->ready." My RED does NOT pin a shorter-than-256 ready length (it measures the freeze + the eventual resume, not the number). Dev decides whether the post-death/post-clear READY hold is shorter than the 256-frame intro; if a new constant is added it stays honest-uncited. Not gated by my tests either way.
- **[TEA, Improvement, non-blocking]** The epilepsy "no full-screen flash" constraint is already guarded by pm4-1's `tests/shell/overlays.test.ts` (asserts the level-clear strobe stays ABSENT). pm4-7 is core-only and does not touch `overlays.ts`, so I added no duplicate shell guard — Dev must keep it that way (no overlays.ts edits from this story).

### Dev (implementation)
- **Improvement** (non-blocking): The shell must now RENDER the two new freeze phases (`dying`, `level-clear`) — a static held frame, no flash. This story is core-only and the sim now correctly freezes + emits `pac-died`/`level-cleared`, but a shell render task should confirm `render.ts`/`overlays.ts` draw a sensible held frame during `phase==='dying'`/`'level-clear'` (they currently key off events, not these phases). Affects `plugins/pac-man/src/shell/` (render the held frame for the two freeze phases). *Found by Dev during implementation.*
- **Improvement** (non-blocking): Post-death/post-clear READY reuses the 256-frame intro hold; a shorter authentic post-death delay is deferred (see the Design Deviation). Affects `plugins/pac-man/src/core/game.ts` (would add one honest-uncited constant + an intro-vs-respawn ready distinction). *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (non-blocking): The shell comment `plugins/pac-man/src/shell/audio.ts:47` ("there is no death `phase` in `GameState` to poll") is falsified by this diff — `GameState.phase` now reaches `'dying'` at runtime. Out of pm4-7's core-only scope (audio.ts is untouched and its `DEATH_HOLD_FRAMES` logic is independent), so deferred. Affects `plugins/pac-man/src/shell/audio.ts` (correct the stale comment, and the shell follow-up can now poll `phase==='dying'` for the death cue instead of counting frames). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The shell must render the two new freeze phases (`dying`, `level-clear`) as a static held frame with NO flash — the sim now freezes and emits `pac-died`/`level-cleared`, but `render.ts`/`overlays.ts` should confirm they draw a sensible held frame for `phase==='dying'`/`'level-clear'` (they currently key off events). Affects `plugins/pac-man/src/shell/` (a shell render task). *Found by Reviewer during code review (corroborates Dev's finding).*
- **Improvement** (non-blocking): The freeze-duration magnitudes (`DYING_HOLD_FRAMES`/`LEVEL_CLEAR_HOLD_FRAMES` = 120) carry no mutation coverage — a `120→1` mutant stays green because the tests assert "frozen while active" + "eventually expires", never the count. This is working-as-designed for an honest-uncited cadence (pinning `toBe(120)` would be a lang-review #26 change-detector, and it mirrors the accepted unpinned `READY_HOLD_FRAMES` precedent), but noted so a future fidelity story that DOES derive a real duration knows to add the pin then. Affects `plugins/pac-man/src/core/game.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Post-death / post-clear READY reuses the 256-frame intro hold instead of a distinct shorter cadence**
  - Spec source: context-story-pm4-7.md (design target "dying … then respawn -> ready"); game.ts:102 comment ("pm4-7 owns the SHORTER post-death READY")
  - Spec text: "on pac-died with lives>0, enter dying (freeze, death-anim window, then respawn -> ready)" — reaching `ready` is required; the READY length is unspecified.
  - Implementation: `dying -> ready` and `level-clear -> ready` reset `readyFrames = 0` and reuse the existing `READY_HOLD_FRAMES` (256) hold. No separate shorter post-death constant was added.
  - Rationale: No test requires a shorter post-death READY (TEA measured the freeze + resume, not the ready length); adding a second cadence + a "which kind of ready is this" branch is beyond pm4-7's minimal scope. Corrected the now-stale game.ts:102 comment so it no longer claims a shorter READY shipped.
  - Severity: minor
  - Forward impact: minor — a fidelity/UX polish (arcade's post-death delay is shorter than the opening jingle) is available as a follow-up; it would add one honest-uncited constant and would not change the phase graph.

### Reviewer (audit)
- **Post-death / post-clear READY reuses the 256-frame intro hold (Dev deviation above)** → ✓ ACCEPTED by Reviewer: sound minimal-scope choice — reaching `ready` is what the spec requires; the READY length is unspecified, no test pins it, and a distinct shorter post-death READY is a fidelity polish appropriately deferred (tracked as a Delivery Finding). The now-stale game.ts:102 comment was correctly corrected in the same diff, so nothing ships claiming a shorter READY was delivered.
- **UNDOCUMENTED — dying-entry uses direct assignment, not `advancePhase` (see REJECT finding F1)** → ✗ FLAGGED by Reviewer: the level-clear entry routes through `advancePhase('playing',{allDotsEaten})` but the dying entry hardcodes `state.phase='dying'`/`'game-over'`. Behaviourally equivalent today (mutation-verified) but a lang-review #14 "handled centrally in one branch, locally in the sibling" inconsistency, and the adjacent comment overstates it (#17). Fix in green rework — routes to the finding table below.

## Sm Assessment

**Setup verified on disk; story claimed and pushed.** Ruby Rhod, SM.

**Story shape:** pm4-7, Pac-Man, 5pt, tdd (phased), repos `arcade`, `depends_on: pm4-5`. Wires the two freeze transitions the phase machine left unhooked.

**Contention probes (both clean):**
- `git fetch --prune && git branch -r | grep pm4-7` → no branch existed before my own claim push. No sibling owns it.
- `ls /Users/slabgorb/Projects/a-*/.session/*-session.md` → only a-1 `mc10-6` (unrelated story).
- Merge gate: `gh pr list -R slabgorb/arcade --state open` → `[]`. No blocking PRs.

**Dependency premise verified current (not stale):** pm4-5 (phase machine, `dying`+`level-clear` states + clock-free dispatch) and pm4-6 (attract→ready→playing wiring) are both `status: done` in `sprint/epic-pm4.yaml`. The story's "Replaces today's INSTANT advance/respawn" premise is exactly the runtime edges pm4-5 left unwired — consistent, no re-scope needed.

**ACs are DERIVED, not from YAML:** epic `acceptance_criteria` is `null`. sm-setup derived five ACs from the title + constraints; they are labeled as derived in the context file (not disguised as YAML-sourced). TEA should treat them as the working spec but is free to refine at RED — the derivation is not an authored contract.

**Constraints carried into context for TEA (Leeloo):**
1. **HARD ACCESSIBILITY (blocking, overrides ROM fidelity):** boss has photosensitive epilepsy — the level-clear freeze holds a STATIC frame and MUST NOT reintroduce the full-screen flash pm4-1 removed. Bolded in the context.
2. **Citations at RED:** cite the ROM READY!/death-delay cadence and the level-complete cadence from `pacman.asm`; every new timer constant is `citations.test.ts`-gated. Do NOT fabricate a line.
3. **Core-only + purity:** game.ts only; seeded frame-count timers, no clock; `purity.test.ts` stays green.

**sm-setup corrections applied:** it omitted `**Repos:**` from the tracking block (documented recurring omission) — I added `**Repos:** arcade`. It left status `backlog` — I stamped `in_progress` (`started: 2026-08-10`). Epic diff confirmed surgical (only pm4-7). Claim committed and branch pushed empty-of-code so the sibling branch probe lights up.

**Handoff:** → Leeloo (TEA) for RED. Pin the current instant advance/respawn behavior with a failing test and anchor the cadence citations before GREEN.
## Tea Assessment

**RED landed: 8 failing, tsc green, no collateral breakage.** Leeloo, TEA.

**What I wrote** (`plugins/pac-man/tests/core/freeze-pauses.test.ts`, new; + one update in `game.test.ts`):
- **AC3 — dying (3 tests):** a lethal contact with lives>0 moves `playing -> dying` (not the instant `respawnAfterDeath` at game.ts:679); the sim is FROZEN for the whole death window (worldPose held every frame); the window expires into `ready` with Pac respawned at the spawn tile.
- **AC2 — level-clear (3 tests):** crossing `DOT_COUNT` moves `playing -> level-clear` and DEFERS `advanceLevel` (level still 1, dots not reset, `level-cleared` event still fires); the sim is FROZEN for the clear window (level number held); the window expires into `ready` on level 2 with a fresh board.
- **#14 precedence (1 test):** a same-frame death AND board-clear resolves to `dying` ONLY — the level-clear branch must not also fire (`level-cleared` event absent, level unchanged).
- **Green guard (1 test, passes today):** the lives=0 death still goes straight to `game-over`, never through a `dying` freeze — pins the pm4-6 boundary so GREEN can't smuggle a dying phase in front of game-over.
- **game.test.ts update:** the old "crossing DOT_COUNT advances the level" test asserted the INSTANT advance this story replaces; re-pointed at the deferred/freeze entry edge (RED now, correct after GREEN) — otherwise it would read as a false regression when Dev wires the freeze.

**RED evidence:** `npx vitest run --project pac-man` → **8 failed | 339 passed (347)**; every failure is behavioral (`expected 'dying'/'level-clear'/'ready', received 'playing'`) — the freeze is simply not wired. `npm run lint` (tsc --noEmit) **green**. `purity.test.ts` is among the 339 green and must stay so (core stays clock-free).

**GREEN target for Korben (Dev):** wire the two edges into `stepGame` at the SINGLE exit, feeding the pure `advancePhase` (phase.ts) the signal it owns:
1. **Death branch (game.ts:667-681):** on `lives>0`, replace the immediate `respawnAfterDeath(state)` with entering `dying` (freeze); carry a `dyingFrames` counter (like `readyFrames`); when the death window elapses, run `respawnAfterDeath` and advance `dying -> ready` via `advancePhase('dying',{deathExpired})`.
2. **Level-clear branch (game.ts:686-689):** on `dotsEaten >= DOT_COUNT` while `playing`, enter `level-clear` (freeze) and emit `level-cleared` — but DEFER `advanceLevel`; when the clear window elapses, run `advanceLevel` and advance `level-clear -> ready` via `advancePhase('level-clear',{clearExpired})`.
3. **Freeze gate:** add `dying`/`level-clear` to the early-return sim-gate at the top of `stepGame` (alongside `game-over`/`attract`/`ready`) so nothing moves during the hold.
4. **Precedence:** keep the level-clear check gated on `state.phase === 'playing'` — that guard is what makes the death win a same-frame tie (the collision sets `phase='dying'` before the all-dots check runs). Do not move the all-dots check above the collision.
5. **purity.test.ts stays green:** frame counters + seeded RNG only, no clock/DOM/Math.random.

### Rule Coverage (lang-review/typescript.md)
- **#14 (derived EDGES computed inside one branch of a state machine) — COVERED.** This is the story's central risk (its origin is literally a death-pause dropping a loop-stop) and my memory flagged pm4's "#14 edge-at-single-exit watch-item." The precedence test pins that a same-frame death+clear resolves ONCE at the common exit and the level-clear edge does not leak. The green guard pins the game-over sibling of the death edge stays on its own path.
- **#15 / #25 (source-text token guards) — N/A.** No source-text grep guards written; all assertions drive observable state (`stepGame` + phase/level/position/events), so there is no keyword-in-a-comment escape.
- **#18 / #26 (self-measuring fixtures / all-local assertions) — CHECKED.** Every asserted term comes from the code under test (`state.phase`, `state.level`, `state.pac.actor`, `state.events`), never a test-local constant compared to itself. Freeze tests compare `worldPose` before/after a real `stepGame`, so a broken freeze is distinguishable. Spawn is read from a fresh `createGameState`, not hardcoded.
- **#3 (enum exhaustiveness) — pre-owned by pm4-5.** `advancePhase` already switches exhaustively over `GamePhase`; pm4-7 adds no new phase, only runtime edges.

**Handoff:** -> Korben Dallas (Dev) for GREEN. Make the 8 red tests green with minimal core wiring in `game.ts`; keep `purity.test.ts` green and do not touch `overlays.ts`.
## Dev Assessment

**Implementation Complete:** Yes — Korben Dallas.
**Files Changed:**
- `plugins/pac-man/src/core/game.ts` — wired the `dying` + `level-clear` freeze phases into `stepGame`; added `freezeFrames` counter + `DYING_HOLD_FRAMES`/`LEVEL_CLEAR_HOLD_FRAMES` (honest-uncited); corrected the stale READY_HOLD comment.

**What changed (minimal, core-only):**
1. **Death entry (collision, lives>0):** replaced the instant `respawnAfterDeath(state)` with `phase='dying'; freezeFrames=0`. The existing `lives<=0 → game-over` / `else` split IS the pm4-5 machine's `game-over`-vs-`dying` decision; respawn is DEFERRED.
2. **Level-clear entry (all dots, phase='playing'):** emits `level-cleared`, then `phase = advancePhase('playing',{allDotsEaten:true})` → `level-clear`; `advanceLevel` DEFERRED. The `phase==='playing'` guard is what makes a same-frame death win the tie (lang-review #14).
3. **Freeze gate (top of stepGame):** two new early-return branches. `dying` holds `DYING_HOLD_FRAMES` then `respawnAfterDeath` + `ready`; `level-clear` holds `LEVEL_CLEAR_HOLD_FRAMES` then `advanceLevel` + `ready`. Both feed the pure `advancePhase` the timer signal it owns; both reset `readyFrames=0` on handoff.

**Cadence posture:** `DYING_HOLD_FRAMES`/`LEVEL_CLEAR_HOLD_FRAMES` are honest-uncited (~2s @ 60Hz), same policy as `READY_HOLD_FRAMES`/`FRUIT_VISIBLE_FRAMES` — no `pacman.asm:<addr>` fabricated (TEA confirmed the quarry has no isolable literal). `citations.test.ts` requires no claim for them and stays green.

**Accessibility:** the level-clear is a sim FREEZE holding a static frame — no full-screen flash. Core-only; `overlays.ts` untouched, so pm4-1's `tests/shell/overlays.test.ts` no-flash guard stays green.

**Tests:** 347/347 pac-man passing (GREEN) — the 8 pm4-7 RED tests now pass, the game-over guard stayed green, `purity.test.ts` + `citations.test.ts` green (78/78 in the targeted run). `npm run lint` (tsc --noEmit) green.
**Branch:** feat/pm4-7-freeze-pauses-level-clear-dying (pushed — d13b1a28).

**Handoff:** → Jean-Baptiste Emanuel Zorg (Reviewer) for review.

### Dev rework (round 2 — reviewer REJECTED)
Addressed the three confirmed findings; F4/F5 left as documented non-blocking Delivery Findings.
- **F1 (#14) + F2 (#17):** the death entry now routes through `advancePhase('playing', {pacDied, livesRemaining})` exactly like its level-clear sibling — no more hardcoded `state.phase='dying'`/`'game-over'`. The comment now accurately describes the `advancePhase` call it makes (F2 dissolved). Behaviour unchanged.
- **F3 (#15):** `freeze-pauses.test.ts` bound tightened from `toBeLessThan(DOT_COUNT)` to `toBe(createGameState(3).dotsEaten)` (the fresh spawn-eat baseline). Mutation-verified the fix bites: `advanceLevel` leaving `dotsEaten = DOT_COUNT - 1` now reddens it (`expected 239 to be 1`), then reverted.
- Re-verify: 347/347 pac-man, `tsc --noEmit` green. Pushed (0d6e8b20).
- **Handoff:** → Reviewer for re-review (round 2).

## Reviewer Assessment

**Verdict:** APPROVED
**Round:** 2 — round 1 REJECTED on three Medium findings (F1/F2/F3); all three fixed in green rework and independently mutation-verified. No Critical/High/Medium remains.
**Data flow traced:** collision(lives>0) → advancePhase → dying freeze (sim gated off) → respawn → ready → playing; all-dots → advancePhase → level-clear freeze → advanceLevel → ready. Safe: the sim is frozen throughout both holds.
**Pattern observed:** both playing-exit edges now route through the pure `advancePhase` machine at a single site each — game.ts:726 (death) and :750 (level-clear).
**Error handling:** deterministic sim, no error paths; purity green.

Jean-Baptiste Emanuel Zorg. NOW it has subtlety. Round 1's two central risks were already correct and mutation-verified; the rework closed the #14 sibling-asymmetry, the overstated comment, and the loose test bound — each re-checked by the backstop with a live mutant that reddens without the fix and is caught with it. THIS code, at last, has no bugs. Approved.

**Round 2 re-review — all round-1 findings resolved (mutation-verified by the [RULE] rule-checker backstop):**
- F1 (#14) RESOLVED — death entry now calls `advancePhase('playing',{pacDied,livesRemaining})` (game.ts:726), symmetric with the level-clear sibling; mutating advancePhase's `pacDied` branch now reddens game.ts's death tests (it had zero effect pre-fix, proving the call is real).
- F2 (#17) RESOLVED — the adjacent comment now accurately describes the advancePhase call it makes.
- F3 (#15) RESOLVED — bound tightened to `toBe(createGameState(3).dotsEaten)`; a `dotsEaten=DOT_COUNT-1` mutant now reddens (expected 1, got 239); the old `toBeLessThan(DOT_COUNT)` would not.
- F4 (#15 magnitude) / F5 (#24 audio.ts comment) — correctly UNCHANGED, non-blocking, tracked as Delivery Findings; not re-flagged.

**Round-2 subagents (all enabled returned clean):** [PRE] preflight GREEN — 347/347 pac-man, orchestrator 457/457, tsc clean, 0 smells; [SEC] security CLEAN — pure core, no surface, purity green; [RULE] rule-checker CLEAN — 0 violations across 26 checks + 3 project rules, all three fixes mutation-verified, tree left clean. The six disabled specialists ([EDGE]/[SILENT]/[TEST]/[DOC]/[TYPE]/[SIMPLE]) were hand-covered in round 1; their domains are untouched by a 3-line consistency + test-bound rework.

---
_The round-1 detail below (findings table, VERIFIEDs, Devil's Advocate) is retained as the audit record — its core-logic analysis remains valid and the rework only strengthened it._

### Round 1 Findings (ALL RESOLVED in Round 2 — retained as the audit record)

| # | Severity | Rule | Issue | Location | Fix Required |
|---|----------|------|-------|----------|--------------|
| F1 | [MEDIUM] | [RULE] #14 | Dying-entry hardcodes `state.phase='dying'`/`'game-over'` instead of routing through `advancePhase('playing',{pacDied,livesRemaining})` as its level-clear sibling does — the "one member handled centrally, its sibling locally" trap. Behaviourally equivalent today, but a future edit to advancePhase's pacDied branch would silently not apply here. | plugins/pac-man/src/core/game.ts:729-737 | Route the death entry through `advancePhase` (keep the game-over nameEntry setup on the `=== 'game-over'` arm; set `freezeFrames=0` on the `dying` arm). |
| F2 | [MEDIUM] | [DOC] #17 | The comment beside F1 asserts the split "IS the pm4-5 machine's decision (advancePhase(...) → game-over vs dying)…exactly its arm" — overstating a mechanism the code does not invoke. | plugins/pac-man/src/core/game.ts:730-734 | Fixing F1 makes the comment true; otherwise reword to "mirrors what advancePhase would return" rather than implying a call. |
| F3 | [MEDIUM] | [TEST] #15 | `expect(state.dotsEaten).toBeLessThan(DOT_COUNT)` for "fresh dot count" is 240× looser than the real value — a `dotsEaten=DOT_COUNT-1` mutant in advanceLevel stays green. | plugins/pac-man/tests/core/freeze-pauses.test.ts:327 | Pin the real post-advance count — `toBe(createGameState(SEED).dotsEaten)` (the spawn-tile-eat baseline, = 1), not a loose bound. |

**Non-blocking (documented, no rework required):**
- F4 [LOW] [RULE] #15 — the freeze-duration MAGNITUDES (`DYING_HOLD_FRAMES`/`LEVEL_CLEAR_HOLD_FRAMES`=120) are mutation-uncovered (120→1 stays green). Working-as-designed for an honest-uncited cadence: there is no ROM value to protect, and pinning `toBe(120)` would be a lang-review #26 change-detector; it mirrors the accepted, equally-unpinned `READY_HOLD_FRAMES` precedent. Logged as a Delivery Finding for a future fidelity story.
- F5 [LOW] [DOC] #24 — stale comment `plugins/pac-man/src/shell/audio.ts:47` ("no death `phase` … to poll") falsified by this diff. Out of the core-only scope (audio.ts untouched, logic independent); deferred to the shell follow-up as a Delivery Finding.

### Dispatch-tag coverage (6 of 9 subagents disabled — hand-covered)
- [SEC] reviewer-security (enabled): CLEAN — pure deterministic core, no clock/random/DOM/casts, no auth/network/secrets surface; purity guard passes. VERIFIED.
- [RULE] reviewer-rule-checker (enabled): 29 rules / 27 instances, findings F1/F2/F3/F4/F5 above, all mutation-verified live. This backstop caught what the disabled comment/test/type specialists would have.
- [PRE] reviewer-preflight (enabled): GREEN — 347/347 pac-man, orchestrator pass, tsc clean, 0 code smells.
- [EDGE] (disabled — hand-covered): traced boundaries myself — no soft-lock (`freezeFrames` increments unconditionally each freeze frame, so `>= HOLD` always trips → `advancePhase` → ready); the freeze `return`s before the collision block so no re-trigger; death-frame positions freeze in place then reset on respawn. No boundary bug.
- [SILENT] (disabled — hand-covered): no swallowed errors, no try/catch, no silent fallback; `state.events` is replaced each frame (not accumulated), events fire on the trigger frame. Clean.
- [TEST] (disabled — hand-covered + corroborated by [RULE]): freeze "frozen" tests compare `worldPose` before/after a real `stepGame` (non-vacuous — a live sim would change it; a never-expiring freeze reddens the final `.not.toBe`); the game.test.ts edit still asserts phase/level/event meaningfully. One real loose bound → F3.
- [DOC] (disabled — hand-covered + corroborated by [RULE]): the READY_HOLD comment edit is now accurate; the DYING/LEVEL_CLEAR "honest-uncited" comments match the citations gate; two stale/overstated comments → F2, F5.
- [TYPE] (disabled — hand-covered): `freezeFrames: number` is a plain primitive on GameState; `state.phase = advancePhase(...)` stays typed as the full `GamePhase` union; no stringly-typed API, no `as any`/casts added. VERIFIED good.
- [SIMPLE] (disabled — hand-covered): change is minimal; the only simplification/consistency point is the F1 advancePhase-vs-hardcode asymmetry (folded into F1).

### Rule Compliance (lang-review/typescript.md — applicable checks)
- #14 (edges at single exit): 4 of 5 instances compliant + mutation-verified (tie-break, both freeze exits, level-clear entry); F1 the 5th. 
- #3 (enum exhaustiveness): compliant — the stepGame phase chain handles all 6 GamePhase members; advancePhase's switch is unchanged.
- #15/#18/#26 (test apparatus): freeze tests non-vacuous & mutation-resilient except F3; helpers (`playingGame`, `noMoveFrameIndex`, `spawnPixel`) are honest reuses, not self-measuring.
- #17/#20 (stale comments / measured quantities): F2 + F5; the two new constants are honest non-claims (no #20 measured-artifact issue).
- CLAUDE.md purity + citations: compliant — purity 78/78 green, no `pacman.asm:` citation added so no claim required. Accessibility: core-only, overlays.ts untouched, pm4-1's no-flash guard intact.

### VERIFIED (with evidence)
- [VERIFIED] Freeze truly blocks the sim — game.ts:513-538 both freeze branches `return` before the movement/collision code; mutation (remove `return`) reddens the frozen-worldPose tests. Complies with the "static frame, no flash" accessibility rule (no render code added).
- [VERIFIED] Same-frame death wins — game.ts:743 level-clear check gated on `phase==='playing'`; the collision at :729 sets `'dying'` first; mutation (drop the guard) reddens the precedence test.
- [VERIFIED] No new nondeterminism — [SEC] + purity.test.ts (78/78); `freezeFrames` is an integer counter, `advancePhase` pure, respawn reseed uses the existing seeded formula.

### Devil's Advocate
Argue it's broken: (1) A soft-lock — could the game freeze forever in `dying`/`level-clear`? Only if `freezeFrames` stopped advancing or the shell stopped calling `stepGame`; the counter increments unconditionally at the top of each freeze branch and `>= HOLD` is monotonic, so within 120 frames it hands off — no soft-lock, and the "expires into ready" tests prove termination within the 1200-frame ceiling. (2) A double-death — could the freeze re-run the collision and drain a second life? No: the freeze `return`s before the collision block, so no contact is evaluated while frozen, and respawn resets positions before play resumes. (3) A leaked edge — could `pac-died`/`level-cleared` fire twice, or `advanceLevel` run twice? The trigger frame sets the phase and the freeze gate owns the single exit; the level-clear entry is gated on `playing` so a same-frame death suppresses it — the #14 concern is real but handled and mutation-verified. (4) The stale `freezeFrames` value (left at 120 after handoff) — could it shorten the NEXT freeze? No: every entry to either phase resets it to 0 (both branches verified), so the stale value is never read live. (5) The real soft spots the devil DID find: a comment that claims a function call the code skips (F2) and a test bound so loose a broken advanceLevel passes it (F3) — neither breaks the running game, but both are exactly the "green suite hiding a defect" pattern review exists to catch, which is why this is a REJECT not an approve-with-notes. Nothing here is a data-corruption or security class; the worst live consequence of shipping as-is would be a future maintainer trusting a false comment. That is enough for one rework cycle, not a redesign.

**Handoff (round 1):** Back to Korben Dallas (Dev) for a green-rework pass on F1, F2, F3. **[COMPLETED — round 2 verified all three fixed.]**

**Handoff (round 2):** To SM (Ruby Rhod) for finish-story.

## Subagent Results

_Round 2 (re-review after rework). Round-1 results in the audit record above._

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (347/347 pac-man, orchestrator 457/457, tsc green, 0 smells) | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered round 1 (no boundary bug); rework domain unchanged |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered round 1 (no swallowed errors); rework domain unchanged |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered; F3 loose bound now fixed & mutation-verified by rule-checker |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered; F2 comment now accurate (confirmed by rule-checker) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered (freezeFrames primitive; no casts; phase stays union-typed) |
| 7 | reviewer-security | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered; the F1 asymmetry it would flag is now resolved |
| 9 | reviewer-rule-checker | Yes | clean | none (F1/F2/F3 verified RESOLVED via live mutation; F4/F5 unchanged non-blocking) | confirmed 0 new, 3 prior resolved, 2 non-blocking unchanged |

**All received:** Yes (3 enabled returned clean, 6 disabled pre-filled)
**Total findings:** 0 new; the 3 round-1 blocking findings are resolved & mutation-verified, the 2 non-blocking (F4 working-as-designed, F5 deferred to shell follow-up) are documented Delivery Findings
## Impact Summary

**Story:** pm4-7 — Freeze pauses (level-clear + dying phases). **Status:** APPROVED (round 2); all round-1 blocking findings resolved & mutation-verified.
**Tests:** 347/347 pac-man · orchestrator 457/457 · purity 78/78 · tsc clean.
**PR:** https://github.com/slabgorb/arcade/pull/220 (open — owner merges; SM does not).

### Delivered (core-only, game.ts)
Wires the two freeze transitions pm4-5's phase machine left unhooked, replacing today's instant respawn/advance:
1. **Death (lives>0)** → `advancePhase('playing',{pacDied,livesRemaining})` → `dying` freeze (DYING_HOLD_FRAMES=120) → `respawnAfterDeath` → `ready`. Respawn deferred to the freeze→ready edge.
2. **All dots** → `advancePhase('playing',{allDotsEaten})` → `level-clear` freeze (LEVEL_CLEAR_HOLD_FRAMES=120) holding a static frame → `advanceLevel` → `ready`. Advance deferred.
3. Freeze = sim-gated early-return; both edges route through the pure `advancePhase` at single sites (game.ts:726, :750). Same-frame death wins the tie (level-clear gated on `phase==='playing'`; lang-review #14).
4. Accessibility: static-frame freeze, NO flash; `overlays.ts` untouched, pm4-1's no-flash guard green.

### Round-1 findings — ALL RESOLVED in round 2 (mutation-verified by the rule-checker)
- **F1 (#14):** death entry hardcoded `state.phase` → now routes through `advancePhase` (game.ts:726), symmetric with the level-clear sibling.
- **F2 (#17):** the adjacent comment now accurately describes the `advancePhase` call.
- **F3 (#15):** loose `toBeLessThan(DOT_COUNT)` → tight `toBe(createGameState(3).dotsEaten)`; a `DOT_COUNT-1` mutant now reddens.

### Deferred, non-blocking (Delivery Findings)
Shell render of the `dying`/`level-clear` freeze frames; shorter authentic post-death READY (currently reuses the 256-frame intro hold); stale `audio.ts:47` comment; unpinned freeze magnitude (honest-uncited by design). No ROM cadence fabricated — the quarry has no isolable death-delay/level-complete literal.

### Blocking
**None.**
