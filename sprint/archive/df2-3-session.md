---
story_id: "df2-3"
jira_key: "df2-3"
epic: "df2"
workflow: "tdd"
---
# Story df2-3: Character set (MESS0) transcription + text writer

## Story Details
- **ID:** df2-3
- **Jira Key:** df2-3
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** feat/df2-3-charset-mess0-transcription-text-writer
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-15T10:23:15Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-15T09:09:31Z | 2026-08-15T09:11:25Z | 1m 54s |
| red | 2026-08-15T09:11:25Z | 2026-08-15T09:30:13Z | 18m 48s |
| green | 2026-08-15T09:30:13Z | 2026-08-15T09:35:37Z | 5m 24s |
| review | 2026-08-15T09:35:37Z | 2026-08-15T09:56:31Z | 20m 54s |
| red | 2026-08-15T09:56:31Z | 2026-08-15T10:05:48Z | 9m 17s |
| green | 2026-08-15T10:05:48Z | 2026-08-15T10:08:47Z | 2m 59s |
| review | 2026-08-15T10:08:47Z | 2026-08-15T10:23:15Z | 14m 28s |
| finish | 2026-08-15T10:23:15Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **Improvement / non-blocking (Yoda, GREEN):** `blitGlyph`'s byte→pixel decode
  (2 nibbles/byte, high nibble = left pixel, non-zero = foreground) is internally
  consistent and satisfies every charset test, but the exact nibble ORDER and the
  Williams screen rotation are an ORIENTATION question that df2-6's visual playtest
  owns (epic guardrail). The byte GATE is hard-pinned (bytes are certain); the blit
  tests are packing-agnostic ON PURPOSE. Not a defect — a wrong nibble order would
  render a legible-but-mirrored glyph that df2-6 corrects, and pinning it now would
  ship a guessed spec.
- **Note (Yoda, GREEN):** fixed a false-positive in the independence guard
  (`charset-gate.test.ts`): it matched the bare token `defender-source` in the
  transcribe tool's COMMENT (which explains it does NOT import the reader). Anchored
  it to an actual import specifier and mutation-verified it still catches a real
  static/dynamic import (lang-review #15, the source-scan self-match trap).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No design deviations

## Sm Assessment

**Story:** df2-3 — Character set (MESS0) transcription + text writer (4pt, p2, tdd, defender plugin).

**Premise verified before setup (not stale):** the title makes two falsifiable ROM
citations and both check out against the vendored source at
`reference/original-source/defender/`:
- `DEFA7.SRC:2030` reads `IRQB2 LDA #2 SELECT CHARS` — confirms MESS0 is banked block 2,
  selected via `MAPC`.
- `MESS0.SRC:1` reads `TTL MESS0 - MESSAGE BLOCK REV 0 - 12/22/80` — confirms the header cite.
No stale-claim correction block was needed; TEA may derive ACs from the title as written.

**Contention probes clean:** no remote branch for df2-3 before setup; only sibling session
was a-2 on jt11-17 (unrelated joust). Claim now pushed on
`feat/df2-3-charset-mess0-transcription-text-writer` and status stamped `in_progress`.

**Pattern to reuse (established, not invented):** this is the third story in df2 to use the
"GENERATED module (transcribe tool) + INDEPENDENT-reader gate" shape. df2-1 and df2-2 already
shipped it — a generator emits a committed charset module, and a *separate* independent-reader
test re-derives the bytes straight from the ROM and refuses any mismatch. Prior evidence at
`sprint/archive/df2-1-session.md`, `df2-2-session.md`, and the epic context
`sprint/context/context-epic-df2.md`. TEA should anchor the RED test on that gate.

**Scope guardrails for TEA/Dev:**
- Raster charset = ROM *cell pixels* blitted into the framebuffer — NOT `@shared/font` vector
  glyphs. `blitGlyph` is a pure function into a pixel buffer; keep it on the correct side of
  the defender core/shell purity boundary (`plugins/defender/src/core` stays pure sim).
- Deliverable is: generated charset module + independent gate + pure `blitGlyph` + render of a
  known string. No animation, no object images (that's df2-4), no terrain (df2-5).
- Watch the settled epic law: letterbox/ground fills use `indexToRgba(0)` / `colours[0]`, never
  a hex literal (df2-1 regressed this; see the colours-never-invented memory).

**Handing off to TEA (Han Solo) for the RED phase.**

## Subagent Results (Round 1 — superseded)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (231/231 defender, 498/498 orch, lint clean, transcriber byte-stable) | N/A |
| 2 | reviewer-edge-hunter | Yes | findings | 7 | confirmed 3, deferred 4 (low, future-proofing) |
| 3 | reviewer-silent-failure-hunter | Yes | findings | 5 | confirmed 1, deferred 4 (low, malformed/future input) |
| 4 | reviewer-test-analyzer | Yes | findings | 5 | confirmed 3, deferred 2 (low) |
| 5 | reviewer-comment-analyzer | Yes | findings | 9 | confirmed 8 (citations), dismissed 1 (BSZ wording, low) |
| 6 | reviewer-type-design | Yes | findings | 4 | confirmed 2, deferred 2 (low) |
| 7 | reviewer-security | Yes | clean | none (no runtime attack surface; all N/A) | N/A |
| 8 | reviewer-simplifier | Yes | findings | 3 | confirmed 1 (dead code), deferred 2 (medium) |
| 9 | reviewer-rule-checker | Yes | findings | 34 rule-instances | confirmed: citations(#17/#33), cast(#1), twins(#18), magnitude(#29); rest low/idiomatic |

**All received:** Yes (9 returned, 7 with findings)
**Total findings:** 3 HIGH + 6 MEDIUM confirmed, several LOW deferred, 1 dismissed. Reviewer independently mutation-verified H2, H3, M2 and grep-verified H1.

### Devil's Advocate

Assume this code is broken. The whole story sells one promise — "an INDEPENDENT reader that
refuses any non-matching byte" — and a confused maintainer of df2-4 will trust that promise
literally. But the two readers (`defender-source.ts` and `transcribe-charset.mjs`) are line-for-line
the same algorithm written twice; a shared misreading of the RASM grammar (the EQU-alias rule, the
break condition, endianness) reproduces identically in both and the gate stays green while wrong. The
"independence" is only independence-from-import — and even THAT is a fiction: I injected a computed
`import()` specifier (the exact idiom this story's own `loadCharset()` uses) into the transcribe tool
and the independence guard passed 13/13 while the tool literally imported the reader. So the linchpin
assertion the header calls "the single assertion that keeps the whole suite honest" does not hold.

A stressed filesystem / a typo'd future ROM: `cellBytes` in the SHIPPING tool slices without a length
check (the test reader throws), so a short source block ships a truncated glyph silently; `blitGlyph`
then reads the missing cells as `undefined → 0 → background`, rendering a half-letter with no error.
A malformed hex token becomes `NaN → 0` through the bitwise ops, fabricating byte 0 while the code
comment boasts it "never fabricates data." A NaN spacing makes every clip comparison false and
`fb.data[NaN] = v` a silent no-op, dropping the rest of a message. The clip guard that prevents real
cross-cell corruption? Deleting it entirely leaves all 15 blit tests green — the Uint8Array does the
far-offset "clipping" for free and the near-boundary aliasing case is never inspected.

A confused reader opens `MESS0.SRC:766` because a comment cites `ADDA ,Y` there — and lands on
unrelated code, because the real line is 812; four of five distinct citations are wrong by 17–50
lines, in permanent records, in a sidecar that says "verified this session" and tells df2-4/df2-5 to
reuse the pattern. And the streams-are-not-rasters guard that guardrail 2 mandates? The literal
`encoding: 'raster'` type makes it unreachable for any real caller — it "passes" only because a
widened test double casts a fake through `unknown`. Every one of these ships green. That is the case
for rejection.

## Reviewer Assessment (Round 1 — REJECTED, superseded by Round 2)

**Verdict:** REJECTED

The implementation is byte-faithful (the gate has real teeth — a single flipped byte reddens it, and
every glyph's bytes independently re-derive from the vendored source) and all suites are green. But
the story's *durable* promises — a non-tautological gate, an enforceable encoding discriminant, a
citation trail, and a blit primitive df2-4/df2-5 will reuse — do not hold. Three HIGH findings, two of
them mutation-proven vacuous/evadable guards and one a stated-guardrail violation.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH][DOC][RULE] | 17 wrong ROM line citations across 8 files (guardrail 4 "line-numbers-from-tool-output", lang-review #17/#33). `SPACE EQU *`→490 (not 540), `TEXT7A`→803 (not 786), `TEXT7B`→804 (not 764), `ADDA ,Y`→812 (not 766), charset range→441-649 (not 441-640). Keep: CHRTBL 441, CHARSP 747, DEFA7 2030. | charset.ts:16,40 · charset-data.ts:7 · defender-source.ts:24,142,172 · charset-gate.test.ts:7 · charset-blit.test.ts:17,230 · transcribe-charset.mjs:16,152 · context-story-df2-3.md:36-42 · gotchas.md (the new df2-3 entry) | Re-derive each from `grep -n` and correct all 17. The gotchas entry claims "verified this session" and tells df2-4/df2-5 to reuse — fix it too. |
| [HIGH][TEST] | The "clips an out-of-bounds blit" test is VACUOUS — deleting `blitGlyph`'s entire clip guard leaves all 15 blit tests green (Uint8Array silently discards far-offset writes; the `tiny` case only checks `.not.toThrow()`). The guard is load-bearing: a near-boundary blit corrupts a different in-bounds cell without it. (mutation-verified by Reviewer) | charset-blit.test.ts:145-158 | Assert `litCells(tiny)` CONTENT (no lit cell outside the fb), and add a near-boundary case (e.g. glyph at `x=fb.width-2`) where an unclipped write would alias a real cell — assert that cell stays unlit. |
| [HIGH][TEST] | The independence guard (the gate's own linchpin) is EVADABLE: a computed `import()` specifier — the exact idiom `loadCharset()` already uses — lets the transcribe tool import the test reader with the guard green (mutation-verified: 13/13). The regex only catches a string-literal import. | charset-gate.test.ts:303-309 | Strip comments then match the bare `defender-source`/`tests/helpers` token in code (closes the computed-import gap the literal anchor opened), OR also flag any `import()` with a non-literal argument. Add a POSITIVE REQUIRED-files floor asserting `transcribe-charset.mjs` is in the scan set. Mutation-test it against a computed-specifier import. |
| [MEDIUM][TYPE][RULE] | The `encoding: 'raster'` literal type makes `blitGlyph`'s `!== 'raster'` guard unreachable for any typed caller (tsc TS2322 blocks constructing a non-raster `Glyph`); guardrail 2 ("refuse to raster a non-raster") is unenforceable for real callers and "tested" only via a widened test double. df2-4's object tables need a live discriminant. | charset.ts:60 · charset-data.ts (encoding type) | Widen `encoding` to a union (e.g. `type Encoding = 'raster' \| 'stream'`) so the guard is reachable and df2-4 can add non-raster kinds; keep the test double honest with a literal type. |
| [MEDIUM][TEST][RULE] | `writeText`'s cursor-advance (`width*PIXELS_PER_BYTE + spacing`) is pinned only by ordering ("second char is further right") and rough count, never exact magnitude — dropping the `spacing` term leaves all 15 tests green (mutation-verified). lang-review #29. | charset-blit.test.ts:107-113,219-227 | Add an exact-magnitude assertion on the cursor step (a known advance for a known glyph+spacing), and a spacing≠default case. |
| [MEDIUM][EDGE][SILENT] | The exported blit primitive fails SILENTLY on malformed input df2-4/df2-5 will feed it: the shipping tool's `cellBytes` slices with no length check (the test reader throws) → truncated glyph; `blitGlyph` reads short `bytes` as `undefined→0→background`; a NaN x/spacing makes `fb.data[NaN]=v` a silent no-op dropping the rest of a string. | transcribe-charset.mjs:81 · charset.ts:65,72,95 | Throw in the tool's `cellBytes` on a short block (mirror the test reader); in `blitGlyph` validate `bytes.length===width*height` and `Number.isFinite(x,y)`; range-check `colorIndex`. |
| [MEDIUM][TYPE] | `const QUESTION = CHARSET.find(...) as GlyphData` casts away `undefined`; if QUESMK is ever absent, `writeText` crashes deep in `blitGlyph` with an opaque TypeError instead of failing fast. | charset.ts:41 | Replace the cast with a checked lookup that throws a descriptive error at module init. |
| [MEDIUM][TEST][RULE] | The two "independent" readers are line-for-line identical logic; the gate catches transcription typos (proven) but NOT a shared RASM-grammar misreading. The header's "INDEPENDENT reader refuses any mismatch" oversells. lang-review #18. | defender-source.ts vs transcribe-charset.mjs | At minimum, soften the framing to disclose the same-session shared-logic limit; better, make the tool's parse genuinely differ (or add an out-of-session/hex-dump spot check for the table). |
| [MEDIUM][SIMPLE] | Dead / over-general reader code: `bytesInRange` (incl. speculative FCB support) is exported but never called; `evalOperand`'s `A+B`/symbol branch and `isLabelOnly` are exercised only by their own unit tests, never by real MESS0.SRC data. | defender-source.ts:121-137,89-99,75-81 | Delete `bytesInRange`; strip or HONESTLY document the unused `evalOperand` generality (the doc claims it's "the RASM dialect needed here"); fold/drop `isLabelOnly`. |

**Deferred (LOW — fix opportunistically, not blocking):** QUESMK dedup first-wins (tool) vs last-wins
(gate `byPtr`) — align and assert duplicate CHRTBL rows identical; `evalNum` NaN-coercion of malformed
hex; EQU detected by `op!=='FDB'` not `op==='EQU'`; `descriptorTable` silent truncation on a malformed
row; `charForLabel` collapsing BLANK and unknown to `null`; `catch (e)` → `(e as Error)` without
narrowing (3×); `readonly` on `Statement`/`Descriptor`; `byChar` duplicate-char shadowing.

**[SEC]:** clean — no runtime attack surface (build-time tooling + tests over a git-tracked vendored
file; no user input, no eval, hardcoded paths/specifiers, linear-time regexes).

**Design deviations:** none recorded in the session; nothing to stamp.

**Handoff:** Back to TEA (Han Solo) for the RED-phase rework — the HIGH findings are test-quality
defects (vacuous clip test, evadable independence guard, unpinned magnitude) plus test-driven impl
changes (live `encoding` union, blit invariant guards). Harden the tests first, then Dev makes them
green and corrects the citations/dead-code.

## Tea Assessment (round 2 — RED rework of the rejection)

Addressed the Reviewer's test-quality findings and hardened the guards; the three
previously-vacuous/evadable guards now BITE (each re-mutated and confirmed red):

**Fixed in TEA-owned files (test helper + test files + this session doc + gotchas):**
- **H2 clip test** — rewrote to pin CONTENT: the clipped blit must equal exactly the
  in-bounds subset of the same glyph in a larger fb (catches wraparound corruption a
  Uint8Array silently absorbed). Mutation: deleting the clip guard now reddens it.
- **H3 independence guard** — now strips comments then matches the bare `defender-source`
  token in CODE (a computed `import()` specifier keeps the literal `'defender-source.js'`
  segment, so it's caught) + a POSITIVE floor asserting `scripts/transcribe-charset.mjs`
  is in the scan set. Mutation: a computed-specifier reader import in the tool now reddens it.
- **M2 writeText magnitude** — pins the EXACT cursor advance (`g.width×2 + spacing`) and its
  spacing-sensitivity (1→5 shifts +4), not just "further right". Mutation: dropping the
  `spacing` term now reddens it.
- **M5** — softened the "independent reader" header to disclose the same-session shared-logic
  limitation (mechanical independence, not independent reasoning).
- **M6** — deleted the dead `bytesInRange` (+ its speculative FCB path).
- **Silent-failure lows** — `evalOperand` now throws on a malformed hex token (no NaN→0
  fabrication); `bytesForLabel` requires an actual `EQU` alias, not merely "not FDB".
- **H1 citations (TEA files)** — corrected: `SPACE EQU *`→490, `TEXT7A`→803, `ADDA ,Y`→812,
  charset range→441-649; `BSZ 3*8` reworded as the ROM's own annotation.

**Added RED drivers (fail now, drive Dev's GREEN):**
- `blitGlyph` must throw on a glyph whose `bytes.length !== width×height` (short cell).
- `blitGlyph` must throw on a non-finite x/y (no silent NaN drop).

**Dev's GREEN rework list (impl + the src-side citations):**
1. **H1 src citations** — fix `charset.ts`, `transcribe-charset.mjs` (the generated
   `charset-data.ts` inherits from the tool's template), same corrected lines as above,
   then re-run the tool (must stay byte-stable). Also fix the df2-3 entry in `gotchas.md`
   and `context-story-df2-3.md` (I fixed the ones I own; verify none remain — `grep -rn ':540\|:786\|:766\|:764\|441-640'`).
2. **M3 impl** — add the two `blitGlyph` invariant guards (make the 2 RED drivers pass), and
   add the same length check to the TOOL's `cellBytes` (mirror the test reader's throw).
3. **M1** — widen `GlyphData.encoding` to a union (e.g. `'raster' | 'stream'`) in
   `charset-data.ts` so `blitGlyph`'s `!== 'raster'` guard is reachable for real typed callers
   (guardrail 2); the tool keeps emitting `'raster'`.
4. **M4** — replace `const QUESTION = CHARSET.find(...) as GlyphData` with a checked lookup
   that throws at module init if `QUESMK` is absent.
5. Deferred LOWs (opportunistic): QUESMK dedup first/last alignment + assert duplicate CHRTBL
   rows identical; `catch (e: unknown)` narrowing; `readonly` on `Statement`/`Descriptor`.

**Verify:** defender 231/233 (the 2 reds are the blit-guard drivers), lint clean, all three
hardened guards mutation-confirmed to bite. Handing to Dev (Yoda) for GREEN.

<!-- delivery-findings-marker -->
### Reviewer (code review)

- **Gap** (blocking): the charset byte gate's independence guard is evadable by a computed
  `import()` specifier and the clip/magnitude guards are vacuous under mutation.
  Affects `plugins/defender/tests/charset-gate.test.ts`, `plugins/defender/tests/charset-blit.test.ts`
  (strengthen the guards). *Found by Reviewer during code review.*
- **Gap** (blocking): ROM line citations are wrong in 17 places across 8 files (guardrail 4);
  the df2-3 `gotchas.md` entry propagates them to df2-4/df2-5. Affects the files listed in the
  severity table (re-derive every `:line` from tool output). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `blitGlyph` and the transcribe tool's `cellBytes` are reused by
  df2-4/df2-5 but fail silently on malformed/short input; add fail-loud invariant guards.
  Affects `plugins/defender/src/core/charset.ts`, `scripts/transcribe-charset.mjs`.
  *Found by Reviewer during code review.*

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (233/233 defender, 498/498 orch, lint clean, byte-stable) | N/A |
| 2 | reviewer-edge-hunter | Yes | findings | 3 verified-fixed + 3 residual | confirmed 2 non-blocking (3c prod-tool guards, A non-integer pos), deferred 1 (B colorIndex) |
| 3 | reviewer-silent-failure-hunter | Yes (reviewer-assessed) | findings | round-1 items | round-1 silent paths fixed at blitGlyph/tool cellBytes (verified by edge-hunter); residual 3c/B → non-blocking follow-up |
| 4 | reviewer-test-analyzer | Yes | findings | 4 mutation checks | confirmed ALL 4 round-1 test defects now bite (clip, independence, magnitude, new guards); 0 new vacuity |
| 5 | reviewer-comment-analyzer | Yes | clean | 27/27 citations correct, 0 survivors | N/A — H1 fully fixed |
| 6 | reviewer-type-design | Yes | findings | 2 fixed + 2 low | M1 union + M4 cast FIXED (tsc-confirmed); 2 pre-existing LOW deferred |
| 7 | reviewer-security | Yes (reviewer-assessed) | clean | none | N/A — surface unchanged from round 1 (no runtime input) |
| 8 | reviewer-simplifier | Yes (reviewer-assessed) | clean | dead `bytesInRange` removed | N/A — round-1 dead-code finding resolved |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations, #13 fix-regression clean | N/A — all 6 round-1 findings compliant, no new violations |

**All received:** Yes (6 spawned this round + 3 reviewer-assessed; silent-failure/security/simplifier domains unchanged or resolved)
**Total findings:** all 3 HIGH + 6 MEDIUM round-1 findings CONFIRMED FIXED and independently re-verified (citations 27/27, all 4 test-defect mutations bite, encoding-union tsc-reachable, guards non-vacuous). 3 new NON-BLOCKING robustness findings filed as df2-4 follow-ups.

### Devil's Advocate

Argue the rework is not done. The rework's own thesis is "the reused primitive and tool must fail
LOUD" — yet I hardened the TEST-side reader (`defender-source.ts`: throw on malformed hex, require a
real `EQU` alias) and left the SHIPPING transcribe tool's own `evalNum`/`bytesForLabel`
(`transcribe-charset.mjs`) with the exact silent-`NaN→0` and `op!=='FDB'`-alias holes I just closed
next door. The gotchas entry this very diff adds tells df2-4/df2-5 to copy that PRODUCTION tool — so
the weaker twin is the one that propagates. Is that a completed fix or a half-fix that reads as
complete? And `blitGlyph`, now an exported primitive, guards `NaN`/`Infinity` positions but not a
fractional `4.5` (a silent TypedArray no-op) nor a `colorIndex` of 0 (invisible) or 300 (wraps to 44)
— the same silent-mis-render class the whole round existed to kill, one coordinate type away.

Why it still does not block: every one of those is a guard against MALFORMED or FUTURE input, not a
defect in what ships. The tool runs against the real, committed `MESS0.SRC` and emits 43 byte-correct
glyphs (byte-stable on re-run); the independent byte gate re-derives every byte with the FIXED reader
and would redden CI on any real divergence 3c could cause — so 3c cannot silently ship wrong data for
THIS story. `writeText` only ever hands `blitGlyph` integer cursor positions, so A/B are reachable
only by a hypothetical future caller. None is Critical or High. Over-cycling a 4-point story to a
third full round for tool-guard-symmetry the gate already defends is disproportionate; the honest move
is to APPROVE and file 3c/A/B as blocking-for-df2-4 follow-ups (df2-4 touches the tool per the
sidecar, so it is the right owner). The round-1 blockers — wrong citations, a vacuous clip test, an
evadable independence guard — are the ones that would have silently rotted the epic, and all three are
now fixed and mutation-proven.

## Reviewer Assessment

**Verdict:** APPROVED

Round-2 rework of the round-1 rejection. All 3 HIGH and 6 MEDIUM findings are fixed and independently
re-verified (not merely re-run): comment-analyzer confirmed **27/27 ROM citations correct, 0 survivors**;
test-analyzer **mutation-confirmed all four test defects now bite** (clip-content, independence-vs-computed-import,
exact magnitude, the two new blit guards); type-design **tsc-confirmed** the `GlyphEncoding` union makes
the streams-are-not-rasters guard reachable and the `QUESTION` cast is now a checked throw; rule-checker
found **0 violations and no fix-introduced regression** (#13). Suites: defender 233/233, orchestrator
498/498, lint clean, transcriber byte-stable. Working tree verified clean after the parallel mutation
subagents (the transient `charset.ts` perturbation resolved back to HEAD).

**Non-blocking follow-ups (for df2-4, which reuses the tool per the sidecar — not blocking df2-3):**

| Severity | Issue | Location | Follow-up |
|----------|-------|----------|-----------|
| [MEDIUM][EDGE][SILENT] | The production transcribe tool's `evalNum` (no `NaN` guard → silent 0) and `bytesForLabel` (`op!=='FDB'` treated as alias, not `op==='EQU'`) were NOT hardened in lockstep with the test-side reader. Defended for df2-3 by the byte gate in CI, but the sidecar tells df2-4/df2-5 to copy this tool. | scripts/transcribe-charset.mjs:48-53, 63-78 | Mirror the test reader's `Number.isNaN` throw and literal-`EQU` requirement. |
| [MEDIUM][EDGE] | `blitGlyph` guards `NaN`/`±Infinity` position but not a non-integer finite one (`fb.data[4.5]=v` is a silent no-op). Exported/reused primitive. | plugins/defender/src/core/charset.ts (finite check) | Tighten to `Number.isInteger(x) && Number.isInteger(y)`. |
| [LOW][EDGE] | `colorIndex` unrange-checked: `0` renders invisible (== background), `>255`/negative wrap via `ToUint8`. | plugins/defender/src/core/charset.ts blitGlyph | Range-check `0..15` (or `≥1`) if a reused primitive should reject a mis-computed index. |
| [LOW][TYPE] | The `notRaster` encoding test uses a local widened `Glyph` shim, so the compile-time reachability of the guard is pinned only by repo-wide lint, not a tsc-checked fixture importing the real `GlyphData`. | plugins/defender/tests/charset-blit.test.ts | Import the real type for the fixture. |

**[SEC]:** clean (unchanged from round 1 — no runtime attack surface).
**Data flow traced:** ROM `MESS0.SRC` FDB tables → transcribe tool (independent reader) → generated
`CHARSET` → `blitGlyph`/`writeText` → framebuffer palette indices → shell decode. Byte gate re-derives
the whole chain from source and refuses any mismatch; safe.
**Design deviations:** none recorded; nothing to stamp.
**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

<!-- delivery-findings-marker -->
### Reviewer (code review — Round 2)

- **Improvement** (non-blocking): production transcribe tool `evalNum`/`bytesForLabel` lack the
  malformed-hex-throw and literal-`EQU`-alias guards the test-side reader now has; the sidecar routes
  this tool to df2-4/df2-5. Affects `scripts/transcribe-charset.mjs` (mirror the test reader's guards).
  *Found by Reviewer during round-2 code review.*
- **Improvement** (non-blocking): `blitGlyph` accepts non-integer finite positions and any
  `colorIndex` (silent no-op / invisible / wrap). Affects `plugins/defender/src/core/charset.ts`
  (integer + range guards). *Found by Reviewer during round-2 code review.*