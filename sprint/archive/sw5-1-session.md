---
story_id: "sw5-1"
jira_key: "sw5-1"
epic: "sw5"
workflow: "tdd"
---
# Story sw5-1: Recover `.WGD` ground-object edges — parser extension

## Story Details
- **ID:** sw5-1
- **Jira Key:** sw5-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-12T21:23:29Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-12T19:57:17Z | 2026-07-12T19:58:46Z | 1m 29s |
| red | 2026-07-12T19:58:46Z | 2026-07-12T20:54:04Z | 55m 18s |
| green | 2026-07-12T20:54:04Z | 2026-07-12T21:01:14Z | 7m 10s |
| review | 2026-07-12T21:01:14Z | 2026-07-12T21:23:29Z | 22m 15s |
| finish | 2026-07-12T21:23:29Z | - | - |

## Sm Assessment

**Story:** sw5-1 — extend `scripts/rom-models/wsobj.mjs` to parse `.WGD` PLOT/DRAWTO/BDRAWTO/ENDPLOT
routine bodies into the existing ConnectOp IR, so the 10 `hasDrawList: false` ground objects
(GND, TWR, BNK, STB, WPN, WGA, WGB, WFF, WFG, PORT) gain real ROM edges. Orchestrator-only,
5 pts, TDD. Unblocks sw5-4 and sw5-5.

**Ready to hand off:** yes.
- Design spec already written: `docs/superpowers/specs/2026-07-12-wgd-ground-object-edges-design.md`
  (read it first — it is the technical approach; do not re-derive one).
- Story context: `sprint/context/context-story-sw5-1.md`. ACs live in `sprint/epic-sw5.yaml`.
- Target file exists: `scripts/rom-models/wsobj.mjs` (17.9 KB); shared radix/number/pen core is
  also used by `redbaron.mjs` / `redbaron-pictures.mjs`.

**Routing notes for TEA (O'Brien):**
- AC-5 names the ORACLE explicitly — the bunker's `BDRAWTO 14,15` and the tower's `BDRAWTO 7,9` /
  `BDRAWTO 7,8` strokes that models.ts already quotes by hand. Pin those as tests; they are the
  human-verified ground truth for this parser.
- Two traps the ACs call out and the tests must encode:
  1. `.WGD` draw indices are **DECIMAL** (forced by the trailing-dot macro trick). The `.RADIX 16`
     hex rule that governs `.PH` vertex rows does **not** apply here.
  2. Unknown directives inside a `.WGD` body (e.g. `MOVD`) must be **enumerated and skipped**, never
     silenced by relaxing the throw-on-unknown guard.
- AC-6 (every emitted edge index within `[0, vertices.length-1]` for all 24 objects) is the guard
  against a uniform off-by-one on the anchor rebase — a plausible but wholly wrong wireframe.
- AC-10: the red-baron oracle must still pass; it guards the shared radix/number/pen core this
  change touches.
- Honesty clause (AC-7): if a routine is genuinely unparseable, it keeps `hasDrawList: false`.
  Never guess an edge list to make a count go up.

**Branch:** trunk-based — orchestrator commits straight to `main` (per CLAUDE.md). No feat branch.

**Flag:** an unrelated PR (#5, `sprint/sh2-18-design`, from a parallel checkout) is open against this
same repo and touches `sprint/` YAML. Expect a possible append-conflict on sprint files at finish;
resolve as union.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED — 25 failing tests (18 orchestrator + 7 star-wars), ready for Dev.

**Test Files:**
- `tests/rom-models/wsobj.test.mjs` — the `.WGD` parser contract (12 new tests + 4 existing
  `hasDrawList: false` assertions flipped to `true`; TEA owns those goalposts, Dev must not move them).
- `tests/rom-models/bake.test.mjs` — the artifact's stale "edges not recoverable" caveat must go, and be
  replaced by the WFG out-of-range warning (2 tests, 1 rewritten).
- `star-wars/tests/tools/romCompare.test.ts` — the punch-list pin 5 → 8 pairs, plus the out-of-range
  edge guard (7 tests).

**What proves the work correct (in ascending strength):**
1. **The oracle (AC-5).** `models.ts` quotes two stroke sequences a human read off this source BY HAND:
   the bunker's `BDRAWTO 14,15` and the tower's `BDRAWTO 7,9` / `7,8`. Tests demand the parser reproduce
   them exactly (edges `13-14`, `6-8`, `6-7`). BNK's *entire* routine is pinned end-to-end — a total
   oracle, not a spot check.
2. **WPN as a self-evident oracle.** Its point table is commented "0-3 OUTER RECTANGLE" / "4-7 INNER
   RECTANGLE"; a correct parse must yield exactly those two closed rectangles. This also covers the
   falsy-zero rule (below).
3. **The index-range invariant (AC-6).** Nine of ten ground objects land EXACTLY filling `[0, len-1]`.
   That is what proves the −1 anchor rebase correct — an off-by-one could not produce that.

**Verified before writing a line of test:** I scraped all eight `.WGD` bodies out of WSOBJ.MAC and
computed each one's index range against its real parsed vertex count, rather than trusting the design
spec. Two things fell out, both now pinned:
- **WFG indexes a vertex that does not exist** (`DRAWTO 6` into a 6-point table) — a genuine 1983 ROM
  out-of-bounds read. AC-6 and AC-8 cannot both hold literally; put to the user, who chose
  transcribe-and-document. See Design Deviations.
- **The design spec is wrong about WFG** — it calls WFG an alias of WFF. Its *vertices* are; its *draw
  routine* is not. Pinned.

### Rule Coverage (lang-review javascript)

| Rule | Test | Status |
|------|------|--------|
| #1 silent error swallowing | `.WGD: an UNKNOWN macro inside an open routine body throws` | failing |
| #1 silent error swallowing | `.WGD: an unrecognized .-directive inside an open routine body throws` | failing |
| #1 silent error swallowing | `REAL: no object carries connect data without a draw list` (AC-7 honesty) | passing (standing invariant) |
| #4 falsy zero (`0` is falsy) | `REAL: WPN — point 0 is a real vertex (not an anchor)` | failing |
| #4 falsy zero | `.WGD: PLOT on the DROPPED anchor emits no op — never a negative index` | failing |

**Rule #4 is the live trap here.** Index 0 means the *anchor* on the four objects sharing GND's table,
but a *real vertex* on WPN/WFF/PORT — and WPN both starts from AND draws back to vertex 0. An anchor
check written `if (!raw)` instead of `raw === 0 && anchorDropped` would silently eat WPN's closing
stroke. Rules #2/#3/#5/#6/#7 (async, prototype pollution, DOM/XSS, child_process, ReDoS) have no surface
in a pure synchronous text parser.

**Self-check:** every test carries a meaningful assertion; no `let _ =`, no `assert(true)`, no
`is_none()`-style vacuity. Two tests pass today and are standing invariants, not vacuous: the AC-7
honesty check (loops all 24 objects) and "no out-of-range edge touches a mapped pair" (loops all 8
mapped pairs).

**Regression guard (AC-10):** the red-baron oracle suite is GREEN (10/10) and must stay green — it
guards the shared radix / number / pen core this change touches. Full orchestrator suite: 194 passing,
18 failing (all intended).

**Handoff:** To Julia (Dev) for GREEN. Read the two blocking Delivery Findings first — the story's
`repos:` field is missing star-wars, and the contact sheet will crash on WFG unless it filters
out-of-range edges.

## Dev Assessment

**Status:** GREEN. Orchestrator 212/212, star-wars 926/926 + `npm run build` (tsc) clean.
All 25 of O'Brien's RED tests pass; no test was modified to get there.

**Changed:**
- `scripts/rom-models/wsobj.mjs` — `.WGD`/`.WGD2` routines parse into the existing ConnectOp IR
  (`pushWgd`). `connectToEdges` needed NO change, exactly as the design predicted: BDRAWTO/DRAWTO is
  the same pen idiom as `.BD`/`.LD`.
- `scripts/bake-models.mjs` — deleted the (now false) "edges not recoverable" caveat; added the WFG
  out-of-range warning with the filter predicate.
- `star-wars/src/tools/romModels.generated.ts` — re-baked. **24 of 24 objects now carry ROM edges** (was 14).
- `star-wars/src/tools/romCompare.ts` — new exported `inRangeEdges`, applied in `pairOne`.
- `star-wars/src/tools/contactSheet.ts` — same filter on the ROM render side.

**Bake result:** GND 18 edges · TWR 18 · BNK 8 · STB 13 · WPN 8 · WGA/WGB 25 · WFF 7 · WFG 9 · PORT 18.

**Verified in the real tool, not just tests** (`models.html`, `[C]` compare, served from THIS checkout —
note port 5274 is held by a-2's dev server, so I served a-1 on 5399 rather than screenshot the wrong
code):
- every ground object renders as a wireframe instead of unconnected dots;
- WPN draws exactly the two nested rectangles its ROM comments promise — the self-evident oracle,
  confirmed visually;
- WFG renders without crashing (the phantom point-6 edge is filtered, not stroked to `undefined`);
- PORT/STB/BNK show "vertices differ — edge diff not meaningful", and the reason is visible on screen:
  the ROM exhaust port is a large concentric-square structure, ours a tiny octagon.

**Deviations:** none of my own. I implemented TEA's three logged deviations as specified
(WFG transcribed + documented; the punch-list pins a blocked diff; no negative ConnectOp).

**One guard added beyond the tests:** `pushWgd` throws if a non-PLOT op ever references a dropped
anchor. No WSOBJ.MAC routine does — but skipping such an op would splice the beam path and fabricate an
edge, and emitting it would produce a negative index. Throwing is the only honest option left.

**Handoff:** To O'Brien (TEA) for verify.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 0 | reviewer-preflight | Yes | clean | none | N/A — orchestrator 220/220, star-wars 931/931, `tsc` clean. Zero `console.log` / TODO / `.only` / `.skip` / commented-out code in either diff. **Independently re-ran the bake and confirmed `romModels.generated.ts` is byte-identical to a fresh `bake-models` run** — the DO-NOT-EDIT artifact was not hand-edited. |
| 1 | ROM-fidelity auditor (independent re-derivation of all 8 `.WGD` routines from WSOBJ.MAC; hand-traced BNK/WPN/PORT/STB/TWR/GND/WGA/WFF/WFG against the baked edges) | Yes | findings | 2 confirmed: (a) the stated PROOF of the WFG anomaly is FALSE — "the nine others land exactly filling [0,len-1]" is untrue (BNK uses 6 of 15 points, STB skips 3-5); (b) SIX objects drop an anchor, not four — WGA has its own `.P 0,0,0` (WSOBJ.MAC:580), passed to WGB. Confirmed all 7 semantic claims and every baked edge as correct. | **Both CONFIRMED and FIXED.** Verified independently before acting (see the min/max/density table). No behavioural defect found — both were false statements in the audit record + a comment that was a live trap. |
| 2 | reviewer-test-analyzer (mutation testing) | Yes | findings | 12 findings; 5 surviving mutants proving real holes: PORT/STB stroke content unpinned; dropped-anchor throw uncovered; `.WGD2` no-preceding throw uncovered; `inRangeEdges` `i >= 0` half uncovered; `pairOne` PORT-side filter uncovered. Plus 3 vacuous/tautological assertions. Confirmed the tests were NOT weakened (both GREEN commits are test-free). | **All 5 mutants CONFIRMED and KILLED** (re-ran each mutant against the new suite; fail counts 13/1/5/1/1). Vacuous AC-7 test and tautological `{0,0}` assertions replaced. Two low-confidence items deliberately not actioned — see "Not fixed" below. |
| 3 | reviewer-edge-hunter (state-machine / boundary enumeration) | **No** | **FAILED — API error mid-response** | none returned | **Gap acknowledged, covered by hand.** I enumerated its brief myself: `.WGD` block ordering vs the `.P`/`.LD` handlers, the unterminated-`.WGD` case (found a real hole → EOF guard added), `.WGD2` alias ordering + the anchor-state divergence risk (real → guard added), and `inRangeEdges` bounds (covered by subagent 2's mutants). Not silently skipped. |

**All received: Yes** — every spawned subagent is accounted for, with one honest exception stated
rather than hidden: **subagent 3 (reviewer-edge-hunter) FAILED with a mid-response API error and
returned no findings.** I did not re-spawn it; I worked its brief by hand instead (row 3), and it
turned up two real defects — the unterminated-`.WGD` hole and the `.WGD2` anchor-divergence risk —
both now guarded and tested. No subagent result was skipped for context pressure.

## Reviewer Assessment

**Verdict: APPROVED — after rework.** The implementation was correct; the *audit record* was not, and
the tests had five holes a real bug could have walked through. All fixed and re-verified.

**Final state:** orchestrator 220/220 · star-wars 931/931 · `tsc` clean · bake reproduces 24/24 objects.

Because I authored the code, I did not trust my own reading. I ran three independent reviewers: one
re-derived all eight `.WGD` routines from WSOBJ.MAC from scratch and hand-traced the baked edges; one
mutation-tested the suite. (A third died on an API error; its ground was covered by the other two plus
my own state-machine pass.) They found things I missed.

### Two FALSE claims in the audit record (the serious ones)

1. **The stated proof of the WFG anomaly was false.** The parser header *and the generated artifact*
   justified "index 6 is the ROM's bug, not our rebase" with *"the other nine ground objects land
   EXACTLY filling [0, len-1]"*. They don't — BNK touches only 6 of its 15 points, STB never
   references 3–5. The conclusion holds, but on a different argument: for all nine, min index is
   exactly 0 and max is exactly `len-1`, so an off-by-one in **either** direction breaks on sight. It
   is the endpoints that pin the rebase, not coverage. Corrected everywhere, and now **asserted** —
   the old test only checked `0 <= i < len`, which is strictly weaker than what its comment claimed.
   *A false justification in an audit tool's own header is the exact sin this epic exists to correct.*

2. **Six objects drop an anchor, not four.** My comment said index 0 is the anchor "only on the four
   objects that share GND's table". **WGA has its own `.P 0,0,0`** (WSOBJ.MAC:580), passed to WGB via
   `.WPZ2`. The code was always right (`anchorDropped` is data-driven) — but the comment was a live
   trap, and mutation proved it: hardcoding that four-name set passed the *entire* suite while
   silently shifting every WGA/WGB edge by one.

### Five mutants that survived the old suite — now killed

| Mutant | Before | After |
|---|---|---|
| Drop PORT's + STB's last stroke at `ENDPLOT` | 0 fail | **13 fail** |
| Dropped-anchor `throw` → silent skip | 0 fail | **1 fail** |
| Hardcode the four GND names in the rebase | 0 fail | **5 fail** |
| `inRangeEdges` drops its `i >= 0` half | 0 fail | **1 fail** |
| `pairOne` stops filtering the PORT side | 0 fail | **1 fail** |

**PORT and STB had no exact oracle** — the two objects sw5-4 and sw5-5 consume, both pinned at `{0,0}`
by the vertex guard. A mis-parsed stroke would have propagated into the next two stories invisibly.
Both now transcribe exactly, including the two strokes that **straddle a `MOVD`** colour change: the
beam does not break across one, and a naive "MOVD ends the stroke" reading would have silently dropped
edges `[7,6]` and `[3,2]` from the exhaust port.

### My own finding: the sheet was hiding the anomaly

The contact sheet filtered WFG's out-of-range strokes (correct — they'd stroke `vertices[6] ===
undefined`) but said **nothing**, and showed `E:7` for a 9-stroke routine. This tool's own header says
it frames both halves on the ROM's bounding sphere so mismatches "stay VISIBLE instead of being
normalized away" — and I had normalized away the one anomaly the story discovered. The cell now reads
"2 edges out of range". I checked it in the browser: my first wording overran the half-width column and
was truncated mid-word, so it is deliberately terse.

### Also hardened

- `.WGD` open at EOF now throws instead of shipping a truncated routine (the parser already guarded
  unterminated `.IF` — the omission was asymmetric).
- The AC-7 honesty test went **vacuous** the moment all 24 objects gained a draw list (`if
  (!hasDrawList)` — 0 of 24 could trigger it). Replaced with the biconditional, which also closes a
  real hole: `.WGD` sets `hasDrawList` at the header line, so a body compiled out by a false `.IF`
  would otherwise ship as "has a draw list" with zero edges.
- `.WGD2` refuses to alias a routine whose anchor state differs from its own — the shared index array
  cannot be correct for both.

### Rule compliance (lang-review javascript)

Rule #1 (silent error swallowing) is the theme of this story and is now enforced in four places
(unknown macro, unknown directive, unterminated routine, anchor-draw). Rule #4 (falsy zero) is covered
by the WPN oracle and the anchor-state pin. #2/#3/#5/#6/#7 have no surface in a synchronous text
parser. No `any`, no unsafe casts in the TS diff.

### Not fixed (deliberate, non-blocking)

- The bake caveat tests assert on prose fragments, not behaviour. Weak, but the *behaviour* they
  describe is pinned by the WFG tests in both repos.
- `ModelPair.rom.edges` is still raw — the two consumers filter at their call sites. Contained today
  (romCompare is the only importer) and documented in the artifact header; a third consumer would need
  to remember. Worth folding into the type if a third appears.

**Handoff:** To Winston (SM) for finish. **Two blocking items for SM in Delivery Findings:** the story's
`repos:` field omits star-wars, and both repos need PRs (the orchestrator's `main` is hook-protected
despite CLAUDE.md calling it trunk-based).

## Delivery Findings

### TEA (test design)

- **Branches (both repos, created by TEA — the session's "trunk-based, branching skipped" is stale):**
  the pf branch-protection hook BLOCKS commits to the orchestrator's `main`, despite CLAUDE.md calling
  the orchestrator trunk-based. So RED landed on a feature branch in each repo, and Dev must continue on
  both:
  - orchestrator: `feat/sw5-1-wgd-ground-object-edges` (off `main`) — commit `05ae15f`
  - star-wars:    `feat/sw5-1-wgd-ground-object-edges` (off `origin/develop`) — commit `bd9ea45`

- **Gap** (blocking): the story's `repos:` field says `orchestrator`, but two ACs land in the
  **star-wars** repo — AC-8's re-bake writes `star-wars/src/tools/romModels.generated.ts`, and AC-9's
  punch-list pin is `star-wars/tests/tools/romCompare.test.ts`. Affects `sprint/epic-sw5.yaml`
  (`repos:` should be `orchestrator, star-wars`) and the branch plan: star-wars is gitflow, so Dev
  needs a `feat/` branch off `origin/develop` there in addition to the orchestrator's trunk commit.
  *Found by TEA during test design.*

- **Gap** (blocking): `star-wars/src/tools/contactSheet.ts:105` renders every `hasDrawList: true` ROM
  object as `kind: 'edges'` and strokes `vertices[i]` per edge index. The moment WFG flips to
  `hasDrawList: true` it carries edges `[5,6]` and `[6,3]` into a **6-vertex** array, so `vertices[6]`
  is `undefined` and the contact sheet will stroke NaN coordinates (or throw). It must filter
  out-of-range edges the way `romCompare.ts` already filters degenerate self-edges. Affects
  `star-wars/src/tools/contactSheet.ts` (and any future edge consumer). *Found by TEA during test design.*

- **Conflict** (resolved): AC-6 ("every emitted edge index lands within `[0, vertices.length-1]` for
  all 24 objects") and AC-8 ("all 10 objects flip to `hasDrawList: true`") cannot both hold literally —
  WFG's ROM routine indexes a point that does not exist. Put to the user, who chose
  **transcribe-and-document**. AC-6's wording should be amended to enumerate the WFG exception.
  Affects `sprint/epic-sw5.yaml` (AC-6). *Found by TEA during test design.*

- **Improvement** (non-blocking): the design spec's object table
  (`docs/superpowers/specs/2026-07-12-wgd-ground-object-edges-design.md`) lists `WFG` as
  *"(alias of `WFF`)"*. That is true of its **vertices** (`.WPZ2 WFG`, WSOBJ.MAC:617) but **false of its
  draw routine** — WFG has its own `.WGD WFG` body (WSOBJ.MAC:1830-1850) stroking a genuinely different
  path (it adds the phantom point-6 leg and a blank move; WFF has 7 edges, WFG has 9). An implementer
  following the design table would alias WFG to WFF and silently ship the wrong edges. A test now pins
  the difference. *Found by TEA during test design.*

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **WFG's out-of-range ROM stroke is transcribed, not clamped — AC-6 gains one enumerated exception**
  - Spec source: `sprint/epic-sw5.yaml`, sw5-1 AC-6
  - Spec text: "Every emitted edge index lands within [0, vertices.length-1] for all 24 objects. This is
    the guard on the anchor rebase — a uniform off-by-one would yield a plausible, wholly wrong wireframe."
  - Implementation: the invariant is enforced across all 24 objects with exactly ONE enumerated
    exception. WFG's routine (`WSOBJ.MAC:1844`, `DRAWTO 6,3`) indexes point 6 of a 6-point table
    (0..5, shared from WFF); its edges `[5,6]` and `[6,3]` are transcribed verbatim and documented in
    the generated artifact's header. Any OTHER out-of-range object fails the test.
  - Rationale: this is an out-of-bounds read in the 1983 ROM itself, not a parser error — at runtime it
    reads a stale 7th slot of the transform scratch page. Proof it is not our off-by-one: the other
    nine ground objects land EXACTLY filling `[0, len-1]`, which is the same evidence that proves the
    −1 anchor rebase correct. Suppressing or clamping it would editorialize ROM truth; the codebase's
    standing precedent (RTH's degenerate self-edge `[20,20]`, kept and documented, filtered by
    consumers) is to transcribe and warn. Put to the user before any test was written; they chose this.
  - Severity: major
  - Forward impact: AC-6's wording needs amending; every consumer that indexes `vertices[i]` must
    filter out-of-range edges (see the blocking contactSheet finding above).

- **AC-9's three new punch-list pairs pin a BLOCKED diff, not a drift count**
  - Spec source: `sprint/epic-sw5.yaml`, sw5-1 AC-9
  - Spec text: "The contact sheet's punch-list regression pin covers 8 compared pairs (was 5), gaining
    PORT, STB and BNK."
  - Implementation: the pin does gain PORT/STB/BNK, but each asserts the verdict
    `'vertices differ — edge diff not meaningful'` alongside `{onlyInRom: 0, onlyInPort: 0}` — not a
    drift count.
  - Rationale: `pairOne`'s vertex-mismatch guard correctly refuses to diff edges when the two vertex
    arrays disagree, and they still do (ROM PORT is 12 verts vs the port's 8; STB 15 vs 12; BNK 15 vs
    6). Edge indices into different vertex arrays are not comparable. sw5-4 and sw5-5 are what fix the
    vertices; only then do these become real edge diffs. Pinning a bare `{0, 0}` would read as
    "no drift — all good", which is precisely the dishonesty this tool exists to prevent.
  - Severity: minor
  - Forward impact: sw5-4 (PORT) and sw5-5 (STB/BNK) must update this pin to real drift counts — its
    failure at that moment is intended, not a regression.

- **Added invariant beyond the ACs: no ConnectOp may carry a negative point**
  - Spec source: `docs/superpowers/specs/2026-07-12-wgd-ground-object-edges-design.md`, "Anchor / index base"
  - Spec text: "The `.WGD` indices must be rebased identically — and this must be verified, not assumed,
    because a uniform off-by-one would produce a plausible, wholly wrong wireframe."
  - Implementation: tests additionally require that `PLOT 0` on the four anchor-dropped objects
    (GND/TWR/BNK/STB) emits NO ConnectOp, rather than `{point: -1, draw: false}`.
  - Rationale: the ACs constrain EDGE indices only, so a `point: -1` would technically pass today —
    `PLOT` is pen-up and is followed by another pen-up in all four objects, so no edge forms from it.
    That is luck, not design: one future `DRAWTO` from the anchor would emit edge `[-1, x]`. The anchor
    is metadata in the vertex table, so a pen-up move to it is metadata in the beam path. Verified that
    no `.WGD` routine ever DRAWS to a dropped anchor.
  - Severity: minor
  - Forward impact: none.