# Story mc8-4 Context

> ⚠ **CORRECTION (TEA/RED, user ruling Option A, 2026-08-08).** The original SM-derived ACs
> had two errors, now fixed below (see the session's Delivery Findings + Design Deviations):
> (1) `low-ammo`/`LO` is NOT already wired — it is a distinct, unwired cue and is IN scope;
> (2) the drone-sweep mechanism was fabricated — it is the ROM `AUDF1+6` TOP→BOTTOM sweep, and
> its LIVE TRIGGER is **deferred to mc8-5** (blocked on mc5's cruise/Sputnik enemies). The SLAM
> blip is **out of scope → mc8-6**. The authoritative scope is the spike doc §8 + §5 event map:
> `docs/superpowers/specs/2026-08-07-missile-command-mc8-audio-driver-spike.md`.

## Title
Parametric drones + full event wiring (bonusTick, whoop, end-game, bonus-city, low-ammo, cruise/Sputnik drone sweep)

## Metadata
- **Story ID:** mc8-4
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Missile Command — authentic audio (W3SOUN + POKEY)

## Background

**The §5 event→sound map (spike doc, verified at W3MAIN call sites) — what is WIRED vs NEW:**

| Cue | Flag | Event/source | Status |
|-----|------|--------------|--------|
| `LA` launch | `SABLAU` | `launched` | WIRED (mc8-2) |
| `EX` explosion | `SEXPLO`/`SOHNO` | `detonated`, `structureDestroyed` | WIRED (mc8-2) |
| `NS` can't-fire | `SNSHOT` | `ammoEmpty` | WIRED (mc8-2) |
| `TK` bonus-tick | `SUNABM` | `bonusTick` | map WIRED (mc8-2); emitter cadence = separate follow-up |
| `WP` whoop | `SNEWAV` | new wave (`state.wave`++) | **NEW — this story** |
| `XX` "THE END" | `SENDGA` | game over (phase→'over') | **NEW — this story** |
| `BN` bonus-city | `SBONUS` | bonus city earned (`bonusCitiesEarned`++) | **NEW — this story** |
| `LO` low-on-ABMs | `SLOABM` | low-base launch (`BASLOW`, W3MAIN:1389) | **NEW — this story** |
| drone | `CMSNON`/`STSNON` via `CRMONS` | cruise/Sputnik on screen | **VOICE this story; live TRIGGER → mc8-5 (mc5-blocked)** |
| SLAM blip | `SLAMSN`→`SLMSND` | tilt switch | **OUT — mc8-6 (no tilt input)** |

**BOUNDARY (core/shell purity contract — the single most important rule):**
- New cues surface as PURE DATA on GameState — an edge-detectable state field (`wave`, `phase`,
  `bonusCitiesEarned`) or new pure data on an existing SoundEvent — NEVER a callback or clock read.
  `Phase = 'play' | 'between' | 'over'` [core/state.ts:13]; `state.wave` is 1-based [game.ts:77].
- **CRITICAL:** `game.ts:129` returns `soundEvents: []` whenever `phase === 'over'` → the end-game cue
  CANNOT ride the SoundEvent stream on the over-frame; it must edge-detect the phase transition
  (same shape as the existing drone-stop in `updateSustainedSounds`).
- `LaunchedEvent` is bare `{type:'launched'}` today; `LO` needs a small pure-data addition (e.g. a
  `baseLow` boolean on the launch event, computed from `bases[].ammo`), not a new callback.
- `purity.test.ts` (source-text scanner) must stay green — no `window`/`document`/`Audio*` in `core/`.

## Problem

The §5 map is only half-wired: `WP` (whoop/new-wave), `XX` (end-game), `BN` (bonus-city) and `LO`
(low-on-ABMs launch) have no shell wiring, and the cruise/Sputnik drone has only a stop-lifecycle
(mc8-2) — no descending pitch sweep. This story wires the four missing one-shot cues and builds the
parametric drone voice.

## Technical Approach

1. **Whoop (`WP`, `SNEWAV`):** edge-detect `state.wave` increment (or the `'between'`→`'play'` resume)
   frame-over-frame in the shell; play `whoop` once per wave advance.
2. **End-game (`XX`, `SENDGA`):** edge-detect `phase`→`'over'` in `updateSustainedSounds` (or a peer);
   play `end-game`. NOT via the SoundEvent stream (empty on the over-frame). Fires exactly once.
3. **Bonus-city (`BN`, `SBONUS`):** edge-detect `bonusCitiesEarned(score, interval)` increment; play
   `bonus-city`. Threshold logic already in core (mc4-5) — the shell reads it, does not recompute rules.
4. **Low-on-ABMs (`LO`, `SLOABM`):** surface a pure-data `baseLow` signal on the launch (computed from
   `bases[].ammo` at fire time); the shell plays `low-launch` instead of / alongside `launch` when low.
5. **Parametric drone VOICE:** the running `drone` loop sweeps `AUDF1+6` from per-type TOP (`70,30,30`)
   to BOTTOM (`30,0,0`), decrementing by 2 each frame and wrapping (W3SOUN:329-355). Testable at the
   engine/register seam. The existing `stopLoop('drone')` over-edge silence is retained. **Its live
   trigger (start on cruise/Sputnik presence) is DEFERRED to mc8-5.**
6. **No-incoming-ICBM regression guard:** assert NO sound is emitted for descending ICBMs (doc §5: the
   ROM has no incoming-missile cue; inventing one is a fidelity regression).
7. **Stale-comment fix:** correct the "mc8-3" forward-references (the parametric sweep is THIS story) in
   `audio.ts:45`, `audio-dispatch.ts`, and `audio-dispatch.test.ts:32,166` → mc8-4.

## Scope
- **In scope:** `WP` whoop, `XX` end-game, `BN` bonus-city, `LO` low-on-ABMs cues; the parametric drone
  pitch sweep (voice); the no-incoming-ICBM guard; the stale-comment fix.
- **Out of scope (filed):** the drone's live trigger → **mc8-5** (blocked on mc5 cruise/Sputnik enemies);
  the SLAM/tilt blip → **mc8-6** (no tilt input); the bonus-tick emitter cadence (already a follow-up).

## Acceptance Criteria
1. **Whoop on wave advance:** when `state.wave` increments (or `'between'`→`'play'`), the shell plays
   `whoop` exactly once per advance; the trigger is edge-detected from pure state, not a callback. A test
   proves no whoop on a same-wave frame and exactly one on the advance frame.
2. **End-game on game-over edge:** when `phase` transitions to `'over'`, the shell plays `end-game`
   exactly once; a test proves (a) `soundEvents` is empty on the over-frame, and (b) the cue still fires,
   i.e. it is edge-detected from the phase transition, not the stream; (c) a second `'over'` frame does
   NOT replay it.
3. **Bonus-city on award:** when `bonusCitiesEarned` increments (a bonus city is earned), the shell plays
   `bonus-city`; a test confirms it fires at the mc4-5 threshold and not below it, driven off pure state.
4. **Low-on-ABMs launch cue:** a launch from a low base surfaces a pure-data `baseLow` signal, and the
   shell voices the `LO` low cue for it while a normal-ammo launch does not; a test drives a low-base
   launch vs a full-base launch and asserts the two differ.
5. **Parametric drone sweep:** while the `drone` loop runs, its voice-4 frequency (`AUDF1+6`) descends by
   2 per frame between the per-type TOP/BOTTOM bounds and wraps (W3SOUN:354); an engine-seam test asserts
   the register ramp. The over-edge `stopLoop('drone')` silence is preserved (existing test stays green).
   The live trigger is NOT wired here (mc8-5).
6. **No incoming-ICBM sound:** a regression test drives descending ICBMs and asserts NO cue is emitted for
   them (doc §5 fidelity finding).
7. **Purity preserved + stale comments fixed:** `purity.test.ts` stays green (any new core data is pure);
   the "mc8-3" forward-references are corrected to mc8-4 (a citation/comment test or grep-guard verifies).

---
_Derived by SM `pf context create`; corrected by TEA at RED per user ruling Option A (2026-08-08)._
