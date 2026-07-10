---
story_id: "rb2-2"
jira_key: ""
epic: "rb2"
workflow: "trivial"
---
# Story rb2-2: Transcribe biplane connect-lists

## Story Details
- **ID:** rb2-2
- **Jira Key:** N/A (local sprint tracking only)
- **Workflow:** trivial
- **Type:** chore
- **Points:** 2
- **Stack Parent:** none
- **Branch Strategy:** gitflow (feat/rb2-2-biplane-connect-lists)

## Story Summary

Transcribe biplane connect-lists (DB.MAP/DB.MAR/DB.LNS + BLANKV/VSBLEV opcode semantics) and prop/explosion/blimp picture-lists from 037007.XXX into a TS topology module. This corrects fidelity-doc gap #1 by confirming that the picture-ROM source IS PRESENT but was misnamed .XXX files, not absent.

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-07-10T12:22:04Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-10T11:49:05Z | 2026-07-10T11:51:09Z | 2m 4s |
| implement | 2026-07-10T11:51:09Z | 2026-07-10T12:08:47Z | 17m 38s |
| review | 2026-07-10T12:08:47Z | 2026-07-10T12:22:04Z | 13m 17s |
| finish | 2026-07-10T12:22:04Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Conflict** (non-blocking): The rb2 epic-context constraint #2 states this transcription set totals "346 connect opcodes"; the source-verified total for the enumerated biplane + prop/explosion/blimp/star lists is **287** (24+43+17 plane · 7×3 prop · 27+40+13 explosion · 11+13 star · 78 blimp). The 346 figure appears to sweep in the out-of-scope ground-wave mountain decode lists (`SMAP`/`SMP`/`SLAP` = 88 more opcodes) or is a rounded rb1-2 estimate. Affects `sprint/context/context-epic-rb2.md` (constraint #2 — the count should read ~287 for the plane/prop/explosion/blimp/star set, or be clarified as "incl. mountains"). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): The verifying test value-pins only ~4% of the transcribed data (12/287 opcodes; ~6 of 131 vertices). DBLIMP (78 ops), PCDEC0/1/2, DESTR0/1, PPROPB/C have zero op-level value assertions — only counts + a self-referential round-trip + an in-range bound, none of which detect a wrong-but-in-range index swap (V(29)→V(28)). The data is verified byte-for-byte correct today (two independent audits), so this is regression-protection, not a live defect. Affects `red-baron/tests/core/topology.test.ts` (add full-literal `toEqual` pins per list/point-set — the ROM values are finite and known; rb2-3 will edit/consume this module and should land ahead of it). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Two test comments overclaim coverage — the round-trip case (`topology.test.ts:63`) lives in the "fidelity" suite but proves only that encodeOp/decodeOp are mathematical inverses; the in-range case comment (`topology.test.ts:181-183`) says it "catches a mis-transcribed index that a length check would miss" but only bounds the range (an in-range swap passes). Correct the comments to state what they actually verify. Affects `red-baron/tests/core/topology.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `OP_SEGMENT` (flag 4) and the `decodeOp(ENDDB=0xFF)` boundary are untested; `decodeOp` also collapses a hypothetical SEGSTR byte to `{draw:false}` (identical to BLANKV) rather than signalling — latent, not exercised by any data in this module (no SEGSTR/mountain lists here). Add an edge test + document the flag-collision when a consumer (rb2-3 raw-byte walk) needs it. Affects `red-baron/src/core/topology.ts:70-73` + tests. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The 27 ROM-data consts use `readonly` typing but not `Object.freeze()`; sibling `src/core/flight.ts` freezes its ROM tables for runtime immutability (though `camera.ts` does not — not a stated house rule). Consider `Object.freeze` on this canonical, multi-consumer data. Affects `red-baron/src/core/topology.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Transcribed star-burst debris (STAR0/1 + DESTR0/1), COLLD collision points, and each picture's vertex point-set, beyond the title's literal "prop/explosion/blimp".**
  - Spec source: context-story-rb2-2.md (title) + context-epic-rb2.md constraint #2
  - Spec text: story title says "prop/explosion/blimp picture-lists"; epic constraint #2 enumerates "plus BLIMP/DBLIMP, PIECE0-3 (explosion debris), DBPROP (prop), STAR0/1, COLLD"
  - Implementation: also transcribed STAR0/1+DESTR0/1 (star-burst debris) and COLLD_POINTS, and included the vertex point-sets (DBPROP/PIECE0-3/STAR0-1/BLIMP) that the connect-lists index
  - Rationale: the higher-authority epic context explicitly lists STAR0/1 and COLLD in the transcription set; a connect-list is unusable without its point-set, and rb2-3/rb2-6/rb2-10 must draw "authentic geometry, not stand-ins" — so each picture ships as a self-contained {points, connect} unit. Biplane vertices are the one exception (they live in program-ROM RBARON.MAC, not 037007.XXX), so the plane entry is connect-lists only, documented.
  - Severity: minor
  - Forward impact: minor — downstream render/explosion/blimp stories get a complete module; no sibling assumption is broken (additive only)

### Reviewer (audit)
- **Dev's inclusion of STAR0/1+DESTR0/1, COLLD, and the vertex point-sets** → ✓ ACCEPTED by Reviewer: sound and in-scope. Epic constraint #2 explicitly enumerates STAR0/1 and COLLD in the transcription set, and a connect-list is inert without its point-set. My independent audit re-derived every added point-set (DBPROP 14, COLLD 4, PIECE0-3 14/23/9/9, STAR0/1 10/12, BLIMP 36) directly from `037007.XXX` and confirmed exact coordinate matches — the additions are faithful, not invented. Biplane-vertices-excluded is correct (they live in program-ROM RBARON.MAC). No undocumented deviations found: the diff matches the source and the logged deviation.

## Sm Assessment

Setup complete and verified. Routing to Dev for the implement phase.

- **Workflow:** trivial (phased: setup → implement → review → finish). 2-pt chore — a data transcription, not a feature. No RED/GREEN TDD ceremony required; Dev implements directly with a verifying test.
- **Repo:** red-baron only. Branch `feat/rb2-2-biplane-connect-lists` cut off `develop` (PRs target develop). No open PRs, clean tree — merge gate clear.
- **Jira:** none. This cabinet tracks locally in `sprint/` YAML; Jira field intentionally empty.
- **Scope for Dev:** transcribe the biplane connect-lists (DB.MAP/DB.MAR/DB.LNS with BLANKV/VSBLEV opcode semantics) and the prop/explosion/blimp picture-lists from `037007.XXX` into a TS topology module in `red-baron/src/core`. Then correct fidelity-doc gap #1 — the picture-ROM source is PRESENT (misnamed `.XXX`), not absent. Prior recon already located the source and closed the "gap" investigation; this story lands the transcription.
- **Definition of done:** topology module exports the connect-lists/picture-lists with a test asserting shape/counts against the ROM listing; fidelity doc updated to retract the "absent picture-ROM" claim; `npm run build && npm test` green in red-baron.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `red-baron/src/core/topology.ts` (new) — the picture-ROM vector topology, transcribed byte-for-byte from `037007.XXX` (= `RBPICS.MAC`): biplane connect-lists `DB_MAP`/`DB_MAR`/`DB_LNS`; prop (`DBPROP_POINTS` + `PPROPA/B/C` + `PROPS`); explosion pieces (`PIECE0-3_POINTS` + `PCDEC0-2` + `PLPCDE` + `EXPLOSION_PIECES`); star-burst debris (`STAR0/1_POINTS` + `DESTR0/1` + `STAR_DEBRIS`); blimp (`BLIMP_POINTS` + `DBLIMP` + `BLIMP_PICTURE`); `COLLD_POINTS`. Opcode semantics as `POINT_STRIDE`/`OP_BLANK`/`OP_VISIBLE`/`ENDDB` + `encodeOp`/`decodeOp`.
- `red-baron/tests/core/topology.test.ts` (new) — verifies opcode encode/decode round-trip, exact source-counted lengths of every list, transcription spot-checks against the `.MAC` listing, the 287-opcode total, and the structural invariant that every connect-op indexes a real vertex in its point-set.
- `red-baron/docs/red-baron-1980-source-findings.md` (edited) — corrected the four stale "picture-ROM source absent" claims (header note, §7, §9 gap #1, §10) and added a rb2-2 changelog entry to §11. Gap #1 is now marked **CLOSED**.

**How the ROM was read:** the connect-lists live in `reference/red-baron/037007.XXX`, whose own header is `.TITLE RBPICS - RED BARON PICTURES` — i.e. it IS `RBPICS.MAC`, misnamed by ROM part number. Every list was transcribed line-by-line and its opcode count verified against the source (`DB.MAP` 24, `DB.MAR` 43, `DB.LNS` 17, `PPROPA/B/C` 7×3, `PCDEC0/1/2` 27/40/13, `DESTR0/1` 11/13, `DBLIMP` 78 → 287 total).

**Tests:** 135/135 passing (GREEN), including ~25 new rb2-2 assertions and the unchanged findings-doc attestation. `tsc --noEmit` + `vite build` clean.

**Branch:** `feat/rb2-2-biplane-connect-lists` (pushed; commit `626fe04`). No PR — SM opens it in the finish phase.

**Deviations:** one minor (added STAR/COLLD/point-sets per epic constraint #2 — see Design Deviations). One Delivery Finding (epic's "346" opcode count vs source-verified 287 — see Delivery Findings).

**Handoff:** To review (Immortan Joe / Reviewer).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — tests 135/135 GREEN, build+tsc clean, no smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — assessed by reviewer (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — assessed by reviewer (see [SILENT]) |
| 4 | reviewer-test-analyzer | Yes | findings | 7 (5 high, 1 med, 1 low) | confirmed 7, dismissed 0, deferred 0 — all non-blocking test-hardening (see [TEST]); data independently verified correct |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — assessed by reviewer (see [DOC]) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — assessed by reviewer (see [TYPE]) |
| 7 | reviewer-security | Yes | clean | none | N/A — pure static data, no attack surface (see [SEC]) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — assessed by reviewer (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | findings | 2 PLAUSIBLE | confirmed 0 violations, 2 noted non-blocking (see [RULE]) |

**All received:** Yes (4 enabled returned, 5 disabled skipped per `workflow.reviewer_subagents`)
**Total findings:** 0 confirmed blocking, 9 confirmed non-blocking (test-hardening + hardening notes), 0 dismissed

## Reviewer Assessment

**Verdict:** APPROVED

Approval rests on the **independently-verified byte-for-byte correctness of the transcription**, not on the test suite's coverage. I re-parsed the ROM source `reference/red-baron/037007.XXX` (which IS `RBPICS.MAC`) and mechanically compared every list against `topology.ts`: all **12 connect-lists (287 opcodes)** and all **9 point-sets (131 vertices)** match the source exactly — byte-for-byte and coordinate-for-coordinate (`scratchpad/verify_transcription.py` → "ALL MATCH ✓"). The reviewer-test-analyzer independently cross-checked the same values against source and concurred ("byte-for-byte correct, no discrepancies"). Two independent audits, zero data discrepancies.

**Data flow traced:** ROM source `037007.XXX` (RBPICS.MAC) connect-list/point bytes → `topology.ts` typed `readonly` consts (`DB_MAP`…`DBLIMP`, `*_POINTS`) → consumed later by rb2-3 (render) / rb2-6 (explosions) / rb2-10 (blimp). No runtime input, no I/O, no DOM — pure deterministic data. Safe: `encodeOp`/`decodeOp` are total functions over their documented domain; the only fixed-data path is compile-time literals (max byte `41*6+1=247`, far inside safe-integer range).

**Pattern observed:** Faithful house-style transcription — file header with ROM citations, per-list line-number references, `B()`/`V()` builders mirroring the `BLANKV`/`VSBLEV` macros, and picture bundles (`EXPLOSION_PIECES`, `STAR_DEBRIS`, `BLIMP_PICTURE`) mirroring the ROM's own pointer tables (`PLPCDE`, `PROPS`). `src/core/topology.ts:1-278`.

**Error handling:** N/A for a pure static-data module — no failure modes, no catches, nothing to swallow. `decodeOp` documents (but does not enforce) the `!= ENDDB` precondition — captured as a non-blocking finding.

### Observations (11)

1. [VERIFIED] Transcription fidelity — INDEPENDENTLY AUDITED. All 12 connect-lists (287 opcodes) + 9 point-sets (131 vertices) re-derived from `037007.XXX` and matched exactly. Evidence: `scratchpad/verify_transcription.py` output "ALL MATCH ✓"; corroborated by reviewer-test-analyzer's independent cross-check. This is the story's core deliverable and it is correct.
2. [VERIFIED] Purity — `topology.ts:1-278` is static data + two total functions; no DOM/time/randomness. Complies with the src/core PURE-deterministic convention (rule-checker ADDITIONAL_RULE A, 0 violations).
3. [VERIFIED] Compile-time immutability — all 27 exported consts + `ConnectOp`/`VectorPicture` fields + `Point3` are `readonly` (rule-checker Rule 2: 31 instances, 0 violations). `topology.ts:38-277`.
4. [SEC] reviewer-security: clean — no eval/Function/dynamic-import/prototype-pollution/ReDoS; no attacker-reachable input path; opcode arithmetic operates only on compile-time literals. Confirmed.
5. [RULE] reviewer-rule-checker: 0 confirmed TS violations across 11 applicable checks. Two PLAUSIBLE non-blocking notes — (a) `decodeOp` collapses a hypothetical `OP_SEGMENT` byte to `draw:false` (latent; no SEGSTR data in this module); (b) ROM consts use `readonly` but not `Object.freeze()` (sibling `flight.ts` freezes, `camera.ts` does not — not a stated rule). Both recorded as non-blocking Delivery Findings.
6. [TEST] reviewer-test-analyzer: data verified correct, but the suite value-pins only ~4% of opcodes (12/287); DBLIMP/PCDEC0-2/DESTR0-1/PPROPB-C have zero op-level value pins; the round-trip test (`topology.test.ts:63`) is a math identity that can't catch an in-range index swap; two comments overclaim coverage; `OP_SEGMENT`/`decodeOp(ENDDB)` untested. All CONFIRMED as real gaps — non-blocking because the data is independently verified correct; recorded as Delivery Findings for rb2-3 to fold in.
7. [DOC] comment-analyzer DISABLED — assessed by reviewer: module comments are unusually strong (per-list ROM line-number citations). The findings-doc gap-#1 corrections are accurate — I verified the `037007.XXX` header literally reads `.TITLE RBPICS - RED BARON PICTURES`. The two overclaiming TEST comments are folded into [TEST].
8. [EDGE] edge-hunter DISABLED — assessed by reviewer: `encodeOp`/`decodeOp` total over their documented domain; the one real boundary (ENDDB/SEGSTR bytes) is captured under [TEST]. Biplane indices bounded ≤41 (42-vertex model, test asserts it); every self-contained picture's indices verified in-range by my audit.
9. [SILENT] silent-failure-hunter DISABLED — assessed by reviewer: no error handling, catches, or fallbacks in a pure-data module — nothing to swallow. N/A.
10. [TYPE] type-design DISABLED — assessed by reviewer: types are sound — `readonly Point3` tuple, `ConnectOp {point, draw}`, `VectorPicture` bundle; `OP_*` as plain consts (not an enum) is idiomatic and rule-compliant; no stringly-typed APIs, no unsafe casts.
11. [SIMPLE] simplifier DISABLED — assessed by reviewer: no over-engineering — `B()`/`V()` builders collapse 287 verbose literals into readable calls; the picture bundles mirror real ROM pointer tables. Appropriately minimal for the story.

### Rule Compliance (TypeScript lang-review checklist)

Exhaustively checked via reviewer-rule-checker + my own read; every applicable rule PASSES:
- #1 Type-safety escapes: 0 `as any`/`as unknown as`/`@ts-ignore`/non-null `!`. PASS.
- #2 Generic/interface + `readonly`: no `Record<string,any>`/`object`/`Function`; all 27 data consts + interfaces + tuple `readonly`. PASS.
- #3 Enum anti-patterns: no enums; `OP_*` plain consts is idiomatic; no switch needing exhaustiveness. PASS (1 latent decodeOp note, non-blocking).
- #4 Null/undefined: no `||`/`??`/`Map.get()`/unguarded destructuring. PASS.
- #5 Module/declaration: `export type` used for the type alias; test's inline `type` imports correct; no `.js` extension matches repo `moduleResolution: bundler` convention (sibling modules omit it too). PASS.
- #7 Async/Promise: none — synchronous by design. PASS.
- #8 Test quality: no `as any`; imports `src/` not `dist/`. PASS (coverage-strength gaps are [TEST], non-blocking).
- #9 Build/config: `strict: true` intact; `tsc --noEmit` exit 0. PASS.
- #11 Error handling: no `catch (e: any)`; no catches. PASS.

### Devil's Advocate

Let me argue this code is broken. First attack: the transcription is wrong somewhere and everyone missed it — a single mistyped point index in the 78-op `DBLIMP` list would corrupt the blimp's wireframe, and the unit tests (counts + in-range + 4% spot-checks) would never notice. This is the most dangerous failure class for a transcription story. **Rebuttal:** I did not trust the tests — I mechanically re-derived every one of the 287 opcodes and 131 coordinates straight from `037007.XXX` and diffed them against the module; the test-analyzer did the same independently. Both found zero discrepancies. This specific attack is closed by evidence, not assertion.

Second attack: `decodeOp` is a footgun. `decodeOp(0xFF)` returns `{point: 42, draw: false}` — a plausible-looking op — so a future rb2-3 author who forgets to stop at `ENDDB` will silently render a 43rd vertex that doesn't exist and get garbage geometry with no error. **Partial concession:** true, and the precondition is documented but unenforced and untested. It cannot bite *this* story (nothing here calls `decodeOp` on a raw stream), but it is a real trap for the next one — hence the non-blocking Delivery Finding aimed at rb2-3.

Third attack: the `readonly` immutability is a lie — a JS consumer or an `as` cast can mutate `DB_MAP` in place, and because these arrays are shared singletons, one bad consumer corrupts the geometry for every other. **Concession:** `readonly` is compile-time only; `Object.freeze` (as `flight.ts` uses) would harden it. Non-blocking, recorded — but a legitimate hardening gap for canonical multi-consumer data.

Fourth attack: a confused maintainer trusts the comment at line 183 ("catches a mis-transcribed index a length check would miss"), edits `DBLIMP`, swaps two in-range indices, sees green, and ships a broken blimp. **Concession:** the comment overclaims for the in-range case; the suite would indeed stay green. This is why I recorded value-pinning + comment correction as findings. None of these four attacks reveal a defect in the *delivered data* — they reveal that the test *guard* should be strengthened for the future, which is captured and routed to the next consumer. The thing that flows to production is correct.

**Handoff:** To SM for finish-story.