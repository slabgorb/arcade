# Missile Command — Subsystem Map

Companion to [`brief.md`](brief.md) and [`glossary.md`](glossary.md). One row per
subsystem: the owning module, the `.SBTTL` routine anchors that implement it, and a
one-line behaviour. This is the index every later story and the `rom-fidelity-audit`
skill reads to find where a behaviour lives in the vendored **REV-01** source
(`plugins/missile-command/reference/source/`, provenance `reference/PROVENANCE.md`).

## How to read an anchor

Anchors are cited by **PHYSICAL line** as `MODULE:LINE` — the line `grep -a .SBTTL`
or an editor shows, e.g. `.SBTTL MAINLINE` is `W3MAIN:475`. This is the same
convention mc2-1 fixed for the W3COMN constant claims (a constant is cited at its
physical line, `W3COMN.MAC:39`).

> **Radix / line trap.** `brief.md`'s subsystem table cites the `.SBTTL` **logical**
> ordinal (the non-blank line count) — e.g. `:238 MAINLINE`. W3MAIN and W3DSUP are
> **double-spaced**, so the physical line is ≈ 2× the logical one (`MAINLINE` logical
> `:238` → physical `:475`). This map uses physical lines throughout; every anchor
> below is re-derived from the source, not copied from `brief.md`. The cross-check in
> `tests/dossier-docs.test.ts` re-opens each anchor against the vendored tree and
> fails if it does not land on a real `.SBTTL` directive.

Two subsystems carry no `.SBTTL` anchor and say so: **coin** (`W3COIN` uses `.TITLE`,
not `.SBTTL`) and the **interrupt/timebase** handler (`W3INT`, still open question
**O-2** — not yet read in full).

## The map

| Subsystem | Module | `.SBTTL` anchors (physical) | Behaviour |
|---|---|---|---|
| Mainline loop + state machine | `W3MAIN` | `W3MAIN:475` MAINLINE · `W3MAIN:539` PLAY · `W3MAIN:561` SETUP STATE · `W3MAIN:615` PAUSE STATE | Top-level per-frame dispatch across the attract / setup / play / pause states. |
| Cursor / trackball → crosshair | `W3MAIN` | `W3MAIN:847` PROCESS CURSOR MOTION · `W3MAIN:1091` ADD TBALL TO CURSOR POSITION · `W3MAIN:1173` UPDATE CURSOR POSITION | Reads trackball deltas, integrates them into the crosshair, clamps to the play field. |
| Player ABM launch | `W3MAIN` | `W3MAIN:1211` LAUNCH ABMS · `W3MAIN:1329` LAUNCH 1 ABM | Fires an anti-ballistic missile from the nearest live base toward the cursor. |
| Enemy ICBM / CM / MIRV | `W3MAIN` | `W3MAIN:1443` UPDATE ICBM POSITIONS · `W3MAIN:2273` LAUNCH ICBMS · `W3MAIN:2635` CRUISE MISSILE LAUNCH · `W3MAIN:2683` MIRV AN ICBM | Steps and spawns enemy warheads; splits an ICBM into a MIRV; launches cruise missiles. |
| Explosions + damage detection | `W3MAIN` | `W3MAIN:1811` PROCESS EXPLOSIONS · `W3MAIN:1925` MISSILE DAMAGE DETECTION & PROCESS · `W3MAIN:2069` SPUTNIK KILL · `W3MAIN:2167` DESTROY A CITY OR BASE | Grows/ages blast circles, tests missiles against them, destroys satellites, cities and bases. |
| Missile geometry (velocity / aim) | `W3MAIN` | `W3MAIN:3177` CALCULATE DELTA FROM OBJECT 1 TO 2 · `W3MAIN:3279` CALCULATE MISSILE VELOCITY & DISPLAY INCREMENT | Computes the delta between two points and the per-frame velocity increment for a launched missile. |
| Wave setup + scoring + bonus | `W3MAIN` | `W3MAIN:3831` NEW GAME SETUP · `W3MAIN:3901` 1ST PHASE OF NEW WAVE SETUP · `W3MAIN:4323` CITY BONUS · `W3MAIN:4765` REGENERATE CITIES · `W3MAIN:5549` ADD TO PLAYER'S SCORE | Initialises a game/wave, tallies the end-of-wave city bonus, regenerates cities, accumulates score. |
| Circle / explosion picture | `W3MAIN` | `W3MAIN:4931` DISPLAY EXPLOSION PICTURE · `W3MAIN:5005` DRAW A CIRCLE | Rasterises the blast circle used for both explosions and the attract picture. |
| Attract mode + scroll | `W3MAIN` | `W3MAIN:891` SMART CURSOR MOVER (ATTRACT) · `W3MAIN:5277` REFRESH ATTRACT MODE MESSAGES · `W3MAIN:5331` SCROLL ATTRACT MESSAGES ACROSS SCREEN | Drives the self-playing attract demo and its scrolling message band. |
| All drawing (stamps / cities / text) | `W3DSUP` | `W3DSUP:587` WRITE A STAMP · `W3DSUP:1067` DRAW ALL LIVING CITIES · `W3DSUP:1221` DRAW MISSILE · `W3DSUP:1583` SET UP COLORS FOR NEXT WAVE · `W3DSUP:1712` CLEAR SCREEN | The framebuffer draw layer: stamps, city sprites, missile trails, per-wave palette, screen clear. |
| High-score ladder + name entry | `W3DSUP` | `W3DSUP:3724` INITIALIZE HIGH SCORE TABLE · `W3DSUP:3780` UPDATE HIGH SCORE LADDER · `W3DSUP:4064` TAKE INITIALS FOR NEW HIGH SCORE · `W3DSUP:4290` DISPLAY HIGH SCORES TABLE | Maintains the high-score ladder, takes initials for a new entry, renders the table. |
| Coin door | `W3COIN` + `COIN65` | — (`.TITLE W3COIN`; no `.SBTTL`) | Atari standard coin handler (`COIN65` include); no game-specific routine anchors. |
| Interrupt / video timebase | `W3INT` | — (open question **O-2**; module not yet read) | The interrupt handler that drives the `FRAME` counter and the sim tick. Sizing the tick against MAME's 61.0076 Hz / 4-IRQ model is O-2. |
