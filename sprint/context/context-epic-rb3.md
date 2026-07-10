# Epic rb3 Context

## Title
Red Baron — PLAY: ground sequence

## Overview
PLAY / ground-sequence sub-mode (GRMODE D7=GROUND). Dive-and-strafe: ground
objects/shells, ground collision, mountain-pass run. Built on rb1/rb2.

## Metadata
- **Epic ID:** rb3
- **Repo:** red-baron

## Background

Cross-story constraints and guardrails for rb3 (PLAY / ground wave), grounded in
the fidelity spec `red-baron/docs/red-baron-1980-source-findings.md` (§4 ground
sequence, §5(b) ground death channels, §7 ground objects) and layered on the rb1
foundation (`timing.ts`, `camera.ts`, `horizon.ts`, `scene.ts`) plus the rb2
aerial slice already on `develop`.

**rb3 is a REUSE epic, not a new-systems epic.** The aerial slice (rb2) already
built almost everything the ground wave needs. Before proposing any new module,
the default is to extend an existing one:

| Ground-wave need | Existing asset (do NOT rebuild) |
|---|---|
| Wave alternation (`MODECT`/`NEWCT`/`MCOUNT`) | `waves.ts` (landed in rb2-7) — extend the LSB branch, don't re-author |
| Shell model (launch/advance/expire) | `guns.ts` (rb2-5) — ground fire is the reverse direction of the same shells |
| Player-shell hit test (`CDSSET`/`SHCDCK`) | `guns.ts` — same rotated-window path strafes ground targets |
| Explosions (`EXCRCL` expanding circle) | `explosion.ts` (rb2-6) — extend for the ground-target burst |
| Scoring (`PLVALU = depth × VALFRC`) | `scoring.ts` (rb2-6) — closer kills worth more, unchanged |
| Render substrate (project → stroke glow) | `scene.ts` / `camera.ts` / `horizon.ts` (rb1) — mountains are 2-D playfield objects through the SAME pipeline |
| Control-feel band (`DISCHK`) | `flight.ts` `ProximityBand` (rb2-4) — ground mode PINS it slow, no new path |

**The one genuinely-new asset is DATA, not code:** the `SCAPE0..3` mountain
silhouettes and the 24 `PFOCOL` collision boxes. `topology.ts` (rb2-2)
transcribed the plane/explosion/blimp picture-ROM but **explicitly scoped the
`SCAPE` lists OUT** — it already exports the `OP_SEGMENT` (`SEGSTR =
pointIndex*6+4`) opcode those lists use. **rb3-1 is the rb2-2 analogue:** a pure
data-transcription chore that closes that gap and unblocks render (rb3-3) and
targets (rb3-4).

1. **Frame cadence — the same load-bearing constraint (findings §1).** Tick the
   sim **one step per calculation frame** (`CALCNT=0x18`=24 NMIs → **~10.42 Hz /
   96 ms**), never the 62.5 Hz display refresh (the Red Baron ÷N trap). Ground
   shells launch **÷4 calc-frames** (`FRAME&3`, ~384 ms); mountain scroll and
   the terrain-crash test run every calc-frame. rb1's `timing.ts` already encodes
   this — every rb3 motion/fire routine runs at the calc-frame cadence.

2. **Ground wave = a MODE, entered by wave alternation (findings §4).** Play
   alternates PLANE and GROUND waves: a `NEWCT` countdown steps `MODECT`, whose
   **LSB** selects `STPLNE` (plane) vs `INITGR` (ground); inter-wave counts
   `MCOUNT: 4,2,3,2,1,3,4,2`. rb2-7 landed `MODECT`/`MCOUNT` but always branched
   plane. rb3-2 wires the LSB to actually enter ground mode: `INITGR` sets
   `GRMODE=0C0` (**D7 ground + D6 plane-disable**) so the main loop skips
   new-plane generation and slows control. `.LEVLS=5` is the difficulty
   **ceiling** reached via kills (§3), not a discrete stage count.

3. **Control is forced slow in ground mode (findings §2).** `DISCHK` normally
   scales control feel by nearest-object proximity (close ×1.0 / mid ×0.625 /
   far ×0.375); **ground mode is forced to the slow band** regardless of
   distance. Reuse `flight.ts` `FlightInput.proximity` — ground mode pins it, it
   does not introduce a second control path.

4. **Two ground death channels — neither is a per-pixel hit (findings §5(b)).**
   (a) **Ground fire** (`SHLAUN`): active emplacements lead/aim a shell at the
   player, launched **only 1 of 4 frames** and **only at `GMLEVL ≥ 2`** ("NO
   GROUND SHELLS @ LOWER LEVELS"); the active shell budget grows with level
   (`GRSLVL: 0,14,42,70`). (b) **Terrain crash:** when a mountain reaches min
   depth, `SCENE2` runs `PLYCOL` (window `PCDX=0C1`, `PCDY=60`) and on contact
   sets `GREND` D6 "GROUND COLLISION", aborting the frame ("PLAYER RAN INTO
   GROUND"). rb2 clamped altitude (`I4YPOS 8*4..180*4`) precisely so you can
   **only** crash in the ground wave — terrain bites HERE, nowhere else.

5. **Ground targets: active vs passive by geometry, taxonomy UNLABELED (findings
   §4, §9 gap #4).** `GRDISP` draws objects via `PFOCOL` outlines; **type index
   ≥ 4 = active gun emplacement** (returns fire), **< 4 = passive**. The ROM does
   **not** label what each object *is* (tank/tent/gun) — only geometry +
   active/passive. **Do not invent named object types**; carry only the
   active/passive split the source proves.

6. **Scoring rewards closing, unchanged from rb2 (findings §4).** Strafed targets
   score `PLVALU = depth × VALFRC` — **closer kills worth more** (reuse
   `scoring.ts`); kills bump `OBJKLD`, which drives `GMLEVL`.

**Guardrails (standing arcade rules):**
- **ROM is canonical** — the fidelity spec is authoritative over playtest-tuned
  curves; on conflict, follow the ROM.
- **Don't gold-plate** — ratchet aggression **up to** the `GMLEVL 5` ceiling,
  never past; the deep-level delta tables (§9 gap #5) are confirmed escalating
  but not exhaustively traced — do not over-invest in waves nobody reaches.
- **Reuse before you build** — the table above is a hard constraint, not a
  suggestion. A new module in rb3 needs an explicit reason the existing one
  cannot be extended.
- **Consume `@arcade/shared`, don't port** — the camera stays on shared
  `math3d`; the ground sim, collision, and shells stay **local** (game-specific
  code is never shared).
- **red-baron ships via PRs to `develop`** — Dev pushes the feature branch; SM
  finishes via a **PR into `develop`**. `main` is production via release.

### Sequencing — first-playable ground slice at story 4

**rb3-1 (data) → rb3-2 (mode) → rb3-3 (landscape) → rb3-4 (targets)** land the
**first-playable ground slice**: enter a ground wave, fly the low mountain-pass
run, strafe targets, score them. **rb3-1 unblocks rb3-3 AND rb3-4** (the rb2-2 →
rb2-3 pattern). **rb3-5 (ground fire)** and **rb3-6 (terrain crash)** add the two
death channels; **rb3-7** is the live playtest pass.

**⚠ The one ordering risk — rb3-6 ↔ rb2-9.** The terrain-crash death (rb3-6) must
feed the **same** `ENDLFE → DEC LIVES → INITIAL` respawn + `WO.CNT(5)`
spawn-grace path as **rb2-9 (Lives + death sequence + respawn)**, which is **still
BACKLOG**. Two clean options: (a) sequence rb2-9 before rb3-6, or (b) land a
death-signal seam in rb3-6 (emit a "player died: ground" event) and wire the
shared respawn when rb2-9 lands. Do **not** duplicate the death/respawn sequence
inside rb3. Related backlog rb2 items (rb2-8 ace is done; rb2-10 blimp, rb2-11
POKEY sound, rb2-12 playtest) are independent of rb3.

**Out of scope:** ATTRACT (rb4) and HIGH-SCORE (rb5).

---
_Authored by the Architect (Emmanuel Goldstein) from the rb3 fidelity spec (§4/§5/§7) + the rb2 slice already on develop._
