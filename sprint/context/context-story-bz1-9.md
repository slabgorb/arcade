# Story bz1-9 Context

## Title
Saucer bonus — drifts in at 2000 pts, random path, 5000 pts, radar-invisible

## Metadata
- **Story ID:** bz1-9
- **Type:** story
- **Points:** 2
- **Priority:** p2
- **Workflow:** superpowers
- **Repo:** battlezone
- **Epic:** Battlezone (1980) — full faithful vector clone

## Problem
The saucer is a bonus visitor, not the hostile: it appears once the player's
score reaches 2000 pts (per the epic's fidelity bar) and drifts a random path
across the battlefield, worth 5000 pts if shot down. It **coexists** with
whatever hostile is currently active — the "always one hostile" invariant
(bz1-7) governs the hostile slot only, and the epic's architecture sketch
already reserves the saucer its own top-level `GameState` field alongside
`hostile`, so this story is additive to that invariant, never a modification
of it. Per ROM the saucer is invisible to the radar scanner, same as the 21
obstacles; bz1-6 already builds that exclusion into `deriveRadar` against a
stub, so this story's job is to supply the real saucer entity and prove the
exclusion holds end-to-end, not to rebuild the filter. The saucer does not
shoot; whether it can otherwise harm the player (e.g. on collision) is not
stated anywhere read so far and must be checked against the bz1-2 findings
before assuming either way. Spawn timing/frequency, drift-path behavior, and
lifetime/despawn rules are bz1-2 findings this story consumes, not data to
invent here. Its wireframe model (bz1-2's tables) renders through the bz1-3
camera/projection pipeline like any other entity; its distinctive sound is
bz1-11's business.

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._
- Add a dedicated `state.saucer: Saucer | null` field to `GameState` (the
  epic's architecture sketch already names this slot alongside `hostile`) so
  the saucer's presence/absence never interacts with bz1-7's one-hostile
  spawn/replacement logic — the two lifecycles are independent.
- Spawn gating: the saucer becomes eligible to appear only once
  `state.score >= 2000` (epic-stated threshold); the actual spawn
  timing/frequency roll beyond that gate is a placeholder pending bz1-2's
  findings — cite it as "from the bz1-2 findings" in code, drawn from the
  seeded RNG (`core/rng.ts`), never `Math.random()`.
- Drift path: a simple planar `(x, z)` path generator (e.g. a heading + speed
  drawn from the RNG at spawn, or periodic RNG-driven heading nudges per
  `dt`) matching the path behavior described in the bz1-2 findings; kept pure
  so an identical seed + `dt` sequence reproduces an identical path.
- Lifetime/despawn: a timer- or distance-based despawn rule per the bz1-2
  findings (placeholder until they land), decremented via `dt` — mirror the
  TTL pattern star-wars uses for timed entities (e.g. `PROJECTILE_TTL`), not
  wall-clock.
- Radar exclusion end-to-end: wire the real `state.saucer` into whatever
  `deriveRadar` (bz1-6) already reads for obstacle/saucer exclusion — that
  filter is already built and tested against a stub; this story should not
  need to change `deriveRadar`'s filtering logic, only supply the live field
  it was built to exclude.
- Hit/explosion reuse: route saucer hit-detection through bz1-7's existing
  shell-hit/explosion machinery, awarding 5000 pts (epic-stated) on kill and
  reusing the standard explosion presentation rather than inventing a new one.
- No offensive behavior (pending confirmation): the saucer's step logic must
  not enqueue a shot/projectile at the player. Whether ROM lets the saucer
  otherwise damage the player (e.g. via collision) is unconfirmed here —
  verify against the bz1-2 findings; until confirmed, implement it as
  harmless (bonus target only) and document that assumption in code so it's
  easy to correct if the findings say otherwise.
- Rendering: draw the saucer's wireframe model (bz1-2's model tables) through
  the bz1-3 camera/view/projection pipeline exactly like an obstacle or
  hostile — no saucer-specific render path.
- Determinism tests: drive spawn-gating, drift, and despawn with a fixed RNG
  seed and `dt` sequence, asserting an identical saucer lifecycle
  (spawn tick, path, despawn tick) on repeat runs.

## Scope
- In scope: the `state.saucer` field and its independent lifecycle (spawn
  gate at 2000 pts + RNG-driven timing, deterministic drift path,
  lifetime/despawn); wiring the live saucer entity into bz1-6's existing
  radar exclusion; wiring saucer hits into bz1-7's existing
  hit/explosion/scoring machinery for a 5000-pt kill; rendering the saucer's
  bz1-2 model through the bz1-3 pipeline.
- Out of scope: saucer sound design (bz1-11); any saucer offensive/shooting
  behavior (presumed none pending bz1-2 confirmation, per the Problem/Technical
  Approach notes above); difficulty-curve effects on saucer spawn rate
  (bz1-10); HUD/framing changes (bz1-12); modifying bz1-6's `deriveRadar`
  filtering logic or bz1-7's hostile spawn/AI logic themselves (already
  built) — this story only wires the saucer into them.

## Acceptance Criteria
- In a deterministic run (fixed seed + dt sequence), no saucer ever appears
  while `state.score < 2000`.
- The saucer and the active hostile coexist without violating the
  "always one hostile" invariant: a test asserts exactly one hostile present
  at all times regardless of whether the saucer is spawned, despawned, or
  mid-drift.
- The saucer produces zero radar blips at any point in its drift/lifetime — a
  test drives the real `state.saucer` entity through `deriveRadar` (not the
  bz1-6 stub) and asserts no corresponding blip ever appears.
- Shooting down the saucer awards exactly 5000 pts and triggers the standard
  hit/explosion presentation (bz1-7's machinery), verified by a hit test.
- The saucer's spawn timing, drift path, and despawn are deterministic: an
  identical RNG seed and `dt` sequence reproduce an identical lifecycle across
  repeat runs.
- The saucer never fires at the player: a test asserts its step logic
  produces no player-damaging projectile/shot.
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test` is
  green.

---
_Generated by `pf context create story bz1-9` from the sprint YAML._
_Enriched by Architect (Maude) via story-context subagent._
