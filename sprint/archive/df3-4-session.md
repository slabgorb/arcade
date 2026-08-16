---
story_id: "df3-4"
jira_key: "df3-4"
epic: "df3"
workflow: "tdd"
---
# Story df3-4: Parallax starfield

## Story Details
- **ID:** df3-4
- **Jira Key:** df3-4
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T01:06:37Z
**Repos:** arcade
**Branch:** feat/df3-4-parallax-starfield
**PR:** #442

> ⚠ REJECT-MISROUTE RECOVERY (2026-08-16): the approval gate resolved a REJECTED
> verdict to `finish`/`in_review` (the documented reviewer-reject-misroute). Repaired
> per the recovery_config `reviewer-verdict → rework → target_phase: green`: pointer
> reset to `green` (round 2 fixes), story status reset to `in_progress`. Round-1 review
> verdict is REJECTED — see the Reviewer Assessment.

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T00:16:32Z | 2026-08-16T00:19:29Z | 2m 57s |
| red | 2026-08-16T00:19:29Z | 2026-08-16T00:36:43Z | 17m 14s |
| green | 2026-08-16T00:36:43Z | 2026-08-16T00:41:31Z | 4m 48s |
| review (round 1 → REJECTED) | 2026-08-16T00:41:31Z | 2026-08-16T00:55:45Z | 14m 14s |
| green | 2026-08-16T00:55:45Z | 2026-08-16T01:04:59Z | 9m 14s |
| review | 2026-08-16T01:04:59Z | 2026-08-16T01:06:37Z | 1m 38s |
| finish | 2026-08-16T01:06:37Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Question** (non-blocking): the packed→unpacked star ENCODING is a decision Dev must make and document (the "streams-are-not-rasters cousin" encoding note the story title names). The ROM's SMC store writes `SCOL AND ITEMP2` into a PACKED 2-pixels-per-byte display; `framebuffer.ts` is one 4-bit index (0..15) per cell. Because SCOL is palindromic ($00,$11,…,$77 — nibbles equal), the star's index is `colour & $0F` (0..7) and the phase mask ($F0/$0F) selects the sub-pixel column, not the index. The RED suite therefore pins `drawStars` to write the colour INDEX (not the raw masked byte, which would be $30 and break the 0..15 cell) and keeps `phaseMask` a separate export. Affects `plugins/defender/src/core/stars.ts` (Dev records the encoding decision in a comment/claim; if a different unpacked mapping is chosen, update the `drawStars` tests with a logged deviation). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the encoding decision TEA flagged is now RESOLVED and documented in `stars.ts` — `drawStars` writes `colour & $0F` (the palindromic-nibble index) into the cell and `phaseMask` stays a separate export for the shell's sub-pixel/blink use. The `ENCODING NOTE` in the `drawStars` doc-comment records it (defender/DEFA7.SRC:2151-2153). No `drawStars` test change was needed. Affects `plugins/defender/src/core/stars.ts` (df3-6 visual playtest and the render shell should honour the phase for the sub-pixel column when they blit). *Found by Dev during implementation.*
- **Improvement** (non-blocking): the STINIT Y ceiling `$A8` and the STOUT `$C0`/`$9C`/`$9B` wrap thresholds are enrolled but the deeper STOUT display-erase (the 16 `STA [n,X]` clears at defender/DEFA7.SRC:2124-2139) and the `SBLNK` star-blink (defender/DEFA7.SRC:2156-…) are OUT OF SCOPE here (per context "model the count, not the effect"). Affects a future df5/df7 story if blink/hyperspace scatter is wanted. *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### Dev (implementation)
- No deviations from spec. Implemented exactly to TEA's contract and the ROM: reused
  `YMIN` from `world.ts` (single source, not a re-declared constant), typed `drawStars`
  against `framebuffer.ts`'s `Framebuffer`, and kept every routine pure. No AC was
  narrowed or reinterpreted; the encoding question TEA raised was answerable within the
  pinned contract (see Delivery Findings), so it needed no deviation.

### TEA (test design)
- No deviations from spec. The `stars.ts` interface (7 exports) is a RED contract, not a
  spec change — the design spec (§4 df3-4) names STINIT/STOUT/STRCNT/the phase mask but not
  a signature; the decomposition follows the ROM routines. The pure `drawStars` blitter is
  the design's own "pure index blitters for ship / stars / laser" (reuse ledger, §3).

### Reviewer (audit)
- TEA "No deviations" → ✓ ACCEPTED. Dev "No deviations" → ✓ ACCEPTED. The code matches the
  spec; no undocumented SPEC deviation found. My REJECT findings are doc-accuracy, test-gap
  and cross-file-consistency quality issues (see Reviewer Assessment), NOT spec deviations —
  so they belong in the findings table, not here.

## Dev Assessment

**Status:** GREEN — all 21 stars tests pass; nothing else regressed.

**Implemented:** `plugins/defender/src/core/stars.ts` (new, pure core) + enrolled
`plugins/defender/docs/rom-study/claims/12-stars.json` (14 star claims, byte-verified by
`brief-dossier.test.ts`). Ported STINIT/STOUT from `defender/DEFA7.SRC:2073-2155` +
`defender/PHR6.SRC:294,536-548`:
- `STAR_COUNT=16`; `starDelta` (signed high byte of the doubled camera delta, parallax);
  `phaseMask` ($F0/$0F on BGL bit 6); `scrollStarX` (8-bit add + $9C/$C0/$9B edge wrap);
  `stepStars` (count-bounded, `count ?? STAR_COUNT` — 0 is honoured); `initStars` (STINIT
  with the INJECTED `rand`, X/Y rejection sampling, palindromic $11/$77 colour cycle);
  `drawStars` (the clean SMC-store equivalent — writes `colour & $0F` into the cell).
- Reused `YMIN` from `world.ts` and `Framebuffer` from `framebuffer.ts` (no re-declared
  constants, no new colour path — indices only).

**AC coverage:** AC1 (pure layer, camera-delta scroll, index composite) ✓; AC2 (edge wrap,
explicit coords) ✓; AC3 (STRCNT active count) ✓; AC4 (SMC ported as behaviour, no `FCB`/
opcode bytes, comment records the self-modifying store) ✓; AC5 (constants enrolled +
byte-verified) ✓.

**Verification (evidence, not assertion):**
- `npx vitest run --project defender plugins/defender/tests/stars.test.ts` → **21 passed**.
- `npx vitest run --project defender` → **417 passed** (incl. purity auto-sweeping `stars.ts`
  and brief-dossier byte-verifying `12-stars.json`).
- `npm run lint` (tsc --noEmit) → **clean (exit 0)**.
- `npm run test:orchestrator` → **498 passed**.

**Minimalist check:** the 7 exports each map to a distinct ROM routine TEA pinned; no
speculative surface (no blink, no display-erase, no state flags — all out of scope).

### Round 2 (rework — addresses the round-1 REJECT)

Commit `2b8a2801`. Every confirmed round-1 finding fixed:
- **[HIGH] mask false+untested** → corrected the "output-invisible" comment in BOTH files to
  "load-bearing (affects the low-byte borrow)"; added a `starDelta` borrow-case test
  (`starDelta(1,0)===0`, `starDelta(2,1)===0`) that DISTINGUISHES masked from unmasked.
  Mutation `DROP mask entirely` and `mask 0x80→0x40` now both **killed**.
- **[HIGH] drawStars guard** → added `Number.isInteger` throw + off-screen clip (lang-review
  #21, sibling parity); added non-integer-throws, off-screen-clip, count-clamp tests.
  Mutation `drop isInteger guard` and `drop clip` now **killed**.
- **[MEDIUM] citation drift** → corrected in both files: starDelta 2101-2108, STATUS-$20
  2097-2099, LDB STRCNT 2139, phase 2116-2121, edge wrap 2140-2149.
- **[MEDIUM] $A8 uncited** → enrolled `ST-15` (DEFA7.SRC:2082, byte-verified by brief-dossier)
  + cited :2082 in the comment; added boundary-accept ($A8) and reject-just-above ($A9) tests.
  Mutation `Y_MAX 0xa8→0xa9` now **killed**.
- **[MEDIUM] Star readonly** → `x`/`y`/`color` marked readonly (both files).
- **[LOW]** initStars boundary tests, stepStars default-count test added.
- **[LOW accepted-as-is]** AC4 whole-file regex (#25) and `(e as Error).message` (#11): left as
  documented — bounding the regex adds fragility for no real gain, and the `(e as Error)` form
  matches the established `world.test.ts` precedent. Noted, not changed.

**Verification:** 27 stars / 423 defender / 498 orchestrator (unchanged) / lint 0. A 9-mutant
targeted battery over the fixed sites: **all killed** (was 4 survivors round 1).

**Handoff:** To Reviewer (Heimdall) for round 2.

## TEA Assessment

**Tests Required:** Yes
**Reason:** New pure core module with fidelity-critical ROM math — TDD RED.

**Test Files:**
- `plugins/defender/tests/stars.test.ts` — the STINIT/STOUT parallax starfield suite (new).

**Tests Written:** 21 tests covering 5 ACs. **Status:** RED (21 failing, self-describing
"stars.ts not built yet"); the rest of the defender suite stays green (395 passed); `npm run
lint` (the only type gate) is clean via the `import(/* @vite-ignore */ spec)` convention.

**What GREEN (Dev / Loki) must build** — `plugins/defender/src/core/stars.ts`, ported from
`defender/DEFA7.SRC:2073-2155` + `defender/PHR6.SRC:294,536-548`:
- `STAR_COUNT = 16` (SNUM, PHR6.SRC:541)
- `starDelta(bgl,bglx)` — signed high byte of `((BGLX'−BGL')<<1)`; stars move OPPOSITE the camera
- `phaseMask(bgl)` — `$F0` if `BGL_low & $40` else `$0F`
- `scrollStarX(x,delta)` — 8-bit add + edge wrap: `[$9C,$C0]`→`0`, `>$C0`→`$9B`
- `stepStars(stars,bgl,bglx,count?)` — scroll the first `count` stars (default 16); **`count ?? STAR_COUNT`, never `||`**
- `initStars(rand)` — STINIT with an **INJECTED** rng (purity bans `Math.random`); X∈[0,$9B], Y∈[YMIN+1,$A8], palindromic colour cycle `$11 & $77`
- `drawStars(fb,stars,count?)` — the clean equivalent of the `BSO BONER` SMC store: write each star's colour INDEX (`colour & $0F`) into its cell. **NO `FCB`/opcode bytes; a comment must record the SMC** (AC4).
- **Enroll** the new constants in `docs/rom-study/claims/12-stars.json` (SNUM/STRCNT/wrap thresholds/phase mask) — `brief-dossier.test.ts` byte-verifies them (AC5). See the Delivery Finding re: the packed→unpacked encoding decision.

### Rule Coverage

| Rule (lang-review typescript.md) | Test(s) | Status |
|------|---------|--------|
| #4 `\|\|` vs `??` on a valid-falsy value | `count 0 moves nothing` | failing |
| #2 `readonly` on non-mutated array params | `StarsModule` contract (`readonly Star[]` on stepStars/drawStars) | failing |
| #1 no `as any` / type escapes | suite uses typed `StarsModule`; variable-spec import cast only | n/a (clean) |
| meaningful assertions (no vacuous) | every test pins exact coordinates/indices | failing |
| src/core purity (armed gate) | `purity.test.ts` auto-sweeps the new `stars.ts` | armed |
| citation byte-verify (armed gate) | `brief-dossier.test.ts` checkClaims over `12-stars.json` | armed |
| AC4 opcode-leak scan | `contains no FCB` + `records the SMC provenance` | failing |
| AC5 enrollment (location-matched, not prose) | `GREEN files at least one star claim` | failing |

**Rules checked:** the applicable subset of the TS checklist (this is a pure integer-math
module — no enums, generics, async, or I/O, so most checks are N/A). AC5's tooth was corrected
mid-RED after `/\bstar/i` matched "**Star**ting"/"stars ride" in existing world/ship claims
(a false green) — it now matches on the star ROM citation ranges, which prose can't fake.
**Self-check:** 0 vacuous tests (the AC5 false-green was caught and made location-based; the
`drawStars` exact-byte pin was caught pre-commit and corrected to the 4-bit-index model).

**Handoff:** To Dev (Loki Silvertongue) for GREEN.

## Sm Assessment

Story df3-4 (Parallax starfield, 3pt, tdd, p2) set up and claimed. The phase pointer
read setup on arrival; routing to TEA for RED.

**Premise verified against the current tree (all citations exact):**
- STOUT output routine at defender/DEFA7.SRC:2097 onward (cited 2095-2155 span).
- STINIT (star table init) at defender/DEFA7.SRC:2073 — a few lines ABOVE the cited
  2095 range; called at DEFA7.SRC:1028 "INIT STARS". TEA/Dev should read STINIT from
  :2073, not :2095.
- STRCNT "STARS ACTIVE COUNT" at defender/PHR6.SRC:294 (RMB 1). Exact.
- BSO BONER self-modifying store at defender/DEFA7.SRC:2151-2153 —
  FCB $A7,$98,$00 (STA [SX,X]), an FCB-patched indexed store. The title's TRAP is
  real: port the BEHAVIOUR (indexed store of the masked colour index into the star
  cell), never the opcode bytes.
- Mechanism present in STOUT: BGL−BGLX delta, phase mask via ITEMP2 (BGL+1 bit $40,
  COMB toggle), edge-wrap on SX ($9C/$C0 → $9B or $0), composite into SMAP.
- Target plugins/defender/src/core/stars.ts does NOT yet exist (fresh core module);
  plugins/defender/src/core/world.ts:9 already anticipates it ("stars rides the BGL
  delta"). Depends on df3-2 (BGL/BGLX camera delta), parallelisable with df3-5.

**Context-clobber caught and repaired.** sm-setup regenerated the committed,
Architect-authored context-story-df3-4.md into a bare stub (the story YAML has no
description). I restored the committed version with git checkout — it carries the full
Technical Approach, 5 ACs, References, and Architect-verified anchors that match the
citations above. TEA's primary input is the restored rich context, NOT a stub.

**Sibling probes clean:** no branch or session owns df3-4 (a-2=ml9-3, a-3=ml10-3).
Claim pushed: branch feat/df3-4-parallax-starfield + in_progress stamp (commit 9bc6c496).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — all green (21 stars / 417 defender / 498 orch / lint 0) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — compensated by a hand-run MUTATION BATTERY (23 mutants) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — no swallowed-error surface in a pure math module |
| 4 | reviewer-test-analyzer | Yes | findings | 9 | confirmed 2 (initStars boundary, starDelta sign), rest folded/dismissed-equivalent |
| 5 | reviewer-comment-analyzer | Yes | findings | 10 | confirmed 3 (false mask claim, citation drift ×6, missing $A8 cite); claims JSON verified clean |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — covered by rule-checker #2 (readonly) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — no I/O/auth/secrets in a pure core module |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 5 | confirmed 4 (drawStars #21, Star readonly #2, Y_MAX #32, AC4 regex #25); OVERRODE its #17 "compliant" on the mask (its cited proof is vacuous) |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 5 confirmed (2 High, 3 Medium) + 4 Low + 2 verified-equivalent (dismissed with rationale)

### Cross-specialist conflict resolved by computation
comment-analyzer flagged the `starDelta` "mask is output-invisible" comment as FALSE (High); rule-checker rated the SAME comment "compliant, verified by the `(0,0x7f)` test." I ran the arithmetic myself (`node`): `starDelta(1,0)` = **0 masked vs −1 unmasked** (they DIFFER — the mask IS load-bearing), and the cited `(0,0x7f)` test gives 0 with **or** without the mask (it proves nothing). The code decides: comment-analyzer is right, rule-checker's VERIFIED is overridden.

### Mutation battery (compensating for disabled edge-hunter)
23 targeted mutants over `stars.ts`; **19 killed**. 4 survivors classified:
- `Y_MAX 0xa8→0xa9` and `initStars Y >→>=` → **REAL gap** (Y-ceiling $A8 boundary untested + $A8 uncited) → finding.
- `delta sign hi≥0x80→0x81` → **equivalent** (needs camera Δ ~$4000/frame; world.ts clamps to ±$100).
- `scrollX &0xff→&0x1ff` → **equivalent** (real star delta ≤ ±4; x+delta never exceeds a byte).
Additional hand-probe: an **unmasked** `starDelta` survives the ENTIRE suite (no current input distinguishes it — the borrow case `(1,0)` is never tested) → the mask-High finding.

## Reviewer Assessment

**Verdict:** APPROVED (round 2)
**Round 1 verdict:** REJECTED — all 5 confirmed findings (2 High, 3 Medium) + the Lows are resolved in commit `2b8a2801` and independently re-verified (Round 2 Verification below).
**Data flow traced:** injected `rand` → `initStars` (rejection-sampled X∈[0,$9B]/Y∈[$2B,$A8]) → `stepStars` (camera-delta parallax scroll) → `drawStars` (guarded index write into the df2 framebuffer). Pure end-to-end; no clock/entropy/shell reach (purity gate green).
**Pattern observed:** faithful ROM port, now sibling-consistent — readonly `Star` interface, fail-loud blitter (`stars.ts:131`), every constant citation-backed.
**Handoff:** To SM for finish-story.

### Round 2 Verification (Heimdall)

Re-verified each round-1 finding against `2b8a2801` — all resolved, none regressed:
- **[HIGH] mask false+untested** → comment corrected in BOTH files; borrow-case test added; mutation `DROP mask entirely` + `mask 0x80→0x40` now **KILLED**.
- **[HIGH] drawStars guard** → `Number.isInteger` throw + off-screen clip (`stars.ts:131`, lang-review #21, sibling parity); mutation `drop guard` + `drop clip` **KILLED**; 3 tests added.
- **[MEDIUM] citation drift** → all corrected and re-checked against the vendored tree: `2101` LDD BGL, `2116-2121` phase, `2139` LDB STRCNT, `2140-2149` edge wrap, `2082` CMPA #$A8 — all exact.
- **[MEDIUM] $A8 uncited** → `ST-15` enrolled (DEFA7.SRC:2082), byte-verified by brief-dossier (15/15); comment cites `:2082`; boundary-accept + reject-just-above tests; mutation `Y_MAX 0xa8→0xa9` **KILLED**.
- **[MEDIUM] Star readonly** → fields marked `readonly` (both files).
- **[LOW]** initStars boundary + stepStars default-count tests added.
- **[LOW accepted-as-is]** AC4 whole-file regex (#25) and `(e as Error).message` (#11): left with rationale (bounding adds fragility; the e-cast matches `world.test.ts` precedent) → ACCEPTED.

Round-2 diff touches only the 3 intended files; no new issues. Full suite: **27 stars / 423 defender / 498 orchestrator / lint 0**. Targeted 9-mutant battery over the fixed sites: **ALL KILLED** (was 4 survivors in round 1).

### Round 1 (REJECTED) — findings, now ALL resolved in round 2

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | `[DOC]` `starDelta` mask is FALSELY documented as "output-invisible" AND untested. It is load-bearing: `starDelta(1,0)`=0 masked but −1 unmasked (the mask changes the low-byte borrow into the high byte). No test distinguishes masked from unmasked — a "drop the mask" simplification passes all 21 tests and silently breaks parallax. | `stars.ts:21-22`, `stars.test.ts:31-33` | Correct BOTH comments (mask affects the borrow, not inert); add a `starDelta` borrow-case test, e.g. `starDelta(0x0001,0x0000)===0` with a note that an unmasked impl yields −1. |
| [HIGH] | `[RULE]` `drawStars` writes `fb.data[y*width+x]` with no `Number.isFinite`/`isInteger` guard and no bounds clip — the sole blitter missing the fail-loud guard its 3 siblings enforce (`terrain.ts:88` cites lang-review #21 by name; `objects.ts`/`charset.ts` throw on non-finite x/y). A NaN star (misbehaving injected `rand`) silently no-ops; an undersized fb mis-writes a neighbouring row. | `stars.ts:132` | Guard non-finite x/y (throw, matching siblings) and clip or document the fb-bounds contract. |
| [MEDIUM] | `[DOC]` Inline comment citation drift (the UNGATED prose — the claims JSON is clean): `starDelta` cited `2098-2108` (math is `2101-2108`); STATUS-$20 suppress cited `:2096` (blank; actual `2097-2099`); "LDB STRCNT loop" cited `:2131` (a CLRA store; actual `:2139`); phase-mask range inconsistent between files (use `2116-2121`); edge-wrap range inconsistent (use `2140-2149`). | `stars.ts:17,19,23,24,54`; `stars.test.ts:28,34,36,42,54,149` | Correct each to the real instruction line and make the two files consistent ("line numbers from tool output only"). |
| [MEDIUM] | `[RULE]` `Y_MAX`=$A8 is an uncited src/core constant — no `12-stars.json` entry and no line number in its comment, unlike every sibling constant (violates epic "no src/core value without a claims entry"). Real cite: `DEFA7.SRC:2082` (`CMPA #$A8`). Boundary also untested. | `stars.ts:40` | Enroll a claim citing `DEFA7.SRC:2082`; add `:2082` to the comment; add an `initStars` Y=$A8 boundary-accept test. |
| [MEDIUM] | `[TYPE]` `interface Star` fields are not `readonly` — the sole core interface with mutable fields (11 siblings all `readonly`), though `Star` is treated immutably throughout. | `stars.ts:46-50`, `stars.test.ts:82-86` | Mark `x`/`y`/`color` `readonly`. |
| [LOW] | `[TEST]` `initStars` boundary-ACCEPT values untested (X=$9B, Y=$A8, Y=YMIN+1=$2B) — only reject sides + mid-range pinned (folds into the Y=$A8 test above). | `stars.test.ts:262` | Add a boundary-accept test. |
| [LOW] | `[TEST]` AC4 SMC-provenance positive regex runs over the whole file, not bounded to `drawStars`' docstring (brittle; rule #25). | `stars.test.ts:318` | Optional: bound the match or leave with a note. |
| [LOW] | `[TEST]` `stepStars`/`drawStars` default `count`=16 never falsified (>16 stars) and `count>length` untested. | `stars.test.ts:210,274` | Optional hardening. |

**Verified-equivalent (dismissed, not gaps):** `starDelta` sign threshold at `hi==0x80` (unreachable given world.ts's ±$100 camera clamp); `scrollStarX` `&0x1ff` (real star delta ≤ ±4). Both documented so a future reviewer needn't re-derive.

**Deviation audit:** TEA and Dev each logged "No deviations from spec" → ✓ ACCEPTED (the code matches the spec; the findings above are doc/test/consistency quality, not spec deviations). No undocumented spec deviation found. The Dev Delivery Finding correctly resolved the encoding question in-contract.

**Handoff:** Back to Dev (Loki) for fixes — the two Highs are the blockers; the Mediums (citation drift, $A8 enrollment, readonly) should land in the same round.