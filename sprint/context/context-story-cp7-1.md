# Story Context: cp7-1

**The spider points readout is mirrored — the picture byte's flip bits are dropped at bake**

- **Epic:** cp7 (centipede playtest followups, measured before filing)
- **Points:** 3 · **Workflow:** tdd · **Priority:** p2
- **Repos:** arcade · **Branch:** none (trunk-based; `feat/cp7-1-points-sprite-flip` is a claim beacon only)

---

## What SM measured at setup, and what changed as a result

The filing is unusually good and its **root cause is confirmed**, independently, two ways.
Three of its statements did not survive measurement. Read this section before the
description, because two of the corrections change what you build.

### CONFIRMED — the bug reproduces exactly as filed

Decoded `THREE` (`0x1B0`), `SIX` (`0x1C0`) and `NINE` (`0x5B0`) out of the byte-gated
`pictures.ts` data and pushed them through `orientForScreen` verbatim (probe run under plain
`node`, which type-strips the `.ts` directly). The current bake renders:

```
THREE @0x1b0 CURRENT              THREE, ROM rows reversed, then ROT270
...###.###.###..                  ..###.###.###...
...#.#.#.#.#....                  ....#.#.#.#.#...
...#.#.#.#.###..                  ..###.#.#.#.#...
...#.#.#.#.#....                  ....#.#.#.#.#...
...###.###.###..                  ..###.###.###...
   0   0   Ǝ   (mirrored)            3   0   0   (correct)
```

`SIX` and `NINE` behave identically. **"0 0 backwards-3" is exactly right.** The stored ROM
bitmap really is mirrored, and bit 7 of the picture byte is the flip that un-mirrors it.

### CONFIRMED a second way — by control flow, which the filing did not do

`CENIR4.MAC:328-368` is the display routine that turns `MOBJP` into the hardware `PICT` byte.
For slot 13 (`BUGP`, the spider) it takes the `BCS 33$` branch and skips **both** masks, so
`PICT = MOBJP` raw and bit 7 of `0xB6/0xB7/0xB8` reaches the hardware untouched. The ROM
comment at :331 says so out loud: `;LEAVE PICTURE ALONE IF SPIDER OR "100",ETC`. The picture
byte's flip bit is intended to fire here. We drop it. That is the bug.

### CORRECTION 1 — "every other picture code has bits 6-7 clear" is FALSE for the segments

The conclusion (only the points sprites are visibly wrong) survives; the stated reason does
not, and a Dev who trusts it will be surprised the first time they print a body segment's
`pic`.

- `src/core/centipede.ts:63-71` — `CENT_BODY_PIC = 0x42`, `BODY_BIT = 0x40` (**bit 6 set on
  every body segment**), `DEAD_BIT = 0x80` (**bit 7**), `POISON_BIT = 0x20`.
- `CENDE4.MAC:129-137` states it: *"D6=0 FOR HEAD"*, *"D5=1 FOR POISONED CENTIPEDE HEAD,
  D7=1 FOR NO OBJECT"*.

The segments are exempt **by control flow, not by clear bits**: `CENIR4.MAC:347-351` branches
on the slot index (`CPX I,NCENT` / `BCS 33$`) and only then runs `AND I,3F` and `AND I,0F`,
stripping bits 5-7 for centipede slots **alone**. Our `render.ts:70-72`
`segmentStamp(pic & 0x0F)` already mirrors that mask, which is why nothing looks wrong there.

### CORRECTION 2 — this is why AC-3 cannot be satisfied in the bake alone

AC-3 requires the fix be **driven by the picture byte's bits 6 and 7, not by a hardcoded list
of three stamp names**. That constraint has teeth, and here is the fact that gives it teeth:

**The `HEAD0-F` stamps are shared by two populations with different flip bits.**
`render.ts:215` blits `segmentStamp(seg.pic)` for live segments, and `render.ts:229` blits
`segmentStamp(spider.pic)` for explosions `0xFA-0xFF` — the *same* stamp names, reached once
with bits 6-7 clear and once with **both set** (a 180° turn). A per-stamp flip decided at bake
time has exactly one answer per stamp name and therefore **provably cannot express both**.

So a bits-driven mechanism has to live where the picture *code* is still in hand — the
`code → stamp` mapping (`spiderStamp`, `segmentStamp`, `fleaStamp`, `scorpionStamp`), carrying
`flipX/flipY` alongside the name to the blit. That route lands on AC-5: it needs `ctx.scale`,
and AC-5 already scripts the answer — revisit the `tests/atlas-orientation.test.ts:150-155`
transform ban **deliberately, with the reason written down**. Do not slip past it on the
technicality that `ctx.scale` is unlisted.

This is a design call for TEA/Dev, not SM. What SM owes you is the measurement above, so the
call is made on evidence rather than on which route looks smaller.

### CORRECTION 3 — the blast radius I measured belongs to a fix the ACs RULE OUT

Recording this because a number this reassuring is dangerous when detached from its variant.

| what was measured | result |
|---|---|
| baseline `npx vitest run --project centipede` | **62 files / 1160 tests, green** |
| hardcoded `MIRRORED = new Set(['THREE','SIX','NINE'])` flip in `buildAtlas` | **zero red** — 62/1160 still green |

That zero is real, but it is the radius of the **hardcoded-stamp-name** variant, which AC-3
forbids. It is *not* evidence about the bits-driven fix, which touches the blit path and the
transform guard. cp6-3 recorded the trap directly: *"the near-zero blast radius belonged to
the WRONG fix — read the radius, do not just record it."* Re-measure against whatever you
actually build. (Probe applied to a `cp` backup and restored byte-identical; `git status`
clean — the working tree carries none of it.)

---

## Acceptance Criteria

1. The three PTS sprites (0xB6 300, 0xB7 900, 0xB8 600) render correctly-handed on screen, verified by decoding the shipped atlas pixels in a test rather than by eye — a golden that a mirrored bake fails.
2. orientForScreen (src/shell/atlas.ts:38-48) is UNCHANGED and all five pins in tests/atlas-orientation.test.ts (:74-83, :86-88, :95-107, :109-124, :126-139) stay green — the flip is layered on top of the rotation, never substituted for it.
3. The fix is driven by the picture byte's bits 6 and 7, not by a hardcoded list of three stamp names, so any future code carrying a flip bit is oriented correctly and the mechanism is named in a comment citing CENDE4.MAC:239 and :248.
4. src/core/pictures.ts data is byte-identical and tests/pictures.test.ts SHA-256 gate is green; only the :317-324 comment codifying the lossy offset formula may change, and it now states that bit 7 is flip, not address.
5. If the fix draws with a canvas transform, the render.ts transform ban at tests/atlas-orientation.test.ts:150-155 is revisited DELIBERATELY with the reason written down — not left passing on the technicality that ctx.scale is unlisted.
6. The adjacent bit-6 risk is FILED as its own story and not fixed here: the offset formula disagrees with hardware for codes with bit 6 set (0xFF decodes 0x7F0 by formula, 0x5F0 on hardware) and render.ts:70-72 sidesteps it for explosions via segmentStamp(pic & 0x0F), so the explosion pool may draw wrong sprites — the story records what was found, measured, not assumed.
7. A spider is shot in a live run and the readout is read off the screen, because a correctly-decoded atlas can still be blitted to the wrong place.
8. SETUP FINDING, also FILED and not fixed here: the direction-derived facing flip is unimplemented. CENIR4.MAC:332-340 loads Y from MOBJDH for every motion object EXCEPT slot 13 (LDY I,0 / CPX I,13. / BEQ 35$ — comment: LEAVE PICTURE ALONE IF SPIDER OR 100, ETC) and EORs bit 7 of it into the hardware picture at :368, so segments, flea, scorpion and shot all mirror to face their travel direction on the cabinet. Nothing in plugins/centipede implements any flip and blit() has no flip parameter.

---

## Sites

| File | Lines | What is there |
|---|---|---|
| `plugins/centipede/src/shell/atlas.ts` | 38-48 | `orientForScreen` — **correct, do not edit** (AC-2) |
| `plugins/centipede/src/shell/atlas.ts` | 101-113 | `buildAtlas` loop — one orientation per stamp name, no notion of a per-picture flip |
| `plugins/centipede/src/shell/render.ts` | 42-47 | `SPIDER_PTS_STAMPS` — where the PTS code loses bits 6-7 |
| `plugins/centipede/src/shell/render.ts` | 70-72 / 78-83 | `segmentStamp` / `spiderStamp` — the `code → name` mapping, i.e. the discard site |
| `plugins/centipede/src/shell/render.ts` | 112-123 | `blit()` — no flip parameter today |
| `plugins/centipede/src/shell/render.ts` | 215 / 229 | the two `segmentStamp` call sites that share `HEAD0-F` across flip populations |
| `plugins/centipede/src/core/pictures.ts` | 317-324 | the comment stating the lossy formula (AC-4 — comment only; bytes are SHA-256 gated) |
| `plugins/centipede/tests/atlas-orientation.test.ts` | 74-139 | the five rotation pins that must stay green |
| `plugins/centipede/tests/atlas-orientation.test.ts` | 150-155 | the render.ts transform ban (AC-5) |

**ROM references** (`reference/atari-source/centipede/revision.v4/`): `CENDE4.MAC:239` (CKC0),
`:248` (CK40), `:129-137` (MOBJP bit layout); `CENIR4.MAC:328-368` (the display routine —
the flip's actual consumer, and the citation the filing was missing).

---

## Notes for whoever picks this up

- **AC-7 needs a live run.** Serve your own checkout on a spare port and prove whose server
  answers before trusting a screenshot — `just serve` pins 5270 and a sibling checkout can
  coexist on `[::1]:5270`. Holding a key needs a real `keydown` on `window` plus ~24 frames,
  not a `press()`.
- **The probe recipe is cheap and worth re-running.** Import `pictures.ts` under plain `node`
  and print the grid as ASCII; it turns "is it mirrored?" into a five-second question.
- **AC-6 and AC-8 are FILE-not-FIX.** Two follow-up stories, measured rather than assumed.
  AC-8 is the larger of the two and was not in the filing at all.
