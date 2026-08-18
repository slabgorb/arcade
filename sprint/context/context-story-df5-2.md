# Story df5-2 Context

> ⚠ **DO NOT REGENERATE THIS FILE.** The Technical Approach, Scope, Dependencies and
> Design Notes are Architect-enriched from the df5 design spec. `pf context create`
> refills Technical Approach/Scope with placeholder text and would overwrite them.

## Title
Wave director + escalation: plugins/defender/src/core/waves.ts — port the WVTAB wave-data table (*WAVE DATA defender/BLK71.SRC:673; WVTAB :676; body :676-689 with WAVE TIME :687 and WAVE SIZE :689; pointer FDB WVTAB :89) and the 'new guys every Nth wave' escalation (GTWV00 defender/DEFA7.SRC:1859); wave-clear -> advance to the next wave, attackers spawned via the df3 scheduler (NEWP,STYPE). The game-structure spine that makes df4's enemies attack in escalating waves. Consumes df3 scheduler + the df4 enemy reducers.

## Metadata
- **Story ID:** df5-2
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Defender — game structure & the scanner (phase 4c): waves, scoring + extra men, the humanoid rescue loop and the planet-explodes-to-mutant-space panic, the two emergency powers (smart-bomb + hyperspace, citing ADR-0005), and the pure end-of-game core

## Problem
The wave director is a df3 scheduler process; it does not invent its own tick. It reads the WVTAB size/time per wave and escalates attacker count per the ROM (GTWV00 "NEW GUYS EVERY NTH WAVE"). Wave-clear is detected from the enemy population, not a timer. Colour by df2 palette index only; every constant gated.

## Technical Approach
Port `WVTAB` (`BLK71.SRC:676`, banner `*WAVE DATA :673`) as a **pure wave director** in
`plugins/defender/src/core/waves.ts`:

- **The wave table.** `WVTAB` is attackers/size/time per wave (table body `:676-689` —
  `WAVE TIME :687`, `WAVE SIZE :689`; the pointer `FDB WVTAB` is `BLK71.SRC:89`). Transcribe
  as cited constants; each gated.
- **Escalation.** Port "new guys every Nth wave" (`GTWV00, DEFA7.SRC:1859`) — attacker count
  climbs at the ROM cadence, by the ROM value, not an invented ramp.
- **Spawn via the `df3` scheduler.** The director spawns attackers as scheduler processes
  (`NEWP,STYPE`) using the shipped `df4` enemy reducers; it owns no `rAF`/tick.
- **Wave-clear from population.** Advance when the enemy population reaches empty — but guard
  the pre-spawn/initial empty state (an empty enemy list reads as "cleared" via
  `[].every()===true`, so wave 1 must not insta-clear before it populates — the centipede
  `segs:[]` lesson). Not a wall-clock timer.
- **Citation gate + non-vacuous tests.** `citations.test.ts` covers every `WVTAB` size/time
  and the escalation cadence; a mutation to a value reddens a **value** assertion, not a
  mere presence/coverage check.

Consumes `df3` scheduler + the `df4` enemy reducers. No `@shared` extraction.

## Scope
- **In scope:** `waves.ts` as a pure wave director; the `WVTAB` table (size/time per wave) +
  the `GTWV00` escalation, cited; wave-clear on enemy-population-empty (guarded against the
  pre-spawn empty state); spawn via the `df3` scheduler; `claims/*.json` + non-vacuous value
  tests; `purity.test.ts` green.
- **Out of scope:** the enemy reducers themselves (df4, done); scoring for a cleared wave
  (df5-3); the humanoid panic (df5-4); attract/phase machine (df7). The director schedules —
  it does not score or render.

## Acceptance Criteria
- AC1: plugins/defender/src/core/waves.ts exists (PURE) modelling the WVTAB wave table (defender/BLK71.SRC:676-689 — attackers, WAVE SIZE :689, WAVE TIME :687); each wave constant gated by a claims/*.json entry verified byte-for-byte under the df1-1 gate.
- AC2: the "new guys every Nth wave" escalation (GTWV00, defender/DEFA7.SRC:1859) is ported and cited — a test pins that attacker count increases at the ROM-specified wave cadence, by the ROM value, not an invented ramp.
- AC3: wave-clear -> advance is driven by the ENEMY POPULATION reaching empty (not a wall-clock timer); attackers are spawned via the df3 scheduler (NEWP,STYPE), the wave director owning no rAF/tick of its own.
- AC4: citations.test.ts covers every wave constant; a mutation to a WVTAB size/time or the escalation cadence reddens a value assertion (not merely a coverage/presence check — the vacuous-guard trap).

## Dependencies
- **df1** — citation gate (df1-1) + purity test.
- **df3** — scheduler (attackers are processes).
- **df4** — the enemy reducers the director spawns.
- **Blocks:** `df5-3` (per-wave scoring), `df5-4` (the panic reads humanoid/wave state),
  `df5-7` (the playtest shows escalation).

## Design Notes
- **Empty-list wave-clear trap:** an empty enemy list reads as "cleared" via
  `[].every()===true` — guard the pre-spawn/initial empty state so wave 1 does not
  insta-clear (the centipede `segs:[]` lesson).
- Everything is a `df3` scheduler process; colour by `df2` palette index only; line numbers
  from tool output only; RASM radix (`$hex` vs bare decimal).
