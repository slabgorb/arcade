---
story_id: "jt3-6"
jira_key: "jt3-6"
epic: "jt3"
workflow: "tdd"
---
# Story jt3-6: Ptero death dissolve — decode the ASH1R/L third image format byte-gated, wire ptero/baiter death -> dissolve + event

## Story Details
- **ID:** jt3-6
- **Jira Key:** jt3-6
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** review
**Phase Started:** 2026-07-21T18:14:45.032788+00:00

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-21T18:14:45.032788+00:00 | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Improvement** (non-blocking): DECODE-NOW path taken — the poof fallback is NOT needed. The ASH1R/L consumer is fully traced: `DEATH4` (JOUSTRV4.SRC:2941, `LDD #PTEKLL`) → `PTEKLL` (:1369) → `LDD ASH1R` + `LDA #3` (:1388-1390) → `BSR PTEASH` (:1393) → `PTEASH` (:1411) → `JMP CLIFER` (:1419). `CLIFER` (:4604-4631) is the routine that reads/blits the bytes and ESTABLISHES the format in its own comments: each byte = `(length = high nibble) | (color = low nibble)`; `$00` ends the image; a byte whose length nibble is 0 but is non-zero (e.g. `$01`) ends the line (next row one down); a run writes `length` screen-bytes of `color`, the LAST byte one pixel only (high nibble, `ANDB #$F0`). The format was verified by decoding the real vendored bytes: 3 frames (PTERA1/2/3), each 28×11, alphabets {0,4,12}/{0,4,14}/{0,4,14}. open-questions §5 ("value/run pairs?") is RESOLVED — it is packed-nibble run-length, CLIFER-decoded. *Found by TEA during test design.*
- **Gap** (blocking): Dev must ADD to `src/core/pictures.ts` — `expandAsh(bytes, offset?)` + `expandAshFrames(bytes)` (the CLIFER decoder, producing `ExpandedImage` per frame like `expandComcl5`), and CHANGE the `ASH1R` block's `encoding` from `'stream'` to the THIRD value `'runlength'` (widen the type union `'raster' | 'stream' | 'runlength'`). `COMCL5` stays `'stream'` (Elias-gamma). `ASH1R` must never be `'raster'` (the jt1-6 blit hazard). *Found by TEA during test design.*
- **Gap** (blocking): Dev must CREATE `src/core/dissolve.ts` — the pure nap-driven three-frame dissolve state (`startDissolve`/`stepDissolve`, `DISSOLVE_FRAME_COUNT=3`, `DISSOLVE_FRAME_NAPS=8`) both the ptero and the baiter enter via the shared `PTEKLL` path (baiter tagged, DECs NBAIT). It emits NO score event — jt3-4's `pteroScoreEvent` (1000, DVALUE $10 via SCRHUN) still fires and must NOT be re-emitted (ruling C, scoring accumulation is jt4). *Found by TEA during test design.*
- **Gap** (blocking): Dev must COMMIT `docs/rom-study/claims/dissolve.json` — ≥10 `JT36-*` claims naming their own FILE:LINE. The coverage pin (tests/dissolve-source.test.ts) forces citations for 5 NOT-yet-cited ranges: `JOUSTRV4.SRC:1411-1419` (PTEASH→CLIFER), `:1393-1399` (the PCNAP 2+6 nap loop), `:2941-2945` (DEATH4 dispatch), `:1369-1372` (baiter NBAIT branch), `JOUSTI.SRC:48-49` (image pointer table). The CLIFER format lines + ASH data are already cited by jt1-3, so those pass. *Found by TEA during test design.*
- **Question** (non-blocking): the jt3-7 BOUNDARY — the spawned ptero/baiter is still INERT in the scheduler (frame.ts `runBehaviour` dispatches no `kind:'ptero'`/dissolve). jt3-6 builds the dissolve STATE + the death→dissolve transition ONLY; FULL live scheduler integration (stepping the dissolve from the process list, rendering its frames through ENTITY_RECORDS) is jt3-7. TEA did NOT touch frame.ts; the dissolve is exercised as pure state, not through stepFrame. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): TEA's CLIFER run-length format re-derived CLEANLY — my `expandAsh` (src/core/pictures.ts) and TEA's independent in-test `refExpandAshFrame` (transcribed from JOUSTRV4.SRC:4604-4631) agree byte-for-byte, frame-for-frame, on the vendored ASH1R/L stream. Both map color=`b&0x0F`, length=`(b>>4)&0x0F`, emit two-pixel bytes with the LAST byte one-pixel (low nibble 0), treat length-nibble-0 as end-of-line and `$00` as end-of-image, and report `next` just past the `$00`. The double-entry gate (dissolve-source.test.ts "Dev expandAshFrames matches the INDEPENDENT decode … frame-for-frame") passes. *Found by Dev during implementation.*
- **Improvement** (non-blocking): the three-frame decode result — PTERA1/2/3 all decode to width 28 × height 11; pixel counts 248/254/252 (ragged, not 28×11=308); alphabets {0,4,12}/{0,4,14}/{0,4,14} (the ash colour brightening 12→14 across the dissolve). Three `$00` end-of-image terminators at stream indices 50/108/171, so `expandAshFrames` returns exactly 3 frames. Matches TEA's pinned literals exactly. *Found by Dev during implementation.*
- **Gap** (non-blocking): jt3-7 must wire the dissolve into the live scheduler — it inherits an INERT ptero/baiter (frame.ts `runBehaviour` dispatches no dissolve step) and ENTITY_RECORDS has no PTERA1/2/3 render rows, so `expandAshFrames`' three frames are decoded but not yet drawn. Affects `src/core/frame.ts` (step the dissolve from the process list on death) and the ENTITY_RECORDS render seam. Boundary honoured: frame.ts UNTOUCHED this story. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): score TIMING lives downstream. In the ROM, PTEKLL emits the ptero score at the TAIL of the dissolve routine — after the 3-frame ash loop and the body erase (`LDD #MSGTH1*256+($11*PTC)` → `JMP SCRAIR`, JOUSTRV4.SRC:~1414-1417). jt3-4's `pteroScoreEvent` fires at kill time (early). jt3-6 correctly emits NO score of its own (AC-3 met — no double-emit), but the live wiring (jt3-7 / jt4 scoring) should decide whether the 1000-pt event should be sequenced AFTER the dissolve to match SCRAIR ordering. Out of scope for jt3-6; flagged so the seam is honored downstream. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the `DissolveState.baiter` flag currently has no consumer — the ROM's baiter branch also DECrements NBAIT and `JSR PATC10` (JOUSTRV4.SRC:1370-1373), both scheduler bookkeeping deferred to jt3-7. The flag faithfully carries the ptero/baiter distinction forward; jt3-7 must consume it (DEC NBAIT) when wiring the dissolve into the process list. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **Dev (implementation):** None. The implementation matched TEA's contract and the traced CLIFER format exactly — no divergence from spec or test expectations.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/pictures.ts` - widened the `encoding` union to `'raster' | 'stream' | 'runlength'`, retagged the ASH1R/L block `'stream'` → `'runlength'`, and added `expandAsh(bytes, offset)` + `expandAshFrames(bytes)` — the CLIFER run-length decoder (JOUSTRV4.SRC:4604-4631). Zero hand-authored pixels; every decoded byte traces to a gated ASH1R FCB byte.
- `src/core/dissolve.ts` (NEW) - the pure nap-driven three-frame dissolve: `startDissolve({baiter?})` / `stepDissolve(state)`, `DISSOLVE_FRAME_COUNT=3`, `DISSOLVE_FRAME_NAPS=8`. Emits NO score event (jt3-4 owns the 1000-pt kill). Baiter is a flag only.
- `docs/rom-study/claims/dissolve.json` (NEW) - 22 `JT36-*` claims (≥10 required), byte-exact verbatim, fully-qualified FILE:LINE, covering all 5 pinned not-yet-cited ranges.

**Tests:** 1348/1348 passing (GREEN) across 46 files. jt3-6 targeted (dissolve + dissolve-source + pictures + render + pictures-gate): 126/126. Purity sweep: 72/72. Build (tsc --noEmit && vite build): green.
**Branch:** feat/jt3-6-ptero-death-dissolve (to be pushed)

**Handoff:** To review phase. frame.ts UNTOUCHED (jt3-7 boundary honoured).

## TEA Assessment

**Tests Required:** Yes
**Reason:** Ruling B decode-now — the ASH1R/L format is fully derivable from its consumer (CLIFER), so the DECODE path is taken (not the poof fallback). New behaviour: the CLIFER run-length decoder, the third encoding discriminant, and the death→dissolve state machine.

**Test Files:**
- `tests/dissolve.test.ts` (NEW) — the decode behaviour (expandAsh/expandAshFrames, hand-verified literals), the third `'runlength'` encoding discriminant + no-hand-authored-pixels, the ptero+baiter death→dissolve state machine (not the poof; 1000 event still fires, not re-emitted), determinism + purity.
- `tests/dissolve-source.test.ts` (NEW) — STEP 1 the CLIFER consumer trace (the format-establishing lines) + the DEATH4→PTEKLL→PTEASH→CLIFER chain; STEP 2 the byte gate: re-derive ASH bytes from JOUSTI.SRC and decode with an INDEPENDENT reader, requiring Dev's expandAsh to agree frame-for-frame; the JT36-* claims coverage pin.
- `tests/helpers/dissolve-contract.ts` (NEW) — the `src/core/dissolve.ts` contract + `loadDissolve`.
- `tests/helpers/pictures-contract.ts` (MOD) — `expandAsh`/`expandAshFrames` + the `encoding: 'raster'|'stream'|'runlength'` field.
- `tests/render.test.ts` (MOD) — hazard 2 extended to the three-value discriminant; `ASH1R` is now `'runlength'`, `COMCL5` stays `'stream'`, buildAtlas refuses both.
- `tests/pictures.test.ts` (MOD) — AC-1 "the ASH run-length decoder lives in pictures.ts".

**Tests Written:** 25 failing (RED) across 4 files, covering all 4 ACs. RED command: `npx vitest run tests/dissolve.test.ts tests/dissolve-source.test.ts tests/render.test.ts tests/pictures.test.ts` → 6 failed of the 4 changed files' new assertions when run alone; the full new-behaviour count is 25 reds (dissolve.test.ts 19, dissolve-source.test.ts 3, pictures.test.ts 2, render.test.ts 1). 1322 pre-existing tests stay green (no collateral breakage); `tsc --noEmit` clean. Every red is missing-behaviour (module/decoder absent, encoding not yet third value, no JT36 claims), not an import error.
**Status:** RED (failing — ready for Dev)

**Handoff:** To Dev for implementation

## Reviewer Assessment

**Verdict:** APPROVED

**Tags:** [RULE] no hand-authored pixels — every decoded pixel traces to a vendored FCB byte, and the third `runlength` discriminant is genuinely enforced. [TEST] the decode is a real double-entry, not a tautology; mutation-resistant geometry + exact-alphabet pins. [SEC] pure core, no I/O, no injection surface. [SCOPE] jt3-6 boundary (dissolve STATE + decode, frame.ts untouched) is the correct jt3-4/jt3-5-style deferral.

I independently re-read the CLIFER decoder (JOUSTRV4.SRC:4604-4631), the PTEKLL death/ash loop (:1369-1417), and the ASH1R/L data (JOUSTI.SRC:2778-2815), and independently re-derived the decode — none of the load-bearing claims broke.

**Data flow traced:** JOUSTI.SRC ASH FCB bytes → jt1-3 byte gate (`PIXEL_BLOCKS.ASH1R.bytes` == `bytesInRange(...)`) → `expandAsh`/`expandAshFrames` (CLIFER `len<<4|color`) → 3 frames → `startDissolve`/`stepDissolve` nap walk → `done` (removal). Safe: the input is provenance-gated to source; the decoder is a pure function; the state machine is pure and terminal.

**Load-bearing claims — all CONFIRMED:**
1. GENUINE double-entry, not a tautology. TEA's `refExpandAshFrame` (tests/dissolve-source.test.ts:67) imports nothing from `src/`; the gate re-derives ASH bytes from JOUSTI.SRC via `bytesInRange` (independent of the committed array, which is *separately* asserted equal to source); the independent reader's output is pinned to hand-computable geometry (:266-274). I hand-decoded PTERA1 straight from `$D0,$1C,$01 / $B0,$2C,$14,$01 / …` and got 28×11 / 248 px — exactly the pinned literal. Format matches CLIFER: color=low nibble, length=high nibble, `$00`=end-image, length-nibble-0=end-line, run writes `length` bytes of color, last byte one pixel (`ANDB #$F0`).
2. NO hand-authored pixels (jt1-3 bar / ruling B). Committed bytes == source (gate). AC-2 provenance (dissolve.test.ts:193) + exact per-frame alphabet pins {0,4,12}/{0,4,14}/{0,4,14} catch any high/low nibble swap. No invented pixel.
3. Third discriminant. Union is `'raster' | 'stream' | 'runlength'`; ASH1R tagged `runlength`; `buildAtlas` packs ONLY `encoding === 'raster'` (src/shell/render.ts:132), so mistagging `raster` would make `atlas.blocks.ASH1R` defined and redden render.test.ts. Direct tag assertions redden on `raster`/`stream`.
4. Three-frame decode. Three `$00` at stream indices 50/108/171 (source-verified: PTERA1 ends `$5C,$00`, PTERA2 `$24,$00`, PTERA3 `$14,$00`); 28×11 each; 248/254/252 (248 hand-verified); the 12→14 brightening is real in source (`$1C/$2C` → `$1E/$2E`).
5. 1000-pt event NOT re-emitted. dissolve.ts has zero imports and NO score export (read in full); AC-3 asserts `Object.keys` has no `/score/i` member and that jt3-4's `pteroScoreEvent` still fires. Structurally cannot double-emit.

**Also verified:** 22 JT36-* claims (≥10 floor met), FQ FILE:LINE, radix-cited — I byte-verified ALL 22 verbatims against the vendored source myself (0 mismatches), and the citation gate re-opens them byte-for-byte with a proven drift-reddens test. poof-fallback correctly NOT taken (format is established from the CLIFER consumer). frame.ts genuinely untouched (git diff name-only). Purity sweep (it.each over `src/core`) covers dissolve.ts. State machine faithful to PTEKLL: 3 frames, 8 naps/frame (PCNAP 2+6), double-BSR is a same-frame redraw = render artifact.

**Verification run independently:** full suite `npx vitest run` → 46 files / 1348 tests PASS; `npm run build` (tsc --noEmit && vite build) → green; citation gate 56 PASS; purity 33 PASS. The "3 citation error(s)" console lines are intentional negative-path fixtures, not failures.

**Observations (blocking: none):**
- Nit (non-blocking): the two score/baiter downstream notes recorded under Delivery Findings → Reviewer, for jt3-7/jt4 to honor.
- The `expandAshFrames` walk has a defensive `if (next <= offset) break` and terminates cleanly on well-formed and malformed streams (no infinite loop); empty-frame (`$00` at offset) yields a zero-size image without crashing.

**Handoff:** To SM for finish-story.

## Sm Assessment


**Outcome:** APPROVED and merging — RED `de451cf`, GREEN `bf4aa73`. Full suite 1348/1348, build green.

**Pipeline (peloton, subagents):** setup -> TEA RED (25 reds; traced the full ASH1R/L consumer chain DEATH4->PTEKLL->PTEASH->CLIFER and RESOLVED open-questions §5 — the format IS derivable, decode-now not poof) -> Dev GREEN (built `expandAsh`/`expandAshFrames` in pictures.ts + `dissolve.ts` + 22 JT36 claims; a prior interrupted spawn left files on disk, this run verified each independently before committing) -> Reviewer APPROVED [RULE][TEST] 0 blocking.

**RULING B satisfied (Reviewer proved it 3 ways):** the decode is a GENUINE double-entry, not a jt1-3 tautology — TEAs `refExpandAshFrame` imports nothing from src/ and is fed source-re-derived bytes; the Reviewer hand-decoded PTERA1 from the vendored FCBs (`$D0,$1C,$01`...) to 28x11/248px matching the committed literal; and re-read CLIFER (`JOUSTRV4.SRC:4604-4631`) itself confirming byte = (length<<4 | color), $00=end-image, length-nibble-0=end-line. NO hand-authored pixels (decoded colours subset of source low-nibbles; per-frame alphabet pins {0,4,12}/{0,4,14}/{0,4,14} would redden on a nibble swap). Third `runlength` encoding tag has teeth: `buildAtlas` packs only `raster`, so a mistag reddens the atlas test. 22 JT36 claims byte-verified.

**Decode result:** 3 $00-terminated frames PTERA1/2/3, all 28x11, ragged pixel counts 248/254/252, ash colour brightens 12->14 across the dissolve.

**Scope deferral ACCEPTED:** jt3-6 = dissolve STATE + decode + death->dissolve transition; frame.ts genuinely untouched, no ENTITY_RECORDS PTERA rows. All 4 ACs hold at the pure-state level (mirrors jt3-4/jt3-5).

**CARRIED-FORWARD -> jt3-7 (threading into its setup):** (1) live scheduler wiring + ENTITY_RECORDS PTERA1/2/3 render rows (dissolve frames decode but arent drawn yet); (2) the `DissolveState.baiter` flag has no consumer yet — jt3-7 wires the ROM `DEC NBAIT` scheduler bookkeeping; (3) score-emit SEQUENCING — ROM emits the ptero score at PTEKLLs tail (post-dissolve, JMP SCRAIR) while jt3-4s `pteroScoreEvent` fires early; reconcile when the live scheduler lands (jt3-7/jt4). Plus the running jt3-7 list: live ptero/baiter flight+joust+wave-clear, the degenerate `facingInto` equal-column edge, and `DBAIT` (baiter-removal delay :4678).
