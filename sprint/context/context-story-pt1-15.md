# Story pt1-15 Context

## Title
joust: egg-hatching spawns the rider mid-air instead of waiting for a buzzard to descend and collect it

## Metadata
- **Story ID:** pt1-15
- **Type:** bug
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Playtest bug sweep 2026-08-19 (pt1)

## Problem
Playtest 2026-08-19: a hatched egg becomes a flying enemy immediately. Authentic:
the egg hatches into a rider standing on the platform; a riderless buzzard flies
in, descends, and picks the rider up (MOUNRI) — only then is it a threat.

## Findings (research complete — the MIDDLE of the sequence is missing)

**What's coded:** wait (`sim.ts:1281-1308`, EGGWT×12) → quota gate + hatch cue
(`sim.ts:2711-2723`) → EGGTBL cutscene walk, 112 frames ending in 7 frames of the
standing knight PLY4S (`sim.ts:686-734`) → **then `sim.ts:2681-2690` REPLACES the
egg process with a fully-mounted airborne enemy at the far edge at the egg's
altitude** (`remountEnemyProcess`, `sim.ts:1461-1498`: `airborne: true`,
`posY: egg.posY`, `brain: 'linet'`). The port's own comment admits it:
`sim.ts:2679-2680` "the EGGLLP wait, :3316, collapsed to the spawn here; the
standing knight's own vulnerability is the filed follow-up." **No rider entity
exists anywhere.**

**The authentic sequence (`JOUSTRV4.SRC:3224-3695`), delta-mapped:**

| Authentic | Port today |
|---|---|
| Buzzard created AT HATCH (`:3245-3248` "SIGNAL BUZARD TO START FLYING IN!", STFLY2), flying during the whole EGGTBL show | created 112 frames later, when the show ends |
| Buzzard is RIDERLESS (`:3260` "& WITHOUT A RIDER") running the SEEKE fetch brain (`:3268` "TELL THE DOGIE TO FETCH THE LITTLE MAN") | born mounted, `linet` brain |
| Egg becomes a STANDING RIDER (`:3311-3315`) holding in EGGLLP indefinitely (`:3316` "WAIT UNTILL BUZZARD COMES OR KILLED BY PLAYER") — player-killable | egg process destroyed; PLY4S shows 7 frames |
| Bird lands, waits 5 wakes, the man RUNS to it, MOUNRI (`:3654-3695`): INC NSMART, SNMOUN mount cue, egg proc dies, "ENEMY RE-INCARNATED!!!" at the rider's ground position | enemy pops in airborne at the screen edge |
| Buzzard entry Y = the MAN'S cliff tier (`:3280-3289`, $93+22/$52+22/$45) | `posY: egg.posY` verbatim |

**Already faithful (don't re-do):** hatch wait + quota (EGGLND `:3224-3242`,
claims JT99-*), far-edge max-warp entry (`:3256, :3270-3279`, claims
JT24-030..033, `egg.remountEntryEdge`), egg count carry (`:3251`, JT24-029),
NSMART debit (`:3669`, JT24-034, `remountBudgetDebit`).

**New claims this story adds (none exist):** `:3260` (riderless), `:3268`
(SEEKE), `:3311-3316` (standing rider + EGGLLP), `:3654-3695`
(MOUNTM/MOUNLP/MOUNRI + SNMOUN), `:3280-3289` (cliff-tier entry Y). No
"rider" entry exists in subsystems.md/open-questions.md — add one.

## Technical Approach
Model the middle of the sequence, pure-core:
1. At hatch (quota passed): spawn the RIDERLESS buzzard with a SEEKE-style
   fetch target (the rider) at the cliff-tier entry Y, far edge, velX 8 —
   AND turn the egg process into a standing rider (grounded, player-killable,
   holds the wave open) instead of destroying it.
2. EGGTBL plays as today WHILE the buzzard flies (re-order: cue+buzzard first,
   cutscene concurrent — matching `:3290-3291` "SIDE SHOW FOR THE EGG, WHILE THE
   BIRD IS IN FLIGHT").
3. On buzzard-reaches-rider: the 5-wake wait + run + MOUNRI — mount cue SNMOUN,
   rider+buzzard become the enemy at the RIDER'S ground position, NSMART/PCHASE
   debits move to this moment (`:3669-3676`).
4. Killing the standing rider cancels the remount (the EGGLLP "OR KILLED BY
   PLAYER" arm) — decide the buzzard's fate from the ROM (it must be read at
   RED; don't invent).
Wave-clear gate `sim.ts:2768-2780` ("no enemies AND no eggs") must count the
rider and the fetching buzzard — a rider must hold the wave open.

## Scope
- In scope: rider entity/state, SEEKE fetch, MOUNRI mount, claims, the wave-gate
  extension; retiring the sim.ts:2679-2680 admission.
- Out of scope: egg physics/wait timings (cited, correct); warp-in rendering
  (pt1-14); demo-AI tuning.

## Tests affected / cascade risk — HIGH (the jt13 standing risk squarely)
- Direct: `tests/egg.test.ts` (AC-3 far-edge remount `:322` — reframes to the
  buzzard; AC-4 seeded replay `:401` self-consistency), `tests/egg-source.test.ts`
  (`:175-253` — extend with the new claims), `demo-jt9-25*.test.ts` (the EGGTBL
  cutscene — the suite this lands on top of), `demo-jt9-38` (quota), `demo-jt9-40`
  (PWHCH), `demo-jt9-41` (mid-hatch egg collectible — the rider inherits this),
  `demo-jt9-47` (species carried), `demo-jt4-4/4-5` + `game-jt4-5*` (self-clear).
- **Fingerprints:** a new process kind changes process COUNT and ORDER →
  `tests/audio-events.test.ts:825-1067` frozen tuples (three seeds) will move.
  Precedent is in that file's own comments (uf1-8, jt9-24, jt9-8, jt9-43, jt5-4 —
  all enemy-AI re-baselines). The invariant to lead with: **rng unmoved**
  (1_928_172_029 across five re-baselines) — the fetch brain must draw no new
  randomness; procs/scores/wave legitimately move. Also sweep
  `glide-prologue.test.ts` ("14 promotions"), `demo-round2.test.ts`,
  `demo-jt5-16.test.ts`, `rng-shared-adoption.test.ts`.
- Purity: new core state swept automatically (`purity.test.ts`,
  `purity-scanner.test.ts`).

## Acceptance Criteria
_TEA to define at RED. Suggested: AC1 hatch → standing rider on the platform +
riderless buzzard inbound at the cliff-tier Y (cited); AC2 the enemy exists only
after MOUNRI at the rider's ground position, with SNMOUN; AC3 the standing rider
is player-killable and cancels the remount; AC4 rider/fetching-buzzard hold the
wave open; AC5 re-baselines show rng unmoved; AC6 new claims byte-verify._

---
_Generated by `pf context create story pt1-15`; researched and expanded by Architect 2026-08-19._
