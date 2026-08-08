# Missile Command — full-cabinet roadmap — Architect design

2026-08-07. Architect design for completing Missile Command to shipping
cabinet fidelity, executing the user-approved decomposition (2026-08-07
brainstorm: "full cabinet, all at once"; authentic audio via W3SOUN + POKEY
decode). Ground truth for every ROM fact is the vendored **REV-01** tree under
`plugins/missile-command/reference/source/` and the machine-gated dossier under
`plugins/missile-command/docs/rom-study/` — this design *cites* that dossier and
its subsystem map, it does not re-derive them. Citation form is fully-qualified
`FILE.MAC:LINE` throughout, tagged **physical** or **logical** per file (W3MAIN
and W3DSUP are double-spaced → logical ≈ physical/2; W3COMN is physical). This is
a **roadmap** spec: it fixes the sequence, the fidelity contract, and the core
architecture. Each epic (mc3…mc9) gets its own detailed design + plan when it is
reached; **mc3 is detailed here** because it is next.

## What mc1 + mc2 delivered, what mc3 mounts on

**mc1 (skeleton, done):** the four-file plugin booting in the cabinet
(`plugin.ts` order 8); the fixed field — 6 cities + 3 bases at cited REV-01
coords (`field.ts`, `W3COMN.MAC:123-157`); the trackball→crosshair cursor with
clamp (`cursor.ts`); the player ABM launch → straight-line unit-velocity flight →
expanding/collapsing blast (`abm.ts`, `explosion.ts`; `game.ts` composes them).
The blast is a **symmetric-triangle placeholder** derived from two cited
constants (`EXDONE=27` `W3COMN.MAC:225`; peak radius 13 = OLDRAD max
`W3MAIN.MAC:906` logical) — the exact per-tick OLDRAD curve and EXPFRA cadence
are explicitly deferred to mc9.

**mc2 (ground truth + guardrail, done):** the citation checker + claims format
(`citations.test.ts` globs `docs/rom-study/claims/*.json`, scans `src/core`); the
`brief.md` / `subsystems.md` / `glossary.md` dossier; the sim tick pinned
(`timebase.md`: **one logic step per video frame**, VBLANK-released,
**61.0076 Hz** nominal 60); the actual starting-city count (`starting-cities.md`:
default **6** = `STCITY[0]`, `W3MAIN.MAC:3877/3895`; options `{0:6,1:4,2:5,3:7}`);
the `A35820.1C` decode (**W3SOUN**, the POKEY sound-control ROM — *ASCII
assembler source*, not an opaque image); and the joust/centipede prose-citation
coverage sweep enrolling the dossier prose.

**The net:** the *defensive* half exists and is cited; the *game* — an attacking
enemy, the damage detection that is the whole point of Missile Command, scoring,
waves, and every cabinet-completeness feature — does not. mc3…mc9 build it.

## Fidelity contract (binding on every epic)

1. **Ground truth is REV-01.** Every gameplay constant — enemy spawn rates and
   velocities, score values, the wave-difficulty schedule, the blast curve — is
   the decimal decode of REV-01 source and carries a claim in
   `docs/rom-study/claims/`, gated by `citations.test.ts`. No un-cited magic
   number enters `src/core`.
2. **The core/shell boundary holds.** Enemy logic, damage detection, scoring,
   waves, and the state machine are pure `src/core` (the `purity.test.ts` sweep
   scans them); render, audio, input, storage stay in `src/shell`. The core reads
   no wall clock and no entropy — the RNG the ROM uses for spawn placement is
   passed in as seeded state, never drawn ambiently.
3. **The REV-01 ↔ REV-03 fork (O-3) is a deliverable, not a surprise.** REV-03 is
   the version most players remember; REV-01 is our vendored source. Each epic
   that touches a place where the revisions differ (difficulty tuning above all)
   **catalogues the delta** in its design + a claim note, and ships REV-01
   behaviour. Never a silent pick.
4. **Reuse before building** (pragmatic restraint): `@shared/highscore` +
   `@shared/name-entry` (mc7); `@shared/audio` + `@shared/synth` + the already
   vendored `plugins/star-wars/tools/pokey-bake/vendor/pokey.js` (mc8). New
   `src/shared` extraction only once a second game proves the duplication — a
   Missile-Command-only concern stays in `plugins/missile-command/src/`.
5. **Assets are verified live, not assumed** (sidecar gotcha): any epic whose
   payload is an asset the code merely points at (mc8 audio) proves it with a
   live fetch, and files the follow-up story *before* finishing — a Delivery
   Finding is not a backlog item.

## Core architecture — how `GameState` grows

`game.ts`'s `GameState` + `stepGame` remain the composition root. mc1's
`stepGame` currently does: fly ABMs → detonate arrivals → age blasts. It grows,
in this per-frame order, to:

1. **spawn** — the wave scheduler releases enemy warheads this frame (mc4 owns
   the schedule; mc3 seeds a minimal spawner)
2. **fly enemies** — each ICBM/raider steps one tick toward its ground target
3. **fly ABMs** — unchanged from mc1
4. **detonate arrivals** — ABM arrivals and enemy ground-impacts start blasts
5. **damage detection** — blast↔missile (a blast destroys every enemy warhead
   whose head is inside its radius) and missile↔structure (an enemy reaching a
   city/base destroys it)
6. **age blasts** — unchanged from mc1
7. **resolve** — apply deaths, award score, test wave-end and game-over, advance
   the state machine

New pure `src/core` modules, one per subsystem-map row, added as their epic lands:
`icbm.ts` (enemy warhead spawn + flight), `damage.ts` (both detections),
`wave.ts` (schedule + bonus + regen), `score.ts`, `state.ts` (attract/setup/
play/pause machine), `raider.ts` (bomber / satellite / smart-bomb / MIRV /
cruise). Cities and bases move from static `FieldPos` to stateful records
(alive flag; bases also carry ammo).

**Rejected alternatives.** An ECS / event-sourced core — YAGNI; none of the seven
shipped games use one and the ROM is a flat per-frame state machine. A literal
1:1 port of W3MAIN's memory layout and routine order into TS — maximises citation
traceability but produces un-idiomatic, hard-to-test code that fights the
core/shell split; we cite the ROM per constant instead, which the claims gate
already enforces.

## The roadmap — mc3 … mc9

Sequenced; dependencies noted. **mc3 is the playable end-to-end milestone.** mc8
(audio) and mc9 (render) may begin any time after mc3 since they layer on events
mc3 already emits. Anchors below are from `subsystems.md` (physical lines).

| Epic | Name | Delivers | Primary anchors |
|---|---|---|---|
| **mc3** | Core combat loop *(playable)* | Enemy ICBM spawn + flight to a ground target; **blast kills incoming**; incoming kills city/base; ammo per base (10 ea; base dead when empty or destroyed); score for kills; minimal play→game-over state; HUD (score + ammo) | `W3MAIN.MAC:1443` UPDATE ICBM POSITIONS · `W3MAIN.MAC:1925` MISSILE DAMAGE DETECTION · `W3MAIN.MAC:2167` DESTROY A CITY OR BASE · `W3MAIN.MAC:5549` ADD TO SCORE |
| **mc4** | Waves, scoring & bonus | Per-wave difficulty schedule (enemy count / speed ramp); end-of-wave **city bonus + unused-missile bonus**; regenerate cities; bonus city at score threshold; per-wave score multiplier | `W3MAIN.MAC:3901` 1ST PHASE OF NEW WAVE · `W3MAIN.MAC:4323` CITY BONUS · `W3MAIN.MAC:4765` REGENERATE CITIES · `W3MAIN.MAC:5549` ADD TO SCORE |
| **mc5** | Full enemy roster | MIRV split; cruise missiles; bomber + satellite (sputnik) fly-across launchers; smart bombs that dodge blasts | `W3MAIN.MAC:2273` LAUNCH ICBMS · `W3MAIN.MAC:2635` CRUISE MISSILE LAUNCH · `W3MAIN.MAC:2683` MIRV AN ICBM · `W3MAIN.MAC:2069` SPUTNIK KILL |
| **mc6** | Attract + state machine + pause | Full MAINLINE attract/setup/play/pause machine; self-playing smart-cursor attract; scrolling attract messages; THE END | `W3MAIN.MAC:475` MAINLINE · `W3MAIN.MAC:539` PLAY · `W3MAIN.MAC:561/615` SETUP/PAUSE · `W3MAIN.MAC:891/5277/5331` attract |
| **mc7** | High-score ladder + name entry | Reuse `@shared/highscore` + `@shared/name-entry`; ROM-faithful ladder behaviour; one-origin `localStorage` | `W3DSUP.MAC:3724` INIT HI SCORE · `W3DSUP.MAC:3780` UPDATE LADDER · `W3DSUP.MAC:4064` TAKE INITIALS |
| **mc8** | Authentic audio | **Spike first** — read normalized W3SOUN ASCII source, extract sound-command tables; drive the vendored `pokey.js`; map game events → POKEY commands; **verify live** | `A35820.1C`→W3SOUN · reuse `star-wars/tools/pokey-bake` |
| **mc9** | Render fidelity | Per-wave 8-colour palette + cycling (O-5); authentic city/base stamps; missile trails; **exact OLDRAD blast curve + EXPFRA cadence** (retires mc1's triangle placeholder) | `W3DSUP.MAC:587` WRITE A STAMP · `W3DSUP.MAC:1067` DRAW LIVING CITIES · `W3DSUP.MAC:1583` SET UP COLORS · `W3MAIN.MAC:1811` PROCESS EXPLOSIONS |

**Dependencies:** mc4→mc3 · mc5→mc3+mc4 · mc6→mc3 · mc7→mc4 · mc8→mc3 · mc9→mc3.
**Reorder from the brainstorm sketch:** waves/scoring (mc4) precedes the full
enemy roster (mc5) — MIRVs, cruise, and bomber/satellite launches are *spawned by*
the wave-difficulty schedule, so the schedule is their natural home; building the
roster first would spawn enemies with no schedule to govern them.

---

## mc3 — Core combat loop (detailed)

The playable milestone: an attack that can be defended against, damage in both
directions, ammunition, a score, and an end. Deliberately *out of scope* for mc3
(each has a later home): the wave-difficulty ramp and any end-of-wave bonus (mc4);
MIRV / cruise / bomber / satellite / smart-bomb (mc5); attract & pause states
(mc6); high scores (mc7); audio (mc8); palette, authentic sprites, exact blast
curve (mc9). mc3 uses one endless-difficulty spawn cadence and the mc1 triangle
blast, both flagged as placeholders standing in for mc4/mc9.

### New/changed core modules

- **`icbm.ts` (new)** — the enemy warhead as pure data. `Icbm { origin, target,
  pos, arrived }` flying a straight line at a **cited constant velocity** from a
  top-edge origin to a ground target (a city or base position). Mirrors `abm.ts`'s
  shape; velocity from `CALCULATE MISSILE VELOCITY` (`W3MAIN.MAC:3279` logical) /
  `UPDATE ICBM POSITIONS` (`W3MAIN.MAC:1443` logical) — a new claim in a new
  `claims/icbm.json`. `stepIcbm(icbm)` advances one tick, snapping to target on
  arrival (same idiom as `stepAbm`).
- **`spawn.ts` (new, minimal — mc4 replaces it)** — a pure, seeded spawner:
  given the frame, an RNG seed, and the live-target list, decides whether to
  release an ICBM this frame and from which top-edge column to which ground
  target. mc3 pins a single flat cadence + count with a claim citing the REV-01
  first-wave values (`LAUNCH ICBMS` region, `W3MAIN.MAC:2273` logical) so mc4 can
  ramp from a real baseline rather than an invented one. The RNG is
  `@shared/rng`, seeded in state — never ambient (contract §2).
- **`damage.ts` (new)** — two pure predicates + their appliers:
  - *blast↔missile*: an enemy warhead whose head lies within a blast's current
    radius is destroyed (`MISSILE DAMAGE DETECTION & PROCESS`, `W3MAIN.MAC:1925`
    logical). Point-in-circle against `blastRadius(exp)`.
  - *missile↔structure*: an enemy warhead reaching its ground target destroys
    that city or base (`DESTROY A CITY OR BASE`, `W3MAIN.MAC:2167` logical).
- **`field.ts` (changed)** — cities and bases become stateful: `City { pos, alive }`
  and `Base { pos, alive, ammo }`. The cited coordinate constants are unchanged;
  the initial `ammo` is the per-base missile count — a **new claim** citing the
  REV-01 magazine size (the "10 per base" everyone knows — to be pinned to its
  actual `W3COMN`/`W3MAIN` symbol during mc3 red, never hard-coded uncited).
- **`score.ts` (new, minimal)** — `addScore(state, points)`; mc3 awards the
  per-ICBM kill value (cited, `ADD TO SCORE` `W3MAIN.MAC:5549` logical + the
  points table). Wave multiplier and bonuses are mc4.
- **`state.ts` (new, minimal)** — a `phase: 'play' | 'over'` field on `GameState`.
  mc3 implements exactly the `play → over` edge (all cities destroyed → game
  over). The full attract/setup/pause machine is mc6; mc3's `phase` is the seam
  it will grow into.
- **`game.ts` (changed)** — `stepGame` grows to the 7-step order above (spawn →
  fly enemies → fly ABMs → detonate → damage → age → resolve). `GameState` gains
  `icbms`, `score`, `phase`, an RNG seed, and cities/bases become the stateful
  records. `createGame()` seeds 6 live cities, 3 live bases at full ammo, empty
  enemy list, `phase:'play'`.

### Shell

- **`render.ts` (changed)** — draw ICBMs (origin→pos trail + head, the enemy
  colour), dead cities/bases as rubble vs live, and a **HUD**: score readout and
  per-base ammo. mc3 render is *functional*, not pixel-authentic (that is mc9) —
  but note the HUD-figure gotcha: the score it draws is the same value the core
  scores, never a re-derived display copy.
- **`input.ts` (changed)** — an empty base (0 ammo) or destroyed base cannot
  fire; the fire key for a dead/empty base is a no-op (`input.ts` already chooses
  the base per key). Out-of-ammo feedback (the klaxon) is audio → mc8.

### Acceptance shape (the epic's stories will refine)

Playable end-to-end: ICBMs fall from the top toward cities/bases; a player blast
in their path destroys them and scores; an ICBM that reaches a city/base destroys
it; a base out of ammo or destroyed cannot fire; when the last city dies the game
enters `over`. Every new constant (ICBM velocity, spawn baseline, per-base ammo,
kill score) carries a claim and passes `citations.test.ts`; `purity.test.ts`
stays green (RNG seeded, no clock in core).

### Testability notes for TEA

- `icbm.ts` / `damage.ts` / `score.ts` are pure and unit-testable exactly like
  mc1's `abm.ts` / `explosion.ts` — deterministic step functions over plain data.
- The spawner takes its seed as an argument, so a fixed seed gives a fixed attack
  wave: the whole combat loop is replayable frame-by-frame from `createGame()` +
  a seed, which is the mc3 integration test's backbone.
- Damage detection is point-in-circle and target-reached — both are boundary-rich
  (on the radius, one tick before arrival); TEA should pin the boundary, not just
  the interior.

## Open questions carried forward

- **O-3 (REV-01 vs REV-03):** first bites in mc4 (difficulty). mc3 records the
  REV-01 first-wave spawn baseline it pins so mc4's delta catalogue has an anchor.
- **O-5 (palette / 3rd-colour-bit):** deferred to mc9; mc3 render uses functional
  colours and does not reproduce the hardware address scramble.
- **Per-base ammo symbol:** the exact REV-01 magazine-size symbol is pinned during
  mc3 red (not assumed "10"); if REV-01 differs from the familiar 10, the claim
  records REV-01 and notes the delta (contract §3).
