# Context: bz4-2 — Seeded-stochastic volcano emitter

## Story Summary

**ID:** bz4-2  
**Type:** Feature  
**Points:** 3  
**Workflow:** tdd  
**Repo:** battlezone  

Thread a seeded, deterministic PRNG into the volcano emitter so rocks respawn independently and stochastically—each draws a random velocity and respawns on its own staggered timer—while keeping the sim replayable and core-pure.

## Acceptance Criteria

1. **Independent staggered respawn:** Volcano rocks respawn independently with ~1-in-8 per-rock timer (BZONE.MAC:1393-1395), NOT as a synchronized 5-rock volley.

2. **Random velocity via seeded PRNG:** Each rock's launch velocity is `YSPD=(PRAND AND 7)+5`, produced by a seeded deterministic PRNG that keeps the eruption replayable and core-pure.

## Background

### bz3-6 Deviation (Prior Art)

Story bz3-6 shipped a **fixed-velocity synchronized relaunch-on-retire loop** as a documented deviation. The justification was: "core purity forbade RNG at the time."

Current state: All rocks launch at the same velocity and volley together on a single ~1-in-8 timer when one rock retires. This is **incorrect** vs the ROM's per-rock independent timer and per-rock random velocity draw.

**Session reference:** `sprint/archive/bz3-6-session.md`

### bz3-5 Debris Engine (Reuse)

Story bz3-5 shipped the debris engine that powers the volcano emitter. The engine is already **validated and config-guarded**; this story reuses it—only the spawn logic (timing + velocity draw) changes.

**Session reference:** `sprint/archive/bz3-5-session.md`

Search `battlezone/src/core/` for the current `volcano`, `VOLCNO`, or emitter references.

## ROM Specifications

### Spawn Timer (Per-Rock)
- **Source:** BZONE.MAC:1393-1395
- **Behavior:** Each rock has its own ~1-in-8 respawn timer (staggered, independent)
- **NOT:** A synchronized volley triggered on retire

### Velocity Draw (Per-Rock)
- **Source:** BZONE.MAC:1405-1407
- **Behavior:** `YSPD = (PRAND AND 7) + 5` — random draw in the range [5, 12]
- **RNG source:** PRAND (hardware LFSR on the Atari 1980 arcade board)

## Technical Constraints

### Core Purity (src/core)

The volcano emitter + PRNG live in `battlezone/src/core/`. The sim must remain **deterministic and replayable**:

- **No Math.random()** — not seeded, breaks replay
- **No Date.now()** — not seeded, breaks replay
- **Seeded PRNG required** — the PRNG state must be part of the sim snapshot so replays see the exact same sequence

### Architecture Rule

`battlezone/CLAUDE.md` enforces:
- **src/core:** Pure deterministic simulation (emitter + PRNG live here)
- **src/shell:** Render, audio, input, storage (no stochasticity)

### Search Checklist

Check whether `battlezone/src/core/` already has:
- [ ] Seeded PRNG / PRAND / LFSR implementation (other stochastic behavior may already use one)
- [ ] If not, check whether `@arcade/shared` exposes `/rng` (search `package.json` and imports)

If neither exists, you will need to port the PRAND LFSR from the ROM or implement a seeded Xorshift/LCG.

## Phase Gates

**Phase:** red (TEA writes failing tests)  
**Entry Gate:** tea-context (Story context validated)  
**Gate Condition:** All acceptance criteria have test coverage

## Implementation Notes

- The volcano emitter currently launches rocks in lockstep; you need to decouple the timer into per-rock state
- The velocity is currently fixed; you need to draw it from the seeded PRNG
- The debris engine (bz3-5) already handles individual rock physics; reuse it as-is
- Document the PRNG seeding strategy in a comment (e.g., "initialized from ROM state at game start")

## References

- **ROM Source:** BZONE.MAC lines 1393-1407
- **bz3-5 session:** `sprint/archive/bz3-5-session.md`
- **bz3-6 session:** `sprint/archive/bz3-6-session.md` (deviation reference)
- **Architecture:** `battlezone/CLAUDE.md`
