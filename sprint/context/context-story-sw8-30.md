# Story sw8-30 Context

## Title
Mid-game plays far softer than the cabinet — port the GM.DIF difficulty accumulator (WV.HRD index) and the ADCGAS Death-Star-kill shield refill

## Metadata
- **Story ID:** sw8-30
- **Type:** bug
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Cabinet feel: the flight and combat loop — render/experiential fidelity vs the cabinet longplay

## Problem
Found by the 2026-08-05 MAME cross-check (starwars.cpp / starwars_m.cpp / starwars.h vs our core), then traced into the 1983 source. Three related divergences, one cite trail, one landing zone.

1) THE RAMP (major). Our waveParams indexes the TGPROB fire-aggression table with min(wave-1, 15) and declares "no DIP switches -> DIP = 0" (gameRules.ts:290-302). The ROM index is WV.HRD = min(min(GM.WAV,31) + GM.DIF, 15), computed identically at all three phase entries (WSMAIN.MAC:1353-1364 space, 1603-1615 ground, 1702-1713 trench) — and GM.DIF is NOT a static DIP value. It initializes to the difficulty-DIP ordinal 0-3 (WSMAIN.MAC:1300-1304, "STARTS AT 0(EASY)") and then GROWS at every Death-Star transition: GM.DIF += GM.BMP clamped 15, where GM.BMP itself increments 1..4 capped at 4 — the "USED TO KILL OFF RINGERS WHO START TOO EASY" mechanic (WSMAIN.MAC:2003-2021; the GM.BMP increment is gated "IGNORE BUMP WHEN ABOVE SELECTALEVEL", read as starting-wave < 6). Net: the cabinet's index saturates at 15 within ~4-5 Death Stars EVEN ON EASY; our clone does not reach 15 until wave 16. Right table (all three TGPROB columns are ported and drive the sec.6 fire gate), wrong index. NOTE: state.ts:448's base-gun tables already cite WV.HRD — reconcile that path with the same accumulator, do not grow a second one.

2) THE BASELINE (minor, compounds 1). MAME's manual-verified factory default for the difficulty DIP is Hard = ordinal 2 (starwars.cpp:199-203, "Dips Manual Verified... 06/2009"); our DIP=0 models the Easy setting. Needs a RULING (epic convention), not silent adoption: factory-default cabinet (start GM.DIF at 2) vs Easy cabinet (keep 0). Either way the DIP becomes one named constant, no longer an implicit zero folded into the index formula.

3) THE REFILL (NO_COUNTERPART). The "Bonus Shields" DIP (factory default 1) is consumed by ADCGAS (WSGAS.MAC:42-58): when the player kills the Death Star (PT.LIV != 0 at the endgame phase, WSMAIN.MAC:1970-1977), 0-3 shield units are ADDED BACK, capped at the starting amount (6-9 from the shields DIP). Our sim.ts only ever decrements lives (loseShield, sim.ts:1798) — a cabinet run heals one shield per Death Star destroyed; ours never heals. This materially lengthens real-cabinet runs and interacts with the SCRSHL per-surviving-shield bonus we already model (SHIELD_BONUS_PER_UNIT, state.ts:893): refill happens AFTER SCRSHL in the phase sequence (PH.TIM 2 -> 1, WSMAIN.MAC:1964-1977), so the bonus is scored on pre-refill shields.

CONFIRMED ledger from the same cross-check, to be recorded not fixed: MAME set_periodic_int(CLOCK_3KHZ/12) = 246.094 Hz independently corroborates TICK_HZ (state.ts:340, audit T-007), and factory-default starting shields 6 matches STARTING_LIVES=6 (ROM decode ANDA #03 / ADDA #06, WSMAIN.MAC:1294-1302). PRNG (23-bit LFSR — MAME itself stubs it with machine().rand()) and the Math Box/divider microcode remain declared STRUCTURAL substitutes; out of scope.

Scope guard: this story touches the difficulty INDEX and the shield count only. The TGPROB table contents (mask/threshold/guns columns), the sec.6 fire gate itself, TIE flight, and the hit-test geometry (sw8-27/sw8-29) are untouched. My GM.BMP schedule reading is a single-session derivation — AC1 refutes it before it becomes code.

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
- AC1 (REFUTE FIRST, gates the rest) — An adversarial re-derivation of the GM.DIF/GM.BMP schedule from WSMAIN.MAC:1300-1304 and 2003-2021 (decode the IFLO/IFHI macro nesting; do NOT trust this story's prose) produces a wave-by-wave table of WV.HRD for a wave-1 start at DIP=0 and DIP=2, through at least the first 8 Death Stars, with every claim cited to file:line. Two specific claims to attack: (a) the GM.BMP increment gate 'CMPA #6-1 / IFLO' keys on the NEW wave number vs the SELECT-A-LEVEL starting wave; (b) GM.DIF += GM.BMP runs unconditionally at every transition. The surviving table is recorded in the story context and is the oracle for AC2's tests.
- AC2 — The clone's fire index becomes the ROM's: min(min(wave-derived GM.WAV, 31) + gmDif, 15) with gmDif evolving per the AC1 table, carried in GameState (pure, deterministic, reducer-threaded), consumed by waveParams AND reconciled with the base-gun WV.HRD path (state.ts:448) so exactly ONE accumulator exists. The stale 'DIP = 0' prose at gameRules.ts:290-302 is rewritten to name the accumulator.
- AC3 (RULING) — Whether the clone models the factory-default cabinet (gmDif starts at 2, Hard) or the Easy cabinet (starts at 0) is put to the user as an explicit ruling with the AC1 table showing both columns, and the outcome lands as ONE named constant (e.g. DIFFICULTY_DIP) with the MAME cite (starwars.cpp:199-203) and the ruling date in its comment.
- AC4 — ADCGAS ported: on a Death-Star kill, BONUS_SHIELDS_DIP (one named constant, factory 1, MAME starwars.cpp:204-208) shield units are added, capped at STARTING_LIVES, sequenced AFTER the SCRSHL surviving-shield score bonus (cite WSGAS.MAC:42-58 and WSMAIN.MAC:1964-1977 at the site). The shield HUD gauge reflects the refill. A run that dies before any Death-Star kill is unchanged.
- AC5 (MUTATION-PROVEN, epic convention) — Both behaviors redden with the mutated string recorded VERBATIM: (a) deleting the accumulator (index falls back to min(wave-1,15)) reddens a seat that pins the AC1 oracle at a mid-run wave where the two indexes differ; (b) deleting the ADCGAS step reddens a seat asserting post-kill shields = pre-kill + 1 (capped). Record which tests redden.
- AC6 (CONFIRMED ledger) — The two MAME corroborations (timebase, starting shields) are appended to the star-wars audit doc's confirmed findings with the starwars.cpp cites, so the cross-check leaves a trace and is not re-run from scratch.

---
_Generated by `pf context create story sw8-30` from the sprint YAML._

---

## AC1 — Adversarial re-derivation of GM.DIF / GM.BMP (RESOLVED, this is AC2's oracle)

**Re-derived by TEA (2026-08-05) from WSMAIN.MAC read directly — not from this story's prose.** Both flagged claims survive; one refinement.

### The growth block (WSMAIN.MAC:1995-2021, fires at `PH.TIM == -2`, "WRAP TO NEXT DETH STAR")
```
LDA GM.WAV / INCA / CMPA #98 / clamp / STA GM.WAV     ; GM.WAV += 1 first (0-based)
LDA GM.WAV / CMPA #6-1 / IFLO                          ; gate on the JUST-INCREMENTED GM.WAV < 5
  LDA GM.BMP / INCA / CMPA #4 / clamp / STA GM.BMP     ;   GM.BMP += 1 (cap 4)
ENDIF
LDA GM.DIF / ADDA GM.BMP / CMPA #15 / clamp / STA GM.DIF  ; UNCONDITIONAL — outside the IFLO
```
Init (WSMAIN.MAC:1300-1307, runs ONCE at game start, before select-a-level): `GM.DIF = DIP ordinal (0-3)`, `GM.BMP = 0`.

- **Claim (b) "GM.DIF += GM.BMP every transition, unconditionally": CONFIRMED.** The add sits after the `IFLO...ENDIF`. GM.DIF grows every Death-Star kill even after GM.BMP freezes.
- **Claim (a) "gate keys on NEW wave vs starting wave": RESOLVED to NEW (current, post-increment) GM.WAV.** `STA GM.WAV` precedes the `CMPA #6-1`, so the gate reads the just-incremented value; there is no separate starting-wave variable. For a wave-1 start this is the "ringers who start too easy" proxy (bumps only while current wave stays low); a SELECT-A-LEVEL start at GM.WAV≥5 never bumps. Because the gate depends on the run's history, **GM.BMP and GM.DIF are BOTH true state — carry both in GameState (AC2), not a closed form of the current wave.**

### Clone-term recurrence (clone wave is 1-based, GM.WAV = wave-1; a wave advance == a Death-Star kill)
On advancing FROM wave W TO wave W+1: `newGmWav = (W+1)-1 = W`; if `newGmWav < 5` → `gmBmp = min(gmBmp+1, 4)`; then `gmDif = min(gmDif + gmBmp, 15)`.

### THE ORACLE — space fire index `WV.HRD = min(min(wave-1, 31) + gmDif, 15)`

Ruling (AC3, user, 2026-08-05): **DIP=0 (Easy)** → `DIFFICULTY_DIP = 0`. Column DIP=2 shown for the record.

| Wave | gmBmp entering | gmDif (DIP=0) | **WV.HRD (DIP=0, CANONICAL)** | gmDif (DIP=2) | WV.HRD (DIP=2) | clone today `min(w-1,15)` |
|-----:|---:|---:|---:|---:|---:|---:|
| 1 | 0 | 0  | **0**  | 2  | 2  | 0 |
| 2 | 1 | 1  | **2**  | 3  | 4  | 1 |
| 3 | 2 | 3  | **5**  | 5  | 7  | 2 |
| 4 | 3 | 6  | **9**  | 8  | 11 | 3 |
| 5 | 4 | 10 | **14** | 12 | 15 | 4 |
| 6 | 4 | 14 | **15** | 15 | 15 | 5 |
| 7 | 4 | 15 | **15** | 15 | 15 | 6 |
| 8 | 4 | 15 | **15** | 15 | 15 | 7 |

Saturates at 15 by **wave 6** (DIP=0) / wave 5 (DIP=2); the clone reaches 15 only at wave 16. gmDif(DIP=0) sequence by wave = [0,1,3,6,10,14,15,15]; gmBmp entering each wave = [0,1,2,3,4,4,4,4].

### Per-phase index note (recorded, NOT re-modeled by this story)
The three phase entries are NOT byte-identical: SPACE (1353-1364) uses GM.WAV as-is; GROUND (1603-1615) applies a `DECA` (GM.WAV−1, underflow-clamped) — a −1 offset; TRENCH re-runs add `GM.BMP` on repeat passes (1810-1823, "MAKE TRENCH HARDER ON REPEAT PASSES"). The **gmDif accumulator itself is phase-independent**; AC2 codifies the SPACE formula. Ground DECA / trench-repeat bump are out of scope (index-formula grain, not the accumulator) and logged here so they are not re-discovered.

### ADCGAS (AC4, WSGAS.MAC:42-58, verified)
On a Death-Star kill (`PT.LIV != 0` at PH.TIM=01, AFTER SCRSHL at PH.TIM=02): add `bonusShieldsDip` (OPTS1 high nibble & 3, factory 1) to shield energy S.GAS, clamp to starting amount (OPTS1+1 & 3, +6 → 6..9; clone STARTING_LIVES=6). Bonus is scored on PRE-refill shields.
