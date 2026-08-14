# Story df2-2 — Palette: the 16-entry CRAM/PCRAM model + the 3-3-2 decode decision

**Epic:** df2 · **Points:** 3 · **Priority:** p2 · **Type:** feature · **Repo:** arcade · **Workflow:** tdd

## Summary

Model the Defender palette hardware (16-entry CRAM) and the PCRAM pseudo-palette shadow, transcribing the default palette bytes from the vendored ROM source into a gated table. Resolve the architectural decision about whether to extract the palette-byte→RGBA decoder (`paletteToRgba`) into `@shared/` (if Defender's byte format matches joust's 3-3-2 BBGGGRRR) or keep it local (if the formats diverge). This is the only conditional extract story in df2: evidence strongly suggests the extract path is correct, but the decision gates on reading the byte FORMAT from MAME, not guessing.

## Technical Approach

### The Model

Defender's video subsystem uses a **16-entry colour RAM (CRAM)** at address `$C000` (from `PHR6.SRC:13`). The CPU mutates a shadow copy, the **pseudo-colour RAM (PCRAM)** at `PHR6.SRC:219`, which the video IRQ copies to CRAM each frame (`DEFA7.SRC:1968-1994`). Pixels are 4-bit **indices** into this palette (0–15), two per byte.

This story delivers:
1. **Palette table:** Transcribe the 16 default palette bytes from the vendored source into a gated, immutable data structure.
2. **PCRAM → CRAM resolver:** A pure function that reads 16 palette indices and resolves them to CRAM (the resolved palette for rendering). Joust models this implicitly; Defender makes it explicit.
3. **Byte format decision:** Read from MAME's `williams.cpp` palette init (pinned by df1-4) whether Defender encodes its palette bytes as 3-3-2 BBGGGRRR (same as joust) or differently. Document the format in prose; do not guess.

### The Extract Decision

Joust's `paletteToRgba` (in `plugins/joust/src/shell/render.ts:50`) is currently a shell function that decodes a single byte from 3-3-2 BBGGGRRR format into an RGBA colour. Defender needs the same decode **if and only if** its byte format is identical.

- **If Defender's byte format is 3-3-2 BBGGGRRR** (expected, same Williams video chip): Extract `paletteToRgba` to `@shared/` as a Williams-specific palette decoder and update both joust and defender to import it.
- **If Defender's byte format differs:** Defend keeps its own decoder; do not force-share divergent hardware.

The key fact — the byte **format** — is a **board fact** read from MAME in prose (`williams.cpp` palette init, the dump pinned to df1-4), never guessed.

### Palette Entries

The 16 palette bytes themselves are **transcribed from the vendored source**, not MAME. Source wins on software facts; MAME only on the byte format. Every transcribed palette entry must be backed by a citation (see df2 Acceptance Criteria, below).

## Acceptance Criteria

- [ ] Palette table of 16 entries is transcribed from `reference/original-source/defender/PHR6.SRC` into a gated, independent-reader table (GENERATED + gate pattern following joust's `pictures-gate.test.ts`)
- [ ] Each palette entry has a `plugins/defender/docs/rom-study/claims/*.json` citation entry, byte-verified against the vendored source
- [ ] PCRAM → CRAM resolver implemented as a pure function that accepts 16 indices and returns the resolved palette (can mock/return identity for now)
- [ ] Byte format is documented in prose, read from MAME `williams.cpp` palette init (df1-4 pinned dump), with explicit decision: "FORMAT: 3-3-2 BBGGGRRR" or "FORMAT: [other]"
- [ ] If byte format is 3-3-2 BBGGGRRR: `paletteToRgba` extracted to `@shared/palette-decoder` (or similar module), both joust and defender updated to import from `@shared/`
- [ ] If byte format differs: defender retains its own decoder; joust unchanged
- [ ] Render shell scans clean of hard-coded colour hex literals (colours-are-never-invented guardrail)
- [ ] No render regression: df2-1's existing render seam (identity palette, cleared framebuffer) still paints a 292×240 cleared surface
- [ ] Story covered in tests; citations verified by existing gates

## References

- **Epic:** `sprint/context/context-epic-df2.md` — the df2-2 architectural decision section
- **Palette location:** `reference/original-source/defender/PHR6.SRC:13` (CRAM), `:219` (PCRAM)
- **IRQ copy:** `reference/original-source/defender/DEFA7.SRC:1968-1994`
- **MAME byte format:** `williams.cpp` palette init (pinned to df1-4, `sprint/context/context-epic-df1.md`)
- **Joust reference:** `plugins/joust/src/shell/render.ts:50` (`paletteToRgba`), `plugins/joust/src/core/pictures.ts:89` (palette encoding doc)
- **Transcription pattern:** `scripts/transcribe-pictures.mjs` + `plugins/joust/tests/pictures-gate.test.ts`
- **Citation gate:** `plugins/defender/tests/audit/citations.test.ts` (df1-1)
- **Purity gate:** `plugins/defender/tests/purity.test.ts` (df1-1)

---

> ⚠ **SM-Verified Anchors**
>
> SM has measured these facts against the current tree and confirms they are accurate:
>
> 1. **PHR6.SRC exists:** `reference/original-source/defender/PHR6.SRC` is real and contains CRAM definition (`EQU $C000` at line 13) and PCRAM definition (`RMB 16` at line 219). The description cites `:219` (PCRAM) and `:13` (CRAM) — treat these as approximate anchors; TEA must pin them precisely against the current file.
>
> 2. **df1-4 pinned dump is real:** df1-4 (epic df1 story 4) is the MAME SHA-pin story. The byte-format source (`williams.cpp` palette init) is available in the pinned dump referenced in that story's context. This is the authoritative source for the byte FORMAT (not the palette entries).
>
> 3. **Extract-or-keep-local is a RESEARCH fork:** This is NOT a user either/or ruling — it is a resolvable question from source. **Evidence strongly points to the EXTRACT branch:** Joust's `paletteToRgba` in `plugins/joust/src/shell/render.ts:50` already decodes 3-3-2 BBGGGRRR (documented in its code and in `plugins/joust/src/core/pictures.ts:89`). The function is currently in joust's SHELL, not yet in `@shared/`. So **IF** defender's MAME byte format (from df1-4) matches 3-3-2 BBGGGRRR (expected — same Williams video family), the story extracts `paletteToRgba` to `@shared/` and re-points **both** joust and defender; **ELSE** defender keeps it local. TEA must confirm defender's byte format against the df1-4 pinned MAME object before locking the branch.
>
> 4. **Colours-are-never-invented guardrail (memory: colours-never-invented):** Palette entries are transcribed from the vendored source; any ground/letterbox fill must resolve through the palette index (e.g., `indexToRgba(0)` or `colours[0]`), never a hex literal. The core/shell boundary is mechanically enforced (purity test scans `plugins/defender/src/core/`). `paletteToRgba` lives in SHELL, not core.

_Generated by sm-setup from epic-df2.yaml story df2-2._
