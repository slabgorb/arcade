# Epic df7 Context

## Title
Defender phase machine + attract + wiring + HUD + showcase (df7, phase 6-7): turn df1-df6's pure cores into a played-start-to-finish cabinet — the attract->setup->play->death->game-over phase machine (pure-first, pm4/mc6 model), the self-playing attract demo, the hall-of-fame name-entry flow, the HUD + scanner render, 2P alternating handoff, lobby showcase, and the full-lifecycle visual playtest

## Overview
Seventh and FINAL content Defender epic — phase 6-7 of the framebuffer-raster cabinet
build (docs/playbooks/next-sprite-game.md; roadmap
docs/superpowers/specs/2026-08-13-defender-cabinet-roadmap-and-df1-design.md sec 4 df7,
approx 18 pts). df1-df6 built every PURE core — world/ship/scheduler (df3), the menagerie
+ collision + effects (df4), waves/scoring/scanner/rescue/powers + the men<0 game-over
reducer + the hall-of-fame board (df5), and sound (df6) — but nothing WIRES them into a
lifecycle: there is no attract mode, no start-of-game, the men<0 game-over
(endgame.ts isGameOver, defender/DEFA7.SRC:1423) is computed but never acted on, the
hall-of-fame board persists but no name-entry flow reaches it, the df5-1 scanner
projection is drawn NOWHERE, and there is no HUD. df7 is the WIRING that makes Defender
a cabinet you can play attract-to-game-over-to-hall-of-fame.
This is the pm4/mc6 "pure first, wired after" model (the missile-command mc6 attract +
state-machine epic and the pac-man pm4 cabinet lifecycle are the direct siblings):
the phase machine is a PURE, seeded, clock-free transition function in src/core FIRST,
THEN wired to the shell. df5 Decision C ruled the end-of-game pure-first here and
phase-wired in df7; df5 Decision D deferred 2P alternating handoff to df7. Both land now.
GROUND TRUTH, CITED: the ROM's block-1 attract/hall-of-fame is AMODE1.SRC (HALLOF
*HALL OF FAME ENTRY defender/AMODE1.SRC:117,119; HOFIN initials display :244; HOFUL
underline :185; HOFUD up/down stick handler :323,325; HALDIS attract-mode display :375,
reached HALL13 :230; add-score/initials :270). The mainline phase transitions are the
STATUS-word states with ST1 *ONE PLAYER START defender/DEFA7.SRC:1098,1100 and ST2
*TWO PLAYER START :1110,1112; the PLAYER START PROCESS :1206 and the P1SW/P2SW player-
switch :1179 are the 2P handoff. GAME OVER is ROMF8.SRC (GAMEOV :337; VGAMOV "GAME OVER"
string :351), and the coin/credit ledger df5-6 already mapped (CREDIT $A037 defender/
ROMF8.SRC:12; the df5-6 CMOS SLOT/TOTPDC persistence).
DECISION A (RULED, pure-first/wired-after — the pm4/mc6 model): the phase machine is a
PURE transition function in src/core (a Phase union attract|setup|play|death|game-over,
plus pause, and a MAINLINE dispatch attract->setup->play->[pause]->death->game-over->
attract), seeded and clock-free (purity.test.ts green), tested BEFORE the shell wires it.
It CONSUMES df5-6's isGameOver(men<0) as the play->death/game-over edge — it does not
re-decide game-over. The shell then drives it; no per-phase rAF.
DECISION B (RULED, ADR-0005 everywhere): NO full-framebuffer strobe in ANY attract,
death, game-over or transition presentation (the standing df4 photosensitivity ruling,
docs/adr/0005-photosensitivity-accessibility-exception.md); transitions route through the
df4-2 effect-policy (freeze/fade/particle) and the df4-2 render guard stays GREEN with
the whole lifecycle live. Accessibility OUTRANKS ROM fidelity.
DECISION C (RULED, hall of fame is @shared, CONSUMED): df5-6 shipped the pure board
(core/highscore.ts) + the one-origin localStorage seam (shell/highscore.ts) via
@shared/highscore. df7 wires the NAME-ENTRY flow (@shared/name-entry) into
game-over->name-entry->hall-of-fame->attract and RENDERS the hall-of-fame display
(HOFIN :244). It reuses the shared modules — no bespoke high-score UI, no new persistence.
DECISION D (RULED, 2P alternating handoff lands here — df5 Decision D): the death->next-
player transition (ST2 defender/DEFA7.SRC:1112; PLAYER START PROCESS :1206; P1SW/P2SW
:1179) is phase-machine territory built here. The COCKTAIL screen-flip it drives is
DOCUMENTED-NOT-PORTED (the arcade is desktop-only, upright — the df5 ruling); df7 ships
the alternating single-screen handoff, not the flip.
DECISION E (RULED, showcase opt-in): df7 registers the lobby-showcase tile (the ml7/mc
showcase pattern) so Defender appears in the lobby's attract rotation, opt-in and cited to
the existing lobby showcase seam — no new lobby infrastructure.
Reuse-first: df3 scheduler.ts + world.ts + sim.ts (the phase machine gates the running
sim; attract is a seeded driver over it), df4-2 effects.ts + the ADR-0005 policy
(transition presentation), df5-1 scanner.ts (the HUD draws its blips — CONSUMED, finally
painted), df5-3 score.ts (the HUD reads score/men), df5-6 endgame.ts + highscore.ts
(the game-over edge + the hall of fame), df6 events.ts (attract/transition cues),
@shared/name-entry + @shared/highscore + @shared/pause + @shared/font (all CONSUMED).
No new @shared extraction (the phase machine, attract driver and HUD are Defender game
structure with no second consumer). No new enemy, no new picture.
Every constant re-opens under the df1-1 gate: no src/core value without a claims/*.json
entry citing defender/<FILE>.SRC:<line>; line numbers from tool output only (RASM radix).
Design + full story rationale to be written at kickoff:
docs/superpowers/specs/2026-08-XX-defender-df7-lifecycle-design.md (mirror the mc6/pm4
lifecycle specs and the df5 spec).
Traps carried in: pure-first (the phase machine is core, seeded, clock-free — the pm4/mc6
split); ADR-0005 binds every transition (no full-frame strobe — guard stays green); the
hall of fame + name entry are @shared CONSUMED not re-built; the 2P cocktail flip is
documented-not-ported; the scanner is df5-1's projection finally drawn, not re-derived;
colour by df2 palette index only; line numbers from tool output only; RASM radix.
OUT OF SCOPE: any NEW enemy/picture/sound (df1-df6 shipped the content); re-deciding
game-over (df5-6 owns it, consumed); the cocktail screen-flip (documented-not-ported,
Decision D); hardening/mutation batteries (df8+, reviewer-driven).

## Metadata
- **Epic ID:** df7
- **Repo:** arcade

## Background
_Cross-story constraints and guardrails to be filled in as the epic
progresses._

---
_Generated by `pf context create epic df7` from the sprint YAML._
