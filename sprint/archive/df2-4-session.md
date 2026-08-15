---
story_id: df2-4
jira_key: df2-4
epic: df2
workflow: tdd
---
# Story df2-4: Object image tables (DEFB6 + SAMEXAP7) transcription — INERT

## Story Details
- **ID:** df2-4
- **Jira Key:** df2-4
- **Workflow:** tdd
- **Points:** 4
- **Priority:** p2
- **Stack Parent:** none

## Story Summary

DEFB6 inline object graphics (the OBI object-image headers, e.g. UFO at defender/DEFB6.SRC:1) and SAMEXAP7 "SAM EXPLOSIONS AND APPEARANCES" (defender/SAMEXAP7.SRC:6-7). GENERATED module + independent gate; each block records an encoding discriminant (refuse to raster a non-raster). Data lands INERT, proven only by a static gallery blit — no animation, no collision (df4).

## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Branch:** feat/df2-4-object-image-tables
**Phase:** finish
**Phase Started:** 2026-08-15T12:51:27Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-15T11:52:22Z | 2026-08-15T11:56:37Z | 4m 15s |
| red | 2026-08-15T11:56:37Z | 2026-08-15T12:27:50Z | 31m 13s |
| green | 2026-08-15T12:27:50Z | 2026-08-15T12:32:26Z | 4m 36s |
| review | 2026-08-15T12:32:26Z | 2026-08-15T12:51:27Z | 19m 1s |
| finish | 2026-08-15T12:51:27Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Question / non-blocking] SAMEXAP7 is CODE, not an image table.** Source reading (defender/SAMEXAP7.SRC) shows it is the explosion/appear BLITTER ENGINE (APST/EXST/EXPU vector routines, ending in a `STARTS FDB` jump table + `END`) — it holds NO pixel data. The explosion PIXELS (SCHITZO/ASTRO/SWARM) live in DEFB6. So the story/AC1 framing "SAMEXAP7 (explosions/appearances) blocks ... transcription" as if SAMEXAP7 yields an image table is inaccurate at source. Resolution (user-ruled at RED): SAMEXAP7 becomes the **non-raster control** the encoding discriminant refuses — which satisfies the story's OWN "refuse to raster a non-raster" requirement. Recorded so Reviewer does not read the SAMEXAP7 record's empty `bytes` as a transcription gap.
- **[Gap / non-blocking] AC4's "claims/*.json per src/core constant" overstates the actual gate.** There is no `plugins/defender/tests/audit/claims/` directory and df2-3 (charset, a large generated table) added none. `citations.test.ts` gates DOSSIER PROSE citations (its `DOSSIER_FILES` is empty), not per-constant JSON. The real fidelity gate for a transcription here is the INDEPENDENT byte re-derivation (objects-gate.test.ts). RED therefore pins AC4 as **provenance `{file,label,line}` on every record** + **no audit-suite regression** (the audit files stay green). Dev should NOT invent a claims-per-constant file.
- **[Improvement / non-blocking] DEFB6 image data is MIXED FCB/FDB.** Most cells are FDB words (UFOD10), but the smart bomb SBD10 (defender/DEFB6.SRC:2183) is FCB raw bytes. The extended reader (`readImageBytes`) handles both; Dev's transcribe tool must too, or SBPIC transcribes as 0 bytes and fails the W×H gate.

### Reviewer (code review)
- **Improvement** (non-blocking): only field-0 of each two-field picture is transcribed. Affects `plugins/defender/src/core/objects-data.ts` (df2-6/df4 will need field-1 + the ON/OFF routine identity for a faithful two-field Williams render). Confirms Dev's own finding; out of df2-4 INERT scope.
- **Improvement** (non-blocking): the duplicate local `ObjectImage`/`ObjectsModule` test shims (typing `encoding: string`) are shared, by pattern, with the charset tests. Affects `plugins/defender/tests/objects-*.test.ts` and `charset-*.test.ts` (a fleet-wide "extract the independent-contract shim" cleanup could dedupe both, if ever deemed worth it). Accepted as-is here — consistent with approved precedent. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

- **Scope set to the FULL DEFB6 picture roster (31 objects) + SAMEXAP7 as the non-raster control.** The context left the object roster unspecified; source reading found DEFB6 holds 31 picture descriptors (all with field0 == W×H) and SAMEXAP7 is code. User ruled (RED, AskUserQuestion) for the full roster. The RED gate asserts set-equality between the reader's `pictureTable` and the module's raster records, so "full roster" is mechanically enforced, not a count I hardcoded.
- **Object images carry their OWN palette colours; blitObject takes NO caller colorIndex.** The charset (df2-3) is a 1-bit mask coloured by the caller; object cells hold real per-pixel palette indices (UFO nibbles 3,4,7,…). So `blitObject(fb, obj, x, y)` writes each non-zero nibble AS its own index. This diverges from `blitGlyph`'s 5-arg signature by design — do not "align" them.
- **RED is packing-agnostic (nibble order / screen rotation), per the df2-3 precedent.** Byte-fidelity is pinned in objects-gate; the blit test pins only certainties (draws-some, own-nibbles-only, in-band, clipped, distinct). The exact orientation is df2-6's visual-playtest call — do not pin a nibble order here.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- No deviations from spec. Implemented exactly to TEA's failing tests: the transcribe tool enumerates the picture table and emits 31 rasters (field-0 W×H cells, mixed FCB/FDB) + one SAMEXAP7 `'stream'` block; `blitObject` paints each nibble as its own palette index and refuses non-raster / short-cell / non-finite input. The design decisions (SAMEXAP7 as the non-raster control, full 31-object roster, own-colour blit, packing-agnostic proofs) were TEA-phase rulings already logged above; GREEN adds no new abstraction beyond what a test requires.

### Reviewer (audit)
- **Full DEFB6 roster (31) + SAMEXAP7 as non-raster control** → ✓ ACCEPTED: source-verified (31 descriptors, all field0==W×H; SAMEXAP7 is code); the user's RED ruling; the gate enforces set-equality so the scope is mechanically pinned.
- **Object images carry own colours; blitObject takes no colorIndex** → ✓ ACCEPTED: validated against the data — object nibbles are multi-valued (3,4,7,C…), so a caller-colour 1-bit mask (charset's model) would be WRONG here. The divergence from `blitGlyph` is correct.
- **RED is packing-agnostic (nibble order / rotation)** → ✓ ACCEPTED: byte-fidelity is pinned by the gate; orientation/colour is explicitly df2-6's visual-playtest scope. Honest, consistent deferral (rule #17 — a disclosed deferral, not a false certainty).
- **Dev: "No deviations from spec"** → ✓ ACCEPTED: implementation matches TEA's tests; no scope creep observed in the diff.
- No UNDOCUMENTED deviations found. The one reviewer-applied change (hardening the OOB-clip test, two nits, one doc citation) fixes confirmed findings, not a spec divergence.

## SM Assessment

**Grand Admiral Thrawn — setup complete, routing to TEA (Han Solo) for RED.**

df2-4 (4pt, p2, tdd, phased) is the direct successor to df2-3 (charset, completed 2026-08-15) and follows the same GENERATED-module + independent-reader-gate transcription pattern for the DEFB6/SAMEXAP7 object-image tables. Data lands INERT — proven only by a static gallery blit, no animation/collision (those are df4).

**Contention — clear.** Sibling probes run before setup: no remote branch matched `df2-4` (`git branch -r`), the only live session anywhere was a-1's unrelated `ml7-12`. Story was genuinely unclaimed. Claim is now pushed: `feat/df2-4-object-image-tables` on origin + `in_progress` stamp committed, so the branch probe now lights up for any sibling.

**Falsifiable claims verified before setup (so no stale fact is carried forward):**
- ROM citations resolve. `DEFB6.SRC` and `SAMEXAP7.SRC` exist at `reference/original-source/defender/`; the `defender/<FILE>.SRC:<line>` form is shorthand for that dir. `SAMEXAP7.SRC:6-7` is the "SAM EXPLOSIONS AND APPEARANCES" banner; `DEFB6.SRC:1` is a comment, "UFO PROCESS START" at :2.
- STALE POINTER flagged for TEA: the epic prose names `scripts/transcribe-pictures.mjs` as "reuse-first" — that file DOES NOT EXIST. The real df2-3 pattern (`scripts/transcribe-charset.mjs` + `charset-data.ts` + `charset.ts` + `charset-gate.test.ts` + `charset-blit.test.ts`) is now pinned by name in the context's Technical Approach.

**Setup hygiene:** `sm-setup` omitted `**Repos:**` and `**Branch:**` from the tracking block — both added by hand (arcade / feat/df2-4-object-image-tables). Reverted a spurious `epic-jt11.yaml` reserialization (identical `started:` line reordered) so the claim commit stayed surgical. ACs derived (6) — verified sound; no verbatim-AC edit hazard here since the epic YAML carried none.

**Key trap embedded for TEA (6× in context):** encoding discriminant per block — record an `encoding` field, refuse to raster a non-raster (the joust COMCL5/ASH lesson). Citation gate (df1-1) re-opens: no new src/core constant without a `claims/*.json` entry. Keep `purity.test.ts` green.

Handing off to TEA for the failing-test-first RED phase. Han — the gate and blit proofs are the RED; model both on the df2-3 charset equivalents named in the context.
## TEA Assessment

**Han Solo (TEA) — RED complete, handing off to Yoda (Dev) for GREEN.**

**What GREEN must ship** (three files, mirroring the df2-3 charset pattern):
1. `scripts/transcribe-objects.mjs` — Dev's OWN reading of DEFB6.SRC (must NOT import the test-side reader `tests/helpers/defender-source.ts`; the independence rule scans for it). Model on `scripts/transcribe-charset.mjs`. Must handle BOTH FDB (big-endian words) and FCB (raw bytes) image rows.
2. `plugins/defender/src/core/objects-data.ts` — GENERATED `OBJECTS` list: one `raster` record per DEFB6 picture (31 of them; `name`=picture label, `width`/`height` from `FCB W,H`, `bytes`=field-0 cell = W×H bytes from the first data pointer, `source={file,label,line}`), PLUS one non-raster record for SAMEXAP7 (`encoding:'stream'`, `bytes:[]`, `source.file:'SAMEXAP7.SRC'`).
3. `plugins/defender/src/core/objects.ts` — re-exports `OBJECTS` + pure `blitObject(fb, obj, x, y)`: paints each non-zero nibble AS its own palette index; refuses non-raster (throw); requires `bytes.length===width*height` (throw); refuses non-finite position (throw); clips to fb. Held to src/core purity.

**RED state (verified — full defender project + testing-runner + tsc):**
- 261 tests, 20 RED / 241 pre-existing GREEN. 2 new files red; 12 pre-existing files green (no regression).
- The 8 "independent reader — real DEFB6 picture facts" tests PASS on arrival (non-vacuous: they read the vendored ROM directly; fixtures verified this session — UFOD10=24B, SBD10 FCB=9B, LASD10=8×`0xFF`, picture count=31, every field0==W×H).
- `tsc --noEmit` clean.

**Ground truth handed to Dev** (so GREEN needs no re-derivation): 31 pictures, all field0==W×H. Mixed FCB/FDB (see Delivery Findings). Two edge objects — `NULOB` 1×1 (NULD10 = `FCB 0` → single index-0 cell) and `SBPIC` 3×3 (FCB) — both resolve cleanly under the reader. SAMEXAP7 = the non-raster control.

**Rule Coverage (.pennyfarthing/gates/lang-review/typescript.md):**
- **§3 discriminant / exhaustiveness** — the `encoding` union is `'raster' | 'stream'` (a string union, not a runtime enum, per §3's "string enums where a union suffices"). Gate test *"only 'raster' and 'stream' encodings appear"* enforces the closed set at the data level.
- **§4 null/undefined** — `!` non-null assertions (`sam!`, `ufo!`) appear only AFTER an explicit `toBeDefined()`/find-guard; no unchecked `Map.get`/optional-chain results.
- **§5 module** — every relative import carries the `.js` extension (`./helpers/defender-source.js`, `../src/core/framebuffer.js`) for Node16 ESM resolution.
- **§8 test quality** — no `as any` in assertions; the single `as unknown as ObjectsModule` is confined to the sanctioned dynamic-import loader (identical to charset's, so a not-yet-built module reads as "not built yet", not a collect crash). The independence rule is a POSITIVE read-set floor (asserts the transcribe tool is actually scanned). Reader own-teeth give the byte gate an independent oracle rather than resting on the module it checks. Self-checked every test for vacuity: the "own-nibbles" blit test is paired with a "draws-some" guard so it cannot pass vacuously in GREEN.

**Watch-outs for Dev:**
- Don't align `blitObject` to `blitGlyph`'s signature — objects carry their own colour (Design Deviations).
- Don't invent a `claims/*.json` for AC4 (Delivery Findings) — provenance on each record is the anchor.
- Regenerate `src/host/registry.ts`? No — df2-4 adds no game; no registry change.
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `scripts/transcribe-objects.mjs` — independent RASM reader (fresh parse/evalNum, mixed FCB+FDB `imageBytes`, `pictureTable` enumeration); emits the generated data module. Does NOT import the test-side reader (independence rule green).
- `plugins/defender/src/core/objects-data.ts` — GENERATED: 31 DEFB6 picture rasters (field-0 W×H cell each) + 1 SAMEXAP7 `'stream'` non-raster block. Regenerate with `node scripts/transcribe-objects.mjs`.
- `plugins/defender/src/core/objects.ts` — re-exports `OBJECTS` + pure `blitObject(fb, obj, x, y)` (paints each nibble as its own index; refuses non-raster / short-cell / non-finite; clips).

**Tests:** 263/263 defender project passing (GREEN) — was 20 red. `tsc --noEmit` clean. Purity holds on both new core files. Verified twice (direct run + testing-runner, RUN_ID df2-4-dev-green).

**Branch:** feat/df2-4-object-image-tables (pushed, c8c30a89)

**Handoff:** To review.

### Dev (implementation) — Delivery Findings
- **Gap** (non-blocking): only field-0 of each two-field picture is transcribed (the interlace pair D10/D11 and the ON/OFF blit-routine pointers are not carried). Affects `plugins/defender/src/core/objects-data.ts` — a faithful two-field Williams render (df2-6 orientation / df4 animation) will need field-1 and the ON/OFF routine identity added to the record. INERT static gallery (this story) needs only field-0, so this is out of df2-4 scope by design.
- **Improvement** (non-blocking): UFOP1/2/3, ASTP1-4, TIEP1-4, LNDP1-3, BMBP1/2 are animation-frame sets sharing a geometry. Affects `plugins/defender/src/core/objects-data.ts` — df4 (animation) will group these by object; df2-4 keeps them as flat independent records (no grouping abstraction, per minimalist discipline).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 263 green, tsc clean, regeneration deterministic, no smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings; edge/boundary paths assessed by reviewer (blitObject OOB/NaN/short-cell) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings; assessed by reviewer + rule-checker #11 — every throw is loud, nothing swallowed |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings; test quality assessed by reviewer + rule-checker (which found the vacuous OOB guard) |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1 (fixed) — UFO citation `:1`→`:1954` in context doc |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings; types assessed by reviewer + rule-checker #1/#2/#3 — readonly fields, string-union discriminant, no `as any` |
| 7 | reviewer-security | Yes | clean | none | N/A — no OOB write reachable, no injection/ReDoS, degenerate inputs fail safe |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings; no over-engineering — minimal blit + generated data, no dead code |
| 9 | reviewer-rule-checker | Yes | findings | 4 | confirmed 3 (all fixed), accepted 1 with rationale |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled as Skipped/disabled)
**Total findings:** 4 confirmed (all fixed this round), 1 accepted-with-rationale, 0 deferred

### Rule Compliance

reviewer-rule-checker ran all 30 TS lang-review checks + 4 project rules (34 checks / 71 instances). Result after fixes: **all pass**. Highlights mapped to the checklist:
- **#1 type-safety** — `as unknown as ObjectsModule` is the sanctioned dynamic-import loader (charset precedent); non-null `!` on `ufo!`/`sam!` guarded by `toBeDefined()`; **`las!` now guarded too (fix)**.
- **#3 enum** — `ObjectEncoding = 'raster' | 'stream'` string union, not an enum; blitObject guards with an `if…throw`. ✓
- **#5 module** — `import type` for `Framebuffer`; `.js` on every relative import; `export type` for the re-export. ✓
- **#11 error handling** — every `throw new Error` is specific; **both loaders now narrow `catch` with `instanceof Error` (fix)**.
- **#15/#18/#25/#26/#28 test-apparatus traps** — the byte gate re-derives from an INDEPENDENT reader (not the module); completeness is a two-way set-equality; the independence scan uses a real recursive walk + a POSITIVE read-set floor; **the one vacuous guard (#15/#18/#26 — the OOB-clip test) is now mutation-proven (fix)**.
- **#21 degenerate input** — `Number.isFinite(x,y)` boundary guard; 0 passes, NaN/∞ throw. ✓
- **#31 purity / #32 colours-never-invented / #33 ROM-citation form / #34 reader independence** — all clean (grep-verified: no browser globals, no colour hex, no `.ts:line` citations, transcribe tool imports no test helper).

### Rule-by-rule observations (≥5; severity or VERIFIED with evidence + source tags)

1. **[VERIFIED][RULE][DOC] Byte fidelity is exact.** Hand-verified against raw ROM: `UFOD10` (DEFB6.SRC:2122) big-endian → `[0,3,52,3,51,112,64,51,…]` matches `objects-data.ts` UFOP1; smart bomb `SBD10` (DEFB6.SRC:2183, FCB) → `[144,9,144,153,153,153,144,204,144]` matches SBPIC byte-for-byte. Not a systematic misread.
2. **[VERIFIED] Nibble-as-palette-index decode is faithful, not a 1-bit mask.** Object nibbles span 0,3,4,5,7,8,C — genuinely multi-colour (unlike the charset's 0/1 mask), so `blitObject` correctly paints each nibble as its own index (objects.ts:56–63). Colours never invented (rule #32) — the only `0x0f` is a nibble mask.
3. **[VERIFIED][SEC][EDGE] blitObject fails safe on every degenerate input.** Non-raster→throw, `bytes.length !== w*h`→throw, non-finite position→throw, OOB→clipped. Security agent traced no reachable OOB write / infinite loop; the clip's anti-wraparound behaviour is now mutation-proven (objects.ts:44–64).
4. **[VERIFIED][TEST][RULE] The full-roster gate is not tautological.** `objects-gate.test.ts` re-derives bytes with the test-side reader (`tests/helpers/defender-source.ts`), independent of the module; the transcribe tool imports no test helper (independence rule green). Completeness is two-way set-equality between `pictureTable` (31) and the module's raster records.
5. **[MEDIUM → FIXED][TEST][RULE] OOB-clip test was vacuous.** Uint8Array swallows OOB indices and its length is fixed, so the original `.not.toThrow()`/length assertions could not fail for the wraparound they guarded (rule-checker mutation-probed it out-of-tree). Rewritten to assert no lit cell escapes the on-screen band + non-empty paint; **mutation-verified here** (disabling the clip reddens it), then restored.
6. **[LOW → FIXED][TYPE] `las!` non-null assertion** now preceded by `expect(las).toBeDefined()` (matches the `ufo!`/`sam!` idiom). **[LOW → FIXED][RULE] catch narrowing** — `e instanceof Error` in both loaders.
7. **[LOW → FIXED][DOC] context doc UFO citation** corrected: `DEFB6.SRC:1` (process code) → `:1954` (the `UFOP1` descriptor this story transcribes); SAMEXAP7-is-code clarified.
8. **[INFO / ACCEPTED][TYPE] Duplicate local test shims typing `encoding: string`** (not the real `ObjectEncoding`) in both test files — the rule-checker's #18 "one concept, two helpers" note. Accepted: this is the deliberate independent-contract shim (the charset precedent keeps it post-GREEN; the loose `string` lets the runtime "only raster/stream appear" check actually exercise values rather than trust the type; a static type import would couple the test to the module and defeat the not-built-yet loader). Logged as a non-blocking fleet-wide follow-up below.
9. **[VERIFIED][SIMPLE] Regeneration deterministic + purity holds.** `node scripts/transcribe-objects.mjs` leaves `objects-data.ts` byte-identical (preflight); purity.test.ts scans both new core files clean.

### Devil's Advocate

Argue this is broken. First attack: the byte gate is theatre — the test reader and the transcribe tool share a parsing strategy, so a systematic RASM misreading (e.g. mis-treating a two-operand FCB, or reading a big-endian word as little-endian) would be reproduced identically in both and the gate would stay green while every cell is wrong. This is a real, disclosed limitation (defender-source.ts says so). Mitigation applied: I hand-verified two cells (UFO FDB, smart-bomb FCB) against the raw ROM hex out-of-band — both exact — so the shared strategy is at least correct for the two encodings in play. Second attack: `blitObject` paints nibbles as palette indices, but what if Defender actually applies a per-object colour register and the nibbles are a shape index into it? Then every gallery colour is wrong. Rebuttal: the nibbles are demonstrably multi-valued (3,4,7,C…), inconsistent with a mask, and the story is explicitly INERT + packing-agnostic — df2-6's visual playtest owns final colour/orientation, and the byte gate proves the DATA regardless of interpretation, so a wrong decode changes only `blitObject`, not the transcription. Third attack: field-0-only means a two-field interlaced picture shows half its pixels — a broken-looking gallery. Rebuttal: Dev logged this as a known Gap; a static INERT proof needs only field-0, and df2-6/df4 own the second field. Fourth attack: `NULOB` (1×1, all-zero) is a "picture" that draws nothing — is the roster polluted? It is a faithful DEFB6 descriptor (the null object); harmless, and the completeness gate would fail if it were dropped. Fifth attack: a malformed `$hex` W/H would slip the transcribe tool's `<=0` filter as NaN and emit a 0-byte raster — but real DEFB6 has only bare-decimal dimensions, and the module-shape gate (`bytes.length === w*h`) would redden on any NaN geometry. Nothing here reaches a shippable defect; the one genuine test hole (OOB clip) is closed and mutation-proven.

## Reviewer Assessment

**Verdict:** APPROVED

**Obi-Wan Kenobi — df2-4 is faithful, safe, and now fully guarded.** Four enabled subagents ran (preflight, comment-analyzer, security, rule-checker); five disabled ones were assessed by the reviewer. Every finding is resolved this round — no Critical or High remains.

**Data flow traced:** vendored ROM text (`reference/original-source/defender/DEFB6.SRC`, `SAMEXAP7.SRC`) → `scripts/transcribe-objects.mjs` (independent RASM reader, mixed FCB/FDB) → generated `src/core/objects-data.ts` (31 rasters + 1 non-raster) → `blitObject` writes palette indices into an in-memory `Framebuffer`. Safe because: the byte gate re-derives every raster from source with a SEPARATE reader and refuses mismatch (hand-verified exact for the FDB and FCB cases); `blitObject` throws on non-raster/short-cell/non-finite input and clips OOB with no wraparound (mutation-proven); no user input, no network, no colour invented.

**Findings by source tag:**
- **[RULE]** rule-checker (34 checks): 3 confirmed & FIXED — vacuous OOB-clip test (now mutation-proven), `las!` guard, `catch` narrowing; 1 ACCEPTED with rationale (independent-contract shims).
- **[TEST]** (subagent disabled → reviewer + rule-checker): the OOB-clip guard was the one real hole — closed and mutation-verified. Gate/blit are otherwise non-tautological (independent reader, two-way set-equality, positive read-set floor).
- **[DOC]** comment-analyzer: 1 confirmed & FIXED — UFO citation `:1`→`:1954` in the context doc; all other ROM citations verified accurate.
- **[SEC]** security: clean — no reachable OOB write, no injection/ReDoS, degenerate inputs fail safe.
- **[TYPE]** (subagent disabled → reviewer + rule-checker): readonly fields, string-union discriminant, `import type`/`.js` correct — clean.
- **[EDGE]** (subagent disabled → reviewer): NaN/∞ position, short cell, off-both-edges blit — all handled and now tested.
- **[SILENT]** (subagent disabled → reviewer): no swallowed errors — every failure path throws a specific message.
- **[SIMPLE]** (subagent disabled → reviewer): minimal blit + generated data, no dead code or over-engineering; regeneration deterministic.

**Pattern observed:** faithful reuse of the df2-3 charset transcription pattern (independent-reader byte gate + generated data + pure blit), correctly adapted for the object-image format (picture-descriptor table, mixed FCB/FDB, own-colour nibbles). Good pattern at `plugins/defender/src/core/objects.ts:44` and `plugins/defender/tests/objects-gate.test.ts`.

**Error handling:** loud-fail throughout — `blitObject` (objects.ts:45,49,52), the transcribe tool, and the test reader all throw specific messages rather than fabricating data or mis-rendering.

**Verification:** 263/263 defender tests green, `tsc --noEmit` clean, regeneration deterministic, OOB fix mutation-verified (clip-disabled → red). Fixes committed `039af3a6`, pushed.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.
## Impact Summary

**Story:** df2-4 — Object image tables (DEFB6 + SAMEXAP7) transcription — INERT
**Verdict:** APPROVED (Reviewer, one round) | **Blocking: 0**
**Status:** 263/263 defender tests green · tsc clean · regeneration deterministic · orchestrator 498/498 on merged tree

All Delivery Findings resolved or intentionally deferred:
- **[RESOLVED] SAMEXAP7 is blitter CODE, not a pixel table** → the non-raster discriminant block (encoding 'stream', bytes []). Satisfies "refuse to raster a non-raster". No transcription gap.
- **[RESOLVED] AC4 "claims/*.json per constant" framing** → real gate is provenance {file,label,line} + independent byte re-derivation. No file-absence gap.
- **[RESOLVED] Mixed FCB/FDB image data** → reader + tool handle both; UFOD10 (FDB) and SBD10 (FCB) hand-verified byte-exact to ROM.
- **[RESOLVED — in review round] Vacuous OOB-clip test** → rewritten + mutation-verified (disabling the clip reddens it). Plus `las!` guard and catch-narrowing nits, and the context UFO citation (:1→:1954).
- **[DEFERRED — by design] Field-0 only** → INERT gallery needs only field-0; field-1 + ON/OFF routine identity are df2-6/df4.
- **[ACCEPTED — precedent] Duplicate test shims** → the independent-contract pattern shared with charset; fleet-wide dedup is an optional future cleanup.

No blocking issues. Ready to finish.
