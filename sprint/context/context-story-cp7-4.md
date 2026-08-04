# Story cp7-4: The flea's 0.6s sample wraps inside a 2s drop — the sweep is shorter than the descent

**Status:** in_progress  
**Story Type:** bug  
**Points:** 2  
**Priority:** p2  
**Workflow:** tdd  

## Summary

The flea's descent lasts ~2.03 seconds, but the baked sound sample is only 0.6 seconds. Under source.loop=true, the sample restarts 2-3 times during a single descent, creating an audible repeat that should be one continuous sound.

The core dispatch is correct (edge-triggered loopEdges), but the asset is too short for the event duration it scores.

## Chosen-Path Decision Required

This story must choose between two approaches and document the choice:

**Path A (ASSET ONLY):** Lengthen the sample to ~2.03 seconds by extending the frequency sweep across the full ANTV descent range (0xF8 to 0x04). Trade-off: Still wrong for the post-60K fast descent (1.37s), which would get cut off instead of wrapping.

**Path B (FAITHFUL):** Add playbackRate control to src/shared/audio.ts that drives the playback speed per-frame from flea.v during descent. More accurate but requires wiring changes: flea position must reach the shell either as new event payload (contract change) or via shell read of sim state.

The choice and reasoning must be documented in the implementation's prose.

## Key Test & Asset Locations

- **Bake script:** tools/pokey-bake/bake-sfx.mjs:216-231 (current 0.6s bake)
- **Bake tests:** tools/pokey-bake/bake-sfx.test.mjs:390-414 (CKFE, pitch), :628-664 (duration check), :536-566 (no current guard on flea length)
- **Sound manifest:** tests/audit/sound-dossier.test.ts:488-513 (filename: flea_move.wav, channel: voice-flea)
- **Audio dispatch:** src/shell/audio-dispatch.ts:38-42, :105-115 (edge→startLoop/stopLoop routing)
- **Shared audio:** src/shared/audio.ts:235-292 (loop=true wiring)

## Acceptance Criteria Summary

1. One unbroken flea descent produces one continuous sound with no audible restart
2. The sample's length is derived from descent frame count (0xF8→4 at dv/frame)
3. A guard pins the flea sample duration (currently missing in bake-sfx.test.mjs)
4. CKFE and pitch tests stay green (longer sweep preserves both)
5. Filename (flea_move.wav) and channel (voice-flea) unchanged
6. Core edge contract untouched; no per-frame retrigger
7. just deploy-assets run and flea heard in live play (CI never touches asset bucket)
8. docs/rom-study/sound.fixture.json cp62Decision updated to record which path taken

## Key ROM Facts

- **ROM mechanism:** Continuous frequency recompute (CENTI4.MAC:2409-2415) every sound pass
- **No sample:** ROM has no FREQ/CONT table or CHANn countdown for the flea
- **Position-driven:** frequency computed from ANTV position, making it inherently continuous
- **Not repeating:** Comments on march ("MUST BE REPEATED") and spider ("WELL REPEAT") but none on flea

## Pre-Filing Notes from Dossier

- docs/rom-study/sound.md:89-150, :339-341 already recorded fleaLoop as "continuous by construction"
- docs/rom-study/sound.md:385-386: "fleaLoop is a sweep, not a tone. A single fixed sample is a stand-in and must say so"
- sound.fixture.json cues.fleaLoop already lists the cp62Decision with both paths named
