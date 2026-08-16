---
story_id: "pm5-2"
jira_key: "pm5-2"
epic: "5"
workflow: "tdd"
---
# Story pm5-2: Resolve the Level-table mirror fields

## Story Details
- **ID:** pm5-2
- **Jira Key:** pm5-2
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T17:41:22Z
**Round-Trip Count:** 1
**Repos:** arcade
**Branch:** feat/pm5-2-drop-dead-level-mirror-fields

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T17:10:27Z | 2026-08-16T17:13:28Z | 3m 1s |
| red | 2026-08-16T17:13:28Z | 2026-08-16T17:21:19Z | 7m 51s |
| green | 2026-08-16T17:21:19Z | 2026-08-16T17:28:10Z | 6m 51s |
| review | 2026-08-16T17:28:10Z | 2026-08-16T17:35:57Z | 7m 47s |
| green | 2026-08-16T17:35:57Z | 2026-08-16T17:38:02Z | 2m 5s |
| review | 2026-08-16T17:38:02Z | 2026-08-16T17:41:22Z | 3m 20s |
| finish | 2026-08-16T17:41:22Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Reviewer (code review)
- **Gap** (non-blocking): the story context (`context-story-pm5-2.md`) and SM/TEA handoff asserted "exactly TWO test lines" read the dropped fields; there were THREE (the `LEVELS[0]` deep-equality was missed). Affects `sprint/context/context-story-pm5-2.md` (Background undercount) — Dev caught and handled it; recorded here so a future reader knows the "two" figure was wrong.
- **Improvement** (non-blocking): on a DELETION story, a RED test's header comment is written against the pre-drop file, so GREEN's own line-shifts and comment edits silently staled it — the source of this review's findings. Affects the TDD flow generally (`plugins/*/tests`): prefer field NAMES over `file:line` citations in RED headers to survive the GREEN that follows. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **[Dev/Yoda] The context undercounted the read sites: THREE, not two.** context-story-pm5-2.md and the TEA handoff named "exactly TWO test lines" (`game.test.ts:466`, `:482`). There is a **third**: the `LEVELS[0]` deep-equality at `game.test.ts:72-84` (`it('matches the cited/decoded level-1 figures')`) listed all four dropped fields in its expected object (`frightenedSeconds: 6`, `frightenedFlashes: 5`, `elroy1: 20`, `elroy2: 10`). Dropping the fields makes `LEVELS[0]` no longer carry them, so the `toEqual` would have failed. Removed the four from the expected literal. **Forward impact: none — coverage preserved.** Those ROM values stay pinned at their single source: `mode.test.ts:163` pins `elroyThresholds(1) === {elroy1:20,elroy2:10}`, and the frightened figures are pinned in mode.test.ts's own `frightenedFramesForLevel`/`FRIGHT_FLASHES` cases. The level-table test simply stops duplicating them — exactly pm5-2's intent. (This is why RED/GREEN run the full `--project pac-man`, not just the new file.)

- **[Dev/Yoda] Fixed a latent tsc error in the TEA RED file (semantics unchanged).** `level-mirror-fields-dropped.test.ts` cast `levelRow(level) as Record<string, unknown>`; once `Level` became a precise type with no index signature, tsc raised TS2352. The cast was unnecessary — `Object.prototype.hasOwnProperty.call` accepts any object — so I removed it (no `as unknown as` double-cast). Runtime behaviour is byte-identical; the RED assertion is untouched.

- **[Dev/Yoda] Stale-comment cleanup.** `level.ts` FRIGHTENED_GHOST_SPEED_PCT doc (~:95) cited `frightenedSeconds`/`frightenedFlashes` as a "same scope discipline" example, and the file header (:10-14) explained the now-removed mode.ts imports. Both reworded to not reference the dropped columns.

## Sm Assessment

**Setup by:** Grand Admiral Thrawn (SM). Workflow `tdd`, phased, handing to TEA (Han Solo) for red.

**The either/or is resolved by the ROM, not by the pipeline.** The story title poses a fork:
*wire a production consumer (e.g. an attract/HUD readout) for `frightenedSeconds`/`frightenedFlashes`/
`elroy1`/`elroy2`, OR drop the four fields.* Rather than route this as a user design choice, I answered
it from primary source. The real Pac-Man machine displays **none** of these four values:
`frightenedSeconds`/`frightenedFlashes` are behaviours (blue-ghost duration + end-of-fright blink),
driven from `mode.ts` (`frightenedFramesForLevel`, `FRIGHT_FLASHES`), never printed; `elroy1`/`elroy2`
are internal Cruise-Elroy dots-remaining thresholds (`mode.ts` `elroyThresholds`/`elroyStage`), consumed
only as *speed* via `elroy1SpeedPct`/`elroy2SpeedPct` at `game.ts:709,711`. The dossier's only mentions
live in `claims/mode.json` (timing) and `claims/sound.json` (ghost-eaten jingle) — no claim ties any of
them to a HUD/attract/readout, and `src/shell` renders none. Wiring a readout would invent cabinet
behaviour that never existed. **Fidelity forecloses the "wire a consumer" branch; DROP is the only
ROM-faithful resolution**, and it matches the 2pt/p3 estimate and the pm5 single-source epic.

**Premise measured against the current tree (all confirmed true):** the four target fields sit on the
`Level` readonly type at `core/level.ts:49-60`, populated at `buildLevel` (`:145-149`).
`frightenedSeconds`/`frightenedFlashes` have **zero** consumers (production or test). `elroy1`/`elroy2`
have zero production consumers and are read by exactly two test lines — `tests/core/game.test.ts:466`
(`lvl.elroy1 + 5`) and `:482` (`lvl.elroy2`) — which AC-3 repoints to `elroyThresholds(level)` (mode.ts),
the single source. **Out of scope, do not touch:** `elroy1SpeedPct`/`elroy2SpeedPct` and their
`game.ts:709,711` consumers (AC-4 regression guard).

**Contention probes (clean):** no remote branch for pm5-2 before setup; no sibling `.session/` file for
it (only a-2's unrelated `jt12-1`). Claim now pushed — epic stamp + context committed and branch
`feat/pm5-2-drop-dead-level-mirror-fields` published, so the sibling probe lights up for anyone else.
Story stamped `in_progress`.

**Handoff to TEA:** write the RED failing test against the **deletion** — the `Level` type no longer
carries these four fields and `buildLevel` no longer sets them — and repoint the two `game.test.ts` reads
to source from `elroyThresholds(level)`. Do not spec a consumer/readout; the context's ⚠ ROM RULING block
is binding. Run RED with the full `--project pac-man` suite, not just the new file.
## Tea Assessment

**RED by:** Han Solo (TEA). New failing test file: `plugins/pac-man/tests/core/level-mirror-fields-dropped.test.ts`. RED verified against the FULL pac-man project (`npx vitest run --project pac-man`): **4 failed | 412 passed**, 1 file failed | 38 passed — the only failures are my four cases (`levelRow(1|2|5|21) carries none of the mirror fields`), each failing on `hasOwnProperty` returning `true`. AC-4 regression guard already passes. No previously-passing pac-man test changed status.

**Why runtime, not a source-text scan.** `level.ts` names all four fields in its own comments (e.g. the doc block at `:105`), so a grep of the source would still match them after the code is gone — a classic false-green source guard. Instead the RED asserts the OBSERVABLE shape of the object `buildLevel` produces via the public `levelRow(...)`: `hasOwnProperty` for each dropped key must be `false`. That flips exactly on the behaviour change and cannot be defeated by a comment.

**AC coverage:**
- **AC-1 (fields removed from the `Level` type)** — enforced by tsc coupling, no bespoke compile test needed: `LEVELS: readonly Level[]` (`level.ts:157`) pins `buildLevel`'s literal to `Level`, so dropping a key from the literal while it stays required on the type is a missing-property error under `tsc --noEmit` (AC-5). The other direction (re-populating) reddens the runtime suite. Type and population are coupled.
- **AC-2 (buildLevel stops populating)** — the runtime `hasOwnProperty` RED, across levels 1/2/5/21 (every speed-table group).
- **AC-3 (repoint the two `game.test.ts` reads)** — Dev's GREEN work; guarded by the EXISTING `game.test.ts:466,482` Blinky-Elroy tests, which read `lvl.elroy1`/`lvl.elroy2` today and will go red the instant the field is dropped, forcing the repoint to `elroyThresholds(level)`. `mode.test.ts:162` already pins `elroyThresholds(1) === {elroy1:20,elroy2:10}`, so I did NOT duplicate the ROM-value check. `levelRow(1).elroy1 === elroyThresholds(1).elroy1 === 20` today — the repoint is value-preserving.
- **AC-4 (keep `elroy1SpeedPct`/`elroy2SpeedPct`)** — dedicated regression `describe` asserting both stay `typeof === 'number'` on every sample level. Passes today and after; catches an over-eager deletion of the wrong elroy pair (these are consumed at `game.ts:709,711`).
- **AC-5 (suite + lint green)** — verified green now for tests; Dev completes the drop and re-runs `tsc --noEmit` + `--project pac-man`.

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)
- **#1 Type-safety escapes** — no `as any`, no double-cast. One controlled `as Record<string, unknown>` on the `hasOwnProperty` probe (a deliberate index-access widening, commented). The AC-4 test reads `.elroy1SpeedPct`/`.elroy2SpeedPct` with NO cast, so it is itself a compile-time proof those fields survive on the `Level` type.
- **#8 Test quality** — every test asserts a concrete value (`.toBe(false)` / `.toBe('number')`) with a descriptive message; no `assert(true)`, no `let _ =`, no always-true/always-None assertions. `it.each` drives real per-level cases, not a single smoke test.
- Checks #2–#7 (generics, enums, null-handling, modules, React, async) — N/A to a field-deletion test.

**Handoff to Dev (Yoda) — GREEN steps:**
1. `core/level.ts`: remove the four field declarations from the `Level` type (`:49-60` region: `frightenedSeconds`, `frightenedFlashes`, `elroy1`, `elroy2`) AND their four assignments in `buildLevel` (`:145-149`). Leave `elroy1SpeedPct`/`elroy2SpeedPct`, `tunnelSpeedPct`, `fruit`, everything else untouched. The `const { elroy1, elroy2 } = elroyThresholds(level)` destructure at `:137` becomes dead once the assignments go — remove it too (noUnusedLocals will flag it otherwise).
2. `tests/core/game.test.ts:466,482`: repoint `lvl.elroy1`/`lvl.elroy2` to `elroyThresholds(<level>).elroy1`/`.elroy2`. `lvl` there is `levelRow(1)`, so use `elroyThresholds(1)`. Import `elroyThresholds` from `../../src/core/mode` if not already imported. Do NOT hardcode 20/10 — derive from the single source (the whole point of pm5-2).
3. Do NOT touch my new RED file, and do NOT weaken the AC-4 guard.
4. Verify: `npm run lint` (tsc --noEmit, repo-wide) AND `npx vitest run --project pac-man` both green.

**TRAP:** the `elroy1`/`elroy2` NAMES appear in FOUR distinct places in `level.ts` — the `Level` type fields (drop), the `SpeedRow` fields at `:80-81` and speed table `:88-93` (KEEP — different type), and the `elroyThresholds` destructure at `:137` (drop with the assignments). Only the `Level`-type pair and their `buildLevel` assignments are in scope. `elroy1SpeedPct`/`elroy2SpeedPct` are a fifth, unrelated pair — KEEP.
## Dev Assessment

**GREEN by:** Yoda (Dev). Minimal deletion + repoint. Full pac-man project **416/416 green** (39 files), `npm run lint` (tsc --noEmit, repo-wide) clean.

**Changes (3 files):**
- `plugins/pac-man/src/core/level.ts` — removed the four fields from the `Level` type and their assignments in `buildLevel`; removed the now-dead `elroyThresholds(level)` destructure and the whole `import { elroyThresholds, frightenedFramesForLevel, FRIGHT_FLASHES } from './mode'` line (all three symbols were used ONLY by the dropped code — noUnusedLocals would otherwise redden). Reworded two stale comments (file header + FRIGHTENED_GHOST_SPEED_PCT doc) that cited the dropped columns.
- `plugins/pac-man/tests/core/game.test.ts` — added `import { elroyThresholds } from '../../src/core/mode'`; repointed THREE sites (not two — see Design Deviations): the `LEVELS[0]` deep-equality (removed the four keys) and the two Blinky-Elroy reads (`lvl.elroy1`/`lvl.elroy2` → `elroyThresholds(1).elroy1`/`.elroy2`). No hardcoded 20/10 — derived from the single source.
- `plugins/pac-man/tests/core/level-mirror-fields-dropped.test.ts` — removed an unnecessary `as Record<string, unknown>` cast (latent TS2352 once `Level` narrowed); assertion unchanged.

**Kept untouched (AC-4):** `elroy1SpeedPct`/`elroy2SpeedPct` and their `game.ts:709,711` consumers; the `SpeedRow` type/table `elroy1`/`elroy2` (a different pair); `mode.ts`.

### Rule Coverage (`gates/lang-review/typescript.md`)
- **#1 Type-safety escapes** — no new `as any`, no `as unknown as T`, no `@ts-ignore`, no non-null `!`. Net change is one FEWER cast (removed the RED file's `as Record`).
- **#5 Modules** — the mode.ts import was fully removed (not left dangling); `import { elroyThresholds }` added to game.test.ts is a runtime value (correctly a value import, not `import type`).
- **#8 Test quality** — repoints preserve each assertion's meaning; `elroyThresholds(1) === {20,10}` equals the values the dropped fields carried, so the Blinky-Elroy behaviour tests assert identically. No vacuous assertions introduced.
- #2/#3/#4/#6/#7 — N/A (no generics/enums/null-handling/JSX/async touched).

**For the Reviewer (Obi-Wan):** the single most important check is that ROM coverage was not lost by the deletion — verify `frightenedFramesForLevel`/`FRIGHT_FLASHES`/`elroyThresholds` remain pinned in `mode.test.ts` (they are: elroyThresholds at :162-172). The deletion removes DUPLICATION, not coverage.
### Reviewer (audit)

- **[Dev/Yoda] Context undercounted read sites (3 not 2)** → ✓ ACCEPTED by Reviewer: independently verified the third site (`game.test.ts:72-84` `LEVELS[0]` deep-equality) genuinely listed all four dropped fields; removing them was required and coverage is preserved at the single source (rule-checker confirmed `mode.test.ts:156/157/163` still pin the ROM values). Correct handling; the full-project RED/GREEN is exactly what surfaced it.
- **[Dev/Yoda] Removed the RED file's `as Record<string, unknown>` cast** → ✓ ACCEPTED by Reviewer: the cast was unnecessary (TS2352 once `Level` narrowed); `hasOwnProperty.call` accepts any object; no `as unknown as` double-cast introduced (rule-checker check #1 clean). Runtime semantics unchanged.
- **[Dev/Yoda] Stale-comment cleanup in level.ts (header + FRIGHTENED_GHOST_SPEED_PCT doc)** → ✓ ACCEPTED by Reviewer: the reworded comments are accurate (rule-checker check #17 verified). **Side-effect noted:** this correct cleanup deleted the field-naming comments that the RED test's header cites as its rationale — which is the root of finding F4 below. The level.ts edit is right; the test header needed updating to match and wasn't.

## Subagent Results (Round 1 — superseded by Round 2 below)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — lint pass, 416/416, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 6 | confirmed 6, dismissed 0, deferred 0 (all LOW, all in the new test file's header) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A — pure client data-shape deletion, no input/sink/auth |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 0 violations across 34 rules (incl. core-purity, single-source, fidelity, noUnusedLocals) |

**All received:** Yes (4 enabled returned; 5 disabled via settings)
**Total findings:** 6 confirmed (LOW), 0 dismissed, 0 deferred

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md` + CLAUDE.md)
Exhaustive check ran via `reviewer-rule-checker` (34 rules, 21 instances, **0 violations**) and cross-checked by me:
- **[TYPE]** #1 type-safety escapes — none; net one FEWER cast (removed the RED file's `as Record`). #2 `Level` interface keeps `readonly` on every surviving field. `[VERIFIED]` `Level` at `level.ts:26-51` — deletion-only, no `any`/`Partial`/`Omit` introduced.
- **[RULE]** CORE PURITY — `[VERIFIED]` `level.ts` is a core file; the diff only DELETES an import + fields, adds no DOM/clock/RNG/shell import — `tsc --noEmit` clean.
- **[RULE]** SINGLE SOURCE — `[VERIFIED]` all three `game.test.ts` repoints derive from `elroyThresholds(1)` (`:433`, `:483`); no hardcoded `20`/`10`. The only surviving `{elroy1:20,elroy2:10}` literals are `mode.ts:157` (impl) + `mode.test.ts:163` (its pin).
- **[RULE]** FIDELITY — `[VERIFIED]` the deletion removes DUPLICATION, not coverage: `elroyThresholds(1)={20,10}`, `frightenedFramesForLevel(1)=6s`, `FRIGHT_FLASHES=5` remain pinned at `mode.test.ts:163/156/157`.
- **[RULE]** noUnusedLocals — `[VERIFIED]` the `./mode` import and the `buildLevel` destructure are fully removed, not orphaned; `tsc --noEmit` clean.
- **[TEST]** (analyzer disabled — assessed by me + rule-checker #8/#15/#18/#26) — `[VERIFIED]` the new RED asserts OBSERVABLE runtime shape via `hasOwnProperty.call(levelRow(level), field)` (comment-proof, non-vacuous), and the AC-4 guard `typeof row.elroy1SpeedPct === 'number'` is a real check on production output. No vacuous assertions.
- **[SEC]** — no security surface (deletion of unread numeric fields; no input/sink/auth/tenant).

### Devil's Advocate
Let me argue this is broken. **Claim 1 — the drop silently kills Cruise Elroy.** If `elroy1`/`elroy2` were load-bearing, deleting them would break Blinky's speed-up. Refuted: the AI reads `elroy1SpeedPct`/`elroy2SpeedPct` (a DIFFERENT pair, `game.ts:709,711`) for speed, and the dots-remaining THRESHOLD from `elroyThresholds()`/`elroyStage()` in mode.ts directly — never from the deleted `Level.elroy1`/`elroy2`. AC-4 guard + rule-checker #24 confirm the two pairs are distinct and the speed pair is untouched. **Claim 2 — the repoint changed behaviour.** If `elroyThresholds(1) ≠ 20/10`, the Blinky-Elroy tests would assert against wrong thresholds. Refuted: old `buildLevel` sourced `elroy1/elroy2` from `elroyThresholds(level)` *itself*, so `levelRow(1).elroy1` WAS literally `elroyThresholds(1).elroy1` — the repoint is the same function with the same arg, byte-identical. **Claim 3 — coverage was lost.** If the ROM values were only pinned in the deleted `LEVELS[0]` literal, dropping them loses the pin. Refuted: `mode.test.ts:156/157/163` independently pin all three, verified by rule-checker. **Claim 4 — a future reader is misled.** THIS one lands: the new test file's header cites deleted comments and pre-drop line numbers as its design rationale (see findings). It doesn't break the test, but it misinforms. That is the sole surviving concern, and it is why this is REJECTED for a comment-only rework rather than approved. **Claim 5 — an unread field elsewhere.** Grep swept the whole plugin (SM + Dev + me): zero consumers of the four bare fields beyond the three test sites, all handled. No hidden reader.

## Reviewer Assessment (Round 1 — REJECTED, superseded by Round 2 below)

**Verdict:** REJECTED

The implementation itself is exemplary — a clean, pure, single-sourced, ROM-faithful deletion with zero rule violations, zero security surface, and a full green suite (416/416, lint clean). Three specialists returned clean. I am rejecting on a **single, confined, comment-only class of finding** from `reviewer-comment-analyzer`: the brand-new test file's header block cites the *pre-drop* `level.ts` — line numbers that this same diff's GREEN half shifted, and one rationale that GREEN's own (correct) comment cleanup made false. A landing file should not describe itself with deleted evidence. The fix is mechanical, touches only comments, and needs no re-RED — hence a **green rework to Dev**, not a red one.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [DOC][LOW] | **F4 (the substantive one):** header claims "level.ts's own comments name all four fields (e.g. the doc block at :105)" as the justification for a runtime test over a source-scan — but GREEN reworded/deleted those field-naming comments, so the premise is now false (`:105` is mid-`FRUIT_PROGRESSION`). | `level-mirror-fields-dropped.test.ts` header (~line 16) | Reword to past tense: the comments *used to* name the fields, so a source-scan guard would have been defeated the moment GREEN scrubbed them — hence a runtime shape assertion. Do not cite a live line. |
| [DOC][LOW] | Stale line-refs: "sit on the Level type (`level.ts:49-60`)" and "populated at `buildLevel` (`:145-149`)" — both point at unrelated code now (`buildLevel` ends at `:135`; the fields are gone). | `level-mirror-fields-dropped.test.ts` header (~line 6) + inline (~line 42) | **De-brittle**: drop the specific line numbers (the field names are unambiguous) rather than re-pinning numbers that will drift again. |
| [DOC][LOW] | Stale line-ref: "`LEVELS: readonly Level[]` (`level.ts:157`)" — file is now 148 lines; `LEVELS` is at `:141`. | `level-mirror-fields-dropped.test.ts` header (~line 27) | Drop the `:157` citation or correct to `:141` (prefer dropping). |
| [DOC][LOW] | Stale line-ref: "`elroy1SpeedPct/elroy2SpeedPct (level.ts:39,42)`" — GREEN's header rewording shifted them to `:38,41`. | `level-mirror-fields-dropped.test.ts` header (~line 22) | Correct to `:38,41` or drop the numbers. |

**Not blocking (verified accurate, keep):** the `game.ts:709,711` citations, the `level.ts` reworded header + FRIGHTENED_GHOST_SPEED_PCT doc, and the `game.test.ts:433/483` "single source (pm5-2)" comments are all correct (rule-checker #17 + comment-analyzer confirmed).

**Dispatch tags:** [EDGE] disabled · [SILENT] disabled · [TEST] disabled (assessed by me + rule-checker — clean) · [DOC] 6 findings confirmed (above) · [TYPE] disabled (rule-checker #1/#2 clean) · [SEC] clean · [SIMPLE] disabled · [RULE] clean (34 rules, 0 violations).

**Handoff:** Back to Dev (Yoda) for a comment-only green rework — fix the new test file's header, nothing else. The code is correct; do not touch logic or the assertions.
## Dev Rework (round 1)

**By:** Yoda (Dev), addressing Reviewer round-1 REJECT (6 LOW, comment-only, all in the new test file's header).
- **F4 (false premise)** — reworded "level.ts's own comments name all four fields (:105)" to past tense: before the drop level.ts named the fields, so a grep guard would have broken the moment the drop reworded them — hence the runtime shape assertion. No longer cites a live (deleted) comment.
- **Stale line-refs** — de-brittled per the Reviewer's preferred fix: DROPPED the `level.ts:49-60`/`:145-149`/`:157`/`:39,42` citations rather than re-pinning numbers that would drift again. Field/symbol names carry the meaning.
- **Inline `RED today...` comment** — reworded to present-tense guard description.
- **Kept:** the `game.ts:711/709` citations (Reviewer VERIFIED accurate) and every assertion — zero logic/test changes.
- **Verified:** `npm run lint` PASS, `npx vitest run --project pac-man` 416/416. `grep level.ts:NN` on the file → none.
## Subagent Results

_Round 2 (re-review of the comment-only rework). Delta since round 1 = `git diff 447a94ae..HEAD`: 1 file, 16/16 lines, **zero non-comment code lines** — so security & rule-checker (logic/type/security domains, unchanged) carry their round-1 CLEAN verdicts forward; only comment-analyzer & preflight were re-run._

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — R2 lint pass, 416/416, delta confirmed comment-only |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | clean | none | R2: all 6 round-1 findings RESOLVED, 0 new; surviving game.ts:711/709 citations re-verified accurate |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | CLEAN carried forward from R1 — zero code change in R2 delta |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | CLEAN carried forward from R1 (34 rules, 0 violations) — zero code change in R2 delta |

**All received:** Yes (2 re-run clean; 2 CLEAN carried forward on a provably comment-only delta; 5 disabled)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred

### Delivery Findings capture (Round 2)
- No new upstream findings during round-2 re-review.

## Reviewer Assessment

**Verdict:** APPROVED

Round 1's sole finding-class — stale line citations and one self-refuting premise in the new test file's header — is fully resolved. Dev de-brittled the header exactly as recommended: dropped the drifting `level.ts:NN` citations in favour of unambiguous symbol names, and reworded the "WHY RUNTIME" rationale to past tense so it no longer cites comments the drop deleted. `reviewer-comment-analyzer` confirms all 6 findings RESOLVED with zero new comment issues; the surviving `game.ts:711/709` citations were independently re-verified accurate. The rework is provably comment-only (`git diff 447a94ae..HEAD` touches zero non-comment lines), so the underlying implementation — already clean at round 1 — is unchanged.

**Data flow traced:** `elroyThresholds(level)` (mode.ts, single source) → `game.test.ts` reads + Blinky Cruise-Elroy speed (`game.ts:709/711` via `elroy1SpeedPct`/`elroy2SpeedPct`). Safe: the deleted `Level.elroy1/elroy2/frightenedSeconds/frightenedFlashes` had zero readers; old `buildLevel` sourced elroy1/elroy2 from `elroyThresholds` itself, so the repoint is byte-identical (`elroyThresholds(1)={20,10}`).
**Pattern observed:** dead-mirror-column removal enforcing single-source-of-truth — `plugins/pac-man/src/core/level.ts:124` (`buildLevel` no longer duplicates mode.ts).
**Error handling:** N/A — pure numeric table constructor, no failure paths; `levelRow` clamps (never throws/undefined), unchanged.

**Dispatch tags:** [EDGE] disabled · [SILENT] disabled · [TEST] disabled (assessed by me + rule-checker R1 — clean; runtime non-vacuous asserts) · [DOC] R2 clean (6/6 R1 findings resolved, 0 new) · [TYPE] disabled (rule-checker #1/#2 clean R1) · [SEC] clean · [SIMPLE] disabled · [RULE] clean (34 rules, 0 violations, carried forward).

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.
## Impact Summary

_Compiled by sm-finish preflight, appended by SM before archiving (permanent record)._

**Scope:** Deletion of four dead mirror fields from the pac-man `Level` type (`frightenedSeconds`, `frightenedFlashes`, `elroy1`, `elroy2`), enforcing single-source-of-truth for Cruise-Elroy thresholds and ghost-fright timings.

**Rationale (ROM-faithful):** the real Pac-Man cabinet displays none of these four values. `frightenedSeconds`/`frightenedFlashes` drive internal ghost behaviour (mode.ts), never shown; `elroy1`/`elroy2` are internal Cruise-Elroy dots-remaining thresholds — production consumes the *speed multipliers* `elroy1SpeedPct`/`elroy2SpeedPct` (`game.ts:709,711`) from the level table, and the thresholds from `mode.ts` directly. Wiring a HUD/attract readout would invent cabinet behaviour that never existed; fidelity forecloses it.

**Coverage preserved at single source:** `elroyThresholds(1)={20,10}` (`mode.test.ts:163`), `frightenedFramesForLevel(1)=6s` (`:156`), `FRIGHT_FLASHES=5` (`:157`). The deletion removes duplication, not coverage.

**Test evidence:** full pac-man suite 416/416 (39 files), `tsc --noEmit` clean. Three `game.test.ts` sites repointed from `levelRow(n).elroyN` to `elroyThresholds(n).elroyN` (byte-identical — old `buildLevel` sourced from `elroyThresholds` itself). New RED runtime-shape guard (`hasOwnProperty` across 4 levels) + AC-4 regression guard on the surviving `*SpeedPct` pair.

**Review:** two-round TDD. Round 1 REJECTED on 6 LOW, comment-only findings (new test file's header cited pre-drop line numbers + a self-refuting premise). Round 2 APPROVED — de-brittled comment-only (delta = 16 comment lines, zero non-comment code), all findings resolved, zero new. Specialists: preflight / security / rule-checker (34 rules, 0 violations) / comment-analyzer all clean. **blocking_issues: 0.**
