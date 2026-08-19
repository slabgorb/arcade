# Story df6-2 Context

> ⚠ **DO NOT REGENERATE THIS FILE.** The Technical Approach, Scope, Dependencies and
> Design Notes are Architect-enriched from the df6 epic plan. `pf context create`
> refills Technical Approach/Scope with placeholder text and would overwrite them.

## Title
The two STATEFUL cues the single-shot path can't express: the THRUST held-loop and the LANDER-SUCK repeat. Thrust is on/off held state (THFLG defender/PHR6.SRC:293; SNDSEQ turns it on=$16 defender/DEFA7.SRC:750 while PIA21 thrust bit is set :737-739 and off=$0F on release :742-743), routed through @shared/audio's loop seam (the sw6-2 loop-pending carve-out) — loop starts on thrust-held, stops on release. Lander-suck is the abduction-beam REPEAT cue (LSKSND FCB $C8,$0A,... REPCNT=$0A defender/DEFA7.SRC:684) sustained while a lander carries a humanoid up. Both need a held/released edge state the core lacks today (the jt5-3 flap analog). Consumes df6-1 seam + df3 input/scheduler + df4-3 abduction.

## Metadata
- **Story ID:** df6-2
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Defender sound (df6) — the absent-source audio epic (phase 5): the fleet event-channel seam, every gameplay cue ported from the ROM SOUND TABLE (priority/timer/sound#, cited), synthesised samples proven by a live 200, and the thrust held-loop; the two attract musics deferred to df7

## Problem
df6-1 shipped only single-shot cues; the two cues with STATE (a loop and a sustained repeat) land here. The thrust loop mirrors jt5-3's two-edge flap: the core sees the thrust input each frame but not the on->off / off->on EDGE, so this story adds the edge detector and two kinds (thrust-start, thrust-stop) routed through @shared/audio's loop start/stop (sw6-2 pending-loop carve-out so it survives the cold-load decode race). The lander-suck repeat is tied to the df4-3 abduction carry state. Purity green; determinism pinned; no samples (df6-3 bakes them). Same file surface as df6-1 (events.ts/sim.ts/audio-dispatch.ts/audio.ts) but a distinct STATE mechanic — a coherent second story, not a false split.

## Technical Approach
df6-1 shipped only **single-shot** cues. The two cues with STATE — a held LOOP and a
sustained REPEAT — land here, because the single-shot path cannot express either.

- **THRUST — a held loop (the jt5-3 flap analog).** The core sees the thrust input each
  frame but not the on→off / off→on **edge**, which is what the ROM keys the sound on
  (`SNDSEQ` reads the `PIA21` thrust bit `defender/DEFA7.SRC:737-739`: if held and `THFLG`
  is off it turns the thrust sound on = `$16 :750`; on release it clears `THFLG` and emits
  off = `$0F :742-743`; `THFLG` = "THRUST SOUND FLAG" `defender/PHR6.SRC:293`; `*B1 THRUST`
  bit `:138`). Add a **held/released edge detector** in the core and two kinds
  (`thrust-start`, `thrust-stop`) on the df6-1 event union. Route through `@shared/audio`'s
  **loop** seam — `loop-on` on the start edge, `loop-off` on the stop edge — relying on the
  **sw6-2 loop-pending carve-out** so the loop survives the cold-load decode race.
- **LANDER-SUCK — a sustained repeat.** `LSKSND FCB $C8,$0A,$01,$0E,0`
  (`defender/DEFA7.SRC:684`) — `REPCNT = $0A`, the abduction-beam repeat. Start it when a
  df4-3 lander begins **carrying a humanoid upward**, stop it when the carry ends (grabbed
  to the top, dropped on carrier death, or the lander killed). Tie the start/stop to the
  df4-3 abduction/carry state, not a timer.
- **Purity + determinism.** The edge/held state is pure data on the sim state — no DOM,
  clock or RNG enters the core; the df3 seeded-determinism replay must still reproduce
  bit-for-bit with both stateful cues live (Decision C).
- **Citation + no samples.** The `LSKSND` repeat constant and the thrust on/off values →
  `claims/*.json`, byte-verified under the df1-1 gate. Still **no `.wav`** — df6-3 bakes
  them; thrust/suck are wired-but-silent when this story closes.

## Scope
- **In scope:** the thrust held-loop (edge detector + `thrust-start`/`thrust-stop` kinds +
  `@shared/audio` loop start/stop), the lander-suck sustained repeat tied to df4-3 carry
  state, the new state on the sim state, `claims/*.json` for the new constants, purity +
  df3-determinism tests, state-transition mutation guards.
- **Out of scope:** the single-shot cues + the seam itself (df6-1, done); the baked samples
  + upload (df6-3); the playtest (df6-4); attract musics (df7). No render/colour change.

## Acceptance Criteria
- AC1: the THRUST cue is a held LOOP — a test pins loop-start on the thrust off->on edge and loop-stop on the on->off edge (the edge state the core adds here), cited to THFLG (defender/PHR6.SRC:293) and the SNDSEQ on=$16 (defender/DEFA7.SRC:750) / off=$0F (:743) transitions gated by the PIA21 thrust bit (:737-739); it is routed through @shared/audio's loop seam (the sw6-2 loop-pending carve-out), not re-tick per frame.
- AC2: the LANDER-SUCK cue is a sustained REPEAT (LSKSND, REPCNT=$0A, defender/DEFA7.SRC:684) started when a df4-3 lander begins carrying a humanoid upward and stopped when the carry ends (humanoid grabbed to top, dropped, or the lander dies); a test pins start/stop against the abduction state, and the repeat constant has a claims/*.json entry verified under the df1-1 gate.
- AC3: purity.test.ts stays green (the edge/held state is pure data on the sim state, no DOM/clock/RNG entered the core) and df3's seeded-determinism replay still reproduces bit-for-bit with both stateful cues live (Decision C).
- AC4: a mutation to the thrust edge logic or the suck start/stop reddens a state-transition assertion (not a boolean presence check); no un-cited src/core constant; still NO .wav committed (df6-3 bakes them) — the story states thrust/suck are wired but silent when it closes.

## Dependencies
- **df6-1** — the event union, the manifest, the dispatch, and the `@shared/audio` seam
  this story extends with two stateful kinds.
- **df3** — the input seam (thrust) + `sim.ts` state the edge detector reads/writes.
- **df4-3** — the abduction/carry state the lander-suck repeat is tied to.
- **`@shared/audio`** — the loop seam + the sw6-2 loop-pending carve-out.
- **Blocks:** `df6-3` (bakes the thrust/suck samples), `df6-4` (playtest confirms the loop
  starts/stops with the key).

## Design Notes
- **The jt5-3 precedent:** the flap was a two-edge cue the core saw only one edge of; the
  thrust loop is the same shape — add the missing edge, don't fake it with a per-frame tick.
- **sw6-2 carve-out is load-bearing** for the thrust loop: a loop requested before its
  buffer decodes is remembered and started on decode, so the thrust sound is not lost to the
  cold-load race.
- Decision C (determinism) still binds; `claims/*.json` for every constant; RASM radix
  (`$16`/`$0F`/`$0A` are hex) — the standing df* traps.

---
_Generated by `pf context create story df6-2` from the sprint YAML._
