---
story_id: "ml2-3"
jira_key: "ml2-3"
epic: "ml2"
workflow: "tdd"
---
# Story ml2-3: RAM-colour palette seam (the divergence from centipede): decode the palette from MAME milliped.cpp COLOR-RAM wiring (MLIRQ.MAC:242 CLRCH), NOT a resistor-DAC PROM. Pin the palette source as claims; cite milliped.cpp in prose, never copy (GPL).

## Story Details
- **ID:** ml2-3
- **Jira Key:** ml2-3
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-12T17:20:29Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-12T16:55:46Z | 2026-08-12T16:57:08Z | 1m 22s |
| red | 2026-08-12T16:57:08Z | 2026-08-12T17:06:18Z | 9m 10s |
| green | 2026-08-12T17:06:18Z | 2026-08-12T17:09:26Z | 3m 8s |
| review | 2026-08-12T17:09:26Z | 2026-08-12T17:16:42Z | 7m 16s |
| green | 2026-08-12T17:16:42Z | 2026-08-12T17:19:19Z | 2m 37s |
| review | 2026-08-12T17:19:19Z | 2026-08-12T17:20:29Z | 1m 10s |
| finish | 2026-08-12T17:20:29Z | - | - |

## Sm Assessment

Setup complete for ml2-3 (5pt, tdd, arcade, epic ml2 — first implementation
story after the ml1 study). Session file, story/epic context, and branch
`feat/ml2-3-ram-colour-palette-seam` (cut from develop, gitflow) in place;
sprint YAML updated to in_progress. Jira skipped — not enabled.

Coordination notes for downstream agents:

- **Title-only story: the title is the spec.** The palette seam must decode
  from MAME milliped.cpp's COLOR-RAM wiring (millipede writes colours to RAM —
  the divergence from centipede's resistor-DAC PROM), anchored to the vendored
  quarry at MLIRQ.MAC:242 (CLRCH). TEA should re-verify that citation against
  `reference/original-source/millipede/` before pinning anything to it.
- **GPL is a hard boundary:** milliped.cpp facts are derived and cited in
  PROSE; no MAME code is ever transcribed. ml1-4's `board-facts.md` + its
  audit suite (`plugins/millipede/tests/audit/`) are the established precedent
  for recording and guarding MAME-derived facts — follow that shape.
- The ml1 dossier (brief, glossary, subsystems, open-questions, board-facts)
  is the citation ground; ml1-4 merged to develop today (f39d87e4).
- No file-sharing/sequencing constraints with any in-flight story (jt11-4 is
  in_review on joust; millipede is untouched by it).

Routing: tdd is phased; next agent is TEA (Tyr One-Handed) for RED.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings.

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

2 deviations

- **Per-slot semantics and the CLRCH table walk are not behaviour-tested**
  - Rationale: the title asks for the SEAM (the decode) plus the source pinned
  - Severity: minor
  - Forward impact: the ml2 render story must transcribe the slot semantics
- **`decodeColourByte` API pinned by TEA**
  - Rationale: smallest honest surface; the weights/bit-assignments are pinned
  - Severity: minor

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->
### TEA (test design) — Delivery Findings

- **Improvement** (non-blocking): the sprite colour-code INDIRECTION (bank bits
  7-6, per-pen colour selects — the "unusual" one-by-one law MAME documents in
  the same comment block) is the render-side consumer of this seam and is NOT
  tested here; when the ml2 sprite-render story lands it needs its own law
  suite. Affects a future ml2 story (file it when sprites arrive).
  *Found by TEA during test design.*
- **Question** (non-blocking): the story title says "milliped.cpp" but ml1-4
  already measured that no standalone milliped.cpp exists — Millipede lives in
  MAME's centipede driver family, and the palette handler/wiring comment are in
  centiped_v.cpp. The suite pins centiped_v.cpp citations accordingly.
  Affects nothing (title archaeology; the intent is unambiguous).
  *Found by TEA during test design.*

### TEA (test design) — Design Deviations

- **Per-slot semantics and the CLRCH table walk are not behaviour-tested**
  - Spec source: story title (session file)
  - Spec text: "decode the palette from MAME COLOR-RAM wiring... Pin the
    palette source as claims"
  - Implementation: the suite pins the byte→RGB wiring law exhaustively (all
    256 bytes swept for the green ceiling) and pins CLRCH + the 99$ table as
    CLAIMS, but does not simulate CLRCH's per-level slot writes (ANCOL+5 =
    inside-of-mushroom etc.) as behaviour
  - Rationale: the title asks for the SEAM (the decode) plus the source pinned
    as claims; the slot map is the consumer side and belongs to the render/sim
    stories that will read this seam — testing it now would invent an API
    those stories haven't designed
  - Severity: minor
  - Forward impact: the ml2 render story must transcribe the slot semantics
    from the same CLRCH lines the claims now quote
- **`decodeColourByte` API pinned by TEA**
  - Spec source: story title
  - Spec text: "decode the palette from... COLOR-RAM wiring"
  - Implementation: tests fix the seam as `decodeColourByte(data: number):
    {r,g,b}` in `src/core/palette.ts`, throwing on non-byte input
  - Rationale: smallest honest surface; the weights/bit-assignments are pinned
    through behaviour (per-line probes + additivity + the 0xDE green ceiling
    sweep), not through exported constants, so Dev's internals stay free
  - Severity: minor
  - Forward impact: none

## TEA Assessment

**Tests Required:** Yes
**Reason:** 5-point feature story opening the plugin's pure core; the title is
the spec and both its citations were re-verified against ground truth this
session (CLRCH at MLIRQ.MAC:242 confirmed; the MAME palette code measured to
live in centiped_v.cpp:311-390 — the vendored ~/Projects/mame tree was read for
DERIVATION only, nothing copied).

**Test Files:**
- `plugins/millipede/tests/palette.test.ts` — the wiring law: active-low
  (0xFF→black), the hardware white (0x00→(255,222,255) — green's two-line 0xDE
  ceiling is the fingerprint), the source's own RED corroborator (0x1F,
  MLIRQ.MAC:294), one-driven-line probes for all 8 lines at weights
  0x21/0x47/0x97, additivity, channel independence, an exhaustive 256-byte
  green-level sweep, byte guards, module-existence + dual-citation pins, and 5
  standing GPL sweeps banning MAME's distinctive decode tokens plugin-wide
  (green today by design — guards, not RED).
- `plugins/millipede/tests/audit/palette-claims.test.ts` — the palette source
  pinned as claims: claims/06-colour-ram-palette.json exists, ≥8 claims inside
  the CLRCH fence (MLIRQ.MAC:242-315), the RED/WHITE corroborators claimed at
  :294/:297, vendored-.MAC-only sources (no .cpp — GPL), and a narrow
  byte-reopen of every verbatim against the quarry.

**Tests Written:** 30 (25 RED + 5 standing guards) covering 4 ACs
**Status:** RED (25 failing, every failure the self-describing "not built yet"
path — verified by testing-runner RUN_ID ml2-3-tea-red: 134 others passing,
lint clean). Committed and pushed on feat/ml2-3-ram-colour-palette-seam.

### Rule Coverage

| Rule (lang-review/typescript) | Test(s) | Status |
|------|---------|--------|
| #1 type escapes | suite is cast-free; loader uses runtime-assembled specifier (the ml1-1 idiom), no @ts-ignore | n/a (rubric) |
| #4 null/undefined | byte guards (AC-3: -1/256/1.5/NaN all throw) | failing→green |
| #5 ESM specifiers | extensionless dossier-sweep import matches the audit suite's own convention; lint clean | passing |
| #11 error handling | loader converts module-absence into a self-describing error, never a collect crash | passing today |
| #18 test apparatus | expected values SPELLED from the weight constants in the test's own voice, not copied tables; GPL sweep exempts only itself | by construction |
| core purity | palette.ts lands in src/core → ml1-1's dormant per-file sweep auto-activates on it | armed |

**Rules checked:** 4 of 4 applicable have coverage; `.claude/rules/`/`SOUL.md`
absent in this repo.
**Self-check:** 0 vacuous assertions; the GPL guards that pass today are
deliberate standing guards with a named self-exemption, and every RED failure
names the file Dev must ship.

**Handoff:** To Dev (Loki Silvertongue) for GREEN. Ship: (1)
`src/core/palette.ts` — pure decodeColourByte per the header's derived law,
citing MLIRQ.MAC:242 and centiped_v.cpp:311-360 in prose; (2)
`docs/rom-study/claims/06-colour-ram-palette.json` — GENERATE the verbatims
from the vendored file (the ml1-2 sidecar lesson: never hand-type), ≥8 claims
in the CLRCH fence including :294/:297; the existing citations gate enrols the
file automatically. Do NOT transcribe any MAME code — the GPL sweeps name the
tokens that will redden.
### Dev (implementation) — Delivery Findings

- No upstream findings during implementation.

### Dev (implementation) — Design Deviations

- No deviations from spec: the module implements exactly the TEA-pinned seam
  (decodeColourByte, RangeError guard) with the law derived independently
  (line-mask summing over a WEIGHTS/LINES table — deliberately not MAME's
  inverted-shift shape, which the GPL sweeps ban); the claims file was
  generated from the vendored quarry per the ml1-2 sidecar rule.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/millipede/src/core/palette.ts` - the pure decode seam (first
  src/core module; ml1-1's purity sweep auto-activated on it and passes)
- `plugins/millipede/docs/rom-study/claims/06-colour-ram-palette.json` - 10
  generated claims (PAL-1..PAL-10) pinning CLRCH, slot writes, the 99$ table
  opener, and the RED/WHITE corroborators; one generation slip (PAL-10
  initially quoted the row AFTER the CENTIN=1 opener) caught by re-reading the
  quoted line against its prose before commit and fixed to :304

**Tests:** 160/160 millipede (30 story tests GREEN incl. 5 standing GPL
guards), 478/478 orchestrator, lint clean, 53/53 claims byte-verified -
testing-runner RUN_ID ml2-3-dev-green.
**Branch:** feat/ml2-3-ram-colour-palette-seam (pushed, f6664f19)

**Handoff:** To Heimdall (Reviewer) for review.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (160+478 green, lint clean, 53/53 claims, no smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Covered by Reviewer mutations M1-M3 (weights, claims byte, channel swap — all killed) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Covered by Reviewer: loader converts absence to a loud error; guards throw; no fallbacks in the diff |
| 4 | reviewer-test-analyzer | Yes | findings | 2 | confirmed 2 (GPL self-exemption — mutation-proven; PAL-4 prose overreach) |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1 (fence comment misstates the 99$ table extent — table runs to :351) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | rule-checker swept types: readonly/module-private constants compliant |
| 7 | reviewer-security | Skipped | disabled | N/A | no input surface; GPL/licence risk IS the security surface here and is covered by F1 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Reviewer: 81-line pure module, no complexity to flag |
| 9 | reviewer-rule-checker | Yes | findings | 3 | confirmed 1 (tautological weights-sum assert), noted 2 (JSON.parse cast = existing convention; whole-file citation toMatch — low, no decoy exists) |

**All received:** Yes (4 enabled returned, 5 disabled and covered)
**Total findings:** 4 confirmed, 0 dismissed, 2 noted (with rationale)

### Rule Compliance

Rule-checker swept 30 rules over 52 instances (its full table is in the review
transcript): compliant on type-safety, readonly/private constants, null
handling, purity (scanner re-run confirmed green on palette.ts), claims schema
(hand-verified byte-exact via awk), and the GPL derivation (implementation
shape independently confirmed distinct from MAME's). Violations: #10
JSON.parse-as-cast (matches the pre-existing loadClaims convention — noted,
accepted), #25 whole-file positive toMatch (no decoy today — noted), #26
tautological assert (F4 below — fix).

### Devil's Advocate

Assume this diff is wrong. The deepest risk is licence, not colour: the story's
whole reason for a GPL sweep is that MAME text tends to migrate into ports one
"helpful example" at a time. The sweep's self-exemption is exactly where that
happens — the one file a future contributor is MOST likely to paste MAME code
into (to write a new banned-token test!) is the one file the sweep cannot see.
The test-analyzer proved it live: a planted set_pen_color(x) in the guard file
survives the suite. Second: claims that byte-verify but mis-teach. PAL-4 tells
the next engineer the 99$ stride is 12 from a line that shows no arithmetic; if
the true stride were ever mis-stated the gate would never notice (the exact
citation-gate-checks-quotes-not-meaning failure mode this repo has been burned
by). Third: the fence comment claims the colour table ends inside :315 when it
runs to :351 — the next claims author who trusts it will fence out CENTIN=4..12
and believe they covered everything (the table-continuation trap, again a
documented burn). Fourth: could the DECODE itself be wrong? I attacked it three
ways (weight flip, channel swap, claims byte) and the suite killed each; the
MAME wiring was re-read from the actual vendored tree by two independent
readers this review; the 1982 source's own RED/WHITE comments corroborate. The
decode survives. The guards around it need the four fixes.

## Reviewer Assessment

**Verdict:** APPROVED (round 2)

**Round-2 verification (independent — no Dev claim trusted):**
- [TEST] F1 CLOSED: my own planted set_pen_color token inside the guard file
  now fails exactly 'the pen writer appears nowhere in the plugin' (was
  invisible in round 1). The sweep exempts NO file; identifier tokens are
  concat-built so the guard cannot self-match. Restored, clean tree re-run.
- [DOC] F2 CLOSED: PAL-11 quotes MLIRQ.MAC:262 — the ROM's own ';12* INDEX'
  comment — so the stride is byte-verified; PAL-4's prose now states only what
  its quoted line shows. 11 claims, all verified by the citations gate.
- [DOC] F3 CLOSED: the fence comment states the true table extent (:304-:351,
  CENTIN 1..12, .PAGE at :352 — extents measured by comment-analyzer and
  re-checked by me) and names the narrow fence as deliberate.
- [RULE] F4 CLOSED: the tautological weights-sum assert is gone (grep 0); the
  full-channel sum is proven through decode(0x1F).r === 0xff.
- Clean tree: millipede 160/160 (8 files), lint clean, 54 claims verified.
- Noted items stand as accepted: JSON.parse-as-cast (existing loadClaims
  convention) and the whole-file citation toMatch (no decoy in an 81-line
  module).

**Data flow traced:** colour-RAM byte → decodeColourByte (active-low
line-mask sum over WEIGHTS/LINES) → Rgb; consumers are the named ml2 render
stories (seam-first by the epic's design — not dead code).
**Pattern observed:** the ml1 dossier discipline extended to executable code:
claims byte-verify the primary source, MAME rides as prose, and the GPL sweep
now has no blind spot (plugins/millipede/tests/palette.test.ts AC-4).
**Error handling:** decodeColourByte fails closed on every non-byte
(RangeError; Number.isInteger rejects NaN/Infinity), pinned by AC-3.
**Handoff:** To Baldur the Bright (SM) for finish-story. No routed leftovers —
every finding was fixed or explicitly accepted in-round.

## Reviewer Assessment — round 1 (REJECTED, superseded by round 2 above)

**Verdict (round 1):** REJECTED

Round 1. The implementation is correct and licence-clean TODAY — the decode was
mutation-tested three ways and the wiring law independently re-derived from
both sources. What blocks is that the story's own acceptance ("never copy —
GPL") is guarded by a sweep with a mutation-proven blind spot, and one claim
plus one comment mis-teach the source in ways this repo's own memory says
compound later.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] F1 [TEST] | The GPL sweep exempts the WHOLE of palette.test.ts, so MAME code pasted anywhere in that file is invisible to the guard whose job is exactly that (mutation-proven by test-analyzer: a planted set_pen_color(x) survives green). | plugins/millipede/tests/palette.test.ts (AC-4 walk) | Narrow the exemption: strip only the BANNED-array declaration span (or move the banned literals to a tiny exempted fixture) and sweep the rest of the file like every other. Re-run the analyzer's planted-token mutant — it must redden. |
| [MEDIUM] F2 [DOC] | PAL-4's prose asserts "indexed 12 bytes per level" but its quoted line (:264, a bare indexed load) shows no stride; the arithmetic that establishes 12x lives uncited at :256-262. A wrong stride number would byte-verify forever. | claims/06-colour-ram-palette.json (PAL-4) | Add a claim quoting the stride line that carries the ROM's own ";12* INDEX" comment (:261) and scope PAL-4's prose to what :264 shows. |
| [LOW] F3 [DOC] | The claims-fence comment says the 99$ table "sits well inside" [242,315]; the table actually runs to :351 (CENTIN=12). False extent prose — the table-continuation trap verbatim. | plugins/millipede/tests/audit/palette-claims.test.ts:27-30 | Correct the comment: state the true extent (:304-:351) and that 315 is a deliberate narrow fence covering this story's claims. |
| [LOW] F4 [RULE] | expect(LOW+MID+HIGH).toBe(0xff) is arithmetic over test-local consts — no mutant can kill it; it reads as coverage beside a real assertion. | plugins/millipede/tests/palette.test.ts:131 | Delete it or restate through production output (decode(0x1F).r already proves the full-channel sum). |
| [LOW] noted [RULE] | JSON.parse(...) as Claim[] without runtime schema check — mirrors the unchanged loadClaims() convention; repo-local fixture, not input. | palette-claims.test.ts:75,88 | Accepted as existing convention; no action this story. |
| [LOW] noted [RULE] | Whole-file positive toMatch for the two citation pins — no decoy exists in the 81-line module today. | palette.test.ts:107-114 | Accepted; revisit only if palette.ts grows another citation-bearing region. |

**Observations (beyond the table):**
- [VERIFIED] The decode law is faithful: re-read from /Users/slabgorb/Projects/mame
  centiped_v.cpp:311-360 by the comment-analyzer AND the rule-checker
  independently; corroborated by the vendored source's own RED (:294) and
  WHITE (:297) comments; my mutations M1 (weight), M3 (channel swap) each
  killed by 7-9 tests. Complies with the GPL rule (shape verified distinct).
- [VERIFIED] All 10 claims byte-match the quarry (three independent checks:
  the story's own reopen test, check-citations.mjs, and the rule-checker's awk
  pass); 9 of 10 prose meanings verified faithful (the 10th is F2).
- [VERIFIED] Purity: palette.ts enters ml1-1's scanner sweep and passes
  (rule-checker re-ran the purity suite in isolation, 14/14).
- [VERIFIED] Data flow: colour-RAM byte → decodeColourByte → Rgb; no consumer
  yet BY DESIGN (seam-first, the epic's gate-before-constants shape; the ml2
  render stories are the named consumers — not a dead-code finding).
- [EDGE][VERIFIED] Guards fail closed on -1/256/1.5/NaN (AC-3, plus
  Number.isInteger rejects Infinity).

**Handoff:** Back to Loki Silvertongue (Dev) for F1-F4 (F1 blocking; F2-F4
in-round). Re-run the planted-token mutant after F1 — it must redden.

### Reviewer (audit) — Design Deviations

- **TEA: per-slot semantics / CLRCH table walk not behaviour-tested** → ✓
  ACCEPTED by Reviewer: the seam-first scope is the epic's own shape; the
  claims quote the slot lines so the render story inherits pinned ground.
- **TEA: decodeColourByte API pinned by TEA** → ✓ ACCEPTED by Reviewer:
  smallest honest surface, weights pinned through behaviour not constants —
  and the mutation battery confirms the pins have teeth.

### Reviewer (code review) — Delivery Findings

- **Gap** (blocking): the GPL sweep cannot see its own file — a planted MAME
  token in palette.test.ts survives green (F1).
  Affects `plugins/millipede/tests/palette.test.ts` (narrow the exemption).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): PAL-4 stride prose unbacked by its quote
  (F2), the fence comment misstates the 99$ table extent (F3), one
  tautological assert (F4) — all in-round fixes.
  Affects `claims/06-colour-ram-palette.json`, `palette-claims.test.ts`,
  `palette.test.ts`.
  *Found by Reviewer during code review.*
## Dev Assessment (round 2 — review fixes)

**Implementation Complete:** Yes (F1-F4 all fixed; the two noted items were
accepted as-is by the Reviewer)
**Files Changed:**
- `plugins/millipede/tests/palette.test.ts` - F1: no file exempt from the GPL
  sweep; identifier tokens concat-built so the guard cannot self-match. F4:
  tautological assert removed (full-channel sum proven via decode(0x1F).r).
- `plugins/millipede/docs/rom-study/claims/06-colour-ram-palette.json` - F2:
  PAL-11 quotes MLIRQ.MAC:262 (the ROM's own ';12* INDEX' comment); PAL-4
  scoped to its quoted line. 11 claims now, 54 verified repo-wide.
- `plugins/millipede/tests/audit/palette-claims.test.ts` - F3: fence comment
  states the true table extent (:304-:351) and the deliberate narrow fence.

**Mutation evidence (Reviewer's kill condition):** a planted banned token
inside the guard file itself now fails 'the pen writer appears nowhere in the
plugin' (was invisible before F1). Verified against the COMMITTED fix.

**Tests:** 160/160 millipede, lint clean, 54/54 claims verified.
**Branch:** feat/ml2-3-ram-colour-palette-seam (pushed, cbd9b6ab)
**PR:** #285 https://github.com/slabgorb/arcade/pull/285


**Handoff:** Back to Heimdall (Reviewer) for round 2.