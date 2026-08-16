# Story df4-4 Context

## Title
Mutants (SCZ/'SCHITZO') + the UFO pursuer: plugins/defender/src/core/ reducers for the SCZS0/SCZ0 schizoid process (START SCHITZOS, defender/DEFB6.SRC:585,592 — the mutant a lander becomes on reaching the top) and the UFOST/UFOLP process (UFO PROCESS START, defender/DEFB6.SRC:5,25 — velocity defender/DEFB6.SRC:48, shoot logic; the timeout pursuer). FIRST map both ROM labels to their arcade enemy names in the dossier, CITED (the UFO->baiter mapping in particular is a claim, not an assumption). Consumes df4-1 + df4-2; the lander->mutant transform trigger is set up by df4-3.

## Metadata
- **Story ID:** df4-4
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Defender — the menagerie (phase 4b): one cited reducer per enemy, the shared collision seam, and the first effects that kill — with the photosensitivity accessibility exception decided here

## Problem
Two enemies with a shared theme of *aggression toward the player*: the **mutant** a lander becomes when it carries a humanoid to the top (the `SCZ`/"schizoid" process), and the **UFO pursuer** that appears on a timeout to hunt a camping player. Both are df3 scheduler processes; both reach colour by df2 palette index only. The lander→mutant transform trigger they depend on is armed by df4-3.

The identity mapping is a genuine claim here, not a formality: the ROM's internal `UFO`/`SCZ` labels do **not** map 1:1 to the arcade-marketing names, and the `UFO`→Baiter mapping in particular must be cited from the source, not assumed from behaviour.

## Technical Approach
**Identity mapping FIRST (cited).** Map each `<ROM label>` → arcade enemy in the dossier, citing the process LABEL + the source's own comment. A wrong identity in prose ships GREEN. Labels for this story:

| ROM label | Banner / line | Arcade role (to be cited, not assumed) |
|-----------|---------------|----------------------------------------|
| `SCZS0` / `SCZ0` | `*START SCHITZOS` `defender/DEFB6.SRC:585,592` | the mutant (a lander that reached the top) |
| `UFOST` / `UFOLP` | `*UFO PROCESS START` `defender/DEFB6.SRC:5,25` | the timeout pursuer (UFO→Baiter — a cited claim) |

Then the reducers, both as **df3 scheduler processes** (`NEWP …,STYPE`; no private tick):

- **Schizoid / mutant** (`SCZS0`/`SCZ0`): spawned by the df4-3 lander→mutant **transform trigger** when a lander reaches the top with its humanoid. Mutant pursuit/shoot behaviour per the process; dies via the df4-2 explode effect; colliders via df4-1.
- **UFO pursuer** (`UFOST`/`UFOLP`): a timeout-spawned hunter. Port its velocity (`defender/DEFB6.SRC:48`) and shoot logic. It is the anti-camping pursuer.

Consumes: df4-1 (collision), df4-2 (appear/explode + safe death), df4-3 (the transform trigger that creates the mutant), df3 scheduler/world, df2 framebuffer + INERT pictures.

## Scope
- **In scope:** the cited `SCZ`→mutant and `UFO`→pursuer mappings; both reducers as scheduler processes; the mutant spawned off the df4-3 transform trigger; UFO velocity + shoot logic cited from ROM; death via the accessibility-safe df4-2 explosion; claims entries; purity + citations green; colour by index.
- **Out of scope:** the lander/grab/astronaut mechanics themselves (df4-3); bombers/mines/pods/swarmers/probes (df4-5); scoring (df5); waves, scanner, smart-bomb, hyperspace, mutant-space, 2P (df5).

## Acceptance Criteria
> _Derived from the design spec (§4, §6) and the ROM citations below; candidate ACs for TEA to finalize during the RED phase._
- **AC1 (identity mapping, cited):** the dossier maps `SCZS0`/`SCZ0`→mutant and `UFOST`/`UFOLP`→the arcade pursuer, each citing the process LABEL + the source's own comment (`defender/DEFB6.SRC:585,592,5,25`); the UFO→Baiter mapping is explicitly cited, not asserted from behaviour. An un-cited prose identity claim reddens.
- **AC2 (mutant off the transform trigger):** the schizoid/mutant reducer is spawned by the df4-3 lander→mutant transform trigger (not self-spawned); a test drives a lander to the top and asserts a mutant appears.
- **AC3 (both are scheduler processes):** both reducers are spawned/killed via the df3 scheduler and advance only under `stepTick()` — no private clock.
- **AC4 (UFO velocity + shoot, cited):** the UFO's velocity (`defender/DEFB6.SRC:48`) and shoot logic are ported and cited; behaviour is verifiable in state and pinned by coordinates where motion is asserted.
- **AC5 (death is accessibility-safe):** both enemies die via the df4-2 explode path with no full-screen strobe; they collide via the df4-1 seam.
- **AC6 (gate + purity + colour):** every new constant has a `claims/*.json` entry verified byte-for-byte under the df1-1 gate; `purity.test.ts` and `citations.test.ts` stay green; colour by df2 palette **index only**.

## Dependencies
- **df4-1** — collision seam.
- **df4-2** — appear/explode + accessibility-safe death.
- **df4-3** — arms the lander→mutant transform trigger that spawns the mutant.
- **df3 / df2 / df2-4** — scheduler, world, framebuffer, INERT pictures.

## Design Notes
- **Enemy identity is a cited mapping, not a guess** (design spec §4, §7); the UFO→Baiter mapping is the canonical example of a claim to cite.
- **Enemies are scheduler processes; colour by index; line numbers from tool output only; RASM radix.**
- Full rationale: `docs/superpowers/specs/2026-08-16-defender-df4-menagerie-design.md` §4, §6 (story 4).

---
_Generated by `pf context create story df4-4` from the sprint YAML._
