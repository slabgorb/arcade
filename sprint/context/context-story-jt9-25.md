# Story jt9-25 Context

## Title
EGGTBL is the egg's animation driver — the third table in the block jt8-7 read, plus the signed-POSOFF decoder fix it cannot ship without

## Metadata
- **Story ID:** jt9-25
- **Type:** feature
- **Points:** 6
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust — the remainder, re-ordered: apparatus, gameplay, geometry, brains, dossier

## Problem
Filed by jt8-7's Reviewer. jt8-7 fixed a table that had been READ SHORT — EGGI is seven rows (JOUSTI.SRC:2255-2261) and only row 0 had been transcribed. While verifying that fix, the review found the BLOCK containing the tables jt8-7 ported had also been read short, one table further on.

WHAT WAS FOUND. Under the header `* EGG ANIMATION TABLE *` (JOUSTRV4.SRC:3533) there are THREE tables, not two:
    EGFLFT  FCB 0,12,6      (:3535)   FALLING LEFT   <- ported by jt8-7
    EGFRIT  FCB 0,6,12      (:3536)   FALLING RIGHT  <- ported by jt8-7
    EGGTBL  FCB 6,6,7       (:3537)   WIGGLE LEFT    <- NOT ported
            FCB 0,6,3       (:3538)   WIGGLE UP
            FCB 12,6,7      (:3539)   WIGGLE RIGHT
            FCB 0,6,7+60    (:3540)   WIGGLE UP & PAUSE
            FCB 18,6,7      (:3541)   HATCH 1
            FCB 24,11,7     (:3542)   HATCH 2
            FCB 30,11,7     (:3543)   HATCH 3
            FCB 36,11,0     (:3544)   HATCH 4

The FIRST column is a byte offset into EGGI, whose rows are 6 bytes — so 0/6/12 are rows 0/1/2 (the three tumble stills WEGG already selects between) and 18/24/30/36 are rows 3/4/5/6: EGGB1, EGGB2, EGGB3 and PLY4S. EGGTBL is therefore the CONSUMER of exactly the four rows jt8-7 transcribed and described as having none. jt8-7's Dev finding "rows 3-6 have no consumer" is true of our PORT and false of the machine; this story closes that gap.

TWO INDEPENDENT THINGS THIS ALREADY BUYS US. (1) EGGTBL's maximum offset, 36 -> row 6, requires EGGI to have at least seven rows — a corroboration of jt8-7's central claim from a DIFFERENT table, which is stronger evidence than jt8-7's own reading of the table itself. (2) It explains the pre-existing claim JT8-130, which described the egg as "up/right/left + 3 hatch stages" — the dossier recorded seven frames all along while the code carried one, and nothing in the gate set can see a claim that describes more than the transcription implements.

DELIVERABLES: (1) read and claim EGGTBL and whatever drives it (the second and third columns are unmeasured — likely a height and a frame duration, `7+60` on WIGGLE UP & PAUSE being the tell; MEASURE, do not guess); (2) transcribe it beside EGF_LEFT/EGF_RIGHT in demo.ts, which already carries the row-offset idiom and the EGGI_ROW_BYTES constant; (3) drive the egg's animation from it.

BLOCKED-ISH ON jt8-15 (now jt9-13). Nothing DRAWS an egg's frames today — the shell has no egg render path at all (only audio*.ts mentions eggs), and the draw list emits a single `entityOp('EGGI', ...)`. The moment this story draws EGGB2 or EGGB3, `posOffset` (demo.ts ~:1495) will decode their POSOFF words wrongly: it does `xoff = rec.position >> 8`, which yields 255 for $FFF6 where the ROM's signed XOFF is -1, and 254 for $FEF5 where it is -2. The Y half is correct (10 and 11). jt8-15 (now jt9-13) fixes that; land it first or this story ships sprites 255px off.

METHOD NOTE, and it is the reason this story exists: jt8-7's whole defect was a table read short because its continuation rows carry no label. The same reading habit missed the next table in the same block. When porting from a labelled block, read to the NEXT header, not to the end of the table you came for.

=== MERGED 2026-08-03: jt9-13 FOLDED IN (Architect grooming pass) ===

jt9-13 was the posOffset sign-extension fix, and this story description already carried it as a blocker ("land it first or this story ships sprites 255px off"). It is now this story FIRST COMMIT rather than a story of its own. Points 5 + 2 -> 6.

THE REASON IT CANNOT STAND ALONE, measured at grooming: posOffset has exactly ONE call site in the whole plugin - demo.ts:1532, inside entityOp - and no call site can name EGGB2 or EGGB3 today. So shipped by itself the fix is unobservable, its only possible test is a decode-range assertion over the records, and it buys a full TDD cycle plus a Reviewer mutation battery for two lines that nothing exercises. Shipped here it arrives with the consumer that makes it visible, and the decode-range guard and the drawn frames verify each other.

THE BUG. posOffset (plugins/joust/src/core/demo.ts:1524) decodes a transcribed POSOFF word as `{ xoff: rec.position >> 8, yoff: 256 - (rec.position & 0xff) }`. The ROM POSOFF macro packs XOFF*256 + 256-YOFF (JOUSTI.SRC:12-13) and XOFF is SIGNED - a sprite whose art hangs to the LEFT of its hot spot carries a negative XOFF - so `>> 8` on the stored unsigned word returns the raw high byte and a negative XOFF comes back as its unsigned complement. MEASURED on the two records jt8-7 added: EGGB2 position $FFF6 gives xoff=255 where the correct XOFF is -1, and EGGB3 position $FEF5 gives xoff=254 where it is -2. The Y half is right in both cases; it is only the X, and only for a word with the high bit set. All 44 pre-existing ENTITY_RECORDS have a position word in [237, 751], so no existing frame decodes wrongly.

FIX: sign-extend the high byte in the DECODER, e.g. `const hi = rec.position >> 8; xoff: hi > 127 ? hi - 256 : hi`. KEEP THE RAW WORD IN THE RECORD - jt8-7 deliberately stored the unsigned 16-bit word because every other record does, and that decision was reviewed and accepted; the sign belongs in the decoder, not the data. TEST NOTE: the natural guard is a decode test over every ENTITY_RECORD asserting -128 <= xoff <= 127, which reds on today code for exactly the two new records and stays meaningful as more high-bit words arrive. jt8-7 Dev deviation flagged this hazard but named the WRONG AXIS ("decodes these as Y-offsets must sign-extend") - the Y is fine, the X is not; that correction is recorded in jt8-7 Design Deviations under the Reviewer stamp.

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
_No acceptance criteria recorded in the sprint YAML — TEA to define during the RED phase._

---
_Generated by `pf context create story jt9-25` from the sprint YAML._
