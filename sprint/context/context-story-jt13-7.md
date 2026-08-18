# Context: jt13-7 — Lava-troll grab is silent — add the SNTROL 'captured' cue

**Story ID:** jt13-7  
**Epic:** jt13 (Joust gameplay & entry-screen bug fixes)  
**Type:** bug  
**Points:** 3  
**Priority:** p2  
**Workflow:** tdd  
**Repository:** arcade

## Background

Being grabbed by the lava troll plays no sound. The ROM source (JOUSTRV4.SRC:1646-1647 LT1GRP routine) loads SNTROL ('MAKE THE SOUND OF THE LAVA TROLL / GRIPPING THE PLAYER', defined at :8097 as 'CAPTURED BY LAVA TROLL SOUND').

Story jt9-11 (shipped in sprint-2632-completed) wired `troll.beginGrip()` into production (called at `sim.ts:1143` as `troll.grip = beginGrip(lavgra)`, and also from `plugins/joust/src/core/difficulty.ts:392` in the demo step-trolls path). However, **no `'troll-grab'` event kind was added to EVENT_KINDS** (core/events.ts), and therefore **no cue was mapped to audio-manifest/audio-dispatch**, so the grab is currently silent.

**GUARD-TEST WEB:** The `'troll-grab'` event kind is presently DEFERRED and pinned by THREE guard tests that WILL go RED when wired — this RED is EXPECTED, not a regression. The guards enforce a deferred list and attribute ownership to stale story IDs (uf1-10/uf1-11, which do not exist in the sprint):
- `plugins/joust/tests/audio-events.test.ts` (~line 263): `const deferred = ['troll-grab']` asserts 'troll-grab' is NOT in EVENT_KINDS
- `plugins/joust/tests/audio-flap.test.ts` (~line 1302): asserts the deferred array `.toContain('troll-grab')`
- `plugins/joust/tests/audio-thud.test.ts` (~line 1463): asserts the deferred array `.toContain('troll-grab')`

The deferral's stated premise ("no reachable moment in the sim today" / "zero production callers") is **now FALSE**. Dev MUST update these three guards so 'troll-grab' leaves the deferred set — reverting the wiring to keep them green would silently fail the AC (mg1-9 trap). The stale ownership attributions should also be corrected to jt13-7.

**SCOPE BOUNDARIES:** The PLAYER/ENEMY-IN-LAVA sounds SNPLAV/SNELAV (JOUSTRV4.SRC:8123/:8105, played by ADGFLR death routine) were DEFERRED from jt13-5 (which shipped lava death / removal) and are being wired separately: they are filed as jt13-10 (already DONE, shipped) and jt13-11 (stacked follow-up). Do NOT touch lava-death cues here.

## Acceptance Criteria

**AC1:** The lava-troll grab emits a `'troll-grab'` event kind at the `beginGrip()` moment.  
**Source:** ROM LT1GRP loads SNTROL, JOUSTRV4.SRC:1646-1647. Lava troll grip is a reachable production path (jt9-11 shipped `beginGrip()` at sim.ts:1143).

**AC2:** `'troll-grab'` is added to EVENT_KINDS (core/events.ts), mapped to a SNTROL cue in audio-dispatch + audio-manifest, and the sound actually plays.  
**Verification:** Event is emitted on beginGrip; cue loads and plays without errors; no console warnings.

**AC3:** The stale comment at events.ts:44-52 (claiming troll.beginGrip has "zero production callers") is corrected to reflect the production caller at sim.ts:1143 (and demo caller at difficulty.ts:392).  
**Source:** JOUSTRV4.SRC LT1GRP / demon step-trolls; previously identified by jt9-11 / jt13-5.

**AC4:** The three deferred-guard tests (audio-events.test.ts, audio-flap.test.ts, audio-thud.test.ts) are updated so 'troll-grab' is NO LONGER treated as deferred. Ownership attributions (uf1-10/uf1-11) are corrected to jt13-7.  
**Verification:** Full-cabinet GREEN required:
- `npx vitest run --project joust` (Joust test suite)
- `npm run test:orchestrator` (Cabinet wiring invariants)
- `npm run lint` (Type checking)

## Test Plan

1. **Unit test:** Verify that `beginGrip()` emits a `'troll-grab'` event with the expected kind and timestamp.
2. **Integration test:** Verify the troll-grab cue loads and is mapped correctly in audio-dispatch.
3. **Audio test:** Verify the SNTROL cue plays when the troll grips a player in a live game session.
4. **Guard tests:** Confirm all three deferred-list guards now pass with 'troll-grab' removed from the deferred array.
5. **Cabinet green:** Run full test suite (vitest + orchestrator + lint).

## Out of Scope

- SNPLAV / SNELAV lava-death cues (jt13-10, already shipped; jt13-11 for grip-drown cinematic)
- Lava-sink cinematic or break-free window (jt13-10/jt13-11)
- Any ROM fidelity beyond the SNTROL cue itself
