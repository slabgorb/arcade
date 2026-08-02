# Story jt5-23 Context

## Title
What ARE G1DEC/G2DEC? CUE_SOURCES now cites two decision-block families with no model of either

## Metadata
- **Story ID:** jt5-23
- **Type:** story
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust audio — the sound subsystem joust shipped without

## Problem

> ⚠ CORRECTION (measured at setup, 2026-08-02 — read this BEFORE the description)
>
> The description was measured against the vendored ROM before setup. **All eight of its
> ROM citations verify exactly.** Two of its claims about the CURRENT PORT do not, and
> both change what the RED phase must look like:
>
> 1. **"no recorded reason a reader could check" is OVERSTATED.**
>    `plugins/joust/src/shell/audio-manifest.ts:326-332` already records a checkable reason
>    for the citation split, and `:218-223` already records the mechanical difference between
>    the families. **Consequence: the natural RED test — "assert a rationale exists" — PASSES
>    ON ARRIVAL and is vacuous.** What is genuinely unrecorded is what the families *mean*;
>    both comments say only "Nothing in this port models the G/P distinction".
>
> 2. **"the four wing cues citing G1DEC :5544" is FALSE — it is TWO.**
>    Only `playerWingDown` (:346) and `playerWingUp` (:363) cite `line: 5544`.
>    `enemyWingDown`/`enemyWingUp` cite `line: 5560`, which is **P3DEC's** sound row.
>    The shipped comment at `audio-manifest.ts:326` carries the SAME error ("These four cite
>    the G-BLOCK row") and is where the story inherited it — correcting that false sentence
>    is now **AC5**. The re-anchor in AC4 therefore touches **two** cues, not four.
>
> The description below is otherwise sound and its ROM quarry is reliable.

The ROM binds each creature sound table TWICE, in two families of decision block, and joust models neither. Measured in jt5-6 (JOUSTRV4.SRC): G1DEC (label :5542, row :5544) and G2DEC (:5546, row :5548) versus P1DEC (:5550, row :5552) and P2DEC (:5554, row :5556). The rows differ in exactly two places — the joystick source (G1JOY/G2JOY vs P1JOY/P2JOY) and the 8th sound slot, which is a bare `0` in the G-blocks and SNPTREF ("PLAYER ABORTED FADING IN (TRANSPORTER)", :8122) in the P-blocks. Nothing in the port knows the difference. jt5-6 moved playerMaterialise/player2Materialise onto the P-blocks (:5552/:5556) because SNPCR1/SNPCR2 are exactly where the families differ and those are the rows the story cited, but LEFT the four wing cues citing G1DEC :5544 — correct for them, since SNPLWU/SNPLWD open every one of the four rows identically, but the result is that CUE_SOURCES now cites BOTH families with no recorded reason a reader could check. Establish what the G-blocks are (attract/demo? a two-player-game variant? grep the FDB consumers of each label and the DECSN/PDECSN selection), record it, and rule whether the wing citations should follow. Do this BEFORE another story cites either family. Found by jt5-6 TEA and confirmed by its Reviewer.

## Technical Approach

*Measured pointers only — the design is TEA's and Dev's.*

### The answer to the story's headline question (SM measured it; TEA must VERIFY, not assume)

`JOUSTRV4.SRC:1025-1029`, mirrored for player 2 at `:1041-1045`:

```
1025    LDX     #G1DEC          ASSUME GAME SIMULATION
1026    LDA     GOVER           GAME SIMULATION?
1027    BGT     30$              BR=YES          <- keeps G1DEC
1028    LDX     #P1DEC                           <- else swaps to P1DEC
1029 30$ STX    PDECSN,Y        PLAYER 1'S JOYSTICK
```

`GOVER > 0` selects the G-block. Corroborated from both sides, which is what makes this
more than a comment-reading:

- `P1JOY` (`:7247`) opens `LDA WCPIAB` — **"SELECT HALF OF MUX"**, the real hardware joystick.
- `G1JOY`/`G2JOY` (`:601-616`) sit in the attract region, immediately beside
  `ATTRCT CLR GOVER  STATE OF GAME = OVER` (`:712`).

**G-blocks are the attract-mode self-playing demo; P-blocks are real play.** This explains
BOTH enumerated differences at once — the joystick source, and why slot 8 (`SNPTREF`,
*"PLAYER ABORTED FADING IN"*) is a bare `0` in a demo nobody can abort.

**The nuance that a naive statement of this gets wrong.** The ROM defines exactly **two**
G-blocks against **seven** P-blocks:

| Label | Line | Kind |
|-------|------|------|
| G1DEC | 5542 | knight 1, attract |
| G2DEC | 5546 | knight 2, attract |
| P1DEC | 5550 | knight 1, real play |
| P2DEC | 5554 | knight 2, real play |
| P3DEC–P7DEC | 5558–5574 | buzzards / pterodactyl — **no G-variant** |

So the G/P duality is **knights-only**, and the `P` prefix on P3DEC–P7DEC does **not** mean
"real play" the way it does on P1DEC/P2DEC. AC2 exists to stop that error being recorded.

### Where the work lands

- `plugins/joust/src/shell/audio-manifest.ts` — the `jt5-6` comment (`:212-223`), the `jt5-3`
  comment (`:318-332`, holds the false "these four"), and the two `line: 5544` call sites
  (`:346`, `:363`) that AC4 re-anchors to `5552`.
- The `:5552` verbatim to re-anchor onto is already in the file twice (`:243`, `:263`):
  `\tFDB\tSNPLWU,SNPLWD,SNPLSK,SNPLS2,SNPRU1,SNPRU2,SNPFAL,SNPTREF,SNPCR1`
- Guard idiom to copy: `plugins/joust/tests/audio-transporter-split.test.ts:459-470` already
  pins owning labels and row contents by verbatim line — AC3 is the same shape one level up.
- Vendored source: `reference/williams-source/joust/JOUSTRV4.SRC` (present in this checkout).

### User rulings (2026-08-02) — both taken with the census attached, do not re-litigate

1. **Re-anchor** the two player wing cues to `P1DEC :5552`. The measurement *flipped* the
   prior argument: before, `:5544` was "an arbitrary but true row"; now it is known to be the
   **attract-demo** binding, so a cue fired by a human in real play citing the demo block is
   misleading even though the bytes are identical. AC6 exists so this reads as a precision
   gain, not as the correction of a wrong citation.
2. **Prose + a ROM-citation guard**, NOT a structured `family` field on `CUE_SOURCES`. The
   structured option was costed and declined as pushing the story past 3 points.

### Open question SM could NOT settle — hand on, do not guess

The port has a 1602-line `plugins/joust/src/core/demo.ts` that emits its **own cue stream**,
and `SNPTREF` is modelled by **no cue at all** (it appears only inside verbatim strings).
So there is **no current audible G/P divergence** — nothing to fix today. But whether
`demo.ts`'s cue stream ought to cite the G-family is a real question this story does not
close. **TEA should rule it in scope or file it**; per the standing project rule an
out-of-scope finding must end with a filed story ID or a named existing owner.

## Scope

**In scope:** the recorded model of the two families in `audio-manifest.ts`; the guard that
pins the selection mechanism; the AC4 re-anchor of `playerWingUp`/`playerWingDown`; the AC5
correction of the false "these four" sentence.

**Out of scope:** any structured `family` field or type change on `CUE_SOURCES` (ruled out
above); any change to `enemyWingUp`/`enemyWingDown`, whose `:5560` citation is correct and
has no G-variant to choose between; any change to audio behaviour — **no cue's sound, priority
or timing changes in this story**, only citations and recorded reasoning.

## Acceptance Criteria

1. The port records WHAT the two decision-block families are, citing the ROM selection site verbatim: JOUSTRV4.SRC:1025-1029 (LDX #G1DEC / LDA GOVER / BGT / LDX #P1DEC / STX PDECSN,Y), mirrored for player 2 at :1041-1045. The recorded model states that G1DEC/G2DEC bind when GOVER is greater than zero (the attract-mode self-playing demo) and P1DEC/P2DEC bind otherwise (real play), and cites the corroboration on both sides: P1JOY (:7247) reads the WCPIAB hardware joystick MUX, while G1JOY/G2JOY (:601-616) live in the attract region beside ATTRCT CLR GOVER (:712).

2. The recorded model states that the G/P pairing exists ONLY for the two knights: the ROM defines exactly two G-blocks (G1DEC :5542, G2DEC :5546) against seven P-blocks (P1DEC :5550 through P7DEC :5574), so the P prefix on P3DEC-P7DEC (buzzards, pterodactyl) does NOT denote real-play-versus-attract the way it does on P1DEC/P2DEC. Those five creature blocks have no G-variant.

3. A test pins the selection mechanism against the vendored source so the recorded meaning cannot silently rot - the same verbatim-line idiom already used by plugins/joust/tests/audio-transporter-split.test.ts:459-470. Mutating the cited line or the owning label reddens it.

4. playerWingUp and playerWingDown re-anchor their callSite from line 5544 (G1DEC, the attract-demo binding) to line 5552 (P1DEC, real play), so CUE_SOURCES cites ONE decision-block family for every knight cue. A test asserts both cues cite the P-family row and that the row really opens with SNPLWU,SNPLWD.

5. The false claim in the shipped jt5-3 comment at audio-manifest.ts:326 - These four cite the G-BLOCK row (:5544) - is corrected. Only playerWingUp and playerWingDown ever cited :5544; enemyWingUp and enemyWingDown cite :5560, which is P3DEC's sound row and has no G-variant at all. The count of cues affected by the G/P question is two, not four.

6. The recorded rationale explains why the pre-jt5-23 citation was ALSO true - SNPLWU,SNPLWD open all four knight rows (:5544, :5548, :5552, :5556) identically - so the re-anchor reads as a precision gain and not as the correction of a wrong citation.

<!-- Authored by SM at setup. DO NOT REGENERATE with `pf context create` — that would
     overwrite the measured corrections above with the raw YAML description. -->
