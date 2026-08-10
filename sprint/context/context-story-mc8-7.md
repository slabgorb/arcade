# mc8-7: Bonus-city cue timing

## Background

**Missile Command** plays a sound cue (`BN`/`SBONUS`) when bonus cities are earned. The current implementation fires this cue in the shell's `playEdgeCues` function whenever the running score crosses a bonus-city threshold *during play*. However, the authentic behavior — per `W3MAIN:4845` and the game cabinet — grants bonus cities *between waves* during the wave-end regeneration step, not when the player's score crosses a mid-play threshold.

The bug manifests as the cue sometimes sounding ~a wave early, when a single kill crosses the threshold during play, rather than at the faithful moment when cities are actually granted by the game state.

**Key locations:**
- Cue trigger (wrong): `plugins/missile-command/src/shell/audio-dispatch.ts:118` in `playEdgeCues` (fires on score threshold crossing)
- Cue trigger (right): `plugins/missile-command/src/core/game.ts:206-224` in the between-wave phase block (where cities are granted)
- Sound data: `BN` at `plugins/missile-command/src/core/sound-tables.ts:84`; mapped to `'bonus-city'` in `plugins/missile-command/src/shell/audio.ts:74`

## Derived Acceptance Criteria

1. **Cue is moved to the between-wave city grant:** The `BN` cue fires once per frame only when new cities are actually granted during the between-wave regeneration phase (`game.ts`, phase=`'between'`), not when the running score crosses a threshold during play.

2. **Cue derives from state delta, not thresholds:** The cue trigger compares `bonusCities` granted in the current frame's between-wave block against the previous frame's state, similar to how other between-wave state changes are detected. The logic does not fire during active play.

3. **No audio logic in core:** Audio dispatch (`audio-dispatch.ts`) receives all needed state from `prev` and `curr` GameState; the core simulation (`game.ts`) remains pure. No audio-layer concerns leak into the core boundary.

4. **Existing tests pass:** All missile-command vitest suites pass. The purity guard (`src/core/` contains no audio or shell concerns) still holds.

5. **Cue fires at correct volume and timing:** The cue is audible at normal in-game volume and timing, consistent with other between-wave state-change cues (e.g., next-wave fanfare). No distortion, clipping, or silent/missing sound.

## Technical Approach

1. **Identify city-grant delta in shell:** In `audio-dispatch.ts`, calculate the number of bonus cities granted in the current between-wave frame by comparing `bonusCities(curr.score, interval) - bonusCities(prev.score, interval)`.

2. **Move cue dispatch:** Remove the `bonusCitiesEarned++` trigger from the mid-play `playEdgeCues` block. Add a new cue-dispatch block (or extend the between-wave section) that fires `BN` once per new city granted, only during the between-wave phase.

3. **Verify state flow:** Confirm that both `prev` and `curr` GameState objects available to `audio-dispatch.ts` carry the necessary `score` and phase information to compute the delta and detect the between-wave context.

4. **Test on cabinet footage (if available):** Cross-check the new cue timing against historical cabinet recordings or MAME playback showing when `BN` sounds relative to wave transitions.

## Notes

- The story is marked refactor (type), not feature, because the intent is to move an existing cue to the correct moment — not add or remove sound, only repair timing.
- The `W3MAIN:4845` citation in the current code already points to the right place; moving the cue there fulfills the citation.
