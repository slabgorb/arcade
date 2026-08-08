# Story mc4-6: End-of-wave bonus scales by the wave multiplier (SMULTI): ABMADD + city bonus

## Summary
Scale the end-of-wave bonus (both city bonus and unused-missile bonus) by the wave multiplier SMULTI, so that later waves award higher bonuses matching the same multiplier applied to scoreKills in mc4-3.

## Background

**Dependency:** mc4-3 (scoreMultiplier) is DONE.

**Current Implementation:**
- `scoreMultiplier(wave)` exists at `plugins/missile-command/src/core/score.ts:40` and returns the per-wave multiplier capped at MAXMUL.
- `waveEndBonus(survivingCities, unusedMissiles)` exists at `plugins/missile-command/src/core/wave.ts:123` and is wired in `game.ts:157`.
- Currently, `waveEndBonus` computes the bonus at the BASE (x1) multiplier only.

**Task:**
Generalise `waveEndBonus` to scale both the city bonus and the unused-missile bonus by `scoreMultiplier(wave)`, so wave 1 matches the current base values and later waves multiply by the same SMULTI as scoreKills.

## Acceptance Criteria

1. waveEndBonus scales the city bonus and the unused-missile bonus by scoreMultiplier(wave): at wave 1 the values match mc4-2 (base), and a later wave multiplies both by the same SMULTI as scoreKills.

2. the generalisation cites the ROM (ABMADD W3MAIN.MAC:5451 per SMULTI; ICMUL2 city loop); citations.test.ts and purity.test.ts stay green.

## ROM Citations

- **ENDWV2 ABMADD:** adds LDA I,5 once per SMULTI at W3MAIN.MAC:5443/5451
- **ENDWV4 city bonus:** loops the per-ICBM value per SMULTI (ICMUL2)

## Technical Notes

- The end-of-wave bonus ramp was surfaced during mc4-3 review (TEA + Reviewer).
- mc4-2 shipped waveEndBonus at the BASE (x1) multiplier and deferred "the ramp".
- mc4-3 was rescoped to scoreKills only, so the end-of-wave bonus ramp is currently owned by this story.
- May be folded into mc4-4 wiring at the owners discretion.

## References

- Epic: mc4 (Missile Command — waves, scoring & bonus)
- Related: mc4-2 (end-of-wave transition), mc4-3 (per-wave score multiplier), mc4-4 (compose waves into stepGame)
