# Defender gameplay render audit — 2026-08-20

**Auditor:** Architect (Mimir), with three paired read-only auditors (enemy render, player/projectile/input, HUD/scanner/world).
**Trigger:** Owner playtest — *"we're close but there are many missing things: I can't see my laser fire, and flipping the ship around doesn't flip the sprite."*
**Method:** `rom-fidelity-audit` skill, phases 2–5 (paired auditors → coverage → cluster). Every finding cites `file:line` and is falsifiable in one read.

## Headline

The **simulation is largely faithful** — motion, collision, scoring, input, and ship physics
are ROM-cited and correct. Every defect found is a **missing or mis-wired render step**, not a
wrong ROM constant. Two systemic roots (a frozen palette and a dead effect-presentation layer)
generate most of the "missing things"; the rest are standalone draw-call gaps.

## The two systemic roots

- **R1 — Frozen palette.** `shell/render.ts:41` resolves `CRAM` once at module load and decodes
  every frame through it. Core writes no colour registers and carries no live PCRAM shadow.
  Indices `1` and `A–F` stay `0x00` = black forever; every Williams colour-cycle effect is dead.
- **R2 — Dead effect-presentation layer.** `core/effects.ts` `classify()` and its `fade`/`freeze`/
  `particle` presentations (built for ADR-0005) have **zero call sites**. Player-death,
  smart-bomb, hyperspace, and terrain-blast screen effects were built and never wired.

Both are ruled by **ADR-0007** (live render pipeline).

## Findings by subsystem

### Player & projectiles
- **Laser invisible** — drawn every frame in palette index 1, which is `0x00` black (R1).
  `scene.ts:114`, `palette.ts:25`. *(Owner-reported.)*
- **Ship never mirrors** — facing is tracked (`ship.ts:100` `stepReverse`) but `scene.ts:442`
  blits `PLAPIC` with no facing branch; `blitObject` has no flip param; only one `PLAPIC` exists
  (`objects-data.ts:58`). *(Owner-reported.)*
- **Laser streak rides the ship's current row** — `Laser` stores no `y` (`laser.ts:56`); both
  render (`scene.ts:467`) and collision (`sim.ts:815`) use the ship's live row, so shots snap
  vertically when the ship moves after firing, and hit at the wrong row.
- **Thrust flame missing** — thrust emits audio only; no exhaust sprite/draw exists.
- **Player death / hyperspace / smart-bomb screen effects absent** (R2) — `sim.ts:478,515`,
  effects never spawned/surfaced.

### Enemies
- **Five of seven enemy types never drawn** — mutants, baiters/UFOs, bombers (TIEs), pods,
  swarmers, and dropped bombs are live, scheduler-driven, and collidable (`sim.ts:212-217`,
  `722-727`) but `composeFrame` blits only `landers` + `humanoids`. They blink in only at
  spawn (materialize) and death (explosion). **The single highest-impact defect.**
- **Bomb/TIE/pod sprites are all-black** even once drawn (R1): `BMBP1` all index-10; `TIEP1`
  indices D/E/F; `PRBP1` indices C–F (`objects-data.ts:38,43,48`).
- **Mutant shimmer absent** (R1); one `SCZP1` pixel is index-12 black.

### Scanner (radar)
- **Only landers blip** — `drawScanner` reads `state.landers` only (`scene.ts:243`); humanoids
  and all non-lander enemies give no radar warning.
- **No terrain contour on the strip** — MTERR transcribed (`terrain-data.ts:31`) but drawn
  nowhere; `scanner.ts:29` marks it *"deferred df7."*

### HUD
- **No high-score during live play** — `drawHud` draws score/men/wave only (`scene.ts:311-315`);
  high score shows only on the game-over screen.
- **Smart-bomb stock not shown** — `state.smartBombs` exists (`sim.ts:225`), never drawn.
- Lives are a numeral, not the ROM's spare-ship icons (design choice; visible).

### World / stars — mostly working
- **~4 of 16 stars invisible** — the star colour cycle masks to indices 0–7, and 0/1 are black
  (`stars.ts:117,143`). Minor dimming.

## Confirmed-working (what makes this audit trustworthy)

- Landers & humanoids render and are correctly coloured (indices 3/4/7/8).
- Terrain draws (index 3, GREEN) and cylinder-scrolls with the camera.
- Star field parallax; HUD text, bezel rails, and player radar marker all render (WHITE 9).
- **Every input is bound and consumed** — fire, thrust, reverse, up/down, smart-bomb,
  hyperspace, start. Nothing unwired at the input layer; reverse-to-turn matches the ROM.
- Collision projection == render projection (`toScreenCol` is literally `projectWorldX`,
  `sim.ts:626`) — no positional divergence between where enemies are hit and where they'd draw.
- Laser fire/cap/cull and ship physics (X-damp/thrust/reverse debounce/vertical strip) are
  ROM-cited and faithful.

## Ruling sheet — fix clusters (deduplicated) → pt1 stories

| Story | Cluster | Size | Depends on | Subsumes |
|-------|---------|------|-----------|----------|
| **pt1-22** | Live palette + colour cyclers (R1) | L | — (prerequisite) | laser-black, bomb/TIE/pod-black, mutant shimmer, dim stars |
| **pt1-23** | Draw the 5 missing enemy banks | L | pt1-22 *(TIE/pod/bomb visibility only)* | invisible mutants/baiters/bombers/pods/swarmers/bombs |
| **pt1-24** | Scanner completeness (all banks + humanoids + MTERR) | M | — | lander-only radar, no terrain contour |
| **pt1-25** | Wire ADR-0005 effect visuals (death/smart-bomb/hyperspace/terrain) (R2) | L | — | no death anim, no bomb flash, no hyperspace visual |
| **pt1-26** | Ship facing mirror | S | — | ship never flips *(owner-reported)* |
| **pt1-27** | Laser fixed firing row (render + collision) | S | — | shots snap to ship row / hit wrong row |
| **pt1-28** | Thrust exhaust flame | M | — | no exhaust plume |
| **pt1-29** | HUD: in-play high-score + smart-bomb stock | S | — | missing HUD readouts |

**Sequence:** pt1-22 lands first (the palette "rebase"); pt1-23 is the highest-impact single
fix and its blit loop can proceed in parallel with pt1-22. pt1-26 and pt1-27 are small and both
owner-visible. pt1-24/25/28/29 are independent.

**ADR-0005 note:** pt1-22's cyclers are localized (safe); pt1-25's smart-bomb flash must render
as the ADR-0005 bounded wash, never a real full-frame invert. `assertNoFullFrameStrobe` stays
the guard.

## Limitations

- This is a **render/behaviour** audit driven by an owner playtest, not a full per-constant ROM
  sweep — it targets what a player sees is missing. Sim constants were spot-checked (cited as
  faithful where noted) but not exhaustively re-verified.
- Enemy *balance/spawn* fidelity (e.g. pt1-19 lander roaming) is tracked separately.
