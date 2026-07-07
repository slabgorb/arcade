# Story sw2-4 Context

## Title
Exhaust-port outcome feedback — Death Star explosion on hit, clear miss indication

## Metadata
- **Story ID:** sw2-4
- **Type:** bug / feature (playtest follow-up)
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** star-wars
- **Epic:** sw2 — Star Wars playtest followup

## Problem
From the live playtest: firing the torpedo into the exhaust port produces **no
outcome feedback**. On a hit the Death Star does not visibly explode — the run
just silently loops to the next wave's space phase — and on a miss there is no
clear "you missed" indication. The climactic beat of the game currently has no
payoff.

## Current behaviour (as of sw2-2 merge)
- **Hit** (`star-wars/src/core/sim.ts:495-514`, `stepTrench`): a bolt within
  `PORT_HIT_RADIUS` of the port awards `TRENCH_BONUS` (+ `FORCE_BONUS` on a clean
  run) and emits `force-bonus` + `level-clear { next: 'space' }`, then `clearRun`
  re-opens the space phase. **There is no dedicated "Death Star destroyed /
  explosion" event or cue** — the destruction is invisible; the player is just
  back in space.
- **Miss** (`sim.ts:516-529`): the only miss path is the port reaching the
  cockpit un-destroyed → `terrain-crash` (costs a shield) → the port respawns for
  another pass. There is no distinct "the shot missed the port" indication; a
  miss reads as a generic crash, or as nothing if the geometry lets it slip by.
- **State:** `exhaustPort: { pos: Vec3 } | null` (`state.ts:340`); the hit sphere
  is `PORT_HIT_RADIUS = 120` (`state.ts:271`); the hit test is a per-frame
  point-sphere `collides(port, b.pos, PORT_HIT_RADIUS)` (`sim.ts:495`).

## Technical Approach (hints — TEA/Dev to refine into ACs)
- Add a distinct **Death-Star-destroyed / explosion** outcome: a new positioned
  GameEvent variant in `star-wars/src/core/events.ts` (mirroring the existing
  `enemy-death` / `fireball-destroyed` / `trench-obstacle-destroyed` positioned
  cues), emitted from the port-hit branch in `sim.ts` **before** `clearRun`, so
  the shell can stage an explosion (render.ts) and SFX (audio.ts) before the warp
  to space. Keep the pure core boundary: the core emits the *event*; the shell
  owns the visual/audio.
- Add a **clear miss indication**: decide what "miss" means (port passes the
  firing window un-hit, and/or reaches the cockpit) and emit a distinct cue so the
  shell can show it. Distinguish it from the generic `terrain-crash`.

## INHERITED FINDINGS — directed at this story (READ FIRST)
The sw2-1 → sw2-2 chain flagged the **exhaust port** as the next place a
real-speed collision gap bites, because sw2-4 is the story that "touches the port
mechanic." Carry these in:

1. **Tunneling exposure on the port hit test (blocking-to-consider).** After
   sw2-1 raised `PROJECTILE_SPEED` to 5000 (~83 units/frame at 60fps), the port's
   per-frame point-sphere test (`PORT_HIT_RADIUS = 120`, `sim.ts:495`) has **no
   swept/continuous fallback**. A dead-centre aimed torpedo leaves only ~2–3
   frames inside the 120u sphere; a grazing shot can skip it between frames. The
   port is the single most important target in the game — a torpedo that visibly
   flies into it but does not register is the worst possible feel.
2. **Add a REAL-FIRED-BOLT test.** The existing port tests hand-place
   unit-velocity bolts on a tiny tick; none fire at the real `PROJECTILE_SPEED`
   and follow at 60fps. Add a test that fires a real torpedo straight at the port
   and asserts it detonates (and a real-fired **miss** test for a torpedo aimed
   wide, asserting it does NOT detonate — the negative case sw2-2's review found
   missing for fireballs).
3. **Precedent lever (sw2-2).** sw2-2 solved the identical fireball tunneling by
   **enlarging the hit radius to a WYSIWYG large target** (`ENEMY_SHOT_HIT_RADIUS`
   90→150, drawn at that same radius) rather than adding swept collision. For the
   port, first check WYSIWYG: is `PORT_HIT_RADIUS = 120` consistent with the
   rendered port size? If the port renders larger than 120u, widening the radius
   to match is the simpler faithful fix. Otherwise **consider a swept/segment
   collision or a per-target reach cap** — still the open general option from
   sw2-1, and this is the natural story to land it in.
4. **Related open gap (not this story's core, note only):** trench obstacles
   (`trench-obstacles.ts`, radius 90) share the same per-frame point-sphere
   exposure; out of scope here unless trivially co-fixed.

Full provenance: `sprint/archive/sw2-2-session.md` (TEA/Dev/Reviewer Delivery
Findings) and `sprint/archive/sw2-1-session.md` (original Reviewer finding).

## Scope
- **In scope:** the hit/miss outcome feedback (explosion event + cue, miss
  indication) described above; a real-fired-bolt hit test and, per finding #2, a
  real-fired-bolt miss test; addressing the port tunneling via a WYSIWYG radius
  and/or swept collision per findings #1–#3.
- **Out of scope:** the general trench-obstacle swept-collision fix (#4);
  unrelated trench/port geometry changes; the space-phase mechanics.

## Key Files
- `star-wars/src/core/sim.ts` — `stepTrench` port hit/miss/crash (~481-532); the
  hit test at :495.
- `star-wars/src/core/state.ts` — `PORT_HIT_RADIUS = 120` (:271), `exhaustPort`
  (:340).
- `star-wars/src/core/events.ts` — add the Death-Star-destroyed / port-miss
  positioned event variants.
- `star-wars/src/shell/render.ts` + `star-wars/src/shell/audio.ts` — explosion
  visual + miss indicator (shell owns the presentation).

## Acceptance Criteria
_To be finalised by TEA during the RED phase. Draft intent: (1) a hit emits a
distinct Death-Star-destroyed cue and the shell explodes it before the warp;
(2) a miss produces a clear, distinct indication; (3) a real-fired torpedo at
PROJECTILE_SPEED reliably detonates the port at 60fps (no tunneling), and a
real-fired wide shot reliably does not; (4) existing trench/port tests stay green._

---
_Curated by SM after sw2-2 finish (2026-07-07) to carry forward the sw2-1/sw2-2
exhaust-port findings. NOTE: if this story is later set up via `sm-setup`, that
step may regenerate this file from the sprint YAML — diff before staging and
restore this curated content if so (see the "sm-setup clobbers curated context"
hazard)._
