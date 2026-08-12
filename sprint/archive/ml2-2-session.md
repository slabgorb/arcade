---
story_id: "ml2-2"
jira_key: "ml2-2"
epic: "ml2"
workflow: "tdd"
---
# Story ml2-2: Pure 8x8 stamp decode primitive in src/shell/gfx-rom.ts: (Uint8Array) -> plain pixel data, 2-bit planar like centipede CENPIC, no fetch/DOM/canvas so it runs under vitest AND the bake script. Byte-equality decode tests.

## Story Details
- **ID:** ml2-2
- **Jira Key:** ml2-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/ml2-2-gfx-rom-stamp-decode
- **PR:** https://github.com/slabgorb/arcade/pull/289 (merged into develop, f677e3fb)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-12T17:59:12Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-12T17:30:52.472218Z | 2026-08-12T17:32:20Z | 1m 27s |
| red | 2026-08-12T17:32:20Z | 2026-08-12T17:42:53Z | 10m 33s |
| green | 2026-08-12T17:42:53Z | 2026-08-12T17:44:16Z | 1m 23s |
| review | 2026-08-12T17:44:16Z | 2026-08-12T17:55:20Z | 11m 4s |
| green | 2026-08-12T17:55:20Z | 2026-08-12T17:58:09Z | 2m 49s |
| review | 2026-08-12T17:58:09Z | 2026-08-12T17:59:12Z | 1m 3s |
| finish | 2026-08-12T17:59:12Z | - | - |

## Sm Assessment

Setup complete for ml2-2 (5pt, tdd). Session file, story context (`sprint/context/context-story-ml2-2.md`) and feature branch `feat/ml2-2-gfx-rom-stamp-decode` (cut from develop) are in place. Jira disabled — no claim needed. Story delivers a pure 8x8 stamp decode primitive in the ml2 plugin's `src/shell/gfx-rom.ts`: (Uint8Array) -> plain pixel data, 2-bit planar per centipede CENPIC, importable under both vitest and the bake script (no fetch/DOM/canvas). Handing off to TEA for the RED phase.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design) — Delivery Findings

- **Gap** (non-blocking): ml2-1 (vendor + byte-citation-gate the picture
  EPROMs 136013-106/107) has NOT run — no `reference/` graphics exist in this
  checkout. The suite therefore pins the decode law against SYNTHETIC planes;
  real-ROM byte-equality (pac-man's `tiles.test.ts` shape) and the chip→half
  ordering belong to ml2-1/ml2-4, and ml2-4's VISUAL playtest is what catches
  a plane-order inversion synthetic bytes cannot see. *Found by TEA during
  test design.*
- **Question** (non-blocking, resolved locally): the epic rule "every new
  src/core constant carries a claim" does not bite here — the module is
  src/shell and there is NO vendored picture source to cite (the 1982 tree has
  no CENPIC-equivalent .MAC; 368X1.DOC only ledgers the two picture EPROMs —
  ml1 OQ-3). The layout law is derived from centipede's in-tree CENPIC decode
  and MAME's centiped-family gfx layouts, both cited in PROSE; no claims file
  was added. *Found by TEA during test design.*
- **Improvement** (non-blocking): the 8x16 motion-object (sprite) shape is
  not covered — the sprite/render stories either stack two 8x8 decodes or
  extend this seam with their own suite when they land. *Found by TEA during
  test design.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

2 deviations

- **`decodeStamp` API pinned by TEA**
  - Rationale: smallest honest surface mirroring BOTH precedents (centipede's
  - Severity: minor
  - Forward impact: ml2-4's bake script consumes exactly this signature
- **Core purity enforced on a SHELL module**
  - Rationale: the title's purity clause is mechanical, not prose — the
  - Severity: minor
  - Forward impact: none (the scanner keeps guarding the file for free)

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design) — Design Deviations

- **`decodeStamp` API pinned by TEA**
  - Spec source: story title (title-only story — the title is the spec)
  - Spec text: "(Uint8Array) -> plain pixel data, 2-bit planar like centipede
    CENPIC"
  - Implementation: tests fix the seam as `decodeStamp(rom: Uint8Array,
    offset: number): number[][]` — 8 rows × 8 pixels of 0..3, plane split
    derived as rom.length/2 (low plane first half, high second), offset a
    per-plane BYTE offset (so tile n = offset n*8 AND CENPIC-style label
    offsets both work), x=0 the MSB, colour = (high<<1)|low, RangeError on
    unsplittable roms / out-of-window or non-integer offsets
  - Rationale: smallest honest surface mirroring BOTH precedents (centipede's
    decodeStamp semantics, pac-man's pure bytes-in shape); internals stay
    Dev's
  - Severity: minor
  - Forward impact: ml2-4's bake script consumes exactly this signature
- **Core purity enforced on a SHELL module**
  - Spec source: story title ("no fetch/DOM/canvas so it runs under vitest
    AND the bake script")
  - Implementation: AC-4 runs the ml1-1 core purity scanner over
    src/shell/gfx-rom.ts source, and a plain-Node subprocess import proves
    the bake-script leg (vitest's esbuild transform would mask non-erasable
    syntax; a subprocess cannot)
  - Rationale: the title's purity clause is mechanical, not prose — the
    scanner is the plugin's one mutation-tested purity instrument
  - Severity: minor
  - Forward impact: none (the scanner keeps guarding the file for free)

## TEA Assessment

**Tests Required:** Yes
**Reason:** 5-point tdd feature story opening the plugin's shell decode seam;
title-only story, so the title's four clauses (pure module in src/shell,
2-bit planar CENPIC law, vitest+bake-script runnable, byte-equality tests)
are the ACs.

**Test Files:**
- `plugins/millipede/tests/gfx-rom.test.ts` — AC-1 module exists + all-zero
  region decodes to an exact 8x8 zero grid; AC-2 the planar law byte-for-byte
  (plane significance rows, the asymmetric 0xF0/0xCC all-four-colours row,
  MSB orientation, a full-grid diagonal/anti-diagonal fixture, and the
  offset contract via a two-stamp 32-byte region incl. a non-aligned offset);
  AC-3 degenerate-input guards (empty/odd rom, out-of-window, non-integer
  offsets → RangeError, boundary offset accepted); AC-4 the ml1-1 purity
  scanner over the module source + a plain-Node subprocess import (the
  bake-script leg); AC-5 four standing GPL sweeps banning MAME gfx-layout
  spellings plugin-wide (green today by design — guards, not RED).

**Tests Written:** 17 (13 RED + 4 standing guards) covering 5 ACs
**Status:** RED (13 failing, every failure the self-describing "not built
yet" path — verified by testing-runner RUN_ID ml2-2-tea-red: 164 others
passing, lint clean). Committed and pushed on
feat/ml2-2-gfx-rom-stamp-decode (ff08706f).

### Rule Coverage

| Rule (lang-review/typescript) | Test(s) | Status |
|------|---------|--------|
| #4/#21 null-undefined + degenerate numeric input | AC-3: empty/odd rom, -1/9/16/1.5/NaN offsets all RangeError; boundary accepted | failing→green |
| #5 module/declaration issues | AC-4 subprocess import pins erasable-syntax-only + plain-Node resolvability | failing→green |
| #8/#18 test quality / apparatus | expected grids HAND-DERIVED in the test's own voice (no oracle reimplements the decode); fixtures asymmetric so mirror/plane-swap/row-swap mutants each produce a different grid | by construction |
| #15/#25 source-text guard scope | purity check is the AST scanner (ml1-1, itself mutation-tested), scoped to the one file; GPL sweeps use distinctive spellings, concatenation-built tokens, NO exempt files (ml2-3 round-2 lesson) | passing (standing) |
| #26 all-local assertions | every decode assertion calls the real module; expectations derive from the header's law, not the implementation | by construction |

**Rules checked:** 5 of 5 applicable have coverage; `.claude/rules/`/`SOUL.md`
absent in this repo.
**Self-check:** 0 vacuous assertions; the AC-5 guards that pass today are
deliberate standing guards (concatenation-shielded), and every RED failure
names the file Dev must ship.

## Dev Assessment

**Status:** GREEN — 177/177 millipede tests pass (13 RED → green, 4 standing
guards stay green), repo-wide lint clean. Committed 95a8544b, pushed.

**Shipped:** `plugins/millipede/src/shell/gfx-rom.ts` — one exported function,
`decodeStamp(rom, offset)`, implementing exactly the TEA-pinned law: plane
split `rom.length / 2` (low plane first), row r read at `offset + r` in each
plane, x=0 the MSB (`0x80 >> x`), colour `(high << 1) | low` (spelled
`(high & mask ? 2 : 0) | (low & mask ? 1 : 0)` — deliberately not MAME's
inverted-shift shape), RangeError on unsplittable regions and on
out-of-window / non-integer offsets. No imports, erasable syntax only —
passes both AC-4 legs (purity scan + plain-Node subprocess import).

**Dev — Delivery Findings:** No upstream findings during implementation.

**Dev — Design Deviations:** None — the module is the smallest surface the
suite demands; the header prose-cites centipede's pictures.ts and MAME's
centiped driver family by NAME (no banned spellings; AC-5 sweeps stay green).

**Handoff:** To Reviewer for the review phase. The diff is two files:
tests/gfx-rom.test.ts (TEA, ff08706f) + src/shell/gfx-rom.ts (95a8544b).

---

## Dev Assessment (fix round 1)

**Status:** GREEN — all six review round-1 findings applied in 7f367935;
181/181 millipede tests (4 new positive-path guard self-tests + the 17-byte
odd-region case), repo-wide lint clean, pushed.

- F1 both headers now cite 368X1.DOC:22-23. (Note: the first application of
  this fix to src/shell/gfx-rom.ts was wiped by a mutation-battery
  `git checkout --` restore and re-applied — verified present in BOTH files
  by grep before commit.)
- F2 `new Uint8Array(17)` added to AC-3; the surviving parity-guard mutant
  M1 was re-run and is now killed (1 failed / 180 passed under the mutant,
  restored after).
- F3 `it.each(BANNED)` positive-path self-test — every banned-token regex
  must fire on its real spelling (assembled by concatenation, never scannable
  text).
- F4 diagonal-fixture comment now names its transpose symmetry and points at
  the constant-row offset fixtures as the transpose catch.
- F5 the plain-Node probe calls `decodeStamp` on a one-lit-pixel region and
  checks shape + values, not just the export's typeof.
- F6 both catch blocks narrow `unknown` via `instanceof Error` (the probe's
  also guards `'stderr' in e`) — no bare `(e as Error)` casts remain in the
  diff (verified by grep).

**Handoff:** back to Reviewer for round 2.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (177/177 vitest, 478/478 orchestrator, lint clean, 0 smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer's 6-mutant battery (1 survivor → F2) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer battery (guard-drop mutants M2/M3 killed; F2 is the silent-decode case) |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed 3 (F3 medium; F4, F5 low) |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 2 (same defect, both headers → F1) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — rule-checker #1/#2/#10 rows clean; no casts/any/enums in src |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — no I/O, no injection surface (pure bytes-in function); GPL sweeps standing |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — 59-line single-function module, no dead code (verified by read) |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2 as one class, downgraded to minor with fix (F6); its 368X1.DOC "compliant" row OVERRULED by comment-analyzer's primary-source read (F1) |

**All received:** Yes (4 returned, 5 disabled and covered as noted)
**Total findings:** 6 confirmed, 0 dismissed, 0 deferred

### Reviewer mutation battery (covering the disabled specialists)

Run sequentially on the shared tree, each verified applied via git diff and
restored via git checkout (files committed beforehand). Rule-checker
independently ran 4 more (bit-swap → 6 red, high-plane offset formula → 5 red,
Date.now() → purity red, gfx_layout comment → GPL red).

| # | Mutant (restrictive → permissive / behaviour change) | Result |
|---|------|--------|
| M1 | drop `rom.length % 2 !== 0` parity guard | **SURVIVED — 177/177 green** (→ F2) |
| M2 | drop `offset + 8 > planeSize` window guard | killed (AC-3 boundary test) |
| M3 | drop `Number.isInteger(offset)` guard | killed (AC-3 non-integer test) |
| M4 | 7 rows (`r < 7`) | killed (5 tests) |
| M5 | LSB-first bit order (`0x01 << x`) | killed (5 tests) |
| M6 | plant `export enum StampKind` (non-erasable syntax) | killed (AC-4 plain-Node probe ONLY — proves the probe is the one guard on the bake leg) |

## Reviewer Assessment

**Verdict: APPROVED (round 2).** All six round-1 findings verified fixed in
7f367935 against the actual diff, not the fix note: [DOC] F1 both headers now
cite 368X1.DOC:22-23; [TEST] F2 the 17-byte parity-only case is present and
the previously SURVIVING parity mutant M1 was re-run and is now killed
(1 red/180 green under the mutant, tree restored); [TEST] F3 the positive-path
self-test exists and was itself mutation-verified this round (de-fanged the
gfx-layout regex → the self-test reddened, restored → 181/181); [TEST] F4 the
transpose-symmetry caveat is in the fixture comment and names the real catch;
[TEST] F5 the plain-Node probe now decodes a one-lit-pixel region and checks
shape + values; [RULE] F6 both catches narrow via `instanceof Error` (probe
also guards `'stderr' in e`) — no bare error casts remain in the diff.

Final state: 181/181 millipede tests green, repo-wide lint clean, orchestrator
suite green (preflight), working tree clean. Total mutation evidence across
both rounds: 11 mutants (Reviewer 6 + rule-checker 4 + round-2 regex de-fang),
all killed after fixes. The decode law, both purity legs, the GPL boundary and
the guards are pinned by tests that have each demonstrated they can fail.

No new findings in round 2. Routing to SM for finish.

## Reviewer Assessment (round 1)

**Verdict: REJECT — 6 findings routed to fix round (1 high, 1 mutation-proven
suite gap, 1 medium, 3 minor). The core decode law, its fixtures, and both
purity legs are verified sound; nothing here questions the API or the law.**

### Findings

- **F1 [DOC] (high) — wrong citation line in both headers.**
  `src/shell/gfx-rom.ts:19` and `tests/gfx-rom.test.ts:83` cite
  "368X1.DOC:23 ledgers the pair/the two picture EPROMs" — the pair spans
  :22-23 (136013-106 at :22, 136013-107 at :23; verified against the quarry
  by awk, corroborated by board-facts.md/brief.md which cite the range).
  Fix: cite `368X1.DOC:22-23` in both files.
- **F2 [EDGE] (high, mutation-proven) — odd-length guard is untested in
  isolation.** Battery M1 (drop the parity check) survives 177/177: the AC-3
  fixture `new Uint8Array(15)` is masked because planeSize 7.5 < 8 also trips
  the window guard. A 17-byte odd region (planeSize 8.5) passes the window
  check and silently decodes garbage (`rom[8.5] → undefined → 0`). Fix: add
  `new Uint8Array(17)` to the odd-length case (keep 15 — it pins the
  small-and-odd corner).
- **F3 [TEST] (medium) — AC-5 GPL regexes have no positive-path self-test**
  (lang-review #15/#25: source-text guards must be mutation-tested). A future
  typo in the concatenation de-fangs a pattern silently — the sweep stays
  green with zero protection. Fix: one `it` asserting each BANNED regex
  `.test()`s true against its real token assembled by concatenation.
- **F4 [TEST] (low) — diagonal-fixture comment overclaims.** The
  diagonal/anti-diagonal expected grid is transpose-invariant (grid[r][c] ==
  grid[c][r] for all cells), so "a wrong row order … produces a DIFFERENT
  grid" is not true of a transposed decode for THIS fixture (the two-stamp
  offset tests do catch a transpose — constant-row → constant-column). Fix:
  tighten the comment (lang-review #17 — prose claims are the unguarded
  surface).
- **F5 [TEST] (low) — plain-Node probe proves loadability, not behaviour.**
  Strengthen the probe to call `decodeStamp(new Uint8Array(16), 0)` and
  assert the returned shape/value, so a loads-but-misbehaves stripping edge
  fails loudly.
- **F6 [RULE] (lang-review #11; minor, downgraded with rationale — not dismissed) — both
  catch blocks narrow `unknown` via bare `(e as Error).message`**
  (tests/gfx-rom.test.ts:81, :275). Matches the repo-wide self-describing-
  loader idiom (centipede/millipede suites), and the failure mode is a
  degraded message, not a swallowed error — but the fix is one expression:
  `e instanceof Error ? e.message : String(e)`. Apply in both places.

### Rule Compliance

Rule-checker swept all 26 lang-review checks + 3 project rules over every
function/constant/test in the diff (38 instances): 36 compliant, 2 instances
of #11 (→ F6). Highlights verified independently: #1 no type escapes; #4/#21
guards fail closed on NaN (REJECT-style, #22); #8/#18 no vacuous assertions,
no oracle reimplementation, hand-derived grids; #15/#25 purity guard is the
AST scanner (mutation-verified), GPL sweep is a negative guard over an
extension list verified exhaustive (#19); #26 all assertions call the real
module; core-purity-on-shell and GPL boundaries both live-mutation-verified;
erasable-syntax verified by running the .ts under plain Node.

### Observations (verified good)

1. The decode law matches centipede's `decodeStamp` exactly (formula,
   MSB-first, plane order) — verified against pictures.ts:450-466, not from
   memory [DOC].
2. The two-stamp offset fixtures pin per-plane addressing (bytes 24..31 for
   the second stamp's high rows) — the rule-checker's offset-formula mutant
   reddened 5 tests [EDGE].
3. Data flow traced end-to-end: Uint8Array → guards → per-row plane reads →
   masked bits → number[][]; no hidden state, no I/O, no second unguarded
   reader [SILENT].
4. Error handling fails closed: all degenerate inputs throw RangeError before
   any indexing (M2/M3 killed) [EDGE].
5. Security surface is nil (pure function, no network/DOM/storage); the GPL
   boundary is the real "security" rule here and both sides are
   mutation-verified [SEC].
6. No over-engineering: 59 lines, one export, zero imports — smallest surface
   the suite demands [SIMPLE].

**Routing:** back to Dev (green) for F1-F6, then re-review.

---

**Handoff (TEA):** To Dev for GREEN. Ship `plugins/millipede/src/shell/gfx-rom.ts`
exporting `decodeStamp(rom: Uint8Array, offset: number): number[][]` per the
test header's law: plane split rom.length/2 (low first), row r at
offset+r per plane, x=0 MSB, colour = (high<<1)|low, RangeError guards
(unsplittable rom; offset not an integer in 0..planeSize-8). Header must
prose-cite centipede's pictures.ts precedent and MAME's centiped-family gfx
layout — NAME symbols, never transcribe (the AC-5 sweeps ban the distinctive
spellings, including in comments). Erasable syntax only — the plain-Node
subprocess probe fails on enums/namespaces/bundler-only imports. No claims
file needed (no vendored picture quarry — see Delivery Findings).