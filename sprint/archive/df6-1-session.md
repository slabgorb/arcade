---
story_id: "df6-1"
jira_key: "df6-1"
epic: "df6"
workflow: "tdd"
---
# Story df6-1: Audio seam + the single-shot gameplay emitters

## Story Details
- **ID:** df6-1
- **Jira Key:** df6-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/df6-1-audio-seam-single-shot-emitters
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** red
**Phase Started:** 2026-08-19T07:35:49Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-19T07:34:04Z | 2026-08-19T07:35:49Z | 1m 45s |
| red | 2026-08-19T07:35:49Z | - | - |

## Sm Assessment

**Setup complete — routing to TEA for the RED phase.**

Story df6-1 is the first story of epic df6 (Defender audio, phase 5). It builds the
fleet audio seam **and** the single-shot gameplay emitters in the same story — a
deliberate coupling so the seam is never dead (the jt5-1 blind spot: six declared cues
that were deletable with the suite fully green).

Setup state:
- Session file created; branch `feat/df6-1-audio-seam-single-shot-emitters` cut from `develop` (gitflow).
- Story + epic context validated at `sprint/context/`. ACs are unusually well-specified
  (4 ACs, each ROM-cited) — the title itself is the spec.
- Jira not enabled for this project (skipped, per project convention).

Handoff notes for TEA (Tyr One-Handed) — RED phase:
- Three new files: `core/events.ts` (discriminated union emitted as DATA on sim state,
  Decision C — never a callback), `shell/audio.ts` (SOUNDS manifest + CHANNELS map
  consuming `@shared/audio`, each cue citing its `*SOUND TABLE` entry), and
  `shell/audio-dispatch.ts` (event→cue switch behind a `never` exhaustiveness guard).
- The load-bearing test is AC4's **mutation battery**: deleting ANY emitter must redden
  a value/emission assertion — NOT a coverage/presence check. This is the whole point of
  the story; write it as a mutation test, not a "cue exists" assertion.
- AC1 pins df3 seeded-RNG determinism replays bit-for-bit with the event channel live
  (no new RNG draw, no ordering change). Purity must stay green — cues are DATA, not effects.
- Hyperspace emits NO cue (HYPER issues no SNDLD) — do not invent one; a test should
  assert its absence.
- NO `.wav` is committed; Defender stays silent when this story closes.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (blocking): The live `stepSim` (plugins/defender/src/core/sim.ts:219-266) only wires
  ship/lasers/landers/humanoids/waves(-of-landers)/effects. NOTHING imports mutants/ufo/ties/
  swarmers/probes/powers/score/endgame (grep-verified: only `endgame.ts`→`score.ts`, a type import).
  So the enemy menagerie, smart-bomb/hyperspace, scoring and game-over are built + unit-tested at the
  BANK level but never integrated into the running game. The epic's reuse premise ("the hit/shoot/
  grab/suck cue call sites already exist") is true only at the bank level, false at the sim level.
  Of df6-1's ~23 cues, only ~8 are reachable through `stepSim` today. AC4's mutation battery is only
  satisfiable for emitters that exist AND fire — declaring the other 15 would REINTRODUCE the exact
  jt5-1 blind spot this epic exists to prevent. Affects the whole story scope.
- **Gap** (blocking): `LGSND` (LANDER GRAB, DEFA7.SRC:687) has NO call site anywhere in the vendored
  tree (grep returns only the FCB table row). The grab moment (landers.ts:317-321) is where the ROM
  plays `LPKSND` (DEFB6.SRC:790). df6-1's cue list names lander-grab (LGSND) as a distinct emitter;
  the source supports one cue, not two. Emitting LGSND would be a confabulated call site.
- **Conflict** (non-blocking): `ST1SND`/`ST2SND` (DEFA7.SRC:668/669) are ONE/TWO PLAYER game-start
  (routines ST1 :1105, ST2 :1119), NOT a per-wave cue. No per-wave `SNDLD` exists in the tree. The
  core wave-start moment (waves.ts:110-113) is real, but the ST1/ST2 citation does not name it.
- **Gap** (non-blocking): `LSHSND` (lander shoot), `AHSND` (astro hit) have no core implementation at
  all (landers.ts:27-28 defers LSHOT to "df4-5", which shipped other work); `LSKSND` (lander suck)
  is the stateful cue explicitly deferred to df6-2. `PDSND` (player death) is resolved in no live path.
- **Gap** (non-blocking): the appear cue (`APSND`) only fires via the exported `spawnLander(state,x)`
  entry; the wave director's spawn path (sim.ts:143-146) bypasses it, so a wave's landers arrive with
  no appear effect — a reachability gap even for a "reachable" cue.
  *Found by TEA during test design (recon agents, grep-verified).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->
### Dev (Julia) — GREEN, df6-1 audio seam + FULL menagerie integration

The story shipped complete: the audio EVENT SEAM plus the full sim integration the
TEA blocking findings above demanded. Per the user's explicit directive (memory
`never-defer-integration-wiring`), the integration was done IN PLACE — not deferred or
descoped — so every one of the 21 cues now has a REAL, reachable call site in the live
`stepSim`.

**What landed**
- `core/events.ts` — EVENT_KINDS (21) tuple + GameEvent payload-free discriminated union.
- `core/sim.ts` — REWRITTEN to construct all six enemy banks (landers, mutants, baiters/
  ufo, bombers/ties, pods/probes, swarmers) and wire wave composition, lander→mutant
  transform, pod→swarmer release, panic, the baiter anti-camping timer, lander/mutant/
  baiter/swarmer shooting, COLIDE (lasers-vs-all-enemies: kill+score+explode+HIT cue),
  enemy-fire/bomb/body-vs-ship player death, rescue catch, astro land/hit/scream,
  smart-bomb (SBSND + silent clear), hyperspace (teleport/death, no cue), scoring and
  game-over. Carries `SimState.cues` (rebuilt each tick, Decision C).
- `shell/audio.ts` — SOUNDS, CHANNELS (the single-voice priority FENCE, Decision E:
  `prio-<SNDPRI>`), CUE_SOURCES (byte-exact ROM provenance for all 21), createAudioEngine
  on `@shared/audio`. Ships the seam SILENT — no `.wav`, no sample bake (a later df story,
  as jt5-2 followed jt5-1).
- `shell/audio-dispatch.ts` — event→cue switch behind a `never` guard; `playEventSounds`.
- `docs/rom-study/claims/19-sound.json` — 22 claims, all byte-verified by the df1-1 gate.
- `main.ts` — drains `sim.cues` → playEventSounds inside the fixed-step loop; audio.resume
  on keydown/pointerdown.
- Tests: df6-1-audio-events (AC1: tuple/DATA/determinism + frozen fingerprint),
  df6-1-audio (AC2: manifest totality + byte-verified citations), df6-1-audio-dispatch
  (AC3: kind→cue totality + degrade), df6-1-audio-emission (AC4: the MUTATION BATTERY —
  each of the 21 emitters reached and proven; deleting any one reddens exactly its test,
  spot-verified). `tests/audio-dispatch-convention.test.mjs` enrolls `defender`.

**Gates**: `npm run lint` clean; `npx vitest run --project defender` 825 pass; full
`npx vitest run` 17,630 pass; `npm run test:orchestrator` 503 pass; defender builds.

## Design Deviations

- **ST1SND reused as the wave-start cue.** The ROM's `ST1SND` (DEFA7.SRC:668, START 1)
  is the ONE-PLAYER game-start cue, played once at ST09 (:1105); the machine loads no
  per-field `SNDLD`. df6-1 reuses it for the `wave-start` moment so a new field is
  audible. Byte-exact ROM moment: game-start. (TEA logged this as a Conflict finding.)
- **Integration magnitudes are placeholders, not byte-cited ROM values** (sim.ts, the
  "df6-1 integration magnitudes" block): lander shoot cadence (LANDER_SHOOT_PERIOD=72),
  the baiter anti-camping timer (BAITER_SPAWN_PERIOD=480, BAITER_MAX=2), the aimed-shot
  projectile model (SHOT_TRAVEL_FRAMES/SHOT_LIFE), and the starting smart-bomb stock
  (STARTING_SMART_BOMBS=3, PSBC init not transcribed into core). Each paces a behaviour
  the isolated bank modules deferred; chosen to make each cue-emitting moment reachable
  in ordinary play. The exact ROM cadences are a later df story.
- **The audio seam ships SILENT (no priority arbitration).** Following jt5-1 (the story
  mirrored), createAudioEngine passes only `{baseUrl, sounds, channels}`; the machine's
  timed SNDPRI/SNDTMR arbitration (the jt5-5 equivalent) is a later df story. `CHANNELS`
  is the channel-per-priority FENCE in the meantime.
- **enemy-appear vs the wave spawn path (TEA finding, now resolved).** The wave director's
  spawn path now materialises every enemy through a common `appear()` helper that fires
  APSND — the reachability gap TEA flagged is closed.
- **RENDER of the newly-wired menagerie is a deferred gap (not this story).** `scene.ts`
  composeFrame does not yet draw mutants/baiters/bombers/pods/swarmers/shots; df6-1 is
  audio-only. The enemies are simulated and audible but not yet painted — a later render
  story. (The audio seam and its tests do not depend on render.)

## Merge resolution (develop → feature branch, df5-7 + df7-1/df7-2 landed meanwhile)

`develop` advanced twice during the story (df5-7 render + smart-bomb-clear + the `smartBomb`
binding; then df7-1 phase machine + df7-2 attract→setup→play start wiring). Both merged into
the branch; conflicts were confined to `sim.ts`, `input.ts`, and `main.ts`.

- **sim.ts**: kept my full menagerie+audio rewrite (a superset of df5-7's partial integration)
  and re-added the exported `killShip(state)` seam df5-7's visual-playtest drives, re-pointed
  at the integrated runtime's `_rt.score` ledger (develop's used the pre-df6-1 `_score`).
- **Two integration fixes surfaced by the merge tests** (both real, both in sim.ts):
  - *Player death-loop* → a hazard overlapping the resting ship re-killed it every tick
    (game-over in ~38 frames), which masked df3-6's thrust≠rest frame test. Added a brief
    post-death invulnerability window (`RESPAWN_GRACE`, a placeholder for the ROM's PLADIE→
    new-ship blink); the ship keeps its pose so ship-movement invariants are untouched.
  - *Smart-bomb same-tick respawn* → clearing the field before the wave director dispatched
    let it respawn a fresh wave the same tick (df5-7's clear test saw the field full). Moved
    the smart-bomb clear to AFTER `stepTick`, so it behaves like a laser kill (next wave on
    the next tick). The df6-1 seed-42 cue fingerprint was re-baselined for the new timing.
- **input.ts**: kept develop's `smartBomb: ['KeyB','ShiftLeft']` and df7-2's `startPressed`;
  moved my hyperspace binding to `ShiftRight` to avoid the ShiftLeft collision.
- **main.ts**: kept df7-2's phase machine (bootSession/advanceStart, step only in `play`) and
  drain `session.sim.cues` → playEventSounds inside the play branch (attract/setup stay silent).

Post-merge gates: lint clean; defender 888 pass; full suite 17,706 pass; orchestrator 503 pass.
PR #584 is CLEAN / MERGEABLE.
