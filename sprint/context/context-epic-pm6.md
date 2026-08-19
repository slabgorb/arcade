# Epic pm6 Context

## Title
Pac-Man intermissions + kill screen (pm6): the three between-level coffee-break cutscenes (Blinky-chase, ripped-ghost, worm) and the authentic level-256 kill screen — deferred in the pm1/pm3 specs, never materialized after pm4 was retargeted to the cabinet lifecycle

## Overview
The one piece of authentic Pac-Man that fell through the cracks. Three separate specs
deferred the SAME two items to a future epic that was never created: the arcade design
(docs/superpowers/specs/2026-08-06-pac-man-arcade-design.md:112-113 "Deferred to pm2+ …
the three intermission cutscenes, the level-256 kill-screen bug") and the pm3 design
(2026-08-07-pac-man-pm3-design.md:138-139 "pm4: the three intermission cutscenes
(Blinky-chase, ripped-ghost, worm), and the level-256 kill screen … Both consume graphics
pm3 bakes") both named pm4 as the home — but pm4 was RETARGETED to the cabinet lifecycle
and explicitly pushed intermissions back out (2026-08-09-pac-man-cabinet-lifecycle-design.md:160
"Intermission/coffee-break cutscenes between levels." — out of scope), and pm5 was pure
grooming. So they were never a story and never an epic. The gap is acknowledged live in
the code: plugins/pac-man/src/core/level.ts:63 and :140 both read "level-256 kill screen
(out of scope, epic pm1's DEFERRED list)". pm6 closes it — the last authentic Pac-Man
content the cabinet is missing.
It builds: the three between-level COFFEE-BREAK CUTSCENES (act 1 Blinky chases Pac / a
big Pac turns and chases Blinky; act 2 the "nail"/ripped-ghost scene; act 3 the worm/
tearing-ghost scene), slotted as a new intermission phase off the pm4 phase machine and
gated on the level byte; and the authentic LEVEL-256 KILL SCREEN (the right-half tile/
glyph corruption when the internal level counter rolls past a byte). Both CONSUME the
graphics pm3 baked and the pm2 sound voice — no new asset production.
GROUND TRUTH, PARTLY CITED / PARTLY RED-ANCHORED (do not fabricate — the pm4 spec's
standing gotcha, 2026-08-09-...:54): the intermission TRIGGER is cited — the game requests
intermission music #02 and gates it on the level byte (pacman.asm:1613 "ld a,#02",
:1615-1616 "ld (#4ecc),a / ld (#4edc),a", :1616 "ld a,(#4e13)" reads the level #), and the
looping intermission music is already grounded in pm2's dossier (claims/sound.json #02 —
looping intermission, loop opcode #f0). The kill-screen level-byte read is cited
(pacman.asm:6075 "ld a,(#4e13) ; Load level #"; behaviour documented at
docs/rom-study/glossary.md:392). The cutscene ACTOR-ANIMATION routines are NOT yet anchored
to a clean asm line — they are RED-anchored against the quarry at test time, cited before
the reducer is named (the pm3 identity-first law), never fabricated.
DECISION A (RULED, the intermission is a PHASE off the pm4 machine): add an 'intermission'
state to the pm4 GamePhase union (plugins/pac-man/src/core/game.ts:184 —
attract|ready|playing|dying|level-clear|game-over) hung off the level-clear transition
(events.ts:78 'level-cleared'), gated on the level byte per the ROM cadence. It reuses the
pm2 intermission music (#02); the phase + trigger are PURE-first (purity.test.ts green),
the scripted animations layer on after — the pm4/mc6 split this cabinet already follows.
DECISION B (RULED, ACCESSIBILITY OUTRANKS ROM FIDELITY — the standing Pac-Man ruling): the
owner has photosensitive epilepsy; NO >3 Hz large-area luminance strobing in ANY effect.
The level-256 kill screen is the authentic right-half GLYPH CORRUPTION — render it as a
STATIC/faithful garbled tilemap, NOT a flashing/strobing mess; if the authentic bug would
flicker, it renders as the safe static variant and the substitution is logged as a Design
Deviation citing the accessibility ruling (the same standing exception pac-man's safety
strobe removal, pm4, already applied). The cutscenes are gentle scripted animations — no
strobe.
DECISION C (RULED, RED-anchor the animations): the cutscene sprite-animation timing/paths
are pinned at RED against the vendored source (plugins/pac-man/reference/source/pacman.asm)
and the dossier BEFORE the reducer is named — a wrong animation in prose ships GREEN (the
pm3 identity-first law applied to motion). What is already cited (the #02 trigger, the
level-byte gate, the kill-screen byte) is used as-is; what is not is anchored, not invented.
Reuse-first: the pm4 phase machine (game.ts GamePhase — the intermission hangs off it),
the pm2 WSG sound voice (#02 looping intermission — CONSUMED), the pm3 baked sprites/tiles/
palette (the cutscene actors and the corrupted glyphs are pm3 graphics — CONSUMED, no new
bake), @shared/font/glow as the other games use them. No new @shared extraction (cutscenes
and a kill screen are Pac-Man-specific). Every new core constant carries a citations.test.ts
claim and passes purity.test.ts.
Design + full story rationale to be written at kickoff:
docs/superpowers/specs/2026-08-XX-pac-man-pm6-intermissions-killscreen-design.md.
Traps carried in: accessibility outranks ROM fidelity (no strobe — Decision B); RED-anchor
the animations, do not fabricate cites (Decision C); the intermission is a phase off pm4,
not a forked path; consume pm2 sound + pm3 graphics (no new assets); retire the level.ts
stubs; every constant cited.
OUT OF SCOPE: any new sound or sprite BAKE (pm2/pm3 shipped them); the cabinet lifecycle
(pm4, done); grooming (pm5, done); a strobing kill screen (Decision B forbids it).

## Metadata
- **Epic ID:** pm6
- **Repo:** arcade

## Background

**Why this epic exists — a gap, not new scope.** Three specs deferred the SAME two items
to a future epic that was never created: the arcade design
(`2026-08-06-pac-man-arcade-design.md:112-113`) and the pm3 design
(`2026-08-07-pac-man-pm3-design.md:138-139`) both named **pm4** as the home for the three
intermission cutscenes + the level-256 kill screen — but pm4 was **retargeted** to the
cabinet lifecycle and explicitly pushed intermissions back out
(`2026-08-09-pac-man-cabinet-lifecycle-design.md:160`), and pm5 was pure grooming. So they
were never a story and never an epic. The gap is acknowledged live in the code:
`plugins/pac-man/src/core/level.ts:63` and `:140` both read *"level-256 kill screen (out of
scope, epic pm1's DEFERRED list)"*. pm6 is the **last authentic Pac-Man content** the
cabinet is missing.

**What it builds.** The three between-level **coffee-break cutscenes** (act 1 Blinky-chase/
big-Pac; act 2 ripped-ghost "nail"; act 3 worm/tearing-ghost), slotted as an
**`intermission` phase off the pm4 phase machine** gated on the level byte; and the
authentic **level-256 kill screen** (right-half glyph corruption when the level counter
rolls). Both **consume** pm3's baked graphics and pm2's sound voice — no new assets.

**Ground truth — partly cited, partly RED-anchored (never fabricated).** The intermission
*trigger* is cited: the game requests music `#02` and gates on the level byte
(`pacman.asm:1613` `ld a,#02`; `:1616` `ld a,(#4e13)`), and the looping intermission music
is grounded in pm2's dossier (`claims/sound.json #02`). The kill-screen level-byte read is
cited (`pacman.asm:6075`; behaviour `docs/rom-study/glossary.md:392`). The cutscene
**actor-animation** routines are *not* yet anchored to a clean asm line — they are
**RED-anchored** against the quarry before the reducer is named (the pm3 identity-first law).

**Three rulings (full text in `sprint/epic-pm6.yaml`):**
- **A** — the intermission is a **phase off the pm4 machine** (`game.ts:184 GamePhase`),
  hung off `level-cleared` (`events.ts:78`), pure-first; the animations layer on after.
- **B** — **ACCESSIBILITY OUTRANKS ROM FIDELITY** (the standing Pac-Man ruling — the owner
  has photosensitive epilepsy): NO >3 Hz large-area luminance strobe in ANY effect. The
  kill-screen corruption renders **static**, not flashing; the cutscenes are gentle.
- **C** — **RED-anchor the animations** to the vendored source + dossier before naming the
  reducer; use what is already cited as-is, invent nothing (a wrong animation ships GREEN).

**Cross-story guardrails:**
- The intermission is a **phase off pm4**, not a forked path (Decision A); pure-first
  (purity.test.ts green).
- **Consume pm2 sound (#02) + pm3 graphics** — no new bake; no new `@shared` extraction.
- Every new `src/core` constant carries a `citations.test.ts` claim; cadence/animation
  constants are **RED-anchored**, not invented (Decision C).
- **No strobe** anywhere (Decision B); a substitution of an authentic-but-flickering effect
  for a static one is logged as a Design Deviation citing the accessibility ruling.
- Retire the `level.ts:63/:140` out-of-scope stubs when the kill screen lands.

**Design spec:** to be written at kickoff —
`docs/superpowers/specs/2026-08-XX-pac-man-pm6-intermissions-killscreen-design.md`. pm6
closes the last deferred authentic content; remaining Pac-Man work is reviewer-driven
hardening. Priority **p3** — it is authentic-completeness polish on a shipped, lifecycle-
complete cabinet, not a blocker.

---
_Generated by `pf context create epic pm6` from the sprint YAML._
