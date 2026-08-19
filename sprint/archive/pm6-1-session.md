---
story_id: "pm6-1"
jira_key: "pm6-1"
epic: "pm6"
workflow: "tdd"
---
# Story pm6-1: Intermission PHASE + level-gated trigger

## Story Details
- **ID:** pm6-1
- **Jira Key:** pm6-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pm6-1-intermission-phase-level-gated-trigger
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-19T11:32:23Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-19T11:04:52Z | 2026-08-19T11:06:10Z | 1m 18s |
| red | 2026-08-19T11:06:10Z | 2026-08-19T11:18:05Z | 11m 55s |
| green | 2026-08-19T11:18:05Z | 2026-08-19T11:22:19Z | 4m 14s |
| review | 2026-08-19T11:22:19Z | 2026-08-19T11:32:23Z | 10m 4s |
| finish | 2026-08-19T11:32:23Z | - | - |

## Sm Assessment

Pre-flight clean: develop in sync with origin/develop (0/0), no remote `*pm6*`
branches, no sibling checkout (a-1, a-2) has a pm6 session — pm6-1 is uncontested.

Story is well-formed and pre-ruled by the pm6 epic — no open questions to the user:
- **Decision A** — the intermission is a PHASE off the pm4 machine
  (`plugins/pac-man/src/core/game.ts:184` `GamePhase`), entered from `events.ts:78`
  `level-cleared`, gated on the level byte `#4e13`. Not a forked path.
- **Decision C** — the act→level cadence must be RED-anchored to the vendored source
  (`pacman.asm:1616-1617` level-byte compare), cited via `citations.test.ts`, never
  assumed. The trigger citations (`:1613 ld a,#02`, `:1615-1616` the store, `:1616`
  the `#4e13` read) and pm2 `claims/sound.json #02` are given.
- **Reuse-first** — pm2 `#02` looping intermission music is CONSUMED, not
  re-implemented; no new asset bake. pm4 phase machine is extended, not forked.
- **Pure-first** — phase + trigger only this story; `purity.test.ts` stays green;
  animations are pm6-2/pm6-3.

Scope is tight (3 pts): the `intermission` state, the level-gated entry, the `#02`
music request, the return-to-next-level close, and citations. TEA owns RED.

**Handoff → TEA (red phase).** Watch for the Decision-C trap: the exact cadence
(the epic's working guess is act 1 after board 2, act 2 after board 5, act 3 after
9/13/17) must be pinned to the ROM, not to that prose.

## TEA Assessment (RED)

RED committed (`89f5767c`). Full pac-man suite: **2 files red, 39 green (421 tests
pass)** — only the two intended files fail, no collateral damage. The two REDs:
- `tests/core/intermission.test.ts` — collection failure (module `src/core/intermission`
  not built yet) + type-driven contract errors.
- `tests/core/phase.test.ts` — `PHASES` no longer lists `intermission` (I extended
  `EXPECTED_PHASES` to the seven-phase set).

**The contract Dev must satisfy (GREEN):**
1. `src/core/game.ts` — add `'intermission'` to the `GamePhase` union; export
   `GameEvent`-emitting wiring in `stepGame` (see 5).
2. `src/core/phase.ts` — add `'intermission'` to `PHASES`; add `intermissionDue?` and
   `intermissionExpired?` to `PhaseSignals`; edges: `level-clear` + `clearExpired` +
   `intermissionDue` → `intermission`; `level-clear` + `clearExpired` (no/false due) →
   `ready`; `intermission` holds until `intermissionExpired` → `ready`. (Keeps phase.ts
   constant-free per the pm4-5 design — cadence lives in the wiring story.)
3. `src/core/intermission.ts` (NEW, pure) — `INTERMISSION_LEVELS = [2,5,9,13,17]`,
   `isIntermissionLevel(level)`, `INTERMISSION_MUSIC = 0x02`.
4. `src/core/events.ts` — add `IntermissionStartedEvent { type:'intermission-started';
   music:number }` to the `GameEvent` union.
5. `stepGame` wiring — on the level-clear expiry, if the **completed** round is a coffee-
   break round, enter `intermission` and emit `{type:'intermission-started',
   music: INTERMISSION_MUSIC}`; the intermission then hands back to `ready` for the next
   round. Compute `intermissionDue` from the completed level (BEFORE `advanceLevel`
   moves it) — the integration tests drive a level-2 clear and a level-3 clear.
6. **Citation (Decision C, AC2/AC3):** add a claim (e.g. `SND-INTERMISSION-TRIGGER` in
   `docs/rom-study/claims/sound.json`) citing the #02 trigger:
   `source: { file:'pacman.asm', line:1613, verbatim:'0a33  3e02      ld      a,#02' }`.
   The RED test asserts a claim at line 1613 exists; `tests/audit/citations.test.ts`
   independently byte-verifies the verbatim.

**Decision-C discipline honored:** the #02 request and the level-byte read are ROM-cited
(pacman.asm:1613/1616, confirmed verbatim in the vendored tree). The round SET
{2,5,9,13,17} is the documented Pac-Man Dossier coffee-break order — NOT a single ROM
literal (no contiguous `02 05 09 0d 11` table exists), so it is treated as an honest-
uncited cadence gated on the cited level byte, exactly as `game.ts` READY_HOLD_FRAMES /
`level.ts` speed table already are. Nothing fabricated. If Dev locates the ROM's exact
round-gate line during GREEN, cite it and tighten the claim; otherwise the honest-uncited
note above is the correct standing policy.

### Rule Coverage
- **Core purity (the load-bearing project rule)** — Dev's new `src/core/intermission.ts`
  and the `stepGame` wiring must stay clock/DOM/RNG-free. **Not re-tested here by design:**
  `tests/purity.test.ts` already sweeps ALL of `src/core/*` and stays green, so the new
  module is auto-covered — duplicating the scan would be busywork.
- **Citation gate** — the new #02 claim is auto-covered by `tests/audit/citations.test.ts`
  (schema + byte + prose-coverage). My RED adds a focused presence assertion (a claim at
  pacman.asm:1613) so the story reddens if the claim is omitted.
- **AC-enforcement** — AC1 (phase + correct-levels-and-not-others), AC2 (music #02 + claim),
  AC3 (value-pinned cadence, mutation reddens), AC4 (pure, loop closes) each have concrete,
  non-vacuous assertions (whole-set equality, exact phase/level, single-cue count).
- **Type-driven RED** — the union/signals/event-type extensions fail `npm run lint` until
  built (`tsc --noEmit` red), so GREEN is gated by the type checker as well as vitest.

**Handoff → Dev (green phase).** Trap to watch: compute `intermissionDue` from the
COMPLETED round, not the post-`advanceLevel` value (else a round-2 clear checks round 3).

## Dev Assessment (GREEN)

GREEN committed (`28d04a25`). All of TEA's contract satisfied, minimal code:
- `GamePhase` += `intermission`; `phase.ts` `PHASES` + `PhaseSignals`
  (`intermissionDue`/`intermissionExpired`) + the two edges (phase.ts stays
  constant-free per pm4-5).
- NEW pure `src/core/intermission.ts` — `INTERMISSION_LEVELS {2,5,9,13,17}`,
  `isIntermissionLevel`, `INTERMISSION_MUSIC` #02.
- `events.ts` += `IntermissionStartedEvent`.
- `stepGame` level-clear branch diverts to `intermission` on a coffee-break round —
  `intermissionDue` sampled from `state.level` BEFORE `advanceLevel` (the trap TEA
  flagged); emits the #02 cue; new `intermission` branch holds
  `INTERMISSION_HOLD_FRAMES` (300, honest-uncited placeholder — pm6-2/3 pin the real
  animated duration) then → `ready`.
- `sound.json` += `SND-INTERMISSION-TRIGGER` claim (pacman.asm:1613 `ld a,#02`,
  byte-verified by `citations.test.ts`).

**Verification (evidence):** `npx vitest run --project pac-man` → **41 files / 435
tests green**; `npm run lint` → exit 0; `node scripts/build-app.mjs pac-man` → built;
`npm run test:orchestrator` → 0 fail. No pre-existing test regressed (the level-clear
→ ready path is unchanged for non-coffee-break rounds; freeze-pauses.test.ts stays
green).

**No design deviations.** Decision B honored (static freeze, no flash — reuses the
level-clear freeze idiom). Decision C honored (trigger ROM-cited; round-set honest-
uncited per standing policy).

## Subagent Results

**All received:** Yes (4 enabled: preflight, security, comment-analyzer, rule-checker; 5 disabled via settings).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | all gates green (435 pac-man + orchestrator, lint, build) |
| 2 | reviewer-security | Yes | clean | none | purity ✓, no strobe ✓, no new assets ✓ |
| 3 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1 (broken claim cross-ref) — FIXED |
| 4 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2 (overstated audio comment + same claim ref) — FIXED |
| 5 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |

## Reviewer Assessment

**Working-tree audit:** `pf reviewer audit-tree` → CLEAN (no left-behind mutations).

**Specialist subagents (enabled):**
- **[PRE] reviewer-preflight** — clean: 435 pac-man tests + orchestrator suite green,
  `npm run lint` exit 0, `build-app pac-man` succeeds, zero code smells (console.log /
  TODO / skips).
- **[SEC] reviewer-security** — clean: core purity intact (no clock/DOM/RNG in the new
  `src/core` symbols), Decision B honored (static freeze, no strobe), no new assets
  (#02 CONSUMED). Carried forward: re-audit strobe when pm6-2/3 add shell rendering.
- **[DOC] reviewer-comment-analyzer** — 1 finding, CONFIRMED + FIXED: the
  SND-INTERMISSION-TRIGGER claim's prose cross-referenced non-existent claim ids
  (`SND-V1-DEF-TABLE/V2-DEF-TABLE`). All `pacman.asm` byte citations verified exact.
- **[RULE] reviewer-rule-checker** — 2 findings (33 rules / 41 instances checked),
  CONFIRMED + FIXED: (a) the same dangling claim ids [overlaps DOC]; (b) Check-#17
  overstated comments in `events.ts`/`game.ts` asserting the shell plays #02 when no
  `audio.ts` consumer exists. All other rules compliant (types readonly, no `as any`,
  exhaustive union switch, citation policy honored, tests mutation-sensitive).

**Own adversarial read:** the phase machine is correct — `intermissionDue` is sampled
from the COMPLETED level before `advanceLevel` (the TEA-flagged trap); `advanceLevel`
runs exactly once per clear (intermission/ready branches are mutually-exclusive
`else-if`); no double-advance; `level-cleared` (clear entry) and `intermission-started`
(clear expiry) fire on separate frames. Purity intact (auto-swept by `purity.test.ts`);
Decision B honored (static freeze, no strobe); Decision C honored (the #02 trigger +
level-byte read byte-verified against `pacman.asm:1613/1616`; the round-set is honest-
uncited per the standing policy).

**Findings (2 confirmed, both documentation, both FIXED in `80a98514`):**
1. `sound.json` SND-INTERMISSION-TRIGGER cited non-existent claim ids
   `SND-V1-DEF-TABLE/V2-DEF-TABLE` → corrected to the real
   `SND-VOICEDEF-V1-STREAMS/V2-STREAMS`. (The byte citation itself always resolved
   and passed the gate; only the prose cross-ref was dangling.)
2. `events.ts`/`game.ts` comments asserted "the shell audio plays it" in the present
   tense, but no `audio.ts` consumer exists → reworded to the honest pure-first
   framing. The underlying playback gap is logged as a non-blocking Delivery Finding
   for pm6-2/pm6-3 (above).

Neither finding was a logic defect or an AC miss — the code was correct as committed;
the fixes are documentation-accuracy only, and the suite stayed green after them.

All four ACs met with concrete, mutation-sensitive tests; the one live-play gap (#02
not yet audible) is correctly deferred with a tracked finding.

**Verdict:** APPROVED

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Reviewer, Gap, non-blocking → pm6-2/pm6-3]** The `intermission-started` (#02)
  request is emitted on the audio seam but has **no shell consumer yet**:
  `shell/audio.ts`'s `onEvents` switch has no `intermission-started` case (falls to
  `default: break`), and `shell/tune.ts` only implements the START theme (#01) — there
  is no #02 note-stream in the shell. So in live play the intermission currently plays
  the **gameplay siren**, not the #02 looping intermission music. This is CORRECTLY
  scoped out of pm6-1 (pure-first: emit the request + cite; the music rides the pm6-2/3
  presentation) — NOT forgotten wiring, since #02 playback is genuine unbuilt shell
  work. **pm6-2/pm6-3 MUST:** implement the #02 note-streams (#3bf3/#3c95, cited in
  SND-VOICEDEF-V1/V2-STREAMS) in `tune.ts`, add an `intermission-started` case to
  `audio.ts` that plays #02, and suppress the siren during the `intermission` phase.

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->