# Story jt8-7 Context

## Title
Egg catch is box-only — the transcribed CEGGUP mask is never consulted, so the collect radius is a bird's height instead of an egg's. collisionMaskFor (demo.ts:687) returns null for kind egg, so the catch pass stops at broadPhase (:902) while the joust pass 100 lines above does broadPhase then narrowPhase (:783-788). CEGGUP/CEGGLF/CEGGRT/CEGGMN all exist with real spans and JOUSTI.SRC anchors (pictures.ts:1799-1806) and ENTITY_RECORDS.EGGI (:1699) explicitly names CEGGUP — a ported, claimed, unconsumed asset of exactly the kind the uf1 sweep hunts. Effect: vertical reach is the 16px ENTITY_BOX_H vs CEGGUP's 7 real scanlines, so an egg can be collected from visibly clear of it. BLOCKED ON A DECISION FIRST: the ROM has four egg masks for its orientation/hatching frames and EggState carries no frame field, so the variant question must be answered before wiring — do not just hardcode CEGGUP. Filed by Reviewer on jt8-4 (R-2)

> ⚠ **THE TITLE ABOVE IS THE ORIGINAL FILED TEXT AND IS PART STALE — it was deliberately NOT
> retitled.** Three of its `demo.ts` line cites have drifted (`:687`→`:734`, `:902`→`:1027`,
> `:783-788`→`:887-897`) and "100 lines above" is ~140. More importantly its closing clause,
> "BLOCKED ON A DECISION FIRST … the variant question must be answered before wiring", describes a
> blocker that **SM measured and dissolved** — see `## Problem` item 2 and the user ruling below.
> The story is NOT blocked. The title is left intact so the board id and the filed wording still
> match; read `## Problem` for current fact, never the title.

## Metadata
- **Story ID:** jt8-7
- **Type:** bug
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust — playability: enemies hunt (full pursuit AI) and eggs can be caught

## Problem
The egg catch pass is BOX-ONLY. `demo.ts:1027` runs `broadPhase(collisionBox(catcher), eggBox(ep.egg))` and stops there, while the joust pass ~140 lines above runs broadPhase THEN narrowPhase (`demo.ts:887-897`). `eggBox` (:812) returns a bare 16x16 (ENTITY_BOX_W/ENTITY_BOX_H, :321-322), so an egg's vertical catch reach is 16px instead of CEGGUP's 7 real scanlines — an egg can be collected from visibly clear of it. `collisionMaskFor` (:734) has no egg branch so it returns null, and the egg side never passes through `toJoustEntity` at all.

=== MEASURED BY SM 2026-08-01 — corrections to the filed text ===

1. LINE CITES DRIFTED. The filing's demo.ts cites are stale: collisionMaskFor is :734 (filed :687), the catch pass :1027 (filed :902), the joust pass :887-897 (filed :783-788), and the joust pass sits ~140 lines above, not 100. The pictures.ts cites were EXACT (:1699 and :1799-1806), as were ENTITY_BOX_H=16 and CEGGUP's 7 real span rows (8 rows, the last being the $8100 terminator).

2. THE FILED BLOCKER IS DISSOLVED. "EggState carries no frame field" is TRUE but is NOT a blocker, because the ROM stores no frame either. WEGG (JOUSTRV4.SRC:3507-3530) recomputes the egg's frame EVERY frame from PVELX's sign and PVELY compared against +/-$0080, through the offset tables EGFLFT FCB 0,12,6 and EGFRIT FCB 0,6,12 (:3535-3536) which index EGGI's 6-byte rows. Both inputs ALREADY exist on EggState as velX and velY. No new state is required.

3. EGGI IS A SEVEN-ROW FRAME TABLE (JOUSTI.SRC:2255-2261) and pictures.ts:1699 transcribed ROW 0 ONLY (anchor startLine 2255, endLine 2255) — rows 1-6 are missing entirely. The rows are: 0 CEGGUP/$00FA/EGGUP, 1 CEGGLF/$00FB/EGGLF, 2 CEGGRT/$00FB/EGGRT, 3 CEGGUP/$00FB/EGGB1, 4 CEGGMN/$FFF6/EGGB2, 5 CEGGMN/$FEF5/EGGB3, 6 CEGGMN/$00F5/PLY4S. This is the same multi-row-table-read-as-one-row family as the SNPCR1 sound-table finding.

4. THE "FOUR EGG MASKS" CLAIM IS CORRECT — all four CEGG masks do appear in EGGI. Note CEGGMN is SHARED with the standing dismounted rider: the identical FDB row also appears at JOUSTI.SRC:2159 under the PLYR4 table, which is what plugins/joust/tests/pictures.test.ts:319-330 already asserts.

5. THE TRANSCRIPTION IS PURELY ADDITIVE. All seven sources (EGGUP EGGLF EGGRT EGGB1 EGGB2 EGGB3 PLY4S) and all four masks ALREADY exist as PIXEL_BLOCKS / COLLISION_TABLES — verified by count. No new pixel data, no new span tables. Same situation jt3-7 recorded for the pterodactyl frames.

6. PRECEDENT FOR THE RECORD SHAPE: jt3-7 transcribed the 6-row IPTERO table (JOUSTI.SRC:2601-2606) and the 6-row ILAVAT table (:2376-2381) as ONE ENTITY_RECORD PER ROM ROW, each anchored to its own source line. EGGI's seven rows follow that established pattern.

=== USER RULING 2026-08-01 ===
Transcribe the FULL seven-row EGGI table, not just the three still rows, and then wire the catch pass. Rows 3-6 (hatching frames and the standing rider) have no catch-pass consumer today; they are transcribed for table completeness. Story re-pointed 3 -> 5 to carry the extra transcription.

=== OUT OF SCOPE — ruled 2026-08-01, own follow-up story filed at finish ===
A THIRD pass also stops at broadPhase with no narrowPhase: the player-vs-ptero attack at demo.ts:982 uses entityBox(pt.entity!) even though collisionMaskFor already gives a ptero the real PT1RC mask. Same defect family, deliberately a separate story. Do NOT widen jt8-7 to cover it.

Filed by Reviewer on jt8-4 (R-2).

## Technical Approach

_Measured pointers, not design. TEA and Dev own the shape; these are the files, lines and ROM
anchors the work sits on, all verified by SM at setup._

**The ROM quarry.** Vendored at `reference/williams-source/joust/`. The test helper resolves it at
`plugins/joust/tests/helpers/joust-source.ts:54` (env `JOUST_SOURCE_DIR` overrides). The `.SRC` files
are **CRLF** — pipe through `tr -d '\r'` or a grep returns nothing and looks like absence.

| What | Where |
|---|---|
| The EGGI frame table (7 rows) | `JOUSTI.SRC:2255-2261` |
| `CEGGUP` / `CEGGLF` / `CEGGRT` / `CEGGMN` span tables | `JOUSTI.SRC:2263-2302` |
| `WEGG` frame selector | `JOUSTRV4.SRC:3507-3530` |
| `EGFLFT` / `EGFRIT` offset tables | `JOUSTRV4.SRC:3535-3536` |
| The duplicate CEGGMN/PLY4S row under PLYR4 | `JOUSTI.SRC:2159` |

**`WEGG` decoded** (`LEAY A,Y` indexes EGGI by a BYTE offset; rows are 6 bytes, so `0`→row 0,
`6`→row 1, `12`→row 2):

```
        LDA  PVELX,U      ; sign of velX picks the table
        BPL  WEGRIT       ;   >= 0 -> EGFRIT (0,6,12)
        LDY  #EGFLFT      ;   <  0 -> EGFLFT (0,12,6)
WEGY    LDD  PVELY,U
        BMI  WEGVM        ; rising
        SUBD #$0080
        BGT  WEGD2        ; fast FALL   -> offset[2]
WEGUP   LDA  ,Y           ; near-level  -> offset[0]
WEGD2   LDA  2,Y
WEGVM   ADDD #$0080
        BGT  WEGUP        ; slow rise   -> offset[0]
WEGD3   LDA  1,Y          ; fast RISE   -> offset[1]
```

**The port side.**

| What | Where |
|---|---|
| The single existing EGGI record (to be subsumed) | `plugins/joust/src/core/pictures.ts:1699` |
| The CEGG span tables, already transcribed | `pictures.ts:1799-1806` |
| `ENTITY_RECORDS` per-ROM-row precedent (jt3-7) | `pictures.ts` — the `PT1R…PT3L` and lava-troll blocks just below EGGI |
| The catch pass to wire | `plugins/joust/src/core/demo.ts:1027` |
| The two-phase shape to mirror | `demo.ts:887-897` |
| `eggBox` (the 16×16 that is too tall) | `demo.ts:812`, consts at `:321-322` |
| `collisionMaskFor` (no egg branch) | `demo.ts:734` |
| `narrowPhase(a, b, masks)` signature | `plugins/joust/src/core/joust.ts:166-183` |
| The `MASKS` lookup built from `COLLISION_TABLES` | `demo.ts:332-333` |
| `EggState` (has `velX`/`velY`; no frame field) | `plugins/joust/src/core/egg.ts:37-58` |
| The dangling-source check new records must satisfy | `plugins/joust/tests/pictures.test.ts:304` |
| The existing CEGGMN/rider assertion | `plugins/joust/tests/pictures.test.ts:319-330` |

**Span encoding:** `$8000` is a blank row, `$8100` the ending terminator (`resolveSpans` in
`joust.ts` handles both). CEGGUP is 7 real rows + terminator; CEGGLF and CEGGRT are a leading blank
+ 6 real + terminator; CEGGMN is 11 real + terminator.

**Purity:** everything above belongs in `src/core/` and must stay pure — the joust core-boundary
scanner reads SOURCE TEXT including comments, so avoid the words that trip it in prose too.

## Open question SM did NOT settle — verify, do not assume

`CEGGMN` is shared. The identical `FDB CEGGMN,$00F5,PLY4S` row appears BOTH at `JOUSTI.SRC:2261`
(EGGI row 6) and at `:2159` inside the PLYR4 table, and `pictures.test.ts:319-330` already asserts
CEGGMN belongs to "the dismounted standing rider". SM did **not** determine whether transcribing
EGGI row 6 should reuse that existing record, add a second one under an EGGI-scoped name, or whether
the two rows are genuinely one frame reached by two tables. **Settle this before writing the row-6
assertion**: a duplicate record could redden the existing rider test, and a shared one could make
AC1's literal "one record per ROM row" unsatisfiable as worded. If it is, say so and amend AC1
explicitly rather than quietly satisfying a looser reading.

## Scope

**In scope**
- Transcribing all seven EGGI rows as `ENTITY_RECORDS` (AC1).
- A pure selector porting `WEGG`'s frame choice from `velX`/`velY` (AC2).
- Wiring `narrowPhase` into the player↔egg catch pass (AC3).
- The tests that prove the reach tightened and the catch still fires (AC4, AC5).

**Out of scope**
- **The player↔ptero pass at `demo.ts:982`**, which also stops at `broadPhase` despite a ptero
  carrying the real `PT1RC` mask. Same defect family; ruled a SEPARATE story on 2026-08-01 and filed
  at this story's finish. **Do NOT widen jt8-7 to cover it.**
- Rendering. The shell draws no egg today (only `audio*.ts` reference eggs), so the frame selection
  has no rendering consumer — this is collision-only.
- Any new pixel data or span tables. All seven sources and all four masks already exist; adding any
  would violate AC1.
- Changing `eggBox`'s callers other than the catch pass, or altering the egg scoring ladder, the
  mid-air bonus or the cue count (AC4 pins those as unchanged).

## Acceptance Criteria
- All seven EGGI rows (JOUSTI.SRC:2255-2261) are transcribed as ENTITY_RECORDS in pictures.ts — one record per ROM row, each carrying that row's own anchor line, collision mask, position word and pixel source. The existing single-row EGGI record is subsumed. No new PIXEL_BLOCKS and no new COLLISION_TABLES are introduced (all seven sources and all four masks already exist).
- A pure, clock-free and RNG-free selector ports WEGG's per-frame choice (JOUSTRV4.SRC:3507-3530, with the EGFLFT/EGFRIT offset tables at :3535-3536): given an egg's velX and velY it returns the EGGI still row — near-level (|velY| <= $0080) selects row 0 CEGGUP for both directions; a fast FALL selects CEGGLF when velX < 0 and CEGGRT when velX >= 0; a fast RISE selects CEGGRT when velX < 0 and CEGGLF when velX >= 0. It adds NO new field to EggState.
- The player-vs-egg catch pass (demo.ts:1027) runs narrowPhase after broadPhase — using the mask AC2's selector names for that egg, and the catching player's own mask — mirroring the two-phase shape the joust pass already uses at demo.ts:887-897.
- A test proves the collect radius genuinely tightened: an overlap that the 16px ENTITY_BOX_H box accepts but the selected egg mask rejects is no longer a catch, AND a genuine mask overlap still collects (scores the EGGVAL rung, the mid-air bonus and the single egg-collected cue as before). Deleting the narrowPhase call must redden it.
- The joust core-boundary/purity scanner still passes, and the joust and shared vitest projects are green. Every new anchor satisfies the existing pictures anchor/label checks.

---
_Scaffolded by `pf context create story jt8-7` from the sprint YAML, then hand-authored by SM at
setup (2026-08-01)._

> ⛔ **DO NOT REGENERATE OR OVERWRITE THIS FILE.** The Technical Approach, Scope, open question and
> the title banner are hand-authored from measurements taken against the tree and the vendored ROM.
> A regeneration replaces them with `_Approach hints to be refined by TEA/Dev_` filler and restores
> the stale premise. The `## Problem` and `## Acceptance Criteria` sections DO mirror
> `sprint/epic-jt8.yaml` verbatim — if the story text changes there, edit the corresponding section
> here by hand rather than re-running the generator.
