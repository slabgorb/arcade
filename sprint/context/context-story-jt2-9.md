# Story jt2-9 Context

## Title
Playtest follow-up (user, 2026-07-20): ledge seat + turning/facing + joust-facing feel + render polish. (1) LEDGE SEAT: the ground Y lands sprites too low on ALL ledges — feet clip through platform tops (user screenshots in the jt2-7 archive); derive the correct per-ledge seat Y from the dossier's platform/collision data, don't eyeball it. (2) TURNING: direction input never flips facing — port the ROM's turn mechanics (air PFACE flip; ground turn through the jt2-3 ground state machine's onMinus/skid chain, which is landed and tested but unreachable from input) and FLIP SPRITES at the blit by facing (blitOp draws right-facing only; the 'Facing is applied at the blit' comment in demo.ts is stale — fix it). (3) JOUST-FACING FEEL: colliding backwards wins the joust even when faced the wrong way — jt2-3's OSTBO transcription is height-only (facing-independent), so verify against the ROM before changing ANY law (ROM is canonical; the likely real fix is (2) so the player can point the right way); document the ruling either way. (4) Reviewer round-2 checks: per-tier z-depth (single destY>=0xC0 threshold is an approximation — dossier-cite the real per-platform depth), mount+rider blit alignment, run-frame cadence (rail pins >=2 distinct BRRUN frames, not the gait speed — tune to the ROM/feel). (5) Leftovers: cap/drain DemoState.events once consumed; BWNG1R/BWNG2R dangling collision-table refs (jt1-3 debt).

## Metadata
- **Story ID:** jt2-9
- **Type:** story
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** joust
- **Epic:** Joust — the joust slice (scheduler, enemies + intelligence budget, joust resolution, eggs, wave machine core, transporters)

## Problem

This story captures the user's playtest feedback from the jt2-7 demo (2026-07-20), documented in the jt2-7 session archive under "Remaining items (non-blocking) + USER PLAYTEST flags" (lines 405–421). The demo ships functionally but with four user-visible glitches and one data-structure debt. Five candidate ACs below, tied to concrete source pointers the jt2-7 Reviewer already established.

## Technical Approach

### (1) LEDGE SEAT: ground Y lands sprites too low on all ledges

**Source:** jt2-7 user playtest finding (archive line ~55) — "objects on the LOWER platform draw with incorrect z-index" and related ground positioning. The Reviewer observed (archive line 410) that this is a Y-position issue across all ledges.

**Data sources:**
- `joust/docs/rom-study/` — platform/collision data (BACKGROUND_RECORDS and per-ledge Y constants)
- `src/core/arena.ts` — the BACKGROUND_RECORDS structure the demo already uses
- `src/core/flight.ts` — the baseline flight-core seat Y, if used as reference

**Action:** Derive correct per-ledge SEAT_Y values from the dossier's platform collision data. Do NOT eyeball pixel positions; measure from the documented collision geometry.

### (2) TURNING/FACING: input never flips facing; sprites blit right-facing only

**Source:** jt2-7 user playtest (archive line ~409) — "Sprite FACING / direction flip (LOW — flag, likely a follow-up)." Confirmed: nothing applies horizontal flip by `facing`.

**Code & data sources:**
- `src/main.ts:82-84` (jt2-7 archive line 407) — `blitOp` blits every frame un-flipped; only right-facing names are returned
- `src/core/demo.ts` — `enemyFrame` comment "Facing is applied at the blit" (archive line 409) is STALE; no such flip occurs
- `src/core/flight.ts` — PFACE (air-facing) register behavior; needs porting
- jt2-3 ground state machine — onMinus/skid chain is LANDED and TESTED but unreachable from input (archive line 410)
- ROM (JOUSTRV4.SRC) — air PFACE flip; ground turn mechanics (cited in epic-jt2.yaml jt2-3 description)

**Action:** 
1. Port ROM's turn mechanics: in-air PFACE flip; on-ground turn via the jt2-3 state machine's onMinus/skid chain.
2. Apply horizontal sprite flip at the blit site (main.ts `blitOp` or demo.ts `enemyFrame`/`playerDrawList`) based on the entity's facing value.
3. Update the stale comment in demo.ts to reflect actual blit behavior.

### (3) JOUST-FACING FEEL: backwards collision wins joust (facing-independent)

**Source:** jt2-7 user playtest (archive line ~409) — "Z-order across ALL platform tiers." The Reviewer noted (archive lines 410–411) that the OSTBO transcription is HEIGHT-ONLY, so verify against the ROM before changing any law.

**Data sources:**
- jt2-3 description (epic-jt2.yaml lines 40–42) — OSTBO sub-pixel resolution (PLANTZ + PPOSY)
- jt2-8 chore (epic-jt2.yaml lines 114–116) — "OSTBO: AC-1 ... the ROM compares WHOLE PIXELS + PLANTZ (fraction EXCLUDED, PPOSY offset +0 vs the flight core's +1 — RAMDEF.SRC:174, JOUSTRV4.SRC:5008-5009, 6494, 6071-6072)"
- ROM (JOUSTRV4.SRC:5002-5012) — the real joust law, cited in epic-jt2.yaml jt2-3

**Action:** Verify the joust law against the ROM BEFORE changing any constant. If the current transcription (height-only, facing-independent) is correct, document it. If the ROM does use facing in the joust, derive the rule and add a claim. The likely real fix is (2) — letting the player point the right way — rather than an OSTBO law change. Document the ruling either way.

### (4) RENDER POLISH round-2 checks

**Source:** jt2-7 Reviewer (archive lines 410–412).

#### 4a: Per-tier z-depth

**Data sources:**
- `src/core/demo.ts` — `isForegroundArena` (archive line 410) uses single `destY >= 0xC0` threshold plus island drawn last
- `joust/docs/rom-study/` — per-platform depth constants and the dossier's platform tier definitions

**Action:** Verify the real per-platform depth ordering from the dossier. The current single-threshold is disclosed as approximate; derive true per-tier depth from BACKGROUND_RECORDS or ROM (cite the dossier). Implement the precise ordering; mutation-test the per-platform z-order.

#### 4b: Mount + rider blit alignment

**Data sources:**
- `src/core/demo.ts` — `playerDrawList` (archive line 410) blits mount and rider at the SAME origin (no offset)
- jt2-7 archive line 412 — "Mount + rider alignment. `playerDrawList` blits mount and rider at the SAME origin (no offset). Dev's screenshot showed the ostrich under the rider; **user: confirm the rider sits correctly on the mount**"

**Action:** Verify mount+rider positioning is correct. If an offset is needed, derive it from ENTITY_RECORDS or ROM sprite geometry. Confirm in-browser that the rider sits correctly on both mounts.

#### 4c: Run-frame cadence

**Data sources:**
- Rail 2a (jt2-7 archive line 412) — pins ≥2 distinct BRRUN frames, not the gait speed
- `src/core/demo.ts` — `enemyFrame` cycles BRRUN1–4 by `animPhase`
- ROM (jt2-7 archive, "run-frame cadence" note) — tune to ROM/feel

**Action:** Confirm the run-animation cadence feels natural. Rail 2a pins ≥2 distinct BRRUN frames; the exact speed/order should match ROM timing or feel correct in-browser. Measure cadence from ENTITY_RECORDS frame timing if available; adjust if needed.

### (5) Leftovers

**Source:** jt2-7 Reviewer (archive lines 299–301, 415–420).

#### 5a: Cap/drain DemoState.events

**Data sources:**
- `src/core/demo.ts` (archive line 299) — `DemoState.events` accumulates uncapped and is unread by main.ts
- Once collision resolves and score events flow, events grow unbounded

**Action:** Add a cap or drain mechanism so events don't accumulate indefinitely. Consume them in main.ts or reset the array on each frame.

#### 5b: BWNG1R/BWNG2R dangling collision refs

**Data sources:**
- `src/core/pictures.ts` — jt2-7 Reviewer (archive line 420) confirms BWNG1R/BWNG2R are ENTITY_RECORDS names with no COLLISION_TABLES entry (jt1-3 transcription debt)
- jt2-7 archive Delivery Findings (line 72) — "only buzzard/ostrich wing masks that exist are BWNG3R/CWNG3R"

**Action:** Optional jt1-3-debt follow-up to reconcile dangling names. Live code correctly uses BWNG3R; this is non-blocking but should be tracked.

## Scope
- In scope: the five items above — ledge seat Y, turning/facing input & sprite flip, joust-facing rule verification, per-tier z-depth & mount alignment & run cadence, events cap & BWNG refs.
- Out of scope: new ROM transcriptions beyond the existing jt2-1..jt2-7 scope.

## Acceptance Criteria

TEA to define during the RED phase. Candidate ACs per the five items:

1. **Ledge seat:** all ledges land sprites at the correct Y (derived from dossier collision data, not eyeballed); the AC is proven by unit test on a per-ledge sample.
2. **Turning/facing:** direction input flips facing (air PFACE + ground state-machine path both reachable); sprites flip horizontally by facing at the blit. The AC is proven by test or browser walk-through.
3. **Joust-facing:** ruling on OSTBO + facing interaction documented and verified against ROM (or re-derived if needed with a claim); the AC specifies the law and the evidence.
4. **Render polish:** per-tier z-depth derived from dossier and tested per platform; mount+rider alignment verified in-browser; run-frame cadence confirmed to feel natural and cycle ≥2 distinct BRRUN frames. The AC is proven by test + browser confirmation.
5. **Leftovers:** `DemoState.events` capped/drained; BWNG dangling refs noted (optional follow-up tracked). The AC confirms events drain and no unbounded growth occurs.

---
_Enhanced from `pf context create story jt2-9` with source-level pointers from jt2-7 archive (lines 55, 72, 299-301, 405-421)._

---
_Generated by `pf context create story jt2-9` from the sprint YAML._
