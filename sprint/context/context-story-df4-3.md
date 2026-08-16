# Story df4-3 Context

## Title
Landers + humanoid abduction (the signature loop): plugins/defender/src/core/ enemy reducers for the LANDS0 lander process (START LANDERS, defender/DEFB6.SRC:649,657 — a scheduler process), the LANDER KIDNAP grab (defender/DEFB6.SRC:688), the ASTRONAUT humanoid process (defender/DEFB6.SRC:290), and the shot-carrier -> AFALL falling-humanoid chain (KILL KIDNAPPING LANDER, defender/DEFB6.SRC:903,911). The grab -> carry-to-top -> transform-trigger loop that is Defender's heart. FIRST map the ROM labels to arcade enemy names in the dossier, CITED, before naming the reducer. Consumes df4-1 (collision) + df4-2 (materialize/explode).

## Metadata
- **Story ID:** df4-3
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Defender — the menagerie (phase 4b): one cited reducer per enemy, the shared collision seam, and the first effects that kill — with the photosensitivity accessibility exception decided here

## Problem
SCORING for a rescued/dropped humanoid (P250/P500, defender/DEFB6.SRC:408,496-503) is OUT OF SCOPE — that is df5. df4-3 delivers the abduction MECHANIC (grab, carry, fall on carrier-death), not the points. Enemies are df3 scheduler processes (NEWP,STYPE); no per-enemy tick. Colour by df2 palette index only.

This is the signature loop that makes Defender *Defender*: a lander descends, grabs a humanoid, carries it to the top of the screen, and (if it survives) transforms — the transform trigger this story arms is consumed by df4-4's mutant. It is the first enemy story, so it also exercises the df4-1 collision seam and the df4-2 explode effect for the first time in anger.

## Technical Approach
**Identity mapping FIRST (cited, before naming any reducer).** The Williams source names these in its internal vocabulary; map each `<ROM label>` → arcade enemy in the brief/dossier, citing the process LABEL + the source's own comment. A wrong identity in prose ships GREEN — do not guess. Labels for this story:

| ROM label | Banner / line | Arcade role (to be cited, not assumed) |
|-----------|---------------|----------------------------------------|
| `LANDS0` | `*START LANDERS` `defender/DEFB6.SRC:649,657` | the base ground enemy (Lander) |
| `*LANDER KIDNAP` | `defender/DEFB6.SRC:688` | the grab behaviour |
| `*ASTRONAUT PROCESS` | `defender/DEFB6.SRC:290` | the humanoid |
| `*KILL KIDNAPPING LANDER` → `AFALL` | `defender/DEFB6.SRC:903,911` | shot carrier → humanoid falls |

Then the reducers, all as **df3 scheduler processes** (spawned via `NEWP …,STYPE`, killed via the df3 kill path — no `requestAnimationFrame`, no private tick):

- **Lander process** (`LANDS0`): spawn, descend, seek a humanoid. Colour by df2 palette index only.
- **Grab** (`*LANDER KIDNAP`): a lander that reaches a humanoid attaches it and reverses to carry-to-top.
- **Astronaut process** (`*ASTRONAUT`): the humanoid entity on the ground / while carried.
- **Carrier-death → fall** (`AFALL`): when the collision seam (df4-1) reports the carrying lander shot, the humanoid detaches and falls (`AFALL`); the lander dies via the df4-2 explode effect.
- **Transform trigger:** a lander that reaches the top with its humanoid arms the lander→mutant transform — this story *sets up* the trigger; df4-4 consumes it.

Consumes: df4-1 (collision: laser-vs-object kills the carrier, ship-vs-object touches a lander), df4-2 (the appear/explode lifecycle), df3 scheduler + world (`worldX`, display space), df2 framebuffer (index blit), df2-4 INERT lander/astronaut pictures.

## Scope
- **In scope:** the cited label→enemy mapping in the dossier; the lander/grab/astronaut/AFALL reducers as scheduler processes; the grab → carry-to-top → transform-trigger loop; carrier-death drops the humanoid; death via the df4-2 accessibility-safe explosion; claims entries for every new constant; purity + citations stay green.
- **Out of scope:** SCORING for rescue/drop (P250/P500 `defender/DEFB6.SRC:408,496-503` — df5, named only to be avoided); the mutant the lander becomes (df4-4 — this story only arms the trigger); humanoid rescue-to-ground / fall-to-planet / mutant-space (df5); waves, scanner, smart-bomb, hyperspace (df5).

## Acceptance Criteria
> _Derived from the design spec (§4, §6) and the ROM citations below; candidate ACs for TEA to finalize during the RED phase._
- **AC1 (identity mapping, cited):** the dossier maps `LANDS0`→Lander, `*ASTRONAUT`→humanoid, and the grab/`AFALL` behaviours to their arcade names, each citing the process LABEL + the source's own comment (`defender/DEFB6.SRC:649,657,688,290,903,911`) before any reducer is named. A prose identity claim without a citation reddens.
- **AC2 (lander is a scheduler process):** the lander reducer is spawned/killed via the df3 scheduler (`NEWP …,STYPE`), owns no `requestAnimationFrame` / private clock; a test asserts it advances only under `stepTick()`.
- **AC3 (the abduction loop):** a lander that reaches a humanoid grabs it (`*LANDER KIDNAP` :688) and carries it upward; state is verifiable at each phase (seeking → carrying → at-top). Boundary behaviour pinned by coordinates.
- **AC4 (carrier-death → fall):** when the df4-1 collision seam reports the carrying lander shot (`*KILL KIDNAPPING LANDER` :903,911), the humanoid detaches and falls (`AFALL`), and the lander dies via the df4-2 accessibility-safe explosion (no full-screen strobe).
- **AC5 (transform trigger armed):** a lander that reaches the top with its humanoid arms the lander→mutant transform trigger consumed by df4-4; the trigger is observable in state.
- **AC6 (gate + purity + colour):** every new constant has a `claims/*.json` entry verified byte-for-byte under the df1-1 gate; `purity.test.ts` and `citations.test.ts` stay green; all visuals reach colour by df2 palette **index only**, no hex.

## Dependencies
- **df4-1** — collision seam (kills the carrier, touches the ship).
- **df4-2** — appear/explode lifecycle + the accessibility-safe death.
- **df3** — scheduler + world coordinate model.
- **df2 / df2-4** — framebuffer + INERT lander/astronaut image tables.
- **Feeds:** df4-4 (the lander→mutant transform trigger).

## Design Notes
- **Enemy identity is a cited mapping, not a guess** (design spec §4, §7). Map ROM labels → arcade names in the dossier, cited, before naming the reducer.
- **Enemies are scheduler processes** — never a private tick. **Colour by index only.** **Line numbers from tool output only; RASM radix.**
- Full rationale: `docs/superpowers/specs/2026-08-16-defender-df4-menagerie-design.md` §4, §6 (story 3).

---
_Generated by `pf context create story df4-3` from the sprint YAML._
