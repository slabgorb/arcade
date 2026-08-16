# Story df4-5 Context

## Title
Bombers, mines, pods & swarmers, probes: plugins/defender/src/core/ reducers for START BOMB (defender/DEFB6.SRC:1134), the TIE process (defender/DEFB6.SRC:1023-1024, own colour table :1206), the MSWM mini-swarmer + MINI SWARM PROCESS + SWARM BOMB (defender/DEFB6.SRC:141,151,195,251), and PROBE START (defender/DEFB6.SRC:85,116) — including the shoot-releases-swarmers mechanic. FIRST map each ROM label to its arcade enemy name in the dossier, CITED. Consumes df4-1 + df4-2.

## Metadata
- **Story ID:** df4-5
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Defender — the menagerie (phase 4b): one cited reducer per enemy, the shared collision seam, and the first effects that kill — with the photosensitivity accessibility exception decided here

## Problem
This story carries the most process surface of the enemy stories; if the pod->swarm spawn (MSWM materialization off a parent) proves heavy, expect it to FILE a follow-up rather than bloat (the roadmap file-by-surface habit). Enemies are df3 scheduler processes; colour by df2 palette index only.

It closes out the menagerie: the remaining four enemy families (bomber/mine, TIE mine-layer, pod→swarm, probe), each a df3 scheduler process, each colliding through df4-1 and dying through the df4-2 accessibility-safe explosion. The signature mechanic here is **shoot-releases-swarmers**: destroying a pod releases a cloud of mini-swarmers.

## Technical Approach
**Identity mapping FIRST (cited).** Map each `<ROM label>` → arcade enemy in the dossier, citing the process LABEL + the source's own comment. Labels for this story:

| ROM label | Banner / line | Arcade role (to be cited, not assumed) |
|-----------|---------------|----------------------------------------|
| `*START BOMB` | `defender/DEFB6.SRC:1134` | bomb / mine |
| `*TIE PROCESS` | `defender/DEFB6.SRC:1023-1024` (own colour table `:1206`) | mine-layer candidate |
| `MSWM` / swarm | `*MAKE A MINI SWARMER` `:141,151`; `*MINI SWARM PROCESS` `:195`; `*SWARM BOMB` `:251` | pod → swarmers |
| `*PROBE START` | `defender/DEFB6.SRC:85,116` | probe |

Then the reducers, all **df3 scheduler processes** (`NEWP …,STYPE`; no private tick):

- **Bomb / mine** (`*START BOMB` :1134): a placed hazard.
- **TIE** (`*TIE PROCESS` :1023-1024): note it has its **own colour table** (`:1206`) — still reached by df2 palette **index**, not hex; cite the table.
- **Pod → swarm** (`MSWM`): the pod, and the **shoot-releases-swarmers** mechanic — destroying the parent materialises mini-swarmers (`*MAKE A MINI SWARMER` :141,151), which run the mini-swarm process (:195) and drop swarm bombs (`*SWARM BOMB` :251). If this spawn-off-a-parent proves heavy, **file a follow-up** rather than bloat the story.
- **Probe** (`*PROBE START` :85,116).

Consumes: df4-1 (collision), df4-2 (appear/explode + safe death), df3 scheduler/world, df2 framebuffer + INERT pictures.

## Scope
- **In scope:** the cited label→enemy mappings; the bomb/mine, TIE, pod→swarm, and probe reducers as scheduler processes; the shoot-releases-swarmers materialization; the TIE colour table cited and reached by index; claims entries; purity + citations green; colour by index.
- **Out of scope:** landers/mutants/UFO (df4-3, df4-4); scoring (df5); waves, scanner, smart-bomb, hyperspace, 2P (df5). A heavy pod→swarm surface is a **follow-up filing**, not in-story bloat.

## Acceptance Criteria
> _Derived from the design spec (§4, §6) and the ROM citations below; candidate ACs for TEA to finalize during the RED phase._
- **AC1 (identity mapping, cited):** the dossier maps `*START BOMB`→bomb/mine, `*TIE PROCESS`→its arcade role, `MSWM`→pod/swarmers, and `*PROBE START`→probe, each citing the process LABEL + the source's own comment (`defender/DEFB6.SRC:1134,1023,141,151,195,251,85`). An un-cited prose identity claim reddens.
- **AC2 (all are scheduler processes):** each reducer is spawned/killed via the df3 scheduler and advances only under `stepTick()` — no private clock.
- **AC3 (shoot-releases-swarmers):** destroying a pod materialises mini-swarmers (`*MAKE A MINI SWARMER` :141,151) that run the mini-swarm process (:195); the spawn count/behaviour is cited and verifiable in state.
- **AC4 (TIE colour table, by index):** the TIE's own colour table (`defender/DEFB6.SRC:1206`) is cited and reached through the df2 palette by **index**, never a hex literal.
- **AC5 (collision + safe death):** each enemy collides via the df4-1 seam and dies via the df4-2 explode path with no full-screen strobe.
- **AC6 (gate + purity + colour):** every new constant has a `claims/*.json` entry verified byte-for-byte under the df1-1 gate; `purity.test.ts` and `citations.test.ts` stay green; colour by df2 palette **index only**.

## Dependencies
- **df4-1** — collision seam.
- **df4-2** — appear/explode + accessibility-safe death.
- **df3 / df2 / df2-4** — scheduler, world, framebuffer, INERT pictures (incl. the TIE picture).

## Design Notes
- **Enemy identity is a cited mapping, not a guess** (design spec §4, §7).
- **File-by-surface habit:** the pod→swarm spawn is the likely follow-up if heavy — file it, don't bloat (design spec §6 story 5).
- **Enemies are scheduler processes; colour by index (TIE table included); line numbers from tool output only; RASM radix.**
- Full rationale: `docs/superpowers/specs/2026-08-16-defender-df4-menagerie-design.md` §4, §6 (story 5).

---
_Generated by `pf context create story df4-5` from the sprint YAML._
