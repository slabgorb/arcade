# Story ml7-8 Context

## Title
Enemy PRESENCE voices + secondary ROM-input threading — ml6-2 emits only kill/explosion (CHAN2) and march (CHAN1); the per-creature CHAN0/3/4/5/7/8/9 voices are not started, and the secondary EnemyView inputs (score1/dead/slow/mushTop/beetles…) are defaulted to 0. Grep TODO(ml7-2 fidelity) in core/enemies/. Reconcile the fliers sharing MOBJ slot 12 (documented deviation). Thread the BEETLA per-wave quota into beetle spawning.

## Metadata
- **Story ID:** ml7-8
- **Type:** story
- **Points:** 5
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Millipede — phase machine, runtime wiring, HUD, showcase (phase 6-7): where it becomes a cabinet, with the epilepsy accessibility gate baked in

## Problem

The ml6-2 audio/shell wiring is incomplete:
- PRESENCE voices (CHAN0/3/4/5/7/8/9): the per-creature audio cues are not started when a creature appears; only CHAN1 (march loop) and CHAN2 (explosions) are emitted.
- Secondary EnemyView inputs (score1/dead/slow/mushTop/beetles): these gates are hardcoded to 0, blocking creature-specific logic that depends on them (e.g., SLOW critter-freeze, mushroom-glut veto, spider 5K scoring).
- Fliers sharing MOBJ slot 12: the dragonfly occupies a single motion-object slot (BEEC+12, documented in dragonfly.ts:11) — reconcile any confusion with multi-creature sharing.
- BEETLA per-wave quota: beetle spawning must respect the wave-based allowed count (gated by the player's score, e.g., 0 @ start, 1 @ 5K, 2 @ 10K, etc.).

## Technical Approach

**Phase 1: Extend EnemyView to carry secondary inputs**
- Add fields to EnemyView (contract.ts): `score1`, `dead`, `slow`, `mushTop`, `beetles`.
- Thread these from the game state (likely already tracked in stepGame or the estate) into the view that's passed to every enemy step.
- Verify the threading is deterministic and preserves the seeded-RNG call order.

**Phase 2: Wire PRESENCE voices (one-shot per creature spawn/move)**
- Each creature's step function (spider.ts, bee.ts, etc.) will now emit a 'creature-presence' or per-creature event when the creature is live and moving (e.g., 'spider-presence', 'bee-presence').
- The shell audio-dispatch (audio-dispatch.ts → audio.ts) maps these events to startLoop() for the creature's voice slot (CHAN0-9) so the sound plays while the creature is on screen.
- Use stopLoop() when the creature dies or exits the screen (already emitted as 'enemy-killed').
- Verify no audio stack-up (the synth's startVoice/stopVoice pair handles re-starts).

**Phase 3: Verify motion-object slot 12 usage**
- Document in dragonfly.ts that BEEC+12 (DRAGONFLY_SLOT = 12) is a single-object slot; no other creature shares it.
- Check that other slot arrays (spiders, bees, beetles, mosquitoes, earwigs, inchworms) do not use slot 12 (they use the centipede pool and are managed separately).
- Add a comment or assertion if needed to prevent future collisions.

**Phase 4: Thread BEETLA quota into beetle spawning**
- The beetle.ts spawning gate (beetleSpawnTick + beetleAllowed) already takes the score and returns the allowed count.
- Verify that this quota is actually being enforced in the step loop (stepBeetles counts live beetles against allowed).
- If the quota is gated by score transitions (e.g., one beetle @ 5K, two @ 10K), trace the score transitions and ensure they fire the spawn events correctly.

## Scope
- In scope: threading secondary inputs through EnemyView, emitting PRESENCE voice events, verifying slot 12 documentation, verifying beetle quota logic.
- Out of scope: sprite/tile rendering, additional fidelity work (ml7-5/6/7/9), redesigning the audio engine itself.

## Acceptance Criteria

**AC1: PRESENCE voices emit when creatures are live**
- Listening to the game in attract/play mode, each creature type (spider, bee, beetle, dragonfly, mosquito, earwig, inchworm) produces an audible, distinct PRESENCE tone when on screen.
- The tone starts when the creature spawns (not at frame 1, but at the frame it becomes live).
- The tone stops when the creature dies or exits the field (no lingering after 'enemy-killed').
- Visual playtest: verify the audio is continuous during play, no stutters or overlaps.

**AC2: Secondary EnemyView inputs are threaded from core state**
- spider.ts reads score1 from the view and gates the 5K scoring variant (AC = "the exact SCORE1 one-cell-ahead direction").
- mosquito.ts reads slow from the view and gates the SLOW critter-freeze flap (DF-14/58).
- dragonfly.ts reads dead/beetles/mushTop from the view and gates the mushroom-glut spawn veto (DF-5/6/8).
- inchworm.ts reads dead from the view and gates the IW-8 distance-to-death check (AC = "thread the real DEAD byte through EnemyView").
- Verify the threading is deterministic: no frame-order changes, no RNG calls missing, the seeded-rng counter advances the same per-frame.

**AC3: Motion-object slot 12 is reconciled and documented**
- Add a comment in dragonfly.ts clarifying that BEEC+12 is DRAGONFLY_SLOT and is not shared by any other creature (singleton).
- Verify no other creature's slot array attempts to use index 12 or overlaps with DRAGONFLY_SLOT (grep the roster.ts and slot initializers).

**AC4: Beetle quota is threaded and enforced**
- The BEETLA per-wave quota (0 @ start, 1 @ 5K, 2 @ 10K, etc.) is threaded from core/beetle.ts (beetleAllowed).
- A test confirms that beetle spawning respects the quota: at a given score, only the allowed number of beetles are live at once.
- Edge case: score transitions (crossing 5K, 10K thresholds) correctly increment the allowed count; no beetles "leak" or spawn out of bounds.

---
_Generated by `pf context create story ml7-8` from the sprint YAML and enhanced by sm-setup with technical approach and ACs._

---
_Generated by `pf context create story ml7-8` from the sprint YAML._
