---
story_id: "cp7-1"
jira_key: "cp7-1"
epic: "cp7"
workflow: "tdd"
---
# Story cp7-1: The spider points readout is mirrored — the picture byte's flip bits are dropped at bake

## Story Details
- **ID:** cp7-1
- **Jira Key:** cp7-1
- **Workflow:** tdd
- **Points:** 3
- **Repos:** arcade
- **Stack Parent:** none (stack root)
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch `main`)
- **Branch:** none
- **PR:** none

`feat/cp7-1-points-sprite-flip` exists on origin as a CLAIM BEACON only — pushed at setup so a
sibling checkout can see this story is taken. No commits land on it; delete it at finish.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-04T11:26:44Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-03T22:00:33Z | 2026-08-03T22:03:32Z | 2m 59s |
| red | 2026-08-03T22:03:32Z | 2026-08-04T10:03:55Z | 12h |
| green | 2026-08-04T10:03:55Z | - | - |

## Story Acceptance Criteria

1. The three PTS sprites (0xB6 300, 0xB7 900, 0xB8 600) render correctly-handed on screen, verified by decoding the shipped atlas pixels in a test rather than by eye — a golden that a mirrored bake fails.
2. orientForScreen (src/shell/atlas.ts:38-48) is UNCHANGED and all five pins in tests/atlas-orientation.test.ts (:74-83, :86-88, :95-107, :109-124, :126-139) stay green — the flip is layered on top of the rotation, never substituted for it.
3. The fix is driven by the picture byte's bits 6 and 7, not by a hardcoded list of three stamp names, so any future code carrying a flip bit is oriented correctly and the mechanism is named in a comment citing CENDE4.MAC:239 and :248.
4. src/core/pictures.ts data is byte-identical and tests/pictures.test.ts SHA-256 gate is green; only the :317-324 comment codifying the lossy offset formula may change, and it now states that bit 7 is flip, not address.
5. If the fix draws with a canvas transform, the render.ts transform ban at tests/atlas-orientation.test.ts:150-155 is revisited DELIBERATELY with the reason written down — not left passing on the technicality that ctx.scale is unlisted.
6. The adjacent bit-6 risk is FILED as its own story and not fixed here: the offset formula disagrees with hardware for codes with bit 6 set (0xFF decodes 0x7F0 by formula, 0x5F0 on hardware) and render.ts:70-72 sidesteps it for explosions via segmentStamp(pic & 0x0F), so the explosion pool may draw wrong sprites — the story records what was found, measured, not assumed.
7. A spider is shot in a live run and the readout is read off the screen, because a correctly-decoded atlas can still be blitted to the wrong place.
8. SETUP FINDING, also FILED and not fixed here: the direction-derived facing flip is unimplemented. CENIR4.MAC:332-340 loads Y from MOBJDH for every motion object EXCEPT slot 13 (LDY I,0 / CPX I,13. / BEQ 35$ — comment: LEAVE PICTURE ALONE IF SPIDER OR 100, ETC) and EORs bit 7 of it into the hardware picture at :368, so segments, flea, scorpion and shot all mirror to face their travel direction on the cabinet. Nothing in plugins/centipede implements any flip and blit() has no flip parameter.

## SM Assessment

**Setup complete.** Story was free on every probe: no `cp7*` remote branch, no `cp7-1` session
in `a-1`/`a-2`/`a-3`, tree clean at `50c1b38`. Claimed, beacon pushed, ACs written to the epic
YAML first and injected into this file and the context from that one source.

### The filing was measured, not inherited

Full detail in `sprint/context/context-story-cp7-1.md`. Summary of the four findings:

1. **CONFIRMED — the bug reproduces exactly as described.** Decoding `THREE`/`SIX`/`NINE`
   through `orientForScreen` verbatim renders `0 0 backwards-3`; reversing the ROM rows before
   the ROT270 yields correctly-handed `300`, `600`, `900`.
2. **CONFIRMED a second way, by control flow the filing did not cite.** `CENIR4.MAC:328-368`
   is the display routine that builds the hardware `PICT` byte. Slot 13 (`BUGP`) takes
   `BCS 33$` and skips both masks, so bit 7 of `0xB6/0xB7/0xB8` reaches hardware intact — the
   ROM comment at :331 is `;LEAVE PICTURE ALONE IF SPIDER OR "100",ETC`.
3. **CORRECTED — "every other picture code has bits 6-7 clear" is FALSE for the segments.**
   `CENT_BODY_PIC = 0x42` has bit 6 set and `DEAD_BIT = 0x80` is bit 7
   (`src/core/centipede.ts:63-71`; `CENDE4.MAC:129-137` says so). The segments are exempt by
   **control flow** — `CENIR4.MAC:347-351` masks bits 5-7 for centipede slots only. The
   filing's conclusion survives; its reason does not. The description has been corrected in
   place so nobody inherits the wrong version.
4. **NEW FINDING, filed as AC-8 and not in the filing at all.** The direction-derived facing
   flip (`CENIR4.MAC:332-340` + `:368`) mirrors every motion object except slot 13 to face its
   travel direction. We implement none of it; `blit()` has no flip parameter and no flip
   mechanism exists anywhere in `plugins/centipede`. This is a wider gap than the
   explosion-offset item the filing asked to be filed.

### What the measurement changed about the WORK

**AC-3 cannot be satisfied in the bake alone, and here is the proof.** The `HEAD0-F` stamps are
blitted from two populations with different flip bits — `render.ts:215` for live segments
(bits clear) and `render.ts:229` for explosions `0xFA-0xFF` (both bits set). A per-stamp bake
flip has one answer per stamp name and provably cannot express both. A bits-driven mechanism
must live where the picture *code* is still in hand, which routes it to the blit and therefore
onto AC-5's deliberate revisit of the transform ban. **That design call is TEA/Dev's, not
SM's** — what is handed over is the evidence, so it is decided on measurement rather than on
which route looks smaller.

### The blast radius I took belongs to a fix the ACs RULE OUT — read it that way

| measurement | result |
|---|---|
| baseline `npx vitest run --project centipede` | **62 files / 1160 tests, green** |
| hardcoded `MIRRORED = new Set([...])` flip in `buildAtlas` | **zero red** (62/1160 green) |

The zero is real but it is the radius of the hardcoded-stamp-name variant, which AC-3 forbids.
It says nothing about the bits-driven fix. cp6-3 recorded this exact trap. Probe applied to a
`cp` backup, restored byte-identical, `git status` clean — the tree carries none of it.

**Sizing:** filed at 3, measured at 3, unchanged. The source change is small but the
deliverable is a hand-derived golden, a mutation-proved guard, a live-run verification (AC-7),
a deliberate guard revisit (AC-5) and two follow-up filings (AC-6, AC-8). `trivial` caps at 2,
so 3 with the `tdd` workflow as tagged is right.

**Handoff → TEA.** RED phase. Two ACs are file-not-fix and belong at finish, not in the tests.

## Design Deviations

### TEA (test design)
- **AC-7 (live-run readout) is not covered by an automated test**
  - Spec source: context-story-cp7-1.md, AC-7
  - Spec text: "A spider is shot in a live run and the readout is read off the screen, because a correctly-decoded atlas can still be blitted to the wrong place."
  - Implementation: RED covers the BAKE behaviourally (real buildAtlas, painted pixels) but not the browser. AC-7 stays a manual verification owned by Dev/Reviewer at GREEN.
  - Rationale: AC-7 exists precisely to catch what a unit test cannot — a correct atlas blitted to the wrong place. Automating it inside vitest would re-test the bake and report the AC as covered while proving nothing about the screen.
  - Severity: minor
  - Forward impact: Dev must serve the checkout and read the readout off a real spider kill; the handoff below names the port-ownership and key-hold traps.
- **AC-6 and AC-8 (file-not-fix) carry no tests**
  - Spec source: context-story-cp7-1.md, AC-6 and AC-8
  - Spec text: "FILED as its own story and not fixed here"
  - Implementation: no test written; these are finish-phase filings.
  - Rationale: a test asserting a backlog story exists would pin sprint YAML from a game suite — the standing rule against that is explicit.
  - Severity: minor
  - Forward impact: SM files both at finish; nothing in the suite guards it.

## TEA Assessment

**Tests Required:** Yes

**Test Files:**
- `plugins/centipede/tests/helpers/bake-atlas.ts` — runs the REAL `buildAtlas()` under a six-member canvas stub and reads back the painted pixels
- `plugins/centipede/tests/points-sprite-flip.test.ts` — behaviour: the hand-derived 300/600/900 goldens + the exemption census (12 tests)
- `plugins/centipede/tests/picture-flip-bits.test.ts` — mechanism: the bits decoder, the synthetic rows, the if-and-only-if census (19 tests)

**Tests Written:** 31 covering ACs 1, 2, 3 and 4
**Status:** RED — 24 failing, 7 green controls. Full project: 2 failed / 62 passed files, 24 failed / 1167 passed tests. The 62 pre-existing files are untouched and green.

### Why the suite is split in two

`flipsForPicture` does not exist, so any file importing it is red on arrival. Put the
goldens in that file and their redness would be masked by a missing export rather than
caused by mirrored pixels. Split, each file reddens for its own reason — and the goldens
are demonstrably red **because the bake mirrors them**, which is the claim under test.

### The golden is hand-derived, and it is legible

Typed from the shipped bytes through the ROT270 mapping, never read back from code.
`decodeStamp` emits 16x8 in ROM-byte order; `orientForScreen` makes output row *i* equal
ROM column *(7-i)*. ROM column 4 of THREE is set on rows 3,4,5,7,8,9,11,12,13, giving
`...###.###.###..` — today's bake, whose glyphs read 0, 0, mirrored-3. Bit 7 reverses each
screen row, and the expectation in the file literally reads **300**, **600**, **900**. A
reviewer can check the golden by reading it.

### The synthetic rows are the whole of AC-3

A `new Set(['THREE','SIX','NINE'])` and a real bit decoder agree on **every picture code the
game draws**. Only a code carrying a flip bit that is not one of the three separates them,
so the table carries fabricated rows `0x40`, `0x80`, `0xC0`. And because a name list could
simply be *relocated* into `pictures.ts` past the `atlas.ts` negative scan, an
**if-and-only-if census** binds the two: a stamp's baked pixels move exactly when
`flipsForPicture(its own declared code)` says they should.

### The trap that is NOT in the filing

`CENT_BODY_PIC = 0x42` carries bit 6 and `DEAD_BIT` is 0x80, so handing raw segment picture
bytes to the flip decoder turns every body segment upside down. The ROM exempts segments by
**control flow** (`CENIR4.MAC:347-351`, `CPX I,NCENT / BCS 33$`, then `AND I,3F` / `AND I,0F`),
which `segmentStamp(pic & 0x0F)` already mirrors. Pinned by *"no HEAD stamp is baked
flipped"*. `flipsForPicture(0x42)` reporting a flip is **correct** — the exemption belongs at
the call site, and the test says so.

### Verified against a throwaway BEFORE handing over

| measurement | result |
|---|---|
| the 31 new tests, throwaway applied | **31 passed, 0 failed** |
| full `npx vitest run --project centipede` | **64 files / 1191 tests green** (baseline 62 / 1160) |
| `npm run lint` with throwaway | **clean** |
| sibling breakage | **none** |
| throwaway reverted | byte-identical (`cmp`), `git status` shows tests only |

**Lint in the RED state fails on exactly two lines** — `flipsForPicture` is not exported and
`Stamp` has no `pic`. That is the contract Dev must add, and nothing else.

### Mutation battery — 9/9 caught

| # | mutation | direction | result |
|---|---|---|---|
| M1 | swap the axes (bit 6 mirrors, bit 7 turns) | restrictive | CAUGHT (11 red) |
| M2 | neuter the decoder — the shipped defect restated | permissive | CAUGHT (15 red) |
| M3 | also read the POISON bit (0x20) as a flip | permissive | CAUGHT (9 red) |
| M4 | drop the horizontal flip entirely | permissive | CAUGHT (6 red) |
| M5 | wrong axis — mirror the ROM column axis | restrictive | CAUGHT (4 red) |
| M6 | flip EVERY stamp | restrictive | CAUGHT (4 red) |
| M7 | SIX stops declaring its picture code | permissive | CAUGHT (3 red) |
| M8 | THREE declares a code with bit 7 clear | restrictive | CAUGHT (4 red) |
| M9 | flip AFTER the rotation instead of before | restrictive | CAUGHT (4 red) |
| M10 | stray rule on a code no stamp declares | restrictive | CAUGHT (1 red — **the sweep alone**) |

**The battery fact-checked my own comment.** I had written that the low-6-bit sweep was the
only guard against reading an address bit. False: `0xB6` has bit 5 set, so M3 reddens the
goldens too. M10 was then built to find what the sweep *does* uniquely earn — a stray rule
keyed on a code no stamp declares, invisible to every pixel assertion. The comment now states
the measured version.

### The 7 green controls, and why each passes

Not dead weight — each must **stay** green through GREEN:

| control | why it is green today | what it forbids |
|---|---|---|
| the harness paints an atlas (>500 px) | the stub really drives the bake | a blank stub passing every golden by accident |
| all three goldens are discriminable | flipped ≠ unflipped for all three | a symmetric stamp making the goldens vacuous |
| no HEAD stamp is baked flipped | nothing is flipped yet | flipping the shared segment pool |
| GUN bakes as plain ROT270 | nothing is flipped yet | replacing the rotation instead of layering on it |
| `atlas.ts` does not name THREE/SIX/NINE | it names none of them today | AC-3's hardcoded stamp list |
| the rotation is still the bake's | `orientForScreen` is there | substituting the flip for the rotation |
| `decodeStamp` returns raw ROM space | core is untouched | flipping inside core and breaking the cp1-3/cp2-1 boundary |

### One correction to the setup

My SM assessment said *"AC-3 cannot be satisfied in the bake alone"*. Too strong. It cannot be
satisfied by a per-**stamp** flip, but giving each stamp its picture **code** and deriving the
flip from that code's bits satisfies AC-1, AC-2, AC-3 and AC-5 together, in the bake, with
`render.ts` and the transform ban untouched. The shared-`HEAD` impossibility is real but bites
only the explosion pool, which AC-6 files out of scope. **AC-5 is therefore not triggered** —
no canvas transform is introduced.

### What remains for Dev

Design work is done and measured; this is the throwaway that turned all 31 green, verbatim.

**`src/core/pictures.ts`** — add to `Stamp`:
```ts
  /** The MOBJP picture code that selects this stamp, where one code owns it. */
  readonly pic?: number
```
and the decoder (AC-4 wants the CENDE4 citations in the comment):
```ts
export const PICTURE_FLIP_X = 0x80
export const PICTURE_FLIP_Y = 0x40

export function flipsForPicture(pic: number): { flipX: boolean; flipY: boolean } {
  return { flipX: (pic & PICTURE_FLIP_X) !== 0, flipY: (pic & PICTURE_FLIP_Y) !== 0 }
}
```
Declare the three codes: `THREE` `pic: 0xb6`, `NINE` `pic: 0xb7`, `SIX` `pic: 0xb8`
(SP-19, `src/core/spider.ts:116-118`). Correct the `:317-324` comment so it stops calling
bit 7 an address — the data bytes stay untouched.

**`src/shell/atlas.ts`** — import `flipsForPicture` and add:
```ts
function applyPictureFlips(grid: number[][], stamp: Stamp): number[][] {
  const { flipX, flipY } = flipsForPicture(stamp.pic ?? 0)
  let out = grid
  if (flipX) out = [...out].reverse()
  if (flipY) out = out.map((row) => [...row].reverse())
  return out
}
```
then in the bake loop: `orientForScreen(applyPictureFlips(decodeStamp(stamp), stamp))`.

**Traps the battery proved, so do not improvise past them:**
- **Flip BEFORE `orientForScreen`, not after** (M9). The axes only line up in ROM space.
- **`flipX` reverses the ROW array; `flipY` reverses within each row** (M5). Swapping them
  is a silent wrong-axis bug that still looks "flipped".
- **Do not touch `orientForScreen`** — five existing pins guard it (AC-2).
- **Do not flip inside `decodeStamp`** — core stays raw ROM space.

**AC-7 is yours and is not automated.** Serve this checkout on a spare port
(`npx vite --port 5290 --strictPort`) and prove whose server answers before trusting a
screenshot — a sibling can hold `[::1]:5270` beside a pinned `127.0.0.1:5270`. Holding a key
needs a real `keydown` on `window` and ~24 frames, not a `press()`.

**Handoff:** To Dev for GREEN.

## Dev Assessment

**GREEN.** Two files changed, 75 insertions / 8 deletions, no test touched.

| gate | result |
|---|---|
| `npx vitest run --project centipede` | **64 files / 1191 tests green** (RED was 2 files / 24 tests failing) |
| `npm run lint` (tsc --noEmit, repo-wide) | **clean** |
| `npm run test:orchestrator` | **390 pass / 0 fail** |
| tree | only `src/core/pictures.ts` + `src/shell/atlas.ts` modified |

### What was implemented

TEA's handed-over design, verbatim in mechanism, with the citations AC-3/AC-4 require.

- **`src/core/pictures.ts`** — `Stamp` gains `readonly pic?: number`; `PICTURE_FLIP_X` (0x80,
  horizontal) and `PICTURE_FLIP_Y` (0x40, vertical) with the CENDE4.MAC:239 (CKC0) and :248
  (CK40) citations on the constants themselves; pure `flipsForPicture(pic)`. The three PTS
  stamps declare `pic: 0xb6/0xb8/0xb7` (THREE/SIX/NINE — the array keeps the ROM's own
  THREE, SIX, NINE order and every `offset` is untouched). The `:317-324` comment now states
  that the offset formula is **lossy and misnames its top bit**: bit 7 is the horizontal
  flip, bit 6 the vertical, not address. **No plane byte changed** — the SHA-256 gate in
  `tests/pictures.test.ts` is green.
- **`src/shell/atlas.ts`** — `applyPictureFlips(grid, stamp)` runs in RAW ROM space
  **before** `orientForScreen`, which is untouched. `flipX` reverses the row array,
  `flipY` reverses within each row; a stamp with no `pic` reads 0 and is left alone.

### Non-vacuity: 5 mutations, 5 caught, on THIS tree

TEA's battery ran against a throwaway, so I re-ran a subset against the shipped
implementation. Files backed up to scratchpad and restored with `cp` — **not**
`git checkout --`, which would have wiped the uncommitted work.

| mutation | result |
|---|---|
| flip AFTER the rotation instead of before | **4 red** |
| swap the axes (flipX/flipY exchanged) | **4 red** |
| neuter the decoder — the shipped defect restated | **15 red** |
| stray rule on a code no stamp declares (`(pic & 0x1f) === 0x1f`) | **1 red** (the sweep alone, as TEA predicted) |
| THREE stops declaring its picture code | **4 red** |

Restored **byte-identical** (`cmp`), 1191 green again.

### AC-5 — the transform ban, revisited deliberately

**Not triggered, and here is the reason written down.** The fix introduces **no canvas
transform**: the flip is an array reversal on the decoded grid at bake time, and
`src/shell/render.ts` is not touched at all by this story. So the ban at
`tests/atlas-orientation.test.ts:150-155` is not passing on the technicality that
`ctx.scale` is unlisted — there is nothing in the diff for it to catch. It is left
**unchanged on purpose**: the reason to revisit it would be a render-time flip, and the
bits-driven bake made that route unnecessary. AC-5 is satisfied by the decision being
recorded, not by an edit. (This confirms TEA's correction of the setup's
"AC-3 cannot be satisfied in the bake alone" — giving each stamp its picture *code*, rather
than flipping per stamp *name*, satisfies AC-1/2/3/5 together inside the bake.)

### AC-7 — the live run, and it is read off the DISPLAY canvas

Served this checkout on the spare port and **proved whose server answered** before trusting
anything: `lsof -a -p $(lsof -ti tcp:5290) -d cwd` → `n/Users/slabgorb/Projects/a-3`.

The Chrome extension was not connected, so the run went through Playwright. Held-input trap
observed: START1/fire/move were dispatched as real `keydown`/`keyup` on `window` and held
across ~15-24 frames, never `press()`.

A screenshot would have been the weak version of this AC, so instead
`CanvasRenderingContext2D.prototype.drawImage` was hooked to fire only on a source rect
equal to `atlasRectFor('THREE'|'SIX'|'NINE')` — that is positive proof a **PTS sprite was
actually blitted after a spider died**, not a guess about what a picture shows. **Two live
spider kills** were captured across separate runs:

1. `THREE` — read back from the 240x256 scene buffer at scene (114, 233).
2. `NINE` — read back from the **on-screen 1200x829 display canvas** at (366, 609), 3x scale,
   after the scene was presented.

The render path is scene-buffer → upscaled present, so the second read is the one that
answers AC-7's actual worry. The pixels, downsampled back to the sprite's own 16x8 grid
(`#` = painted), off the display canvas:

```
..###.###.###...      digit 1 (cols 2-4):  ### / #.# / ### / ..# / ###  -> 9
..#.#.#.#.#.#...      digit 2 (cols 6-8):  ### / #.# / #.# / #.# / ###  -> 0
..###.#.#.#.#...      digit 3 (cols 10-12):### / #.# / #.# / #.# / ###  -> 0
....#.#.#.#.#...
..###.###.###...
```

**It reads 900, left to right, correctly handed** — and the stamp the hook matched was
`NINE`, the PTS 900 sprite. The earlier `THREE` capture read **300** the same way. Before
this fix the same read would have shown the glyphs reversed (`0 0 mirrored-3`). The
`drawImage` hook was restored, the browser closed, the server stopped, and the two stray
Playwright PNGs deleted — `git status` shows the two source files and nothing else.

### AC-6 and AC-8 — filed, NOT fixed

Untouched here by design, exactly as the ACs and TEA's Design Deviations require:
`render.ts`'s explosion path (`segmentStamp(pic & 0x0F)`, :70-72) and the unimplemented
direction-derived facing flip (CENIR4.MAC:332-340/:368) are both unchanged. **SM must file
both as backlog stories at finish** — nothing in the suite guards that, and a test that did
would be pinning sprint YAML from a game suite.

### One thing a reviewer should look at

`flipsForPicture(0x42)` reports `flipY: true` for `CENT_BODY_PIC`, and that is **correct, not
a bug** — the ROM exempts the centipede slots by control flow (CENIR4.MAC:347-351), which
`segmentStamp(pic & 0x0F)` already mirrors, and the segment stamps carry no `pic` so the bake
never asks. Pinned by *"no HEAD stamp is baked flipped"*. The exemption is at the call site
on purpose; moving it into the decoder would be the wrong fix.

**Handoff:** To Reviewer.

## Reviewer Assessment

**Verdict: APPROVED, with two defects found and fixed in review (`4c98d2a`).**

**Structural caveat, stated first: Dev == Reviewer.** The same session wrote the code, wrote
the tests for AC-6/AC-8, and reviewed all three. That is the weakest review setup there is, so
every claim below was re-derived by **execution**, not by re-reading my own work, and the two
findings are both in code I wrote an hour earlier.

### Findings

**HIGH — `mobjScreenX` did not wrap at 8 bits. FIXED.**
`CLC / ADC I,01` is an eight-bit add; at `MOBJH = 0xFF` the ROM stores `HPOS = 0x00`. I wrote
it as a plain `h + 1`. Measured on the real render: a left-moving scorpion at `h=0xFF` drew at
**x = −17** where the cabinet puts it at **x = 239** — a full screen width out.

*Reachable, and I measured that too rather than assuming it.* A scorpion enters at
`ANTH = 0x00` (SC-7, CENTI4.MAC:2046-2047) and steps `-1`/`-2` through `(h + dh) & 0xff`
(scorpion.ts:177), so one step off the edge going left is exactly `0xFF` with `mirrored` true.
Segments **cannot** reach it — max `h = 0xF4` over **302,250** mirrored-segment samples across
25 seeds × 2000 frames. That asymmetry is precisely why 1221 green tests and a 400-frame live
run sailed straight over it: everything I had exercised was segments.

**MEDIUM — the spider's explosion path was changed and untested. FIXED.**
`render.ts:303` went from `segmentStamp` to `explosionStamp` with nothing covering it, and
`explosionStamp` **throws** outside 0xFA-0xFF — so an uncovered caller was a crash risk, not a
cosmetic one. Probed correct across the whole countdown, then pinned.

Both fixes are mutation-proved: reverting either reddens exactly its own test and nothing else.

**LOW, not fixed — `explosionStamp`'s index is written as
`(pic & 0x3f) - (EXPLOSION_DONE & 0x3f) - 1`.** Correct, and the coupling to `EXPLOSION_DONE`
is deliberate, but `- 0x3a` with the derivation in a comment would read better. Not worth a
commit on its own.

### What I verified by execution rather than accepting

| claim | how | result |
|---|---|---|
| AC-2 — `orientForScreen` unchanged | diff of its body across the whole story | **only the call site moved** ✓ |
| AC-4 — picture DATA byte-identical | count of changed `0x..` data lines | **0** ✓ |
| "contact sheet 81 → 87 stamps" | counted both revisions | **81 → 87** ✓ (the kind of figure I have been burned quoting unrun) |
| spider explosion renders | temp probe, 6 pictures | correct — but **was** untested |
| the `+1` wrap | temp probe through the real `render()` | **DEFECT** |
| `h=0xFF` reachability | 302k-sample sim sweep | segments no, **scorpion yes** |

All probes were written to `tests/__probe.test.ts`, run, deleted, and `git status` confirmed
clean each time — scratch tests in `tests/` would otherwise enter the build.

### Where I think the residual risk actually is

1. **The `+1` itself is still an interpretation.** The ROM comment is "FACE PICTURE BY
   CORRECTING HORIZONTAL". If that increment exists to *cancel* a one-pixel displacement the
   cabinet's own mirror introduces, then our exact-box `scale(-1,1)` has no such displacement
   and copying the `+1` puts us one pixel off in the other direction. I could not settle it
   from the source, and the live run confirmed the **flip**, explicitly not the **pixel**. It
   is one pixel on a 16px sprite, so I am not blocking on it — but it is an open fidelity
   question, not a closed one, and the story should not be read as having proved it.
2. **`tests/facing-flip.test.ts` is Dev-authored** and has still had no independent design
   pass. The two findings above came out of reviewing it adversarially, which is some evidence
   it is not vacuous, but it is not the same as TEA having written it.
3. The 180-degree turn for slots 12/13 is a **known, documented divergence** recorded in
   `render.ts`, not filed. Deliberate.

### Dispatch

Subagent dispatch (`reviewer-rule-checker` et al.) is disabled for this session, so this review
is single-threaded and by hand. Given Dev == Reviewer, that is the main thing I would want a
second pair of eyes on if one were available.

**Handoff:** To SM for finish.

## Dev Assessment — round 3: AC-6 closed, nothing filed

**All eight ACs are now delivered in this story. Zero follow-up stories filed.** That was the
point: 65 files / **1221 tests green**, lint clean, orchestrator 390 pass.

`ccdea72` — explosions draw **EXPLD0-5**, the six sprites CENPIC labels outright and that were
missing from STAMPS. Root cause: cp2-5 read CT-44's "no new pixels" as covering explosions; it
covers HEAD/BODY sharing one pool. Two tests pinned the over-extension and the `pictures.ts`
header stated it — all three corrected. Every byte at all seven offsets was checked against
CENPIC.MAC before the offsets were written down; the all-zero rest frame at 0x5C0 independently
corroborates our existing "0xF9 draws nothing".

**Scope I cut, on the user calling it out mid-change.** I had also implemented the 180-degree
turn that slots 12/13 carry (they hand MOBJP over unmasked, so both flip bits survive). It is
faithful, but it is a refinement on top of the actual bug and it doubled `blit`'s flip surface
to express. Backed out; recorded as a comment in `render.ts` next to `explosionStamp`, not
filed as a story. **That was self-generated scope, and it is the third time in this story the
work grew from something nobody asked for** — the first two were the two "file it" ACs.

**5/5 mutations caught** (HEAD pool restored · index off-by-one · total function · a baked
`pic` on an EXPLD · wrong transcribed offset). Restored byte-identical. **Live run:** all six
EXPLD sprites drawn during real segment kills, no HEAD stamp used for an explosion.

Contact sheet regenerated by its own bake tool, 81 → 87 stamps.

## Dev Assessment — round 2 (scope extended on the user's ruling)

The user rejected the file-not-fix scoping: *"we are filing more stories than we are
finishing."* Measured and true — 68 backlog / 3 in progress, and one day's log carries
cp6-4, cp6-5, cp6-6, jt9-33, jt9-38, jt9-39, jt9-40 and sw8-27 all being *filed*. AC-8 was
pulled into this story. Final state: **65 files / 1211 tests green, lint clean,
orchestrator 390 pass**.

### AC-6 — I called this a phantom, and I was half wrong. Correcting the record.

Two claims, and they need separating:

**Right:** the offset formula lives in FOUR comments and zero executable code; every stamp
offset is a transcribed literal. And the `0x3F`→`0x1F` correction reconciles AC-6's own
numbers — `0xFF` → `0x400 | 0x1F0` = **0x5F0**, the hardware figure it quoted. Fixed in
`a087213` at the two sites that stated it as fact.

**WRONG:** I said `render.ts`'s explosion path was faithful because `segmentStamp(pic & 0x0F)`
mirrors the ROM's `AND I,0F`. It does not. Reading `CENIR4.MAC:351-355` properly:

```
	AND I,3F     ; 0xFF -> 0x3F
	CMP I,30
	BCS 33$      ; 0x3F >= 0x30 -> TAKEN, an explosion — the AND I,0F is SKIPPED
```

The `AND I,0F` is on the *non*-explosion path. Explosions keep pictures **0x3A-0x3F**, which
decode to offsets 0x1D0/0x5D0/0x1E0/0x5E0/0x1F0/0x5F0 — and CENPIC.MAC has dedicated
**EXPLD0-EXPLD5** sprites at exactly those offsets (:49-51 lower, :147-150 upper), none of
which are in our STAMPS table. We draw HEADA-F instead. **AC-6's headline was right and its
reasoning was wrong, which is the same shape as the setup's own error.**

Corroboration I did not go looking for: picture 0x39 (`EXPLOSION_DONE` 0xF9 & 0x3F) maps to
`EXPLD` at 0x5C0, whose bytes are **all zero** — the ROM's own "explosion finished draws
nothing", which our code already implements by skipping the draw.

**NOT fixed here, and this time that is a measurement, not an inheritance.** It is a
different change from AC-8 (new stamps + a new picture→stamp mapping, not a flip), it
touches the cp1-3 byte-gated table, and folding it into an already-large story would make
review worse. It is the one genuine follow-up, and it is now specified precisely enough to
be mechanical.

### AC-8 — implemented, and two of the filing's four claims are wrong

The rule (`CENIR4.MAC:333-340` + `:368`) is one predicate over `dh` for every slot but 13.
Enumerating every `MOBJDH` write in revision.v4 rather than trusting the description:

| slot | object | dh source | mirrors? |
|---|---|---|---|
| 0-11 | segments | `±CENTIS` (CENTI4.MAC:488/507/541/1322/1421/1457/1685) | **yes** |
| 12 | flea | `LDA I,0 / STA ANTDH` (:153-154) | **no** — filing said yes |
| 12 | scorpion | `-2 / +1 / -1` (:2038-2045) | **yes** |
| 13 | spider | exempt, `CPX I,13.` | no — the exemption the PTS fix rests on |
| 14 | shot | `SHOTDH` written **nowhere** in the revision | **no** — filing said yes |
| 15 | player | `PLAYDH` attract-only (:196, :1172); GUN is flip-symmetric | no |

Implemented as the mechanism, not the table: `mirroredForDh(dh) => dh < 0` applied to every
slot but the spider. The flea and shot decline on their own data. `blit()` gained a mirror,
and `mobjScreenX` carries the ROM's `ADC I,01` correction — through `gunScreenX`, because
the increment is in the ROM's horizontal space and `gunScreenX` is mirrored, so +1 in ROM h
is one pixel LEFT on screen.

### AC-5 — now genuinely triggered, and narrowed rather than deleted

Round 1 recorded AC-5 as not triggered. AC-8 triggers it: this **does** introduce a canvas
transform. `tests/orientation-flip.test.ts` banned every `scale(-1,1)` in the frame, and its
own message says why — *"a canvas mirror would flip the field AND mirror-write every glyph"*.
That hazard is a WHOLE-CANVAS mirror standing in for the coordinate fix cp2-14 made. A
per-sprite mirror closed by save/restore is a different thing, and the ROM applies it the
same way (`:368` EORs into that slot's picture, not into the display).

So the guarantee was re-stated, and the replacement is **stronger** than the ban it replaces:
no HUD glyph is ever mirror-written, no mirror outlives its sprite, no matrix is set, nothing
rotates, and every `scale()` must be exactly `(-1, 1)` — `scale(1,-1)` (vertical) and
`scale(-1,-1)` (the CKC0 180° turn) stay banned. A blanket "scale is allowed now" would have
let both through.

### Blast radius, and the stub that earned its keep

`blit()` grew four ctx members, so nine stubs needed them — 47 tests red at the peak.
`tests/helpers/boot-shell.ts` is deliberately minimal ("anything else should fail loudly
rather than be silently absorbed by a Proxy") and **it did its job**: it threw
`ctx.save is not a function` instead of passing quietly. Its documented DOM-surface count was
re-measured with the grep in its own header (five → nine), not guessed.
`tests/orientation-flip.test.ts`'s recorder now models the 2D transform, because a mirrored
sprite draws at `(0,0)` under a translate and every position assertion in that file reads
`x` — leaving it raw would have made those assertions silently meaningless.

### Non-vacuity — 6/6 on this tree

`dh <= 0` (5 red) · never mirror (9) · drop the +1 correction (1) · `scale(1,-1)` wrong axis
(7) · mirror leaks, no save/restore (7) · the spider picks up a flip (1). Backed up and
restored with `cp`, byte-identical.

### Live run — AC-8 verified the same way AC-7 was

Served on 5290 (ownership proved by `lsof` cwd → `a-3`), transform modelled through hooked
`save`/`restore`/`scale`/`translate`, 400 frames of real play:

| sprite | plain | mirrored | expected |
|---|---|---|---|
| segments HEAD2/3/7 | 2713 | 2087 | **both** — they flip as the train reverses ✓ |
| GUN | 1600 | 0 | never ✓ |
| spider BUG0/BUG1 | 88 | 0 | slot 13 exempt ✓ |

**Zero** mirrors leaked past their `save`/`restore`. Hooks removed, server stopped.

### For the Reviewer, flagged rather than buried

1. **`tests/facing-flip.test.ts` was written by Dev, not TEA** — AC-8 arrived after the TEA
   handoff. It was run RED first (14 failed / 4 controls green) and the battery above records
   what it catches, but it has not had an independent test-design pass. Scrutinise it harder
   than a TEA-authored file.
2. **AC-6 is real** (above) and is the single remaining follow-up.
3. The `+1` correction is faithful to `ADC I,01` but its *visual* effect is one pixel; the
   live run confirms the flip, not the pixel. Worth a look if you want it pinned harder.

**Handoff:** To Reviewer.