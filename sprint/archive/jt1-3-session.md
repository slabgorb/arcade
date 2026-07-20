---
story_id: "jt1-3"
jira_key: "jt1-3"
epic: "jt1"
workflow: "tdd"
---
# Story jt1-3: Image transcription — decode JOUSTI.SRC into src/core/pictures.ts, byte-gated, with COMCL5 RLE + collision spans + contact sheet

## Story Details
- **ID:** jt1-3
- **Jira Key:** jt1-3
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-20T00:49:15Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T23:52:23Z | 2026-07-19T23:54:37Z | 2m 14s |
| red | 2026-07-19T23:54:37Z | 2026-07-20T00:11:53Z | 17m 16s |
| green | 2026-07-20T00:11:53Z | 2026-07-20T00:31:11Z | 19m 18s |
| review | 2026-07-20T00:31:11Z | 2026-07-20T00:49:15Z | 18m 4s |
| finish | 2026-07-20T00:49:15Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (blocking to AC-2 as worded): **the "91-block inventory" is wrong — the real count is 93.** `pictures.md`'s own per-entity table sums to 93 (14+14+14 birds + 13 riders + 6 egg + 6 troll + 4 flame + 3 poof + 6 ptero + 1 ASH + 11 cliffs incl. COMCL5 + 1 transporter); the headline sentence above it says 91. An independent machine census of `JOUSTI.SRC` also gives 93 — and every per-entity row in the table is individually correct (all nine verified against the source this session), so only the total is wrong. AC-2 quotes the bad number. The suite asserts **93** with the per-entity breakdown. Affects `joust/docs/rom-study/pictures.md` (fix the headline) and `sprint/epic-jt1.yaml` AC-2 text. *SM should rule whether the AC text is amended now or at finish.* *Found by TEA during test design.*
- **Conflict** (non-blocking, but it will mislead Dev): **the story context says image rows are `@` octal — they are not.** `JOUSTI.SRC` contains **zero** `@` literals: pixel rows are `$` hex (13,724 of them), COMCL5 is `%` binary (871), collision spans are bare DECIMAL expressions (`7+COFF`). Octal appears only in the PALETTES (`SYSTEM.SRC:908-923`, `JOUSTRV4.SRC:754-761`) and in the artist files' stripped development headers. The epic description's "@ OCTAL (all palette bytes + image rows!)" is half right. A Dev hunting `@` in image data finds nothing and may conclude the transcription is mis-anchored. Affects `sprint/context/context-story-jt1-3.md` and the `sprint/epic-jt1.yaml` epic description. *Found by TEA during test design.*
- **Conflict** (non-blocking): **the story describes COMCL5 as "value/run pairs"; it is an Elias-gamma BIT stream.** Per `SYSTEM.SRC:938-1023`: a unary prefix counts bits to a gamma-coded run length (minus 2), then three more bits give a colour code that maps 0→nibble 0 and 1..7→nibbles 8..14 (`ADDA #8-1`). Run length 0 means end-of-line, or end-of-image when the colour bits are zero. Implementing "value/run pairs" produces garbage that still consumes the stream. Verified by an independent decode this session: 871 bytes in, 5773 pixels out, 186×33 at origin (54,211). Affects `sprint/context/context-story-jt1-3.md` and `joust/docs/rom-study/pictures.md` (§ COMCL5). *Found by TEA during test design.*
- **Gap** (non-blocking, high value): **`JOUSTI.SRC` contains two comment-wrap artefacts that are indistinguishable from labels and corrupt collision data.** Lines :65 and :89 carry comments that wrap onto the next line with no `*` continuation, leaving `ZERO)` at :66 and `CREEN` at :90 sitting in the label column. Any label-scanning transcription invents two symbols — and, worse, **splits the collision table each one interrupts**: `CCLF1L`'s mask is 8 rows (:65-:73) but a reader honouring `ZERO)` transcribes **one** row and attributes seven to the phantom. The result is a wrong mask that is still well-formed, so nothing downstream complains. `CREEN` is a valid uppercase identifier, so shape heuristics cannot find it (my first attempt missed it); the suite isolates both semantically — a real label is referenced somewhere in the file, comment debris is referenced by nothing, which selects exactly 2 of 27 bare labels. Affects `joust/docs/rom-study/pictures.md` (worth documenting as a transcription hazard for jt1-4/jt1-6, which read the same file). *Found by TEA during test design.*
- **Gap** (non-blocking): **pixel data appears as both `FCB` (bytes) and `FDB` (words), and some rows are space-indented rather than tab-indented.** All ten cliff sources (`CSRC1R`, `CSRC3R`, …) and `TRASRC` are FDB-only. A reader that assumes FCB, or assumes tabs, silently drops them — my own first census lost exactly those blocks. Affects the transcription approach; pinned by a reader test and by the cliff-source inventory test. *Found by TEA during test design.*
- **Question** (non-blocking): **AC-3's expansion is pinned by invariants plus a committed fixture, not by an independent reference decoder.** The pixel data gets true double entry (TEA's reader vs Dev's transcription); the RLE cannot, without TEA shipping a decoder that Dev would then be tempted to mirror. What the suite pins instead: exact stream consumption (871), geometry cross-validated against two separate source statements, the legal nibble alphabet, purity/determinism, and TEA's independently-decoded pixel count (5773). Initial correctness of the expanded IMAGE therefore rests on the contact sheet and human review — which is precisely why the story asks for one. Stated so nobody later reads the green as stronger than it is. *Found by TEA during test design.*
- **Improvement** (non-blocking): `ASH1R`/`ASH1L` decode looks like **(high nibble = run length, low nibble = colour), `$01` = end of row, `$00` = end of image** — e.g. `$D0,$1C,$01` reads as 13 pixels of colour 0 then 1 of colour $C. That is a lead from reading `JOUSTI.SRC:2781-2791`, **not** a verified claim; the consumer is `JOUSTRV4.SRC:1390` (`LDD ASH1R`) via the pointer table at `:48-49`. Recorded so jt3 starts with a hypothesis rather than a blank. Affects `joust/docs/rom-study/open-questions.md` §5. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking, resolved in-story): **`ASH1R`/`ASH1L` is not undecoded — the author documents the format in the consumer.** TEA left a hypothesis; I traced it and it is confirmed *and* corrected. `JOUSTRV4.SRC:1390` (`LDD ASH1R`) reaches `PTEASH` → `CLIFER` (`JOUSTRV4.SRC:4604-4631`), where `:4605` reads *"lo nybble is color, hi nybble is length"*. TEA's hypothesis was right about the nibble split and the `$01`/`$00` terminators, but the run length counts **BYTES**, not pixels: the colour nibble is replicated into both halves (`LDB #17`, `:4608`) and the **last** byte of each run is masked to its high nibble alone (`:4622-4624` — *"last byte is always one pixel to enhance debris image"*). That is exactly why a pixel-counted reading gives ragged, inconsistent row widths, which is what made the hypothesis look unverifiable. Also: the pointer table TEA cited as `:48-49` is in **JOUSTI.SRC**, not JOUSTRV4.SRC. Affects `joust/docs/rom-study/open-questions.md` §5 — it should be closed, not carried forward. *Found by Dev during implementation.*
- **Gap** (non-blocking): **`CSRC5L` holds one more row of data than any record draws.** `CLIF5`'s left-cap sub-record (`JOUSTI.SRC:289`) specifies `$080D` = 8x13, but the `CSRC5L` data at `:307-320` is **fourteen** rows of 8 = 112 bytes. Truncating to the record would drop 8 real source bytes (AC-4 forbids truncation), so the block keeps all 112 and takes its height from the data. Whether the 14th row is dead art or an off-by-one in the 1982 record is a rendering question, not a transcription one. Affects jt1-6 (it will draw 13 of these 14 rows and should know why). Claims JT3-021/022. *Found by Dev during implementation.*
- **Improvement** (non-blocking): **the AC-2 block count is a coincidence worth stating.** 93 is right, but `PIXEL_BLOCKS.length + DEFERRED.length` reaches it two different ways: with ASH deferred it is 92+1, with ASH transcribed it is 93+0. The suite's assertion passes either way, so the count alone cannot tell a reviewer which happened. I transcribed it (see above), so `DEFERRED` is empty and the deferral tests pass vacuously — including the consumer-trace test, which is the one that would otherwise have carried the ASH trace forward. The trace is preserved in claims JT3-010…JT3-016 and pictures.md instead. Affects the Reviewer's reading of the ASH tests. *Found by Dev during implementation.*
- **Improvement** (non-blocking): **the bare-`:N` canary caught me adding to jt1-8's backlog, which is the canary working exactly as designed.** My first pictures.md draft wrote nine new citations in the bare `:N` form (`:4605`, `:66`, …), pushing the count 128 -> 137 and reddening the jt1-2 canary. All nine are now fully qualified, so the count is back to exactly 128 and every one of them is covered by a JT3 claim. Worth recording because the natural way to write a source reference in prose IS the bare form — jt1-4 and jt1-6 will hit this the moment they document anything. Affects the epic's remaining transcription stories. *Found by Dev during implementation.*
- **Question** (non-blocking): **`src/core/pictures.ts` is 1802 lines / ~200 KB of literal arrays, and nothing imports it yet.** `vite build` tree-shakes it out entirely (the bundle is unchanged at 1.42 kB), so the build says nothing about it; only `tsc --noEmit` covers it today. When jt1-6 renders from it, the whole table lands in the bundle at once. Worth deciding before then whether the shipped form stays literal arrays or becomes a compact encoded payload — the byte gate works either way, since it re-derives from anchors. Affects jt1-6. *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Transcribed `ASH1R`/`ASH1L` instead of deferring it.** The story and TEA's suite allow a stub or an explicit deferral; the SM said "verify it or stub". I verified it (see findings) — the format is stated by the author in the consumer routine — so deferring would have recorded a gap that no longer exists. The raw 172-byte stream is transcribed as a normal anchored block; *rendering* it is jt1-6's job. Consequence: `DEFERRED` is `[]`, so the three deferral tests pass vacuously. Flagged for the Reviewer rather than left to be discovered.
- **Committed the transcription tool (`tools/transcribe-pictures.mjs`), unlike jt1-2's throwaway generator.** jt1-2's claims were data a human could re-derive by reading; this is 11,445 bytes across 93 blocks whose grouping rules (framed vs raw, span rows vs pixel rows, phantom skipping) are genuine logic. A one-shot would make jt1-4/jt1-6 re-improvise all of it, and the module header says DO NOT HAND-EDIT — which is only honest if the generator exists. It carries no tests of its own; its correctness is established by the byte gate it feeds, which is a stronger check than unit tests on the reader would be.
- **`COMCL5` and `ASH1R` are stored as 1-D blocks (`width = byteLength, height = 1`).** They are compressed streams, not rasters, but the contract requires `bytes.length === width * height` for every `PixelBlock`. Any other geometry would be an invention. The contact sheet lists them separately under "Compressed streams — not rasters" rather than drawing them as pixel grids.
- **`HICOLR`'s anchor spans `JOUSTRV4.SRC:754-769`, crossing the `NULL` label at `:762`.** The suite requires 16 entries with 8-15 black; the source writes 8 live entries and then lets the adjacent `NULL` palette's zeros supply the rest. The anchor follows the memory layout, not the label boundary, because that is what the hardware reads.

### TEA (test design)
- **Authored an independent source reader (`tests/helpers/joust-source.ts`) rather than re-running Dev's transcription:** AC-1's wording ("a test re-derives pictures.ts from the vendored JOUSTI.SRC") is satisfiable by having the test invoke Dev's own tool and diff — which proves only that the tool is deterministic, while every misreading survives and is confirmed by its author. With no ROM binaries vendored there is no third artefact to fall back on, so the verification path had to be a second, independent reading of the text. This is a larger TEA investment than a normal RED, and it is the only shape in which AC-1 and AC-4 mean anything.
- **Added an independence rule the story does not mention, and made it a test:** nothing under `src/` or `tools/` may import the test-side reader. Without it, Dev can satisfy every other assertion by importing TEA's reader into the transcription — collapsing double entry back into a tautology while the suite stays green. This is the single assertion holding the rest up, so it never skips.
- **Specified the module contract in `tests/helpers/pictures-contract.ts`:** the jt1-2 `.d.mts` pattern applied to a `.ts` deliverable. TEA states the exported shape (self-citing records carrying a `SourceAnchor`), Dev writes the module and the data. Anchors are not decoration — they are the mechanism that makes AC-4's "no hand-authored pixels" checkable rather than aspirational.
- **Required a committed CI fixture (`docs/rom-study/pictures.fixture.json`), and made the source keep it honest:** AC-1 asks for degradation to "committed-fixture comparison" when the tree is absent. A fixture baked from a wrong module would then make CI green forever, so whenever the tree IS present the gate verifies the fixture against the **source**, not against the module that produced it.
- **Asserted 93 blocks, not the AC's 91:** see the blocking Conflict finding. The suite follows the source and the dossier's own per-entity table; the headline total is an arithmetic slip.
- **Required a text-inspectable contact sheet (`.html`/`.svg`, not a bare `.png`):** the story calls the sheet a review artefact, and pixel-asserting an image whose purpose is human judgement would be pointless. But *coverage* is mechanically checkable — a reviewer cannot notice a block that was never drawn — so the suite requires every block label to appear on the sheet, which needs a format a test can read.
- **Left the RLE without a TEA reference decoder:** see the Question finding. Invariants + fixture + contact sheet, with the limitation stated rather than papered over.

## Sm Assessment

**Story:** jt1-3 (5pt, p1, tdd) — image transcription: JOUSTI.SRC → src/core/pictures.ts, byte-gated. Both record formats, COMCL5 RLE (NEWCL5/UNCOM, SYSTEM.SRC:927-1023), collision spans (COFF bias, $8000/$8100 sentinels), COLOR1/HICOLR palettes (BBGGGRRR), contact sheet (91 blocks). NO ROM binaries — the gate re-derives every frame from vendored text. NO hand-authored pixels. ASH1R/L may be stubbed with consumer traced or deferred with a finding.

**Setup verified:** session + context + branch `feat/jt1-3-image-transcription` off develop (05f9179; jt1-1+jt1-2 merged, 95/95). First story behind the LIVE citation gate: new transcribed constants get new fully-qualified claims; the rider-nibble pairing (PIC-068/069/070 at :2055/:2084/:2115) and WCLFTB (PIC-071) are the corrected anchors this story consumes. Radix traps in force (@ octal, decimal spans, % binary, !X pre-XOR).

**Execution mode:** peloton team peloton-jt1-3, persistent riders via SendMessage. jt1-1 (joust#3) and jt1-2 (joust#4, two rounds) shipped this session.

**Routing:** setup → red, owner tea.

## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a — jt1-3 is the first story to transcribe actual ROM data; the byte gate is its whole point. No chore bypass.

**Test Files:**
- `joust/tests/helpers/joust-source.ts` — TEA-authored **independent reader** of the 1982 assembler (radix, operand-field, FCB/FDB, phantom detection, S-Record decode). The second entry in the double-entry gate.
- `joust/tests/helpers/pictures-contract.ts` — the `src/core/pictures.ts` contract + loader (jt1-2 `.d.mts` pattern).
- `joust/tests/pictures-gate.test.ts` — AC-1 + AC-4: reader teeth, phantom-label trap, per-block re-derivation, w/h geometry cross-check, three-way provenance, fixture degradation, the independence rule.
- `joust/tests/pictures.test.ts` — AC-2 + AC-3: inventory, name traceability, COMCL5 RLE, palettes, records, collision spans, ASH deferral, contact sheet, claims coupling.

**Tests Written:** 58 tests covering 4 ACs
**Status:** RED

| Environment | Result |
|---|---|
| with the vendored tree | **41 failed / 112 passed** (153 total) |
| `JOUST_SOURCE_DIR=/nonexistent` — the CI path | **32 failed / 88 passed / 33 skipped** |
| jt1-1 + jt1-2 baseline | **95/95 green, unchanged** |
| `tsc --noEmit` | **exit 0** |

Every failure is missing implementation: `src/core/pictures.ts`, `docs/rom-study/pictures.fixture.json`, `tools/bake-contact-sheet.mjs`, the contact sheet, and the new claims. `loadPictures()` throws a self-describing "not transcribed yet" rather than a resolution stack trace.

**The core design decision:** AC-1 is satisfiable in a way that proves nothing — re-run Dev's transcription tool inside the test and diff it against its own output. That gate catches only non-determinism; every misreading survives and is confirmed by its own author, which is the rb4/cp1 failure this epic exists to prevent. With no ROM binaries vendored there is no third artefact to lean on, so the verification path had to be an independent second reading. Hence the TEA-authored reader, and hence the test that forbids `src/`/`tools/` from importing it — without that one assertion the whole suite is theatre.

**Four traps found in the real source this session**, each now pinned by a test:

| # | Trap | Consequence if missed |
|---|---|---|
| 1 | `ZERO)` (:66) and `CREEN` (:90) — comment-wraps in the label column | **Splits collision tables.** `CCLF1L`'s 8-row mask becomes 1 row + a phantom. Still well-formed, so nothing downstream complains. |
| 2 | Pixel data in both `FCB` and `FDB`, some space-indented | Ten cliff sources + `TRASRC` silently dropped |
| 3 | `COLOR1`'s two operand columns | 5 of 16 palette entries silently wrong |
| 4 | `$WWHH!XDMAFIX` header vs pixel geometry | Cross-check; all 80 headered blocks agree, so any transcription slip breaks it |

Trap 1 is the one worth dwelling on: `CREEN` is a valid uppercase identifier, so **no shape heuristic can find it** — my first attempt at that test missed it and I had to switch to a semantic discriminator (a real label is referenced somewhere; comment debris is referenced by nothing), which selects exactly 2 of 27 bare labels.

**AC-3 groundwork:** the RLE is an Elias-gamma bit stream, not the value/run pairs the story describes. Decoded independently this session — 871 bytes consumed exactly, 5773 pixels, 186×33 at origin (54,211), corroborated by `NEWCL5`'s hard-coded `LDX #$1B*2 / LDY #$D3` **and** `CLIF5`'s `$1BD3` dest with its "93 BY 33" comment (93 bytes = 186 pixels). Nibble alphabet {0} ∪ {8..14} is the only one `ADDA #8-1` can emit.

**Commit:** joust `feat/jt1-3-image-transcription` — `4347540`

**Handoff:** To Dev for implementation (GREEN).
## Sm Ruling (green-phase entry)

**93-block count — ACCEPTED, AC amended NOW (not at finish).** TEA's machine census and pictures.md's own per-entity table both sum to 93; only the dossier headline says 91, an arithmetic slip the AC inherited. epic-jt1.yaml AC-2 + description now read 93 (with provenance note); the story context's radix section is corrected too (pixel rows are $ HEX, zero @ literals in JOUSTI.SRC; COMCL5 is an Elias-gamma bit stream, NOT value/run pairs; octal is palette-only). Dev fixes pictures.md's headline sentence in-story (one line) and should treat TEA's Conflict findings as the authoritative radix map.

**Double-entry design — endorsed.** The independence rule (nothing under src/ or tools/ may import tests/helpers/joust-source.ts) is the load-bearing assertion; Dev must not weaken it. The RLE has no reference decoder by design (invariants + fixture + contact sheet + human review) — the Question finding states the residual honestly; Reviewer should weigh the contact sheet accordingly.

**Phantom labels (ZERO)/CREEN at :66/:90) — high-value catch;** Dev's transcription must honor the semantic isolation (2 of 27 bare labels are comment debris). Document as a transcription hazard in pictures.md for jt1-4/jt1-6.

**Routing:** red → green, owner dev.

## Dev Assessment

**Implementation Complete:** Yes

**Files (joust — committed to `feat/jt1-3-image-transcription`, `1b8986f`):**
- `src/core/pictures.ts` — **generated**, 1802 lines: the transcription + the RLE decoder
- `tools/transcribe-pictures.mjs` — the transcription path (see Design Deviations for why it is committed)
- `tools/bake-contact-sheet.mjs` + `docs/rom-study/contact-sheet.html` — the review artefact
- `docs/rom-study/pictures.fixture.json` — the CI path
- `docs/rom-study/claims/transcription.json` — 24 new claims
- `docs/rom-study/pictures.md` — headline 91→93, transcription-hazards section, decoded ASH format

**Block census — 93, matching AC-2 as amended:**

| Group | Count | Notes |
|---|---|---|
| Framed entity blocks (`$WWHH!XDMAFIX` header) | **80** | ostrich 14, stork 14, buzzard 14, rider 13, egg 6, troll 6, flame 4, poof 3, ptero 6 |
| Cliff pixel sources | **10** | `CSRC1L/1R/2/3L/3U/3R/4/5/5L/5R` — all FDB-only |
| Transporter source | **1** | `TRASRC` 14×3, shared by all four pads |
| Compressed streams | **2** | `COMCL5` 871 B, `ASH1R` (alias `ASH1L`) 172 B |
| **Total `PIXEL_BLOCKS`** | **93** | `DEFERRED` is empty — ASH was decoded, not deferred |

Also: **26** entity records, **12** background records, **35** collision tables, **3** palettes (`COLOR1`, `HICOLR`, `NULL`), **11,445** transcribed bytes.

**COMCL5 expansion (AC-3) — independent agreement with TEA:**

| Figure | Mine | TEA's independent decode |
|---|---|---|
| stream consumed | 871 / 871 bytes | 871 |
| pixels written | **5773** | 5773 |
| geometry | **186×33** | 186×33 |
| alphabet | {0, 8, 10, 12, 13, 14} | ⊂ {0} ∪ {8..14} |

Two decoders written independently from `SYSTEM.SRC:937-1023`, agreeing on every figure without either seeing the other. That is the double entry the story was built for, and it is the strongest evidence in this story.

**Claims:** 158 → **182** (24 added, all byte-verified; `check-citations.mjs` exit 0). Bare-`:N` canary back to exactly **128** after I qualified the nine I had introduced.

**Tests:**

| Run | Result |
|---|---|
| full suite, tree present | **154/154 passing** (RED was 41 failed / 112 passed) |
| full suite, `JOUST_SOURCE_DIR=/nonexistent` (CI path) | **121 passed / 33 skipped, 0 failed** |
| `npm run build` | **exit 0** |
| `node tools/audit/check-citations.mjs` | `checked 182 claim(s) / all claims verified`, exit 0 |

**Proven red — four poisons against the real artefacts, all reverted:**

| Poison | Caught by |
|---|---|
| **A** — one pixel byte flipped in `ORUN1R` (`$F8`→`$F9`) | THREE independent tests: the byte gate (`ORUN1R: byte 6 differs — source $f8 vs module $f9`), the three-way S-Record provenance check, and the fixture digest |
| **B** — transcriber HONORS the phantom labels | `CCLF1L` collapses **8 spans → 1**, and an invented `ZERO)` symbol appears in the module. Caught by *"CCLF1L survives the phantom-label comment wrap"* — exactly the failure TEA predicted |
| **C** — module corrupted AND fixture re-baked so the two AGREE | *"the fixture itself re-derives from the source"* → `CSRC1L: fixture digest ≠ source digest`. The source-verifies-fixture rule works |
| **D** — transcription imports the test-side reader | *"nothing under src/ or tools/ imports the test-side reader"* → `['tools/transcribe-pictures.mjs']`. The load-bearing assertion has teeth |

**Handoff:** To Reviewer.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|---|---|---|---|---|
| 0 | reviewer-preflight | **Not spawned — scope executed directly by the Reviewer** | **1 FAILING TEST** | Suite **153 passed / 1 failed** (not the 154/154 baseline), reproduced 5/5 runs; CI path 120 passed / 1 failed / 33 skipped; citations 182 exit 0; build exit 0; purity 19/19 (pictures.ts is swept); tree clean. | The failure is `scaffold.test.ts` "npm run dev exits non-zero when 5279 is taken" — **jt1-1's test, not jt1-3's**, and it exposed a real fleet-level gap (see findings). Ran directly rather than delegated so the numbers came from my own shell. |
| 1 | reviewer-edge-hunter | Yes (645 s) | findings | CI never runs the byte gate (tree absent by design); **COMCL5 bytes never re-derived**; CSRC5L 14 rows vs `$080D`=8×13 header with `headerAnchor: null` routing it around the cross-check; HICOLR live entries never re-derived and its anchor overlaps NULL's; ASH1R stored as a raster `PixelBlock` with no non-raster discriminant. | Partially accepted. **One central claim was WRONG and I caught it by checking: COMCL5 *is* inside `PIXEL_BLOCKS`** (length 93, `pb.some(name==='COMCL5')` → true), so its assertion that COMCL5 "is a separate top-level export, outside PIXEL_BLOCKS" is false. But probing it myself surfaced the **real** defect underneath, which is worse and different — see the blocking finding. The CSRC5L, HICOLR and ASH-discriminant findings are accepted and filed. |
| 2 | reviewer-test-analyzer | Yes (602 s) | findings | Three ASH deferral tests now inert (one runs **zero assertions**); no count floors on `ENTITY_RECORDS` (26), `BACKGROUND_RECORDS` (12), `COLLISION_TABLES` (35), `PALETTES` — each empirically truncated and still green; `NULL` palette never referenced by name, so dropping it passes the whole suite; contact-sheet coverage is a raw `text.includes(name)` substring scan; independence rule is a text regex — blind to code duplication and to a future path alias. Verified the 33 skips map exactly to the 33 tree-dependent tests with zero unaccounted, and zero `if (!vendoredAvailable)` early returns. | Accepted in full; the skip accounting and floor analysis are careful work. Note it reported **154 passed / 0 skipped** on the tree path where I get 153/1 — that divergence is itself evidence the strictPort failure is environment-sensitive rather than a code regression. |

| 3 | reviewer-rule-checker | **Not spawned — scope executed directly by the Reviewer** | clean | jt1-8 bare-`:N` canary at **exactly 128** by my own count; citations **182**, exit 0; purity guard 19/19 with `src/core/pictures.ts` swept (new core file, correctly picked up); zero invented phantom symbols in the data (140 named entries, 0 containing `ZERO`/`CREEN`); `CCLF1L` carries its full 8 rows; ASH1R/L consumer trace verified against `JOUSTRV4.SRC:4604-4626`; radix map confirmed (pixel rows are `$` hex, COMCL5 `%` binary, spans decimal, octal palette-only). | Deliberate: jt1-3's rule surface is the ROM-transcription discipline (radix, anchors, phantom labels, canary), all of which needed reading the 1982 source directly against the module rather than pattern-matching a checklist. Two specialists were already deep in the same files and a third would have duplicated them; the claims/citation layer is machine-gated (182 exit 0) and was independently re-verified in the jt1-2 reviews. |

**All received: Yes** — all enabled specialists accounted for: 2 of 2 spawned returned results; reviewer-preflight and reviewer-rule-checker scopes were executed directly by the Reviewer (rows 0 and 3).

## Reviewer Assessment

**Verdict:** REJECTED

**This is a narrow rejection on one absolute AC, with a one-line fix. The transcription itself is excellent and needs no rework** — the data is correct, and I verified that harder than anything else in this review.

### What I verified first-hand, all of it good

- **The byte gate works.** Corrupting the `PIXEL_BLOCKS` COMCL5 entry fails two tests with a precise message (`COMCL5: byte 0 differs — source $e vs module $f`, `COMCL5: digest mismatch`). Restored clean.
- **The decoder is a faithful transcription of the 1982 assembler.** I traced `UNCLP`/`REST` line-by-line against `SYSTEM.SRC:937-1023`: the unary prefix loop (`INCA`/`ASLB`/`BCC`), the reload-on-empty (`LDB ,U+ / ASLB / INCB`), `REST`'s implicit leading 1 (`LDA #1` + `ROLA`×n), `SUBA #2`, and the colour map (`ANDA #$07 / BEQ / ADDA #8-1` → {0} ∪ {8..14}). Dev's implementation matches on every point, including the initial `CLR ,S` → `b = 0` state.
- **Geometry has a decoder-independent confirmation.** `JOUSTI.SRC:286` carries the 1982 author's own comment `* 93 BY 33`, and `:287`'s `$1BD3` dest matches `NEWCL5`'s `LDX #$1B*2 / LDY #$D3` → origin (54,211). 93 bytes = 186 pixels. The decoder's 186×33 agrees with the source's own statement — this does not depend on any decoder being right.
- **I ran the decoder myself:** 871 bytes consumed, **5773** pixels, **186×33**, alphabet `[0,8,10,12,13,14]` ⊂ {0}∪{8..14}, deterministic across calls, input unmutated. Dev's and TEA's figures reproduce exactly.
- **Phantom-label trap handled.** `CCLF1L` carries its full **8** rows, not 1. Zero invented symbols in the data (the single `ZERO)`/`CREEN` occurrence in `pictures.ts` is a header comment documenting the hazard — good practice).
- **ASH1R/L trace verified at source.** `JOUSTRV4.SRC:4605` literally reads *"lo nybble is color, hi nybble is length"*; `LDB #17` replicates the nibble ($0A→$AA); `:4623-4625` reads *"last byte is always one pixel"* with `ANDB #$F0`. Dev's correction of TEA's hypothesis — runs count **bytes**, not pixels — is exactly right.
- **jt1-8 canary at exactly 128** by my own count.
- **Citations 182, exit 0. Build exit 0. Purity 19/19 with `pictures.ts` swept.**

### The visual review — the human judgment the RLE rests on

Chrome's extension wasn't connected and Playwright's screenshots weren't landing on disk, so rather than skip the review the story explicitly asks for, I served the sheet and then read the pixels directly, which puts the evidence in the record.

**CLIFF5 reads unmistakably as a cliff.** Rendered at 2:1 (93×33 — the source's own "93 BY 33"): a banded sky, two large solid masses split by narrow vertical channels, a clean horizontal ledge rule, then irregular rock texture narrowing and re-widening below. **The decisive detail: the vertical channel columns hold the same horizontal position across 8+ consecutive rows.** A stride or row-boundary error shears such features diagonally within two or three rows. They do not drift. The per-row lengths — 186,186,185,185,184,182,181,179,176,175,174,173,171,169,169,168,168,168,169,169,169,169,171,171,171,173,173,173,174,178,178,178,178 — form a smooth profile narrowing to a 168 waist and widening again. That is a rock silhouette, not noise; a broken decoder produces neither monotone runs nor a symmetric waist.

**Sprites are coherent.** `ORUN1R` (8×20) is a running ostrich in profile — beak and head top-right, a neck column descending, body mass mid-frame, two legs splitting below. `PLY1R` (7×7) is a seated rider with an outstretched lance (the long horizontal run at row 5), and it is **entirely nibble 5** — which independently confirms the `PIC-068` claim I ruled on in jt1-2, from the other side. 93 labels / 93 cells / 92 drawn SVGs / 14,855 `<rect>` elements: the sheet draws real pixels, not a manifest.

**Verdict on the visual review: PASSES.** I would not have caught a subtle palette error this way, and I do not claim to have — but shredding, stride errors and gross mis-anchoring are excluded.

**Project-rule compliance — [RULE].** The epic's transcription discipline holds on every axis I checked against the 1982 source. **Radix:** TEA's corrected map is what shipped — pixel rows are `$` hex, COMCL5 is `%` binary, collision spans are bare decimal (`7+COFF`), and `@` octal appears only in palettes; the `!X` pre-XOR is preserved unevaluated. **Core/shell:** `src/core/pictures.ts` is pure and the purity guard sweeps it (19/19) — the generated RLE decoder reads no clock, no entropy, no browser surface, and I confirmed it is deterministic and non-mutating by running it twice on the same input. **Citation gate:** 182 claims, exit 0, and the bare-`:N` canary sits at exactly 128, so this story added no unqualified citations — Dev's own finding that the canary caught his nine and forced him to qualify them is the gate working as designed. **Anchors:** every `PixelBlock` is self-citing, which is what makes AC-4 checkable rather than aspirational. **No hand-authored pixels:** the phantom-label hazard is honoured (`CCLF1L` = 8 rows, zero invented symbols among 140 named entries). The one rule violation I found is the blocking one below — AC-4's "every byte" is not true of the duplicated COMCL5 export. I did not dismiss it on the grounds that the data happens to be correct; the AC is about provenance being *proven*, and for those 871 bytes it is not.

### The blocking finding — AC-4 is demonstrably unmet for 871 bytes

**The 871 COMCL5 bytes exist twice in `pictures.ts`, and only one copy is gated.**

- `PIXEL_BLOCKS[…].name === 'COMCL5'` (line **294**) — byte-gated, works (proven above).
- `export const COMCL5` (line **1678**) — a **second, independent copy**. `pb === P.COMCL5` → **false**; `pb.bytes === P.COMCL5.bytes` → **false**.

I corrupted a byte in the named-export copy and ran the gate: **23/23 passed.** Nothing re-derives it. The only assertions touching it are `bytes.length === 871` (`pictures.test.ts:98`) and a non-mutation check (`:215`). **No test asserts the two copies are equal.**

Why this blocks rather than files:

1. **AC-4 is worded absolutely** — *"Zero hand-drawn pixel data: every byte in pictures.ts provably originates in the vendored source."* 871 of 11,445 bytes (7.6%) provably do not, and I demonstrated it by corrupting them undetected.
2. **It is exactly where AC-3 lives.** Every expansion test calls `pics.expandComcl5(pics.COMCL5.bytes)` — the **ungated** copy. So the 5773-pixel / 186×33 result that AC-3 pins, and that my own visual review rests on, is computed from bytes the gate never checks. Today they are correct; the gate is not what establishes that.
3. **The fix is one line** — make the named export reference the `PIXEL_BLOCKS` entry (or add an equality assertion, or feed `COMCL5.anchor` to `bytesInRange`). This is a cheap round, not a redesign.

**To be clear about what is *not* wrong:** the data is right. The gated copy re-derives from source, both copies agree today, the expansion is correct, and the image renders as a cliff. Nothing false ships downstream. What fails is the *claim* that the gate proves it.

### Deviation rulings

| Deviation | Ruling | Rationale |
|---|---|---|
| 1. ASH1R/L transcribed, not deferred | **ACCEPTED — the trace is verified** | I read `JOUSTRV4.SRC:4604-4626` myself; the author states the format outright and Dev's byte-vs-pixel correction is right. Deferring a gap that no longer exists would have been the worse record. **On the vacuity: tighten, don't remove.** One of the three tests (`pictures.test.ts:425`) executes **zero assertions** with `DEFERRED = []` — it cannot fail. Keep them as scaffolding for jt1-4/5/6, which touch the same format, but they must not be counted as ASH coverage in any summary. Add an explicit `expect(DEFERRED).toEqual([])` so the emptiness is *asserted intent* rather than silent inertia. The genuine loss is the consumer-symbol linkage check, which now exists nowhere; the JT3 claims carry the trace instead, and the citation gate verifies them — acceptable. |
| 2. Transcription tool committed without its own tests | **ACCEPTED** | Dev's argument holds: the byte gate that consumes the output is a stronger check than unit tests on the reader, and `DO NOT HAND-EDIT` is only honest if the generator exists. jt1-4/jt1-6 need the grouping logic. I'd add one caveat for jt1-4: the tool is now load-bearing infrastructure, so the *next* story that changes its grouping rules should add tests at that point rather than inheriting the exemption indefinitely. |
| 3. Compressed streams stored 1-D (`width = byteLength, height = 1`) | **ACCEPTED with a caveat** | Correct given the `bytes.length === width * height` invariant; inventing a geometry would be worse. But nothing in the type or the suite marks these as non-raster, and the module's own `width` doc ("Pixel width is 2× this") is misleading when applied to them. Recommend an `encoding: 'raster' \| 'stream'` discriminant before jt1-6 consumes the table. |
| 4. HICOLR anchor spans `:754-769` crossing the `NULL` label | **ACCEPTED as transcription, FLAGGED as unverified** | Following memory layout over the label boundary is right — the hardware reads 16 contiguous bytes. But HICOLR's *live* 8 entries are never re-derived from source (unlike COLOR1), the only assertion checks `slice(8)` is zero, and the anchor overlaps NULL's own `:762-777` so two palette records cite the same 8 lines with nothing establishing that is intentional. Add a COLOR1-style re-derivation for `:754-761`. |

### Findings by severity

| Severity | Issue | Location | Blocks? |
|---|---|---|---|
| **HIGH** | COMCL5's 871 bytes are duplicated; the `export const COMCL5` copy is **ungated** (corrupting it passes 23/23) and is the copy every AC-3 test and every consumer uses. AC-4's "every byte provably originates in the source" is unmet for 7.6% of the data. | `src/core/pictures.ts:294` vs `:1678` | **YES** |
| MEDIUM | **`strictPort` does not actually protect the port.** `lsof` proves it: with `127.0.0.1:5279` held, vite binds `[::1]:5279` and starts normally — two dev servers on one port, no collision. This makes jt1-1's behavioural test fail (5/5 for me, though the specialist saw 154/154 — environment-sensitive), and it means CLAUDE.md's fleet-wide guarantee and its own "the port may belong to a different checkout" warning are **weaker than documented**: you can serve and screenshot the wrong checkout with no error at all. Fix is `host: '127.0.0.1'` (or dual-stack checking) in the shared vite config. **Not jt1-3's defect** — jt1-1's test and a fleet config issue. | `joust/vite.config.ts` + all siblings; `tests/scaffold.test.ts:106-176` | No (not this story) |
| MEDIUM | No count floors on `ENTITY_RECORDS` (26), `BACKGROUND_RECORDS` (12), `COLLISION_TABLES` (35), or `PALETTES`. Each was empirically truncated and the suite stayed green. `PIXEL_BLOCKS` **is** floored at 93, so the headline gate is safe — the exposure is the collections jt1-6's renderer needs. `NULL` is never referenced by name, so dropping it entirely passes. | `tests/pictures.test.ts:265,301,310,367` | No |
| MEDIUM | CSRC5L is transcribed 8×**14** (112 bytes) while its header `$080D` un-XORs to 8×**13**; `headerAnchor: null` routes it around the geometry cross-check, and no `BackgroundRecord` captured the LEFT/RIGHT SIDE words, so no test sees the discrepancy. Dev's decision to keep all 112 bytes is right per AC-4 — but it should be *asserted*, not merely flagged in prose. | `src/core/pictures.ts:261`, `JOUSTI.SRC:289` | No |
| MEDIUM | HICOLR's live 8 entries never re-derived from source; anchor overlaps NULL's across `:762-769` with no test or comment establishing intent. | `src/core/pictures.ts:1672` | No |
| LOW | Contact-sheet coverage is `text.includes(b.name)` — a bare list of 93 names with no images would pass identically. Today's sheet is genuine (14,855 `<rect>`s, verified), but nothing protects against a bake regression. | `tests/pictures.test.ts:470` | No |
| LOW | The independence rule is a text regex: it catches the naive static import (proven by Dev's poison D) but is structurally blind to **code duplication**, and to a future `tsconfig`/`vite` path alias (none configured today). Worth an inline comment stating the limitation so it is not over-trusted. | `tests/pictures-gate.test.ts:375` | No |
| LOW | `ExpandedImage` returns a flat `pixels` array with `{width, height}`, but rows are **ragged** (168–186, sum 5773 ≠ 186×33 = 6138). Row boundaries are unrecoverable from the returned shape — I had to re-decode to render it. A jt1-6 consumer indexing `pixels[y*width+x]` will shear the image progressively. Return row offsets or pad rows. | `src/core/pictures.ts:1740` | No |

### On the independence question SM raised

The import rule holds and the two readers share no code — both import only Node builtins, and the sole cross-reference is a comment. But the answer to *"confirm it isn't secretly one decoder"* is more nuanced than the framing assumed: **TEA shipped no COMCL5 decoder at all** (deliberately, and TEA's Question finding says so). The `expandComcl5Ref` in the transcriber is a **self-described line-for-line copy** of the decoder it emits — same identifiers, same structure — used to bake the fixture. So the fixture's `expandedSha256` is produced by the same algorithm it is meant to check, and the real TEA-vs-Dev agreement (871/5773/186×33) happened **once, during RED, against a throwaway decoder that is not in the repo**. It is genuine evidence and I credit it, but it is a historical event, not a standing gate — and it should not be described as "two decoders written blind" in the repo today. What actually stands behind the RLE is: the source's own `93 BY 33` comment, the two independent origin statements, the invariants, and human review. That is what TEA said, and it is honest.

**Handoff:** Back to Dev (GREEN) for the one-line COMCL5 duplication fix. Nothing else in the transcription requires rework.
## Sm Fix Note (R2 — direct fix, user-authorized)

The user directed: "if it is simple to fix, do it without routing again." Both R1 items were mechanical with Reviewer-prescribed shapes; SM applied them directly (an exception to the SM no-code rule by explicit user instruction):

1. **The HIGH (AC-4, ungated COMCL5 copy):** fixed in the GENERATOR (pictures.ts says DO NOT HAND-EDIT, so the honest fix is tools/transcribe-pictures.mjs) — the named export is now a VIEW of the gated PIXEL_BLOCKS entry (one byte array, shared by reference); regenerated pictures.ts (-40/+7 lines, byte content identical). **Proof by the Reviewer's own probe:** poisoning one byte in the now-single literal fails the AC-3 consumers (2 tests red: stream consumption + 186×33 geometry) where R1's probe showed 23/23 green on the ungated copy. Reverted after proof.
2. **Deferral-test vacuity (tighten-don't-remove ruling):** added an explicit "DEFERRED is empty by decision" test asserting `toEqual([])` with the disclosure-obligation comment; the two loop tests remain as rails for future deferrals.
3. **strictPort (the Reviewer's fleet discovery, jt1-1's defect):** reproduced in THIS environment on this run (vite bound [::1]:5279 with IPv4 held — flaky by stack timing, exactly as diagnosed). Applied his prescribed fix to joust's vite.config.ts: `host: '127.0.0.1'` on server AND preview, with a comment naming the trap. Suite now passes the behavioural test deterministically. Fleet-wide rollout (7 sibling repos + CLAUDE.md trap doc) filed separately — NOT smuggled into jt1-3.

**Post-fix verification:** suite 155/155 (154 + the new intent test); citations 182 verified exit 0; build exit 0. Verdict flipped to approved on the strength of: narrow rejection, Reviewer-prescribed fixes applied verbatim, his own probe re-run as proof.
