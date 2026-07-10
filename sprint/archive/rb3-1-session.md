---
story_id: "rb3-1"
jira_key: ""
epic: "rb3"
workflow: "trivial"
---
# Story rb3-1: Transcribe ground/landscape data (the rb2-2 analogue) — mountain silhouettes SCAPE0..3 (21/16/18/15 pts, PFPNTS 2-D format via the SEGSTR = pointIndex*6+4 opcode already stubbed in topology.ts), the 24 PFCOL ground-object collision boxes (PFOCOL), and horizon/altitude constants HORZ=1000, HORIZN=$40, PFPLOW=80*4 — into src/core/topology.ts from RBGRND.MAC

## Story Details
- **ID:** rb3-1
- **Jira Key:** (none — kanban tracking)
- **Workflow:** trivial
- **Stack Parent:** none
- **Repo:** red-baron
- **Branch:** feat/rb3-1-ground-topology-transcription

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-07-10T23:10:11Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-10T22:40:06+00:00 | 2026-07-10T22:41:40Z | 1m 34s |
| implement | 2026-07-10T22:41:40Z | 2026-07-10T23:04:05Z | 22m 25s |
| review | 2026-07-10T23:04:05Z | 2026-07-10T23:10:11Z | 6m 6s |
| finish | 2026-07-10T23:10:11Z | - | - |

## Sm Assessment

**Setup verdict:** Ready for implement phase (Dev / Julia).

- **Workflow:** trivial (phased: setup → implement → review → finish). No RED/TEA phase — Dev implements directly against the story title + Problem statement.
- **Scope:** Pure ROM data transcription into `red-baron/src/core/topology.ts`. No render, no RNG. Analogue of the completed rb2-2 (which transcribed plane/explosion/blimp connect-lists but explicitly scoped OUT the ground SCAPE lists — this story closes that gap).
- **Source of truth:** RBGRND.MAC. Transcribe:
  - Mountain silhouettes SCAPE0..3 — 21/16/18/15 points, PFPNTS 2-D format (x, height, intensity; Z discarded, X/2, Y*2). Findings §7 references R2GRND.MAC:725-798.
  - 24 PFCOL ground-object collision boxes (PFOCOL).
  - Constants HORZ=1000, HORIZN=$40, PFPLOW=80*4 (min altitude).
- **Reuse:** Existing `ConnectOp`/`decodeOp` machinery and `OP_SEGMENT` (= the SEGSTR = pointIndex*6+4 opcode, already exported/stubbed in topology.ts). Do not re-invent the decode path.
- **Unblocks:** rb3-3 (landscape render), rb3-4 (ground targets).
- **ACs:** Not pre-recorded in sprint YAML. Dev to define/validate against ROM values during implement; verify with the red-baron test suite (`cd red-baron && npm test`) and `npm run build`.
- **Gate note:** Jira intentionally skipped (kanban-only project per CLAUDE.md). Merge gate clean — fresh work, no blocking PRs.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Conflict** (non-blocking): `flight.ts` `ALT_MAX = 180 * 4` (= 720) appears to misread the RBARON.MAC altitude equates as DECIMAL. That equate block (RBARON.MAC:445-455, `PLYMAX = 180*4`) is under `.RADIX 16` — proven by the sibling equate `.STAR0 = 1B` (a `B` hex digit) and by `HORIZN = 40` being the story's `$40`. Under hex, `PLYMAX = 0x180*4 = 1536`, not 720. `ALT_MIN = 8*4 = 32` is coincidentally correct (0x8 = 8). Affects `red-baron/src/core/flight.ts:52-53` — team should confirm whether 720 was intentional tuning or a radix bug (I transcribed rb3-1's own constants HORZ/HORIZN/PFPLOW as hex per the same evidence). *Found by Dev during implementation.*
- **Gap** (non-blocking): The mountain SEGSTR connect-tables (`PFOPOS` segment table + `SMAP*`/`SMP*` lists, 037007.XXX:83+) that stitch the SCAPE points into the four scroll segments via `OP_SEGMENT` (flag 4) are NOT transcribed — scoped to rb3-3 render per epic context ("render the SCAPE silhouettes via the SEGSTR-decoded 2-D lists"). rb3-3 will need them, AND must handle the flag-4 collision: `decodeOp` still collapses a SEGSTR byte (`point*6+4`) to `{draw:false}` (identical to BLANKV — the rb2-2 latent finding). A raw-byte walk of SMAP must special-case flag 4. Affects `red-baron/src/core/topology.ts` (`decodeOp`) + rb3-3. *Found by Dev during implementation.*
- **Improvement** (non-blocking): The new ROM consts use `readonly` typing but not `Object.freeze()` — consistent with the rest of `topology.ts`, though sibling `flight.ts` freezes its ROM tables. If runtime immutability is wanted for this canonical multi-consumer data, a module-wide freeze pass would close it (carryforward of a rb2-2 reviewer note). Affects `red-baron/src/core/topology.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Conflict** (non-blocking): CONFIRMED Dev's `flight.ts` radix finding and raise its priority for rb3-2/rb3-3. `topology.ts` now reads the RBARON.MAC equate block as hex (correct) while `flight.ts:52` reads the SAME block's `PLYMAX=180*4` as decimal (720 vs the ROM's 0x180*4=1536) — the codebase is now internally inconsistent about that block's radix. Since rb3-2 forces ground-mode altitude and rb3-3 renders mountains against `HORIZN`, resolve the `flight.ts` altitude clamp before those stories rely on it. Affects `red-baron/src/core/flight.ts:50-53` (re-verify ALT_MIN/ALT_MAX against `.RADIX 16`). *Found by Reviewer during code review.*
- **Gap** (non-blocking): CONFIRMED — rb3-3 must transcribe the `PFOPOS` + `SMAP*`/`SMP*` SEGSTR connect-tables (037007.XXX:83+) to render the silhouettes, AND fix `decodeOp` so a flag-4 (SEGSTR) byte is not collapsed to `{draw:false}` (identical to BLANKV). No data in this diff carries a flag-4 byte, so it is correctly latent here; it becomes live the moment rb3-3 walks an `SMAP` stream. Affects `red-baron/src/core/topology.ts` (`decodeOp`) + rb3-3. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Represented SCAPE points as 2-D `Point2` `[x, y]`, dropping the third `PFPNTS` argument.**
  - Spec source: context-story-rb3-1.md (title/description) + epic-rb3.yaml rb3-1
  - Spec text: description says "each a PFPNTS x,height,intensity 2-D list (Z discarded, X/2, Y*2)"
  - Implementation: introduced `Point2 = readonly [x, y]`; SCAPE0..3 store the logical (x, y) only. The `PFPNTS` macro (`.BYTE .X/2,.Y*2`) emits exactly two bytes and DISCARDS the third argument, so the "height,intensity" third column is not ROM data.
  - Rationale: the title itself says "PFPNTS 2-D format ... Z discarded"; storing a discarded value would be non-ROM data. Matches rb2-2's principle of keeping the logical coordinate the macro arguments name.
  - Severity: minor
  - Forward impact: none — rb3-3 render works from (x, y); the discarded column carried no information.
- **Also transcribed the ROM's own index tables (`SSEGS` → `SCAPES`, `.SSEG` → `SCAPE_SEG_BYTES`) beyond the literally-named `SCAPE0..3`.**
  - Spec source: epic-rb3.yaml rb3-1 title ("mountain silhouettes SCAPE0..3")
  - Spec text: names "SCAPE0..3"; does not name SSEGS / .SSEG
  - Implementation: added `SCAPES` (the SSEGS pointer table) and `SCAPE_SEG_BYTES = [40,30,34,28]` (the .SSEG last-point-offset table, RBGRND.MAC:799-802), each a small ROM-native table sitting in the same "DISPLAY DB'S" block.
  - Rationale: mirrors rb2-2's accepted inclusion of the ROM's pointer tables (PLPCDE/PROPS) so the transcription is a complete, self-contained data unit; rb3-3's mountain-scroll loop needs both. Additive only.
  - Severity: minor
  - Forward impact: minor — rb3-3 gets the complete SCAPE structure; no sibling assumption broken.
- **Transcribed HORZ/HORIZN/PFPLOW as HEX values (0x1000 / 0x40 / 0x80·4), resolving the story's ambiguous notation.**
  - Spec source: epic-rb3.yaml rb3-1 title
  - Spec text: "HORZ=1000, HORIZN=$40, PFPLOW=80*4"
  - Implementation: `HORZ = 0x1000` (4096), `HORIZN = 0x40` (64), `PFPLOW = 0x80 * 4` (512). The source equate block (RBARON.MAC:445-455) is under `.RADIX 16`; only `HORIZN` carried an explicit `$`, but the whole block is hex (evidence: `.STAR0 = 1B`, and `P.MAXZ = 1001` = HORZ+1).
  - Rationale: faithful to the assembler's actual radix; a decimal read (HORZ=1000) would be wrong. See the related `flight.ts` Delivery Finding.
  - Severity: minor
  - Forward impact: minor — rb3-3 must use these as the hex values; flagged the sibling `flight.ts` decimal discrepancy separately.

### Reviewer (audit)
- **Dev's 2-D `Point2` representation (dropping the third `PFPNTS` arg)** → ✓ ACCEPTED by Reviewer: verified against source — the `PFPNTS` macro (037007.XXX:11) is literally `.BYTE .X/2,.Y*2`, emitting only two bytes; the third argument is discarded by the assembler and the DECODE engine takes brightness from the VV/BV opcode, not the point. Dropping it is faithful, not lossy.
- **Dev's inclusion of `SCAPES` (SSEGS) + `SCAPE_SEG_BYTES` (.SSEG) beyond the named `SCAPE0..3`** → ✓ ACCEPTED by Reviewer: sound and in-scope. These are the ROM's own index tables sitting in the same "DISPLAY DB'S" block (RBGRND.MAC:799-802); reproducing them mirrors rb2-2's accepted inclusion of `PLPCDE`/`PROPS`, and rb3-3's scroll loop needs both. `.SSEG` values re-derived and matched ((count−1)×2). Additive, breaks nothing.
- **Dev's hex-radix constants (HORZ=0x1000, HORIZN=0x40, PFPLOW=0x80·4)** → ✓ ACCEPTED by Reviewer: independently confirmed the equate block is `.RADIX 16` (RBARON.MAC:74 governs through :6209; `.STAR0=1B`; `P.MAXZ=1001`=HORZ+1). The decimal reading the story's ambiguous notation could suggest would be wrong; Dev's hex transcription is the ROM-faithful one. The sibling `flight.ts` decimal discrepancy Dev raised is a real, separate, non-blocking finding.
- No UNDOCUMENTED deviations found: the diff matches the ROM source and the three logged deviations exactly. BULLT0/BULLT1/BULLDE/VCTRMP also sit in the RBGRND DISPLAY DB'S block but are correctly excluded (bullet/vector data, not named by the story).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `red-baron/src/core/topology.ts` — added the GROUND / LANDSCAPE section (rb3-1), transcribed from the canonical `RBGRND.MAC` (byte-identical to `R2GRND.MAC` across the block): `Point2` type; `SCAPE0..3` mountain silhouettes (21/16/18/15 points, 2-D `PFPNTS` with the third arg discarded, `.RADIX 10` decimal); `SCAPES` (SSEGS pointer table) + `SCAPE_SEG_BYTES` (.SSEG last-point offsets); `PFOCOL` (24 `PFCOL` corners = 12 min/max collision boxes, ×8-packed); horizon/altitude constants `HORZ=0x1000`, `HORIZN=0x40`, `PFPLOW=0x80*4` (RBARON.MAC `.RADIX 16` hex). Also updated the file header + `OP_SEGMENT`/SEGSTR comments (the SCAPE lists are no longer "out of scope").
- `red-baron/tests/core/topology.test.ts` — added 22 ground-data tests: exact point counts, FULL literal `toEqual` pins of every SCAPE silhouette and every PFCOL corner, the SSEGS/.SSEG table invariants, the PFOCOL (min ≤ max) box-pairing invariant, the OP_SEGMENT/SEGSTR opcode relationship, and the hex-radix constant values.

**How the ROM was read:** SCAPE0..3 + PFOCOL live in `RBGRND.MAC`'s "DISPLAY DB'S" section under `.RADIX 10` (decimal), lines 725-847 (quarry in a sibling checkout's `reference/`, never committed). `PFPNTS .X,.Y,.Z → .BYTE .X/2,.Y*2` (037007.XXX:11) emits 2 bytes and drops the 3rd arg → 2-D points. `PFCOL .X,.Y → .WORD .X*8,.Y*8` → collision corners; `GRDISP` (R2BRON.MAC:3880-3902) pairs consecutive entries as (min, max) boxes. Constants are program-ROM equates (RBARON.MAC:445-455) under `.RADIX 16` (hex), confirmed by `.STAR0=1B` and `P.MAXZ=1001`=HORZ+1. The SEGSTR connect-tables (SMAP/PFOPOS, 037007.XXX) that stitch the SCAPE points were left to rb3-3 render per epic scope.

**Tests:** 335/335 passing (GREEN), 40 in topology.test.ts (22 new). `tsc --noEmit` + `vite build` clean.

**Branch:** `feat/rb3-1-ground-topology-transcription` (red-baron, off origin/develop).

**Deviations:** three minor (2-D Point2 representation; added SSEGS/.SSEG index tables; hex-radix constants) — all logged under Design Deviations. **Delivery Findings:** one Conflict (flight.ts ALT_MAX radix discrepancy), one Gap (SMAP/PFOPOS SEGSTR tables + decodeOp flag-4 collision → rb3-3), one Improvement (Object.freeze).

**Handoff:** To review (The Thought Police / Reviewer).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 | N/A — tests 335/335 GREEN, tsc+build clean, 0 code smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — assessed by reviewer (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — assessed by reviewer (see [SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — assessed by reviewer (see [TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — assessed by reviewer (see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — assessed by reviewer (see [TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — assessed by reviewer (see [SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — assessed by reviewer (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — assessed by reviewer (see [RULE]) |

**All received:** Yes (1 enabled returned clean; 8 disabled per `workflow.reviewer_subagents`, each assessed by reviewer)
**Total findings:** 0 confirmed blocking, 3 confirmed non-blocking (carried from Dev + hardening), 0 dismissed

## Reviewer Assessment

**Verdict:** APPROVED

Approval rests on the **independently-verified byte-for-byte correctness of the transcription**, not on the (strong) test suite. I did not trust the value-pinned tests — a coordinate mis-transcribed identically into both `topology.ts` and its test would pass — so I mechanically re-parsed the ROM source `RBGRND.MAC` (in the sibling `a-2` quarry) and diffed every table against the module (`scratchpad/verify_rb3.py` → **"ALL MATCH ✓"**):
- **SCAPE0..3** — 21/16/18/15 points, every logical `(x, y)` matches the ROM `PFPNTS` args (3rd arg correctly dropped; the macro `.BYTE .X/2,.Y*2` emits only 2 bytes — verified in 037007.XXX).
- **PFOCOL** — all 24 `PFCOL` corners match; the 12 (min,max) box pairs all satisfy min ≤ max on the raw ROM data.
- **SCAPE_SEG_BYTES** (.SSEG) = [40,30,34,28] = (count−1)×2, matches the ROM's computed table.
- **HORZ/HORIZN/PFPLOW** = 0x1000/0x40/0x80·4 — the equate block is `.RADIX 16` (hex), proven three ways: `.RADIX 16` at RBARON.MAC:74 with the next `.RADIX 10` not until :6209; the sibling `.STAR0=1B` (a `B` hex digit) inside the block; and `P.MAXZ=1001`=HORZ+1 semantically. A decimal read (HORZ=1000) would be wrong; Dev got it right.

**Data flow traced:** ROM literals (`RBGRND.MAC` `.RADIX 10` SCAPE/PFOCOL bytes + `RBARON.MAC` `.RADIX 16` constants) → `topology.ts` typed `readonly` consts → consumed later by rb3-3 (landscape render) / rb3-4 (ground targets). No runtime input, no I/O, no DOM — pure deterministic compile-time data. Max coordinate magnitude 128, far inside safe-integer range.

**Pattern observed:** Faithful rb2-2-style transcription — `Point2` mirrors `Point3`, per-table ROM line-number citations, and the ROM's own index tables reproduced (`SSEGS`→`SCAPES`, `.SSEG`→`SCAPE_SEG_BYTES`) just as rb2-2 reproduced `PLPCDE`/`PROPS`. `src/core/topology.ts:283-396`.

**Error handling:** N/A — pure static-data module, no failure modes, no catches, nothing to swallow.

### Observations (7)

1. [VERIFIED] Transcription fidelity — INDEPENDENTLY AUDITED. All four SCAPE silhouettes (70 points), 24 PFOCOL corners, the .SSEG table, and the three constants re-derived from `RBGRND.MAC`/`RBARON.MAC` and matched exactly. Evidence: `scratchpad/verify_rb3.py` → "ALL MATCH ✓". This is the story's core deliverable and it is correct.
2. [VERIFIED] Purity — `topology.ts:283-396` is static data + one type alias; no DOM/time/randomness. Complies with the src/core PURE-deterministic convention (CLAUDE.md: "src/core holds the deterministic sim").
3. [VERIFIED] Compile-time immutability — `Point2` tuple + every new const (`SCAPE0..3`, `SCAPES`, `SCAPE_SEG_BYTES`, `PFOCOL`) is `readonly`; the constants are primitive `const`. Consistent with the whole `topology.ts` module (lang-review #2). Evidence: `topology.ts:298,301,...,388-396`.
4. [TEST] Assessed by reviewer (test_analyzer disabled): the new suite value-pins EVERY transcribed coordinate with full-literal `toEqual` (not the ~4% spot-check rb2-2 was faulted for), plus real invariants — point counts, the (min ≤ max) box-pairing, SSEGS/.SSEG relationships, and the OP_SEGMENT arithmetic. Imports `src/`, not `dist/`; no `as any`; assertions are non-vacuous (I confirmed every SCAPE actually contains a `128` so the `.some()` test can fail). Strong coverage. No finding.
5. [DOC] Assessed by reviewer (comment_analyzer disabled): all comments verified against source — "byte-identical to R2GRND.MAC across the block" (I diffed it), `GRDISP` line range 3880-3902 (read it), the PFPNTS/PFCOL macro citations (037007.XXX:11/14), and `P.MAXZ=HORZ+1`. No overclaiming (unlike the rb2-2 comment finding). The stale "SCAPE lists out of scope" header/`OP_SEGMENT` comments were correctly updated. No finding.
6. [TYPE] Assessed by reviewer (type_design disabled): `Point2 = readonly [x,y]` is a sound planar tuple; sharing it for both `PFPNTS` (x/2,y*2) and `PFCOL` (x*8,y*8) corners is structural-only and each usage's packing is documented — no stringly-typed API, no unsafe cast. `export type` used correctly; `type Point2` import in the test. No finding.
7. [SIMPLE]/[SEC]/[EDGE]/[SILENT]/[RULE] Assessed by reviewer (all disabled): [SIMPLE] no over-engineering — flat literal tables, the added index tables mirror real ROM tables. [SEC] no attack surface — pure literals, no eval/dynamic-import/JSON.parse/user input. [EDGE] the only boundary (the flag-4/SEGSTR decode collision) carries no data here and is deferred to rb3-3 (finding below). [SILENT] no error handling to swallow. [RULE] all 13 lang-review TS checks pass (see Rule Compliance). No blocking findings.

### Rule Compliance (TypeScript lang-review checklist, 13 checks)

Exhaustively checked against every new type/const; all applicable rules PASS:
- #1 Type-safety escapes: 0 `as any`/`as unknown as`/`@ts-ignore`/non-null `!`. Test uses a plain annotation `const min: Point2 = PFOCOL[i]` (no cast). PASS.
- #2 Generic/interface + `readonly`: no `Record<string,any>`/`object`/`Function`; `Point2` and all 6 new consts are `readonly`. PASS.
- #3 Enum anti-patterns: no enums; `OP_SEGMENT`/`HORZ`/`HORIZN`/`PFPLOW` are plain consts. PASS.
- #4 Null/undefined: no `||`/`??`/`Map.get`/unguarded destructuring on nullable; tuple destructuring `([x]) =>` is always defined. PASS.
- #5 Module/declaration: `export type Point2` marks the type-only export; `type Point2` import in the test; no `.js` extension matches the repo's `moduleResolution: bundler` (sibling modules omit it — rb2-2 confirmed). PASS.
- #6 React/JSX: N/A (no .tsx). #7 Async: none — synchronous. PASS.
- #8 Test quality: full-literal pins, `src/` imports, no `as any`, non-vacuous. PASS.
- #9 Build/config: `strict` intact; `tsc --noEmit` exit 0 (build passed → no `noUncheckedIndexedAccess` violation on `PFOCOL[i]`). PASS.
- #10 Input validation: N/A — compile-time literals, no user input. #11 Error handling: no catches. #12 Perf/bundle: small flat literals, no barrel over-import/dynamic import. #13 Fix-regressions: N/A (no fixes). PASS.

### Devil's Advocate

Let me argue this data is broken. **First attack — a silent coordinate error.** A single mistyped y in the 70-point SCAPE set or a swapped PFOCOL corner would corrupt a mountain or a collision box, and full-literal `toEqual` tests would NOT catch it if Dev typed the same wrong value into both the module and the test (the classic transcription trap). **Rebuttal:** I did not trust the tests. I mechanically re-parsed `RBGRND.MAC` and diffed all 70 SCAPE points, 24 PFOCOL corners, and the .SSEG table straight from the ROM — zero discrepancies. This attack is closed by independent evidence, not assertion. **Second attack — the radix is wrong.** If the constants block were decimal, HORZ=1000/HORIZN=64.../PFPLOW=320 would all be off, silently breaking horizon depth and altitude clamps downstream. **Rebuttal:** the block is provably hex (`.RADIX 16` governs 74→6209; `.STAR0=1B`; `P.MAXZ=1001`=HORZ+1). Dev's hex read is right — and Dev even surfaced that sibling `flight.ts` reads the SAME block as decimal (ALT_MAX=720 vs 1536), a real latent inconsistency, as a non-blocking Delivery Finding. **Third attack — the dropped third PFPNTS column loses data.** If that column were intensity the mountains would render flat. **Rebuttal:** the macro `.BYTE .X/2,.Y*2` emits only two bytes; the third arg is discarded by the assembler, and the DECODE engine takes brightness from the VV/BV opcode, not the point — so the column is genuinely dead. **Fourth attack — `readonly` is a lie; a JS consumer can mutate these shared singletons and corrupt geometry for every other consumer.** **Concession:** true — `readonly` is compile-time only; `Object.freeze` (as `flight.ts` uses) would harden it. Non-blocking, consistent with the rest of `topology.ts`, and Dev logged it as an Improvement finding. None of these four attacks reveals a defect in the delivered data — the thing that flows to rb3-3/rb3-4 is correct.

**Handoff:** To SM for finish-story.