# Story sw2-3 Context

## Title
Surface-assault phase — tall towers with yellow-cube tops firing fireballs, not grounded trench turrets; gate round-1 firing

## Metadata
- **Story ID:** sw2-3
- **Type:** bug (playtest follow-up)
- **Points:** 5
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** star-wars
- **Epic:** sw2 — Star Wars playtest followup

## Problem
From the epic overview (the sprint YAML carries only the title for this story, so
the epic framing is authoritative): the pre-trench **surface-assault phase**
currently spawns **grounded trench turrets** instead of the authentic
**tall towers tipped with yellow cubes that fire fireballs**, and the **round-1
firing** behaviour is unclear (players can't tell when/whether towers fire on the
first pass). Three defects rolled into one story:

1. **Wrong obstacle:** grounded turrets, not tall yellow-cube-topped towers.
2. **Wrong projectile:** towers should fire **fireballs** — the large, shootable
   enemy projectile mechanic (see the lasers-vs-fireballs distinction below) —
   not grounded turret laser fire.
3. **Round-1 firing gate:** first-round firing is ambiguous and needs an explicit
   gate so the opening pass reads correctly.

## Current behaviour — routing pointers (SM discovery, TEA/Dev to confirm)
- **Surface phase driver:** `stepSurface` — `star-wars/src/core/sim.ts:305`.
  Turrets scroll toward the cockpit then spawn on a formation timer
  (`sim.ts:318`–`386`); turret fire runs on that formation timer
  (see the note at `sim.ts:186`). This is the "grounded turret" behaviour to
  replace with towers.
- **Tower model already exists:** `SURFACE_TOWER` — `star-wars/src/core/models.ts:295`
  (registered in the model set, `models.ts:561`). Verify whether it is wired into
  surface-phase spawning or only defined; the yellow-cube top is a model/render
  concern (`SURFACE_ORIENT` convention noted at `models.ts:474`).
- **Phase geometry:** `DEATH_STAR_SURFACE` — `models.ts:252`. Surface entry cue
  `lookAtTheSizeOfThatThing` (`events.ts:107`, `sim.ts:570`).
- **Fireball mechanic (already built in sw2-2):** enemy fireballs are the large,
  shootable enemy projectile. Reuse that mechanic for tower fire rather than
  inventing a new projectile type.

## INHERITED FINDINGS — read before writing tests
1. **Lasers vs fireballs (memory: star-wars-shots-lasers-vs-fireballs).** Player
   shots are cyan lasers (pew-pew); **fireballs are shootable ENEMY projectiles**,
   not player shots. "Towers fire fireballs" means the tower emits the large
   shootable enemy projectile — consistent with the epic tagging this a p1
   core-mechanic bug.
2. **Fireball WYSIWYG hit radius (sw2-2).** sw2-2 fixed fireball tunneling by
   enlarging the fireball hit radius to a WYSIWYG large target
   (`ENEMY_SHOT_HIT_RADIUS` 90→150, drawn at that radius) after sw2-1 raised
   `PROJECTILE_SPEED` to 5000. Tower-fired fireballs inherit that same collision
   surface — reuse it; do not hand-roll a smaller/undrawn hit test that re-opens
   tunneling.
3. **Round-1 firing gate.** The epic calls out "unclear round-1 firing." Decide
   and test the explicit contract: does the first tower pass fire, hold, or fire
   only after a grace/gate? TEA to pin this as a concrete, asserted AC.

## Scope
- **In scope:** replace grounded surface turrets with tall yellow-cube-topped
  towers; have towers fire fireballs (reusing the sw2-2 fireball mechanic); add an
  explicit, tested round-1 firing gate; keep the pure core / shell boundary (core
  emits events + owns sim state; render.ts owns the yellow-cube visual, audio.ts
  owns cues).
- **Out of scope:** trench-run behaviour, exhaust-port feedback (that's sw2-4),
  space-phase TIE hit registration, voice lines beyond any surface-entry cue
  already wired.

## Technical Approach
_Hints only — TEA defines the failing tests and ACs in RED, Dev implements in
GREEN. The Problem + routing pointers above scope the change; the fireball
mechanic and SURFACE_TOWER model already exist, so this is largely wiring +
gating, not net-new mechanics._

## Acceptance Criteria
_To be defined by TEA during the RED phase. Anchor them to the three defects in
Problem (tower geometry / yellow-cube top, fireball fire, round-1 firing gate)
and add a real-fired fireball collision test per inherited finding #2._

---
_Seeded by SM (The Organic Mechanic) from the sw2 epic overview + code discovery;
ACs deferred to TEA per TDD._
