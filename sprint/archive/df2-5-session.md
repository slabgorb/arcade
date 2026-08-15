---
story_id: "df2-5"
jira_key: "df2-5"
epic: "df2"
workflow: "tdd"
---
# Story df2-5: Terrain + mini-terrain (BLK71) transcription + static planet surface

## Story Details
- **ID:** df2-5
- **Jira Key:** df2-5
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-15T14:25:18Z
**Round-Trip Count:** 1
**Repos:** arcade
**Branch:** feat/df2-5-terrain-mini-terrain-static-planet

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-15T13:33:56Z | 2026-08-15T13:37:57Z | 4m 1s |
| red | 2026-08-15T13:37:57Z | 2026-08-15T13:52:40Z | 14m 43s |
| green | 2026-08-15T13:52:40Z | 2026-08-15T13:57:46Z | 5m 6s |
| review | 2026-08-15T13:57:46Z | 2026-08-15T14:10:14Z | 12m 28s |
| green | 2026-08-15T14:10:14Z | 2026-08-15T14:15:21Z | 5m 7s |
| review | 2026-08-15T14:15:21Z | 2026-08-15T14:25:18Z | 9m 57s |
| finish | 2026-08-15T14:25:18Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): BLK71's terrain-generation routines (BGINIT/BGOUT/BGALT/BGERAS + the left/right terrain functions) and `RFONR1`'s bidirectional bit-scanner are the df3 SCROLL seam. The `decodeAltitudes` decode shipped here is the static base+step subset; the full scroll generator (backward reads, TLEN wrap, flavor tables TERTF0/1) belongs to df3. Affects `plugins/defender/src/core/terrain.ts` (df3 extends the decode; do not delete the df2-5 invariant tests). *Found by TEA during test design.*
- **Gap** (non-blocking): MTERR (mini-terrain) is transcribed INERT — no render this story. Its consumer is the scanner/mini-map, which the epic scopes to df5. Affects a future df5 scanner render (`src/core/terrain.ts` + a scanner shell). *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings during implementation. (The transcribe/decode/blit pattern followed df2-3/df2-4 cleanly; the forward-decode choice is logged as a deviation above.)

### Reviewer (code review)
- **Conflict** (blocking): ROM line citations in `terrain.ts` (mirrored in the two test files) do not match the vendored source, and RFONR1/LFONR1 are swapped. Affects `plugins/defender/src/core/terrain.ts` + `tests/terrain-blit.test.ts` + `tests/terrain-gate.test.ts` (correct each cite to tool-verified lines: $E0→:380, DEC ROFF→:387, INC ROFF→:389, TLEN→:18, TDATA FCB→:509, RFONR1→:435 forward / LFONR1→:481-506 backward). *Found by Reviewer during code review.*
- **Gap** (non-blocking): `blitTerrain` silently clips a finite non-integer altitude, contradicting its "fails LOUD" docstring. Affects `plugins/defender/src/core/terrain.ts` (throw on non-integer row + add a test). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Pinned BGALT's base+step invariants, not the exact terrain silhouette**
  - Spec source: context-story-df2-5.md (Background — BGALT decode); story title ("render a STATIC planet surface … No scroll — the scrolling world is df3")
  - Spec text: "Transcribe the terrain vectors under the gate; render a STATIC planet surface across the framebuffer bottom … No scroll — the scrolling world is df3."
  - Implementation: `decodeAltitudes` is gated on BGALT's *certain, df3-independent* invariants only — first altitude `$E0`=224 (BLK71.SRC:381), `4*TLEN`=1024 entries (BLK71.SRC:397), `|Δ|≤2` per column (two ±1 steps, :385-395), bounded 0-255, non-flat, deterministic. The exact per-column silhouette is NOT pinned to a golden array.
  - Rationale: the exact bit-consumption order is `RFONR1` (BLK71.SRC:481-506) — the bidirectional SCROLL generator (reads TDATA backwards from `TDATA+TLEN`, wraps at TLEN, rotates through RTCNT). Pinning a golden altitude sequence would pull df3's scroll machinery into a static-still story and risk a guessed spec (the "answer fidelity from the source / cabinet-fidelity" rule). The byte TRANSCRIPTION is pinned exactly (TDATA 256 bytes + MTERR 384 bytes byte-for-byte); only the decode's exact silhouette is deferred.
  - Severity: minor
  - Forward impact: df2-6's visual playtest confirms render orientation/colour; df3 pins the exact scroll silhouette (RFONR1 bit order, TLEN wrap, flavor tables) when the scrolling world lands. MTERR is transcribed INERT — its consumer (the scanner) is df5.

### Dev (implementation)
- **Chose the FORWARD MSB-first bit order for the static decode; byte-wrapped ROFF**
  - Spec source: TEA deviation above (exact silhouette deferred); context-story-df2-5.md (BGALT decode)
  - Spec text: TEA pinned only base+step invariants (first `$E0`, `4*TLEN` entries, `|Δ|≤2`), leaving the exact bit-consumption order open for df3.
  - Implementation: `decodeAltitudes` consumes TDATA MSB-first (bit 7→0 per byte), storing one altitude per two ±1 steps, with `ROFF & 0xff` byte-wrap (faithful to 6809 `STA ROFF`, RMB 1). Verified against the real bytes: the profile stays in rows [160, 232] — never wraps, never clamps — so the surface sits in the bottom of the 240-row screen as intended.
  - Rationale: the simplest forward reading of BGALT's base+step rule that satisfies every invariant TEA pinned. It in fact matches BGALT's OWN next-bit routine RFONR1 (BLK71.SRC:435, forward/wrap-forward); the machinery deferred to df3 is LFONR1's backward scan (:481-506) + the flavor tables, not RFONR1. Byte-wrap over saturate because it is what the hardware does and the boundary is never reached here anyway. *(RFONR1/LFONR1 attribution corrected in rework r1 per Reviewer F1.)*
  - Severity: minor
  - Forward impact: df3 replaces this forward-only walk with the exact bidirectional scan (RFONR1 forward :435 + LFONR1 backward :481-506 + flavor tables) when the scrolling world lands; the df2-5 invariant tests (base/step/bounds) stay valid for a static frame. The exact per-column silhouette is not a spec commitment until df2-6/df3.

### Reviewer (audit)
- **TEA deviation (base+step invariants, silhouette deferred to df3)** → ✓ ACCEPTED by Reviewer: sound and correctly scoped — the rule-checker traced the decode against BGALT and confirmed the algorithm is faithful; deferring the exact scroll silhouette to df3 is the right call for a static still. **Caveat (folds into finding F1):** this entry's rationale mislabels RFONR1 as "the bidirectional SCROLL generator (reads TDATA backwards from TDATA+TLEN)". Per source: RFONR1 (BLK71.SRC:435) is the FORWARD routine BGALT actually calls; LFONR1 (:481-506) is the backward one. Correct this prose during rework so the archived record is accurate.
- **Dev deviation (forward MSB-first order; byte-wrapped ROFF)** → ✓ ACCEPTED by Reviewer: the forward MSB-first walk is in fact CLOSER to real BGALT than the deviation claims — RFONR1 (the routine BGALT calls) is itself forward/wrap-forward, so this is not merely "a reasonable simplification" but a faithful match to BGALT's own next-bit routine. Byte-wrap is correct (6809 `STA ROFF`) and never triggered ([160,232]). The "[160,232]" measurement is verified. No change to the decision; only the F1 citation prose needs the RFONR1/LFONR1 correction.

## SM Assessment

**Story:** df2-5 — Terrain + mini-terrain (BLK71) transcription + static planet surface. 3pt, tdd (phased), p2, arcade/defender, epic df2.

**Board reconnaissance (clean):** `git fetch --prune` + `git branch -r | grep df2-5` → no df2-5 branch existed. `.session` sweep across `/Users/slabgorb/Projects/a-*` → only ml9-1 (a-1) and ml8-4 (a-2), both millipede — neither touches Defender. No sibling owns this story. Claim pushed immediately: `feat/df2-5-terrain-mini-terrain-static-planet` (stamp + context) → `origin`, so the sibling branch probe now lights up.

**Premise verified against the current tree (not trusted from the YAML):** the description's falsifiable citations are all accurate — `BLK71.SRC` present at `reference/original-source/defender/`, header title at `:1-8`, `TLEN EQU $100` at `:17`. No stale-premise correction needed.

**Key structural finding handed to TEA (context discovery, sourced):** BLK71 (723 lines) is *mostly terrain-generation CODE* (`BGINIT/BGOUT/BGALT/BGERAS`) plus out-of-scope PLAYER EXPLOSION data. The only transcribable DATA is two labels — `TDATA` ("TERRAIN DATA TABLE", `:507-524`, 256 bytes = `TLEN`, a packed bit-stream not a raster) and `MTERR` ("MINI TERRAIN", `:527+`). Same streams-are-not-rasters / refuse-to-raster-code discriminant as df2-4. Flagged so TEA does not over-transcribe the generation routines.

**ACs:** epic df2 convention is `acceptance_criteria: null` — TEA derives and pins them in RED, faithful to the enriched Background. No either/or ambiguity requiring a user ruling; scope is unambiguous (transcribe TDATA+MTERR INERT under the gate; render a STATIC planet surface; no scroll — that is df3).

**Setup hygiene:** `sm-setup` left `status: backlog` and omitted `**Repos:**`/`**Branch:**` (both documented recurrences) — corrected: story stamped `in_progress`, session fields repaired. Context came back as a bare stub — enriched to df2-4 quality with SM-verified BLK71 facts and df2-3/df2-4 precedent pointers.

**Routing:** phased tdd → hand off to TEA (Han Solo) for the RED phase.

## TEA Assessment

**Tests Required:** Yes
**Reason:** New transcription + render seam (terrain data + static planet surface) — data fidelity and a pure decode/blit both need coverage.

**Test Files:**
- `plugins/defender/tests/terrain-gate.test.ts` — the terrain byte gate: reader's-own-teeth (session-verified TDATA/MTERR facts), module shape, the re-derive-from-source gate, and the independence rule (positive read-set incl. `scripts/transcribe-terrain.mjs`).
- `plugins/defender/tests/terrain-blit.test.ts` — `decodeAltitudes` (BGALT base+step invariants) + `blitTerrain` (static surface paint, synthetic profiles, clip, degenerate-input guards, purity).

Reuses the existing independent reader `tests/helpers/defender-source.ts::readImageBytes` (TDATA/MTERR are plain FCB runs — no new helper, one concept one helper, lang-review #18). No shell/`main.ts` wiring (df2-4 precedent; df2-6 owns the on-screen visual).

**Tests Written:** 32 tests (27 RED + 5 reader's-own-teeth green by design) covering: TDATA/MTERR byte fidelity, encoding discriminants (neither is a raster), roster = exactly {TDATA, MTERR} (no over-transcription of BLK71 code / PLAYER EXPLOSION), source anchoring, gate independence, the BGALT altitude decode, and the static surface blit.
**Status:** RED (failing — ready for Dev). Reader's-own-teeth PASS (they read the real vendored tree, so the gate is non-vacuous). The independence floor fails until GREEN creates `scripts/transcribe-terrain.mjs` (by design). No pre-existing defender test broke (268 passed = 263 prior + 5 teeth).

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #15 source-text token vs claim / pin the number, mutation-testable | gate re-derives exact bytes; `first===224`, `length===4*bytes` (not token greps) | failing (RED) |
| #18 fixture value IS expectation / helper reimplements algorithm | reader teeth use session-verified facts; blit uses synthetic profiles ≠ expectations | teeth passing / blit failing (RED) |
| #20 quantity measured from an artifact the diff changes | TDATA=256/MTERR=384 are ROM facts (unchanged by df2-5); length via `4*bytes` derivation | teeth passing |
| #21 degenerate-but-not-nullish numeric input | `blitTerrain` refuses NaN/Infinity altitude + out-of-range/NaN colour index | failing (RED) |
| #25 source-text guard scope | purity via AST scanner (`violations`), not whole-file regex | failing (RED) |
| #28 read-set selected by pattern / positive floor | independence scan asserts a POSITIVE read-set incl. `transcribe-terrain.mjs` | failing (RED) |
| #2 missing readonly on array params | `TerrainBlock.bytes: readonly number[]` in the contract shims | n/a (contract) |
| #5 .js extension in relative imports | all relative imports use `.js` | passing (lint green) |

**Rules checked:** 8 of 30 lang-review checks apply to a data-transcription + pure-render story; all covered. (React/async/security/enum checks #3,#6,#7,#10,#11 do not apply to pure core data code.)
**Self-check:** 0 vacuous tests. Filter-style assertions are protected by population floors (`length===1024`, `first===224`, roster `===['MTERR','TDATA']`) that redden on a degenerate/empty decode; synthetic blit fixtures differ from their expectations.

**Handoff:** To Dev (Yoda) for GREEN — transcribe BLK71 TDATA+MTERR into `terrain-data.ts`, ship `terrain.ts` (`decodeAltitudes` + `blitTerrain`), and the independent `scripts/transcribe-terrain.mjs`.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `scripts/transcribe-terrain.mjs` (new) — independent BLK71.SRC reader emitting the generated module; does NOT import the test-side reader (independence gate green).
- `plugins/defender/src/core/terrain-data.ts` (new, @generated) — `TERRAIN` = [TDATA (256B, 'bitstream', BLK71.SRC:509), MTERR (384B, 'stream', BLK71.SRC:529)]. Idempotent (re-run → no diff).
- `plugins/defender/src/core/terrain.ts` (new, pure) — `decodeAltitudes` (BGALT base $E0 ±1 walk, MSB-first, byte-wrapped, 4*TLEN entries) + `blitTerrain` (static surface paint, clip + degenerate-input guards). No shell/`main.ts` wiring (df2-6 owns the on-screen visual; df2-4 precedent).

**Tests:** 32/32 terrain tests passing (GREEN). Full defender project 297/297 (the +2 over the pre-df2-5 baseline is `purity.test.ts` sweeping the two new src/core files). Orchestrator 498/498. Lint (`tsc --noEmit`) clean.
**Branch:** feat/df2-5-terrain-mini-terrain-static-planet (pushed)

**Self-review:** decodeAltitudes/blitTerrain are pure (purity green). Colours never invented — blitTerrain writes the caller's palette index, refuses one outside 0-15. Streams-are-not-rasters honoured: neither block is a raster; decodeAltitudes refuses MTERR. No over-transcription (roster is exactly {TDATA, MTERR}; no PLAYER EXPLOSION, no code labels).

### Rework r1 (Reviewer F1 + F2)
- **F1 (ROM citations)** — corrected every wrong cite to the tool-verified line and fixed the RFONR1/LFONR1 swap across `terrain.ts`, `terrain-blit.test.ts`, `terrain-gate.test.ts`, and my Dev-deviation prose: `LDA #$E0` :380 (STA ROFF :381), `DEC ROFF` :387, `INC ROFF` :389, `TLEN EQU $100` :18, `TDATA FCB` :509; RFONR1 (:435) is the FORWARD routine BGALT calls (the decode approximates it), LFONR1 (:481-506) is the backward scroll routine deferred to df3. Verified: `grep` shows no residual wrong cite; the surviving `:481-506` refs now correctly name LFONR1, `:507`/`:527` are the section-header comments.
- **F2 (blitTerrain non-integer)** — `blitTerrain` now throws on any non-integer altitude (NaN/Infinity/fractional) instead of silently clipping a fractional row; docstring updated to match; added the finite non-integer (`3.7`) case to the guard test. Non-vacuous: the assertion reddens without the guard change (3.7 was previously clipped, not thrown).
- **Re-verify:** terrain suites 32/32, full defender 297/297, orchestrator unaffected, lint clean, terrain-data.ts still idempotent. Committed `dace9fdf`, pushed.

**Handoff:** Back to Reviewer for re-review (round-trip 1).
## Subagent Results (Round 1 — superseded by Round 2)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 (tests 297/297 + orch 498/498, lint green, idempotent, no smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings (self-assessed: tests non-vacuous, synthetic fixtures ≠ expectations per #18) |
| 5 | reviewer-comment-analyzer | Yes | findings | 8 (ROM citation errors) | confirmed 8, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings (self-assessed: readonly fields, union over enum, .js imports — clean) |
| 7 | reviewer-security | Yes | clean | 0 | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 (citation cluster + #21 non-integer clip) | confirmed 2, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 2 distinct confirmed (F1 ROM-citation cluster — flagged by BOTH comment-analyzer and rule-checker; F2 blitTerrain non-integer clip — rule-checker), 0 dismissed, 0 deferred

## Reviewer Assessment (Round 1 — REJECTED, superseded by Round 2 below)

**Verdict:** REJECTED

The implementation LOGIC is correct and faithful — both the rule-checker and comment-analyzer independently traced `decodeAltitudes` against BGALT and confirmed the algorithm (base $E0, MSB-first, two ±1 steps per entry, 4 entries/byte, byte-wrap) is right, and `blitTerrain`'s OOB/invented-colour guards hold ([SEC] security: clean). But two confirmed findings block merge in a citation-gated fidelity repo.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | **ROM citations wrong** — 4 of 6 `defender/BLK71.SRC:<line>` cites are off, and `RFONR1` is mislabelled. `LDA #$E0` is :380 not :381; `DEC ROFF` is :387 not :385; `INC ROFF` is :389 not :391; `TLEN EQU $100` is :18 not :17; `TDATA FCB` is :509 not :507. And **RFONR1 (:435) is the FORWARD wrap routine BGALT actually calls (:390,:396) — which this decode approximates — while LFONR1 (:481-506) is the backward one**; the comment swaps them. Flagged by BOTH comment-analyzer [DOC] and rule-checker [RULE]. Direct violation of the stated project rule "line numbers from tool output only" (epic df2 guardrail #4) + lang-review #17. | `terrain.ts:16,17,19-20,29,~61,~73`; mirrored in `terrain-blit.test.ts:164,217`; `terrain-gate.test.ts:411,462,509` | Correct every cite to the tool-verified line; swap RFONR1↔LFONR1 and fix the direction. Also fix the same RFONR1 mislabel in the session's TEA/Dev deviation prose. |
| [MEDIUM] | **`blitTerrain` silently clips a finite non-integer row**, contradicting its own "fails LOUD" docstring — a `row` like `3.7` is finite (no throw) and not off-screen, yet falls into the off-screen `continue` and is dropped. Lang-review #21 (degenerate-but-not-nullish numeric input swallowed). No test covers it. | `terrain.ts:80-89` (guard) + `:52-56` (docstring) | Throw on a non-integer altitude (it is degenerate input, like NaN), or document it as clipped; add a test for the finite non-integer case. Route: testable → red rework (TEA adds the test, Dev tightens the guard). |

**Dispatch tags:**
- [DOC] comment-analyzer — CONFIRMED: 8 ROM-citation inaccuracies (the F1 cluster above), high/medium confidence, all source-verified. Folded into F1.
- [RULE] rule-checker — CONFIRMED: F1 (citation cluster, guardrail #4 / #17) + F2 (blitTerrain #21). 35 rules checked, 2 violations, everything else compliant.
- [SEC] security — clean: blitTerrain's `colorIndex` (0-15) and `row` (finite) guards prevent any OOB / invented-colour write; purity intact; transcribe tool reads a fixed vendored path (no traversal). No finding.
- [EDGE] edge-hunter — DISABLED via settings; self-assessed the boundary paths (clip on negative/≥height row, empty altitudes, 0-width fb): all safe.
- [SILENT] silent-failure-hunter — DISABLED; the one silent-drop path is F2 above (caught by rule-checker instead).
- [TEST] test-analyzer — DISABLED; self-assessed: tests non-vacuous (reader's-own-teeth read the real ROM; synthetic blit fixtures differ from expectations per #18; positive read-set floor per #28). Gap: no finite-non-integer blit test (part of F2).
- [TYPE] type-design — DISABLED; self-assessed: `readonly` fields, `TerrainEncoding` union over enum, `.js` extensions, `export type` for the type re-export — clean.
- [SIMPLE] simplifier — DISABLED; self-assessed: no dead code, no over-engineering; the decode/blit are minimal.

### Rule Compliance (df2 fidelity guardrails + lang-review)
- **Colours never invented** ✓ — no hex/rgb literal in terrain.ts/terrain-data.ts; blitTerrain writes only the validated caller index (0-15).
- **Streams are not rasters** ✓ — TDATA 'bitstream' / MTERR 'stream', neither 'raster'; decodeAltitudes throws on non-bitstream; gate asserts no 'raster'.
- **src/core purity** ✓ — AST purity scan green; only banned-looking token is "canvas" inside a comment (ignored by the AST scanner).
- **Citation/gate independence** ✓ — transcribe-terrain.mjs imports only node builtins; the independence scan enforces it with a positive read-set floor.
- **Line numbers from tool output only** ✗ — F1 (the blocking finding).
- **Encoding discriminant present** ✓; **no over-transcription** ✓ (roster = exactly {TDATA, MTERR}; PLAYER EXPLOSION excluded and asserted).

### Devil's Advocate
Argue the code is broken. The decode is a random walk seeded from ROM bytes — what if the bytes were mis-read? They are not: two independent readers (the test-side `readImageBytes` and the transcribe tool's own parser) agree byte-for-byte, and the reader's-own-teeth pin the real first/last bytes verified against BLK71.SRC this session, so a transcription flip would redden. What if a caller feeds `blitTerrain` garbage? NaN/Infinity throw; out-of-range colour throws; negative/huge rows clip safely — EXCEPT the finite non-integer row, which is silently dropped (F2, now caught). What if the "static planet surface" is not the real Defender terrain? It is a structurally-faithful base+step walk, not the exact scroll silhouette — but that is a LOGGED, reviewer-audited deviation (df3 owns the exact scroll), not a hidden shortcut. The real danger is the one this repo is built to prevent: a future df3 author opens `terrain.ts`, reads "RFONR1's backward-wrapping scan at :481-506", opens the ROM at 481, finds LFONR1, and either "confirms" a claim that is not there or hunts for backward-wrap logic under the wrong routine name — the exact `#17` mislead. That, plus four off-by-one cites in a repo whose entire raison d'être is byte-and-line citation fidelity, is why this is a REJECT and not an approve-with-nits: the citations are the product here as much as the code.

**Handoff:** Back to TEA/Dev for rework (red — F2 needs a test).
## Subagent Results (Round 2 — re-review of rework)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (self-gathered) | clean | 0 (defender 297/297, orch 498/498, lint green, terrain-data.ts idempotent) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings (F2 test mutation-verified non-vacuous by rule-checker) |
| 5 | reviewer-comment-analyzer | Yes | findings | F1 RESOLVED (all 9 citations re-derived from BLK71.SRC, correct; RFONR1/LFONR1 no longer swapped); flagged pre-existing :17 stragglers | confirmed 0 new-in-code, deferred→fixed the straggler sweep |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No (carried from R1) | clean | 0 | Carried: the only code change (blitTerrain guard) got STRICTER — no new surface; purity untouched |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | F2 RESOLVED (mutation-verified: reverted guard → only the 3.7 assertion reddened → restored); F1 verified byte-accurate; NEW #24 finding: :17 straggler not swept tree-wide | confirmed 2 resolved, 1 new (#24) → fixed this round |

**All received:** Yes (comment-analyzer + rule-checker re-run on the rework; preflight self-gathered; security carried forward — code security surface unchanged; 5 disabled)
**Total findings:** F1 RESOLVED, F2 RESOLVED (both independently confirmed), 1 NEW #24 straggler (TLEN :17→:18 not swept tree-wide) — FIXED this round in commit ef453293

## Reviewer Assessment

**Verdict:** APPROVED

Round 1 rejected on F1 (wrong ROM citations + RFONR1/LFONR1 swap) and F2 (blitTerrain silently clipping a finite non-integer altitude). The rework (`dace9fdf`) fixed both; round-2 re-review confirms them independently, and a follow-on #24 straggler was swept (`ef453293`). The df2-5 code and tests are faithful and correct.

- **Data flow traced:** BLK71.SRC bytes → (independent test reader `readImageBytes` AND the transcribe tool's own parser, byte-for-byte agree) → generated `TERRAIN` (TDATA 'bitstream', MTERR 'stream') → `decodeAltitudes` (BGALT base $E0, MSB-first ±1 walk, 4*TLEN entries, byte-wrap) → `blitTerrain` (surface pixels as validated palette indices, clipped). Every step is byte-gated or invariant-gated; no colour or byte is invented.
- **Pattern observed:** the df2-3/df2-4 transcription seam (generated data + independent gate + pure compositor) at `plugins/defender/src/core/terrain.ts` — consistent with the epic.
- **Error handling:** `blitTerrain` now throws on a non-integer altitude and an out-of-range colour index; `decodeAltitudes` throws on a non-bitstream block; off-screen integer rows clip. Verified at `terrain.ts:80-90`.

**Dispatch tags:**
- [DOC] comment-analyzer — F1 RESOLVED: all nine ROM citations re-derived from BLK71.SRC and correct; RFONR1(:435 forward)/LFONR1(:481-506 backward) attribution fixed. No fix-introduced doc regression.
- [RULE] rule-checker — F2 RESOLVED (mutation-verified) and F1 byte-accurate; raised a NEW #24 finding (the :17 straggler), now swept tree-wide (ef453293). All lang-review checks otherwise compliant.
- [SEC] security — clean (carried from R1; the guard change only tightened input validation, no new surface, purity intact).
- [EDGE] edge-hunter — DISABLED; self-assessed: clip on off-screen integer rows still correct (rule-checker confirmed the `[-1,500,3,-5]` clip test still passes, not over-eager throwing).
- [SILENT] silent-failure-hunter — DISABLED; the one silent-drop path (F2) is now a LOUD throw.
- [TEST] test-analyzer — DISABLED; the F2 test (`3.7` throws) is non-vacuous — mutation-verified by rule-checker (reverting the guard reddens exactly that assertion).
- [TYPE] type-design — DISABLED; self-assessed clean (readonly fields, union encoding, .js imports).
- [SIMPLE] simplifier — DISABLED; self-assessed: the decode/blit remain minimal; no dead code.

### Rule Compliance (round 2)
- Colours never invented ✓ · Streams-are-not-rasters ✓ · src/core purity ✓ · Citation/gate independence ✓ · **Line numbers from tool output** ✓ (F1 fixed + #24 swept) · Encoding discriminant + no over-transcription ✓ · #21 degenerate numeric input ✓ (F2 fixed).

### Devil's Advocate (round 2)
Could the fix be cosmetic? No — the guard change is behavioural (a finite `3.7` now throws where it was dropped), and the rule-checker proved non-vacuity by mutation. Could a citation still be wrong? Two independent readers re-derived all nine from the ROM and a tree-wide `grep 'BLK71.SRC:17'` now returns nothing. Could the #24 sweep have broken tracking? The epic YAML still parses and df2-5's story block is intact (orchestrator 498/498). The one residual philosophical risk — the decode is a base+step approximation, not the exact scroll silhouette — is a logged, reviewer-accepted deviation scoped to df3, not a hidden defect. Nothing blocks.

**Handoff:** To SM for finish-story.