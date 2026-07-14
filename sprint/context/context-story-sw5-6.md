# Story sw5-6 Context

## Title
Pin TRENCH_WALL_H from the ROM and seat the exhaust port in the trench — the re-ported PORT plate hangs half below the floor

## Metadata
- **Story ID:** sw5-6
- **Type:** bug
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** star-wars
- **Epic:** Star Wars — ROM wireframe geometry (contact-sheet audit)

## Problem

sw5-4 re-ported `EXHAUST_PORT` from ROM `.WP PORT` as a **512×512 plate flat in z=0**, replacing an
authored octagon that had been a hole *in the floor*. But `sim.ts spawnPort` still centres the model
at world **y=0**. So the plate spans world **y = −256 … +256** while the trench channel is
**y = 0 … 320** — its lower half hangs below the trench floor.

**This is a visual defect, not (yet) a gameplay regression.** The port's centre is still y=0, exactly
where the octagon was, so the aim point and the difficulty of aiming are *unchanged from pre-sw5-4*.
That is why sw5-4's reviewer downgraded it from blocking and filed it here instead.

Reproduced independently twice — by Dev during sw5-4 implementation and by the Reviewer in a dev
server at z=−2400 / −700 / −300 — through the real `render()` path, not a hand-rolled projection.

## Technical Approach

**The evidence points at the trench, not the port.** The ROM's PORT base half-width is **256 —
exactly `TRENCH_HALF_W`**. The plate spans the trench width *perfectly*. That is strong independent
corroboration that 256 is right and that the trench cross-section is 512×512 — which would make
`TRENCH_WALL_H = 320` the wrong number. That constant's own comment already admits it is
`PROVISIONAL … not pinned`.

⚠️ **512 is an inference, not a pin.** The sw5-4 reviewer said the cross-section is "very likely"
512×512. AC-2 does not say "assume 512" — it says **pin it from the ROM**. Guessing this constant is
precisely the sin this epic exists to undo, and a guess that happens to land on 512 is still a guess.
Go to the ROM source and *find* the height. If the ROM turns out not to give it, say so explicitly
rather than quietly adopting 512.

Two moving parts:
1. **`src/core/trench-channel.ts`** — pin `TRENCH_WALL_H` from ROM, retiring the `PROVISIONAL` marker.
2. **`src/core/sim.ts`** (`spawnPort`) — raise the spawn so the plate is *seated in the channel*
   rather than straddling the floor.

**Raising the port MOVES THE AIM POINT.** That is a real difficulty change and AC-3 holds it to the
same standard sw5-4's AC-4 was held to: tested and called out explicitly in Delivery Findings, never
slipped in.

**Do not scale the model** (AC-4). It is the tempting fix and sw5-4's Dev already refused it. Scaling
breaks the world↔ROM 1:1 unit contract that two things stand on: `romCompare`'s deep vertex compare
(the contact sheet's 0/0 drift) and the WYSIWYG bound tying `PORT_HIT_RADIUS` (108, world units) to
the porthole's 96 (model units). **The port needs no scale; the trench needs a height.**

**Mind the collision guard.** `PORT_HIT_RADIUS = 108` carries only a ~0.33u anti-tunnelling margin —
sw5-4 added a guard test that fails loudly at 109 (`STEP/2 + TRENCH_SCROLL_SPEED*FRAME >
PORT_HIT_RADIUS`). Moving the port must not silently degrade that swept-collision test into a no-op.

**ROM quarry:** the 1983 "Warp Speed" source is at `/Users/slabgorb/Projects/star-wars-1983-source-text`
(`WSGRND.MAC` for ground/trench, `WSOBJ.MAC` for object draw routines). **`WSOBJ.MAC` is `.RADIX 16` —
its `.PH` vertices are HEX, not decimal.** Trench-geometry equates elsewhere may share that radix;
check before reading any number as decimal.

## Scope

- **In scope:** `TRENCH_WALL_H` pinned from ROM; `spawnPort` vertical placement; the aim-point /
  difficulty consequence, tested and documented; re-checking trench furniture (turrets, squares,
  catwalks) and `TRENCH_SKIM`, all of which are scaled off the `TRENCH_HALF_W`/`TRENCH_WALL_H`
  anchors and are currently tuned to 320 (AC-5).
- **Out of scope:** any change to `models.ts` geometry or scale — the ROM port is approved and
  0/0-drift verified; leave it 1:1. No re-litigating `TRENCH_HALF_W = 256`.

## Acceptance Criteria
- The defect: sw5-4 re-ported EXHAUST_PORT from ROM '.WP PORT' as a 512x512 plate flat in z=0, but sim.ts spawnPort still centres it at world y=0 (the floor) — correct for the old octagon, which was a hole IN the floor, wrong for a vertical plate. Half the target hangs below the trench floor. Reproduce it in the dev server before touching anything.
- The evidence says the TRENCH is wrong, not the port: the ROM base half-width is 256, EXACTLY TRENCH_HALF_W. The plate spans the trench width perfectly — strong independent corroboration that 256 is right and that the cross-section is 512x512. Meanwhile TRENCH_WALL_H = 320 is a guess whose own comment admits it (PROVISIONAL ... not pinned). Pin it from the ROM.
- Raise spawnPort so the plate is seated in the channel. This MOVES THE AIM POINT (today the port centre is at y=0, where the octagon was, so aiming is unchanged from pre-sw5-4). The difficulty change must be tested and called out explicitly, not slipped in — same standard sw5-4 AC-4 was held to.
- DO NOT scale the model to make it fit. models.ts must stay 1:1 with raw ROM units or two things break: romCompare's deep vertex compare (sw5-4 AC-5, the contact sheet's 0/0 drift) and the WYSIWYG bound tying PORT_HIT_RADIUS (108, world units) to the porthole's 96 (model units). The port needs no scale; the trench needs a height.
- Trench furniture (turrets, squares, catwalks) and TRENCH_SKIM are all scaled off the TRENCH_HALF_W/TRENCH_WALL_H anchors — re-check them against the new height rather than leaving them tuned to 320.

---
_Generated by `pf context create story sw5-6` from the sprint YAML._
