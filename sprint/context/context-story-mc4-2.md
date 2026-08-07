# Context: Story mc4-2

**Epic:** mc4 — Missile Command — waves, scoring & bonus (the speed fix)
**Story:** mc4-2 — End-of-wave transition: city bonus + unused-missile bonus, regenerate cities, refill ammo, advance wave
**Points:** 5
**Priority:** p1
**Workflow:** tdd
**Repos:** arcade

## Background

The wave model and per-wave ICBM ramp were delivered in mc4-1 (VERIFIED done). This story implements the wave-end resolution: when the ICBM budget is exhausted and the screen is clear of enemies, tally the city bonus and unused-missile bonus, regenerate destroyed cities, refill ammo, and advance to the next wave.

**Key surfaces:**
- `plugins/missile-command/src/core/wave.ts` — Wave model (existing from mc4-1)
- `plugins/missile-command/src/core/state.ts` — Game state and reducers

**ROM citations:**
- `W3MAIN.MAC:4323` → `.SBTTL CITY BONUS` (routine `ENDWV3`)
- `W3MAIN.MAC:4765` → `.SBTTL REGENERATE CITIES` (routine `REGEN`)

**Citation discipline note:** The mc citations scanner is LINE-based and reads `//` line comments only (not `/** */` JSDoc). New `.BYTE`/constant tables must include a DERIVED note and a value-consistency block to pass the un-cited-literal gate.

## Acceptance Criteria

- a wave ends only when the budget is spent AND no enemy remains on screen; on end, phase transitions through the between-wave beat and then back to 'play' on the next wave (game-over still wins if all cities are dead).
- the end-of-wave bonus adds the cited per-surviving-city value and the cited per-unused-missile value to the score; a wave with no survivors and no unused missiles adds zero.
- destroyed cities regenerate up to the cited cap at wave end and each live base refills to full ammo; a base destroyed in play stays dead (structures resurrect only via the cited regeneration path, never spontaneously).
- all new bonus/regen constants carry byte-exact claims; citations.test.ts and purity.test.ts stay green; deterministic for a fixed seed.

## Technical Approach

**Wave-end detection:** Extend the wave.ts module to detect when the ICBM budget is exhausted (`wave.remaining === 0`) and coordinate with screen-clear detection in the game loop.

**Bonus calculation:** Implement reducers in state.ts to:
1. Sum the city bonus (per surviving city × city-bonus-points)
2. Sum the unused-missile bonus (per remaining ABM × missile-bonus-points)
3. Add both to the score in a single wave-end bonus step

**City regeneration:** Add a regen reducer that restores destroyed cities up to the cited cap (tracked separately from city count to avoid double-resurrection).

**Ammo refill:** Reset each live base's ammo to the starting value at wave-end.

**Wave advance:** Increment the wave number and re-seed the attack from the mc4-1 schedule; phase transitions back to 'play'.

**Claims structure:** Every new bonus/regen constant (e.g., `CITY_BONUS_PTS`, `MISSILE_BONUS_PTS`, `REGEN_CAP`) must be committed to `claims/missile-command.json` with byte-exact ROM values and citations to the CITY BONUS and REGENERATE CITIES routines. Use `//` comments in the new code to anchor values to the claims gate.

## Dependencies

- **Blocks:** mc4-3, mc4-4
- **Depends on:** mc4-1 (VERIFIED done)
