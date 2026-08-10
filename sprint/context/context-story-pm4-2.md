# Story pm4-2 Context

## Title
Animation-hold divisor (shell render): Pac-Man chomp + ghost legs cycle at 60 Hz because render.ts indexes the raw per-sim-frame counter (game.pac.frame / game.ghostFrame[id]; the latter is the SPEED-PATTERN cursor, not an animation one). Add a render-side animation-hold so sprites advance every N sim frames. render.ts + main.ts only, core untouched. Hold cadence is an honest-uncited shell-timing choice (same posture as the existing FLASH_HALF_PERIOD).

## Metadata
- **Story ID:** pm4-2
- **Type:** bug
- **Points:** 2
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Pac-Man — cabinet lifecycle (attract + state machine + freeze pauses) + fidelity/accessibility fixes

## Problem
In `plugins/pac-man/`, the shell renderer picks the current animation frame for
Pac-Man's chomp and each ghost's legs by indexing a **raw per-sim-frame counter**:
`game.pac.frame` and `game.ghostFrame[id]`. Because the sim advances that counter
every simulation frame (~60 Hz), the sprites cycle every single frame — the mouth
and legs flicker far faster than the arcade cabinet, which holds each animation
frame for several sim frames.

A second, subtler bug rides along: `game.ghostFrame[id]` is the **speed-pattern
cursor** (it drives ghost move/skip cadence in core), **not** an animation cursor.
render.ts is overloading it as an animation index. The fix must stop treating it as
an animation source and derive its own animation-hold index instead.

## Technical Approach
- **Shell-only.** Touch `plugins/pac-man/src/shell/render.ts` and `plugins/pac-man/src/shell/main.ts`
  ONLY. `plugins/pac-man/src/core/**` stays byte-for-byte untouched — `purity.test.ts`
  and the core-boundary scan must stay green.
- Introduce a render-side **animation-hold divisor**: divide a monotonic sim-frame
  index by N (integer) so the animation frame advances **once every N sim frames**
  instead of every frame. e.g. `animIndex = Math.floor(frameCounter / HOLD) % PHASES`.
- The hold cadence **N is an honest-uncited shell-timing choice** — it is a
  presentation constant, NOT a ported ROM value. Give it the same posture as the
  existing `FLASH_HALF_PERIOD` shell constant: a named constant with a comment stating
  it is a shell-timing choice (uncited). **Do NOT fabricate a pacman.asm / ROM citation
  for it** — and it must NOT be added to any core citations.test.ts claim.
- Pac-Man chomp and ghost legs both go through the hold. The ghost animation index
  must be derived from the hold, **not** from `game.ghostFrame[id]` (the speed-pattern
  cursor) — decoupling render animation from the core movement cadence.

## Scope
- **In scope:** `plugins/pac-man/src/shell/render.ts` and `.../shell/main.ts` — add a
  render-side animation-hold so chomp + ghost-legs sprites advance every N sim frames;
  stop reusing `game.ghostFrame[id]` as an animation index.
- **Out of scope:** any change under `plugins/pac-man/src/core/**`; the ghost
  speed-pattern behavior itself; adding a citation for the hold cadence; any other
  sprite/render behavior not related to the animation cycle rate.

## Acceptance Criteria
1. Pac-Man chomp and each ghost's legs advance their animation frame **once every N
   sim frames** (N > 1), not every sim frame — the render-side hold is applied.
2. The ghost **animation** index is derived from the new render-side hold, **not** from
   `game.ghostFrame[id]` (the core speed-pattern cursor).
3. The hold cadence is a **named shell constant** documented as an honest-uncited
   shell-timing choice (mirroring `FLASH_HALF_PERIOD`); no ROM/pacman.asm citation is
   fabricated and no core `citations.test.ts` claim is added for it.
4. Changes are confined to `plugins/pac-man/src/shell/render.ts` and `.../shell/main.ts`;
   `plugins/pac-man/src/core/**` is untouched and `purity.test.ts` / core-boundary stay
   green.
5. `npx vitest run --project pac-man` is green.

---
_Context authored by SM from the story title + epic pm4 (sm-setup emitted a stub)._
