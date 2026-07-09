# Epic rb2 Context

## Title
Red Baron — PLAY: aerial combat

## Overview
PLAY / aerial-combat game state (GAMODE). Flight model (bank-to-turn, pitch, altitude — no throttle; forward motion is constant), tilting-horizon world, enemy biplanes + dogfight AI, machine-gun fire, hit/collision, explosions, scoring, waves, lives. First-playable milestone. Built on rb1 foundation + fidelity spec.

## Metadata
- **Epic ID:** rb2
- **Repo:** red-baron

## Background

Cross-story constraints and guardrails for rb2 (PLAY / aerial), grounded in the
fidelity spec `red-baron/docs/red-baron-1980-source-findings.md` and layered on
the rb1 foundation (`timing.ts`, `camera.ts`, `horizon.ts`, `scene.ts`).

1. **Frame cadence — the load-bearing timing constraint (findings §1).** Tick the
   sim **one step per calculation frame** (`CALCNT=0x18`=24 NMIs → **~10.42 Hz /
   96 ms**), **not** the 62.5 Hz display refresh — ticking per display frame runs
   the sim **~6× too fast** (the Red Baron analogue of the Asteroids ÷4 trap).
   Sub-dividers key off the per-step `FRAME` counter: enemy/ground-shell launch
   ÷4, plane fire ÷2, player-shell sub-step 4×. rb1's `timing.ts` (`SIM_HZ`,
   `SIM_TIMESTEP_S`) already encodes this — **every rb2 motion/fire/spawn routine
   runs at the calc-frame cadence.**

2. **The picture-ROM geometry gap is CLOSED (correction to findings §7/§9/§10).**
   rb1-2 logged "gap #1: `RBPICS.MAC`/`RBCHAR.MAC` absent → plane connect-list
   topology not enumerable." **This is stale.** The picture-ROM *source* shipped
   in the quarry, misnamed by ROM part number: **`037007.XXX` IS `RBPICS.MAC`**
   (`.TITLE RBPICS - RED BARON PICTURES`) and **`037006.XXX` IS `RBCHAR.MAC`**.
   The full connect-lists are present — `DB.MAP` (back-face), `DB.MAR`
   (front-face), `DB.LNS` (wing struts), via `BLANKV n` (move-dark to vertex *n*)
   / `VSBLEV n` (draw-visible to vertex *n*) — plus `BLIMP`/`DBLIMP`, `PIECE0-3`
   (explosion debris), `DBPROP` (prop), `STAR0/1`, `COLLD` (346 connect opcodes
   total). **Consequence:** rb2-3 (render), rb2-6 (explosions), rb2-10 (blimp)
   all draw **authentic geometry**, not stand-ins. **rb2-2 transcribes this
   source into a TS topology module AND corrects the four stale "absent" claims
   in the fidelity doc** (§7, §8 header, §9 gap #1, §10).

3. **Flight-camera pipeline — rb1 built the camera; rb2-1 builds the dynamics
   that drive it (findings §2).** `camera.ts flightView(attitude, eye)` +
   `horizon.ts` already render any attitude. rb2-1 supplies the authentic
   dynamics that *produce* the attitude: `PLDELX` turn-rate with inertia +
   hysteresis (the yoke sets a *target* turn-rate the plane ramps into, not an
   instant heading); the 11-step `PLDELY` pitch table (**asymmetric — dive −32 is
   faster than climb +25**); `PFROTN = PLDELX × 8` horizon-bank coupling (clamp
   ≤ `0x100`); `I4YPOS` altitude clamp (`8*4 … 180*4` — **you can't crash by
   pitching into the ground in a dogfight**; terrain only bites in the rb3 ground
   wave); and `DISCHK` distance-scaled control feel. **Forward motion is implicit
   and constant — the pilot commands only turn and pitch. There is no throttle**
   in the ROM (the epic blurb and the rb1 design brief said "throttle" — corrected).

4. **Enemy AI is a weaving window-follower, NOT a beeline seeker (findings §3).**
   Planes accelerate ΔX toward window limits (`P.OLIM`/`P.ILIM`, `GMLEVL`-indexed)
   and reverse at the bounds, weaving across screen centre, banking ∝ turn-rate.
   Object budget = **3 motion objects (1 lead + 2 drones)**; a blimp borrows a
   slot. Spawn count/aggression scale with **score/kills** (`OBJKLD` → `GMLEVL`,
   ceiling `.LEVLS=5`), not discrete stages. Killing the lead **promotes a drone
   to lead** (`PLNXCG`). (Mirrors the Battlezone finding that authentic Atari
   enemy AI is a state machine, not a seeker.)

5. **Two death channels — enemy shells are not a per-pixel hit test (findings
   §5).** (a) **The returning ace is an EVADE CHECK, not a projectile collision**
   (`EOLSEQ`): bank to the correct side **and** turn hard enough (`|PLDELX| ≥
   0x1C`) to shake him — **first pass free, then 50/50** (the signature "bank hard
   to shake him" — rb2-8). (b) Ground fire + terrain crash belong to the **rb3
   ground wave, not rb2**. Player shells **do** use rotated collision windows
   (`CDSSET`/`SHCDCK`) vs enemies (rb2-5). **Respawn grace:** `WO.CNT` disables
   enemy planes for **5 frames** on (re)spawn (rb2-9), analogous to Battlezone's
   `rez_protect`.

6. **Scoring rewards closing (findings §4):** a lit/close plane scores
   `PLVALU = depth × VALFRC` — **closer kills are worth more**; drones and dim/far
   planes are a flat **300**; the blimp **200**. Kills bump `OBJKLD`, which drives
   the difficulty level.

**Guardrails (standing arcade rules):**
- **ROM is canonical** — the fidelity spec is authoritative over playtest-tuned
  curves; on conflict, follow the ROM.
- **Don't gold-plate** — ratchet aggression **up to** the ROM ceiling
  (`GMLEVL 5`), never past; don't over-invest in deep waves nobody reaches.
- **Consume `@arcade/shared`, don't port** — rb2 builds on rb1's shared-`math3d`
  camera; the flight sim, enemy AI, collision, and POKEY sound stay **local**
  (game-specific code is never shared).
- **red-baron has NO GitHub remote** — stories land via a **local merge to
  `develop`** (no push, no PR). Orchestrator commits sprint tracking only, when
  asked.

### Sequencing — first-playable at story 6

Stories **rb2-1 … rb2-6** are the core dogfight and land the **first-playable
milestone**: fly → see an authentic enemy biplane → gun it down → score it → it
explodes. **rb2-2 (connect-list transcription) unblocks rb2-3 (render).** Stories
**rb2-7 … rb2-12** layer multi-plane waves + drones, the returning ace,
lives/respawn, the blimp, POKEY sound, and a live playtest pass. **Ground combat,
attract, and high-score are OUT of scope** — they are rb3 / rb4 / rb5.

---
_Generated by `pf context create epic rb2` from the sprint YAML, Background curated by the Architect (The History Men)._
