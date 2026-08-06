---
story_id: "jt9-41"
jira_key: "jt9-41"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-41: joust — the hatched standing knight is killable during EGGLLP before the buzzard remounts (JOUSTRV4.SRC:3316-3319)

## Story Details
- **ID:** jt9-41
- **Jira Key:** jt9-41
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/jt9-41-egglp-standing-knight-killable
- **PR:** https://github.com/slabgorb/arcade/pull/21

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T19:24:03Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T18:48:15Z | 2026-08-06T18:50:09Z | 1m 54s |
| red | 2026-08-06T18:50:09Z | 2026-08-06T19:10:24Z | 20m 15s |
| green | 2026-08-06T19:10:24Z | 2026-08-06T19:20:09Z | 9m 45s |
| review | 2026-08-06T19:20:09Z | 2026-08-06T19:24:03Z | 3m 54s |
| finish | 2026-08-06T19:24:03Z | - | - |

## Sm Assessment

Story jt9-41 descoped from jt9-25 (TEA Delivery Finding, user ruling 2026-08-04). Setup complete; branch, session, and enriched context created. Routing to TEA for the RED phase.

**Scope:** Model the EGGLLP tail (JOUSTRV4.SRC:3316-3319, "WAIT UNTILL BUZZARD COMES OR KILLED BY PLAYER") — the just-hatched STANDING KNIGHT (PLY4S) is a killable target for a player before the remount buzzard arrives. Three things to pin: (1) the standing-knight window, (2) its collision as a killable target, (3) the effect of a kill on the pending remount (cancel? score?).

**Load-bearing constraint for TEA/Dev:** jt9-25 made a committed-hatching egg NON-collectible and pinned it in `demo-jt9-25.test.ts`. That is COLLECTING the egg — a DIFFERENT interaction from KILLING the standing knight. This story MUST NOT undo that pin. Likely a fingerprint mover; read `sprint/archive/*jt9-25*` for the cutscene shape and `EGG_HATCH_ANIM_FRAMES` timing before scheduling. Core/shell boundary applies — `plugins/joust/src/core` is pure sim.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA][Conflict — blocking, DELIBERATE RE-BASELINE] jt9-25's non-collectibility pin
  is now WRONG and must be INVERTED (not deleted).** `demo-jt9-25.test.ts:255` ("a
  COMMITTED-hatching egg cannot be collected — a player on it does NOT cancel the
  remount") asserts the OPPOSITE of the faithful behaviour this story lands. Per the
  ROM (PLYEGG/EGGSCR, :3009-3095) a player touching the egg at ANY point collects it
  via the egg ladder AND, when a remount bird is inbound, sends it off-screen (AUTOFF)
  + DEC NENEMY (:3078-3087). Dev (GREEN) rewrites that test to assert the collect DOES
  cancel the remount, and updates the stale catch-loop guard comment (demo.ts ~:1668).
- **[TEA][Conflict — blocking, FINGERPRINT MOVER] seeded replays move.** Removing the
  `hatchRow !== undefined` catch-loop skip re-enables mid-cutscene collection, so on
  seed 0xface (and any seed whose demo/AI player touches a cracking egg) the buzzard no
  longer flies in — the exact fingerprint jt9-25 deliberately suppressed. Dev must
  re-baseline each moved jt9-25/jt2 replay pin by sweeping for its OWN precondition
  (method: sprint/archive/jt5-8-session.md; jt9-25's own re-baseline is the template),
  never by nudging a digest toward the new output. The user ACCEPTED this move
  (2026-08-06 ruling: fully ROM-faithful window).
- **[TEA][Note — the story's framing was a CLAIM, corrected by ROM measurement]** The
  jt9-25 delivery finding framed the EGGLLP kill as "a DIFFERENT interaction from
  collecting the egg." The ROM does NOT distinguish them — both are PLYEGG/EGGSCR. The
  story's "must not undo jt9-25" constraint was therefore put to the user, who chose the
  fully-faithful path (revise jt9-25) over the constraint. Recorded so the Reviewer does
  not re-flag the jt9-25 inversion as a regression.
- **[TEA][Improvement — non-blocking, POSSIBLE FOLLOW-UP] per-frame collision height.**
  The ROM maintains PCOLY1/PCOLY2 from EGGTBL col1 (6 vs 11 px) every cutscene frame,
  and PLY4S is a taller standing figure than EGGI. The port's `eggMaskFor` still derives
  the mask from velocity (a settled EGGI still), so the standing knight's collision reach
  is the egg's, not the knight's. Out of scope here (the window/mechanics were the
  ruling); file if the reach matters for reachability.

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

3 deviations

- **Inverted jt9-25's non-collectibility pin (the authorized re-baseline)**
  - Rationale: jt9-25 made the egg non-collectible only to hold fingerprints still; the user's 2026-08-06 ruling restored the ROM-faithful PLYEGG/EGGSCR behaviour
  - Severity: minor
  - Forward impact: none — jt9-25's other ACs (EGGTBL transcription, cutscene, decoder) are untouched; full coverage of the interaction is in demo-jt9-41.test.ts
- **Scoped jt9-41 AC-2/AC-4 assertions to the remount id namespace during GREEN**
  - Rationale: once the egg is collected the arena clears and the wave ADVANCES, spawning wave-2 enemies — a bare count caught those as false positives (observed: 4 enemies). Scoping to the remount lineage is a MORE precise assertion, not a weaker one; the buzzard is the only process ≥ 0x40_0000 (baiters are 0x30_0000, wave enemies < 0x10000)
  - Severity: minor
  - Forward impact: none — still fully covers the cancel; the CONTROL still proves the buzzard normally comes
- **The change is a fingerprint mover in principle but INERT on every replayed seed**
  - Rationale: jt9-25's era mid-crack collect on 0xface was washed out by later stories' flight/collision timing; the demo AI no longer overlaps a cracking egg on any replayed seed
  - Severity: minor
  - Forward impact: none observed — the fingerprint move is reachable but unexercised by current replays; a future timing change that makes the AI touch a cracking egg would move those pins (and correctly so)

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Inverted jt9-25's non-collectibility pin (the authorized re-baseline)**
  - Spec source: TEA Delivery Findings (this session); demo-jt9-25.test.ts:255
  - Spec text: "INVERT demo-jt9-25.test.ts's 'a COMMITTED-hatching egg cannot be collected' — rewrite it, do not delete it: the collect DOES cancel the remount"
  - Implementation: rewrote that `it` to assert a hatching egg IS collected mid-crack and the remount buzzard (id ≥ 0x40_0000) never flies in; bounded the loop (the old `while enemiesIn===0` never terminates once the remount is cancelled)
  - Rationale: jt9-25 made the egg non-collectible only to hold fingerprints still; the user's 2026-08-06 ruling restored the ROM-faithful PLYEGG/EGGSCR behaviour
  - Severity: minor
  - Forward impact: none — jt9-25's other ACs (EGGTBL transcription, cutscene, decoder) are untouched; full coverage of the interaction is in demo-jt9-41.test.ts
- **Scoped jt9-41 AC-2/AC-4 assertions to the remount id namespace during GREEN**
  - Spec source: the tests TEA wrote (demo-jt9-41.test.ts AC-2 cancel, AC-4)
  - Spec text: AC-2/AC-4 asserted `enemiesIn(d).length === 0` over a 200-frame run
  - Implementation: assert on `id >= 0x40_0000` (the remount namespace) instead of a bare enemy/egg count
  - Rationale: once the egg is collected the arena clears and the wave ADVANCES, spawning wave-2 enemies — a bare count caught those as false positives (observed: 4 enemies). Scoping to the remount lineage is a MORE precise assertion, not a weaker one; the buzzard is the only process ≥ 0x40_0000 (baiters are 0x30_0000, wave enemies < 0x10000)
  - Severity: minor
  - Forward impact: none — still fully covers the cancel; the CONTROL still proves the buzzard normally comes
- **The change is a fingerprint mover in principle but INERT on every replayed seed**
  - Spec source: SM Assessment + TEA Delivery Findings ("fingerprint mover; re-baseline seed-0xface")
  - Spec text: "seeded replays move ... Dev must re-baseline each moved jt9-25/jt2 replay pin"
  - Implementation: instrumented seeds 0xface/0xbeef/0x2468/0x12345678 over 4000 frames — `hatchRowCollectFrames = 0` on ALL (0xface: 3 eggs hatch, all 3 remount; its one collect was a pre-maturation egg). No pin moved; no re-baseline was needed beyond the jt9-25:255 inversion
  - Rationale: jt9-25's era mid-crack collect on 0xface was washed out by later stories' flight/collision timing; the demo AI no longer overlaps a cracking egg on any replayed seed
  - Severity: minor
  - Forward impact: none observed — the fingerprint move is reachable but unexercised by current replays; a future timing change that makes the AI touch a cracking egg would move those pins (and correctly so)

## Tea Assessment

**Tests Required:** Yes
**Reason:** Behavioural feature — the player-vs-hatching-egg interaction the port did not model.

**Test Files:**
- `plugins/joust/tests/demo-jt9-41.test.ts` — 4 ACs, 6 tests (5 RED, 1 non-vacuous control).

**Tests Written:** 6 tests covering 4 ACs. **Status:** RED (feature-absent) — ready for Dev.

RED verified directly: `--project joust` → **144 files / 2950 passed, 5 failed** (only
the new suite). tsc `--noEmit` exit 0. Every red is feature-absent, not a wiring error
(collect never fires today because the catch loop skips `hatchRow`-set eggs), and the
AC-2 CONTROL passes today (the untouched cutscene DOES remount) so the cancel assertions
are non-vacuous. jt9-25's non-collectibility pin still PASSES today — it inverts only
when Dev removes the guard (the deliberate re-baseline; see Delivery Findings).

### The measurement that reshaped the story (ROM > prose)

The story (from jt9-25's TEA finding) framed the EGGLLP "kill" as a NEW, separate
interaction from collecting the egg, with a "must not undo jt9-25" constraint. Measuring
`PLYEGG`/`EGGSCR` (JOUSTRV4.SRC:3009-3095) showed the ROM has ONE mechanism: touching the
egg — cracking or standing — runs the incrementing egg-score ladder (EGGVAL 250/500/750/
1000, :3042-3061), and the "kill" is a conditional side effect — `LDY PDIST,X WAS A BIRD
AFTER THE LITTLE MAN? / DEC NENEMY / LDD #AUTOFF THE BIRD SHOULD GO OFF SCREEN`
(:3078-3087). The egg is collidable across the whole cutscene (PID stays $80+EGGID, PCOLY
maintained). I surfaced the divergence to the user (2026-08-06); they chose the fully
ROM-faithful window (revise jt9-25) over the story's constraint.

### The GREEN change (for Dev)

The whole behavioural change is REMOVING the catch-loop guard
`if (ep.egg.hatchRow !== undefined) continue` (demo.ts ~:1676). The existing catch loop
then: scores via `eggValue`/`airCatchBonus` (the ladder — AC-3), removes the egg so the
maturation flatMap never spawns the buzzard at walk-off (this port's reachable AUTOFF —
AC-2/AC-4), and `population` (NENEMY) drops because it counts `hatchRow`-set eggs (jt9-25)
and the removed egg leaves it (DEC NENEMY). Load-bearing ORDER fact: `collisionPass` (the
catch loop) runs BEFORE the maturation flatMap in `stepDemo` (:1904 vs :1994), so a
collect pre-empts the remount on the same frame. PLUS the two re-baselines in Delivery
Findings (invert jt9-25:255; sweep the moved seed-0xface replay pins).

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| Non-vacuous assertions / positive control | AC-2 CONTROL "untouched knight DOES spawn a buzzard" | passing (control) |
| Mutate with a WRONG value, not the old one | AC-3 asserts 250 AND `.not.toContain(500/750/1500)` | failing |
| Assert the MOMENT, stop at the interaction | AC-1/AC-2/AC-4 read the collect cue + population outcome | failing |
| Derived README count kept true at RED | file count 143→144 (jt5-7 AC5 guard) | passing |

**Rules checked:** the epic's recurring traps (non-vacuity, wrong-value mutation,
derived-count drift) each have coverage. **Self-check:** no vacuous assertions — every
`expect` reads a real cue/score/population value; the one always-true-today assertion is
the labelled CONTROL, by design.

**Handoff:** To Dev (GREEN).

Model advisory noted: red phase expects `best`/`sonnet`; running `claude-opus-4-8`
(user session). Measurement-heavy RED, carried on deliberately.
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/joust/src/core/demo.ts` — removed the jt9-25 catch-loop guard
  `if (ep.egg.hatchRow !== undefined) continue` and replaced its comment with the
  PLYEGG/EGGSCR rationale. That single deletion is the whole behavioural change: the
  existing catch loop now scores a hatching egg via the ladder, removes it (AUTOFF —
  no buzzard at walk-off), and drops it from `population`/NENEMY.
- `plugins/joust/tests/demo-jt9-41.test.ts` — TEA's RED suite; AC-2/AC-4 assertions
  scoped to the remount id namespace during GREEN (Design Deviation 2).
- `plugins/joust/tests/demo-jt9-25.test.ts` — inverted the non-collectibility pin
  (Design Deviation 1). jt9-25's other ACs untouched.
- `plugins/joust/README.md` — file count 143→144 (committed at RED).

**Tests:** `--project joust` **144 files / 2955 passing (GREEN)**; tsc `--noEmit` exit 0.
**Branch:** feat/jt9-41-egglp-standing-knight-killable (pushed).

### The re-baseline was INSTRUMENTED, not anchor-nudged (the epic's discipline)

TEA flagged this as a fingerprint mover requiring a seed-0xface re-baseline. I instrumented
seeds 0xface/0xbeef/0x2468/0x12345678 over 4000 frames each and measured the MECHANISM
(hatch-starts, hatchRow-egg collects, remounts): `hatchRowCollectFrames = 0` on every seed
(0xface: 3 eggs hatch, all 3 remount; its single collect was a pre-maturation egg, not a
cracking one). So the demo AI never touches a cracking egg on any replayed seed, and NO
seeded-replay pin moved — the ONLY re-baseline needed was inverting jt9-25:255. The change
is a fingerprint mover in principle (reachable) but inert on every current replay. This
matches jt9-25's own finding that later stories' timing washed out its era's 0xface collect.

### Pre-existing orchestrator failures (NOT introduced here)

`npm run test:orchestrator` → 406/408, 2 failing: `audit-refs.test.mjs` (`git rev-parse
audit/star-wars`) and `release.test.mjs` (`git show <sha>:src/core/sim.ts`). Both are git
object-DB reads independent of the working tree; the `audit/star-wars` tag is simply absent
in this local checkout (only `audit/tempest`, `audit/red-baron` are fetched). My joust-only
diff cannot affect them. CI fetches with depth 0 (CLAUDE.md) and has the tags.

**Handoff:** To Reviewer.

Model advisory: green phase expects `opus`; running `claude-opus-4-8`. Match.
## Reviewer Assessment

**Verdict:** APPROVED

**Method.** All 8 reviewer specialists are disabled in `.pennyfarthing/config.local.yaml`,
so per this repo's reviewer playbook I ran a MUTATION BATTERY over the changed surface
(one guard removal + two test edits) rather than re-reading the diff. Three mutations,
each reverted after measuring and each `git diff`-verified to have hit the intended site:

| # | Mutation | Result |
|---|----------|--------|
| M1 | re-add the removed guard `if (ep.egg.hatchRow !== undefined) continue` | 6 red (jt9-41 AC-1/2/3/4 + jt9-25:255) — the whole change is GUARDED |
| M2 | score a flat `500` instead of `eggValue(hits)` | AC-3 red (asserts 250, `.not.toContain(500)`) — the LADDER is pinned, not a killScore |
| M4 | remount spawn returns `[]` (never flies in) | AC-2 CONTROL red — the control genuinely OBSERVES the buzzard; the cancel assertion is non-vacuous |

**Correctness beyond the tests.** (1) Only PLAYERS collect — the catch loop iterates
`livePlayers`, and an egg is not in collisionPass's joust-eligible set (`player|enemy|
ptero`), so enemies cannot kill the standing knight. Faithful to "KILLED BY PLAYER".
(2) No double-scoring — the `removed` set blocks a second collect. (3) `population`/NENEMY
drops correctly because collisionPass removes the egg BEFORE the maturation flatMap
computes the count (stepDemo :1904 vs :1994) — the port's reachable DEC NENEMY. (4) The
new comment's ROM line refs are all verbatim-exact against the vendored source (PLYEGG:3009,
EGGSCR:3030, PDIST:3078, DEC NENEMY:3080, AUTOFF:3086, INC NENEMY:3242, EGGLLP:3316).

**Deviation audit — all three Dev deviations verified SOUND.**
- Inverting jt9-25:255 was authorized (TEA finding + 2026-08-06 user ruling); jt9-25's
  OTHER ACs (EGGTBL transcription, cutscene, decoder) stay green — confirmed by the full
  suite. Not a regression.
- Scoping AC-2/AC-4 to the remount id namespace (≥ 0x40_0000) is MORE precise, not weaker:
  M1 still reds both (guarded) and M4 proves the remount id is reachable (control live).
  The wave-advance enemies it excludes are a genuine different lineage.
- "Fingerprint mover but inert on every replayed seed" is corroborated INDEPENDENTLY: every
  seeded-replay test (audio-events, audio-transporter-split, audio-emission, dumb-wingbeat,
  demo-jt9-9/38/40) passes on the integrated tree — if any 0xface/0xbeef/0x2468 pin had
  moved it would have reddened. Re-ran the full suite: 144 files / 2955 green.

**Also checked:** repo-wide `tsc --noEmit` exit 0; working tree restored clean after the
battery (demo.ts unmodified); README file-count 144 matches vitest discovery. The two
`test:orchestrator` failures (`audit-refs`, `release`) are PRE-EXISTING and environmental —
the `audit/star-wars` tag is absent in this local checkout (only `audit/tempest`,
`audit/red-baron` are fetched); both are git object-DB reads independent of this joust-only
diff. CI fetches depth 0 with the tags (CLAUDE.md).

**Non-blocking for SM at finish:** the per-frame collision-height / PLY4S-mask fidelity
(TEA Delivery Finding, `eggMaskFor` still uses the velocity-derived EGGI still) is out of
scope here; file as a follow-up only if the standing knight's collision reach matters.

## Subagent Results

Reviewer subagents are DISABLED (`config.local.yaml` — all 8 specialists `false`); a manual
mutation battery (table above) was run in their place, per this repo's reviewer playbook.

| Subagent | Status |
|----------|--------|
| reviewer-preflight | Run manually: `--project joust` 144 files / 2955 passed, repo-wide `tsc` exit 0, comment ROM refs verbatim-exact. No blocking smells. |
| reviewer-silent-failure-hunter | disabled — mutation battery substituted (M1/M2/M4) |
| reviewer-test-analyzer | disabled — mutation battery substituted |
| reviewer-comment-analyzer | disabled — comment ROM refs checked manually (all exact) |
| reviewer-type-design | disabled — mutation battery substituted |
| reviewer-security | disabled — mutation battery substituted |
| reviewer-simplifier | disabled — mutation battery substituted |
| reviewer-edge-hunter | disabled — mutation battery substituted |
| reviewer-rule-checker | disabled — mutation battery substituted |

**All received:** Yes