# Story jt11-18: Burned-away bridge floor drops the player off-screen instead of into the lava-troll grab, and the lava itself is not drawn

## Story Details
- **Story ID:** jt11-18
- **Epic:** jt11 (Joust — cabinet experience)
- **Type:** bug
- **Points:** 5
- **Repos:** arcade (`plugins/joust/src/core/{frame,enemy,sim,arena}.ts`, `src/core/pictures.ts`, `src/main.ts` / `src/shell/render.ts`)
- **Workflow:** tdd
- **Depends on:** jt11-5 (done — provides the bridge burn-off destruction state)
- **Sequencing:** shares `sim.ts` / `arena-state.ts` with jt11-5/jt11-12 — sequence, do not parallel. Closes the jt11-12 item (2) grip-grab-zone question.

## The felt bug (playtest report)

> "After the lava eats away the wooden floor, if you land on that, you drop down off the screen
> instead of getting grabbed by the lava monster. Also the lava itself is not visible."

Two coupled defects over the **same burned-shore region**: (A) an entity that enters it falls silently
off-screen instead of being seized by the troll; (B) the region is invisible (black), so the player
cannot even see the hazard they fall into.

## Shared architecture (both defects)

The mask/outcome layer already resolves the burned shore to the lava-troll case **correctly**:
- `groundMaskAt` drops the wave-init `ORA #$20` once `arena.bridgeBurned`, returning the plain CLIF5
  byte `$80` (bit 7, no bit 5) over the shore columns — `flight.ts:229-243` (bit-drop `:236-240`).
- `groundOutcome` maps `$80`-without-`$20` to `{ kind: 'troll' }` — `arena.ts:313-315`.

So the "do not land, this is lava-troll ground" signal (ROM `LNDB7`, `JOUSTRV4.SRC:6764,6792`) is
produced. **The failure is entirely in the consumers of that outcome.**

---

## DEFECT A — walk/land onto burned floor → off-screen fall, no grab  (UNWIRED)

### Root cause
The `{ kind: 'troll' }` ground outcome is computed but **consumed by no caller**. Every ground/land
consumer branches only on `kind === 'platform'` (land) or `!== 'platform'` (walk-off/fall), so an
entity over LNDB7 is sent through `walkOff → stepFlight` — and the free-fall path has **no lava
kill-plane** — so it falls off the bottom. The troll grip is only ever attached to the once-per-wave
`pickTrollVictim` bird nearest CLIF5, never to the entity actually standing on the burned cell.

### Evidence (file:line)
- `frame.ts:275-276` — player airborne landing: `if (outcome.kind === 'platform') s = land(...)`; the
  `'troll'` outcome is ignored (no else).
- `frame.ts:284-295` — player walk-off guard is `groundOutcomeInState(...).kind !== 'platform'` →
  `walkOff(s)`. A `'troll'` outcome is "not a platform," so the stander walks off into a fall. The
  jt11-5 comment at `:286-290` even names the LNDB7 "do not land" case and **still** only calls `walkOff`.
- `enemy.ts:1321-1322`, `:1341-1344` — identical logic for enemies; `'troll'` ignored / → `walkOff`.
- `sim.ts:1536` — egg fall: same check, `'troll'` never handled.
- **No lava-death on the free-fall path:** `isLavaDeath` (`arena.ts:274-277`, the `CMPA #FLOOR+7 / BHS`
  transcription) has exactly **one** caller — `stepGrip` (`troll.ts:187`). The normal airborne branch
  (`frame.ts:266-276`) applies only `applyCeiling` (top clamp) + `wrapX`; there is no floor/lava clamp,
  so `posY` integrates unbounded → off-screen.
- **Grab is bound once-per-wave to the CLIF5-nearest bird, not to a wanderer:** `pickTrollVictim`
  picks the bird nearest `TROLL_CLIF5_X = 148` (`sim.ts:830-832, 908-926`); `insertTroll`/`trollProcess`
  bind that one victim (`sim.ts:2652-2661, 872-906`); `stepTrolls` only advances that pre-bound
  `victimId` (`sim.ts:959-1020`). A player at shore X `0-54`/`240-300` is far from X=148 and is never
  dynamically grabbed.
- Corroborating (stale): `events.ts:46-49` records "LAVA TROLL grab (SNTROL :8097) cannot fire."

### ROM citations (JOUSTRV4.SRC)
- `:6764` `LNDB7 EQU * LAVA TROLLS` — the CKGND landing-dispatch case for the lava mask.
- `:6765-6773` `LDA TTROLL / BNE LNDB7C … CMPA #$80+PLYID / BEQ 1$ / CMPA #$80+EMYID / BNE LNDB7C` —
  gate: troll active, not too many, toucher is a player or enemy.
- `:6774-6790` `INC LAVNBR … LDX #LAVAT1 / LDU PPREV / JSR VCUPROC … STU PJOY,Y` — **the grab is
  spawned by the ground-check itself**: the instant an entity's feet touch an LNDB7 cell, CKGND creates
  a `LAVAT1` lava-troll process bound (via PJOY) to *that* entity.
- `:6792` `LNDB7C LDB PPOSY+1,U ; INDICATE NOT TO LAND / RTS` — returns NE ("do not land").
- `:6508-6509` `ADGCEI CMPA #FLOOR+7 / BHS ADGFLR` — the FLOOR+7 lava-death every normal fall runs in
  the ROM (the clone applies it only inside the grip).
- `:8097` `SNTROL … ; CAPTURED BY LAVA TROLL SOUND` — the grab cue that never sounds.

### Minimal fix
Add a `kind === 'troll'` branch to the ground consumers (`frame.ts:275-295`, `enemy.ts:1321-1344`,
`sim.ts:1536`) that **binds a lava troll to the current entity** (ROM LNDB7 `VCUPROC LAVAT1`,
`:6776-6790`) — hand the entity to `trollProcess`/`insertTroll` with `victimId` = this entity, gated
on `TTROLL`/`LAVNBR` like the ROM — instead of letting `walkOff` drop it. Independently, add the
`isLavaDeath` (FLOOR+7, `arena.ts:274`) gate to the normal airborne fall (`frame.ts:266-276`,
`enemy.ts:1315-1322`) so a non-gripped entity dying in lava is killed rather than falling off-screen.
The narrowest single wire is the `'troll'` branch — the one unconsumed outcome jt11-12(2) points at.

---

## DEFECT B — the lava is not visible  (ABSENT)

### Root cause
The lava molten pool is **never rendered**. `drawList` emits only BRIDGE/BRIDG2 planks, cliff
BACKGROUND_RECORDS, crumbles and entities; there is no draw op for the lava surface, so the molten
region is left as the frame-clear colour (palette index 0 = black).

### Evidence (file:line)
- `sim.ts:2893-2954` — `drawList` emits `kind:'fill'` planks (`:2906-2909`), `kind:'arena'` cliff
  records (`:2916-2927`), `kind:'crumble'` (`:2935-2954`), entities. **No lava op.**
- `sim.ts:305-312` — `DrawOp.kind` is exactly `'arena' | 'entity' | 'fill' | 'crumble'`; no `'lava'`.
- `main.ts:592-595` — every frame clears the canvas with `colours[0]`
  (`fillRect(0,0,LOGICAL_WIDTH,LOGICAL_HEIGHT)`); the burned span and the space under the bridges
  render as index-0 background.
- `main.ts:132-172` — `blitOp` handles fill/atlas/mirror; `drawIsland` (`:162-172`) paints only the
  COMCL5 bottom island; nothing paints a lava surface.
- Only the lava *level scalar* is transcribed, for game-logic rise, not rendering: `arena.ts:125-130`
  (`LAVA_START = 0xEA`, `LAVA_MIN`, `LAVA_STEP`), consumed only by the per-wave rise `arena.ts:330`.
  No `LAVAB`/`LAVAF` pixel blocks exist in `pictures.ts` (only `ILAVAT`/`GRAB1..6` troll-hand frames,
  `pictures.ts:1721,1731`).
- After a column burns, `drawList` drops the planks once `bridgeBurned` (`sim.ts:2906`) and filters the
  destroyed cliff's records (`sim.ts:2915-2917`) → the vacated region is drawn by nothing → black.

### ROM citations (JOUSTRV4.SRC)
- `:962-963` `LDA #$EA ; START LEVEL OF LAVA … / STA SAFRAM` — the lava surface level (ported as a
  constant, not rendered).
- `:1050-1052` `LDX VLAVA … / JSR VCUPROC ; CREATE THE LAVA BUBBLING PROCESS` — the dedicated bubbling
  process, absent from the clone.
- `:2175` `LDX #LAVAB` (in `STBRID`) — the bubbling-lava image block, not transcribed.
- `:1958`/`:1967` `LDX #LAVAF ; LAVA FLAMES`, `:1962`/`:1971` `LDD #FLOOR+16 ; START FLAME UNDER LAVA`
  — lava-flame images, not transcribed.
- `:1929-1933` `LDA SAFRAM ; RAISE LAVA … / SUBA #$5` — the rise logic (this part *was* ported,
  `arena.ts:330`).

### Minimal fix
Add a lava draw op to `drawList` — a new `kind:'lava'` (or reuse `kind:'fill'`) rectangle painting the
molten pool between/under the shore planks at the current `SAFRAM`/`LAVA_START`-derived surface Y, in a
transcribed lava palette index, drawn in the background layer **before** entities, and continuing to
fill the burned span after `bridgeBurned`. A faithful version additionally transcribes the `LAVAB`
bubbling image (`:2175`) and `LAVAF` flames (`:1958`) into `pictures.ts` driven by a `VLAVA`-style
process; the minimal *visible* fix is the solid molten fill at the surface level. This mirrors the
jt11-7 "a new DrawOp kind needs BOTH the union AND a `main.ts`/`render.ts` paint fn" seam — a
core-only drawList op is invisible without its shell consumer.

## Test Design (outline — TEA to expand)

Split by defect; both read observable state off `stepSim`/`drawList`, never a new field by name.

### Defect A
- **AC-A1 — a player standing on a burned bridge column is grabbed, not dropped.** Burn the bridge
  (advance to the burn wave, or seed `bridgeBurned`), place/step a player onto a shore column
  (x 0-54 / 240-300), and assert a troll grip becomes bound to *that* entity (its gravity routine
  repoints to ADDLAV / it enters the grip) within a frame — not that its `posY` integrates past the
  floor. **RED today:** it walks off and `posY` runs off-screen.
  - *Non-vacuity control:* a player on an intact platform is NOT grabbed.
- **AC-A2 — a non-gripped entity that reaches lava depth dies, not falls off-screen.** With the lava
  kill-plane wired, an entity whose `posY>>8 >= DEATH_Y` (FLOOR+7, `arena.ts:274`) is killed. Guards the
  free-fall gap. Assert death, and that `posY` never exceeds the logical height.
- **AC-A3 — enemies and eggs over LNDB7 take the same path** (`enemy.ts:1321-1344`, `sim.ts:1536`), not
  just the player.
- **AC-A4 — seeded replays / troll wave gate unchanged:** the once-per-wave CLIF5 victim
  (`pickTrollVictim`) still fires; the new dynamic grab does not double-spawn or change the troll wave
  (BRIDGE_WAVE + TROLL_DELAY). Re-baseline any moved seeded fixture with the `rng` law verified first.

### Defect B
- **AC-B1 — the lava region is painted (shell-visible).** A shell test that the lava draw op is
  emitted by `drawList` for the molten span AND consumed by the `main.ts`/`render.ts` painter (the
  jt11-7 lesson: assert the consumer runs, not just the op exists). **RED today:** no `'lava'` op.
- **AC-B2 — the burned span is filled with lava, not black,** after `bridgeBurned`: the destroyed
  columns' region carries the lava fill rather than index-0.
- **AC-B3 — the fill tracks the lava surface level** (`LAVA_START`/`SAFRAM`), and rises with the
  per-wave `arena.ts:330` rise.

### Rule coverage
| Rule | Test |
|------|------|
| core/shell boundary | `purity` — core drawList change stays pure; DOM only in `main.ts`/shell |
| new DrawOp kind needs union + paint fn (jt11-7 / joust-drawlist-render-seam) | Defect B: pin BOTH the op and its shell painter |
| ROM citations resolve | `troll-source.test.ts` / `arena` source tests for any anchor added |
| test-file count anchor | bump `plugins/joust/README.md` file count if a test file is added |

## Acceptance Criteria
1. A player standing/landing on a burned bridge column is seized by a lava troll bound to that entity
   (ROM LNDB7 `VCUPROC LAVAT1`, `:6776-6790`) — it does not walk off into a fall.
2. A non-gripped entity that reaches lava depth (FLOOR+7) dies; nothing integrates off the bottom of
   the screen.
3. Enemies and eggs over LNDB7 follow the same grab/lava-death path, not just the player.
4. The lava molten pool is rendered (a lava draw op emitted AND painted), so the hazard is visible.
5. The burned-away span shows lava, not black, after the bridge burns; the fill tracks the surface
   level and its per-wave rise.
6. The once-per-wave CLIF5 troll victim and the troll wave gate are unchanged; seeded replays
   re-baselined with the `rng` law verified untouched.

## Out of scope
- Pixel-faithful `LAVAB` bubbling animation and `LAVAF` flame frames — the minimal fix is the solid
  molten fill; the animated images may be a follow-on if the owner wants full fidelity.
- CLFDES cliff-crumble (jt11-7, shipped) and the destruction-consumption refactors (jt11-12).

---
_Authored by Architect-tier investigation (design). Root cause gathered against `plugins/joust/src/core` and `src/main.ts` on 2026-08-13; ROM citations verified against `reference/williams-source/joust/JOUSTRV4.SRC`._
