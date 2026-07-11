# Epic sw4 Context

## Title
Star Wars — world-metric & threat restoration (1983 source-true distances)

## Overview
Playtesting reported the space wave as a "turkey shoot": TIEs fill half the
screen, enemy fire is no threat, 20+ waves cleared without pressure. An
architect distance audit (2026-07-11) against the original 1983 Atari source
proved the cause. The TIE *model* is faithful — `WSOBJ.MAC` authors it as small
integers × `.S=13.`, and the clone's `models.ts` vertices are those raw ROM
words 1:1 — but the *world* around the model was compressed ~4–6× and the
threat model inverted. This epic restores the ROM's world metric unscaled,
ports the homing fireball law, and replaces random surface placement with the
hand-authored `WSGRND.MAC` tower mazes.

**Authoritative design spec:** `star-wars/docs/superpowers/specs/2026-07-11-world-metric-threat-restoration-design.md`
(committed on star-wars branch `chore/world-metric-design-spec`, commit
`6eab7bb` — merge that branch to develop before or with sw4-1). The spec is the
spec-authority source for all three stories; this context is its sprint-side
distillation.

## Metadata
- **Epic ID:** sw4
- **Repo:** star-wars
- **Design spec:** see Overview (spec authority above story context)
- **Sequenced after:** epic sw3 distance-adjacent bugs (sw3-14, sw3-15) are
  independent; no ordering constraint against them.

## Background

### The evidence (audit summary)

| Quantity | 1983 ROM | Clone before sw4 | Divergence |
|---|---|---|---|
| TIE spawn depth | `$7C00` = 31,744 | `TIE_SPAWN_DISTANCE` 8,000 | world 4.0× too shallow |
| Closest engagement | fire floor `$800` = 2,048 | `TIE_NEAR_BOUND` 350 | 5.9× too close |
| TIE angular size, closest | ~19° (⅓ screen) | ~88° (exceeds the 60° FOV) | screen-filling |
| Relative transit | `$200`/tick ≈ cube in ~62 ticks | 1,300 u/s = 6.2 s | 3–6× slower |
| Fireball | homes (`vel −= vel>>3`), 64-tick life, **always arrives ~1 s**, the ONLY damage source in space | straight line 300 u/s, TTL 6 s → max reach 1,800 < spawn 8,000; a TIE (1,300 u/s) outruns its own shot | threat is decorative |
| Surface placement | hand-authored per-wave tower mazes out to Y=`$7C00` | random turret spawns at 1,200 | ~26× compressed, layout invented |

Key insight making this cheap: **`models.ts` already uses raw ROM units**, so
ROM distances port into the sim **unscaled**.

### Sources of truth (in preference order)

1. **Original 1983 MACRO-11 source**, cloned locally:
   `~/Projects/star-wars-1983-source-text/` (greppable LF-normalized copy;
   pristine clone sans transcription at `~/Projects/star-wars-1983-source/`,
   github `historicalsource/star-wars` @ `5355b76`). Module map lives in
   `star-wars/CLAUDE.md` § "The original 1983 Atari source".
   - `WSCPU.MAC` — TIE AI: `STARTING LOCATIONS` (`TBG*` tables: depth `$7C00`,
     lateral offsets ×`$400`), `WAVE DATA`, `CHOREOGRAPHY TABLES`.
   - `WSGRND.MAC` — surface: `TOWER MAZES` (per-wave `TOWER`/`BUNKER`/`BISHOP`
     maps, top view X ±right / Y forward, hex coords), `TTWRS` counts.
2. `star-wars/docs/tie-flight-ai-model.md` — RE'd flight model (§5.3 motion
   constants, §6 fire gates/fireball, §7 lifecycle) from the 6809 disasm.
3. `star-wars/reference/disasm/` — gitignored disassembly (cross-reference
   only; the original source above is strictly richer).

### User-confirmed design decisions (brainstorm 2026-07-11)

1. **Scope:** space + surface. Trench excluded (sw3-15 owns the port window);
   input-ease (mouse vs yoke, `LOCK_RADIUS_NDC`) excluded.
2. **Depth:** world-metric surgery — keep the playtested swoop/peel kinematics
   (stories 9-2..9-5); restore only the numbers. NO behavior-script VM, NO
   loiter-in-cube (still the deferred "TIE deep model" item).
3. **Fireball defense:** pure gunnery — restored fireballs home and always
   arrive; un-shot = shield hit; shooting them down is the defense. No
   artificial near-misses; no ship-translation dodge mechanic.
4. **Surface:** port the authored mazes as data — real layouts, not random
   spawns, not provisional scaling.

## Stories

### sw4-1 — Space world-metric restoration (5 pts, p1) — spec §A
Constant surgery in `src/core/state.ts` / `gameRules.ts`, spawn-table change in
`sim.ts spawnTie`. `TIE_SPAWN_DISTANCE` 8,000→31,744; spawn lateral random
±350 → TBG-order table `{0, ±1024, ±2048}` on both lateral axes;
`TIE_NEAR_BOUND` 350→2,048; `TIE_EXIT_RANGE` 1,800→~8,000 (tuning latitude);
`ENEMY_SPEED` 1,300→~10,000 **PROVISIONAL** (see tick-rate policy below);
`PROJECTILE_SPEED` 5,000→16,000 with TTL sized so reach ≥ 32,000. Unchanged:
hit radii (already model-faithful), `waveParams` ramp structure, per-TIE fire
cooldown + concurrency caps (9-5).

### sw4-2 — Homing fireball threat (3 pts, p1, depends on sw4-1) — spec §B
Replace straight-line `vel: scale(toCockpit(e.pos), ENEMY_SHOT_SPEED)` with the
ROM homing law (`sub_A875`): relative position decays **7/8 per cabinet tick**,
frame-rate independent (`pos_rel *= pow(7/8, dt × TICK_HZ)`); lifetime 64
ticks. Un-shot fireball → existing cockpit-collision path (shield hit).
Fireballs stay shootable (`ENEMY_SHOT_HIT_RADIUS` 150). Score value 33 belongs
to sw3-1 — do not implement here.

### sw4-3 — Surface maze port (5 pts, p2) — spec §C
New pure-data `src/core/surfaceMazes.ts` (like `models.ts`: data only)
transcribing `WSGRND.MAC` `TOWER MAZES`: entries
`{x, y, kind: tower|bunker|bishop, typeDigit}`; source frame X ±right /
Y forward (hex) → our X lateral / −Z depth, unscaled. Preserve the **prefix
structure** (each maze's `T3*` extended form appends after a mid-table
`MAZEND`: encode one entry list + two lengths). Port the wave→maze map from
source comments (TBUNK=wave 2 bunkers-only; TDIFF=07; T3DIFF=16; …) and
`TTWRS` counts. Sim: the maze is a **fixed field** at authored coordinates
translating in with the existing surface scroll — entities are not spawned
one-by-one. Bunkers/bishops ride the existing tower render/collision path
(bunker model exists per sw3-11).

## Cross-story constraints & guardrails

- **`TICK_HZ` is shared.** sw4-1's speeds and sw4-2's decay/lifetime derive
  from the same named PROVISIONAL constant. Define it once (core), document
  the cabinet-tick-unpinned caveat, cite the spec.
- **PROVISIONAL policy:** cabinet tick rate is unpinned
  (`docs/tie-flight-ai-model.md` porting caveat). Speed-like constants carry
  `PROVISIONAL` doc-comments naming the spec; they are playtest-verified
  (transit ≈ 2.5–4 s), not unit-tested to exact values. Geometry constants
  (`$7C00`, `$800`, TBG table, maze coords) are EXACT — unit-test those.
- **Reconcile flag (sw4-3):** sw3-3's `byte_98CB` towers-remaining quota vs
  the mazes' `TTWRS` counts. If they disagree for a wave, **maze data wins for
  placement**; quota reconciliation is an in-story decision, documented as a
  deviation in the session file.
- **Determinism:** all changes stay in the pure core; fireball homing must be
  dt-split deterministic (same trajectory at 30/60/144 Hz stepping).
- **No overlap with siblings:** sw3-1 (score values incl. fireball 33),
  sw3-7 (trench PRNG variation), sw3-14 (voice parity), sw3-15 (exhaust-port
  window) are complementary — do not absorb their scope.
- **Out of scope for the whole epic:** turret/tower fire behavior (aim,
  cadence) on the surface — placement only; trench distances; input-ease
  levers; TIE behavior-script VM / loiter model / wave-composition tables.

---
_Authored by Architect (distance audit + brainstorm), 2026-07-11. Supersedes
the stub format; `pf context create epic sw4` must NOT overwrite this file._
