# Story rb4-1 Context

## Title
THE RADIX SWEEP — the ROM's constants are HEX; we read them as decimal. ~30 of them.

## Metadata
- **Story ID:** rb4-1
- **Type:** bug
- **Points:** 8
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** red-baron
- **Epic:** Red Baron — ROM fidelity against the original 1980 Atari source

## Problem
Cluster C1. Subsumes EN-002, EN-003, EN-004, EN-014, CB-003, CB-011, CB-018, CB-019, MI-010, MI-011, MI-014, MI-015, MI-016, MI-017, MI-022, FL-016, FL-017, RD-003, RD-016 (~19 findings, ~30 constants — the same error filed nineteen ways). The single most important story in the epic and the gate on everything numeric. LAND THIS ALONE AND FIRST: every other numeric story is downstream, and any that lands first bakes the decimal reading into its own baseline and then 'confirms' itself against this document. RBARON.MAC is `.RADIX 16` from line 74; the ONLY decimal island is :6217-6280 (the vertex table — which we already read correctly). A trailing period forces decimal inside a hex region (`CMP I,250.` is 250, not 592). Expect the whole numeric test suite to re-baseline — that is the point, not a regression.

## Technical Approach

### The one fact this story turns on
`RBARON.MAC` sets `.RADIX 16` at line 74. Every constant below that line is
**hexadecimal**. Our clone transcribed them as decimal. Verified directly in the
primary source:

| Line | Directive | Governs |
|------|-----------|---------|
| 74   | `.RADIX 16` | everything from :74 onward — **hex** |
| 6217 | `.RADIX 10` | the vertex table only — **decimal** |
| 6281 | `.RADIX 16` | back to hex for the remainder |

So `:6217–:6280` is the *only* decimal island in the file, and it is the one
region we already read correctly. Two traps: a **trailing period forces decimal
inside a hex region** (`CMP I,250.` is 250, not 592), and `037007.XXX` is
genuinely `.RADIX 10` from its line 80 — its decimal reading is **right**.

### Source of truth (and the one that is poisoned)
- **Primary source — cite this:** `~/Projects/red-baron-source-text/RBARON.MAC`
  (plus `RBGRND.MAC`, `037007.XXX`). The CRLF sibling `~/Projects/red-baron-source`
  is **NOT citable**.
- **The audit — the story's spec:** `red-baron/docs/2026-07-13-red-baron-primary-source-audit.md`
  (already on `develop`; every citation byte-verified on both sides).
- **DO NOT cite as authority:** `red-baron/docs/red-baron-1980-source-findings.md`.
  This doc is the *cause* of the bug — it sources enemy constants to `R2BRON.MAC`,
  a build that **never shipped**, and misreads that build's hex as decimal.
  rb4-2 retracts it. Production code currently cites it; every constant this story
  touches must be re-cited to the primary source instead.

### Guardrails already in the repo (must stay green)
`tools/audit/check-citations.mjs` + `tests/audit/citations.test.ts` re-open every
cited line byte-for-byte, and the checker **rejects any citation to the decoy
build**. `npm test -- citations` is an acceptance criterion, not a formality.

### Expected blast radius
`src/core/` — `enemy.ts` (ACCEL, P.INDP, MIN_DEPTH, PLPOSZ), `guns.ts` (S.MAXZ),
`explosion.ts` (EX.ACY, wreck Z spin), `scene.ts` / `camera.ts` (HORZ, HORIZN),
plus the mountain/recycle constants (PFOBIZ, P.OBDZ, P.OBZI, the 16-bit `0x01C0`
threshold). **The numeric test suite is expected to re-baseline — that is the
point of the story, not a regression.** Do not "fix" a test back to the decimal
value to keep it green.

## Scope
- **In scope:** every gameplay constant in `src/core/` transcribed from a
  `.RADIX 16` region, re-read as hex and re-cited to the primary source with its
  governing radix region noted.
- **Out of scope / DO NOT TOUCH:** `topology.ts`, the 42-vertex biplane, and all
  picture-ROM data. `037007.XXX` really is `.RADIX 10` — our decimal reading of it
  is **correct, and changing it would break the geometry.**
- **Out of scope:** the poisoned doc itself (that is rb4-2) and every other rb4
  numeric story — they are all downstream of this one and land after it.

## Acceptance Criteria
- Every constant transcribed from a `.RADIX 16` region is corrected. At minimum: ACCEL 30→0x30=48 (enemy.ts:44); P.INDP 1080→0x1080=4224; MIN_DEPTH 140→0x140=320 (enemy.ts:63); S.MAXZ 19→0x19=25 (guns.ts); EX.ACY -20→-0x20=-32 (explosion.ts); wreck Z spin 0x180; PLANE1/PLANE2 drone offsets 100→0x100=256; HORZ 1000→0x1000=4096 and HORIZN=0x40=64 (scene.ts / camera); PFOBIZ mountain depths+X; P.OBDZ=0x180 and the 0x20 fallen delta; P.OBZI=0x7F00 recycle; the 16-bit recycle threshold 0x01C0=448 (NOT 0xC0).
- Each corrected constant carries a comment citing file:line AND the radix region that governs it — e.g. `// RBARON.MAC:465, .RADIX 16 region (set at :74) → 0x30 = 48`. A bare number with no radix note is a failure of this story.
- PLPOSZ is corrected in ALL FOUR respects EN-014 names — sign (negative, added to depth so depth falls), magnitude (hex), length (nine entries), and the level ramp — not just the radix.
- A test or script proves NO remaining gameplay constant in src/core/ was taken from a hex region and written as decimal. The transcription is auditable, not asserted.
- The 42-vertex biplane, topology.ts and the picture-ROM data are NOT touched: 037007.XXX really is .RADIX 10 from line 80 and our decimal reading of it is CORRECT. Changing it would BREAK the geometry. Say so in the story's own notes.
- npm test -- citations stays green.

---
_Generated by `pf context create story rb4-1` from the sprint YAML._
