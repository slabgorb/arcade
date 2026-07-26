# Story sw9-1 Context

## Title
X-wing cockpit canopy frame — the persistent red-strut/blue-bar overlay framing every gameplay view; OPEN FIRST: determine provenance (authentic WSVROM color-vector picture vs cabinet artwork) then draw as static screen-space overlay

## Metadata
- **Story ID:** sw9-1
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** star-wars
- **Epic:** Cabinet front-of-house: attract, cockpit canopy frame, difficulty select

## Provenance Ruling (RED-phase research — the story's mandated "open first")

**RULING: (a) AUTHENTIC WSVROM COLOR-VECTOR PICTURE. Port it as a static screen-space overlay.**
It is NOT cabinet artwork / bezel.

**Decisive evidence.** The 1983 source draws the persistent cockpit frame as a set of
authentic AVG vector pictures under `WSVROM.MAC`'s `.SBTTL PLAYER'S GUN SITE`
(WSVROM.MAC:1413-1885). Five pictures make up the frame, each a self-labelled
"SITE / PLAYER'S ... GUN / SHIP":

| ROM symbol | ROM comment | Screen anchor |
|------------|-------------|---------------|
| `VGSTTR` | "SITE: PLAYER'S SIDE GUN, TOP RIGHT"    | right rail  (`VOFF VGLIMR,VGOFFY`) |
| `VGSTTL` | "SITE: PLAYER'S SIDE GUN, TOP LEFT"     | left rail   (`VOFF VGLIML,VGOFFY`) |
| `VGSTBR` | "SITE: PLAYERS GUN, BOTTOM RIGHT SCREEN"| bottom-right(`VOFF VGLIMR,VGLIMB`) |
| `VGSTBL` | "SITE: PLAYER'S SIDE GUN, BOTTOM LEFT"  | bottom-left (`VOFF VGLIML,VGLIMB`) |
| `VGSTBM` | "SITE: PLAYER'S FRONT SHIP, BOTTOM MIDDLE" | bottom-mid (`VOFF 0,VGLIMB`)    |

Each picture is authored as **AVG absolute vectors in screen space** — `VOFF` to a fixed
screen limit, `CXY` local origin, then `AON`/`AOFF` line runs — never through the 3D Math
Box. So it is a static overlay bolted to the screen edges, exactly like the crosshair
chevrons (`VGSITE`, the "LAZAR AIM SITE" in the same section, already ported as
`drawCrosshair`). Each gun is drawn in **two authentic colors**: `COLOR VGCBLU` (deep
blue, `VGCBLU==1`, WSGLOB.MAC:56) for the gun **shaft** and **tip**, and `COLOR VGCRED`
(red, `VGCRED==4`, WSGLOB.MAC:59) for the **collar** and **dish** — the story title's
"blue-bar / red-strut" overlay is literally these blue bars (shafts) and red struts
(collars/dishes).

Screen-limit equates (WSGLOB.MAC:32-39, dotted = **decimal**): `VGLIMR==480.`,
`VGLIML==-480.`, `VGLIMB==-552.`, `VGOFFY==-104.` (the side-rail guns sit at the side
edges near vertical mid, NOT the top corners — "TOP" names the upper of the side pair),
`VGRW0==552.`.

**Transcription caveat for Dev (GREEN).** The gun-site picture data lives **after
`.RADIX 16`** (WSVROM.MAC:1246) — so `AON`/`AOFF`/`CXY` coordinates **without a trailing
dot are HEX**, while `M.=10.` (the per-picture AVG scale) and the screen-limit equates
above are dotted **decimals**. Transcribe the vertex runs at the ROM `M.`/`D.` scale, map
AVG screen-space (X ±480, Y ±552; +Y up) to canvas pixels, and author the polylines from
the `AON`/`AOFF` runs (the same picture-data idiom as the ported models). Do **not** reuse
the cyan reticle glow (`GLOW = '#00e5ff'`) for the frame — the frame is a true deep blue
(VGCBLU) + red, distinct from the cyan aim reticle.

## Problem
The clone draws no persistent cockpit frame. `drawPlayerLaserToSite` (render.ts) already
treats the four screen corners as "the cockpit guns" (its own comment) but draws **no gun
geometry** — the corners are abstract laser origins only, drawn cyan and only while
firing. The authentic red/blue X-wing gun frame that surrounds every cabinet gameplay view
is absent. This story ports the five `PLAYER'S GUN SITE` pictures as a static screen-space
overlay so every gameplay view is framed like the cabinet.

## Technical Approach
- **Shell/render only.** This is a static screen-space overlay with no game logic — like
  the crosshair chevrons. `src/core` stays untouched (no new state, no new symbol). The
  frame is drawn in the HUD/overlay layer of `render()`, in the gameplay branch (the same
  `mode !== attract && mode !== gameover` path that draws `drawCrosshair`).
- Port the five pictures (VGSTTR / VGSTTL / VGSTBR / VGSTBL / VGSTBM) at their ROM screen
  anchors, in VGCBLU (shafts/tips) + VGCRED (collars/dishes), stroking through the shell's
  existing glow primitive (`glowPolyline` / `glowLine`) in absolute screen coordinates.
- Persist across all three gameplay phases (space / surface / trench).
- Real acceptance is visual (§6 of the design spec): our frame beside the cabinet longplay
  at the same phase. Serve YOUR checkout on a spare port (the multi-checkout port trap).

## Scope
- **In scope:** a persistent, static, screen-space cockpit gun frame (the five ROM
  `PLAYER'S GUN SITE` pictures), in the authentic VGCBLU + VGCRED, drawn every gameplay
  view (all three phases), shell-only.
- **Out of scope:** the aim reticle/crosshair (already `drawCrosshair`), the player laser
  beams (`drawPlayerLaserToSite`), the HUD header/score/shield, any core/sim change, and
  any interactivity (the frame is decorative — no hit-tests, no game logic).

## Acceptance Criteria

- **AC-1 — Persistent screen-space cockpit gun frame during play.** On a live gameplay
  frame (`mode: 'playing'`), `render()` draws a cockpit gun frame as vector strokes in the
  screen-space overlay layer, in addition to the existing crosshair: authentic-blue frame
  strokes appear near the left edge, the right edge, and the bottom band.

- **AC-2 — Five ROM gun pictures at their ROM anchors.** The frame comprises the five
  `PLAYER'S GUN SITE` pictures at: **left side rail**, **right side rail**,
  **bottom-left**, **bottom-middle**, **bottom-right** — blue strokes present in each of
  the five anchor regions, and the two side-rail guns sit ABOVE the bottom band (the frame
  is five pictures, not three bottom guns).

- **AC-3 — Authentic two-tone (blue-bar / red-strut), not the cyan reticle.** The gun
  shafts/tips are a true DEEP blue (VGCBLU — low green, distinct from the cyan `#00e5ff`
  aim reticle) and the collars/dishes are red (VGCRED): blue strokes at the corners/rails,
  red strokes in the bottom band.

- **AC-4 — Static screen-space, no game logic.** The frame's geometry is fixed in screen
  space: the blue anchor points are IDENTICAL whether the yoke/aim is centred or hard-over
  (unlike the aim reticle, which tracks the yoke), and identical across the 3D camera.

- **AC-5 — Frames every gameplay view.** The frame is drawn in all three gameplay phases
  (space, surface, trench).

- **AC-6 — Live-run gated.** The frame is drawn during a live playing run and is ABSENT on
  the attract and game-over screens (consistent with the crosshair).

- **AC-7 — Purity boundary preserved.** The cockpit frame is a shell/render-only concern:
  `src/core` carries no canopy / gun-site / cockpit-frame symbol or state, and `render()`
  draws it from constants (no new `GameState` field required).

- **AC-8 — Provenance grounded in the ROM.** The render source is grounded in the
  authentic origin (references a `PLAYER'S GUN SITE` symbol — `VGSTTR`/`VGSTTL`/`VGSTBR`/
  `VGSTBL`/`VGSTBM` — or "PLAYER'S ... GUN"/"WSVROM PLAYER'S GUN SITE"), so it reads as a
  faithful port, not invented artwork.

---
_ACs and Provenance Ruling authored by TEA (O'Brien) during the RED phase, 2026-07-26.
Original stub generated by `pf context create story sw9-1` from the sprint YAML._
