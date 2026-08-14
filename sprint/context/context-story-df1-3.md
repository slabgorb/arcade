# Story df1-3 Context

## Title
glossary.md + subsystems.md + open-questions.md: author names -> plain English (PHRED/MAPC/MLJSR/NAPP/CKBYT, EUGENE + SAM vector blocks MESS0.SRC:165,175); subsystem -> owning file + routine + line (DEFA7 scheduler/IRQ/collision/sound-sequencer, DEFB6 enemy processes + vectors, AMODE1 attract/hall-of-fame/scanner, MESS0 text writers, BLK71 terrain/waves, SAMEXAP7 materialize/explode, ROMF8 reset/CMOS/pricing, ROMC0+ROMC8 diagnostics); OQ-1..OQ-5 from the design spec (CB1-vs-CB2, COUNT240 enablement, defend.3 upper-half packing, WDOG decode model, the $D000 2716-split ledger wording).

## Metadata
- **Story ID:** df1-3
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Defender — ROM source study + scaffold + fidelity harness (phase 1): the ground-truth dossier every later df* story cites

## Problem

The defender ROM study requires three documentation files to complete the dossier pattern established by df1-1 (citation gate) and df1-2 (brief.md). The current DOSSIER_FILES at `plugins/defender/tests/audit/dossier-sweep.ts:45` contains only `['brief.md']`, so the coverage sweep and byte re-open gate cannot validate the three new files when they are authored. Additionally, `citations.test.ts` carries retired "skipped on CI" comments (lines 33/248/272) from an earlier pattern where the vendored tree was not committed; it now needs a presence guard that asserts the tree exists. The `brief-dossier.test.ts` floor of 15 claims is inert against the actual census (33), creating drift risk between floors.

## Technical Approach

### Background (Measured Facts)

1. **Title-as-spec precedent**: The story title was the authoritative spec until today. All twelve premises in the title were verified line-exact against the vendored tree at `reference/original-source/defender/`: MESS0.SRC:165 = `* EUGENE'S VECTORS`, MESS0.SRC:175 = `* SAM'S VECTORS`, PHRED = assembler (`ASSEMBLE WITH PHRED`, SAMEXAP7.SRC:9), MAPC = map control register (`EQU $D000`, PHR6.SRC:11), MLJSR = cross-bank long-JSR macro (AMODE1.SRC:39), NAPP = N-frames macro (AMODE1.SRC:33, e.g. "NAPP 60 = 1 second"), CKBYT = checksum bytes (DEFA7.SRC:5 "CHECKSUM(ACTUAL)").

2. **Design spec reference**: `docs/superpowers/specs/2026-08-13-defender-cabinet-roadmap-and-df1-design.md` carries the authoritative df1-3 shape (lines 193-196) and the OQ-1..OQ-5 definitions (lines 210-224). The section-1 file-to-subsystem skeleton (line 26 onward) provides the structure for subsystems.md.

3. **Gate state and enrollment**: `DOSSIER_FILES` at `plugins/defender/tests/audit/dossier-sweep.ts:45` currently contains only `['brief.md']`. This story enrolls glossary.md, subsystems.md, and open-questions.md (AC4), each with citations verified under the df1-1 gate. Five claims JSON files exist (00-revision .. 04-authorship) totalling 33 claims; new claims entries are required to cover citations in all three new docs.

4. **Layout precedent**: `plugins/millipede/docs/rom-study/` carries the same glossary.md/subsystems.md/open-questions.md trio, providing a reference layout to copy rather than invent.

5. **Module-side block-identity evidence** (per df1-2 review improvement): MESS0.SRC:1 is `TTL MESS0 - MESSAGE BLOCK REV 0 - 12/22/80`; BLK71.SRC terrain header sits at the top (lines 4-6) while BLK71.SRC:1 is the generic `TTL D E F E N D E R 1.0`; AMODE1's attract/hall-of-fame content self-identifies block 1. These are pointer lines for TEA/Dev to cite under the gate.

6. **Routed findings from df1-2** (verified live 2026-08-14):
   - (a) `citations.test.ts` still carries the retired "skipped on CI" comment model at lines 33, 248, and 272, with no unskipped presence guard — this is AC5.
   - (b) `brief-dossier.test.ts` has a hand-picked claims floor of 15 (comment near line 439) inert against the actual census of 33 — this is AC6.
   - (c) The loadClaims shape-validation finding is routed to df1-6 (explicitly not in df1-3's scope).

### TDD Shape (Same as df1-2)

- **RED phase** (test first): Suite-side enrollment of the three filenames in DOSSIER_FILES, correction of the skipped-on-CI comment model in citations.test.ts with an unskipped presence guard, and derivation of the AC6 floor from a single source (mutation-proven).
- **GREEN phase** (implementation): Author glossary.md, subsystems.md, and open-questions.md; create new claims/*.json entries covering every prose citation; verify byte-for-byte against the vendored tree until the citation gate's coverage sweep and byte re-open pass.

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
- AC1: plugins/defender/docs/rom-study/glossary.md exists and translates the author vocabulary to plain English — at minimum PHRED (SAMEXAP7.SRC:9 ASSEMBLE WITH PHRED), MAPC (PHR6.SRC:11), MLJSR (AMODE1.SRC:39), NAPP (AMODE1.SRC:33), CKBYT (DEFA7.SRC:5) — and documents the per-author message-vector blocks (EUGENE and SAM vector blocks, MESS0.SRC:165 and MESS0.SRC:175). Every ROM assertion is a citation covered by a claims/*.json entry under the df1-1 gate.
- AC2: plugins/defender/docs/rom-study/subsystems.md exists mapping each subsystem to owning file + routine + line — DEFA7 (scheduler/IRQ/collision/sound-sequencer), DEFB6 (enemy processes + vectors), AMODE1 (attract/hall-of-fame/scanner), MESS0 (text writers), BLK71 (terrain/waves), SAMEXAP7 (materialize/explode), ROMF8 (reset/CMOS/pricing), ROMC0+ROMC8 (diagnostics) — deepening the design spec section-1 skeleton, and pinning the MODULE-SIDE block-identity evidence (MESS0 own TTL header line, BLK71 terrain header, AMODE1 attract/hall-of-fame content) per the df1-2 review improvement.
- AC3: plugins/defender/docs/rom-study/open-questions.md exists carrying OQ-1..OQ-5 from the design spec (CB1-vs-CB2 IRQ wiring, COUNT240/CA1 enablement, defend.3 upper-half packing, WDOG decode model, the $D000 2716-split ledger wording), each with its evidence cited and a disposition stating which later epic or story resolves it.
- AC4: all three new files are ENROLLED in DOSSIER_FILES (plugins/defender/tests/audit/dossier-sweep.ts) so the coverage sweep and byte re-open run over them; every prose citation in the three files is covered by a claims JSON entry that verifies byte-for-byte against reference/original-source/defender/.
- AC5 (routed from df1-2): citations.test.ts retired skipped-on-CI comment model (currently lines 33/248/272) is corrected to the shipped always-on model, and an unskipped presence guard asserts the vendored tree exists so the byte teeth can never silently skip.
- AC6 (routed from df1-2): brief-dossier.test.ts hand-picked claims floor of 15 (inert — actual claims census is 33) is derived from the same single source as the already-derived answers floor, so the two floors cannot drift apart; the derived floor is mutation-proven (dropping a claims file reddens it).

---
_Generated by `pf context create story df1-3` from the sprint YAML._
