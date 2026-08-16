# Epic df4 Context

## Title
Defender — the menagerie (phase 4b): one cited reducer per enemy, the shared collision seam, and the first effects that kill — with the photosensitivity accessibility exception decided here

## Overview
Fourth Defender epic and phase 4b of the framebuffer-raster cabinet build (docs/playbooks/next-sprite-game.md). df3 gave us a ship flying a scrolling, wrapping world with lasers that fire and travel but hit nothing; df4 populates that world. It builds: the SHARED collision seam ported from the ROM's own COLIDE object-pointer-list hit test (src/core/collision.ts — COLIDE defender/DEFA7.SRC:2904-2907, collision-picture return :2553, screen-collision addr CENTMP :3008, and the three cited query shapes: laser :2775-2787, bomb :2699, ship :3130-3142); the materialize/explode effects (src/core/effects.ts — SAMEXAP7 'SAM EXPLOSIONS AND APPEARANCES' APST appear / EXST explode, defender/SAMEXAP7.SRC:16-17, over the df2-4 INERT image tables); and one cited reducer per enemy family (the DEFB6.SRC enemy processes, each a scheduler process spawned via NEWP,STYPE). Stands on df1 (dossier + citation gate + src/core purity test), df2 (framebuffer render seam + palette + charset + object/terrain tables — pixels, INERT) and df3 (scheduler, world/camera, ship, stars, laser). Every constant df4 introduces re-opens under the df1-1 gate: no src/core value without a claims/*.json entry citing defender/<FILE>.SRC:<line>. DECISION A (RULED, ROM-always-wins): port COLIDE's own object-list model into core, cited, NOT a re-derived quadtree/AABB — a cleaner hit test would silently change which overlaps count (routing != geometry, the df3 lesson); collision.ts is pure, tested against synthetic object lists BEFORE any enemy exists, so every enemy story inherits a ready gated hit test — this is df4-1, first. DECISION B (RULED, the ONE standing exception to ROM-always-wins — docs/adr/0005-photosensitivity-accessibility-exception.md, authored at this epic's kickoff): the ROM's full-screen strobe effects (player death/terrain explosion TERBLO DEFB6.SRC:434,437 + SAMEXAP7 EXST; smart-bomb SBOMB COM PCRAM DEFA7.SRC:3199 and hyperspace HYPER DEFA7.SRC:3211 are df5) are a seizure trigger for the owner (photosensitive epilepsy); they become freeze/fade/particle. The ROM trigger + timing are ported and cited; only the strobe PRESENTATION is substituted, logged as a Design Deviation citing ADR-0005, and pinned by a render-side guard that no effect writes a whole-framebuffer inversion in a single frame. df4 DECIDES this (df4-2 builds the policy module + guard, before any death renders); df5/df7 CITE it. ENEMY IDENTITY IS A CITED DOSSIER TASK, NOT A GUESS: the Williams source names enemies in its INTERNAL vocabulary (UFO/PROBE/TIE/SCZ/'SCHITZO'/MSWM) which does NOT map 1:1 to the arcade-marketing names (Lander/Mutant/Baiter/Bomber/Pod/Swarmer); each enemy story cites the process LABEL + the source's own comment and maps <ROM label> -> arcade enemy in the brief/dossier, CITED, before writing the reducer — a wrong identity in prose ships GREEN. Reuse-first: df3 scheduler.ts (enemies ARE processes), df3 world.ts (display space + worldX helper), df2 framebuffer.ts/render.ts (index blit — colour by INDEX only, never hex), df2-4 DEFB6/SAMEXAP7 INERT image tables (df4 gives the already-byte-verified pictures behaviour — no re-transcription), df3 laser.ts (the thing that finally hits). No new @shared extraction (enemy reducers are defender-specific; the collision model is the ROM's with no second consumer — the 'extract on the second game' bar is not met). Design + full story rationale: docs/superpowers/specs/2026-08-16-defender-df4-menagerie-design.md; roadmap parent: docs/superpowers/specs/2026-08-13-defender-cabinet-roadmap-and-df1-design.md sec 4 df4 (approx 21 pts). Traps carried in: enemy identity is a cited mapping not a guess; enemies are scheduler processes (no per-enemy rAF/tick); colour by index only; ADR-0005 guard lands with df4-2 not retrofitted; line numbers from tool output only; RASM radix ($hex vs bare decimal). OUT OF SCOPE (df5): scoring + extra men (P250/P500 DEFB6.SRC:408,496-503 are named ONLY to be avoided), waves (WVTAB BLK71), smart bomb, hyperspace, humanoid rescue/fall-to-planet/mutant-space, the scanner (radar), 2P handoff, game over. Also out: sound (df6), attract->play phase machine/HUD/showcase (df7), hardening/mutation batteries (df8+).

## Metadata
- **Epic ID:** df4
- **Repo:** arcade

## Background

Cross-story constraints and guardrails every df4 story inherits. Full rationale in the
design spec (`docs/superpowers/specs/2026-08-16-defender-df4-menagerie-design.md`) and the
roadmap parent (`.../2026-08-13-defender-cabinet-roadmap-and-df1-design.md` §4). ADR:
`docs/adr/0005-photosensitivity-accessibility-exception.md`.

### Build order is load-bearing — collision and effects FIRST
The story sequence is not arbitrary: **df4-1 (collision) and df4-2 (effects) ship before any
enemy**, because every enemy family consumes both. Do not start an enemy reducer (df4-3/4/5)
until the shared seams exist and are gated. Dependency chain:
- **df4-1** → `collision.ts` — stands only on df1/df2/df3 (all shipped); RED-first entry point.
- **df4-2** → `effects.ts` + the ADR-0005 policy/guard — consumes df4-1, df2-4 tables, df2 framebuffer.
- **df4-3** (landers/abduction) → consumes df4-1 + df4-2; sets up the lander→mutant transform trigger.
- **df4-4** (mutants/UFO) → consumes df4-1 + df4-2; the transform trigger is armed by df4-3.
- **df4-5** (bombers/mines/pods/swarmers/probes) → consumes df4-1 + df4-2. Carries the most
  process surface; if pod→swarm spawn (MSWM off a parent) proves heavy, **file a follow-up
  rather than bloat** (the roadmap's file-by-surface habit).
- **df4-6** (visual playtest) → last; screenshots the safe explosion and the abduction loop.

### DECISION A (RULED) — port COLIDE, do not re-derive
`collision.ts` ports the ROM's own object-pointer-list box test (`COLIDE`,
`defender/DEFA7.SRC:2904-2907`), the collision-picture return (`RET+2=COLLISION PICT`, `:2553`)
and the screen-collision address model (`CENTMP`, `:3008`). A tidier quadtree/AABB would
silently change *which overlaps count* — routing ≠ geometry, the df3 lesson. The three query
shapes are distinct and each cited: laser-vs-object (`:2775-2787`), bomb-vs-player (`:2699`),
ship-vs-object (`:3130-3142`). Box-boundary cases are pinned by **coordinates**, not a bare
boolean, and a test names the object-list traversal so a swap to a cleaner structure reddens.
Pure, clock-free, tested against **synthetic** object lists — no enemy needed to build it.

### DECISION B (RULED) — the ADR-0005 accessibility exception is DECIDED and BUILT here
This is the **one standing exception to ROM-always-wins**, made because the owner has
photosensitive epilepsy. Full-screen strobe/inversion effects (player-death/terrain explosion
`TERBLO` `defender/DEFB6.SRC:434,437` + `SAMEXAP7` `EXST`; and df5's smart-bomb/hyperspace)
become **freeze / fade / localized particle**. The ROM *trigger and timing* are ported and
cited as usual (covered by `citations.test.ts`); **only the strobe presentation is substituted**.
Hard requirements, all landing with **df4-2, before any death renders** (not retrofitted):
1. A pure effect-policy classifier in `src/core/` distinguishes *localized* (raster normally)
   from *full-frame-strobe* (safe variant).
2. The substitution is logged as a **6-field Design Deviation** in the session file citing
   ADR-0005 as the spec source.
3. A **render-side guard** asserts no effect path writes a whole-framebuffer inversion/white-fill
   in a single frame, **mutation-proven** (a planted full-frame inversion reddens it). This guard
   is the mechanism ADR-0005 requires so a later refactor cannot silently reintroduce the strobe.

df5 (smart-bomb `SBOMB`/`COM PCRAM` `DEFA7.SRC:3199`, hyperspace `HYPER` `:3211`) and df7
**cite** this policy; they do not re-decide it.

### Enemy identity is a CITED dossier mapping, not a guess
The Williams source names enemies in its **internal** vocabulary (`UFO`/`PROBE`/`TIE`/`SCZ`/
`SCHITZO`/`MSWM`) which does **not** map 1:1 to arcade-marketing names (Lander/Mutant/Baiter/
Bomber/Pod/Swarmer). Each enemy story's **first task** is to map `<ROM label>` → arcade enemy
in the brief/dossier, citing the process LABEL + the source's own comment, **before naming the
reducer**. A wrong identity in prose ships GREEN (the unguarded-surface lesson). The
`UFO`→baiter mapping in particular is a claim to be cited, not an assumption. ROM label index:

| ROM label | Banner / line | Story |
|-----------|---------------|-------|
| `LANDS0`, `*LANDER KIDNAP`, `*ASTRONAUT`, `AFALL` | `DEFB6.SRC:657,688,290,903/911` | df4-3 |
| `SCZS0`/`SCZ0`, `UFOST`/`UFOLP` | `DEFB6.SRC:585/592, 5/25` | df4-4 |
| `*START BOMB`, `*TIE PROCESS`, `MSWM`/swarm, `*PROBE START` | `DEFB6.SRC:1134, 1023, 141/151/195/251, 85` | df4-5 |

### Standing df* guardrails (carried in, do not re-discover)
- **Citation gate (df1-1):** no `src/core` constant without a `claims/*.json` entry citing
  `defender/<FILE>.SRC:<line>`, verified byte-for-byte against `reference/original-source/defender/`.
  Every constant df4 introduces re-opens under this gate.
- **Enemies are scheduler processes** — spawned via `NEWP …,STYPE`, killed via the df3 kill
  path. Never give an enemy its own `requestAnimationFrame` or private tick.
- **Colour by INDEX only** — reach the df2 palette by index; no enemy introduces a hex colour.
  (See the millipede colour-fill gotcha: fills use `indexToRgba(...)`, never a hex literal.)
- **Line numbers from tool output only; RASM radix** (`$hex` vs bare decimal) — the standing
  `df*` citation traps.
- **Purity stays green** — `purity.test.ts` must pass; no fetch/canvas/`Date`/`Math.random` in
  `src/core`.

### Reuse-first ledger — no new @shared extraction
Consumes (built + gated): `scheduler.ts`, `world.ts` (display space + `worldX`),
`framebuffer.ts`/`render.ts` (index blit), the `DEFB6`/`SAMEXAP7` INERT image tables (df2-4 —
df4 gives already-byte-verified pictures *behaviour*, no re-transcription), `laser.ts` (the
thing that finally hits). Writes: `collision.ts`, `effects.ts`, one reducer per enemy family,
the no-full-frame-strobe guard, new `claims/*.json`. The enemy reducers are defender-specific
and the collision model is the ROM's with no second consumer — the "extract on the second game"
bar is **not** met.

### Scope fence — what is df4 vs df5+
df4 delivers enemy **existence, motion, spawning, collision and death** only. **OUT of df4:**
scoring + extra men (`P250`/`P500` `DEFB6.SRC:408,496-503` — named ONLY to be avoided), waves
(`WVTAB` BLK71), smart bomb, hyperspace, humanoid rescue/fall-to-planet/mutant-space, the
scanner (radar), 2P handoff, game over — **all df5**. Also out: sound (df6); attract→play phase
machine / HUD / showcase (df7); hardening / mutation batteries (df8+).

---
_Generated by `pf context create epic df4` from the sprint YAML._
