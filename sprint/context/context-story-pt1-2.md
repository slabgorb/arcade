# Story pt1-2 Context

## Title
millipede: initial-wave spawn ramp not wired — verify early-game creature spawn tables against the ROM, escalation starts too fast

## Metadata
- **Story ID:** pt1-2
- **Type:** bug
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Playtest bug sweep 2026-08-19 (pt1)

## Problem
Playtest 2026-08-19: everything escalates within seconds of wave 1 — the whole
creature cast appears almost immediately.

## Findings (research complete — root cause identified)

**The per-creature gates are all correctly transcribed. The bug is upstream:
`centin` is fed the LIVE segment count instead of the ROM's per-wave register.**

The ROM's ramp is `CENTIN` — "LENGTH OF CENTIPEDE" (`MLDEF.MAC:299`), the NOMINAL
wave length: init 12 (`MILLI.MAC:1168-1170`, NCENT `MLDEF.MAC:188`), decremented
ONCE PER WAVE in CENTPC (`MILLI.MAC:504-519` — `DEC X,CENTIN`, reload 0x0C, CENTIS
gate). Death does NOT touch it (`MILLI.MAC:501-506`). The gates keyed on it (all
present in our core, all already claim-covered):

| Creature | gate | asm | ours |
|---|---|---|---|
| Beetle | CENTIN ≤ 11 (wave 2) | `MILLI.MAC:264-266` | `beetle.ts:137` |
| Earwig | ≤ 10 (wave 3) | `MILLI.MAC:689-691` | `earwig.ts:109` |
| Inchworm | ≤ 10 (wave 3) | `MILLI.MAC:2575-2577` | `inchworm.ts:101` |
| Dragonfly | ≤ 9 (wave 4) | `MILLI.MAC:1022-1024` | `dragonfly.ts:129` |
| Mosquito | ≤ 8 (wave 5) | `MILLI.MAC:1341-1344` | `mosquito.ts:106` |
| Bee | ≥ 10 + conditions | `MILLI.MAC:69-75` | `bee.ts:121` |
| Spider extra | == 12 exactly | `MILLI.MAC:2326-2328` | `spider.ts:139` |
| Auto-scroll | == 4 | `MLSUB.MAC:1133-1134` | `scroll.ts:100` |
| CONWAY | == 9 at clear | `MILLI.MAC:1911-1914` | — |

**The defect:** `sim.ts:211-226` builds `EnemyView` with
`centin: liveSegments` (the filtered live count), and `sim.ts:459` sets
`GameState.centin = liveSegs === 0 ? NCENT : liveSegs` (also `sim.ts:399` for the
scroll arm). So on WAVE 1, shooting one segment "advances" the ramp: 1 kill →
beetles, 2 → earwigs/inchworms, 3 → dragonflies, 4 → mosquitoes. The whole cast
inside seconds — exactly the symptom. The live-count semantics also make the
CENTIN==4 auto-scroll and the LCOLOR recolour (`MLIRQ.MAC:255`) flicker per kill
instead of per wave. The deviation is documented as accepted at
`game-state.ts:45-51` ("Splits are deferred (ml3-2)…") — that acceptance is what
this story retires.

**Ramp machinery already built but with ZERO callers** (wire, don't write):
- `stepWaveCadence` (`src/core/millipede.ts:249-260`) — the CENTPC DEC/reload walk
- `beetlesPerWave` (`src/core/waves.ts:22-30`, BEETLA quota `MILLI.MAC:637-665`) —
  beetle.ts:72 currently passes the CONCURRENCY cap `beetleAllowed` into
  `counts.allowed`, the exact confusion `waves.ts:19-20` warns about
- `rampCount3` (`src/core/score.ts:80-88`, COUNT3 `MLSUB.MAC:1061-1069`)
- `newMillipedeHead` (`millipede.ts:397-416`, NEWHD `MLSUB.MAC:775-820`)
`GameState` lacks `centis`/`count1`/`count3`/`beetla`; `state.wave` is written
(`sim.ts:369`) and read by nothing; `view.hard` is hardcoded false (`sim.ts:217`).
Also: death respawn re-lays `centin: state.centin` (`sim.ts:544`) — with wave
semantics this becomes correct automatically (ROM re-lays the full wave length,
`MILLI.MAC:546`).

## Technical Approach
Make `centin` a wave register: add `centis` (and the fields the wired functions
need) to `GameState`; drive `stepWaveCadence` from the wave-clear/CENTPC-
equivalent in `sim.ts`; feed `EnemyView.centin`/`GameState.centin` from the
register, never the live count; route `beetlesPerWave` into the beetle quota
(distinct from the concurrency cap). This is the standing never-defer-integration
rule: the pieces exist, wire them in place. No new constants — all anchors have
claims (`09-…`, `10-…`, `11-…`, `12-scroll.json`, `13-waves-scoring.json`).
NOTE: there is no spawn-cadence dossier page; add the CENTIN-register explanation
to `subsystems.md` (the dossier sweep requires claims for new backtick cites —
they exist).

## Scope
- In scope: the centin/centis register semantics, wiring the four orphaned pure
  functions, retiring the game-state.ts:45-51 acceptance note.
- Out of scope: segment SPLITS (ml3-2's deferral of split trains is separate from
  the register semantics); `view.hard` operator options (document as still-inert
  unless trivially co-wired).

## Tests affected
- **Pin the WRONG semantics (must be rewritten):**
  `tests/death-respawn.test.ts:84-118` ("register follows the connected length",
  "death re-lays PRESERVED length"); `tests/field-recolour.test.ts:175,193`
  ("latched index tracks the live length").
- **Blind fixtures** (default `centin: 0` passes every gate — tighten while
  there): `tests/secondary-inputs.test.ts:36`, `tests/enemies/*.test.ts`,
  `tests/beetle-quota.test.ts:47-90`.
- **Already pin the unwired functions (become integration anchors):**
  `tests/millipede.test.ts:489+` (`stepWaveCadence`), `tests/waves.test.ts:136-188`
  (incl. `:181` "does NOT collapse into beetleAllowed"), `tests/count3-ramp.test.ts`.
- `tests/scroll-wiring.test.ts` (CENTIN==4 arm), `tests/ingame-colour.test.ts`,
  `tests/playfield-colour.test.ts`, `tests/sim.test.ts:164-196`.

## Acceptance Criteria
_TEA to define at RED. Suggested: AC1 killing segments on wave 1 unlocks NOTHING —
gates respond only to the wave register (cited to CENTPC `MILLI.MAC:504-519`);
AC2 the creature unlock ladder is wave 2 beetles / 3 earwigs+inchworms / 4
dragonflies / 5 mosquitoes, pinned; AC3 death re-lays the full nominal length;
AC4 the beetle QUOTA (BEETLA) and concurrency cap are distinct and both enforced;
AC5 purity green, no new uncited constants._

---
_Generated by `pf context create story pt1-2`; researched and expanded by Architect 2026-08-19._
