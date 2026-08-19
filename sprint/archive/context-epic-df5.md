# Epic df5 Context

## Title
Defender — game structure & the scanner (phase 4c): waves, scoring + extra men, the humanoid rescue loop and the planet-explodes-to-mutant-space panic, the two emergency powers (smart-bomb + hyperspace, citing ADR-0005), and the pure end-of-game core

## Overview
Fifth Defender epic and phase 4c of the framebuffer-raster cabinet build
(docs/playbooks/next-sprite-game.md). df4 populated the world — enemies materialize,
move, collide and die safely (ADR-0005) — but they attack in no waves, nothing is
scored, no humanoid can be rescued, the ship has no emergency powers, the radar is
dark, and the game never ends. df5 is the STRUCTURE that turns the menagerie into a
game. It builds: the SCANNER (src/core/scanner.ts — port SCNR's world->radar
projection, AMODE1.SRC:1180, bezel :1225, reading the df3 world.ts model; gameplay-
critical, not HUD garnish); the WAVE DIRECTOR (src/core/waves.ts — WVTAB attackers/
size/time per wave, BLK71.SRC:676-689, plus the "new guys every Nth wave" escalation
GTWV00 DEFA7.SRC:1859); SCORING + the men counter + the EXTRA MAN (src/core/score.ts —
the humanoid P250/P500 pop-ups DEFB6.SRC:499,506, the BONUS collect DEFA7.SRC:1788);
the humanoid RESCUE loop and the signature PLANET-EXPLODES-TO-MUTANT-SPACE panic
(catch a falling humanoid AFALL DEFB6.SRC:927 -> return to ground; all humanoids lost
-> planet explodes -> every lander becomes a df4-4 mutant/SCZ, en masse); the two
player EMERGENCY POWERS (src/core/powers.ts — smart-bomb SBOMB DEFA7.SRC:3175 and
hyperspace HYPER :3213, random dir :3228); and the pure END-OF-GAME core (men<0 ->
game-over, final score -> hall of fame via @shared/highscore + @shared/name-entry,
HALLOF AMODE1.SRC:119; the CMOS coin/credit ledger ROMF8.SRC:16-38 -> one-origin
localStorage). Stands entirely on shipped seams (df1 dossier+gate+purity; df2
framebuffer/palette/charset; df3 scheduler/world/ship/laser; df4 collision/effects/
the menagerie + the ADR-0005 policy). Introduces NO new enemy and NO new picture.
Every constant re-opens under the df1-1 gate: no src/core value without a claims/*.json
entry citing defender/<FILE>.SRC:<line>; all line numbers from tool output only (RASM
radix trap: $hex vs bare decimal).
DECISION A (RULED, ROM-always-wins): the scanner ports SCNR's own world->radar
projection (AMODE1.SRC:1180), cited, reading the ONE df3 world.ts model — NOT a
re-derived "divide world width by radar width" minimap, which would silently misplace
the $10000 wrap seam and the off-camera attackers the player relies on the radar to
see (routing != geometry, the df3 lesson). scanner.ts is pure, tested against
synthetic object lists BEFORE the HUD draws it; this is df5-1, first.
DECISION B (RULED): smart-bomb and hyperspace CITE ADR-0005, they do not re-decide it.
The ROM smart-bomb is SBMBX0 COM PCRAM (DEFA7.SRC:3199) — a whole-page invert — and
hyperspace flashes on re-entry; both are exactly the full-frame strobes the df4-2
render guard forbids. df5 ports the ROM trigger+timing and routes the PRESENTATION
through the existing df4-2 effect-policy (freeze/fade/particle); the df4-2 guard stays
GREEN with these effects live, and each substitution is logged as a 6-field Design
Deviation citing docs/adr/0005-photosensitivity-accessibility-exception.md.
DECISION C (RULED): the end of the game is PURE-FIRST here, phase-wired in df7 (the
pm4/mc6 "pure first, wired after" split). df5 ships the men-counter/game-over reducer
and the hall-of-fame + localStorage persistence; df7 wires it into the attract->play->
death->game-over phase machine and renders the screens. df5 ships no attract loop.
DECISION D (RULED, scope): two-player alternating handoff DEFERS to df7. The player-
switch (P1SW/P2SW, PLAYER START PROCESS, DEFA7.SRC:1179-1237) is the death->next-player
transition — phase-machine territory df7 builds — and the cocktail screen-flip it
drives is documented-not-ported (arcade is desktop-only, upright). df5 is the complete
SINGLE-PLAYER game loop; 2P citations are preserved in the design spec.
Reuse-first: df3 world.ts (scanner projects it), df3 scheduler.ts (waves/bonus/AFALL/
powers are processes), df4-1 collision.ts (smart-bomb clear + catch test), df4-2
effects.ts + the ADR-0005 policy (power presentation), df4-3 abduction/AFALL (rescue
extends it), df4-4 SCZ mutant (the panic spawns these), and @shared/highscore +
@shared/name-entry (the hall of fame — CONSUMED, not re-implemented). No new @shared
extraction (the scanner is the ROM's projection with no second consumer; the wave
director/scoring/panic are Defender-specific game structure — the "extract on the
second game" bar is not met). IDENTITY IS A CITED DOSSIER TASK, NOT A GUESS: the
df4 law now applies to VALUES — P250/P500 and which rescue event pays which are pinned
in the dossier from the ROM before the reducer is named; a wrong point value in prose
ships GREEN.
Design + full story rationale: docs/superpowers/specs/2026-08-17-defender-df5-game-structure-scanner-design.md;
roadmap parent: docs/superpowers/specs/2026-08-13-defender-cabinet-roadmap-and-df1-design.md sec 4 df5 (approx 24 pts).
Traps carried in: scoring values are a cited mapping not a guess; ADR-0005 is cited not
re-decided (guard stays green); the scanner projects the ONE world model (no second
coordinate system); enemies/powers/bonus are scheduler processes (no per-subsystem rAF);
colour by index only; the hall of fame is @shared not new code; line numbers from tool
output only; RASM radix.
OUT OF SCOPE: attract mode + the attract->play->death->game-over PHASE MACHINE + HUD
render + lobby showcase (df7); 2P alternating handoff (df7, Decision D); sound (df6);
hardening/mutation batteries (df8+).

## Metadata
- **Epic ID:** df5
- **Repo:** arcade

## Background
_Cross-story constraints and guardrails to be filled in as the epic
progresses._

---
_Generated by `pf context create epic df5` from the sprint YAML._
