# Story bz1-7 Context

## Title
Enemy tanks — spawn (always one hostile), approach/aim/fire AI, hit + explosion, 1000 pts

## Metadata
- **Story ID:** bz1-7
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** superpowers
- **Repo:** battlezone
- **Epic:** Battlezone (1980) — full faithful vector clone

## Problem
This is the epic's gameplay keystone — "playable-ish by bz1-7" per the design
brief: drive, shoot, and fight one tank. It gives Battlezone its first hostile:
a slow tank that spawns, approaches/aims/fires, can be killed for 1000 points,
and can kill the player, all governed by the ROM's "always exactly one
hostile" invariant (spawn → active → destroyed → replacement spawn; the
saucer is a bonus visitor, never the hostile — bz1-9). It also lands the
epic's one deliberate, pre-authorized ROM deviation: the disassembly's missing
spawn-collision check (enemies can spawn inside the 21 fixed obstacles) is a
known defect this epic does not replicate, and this story is the one the epic
context names as responsible for logging it as a design deviation, not
silently absorbing it. Everything this story needs already exists upstream:
bz1-2's scoring/model/obstacle tables, bz1-3's render pipeline, bz1-4's
tank pose and obstacle collision, bz1-5's shell/line-of-sight machinery
(explicitly built reusable for "hostile/saucer circles"), and bz1-6's
stubbed hostile-position field in `GameState` (radar has been pointing at a
placeholder; this story gives it something real to point at). bz1-8
(missiles/super tanks) and bz1-9 (saucer) build directly on the lifecycle this
story establishes — get the state machine right here, not there.

## Technical Approach
- `core/enemies.ts` (new — the epic's architecture sketch already reserves
  this filename): owns the hostile lifecycle state machine — `spawning` (or
  spawn is instantaneous; confirm against the bz1-2 findings/quarry) →
  `active` → `destroyed` → next-tick replacement spawn. Exactly one hostile
  record exists in `GameState` at a time; killing it clears the record and
  the *next* `stepGame` call spawns its replacement (verify against the
  bz1-2 findings/quarry whether the ROM has any respawn delay — if the
  quarry is silent, default to immediate next-tick respawn and note the
  default explicitly, same treatment bz1-5 gave undocumented constants).
- Replace bz1-6's stubbed hostile-position field with this story's real
  hostile entity, wired through each tick so `core/radar.ts` keeps working
  unmodified — re-run bz1-6's existing tests and confirm they still pass
  against the real entity (adjust only if the stub's shape doesn't match;
  don't change `radar.ts`'s derivation logic).
- **Spawn placement + the deviation:** pick a spawn point per the bz1-2
  findings/quarry's ROM spawn rule, then add an obstacle-overlap check the
  ROM does not have — test the candidate point against all 21 obstacle
  footprints from `core/obstacles.ts` and pick a different/nearest-valid
  point if it overlaps. Log this in the session file's `## Design
  Deviations` section using the six-field format in
  `.pennyfarthing/guides/deviation-format.md`: Spec source
  `context-epic-bz1.md`, "Fidelity bar" section; Spec text (quote verbatim)
  *"The ROM's missing spawn-collision check (enemies can spawn inside
  obstacles) is a known defect we deliberately do not replicate"*;
  Implementation: added an obstacle-overlap check the ROM lacks; Rationale:
  avoids a degenerate stuck-in-geometry spawn, explicitly pre-authorized by
  the epic; Severity `minor`; Forward impact `none` (bz1-8/bz1-9 have their
  own spawn placement to reason about separately).
- AI approach/aim/fire, each tick, driven by turn-rate/speed/fire-logic/
  aggression constants cited from the bz1-2 findings/quarry (do not invent
  numbers): turn the hostile toward the player's `(x, z)` at a bounded turn
  rate, advance toward the player at a bounded speed (reuse the planar
  bearing/range math `core/radar.ts` already computes against the player —
  don't re-derive it), and fire only when both aimed within tolerance **and**
  a clear line-of-sight exists to the player — reuse bz1-5's
  segment-vs-circle hit-test primitive (already generalized "for bz1-7/bz1-9
  to call... against hostile/saucer circles") against the 21 obstacle
  circles to gate the shot.
- Enemy shells reuse bz1-5's shell machinery (spawn/travel/expiry/obstacle
  blocking) with the hostile as the origin instead of the player — extend
  whatever discriminates player vs. enemy shells (owner tag or a second
  array) rather than duplicating the travel/expiry logic.
- Player hit: an enemy shell vs. player-tank circle test (the mirror image of
  bz1-5's shell-vs-obstacle test, now against the player's footprint instead
  of an obstacle) decrements a `lives` counter on `GameState` (introduce it
  here if it doesn't exist yet — bz1-10 owns the full game-over/attract
  transition once lives are exhausted, this story only needs the decrement
  and a hit event) and triggers a basic death presentation cue (a
  flash/crack signal the shell can render minimally now; full cracked-glass
  fidelity is bz1-12's job, not this story's).
- Enemy hit: a player shell vs. hostile-tank circle test (same mirrored
  primitive) kills the hostile, increments `GameState.score` (introduce it
  here if not already present) by the `SLOW_TANK` constant from bz1-2's
  `core/scoring.ts` — do not hardcode `1000` outside that module — and spawns
  deterministic wireframe explosion debris: a handful of particles whose
  scatter vector/speed derive from `state.rng` (never `Math.random()`),
  aged down by `ttl` each `stepGame` call, mirroring bz1-5's transient
  impact-puff pattern.
- Render the hostile through bz1-3's existing model→view→projection
  pipeline, using the slow-tank vertex/edge table already ported into
  `core/models.ts` by bz1-2 — same per-obstacle MVP composition bz1-3 built,
  now driven by a moving `(x, z, heading)` each frame instead of a static
  table entry.
- Keep the whole lifecycle a pure function of `(state, input, dt)` — spawn
  RNG draws, AI decisions, and debris scatter all come from `state.rng`;
  no `Date.now()`/`Math.random()` in `core/`, so a fixed seed reproduces an
  identical fight every run.

## Scope
- In scope: the hostile lifecycle state machine (spawn/active/destroyed/
  respawn) enforcing "always exactly one hostile"; spawn placement with the
  added obstacle-overlap check and its logged deviation; slow-tank
  approach/aim/fire AI gated on line-of-sight; enemy shells reusing bz1-5's
  machinery; player-hit → lives decrement + basic death cue; enemy-hit →
  1000 pts + deterministic debris; rendering the hostile via bz1-3's
  pipeline and bz1-2's model table; wiring the real hostile into bz1-6's
  radar stub.
- Out of scope: missiles and super tanks (bz1-8); the saucer bonus (bz1-9);
  difficulty/aggression ratchet by score differential and the full
  game-over/attract state machine once lives are exhausted (bz1-10);
  cracked-glass viewport fidelity and full HUD (bz1-12); enemy/explosion SFX
  (bz1-11).

## Acceptance Criteria
- Invariant test: across a long deterministic run (fixed seed, fixed `dt`
  sequence) that includes multiple kills, exactly one hostile exists in
  `GameState` at every tick — never zero, never more than one.
- Spawn-placement test: across many fixed seeds, the hostile's spawn point
  never overlaps any of the 21 obstacle footprints from `core/obstacles.ts`
  (property-style, not a single example); the session file logs the
  spawn-collision-check deviation per the six-field format in
  `.pennyfarthing/guides/deviation-format.md`.
- AI line-of-sight test: the hostile does not fire when an obstacle blocks
  its line to the player even when aimed and in range, and does fire once
  that line is clear — both cases unit-tested with fixed poses.
- Kill test: a player shell hitting the hostile awards exactly the
  `SLOW_TANK` constant from `core/scoring.ts` (1000, per bz1-2) to
  `GameState.score` and triggers a replacement hostile on a subsequent tick.
- Player-hit test: an enemy shell hitting the player decrements `lives` by
  exactly one and sets the death-presentation cue.
- Determinism test: identical seed + input/dt sequence reproduces identical
  spawn points, AI decisions (turn/fire timing), and debris scatter across
  repeated runs.
- Eyeballed on the dev server (`:5276`): a full fight — hostile spawns,
  approaches, aims, fires (blocked correctly by obstacles), player kills it
  for 1000 pts with visible debris, a replacement spawns, and a return shot
  from the hostile costs the player a life with a visible hit cue.
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test` is
  green, including the invariant/spawn-placement/LOS/determinism tests above.

---
_Generated by `pf context create story bz1-7` from the sprint YAML._
_Enriched by Architect (Maude) via story-context subagent._
