# Story pt1-12 Context

## Title
missile-command: left/center/right mouse buttons should fire the corresponding missile base, like z/x/c

## Metadata
- **Story ID:** pt1-12
- **Type:** bug
- **Points:** 2
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Playtest bug sweep 2026-08-19 (pt1)

## Problem
Playtest 2026-08-19: map mouse buttons to bases — left/middle/right fires the
left/centre/right silo, mirroring z/x/c. Today **a mouse click fires nothing**: no
`mousedown`/`auxclick`/`contextmenu`/`event.button` read exists anywhere in
missile-command. Right-click pops the OS context menu; middle-click can autoscroll.

## Findings (research complete)

**Current input surface:**
- Keyboard (pure reducers, `src/shell/input.ts`): `fireKeyToBase` z/x/c→0/1/2
  (`:115-126`); `fireFromKey` ammo/alive gate + `launchAbm` + `launched`/`ammoEmpty`
  events, `LOW_AMMO = 4` (`:34,136-161`); `fireOrStart` phase gates — entry inert,
  pause inert, attract→`beginSetupOnInput`, over+fire→`startGame` (`:183-198`);
  `keydownReducer` chain (`:248-258`).
- Mouse (`src/main.ts`): `pointerdown` → audio unlock (`:58`) and attract exit
  (`:66-68`, no button read); `click` → pointer-lock request (`:105-110`);
  `mousemove` gated on lock → `applyPointerMotion` (`:117-123`).

**ROM anchors — the cabinet had three fire switches, and the index order matches
ours exactly:** `W3COMN.MAC:407/409/411` (`MFIREL=4`, `MFIREC=2`, `MFIRER=1`),
`:413` `ALLFIR`; the launch routine `W3MAIN.MAC:1211/1213` (`ABMLAU:`), the
per-base switch masks `W3MAIN.MAC:1325` `FIREMA: .BYTE MFIREL,MFIREC,MFIRER`
(index 0/1/2 = left/centre/right, same ascending-H order as
`src/core/field.ts:52-56` `BASES`), no-ammo noise `:1283`, LOW-ammo test `:1385`.
So `PointerEvent.button` 0/1/2 maps 1:1, ROM-consistently.

Two caveats:
1. **Stale citation in the code**: `src/shell/input.ts:17-18` and
   `src/core/abm.ts:13-15` cite "ABMLAU, W3MAIN:606" — line 606 is a `.WORD`
   table; the real anchors are `W3MAIN.MAC:1211/1213/1325` (the double-spaced-file
   halving slip, same class as the `EXDONE:111` trap noted in
   `tests/citations.test.ts:27`). Fix in passing.
2. **ALPHA/DELTA/OMEGA appear nowhere in the ROM source** — cabinet/instruction-card
   lore only. Don't present those names as citations.

## Technical Approach
1. `src/shell/input.ts` (pure): add `fireButtonToBase(button)` → 0/1/2 else null,
   cited to `W3COMN.MAC:407/409/411` + `W3MAIN.MAC:1325`. Extract the body of
   `fireFromKey` into a shared `fireFromBase(idx, state)` so key and button paths
   share the ammo gate / LOW_AMMO variant / ammoEmpty klaxon (no duplication).
   Add a `pointerdownReducer(button, state)` mirroring `fireOrStart`'s phase gates
   (entry/pause inert; attract→`beginSetupOnInput` and NOT also fire on the same
   press; over+fire→`startGame`; else fire).
2. `src/main.ts`: route the canvas button events through the new reducer + `drain()`;
   FOLD IN the existing `:66-68` attract-exit `pointerdown` handler or the two race
   on the same event. Add `contextmenu` preventDefault (asteroids precedent,
   `plugins/asteroids/src/shell/input.ts:98-100`) and suppress middle-button
   autoscroll (`auxclick`/mousedown preventDefault). Choose ONE event family —
   `click` fires for button 0 only, so pointer-lock acquisition stays a left-click
   gesture; nothing pins `pointerdown` by name, so `mousedown` is free.
3. Fleet precedents: asteroids `MOUSE_BUTTON` map + blur reset
   (`input.ts:42,89-105`), centipede `FIRE_BUTTON` (`input.ts:59-64`), tempest
   button-0 guard (`input.ts:139-147`).

## Scope
- In scope: button→base mapping, shared fire path, context-menu/autoscroll
  suppression, the stale-citation fix.
- Out of scope: touch input; rebinding keys; core changes (input mapping is shell —
  `tests/purity.test.ts` scans `src/core` only).

## Tests affected / RED harness
- `tests/fire.test.ts:133-193` — pins z/x/c mapping AND (`:187`) a source scan that
  `shell/input.ts` keeps the ABMLAU/FIREMA citation string — preserve it through
  the refactor.
- `tests/fire-ammo.test.ts:68-186` — ammo economy + source scans (`input.ts`
  imports `launchAbm`, reads `alive`/`ammo`) — must survive the `fireFromBase`
  extraction.
- `tests/mc6-7-pause-fire-gate.test.ts:48-95` — pause gates keyboard fire; the
  button path needs the same gate or it's a hole.
- **RED vehicle**: `tests/pointer-lock.test.ts:314-332` boot harness —
  `tests/helpers/boot-shell.ts:44` `emit()` THROWS if nothing listens, so
  `shell.emit('canvas','mousedown',{button:2})` is a clean RED today.
- Citations gate: new shell code carries no literal-gate obligation (sections 4/7
  of `citations.test.ts` scan `src/core` only), but keep claim verbatims accurate.

## Acceptance Criteria
_TEA to define at RED. Suggested: AC1 buttons 0/1/2 fire bases 0/1/2 through the
same ammo/phase gates as z/x/c (shared path, pinned); AC2 right-click doesn't open
the context menu and middle-click doesn't autoscroll; AC3 attract exit and fire
don't double-fire on one press; AC4 the stale W3MAIN:606 citations are corrected to
the 1211/1213/1325 anchors._

---
_Generated by `pf context create story pt1-12`; researched and expanded by Architect 2026-08-19._
