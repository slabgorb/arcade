---
story_id: mc2-1
jira_key: ""
epic: mc2
workflow: tdd
---
# Story mc2-1: Citation checker + claims format, guarding the skeleton

## Story Details
- **ID:** mc2-1
- **Jira Key:** (none — arcade uses local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 5
- **Type:** chore
- **Branch:** none
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T14:14:40Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T13:29:26.913557+00:00 | 2026-08-06T13:32:17Z | 2m 50s |
| red | 2026-08-06T13:32:17Z | 2026-08-06T13:48:37Z | 16m 20s |
| green | 2026-08-06T13:48:37Z | 2026-08-06T13:55:21Z | 6m 44s |
| review | 2026-08-06T13:55:21Z | 2026-08-06T14:08:27Z | 13m 6s |
| green | 2026-08-06T14:08:27Z | 2026-08-06T14:12:36Z | 4m 9s |
| review | 2026-08-06T14:12:36Z | 2026-08-06T14:14:40Z | 2m 4s |
| finish | 2026-08-06T14:14:40Z | - | - |

## Story Context

### Acceptance Criteria
1. `tools/audit/check-citations.mjs` + `tests/helpers/claims.ts` exist under `plugins/missile-command/`, adapted from the joust/centipede shape; a `claims/*.json` set encodes each skeleton constant as `{symbol, value, module, line, meaning}`.
2. The checker reads the vendored `reference/source/*.MAC` and FAILS when a claimed symbol/value/line disagrees with it — radix-aware (hex default, trailing-`.` decimal), W3MAIN logical-line-aware, `grep -a`-safe on CR-terminated files. Proven by a deliberately-wrong claim reddening it, then reverted.
3. Every constant currently hardcoded in `src/core` and `src/shell` (`field.ts`, `cursor.ts`, `explosion.ts`, `abm.ts`, `render.ts`) is represented by a claim; a guard test asserts no un-cited numeric literal remains in `src/core`.
4. Wired as a `missile-command` surface: `npx vitest run --project missile-command`, `npm run lint`, and `npm run test:orchestrator` all pass.

### Design References
- **Design Doc:** `plugins/missile-command/docs/design/mc2-dossier.md` — the mc2 epic design and the reuse-first plan
- **Ground Truth:** `plugins/missile-command/docs/rom-study/brief.md` — REV-01 constant oracle, subsystem map, radix rules, open questions

### Reuse Targets (Joust/Centipede Pattern)
Copy these shapes from joust/centipede; do NOT invent new machinery:
- `plugins/joust/tools/audit/check-citations.mjs` — the citation checker pattern
- `plugins/joust/tests/helpers/claims.ts` — the claims loader/asserter, shape-hardened
- `plugins/joust/docs/rom-study/{subsystems.md, glossary.md, claims/}` — reference docs + per-claim JSON structure
- (Centipede carries the same at `plugins/centipede/tools/audit/check-citations.mjs` and `plugins/centipede/docs/rom-study/claims/`)

### Retrofit Surface — Constants to Claim
All currently hardcoded in comments; this story turns them into enforced claims:
- `plugins/missile-command/src/core/field.ts` — CITIES (CITY1..6H/V, W3COMN:123-145), missile BASES (:147-157), NCITY=6 (:39), NMISBA=3 (:41)
- `plugins/missile-command/src/core/cursor.ts` — IHMIN (:113), IHMAX (:115, 247.), IVMIN (:117, 45.), IVMAX = TOPSCR-16 (:119; TOPSCR=222. :107)
- `plugins/missile-command/src/core/explosion.ts` — EXDONE (W3COMN:111, 27.)
- `plugins/missile-command/src/core/abm.ts` — ABM unit velocity (W3MAIN:1640 ABMVEL)
- `plugins/missile-command/src/shell/render.ts` — LOGICAL_HEIGHT (TOPSCR=222. W3COMN:107)
- Vendored source lives at `plugins/missile-command/reference/source/*.MAC`

### THREE CRITICAL TRAPS the Checker Must Survive
These are documented in project memory and in mc2-1's ACs:

1. **W3MAIN.MAC is DOUBLE-SPACED** (memory: `mc-w3main-cite-double-spaced`)
   - Checker must resolve LOGICAL (non-blank) line numbers ≈ physical/2
   - Cite via `.SBTTL`/symbol, not physical offset
   - Example: visual line 200 may be logical line 100

2. **Radix Discipline** (memory: `.RADIX 16` inherited)
   - `.RADIX 16` set once at `W3COMN.MAC:1` and inherited everywhere
   - Bare number = HEX (default)
   - Trailing period = DECIMAL (e.g., `MAXMIS=10.` is decimal 10, `CITY2H=0B4` is hex)
   - Checker must be radix-aware or it flags every correct hex claim

3. **File Format: CR-terminated, non-UTF8** (memory: `grep -a` required)
   - Vendored `.MAC` files are CR-terminated and non-UTF8
   - Naive `grep` reads them as binary and returns false-empty
   - Use `grep -a` or risk missing entire files

### Guardrails
- **REUSE-FIRST:** This is a PORT of joust/centipede's guardrail onto missile-command, not a new design. Do not extract anything into `src/shared`.
- **Core/Shell Purity:** The boundary is load-bearing. The guard test asserting "no un-cited numeric literal in src/core" (AC3) must not itself violate purity. FS-reading tests can't live in jsdom files (memory: `jsdom-fs-tests-and-bfcache`). Store them in `tests/` at the orchestrator level or in node:test runners.
- **Base Branch:** `main` (trunk-based). Local main synced with origin. Standard remote-freshness probe applied.

## Delivery Findings

No upstream findings yet.

## Design Deviations

### TEA (test design)

**D-1 — claim shape: sibling `source` triple EXTENDED, not a flat `{symbol,value,module,line,meaning}`.**
- **Spec source:** `sprint/epic-mc2.yaml` → mc2-1 AC1.
- **Spec text:** "a claims/*.json set encodes each skeleton constant as {symbol, value, module, line, meaning}."
- **Implementation (tested contract):** an mc claim is the joust/centipede shape (`{id, source:{file,line,verbatim}}`) EXTENDED with top-level `symbol`, `value`, `meaning`. `module`+`line` are carried as `source.file`+`source.line` — the exact triple the PORTED joust checker byte-verifies. The RED tests assert both the extra fields (AC1) and `source:{file,line}` coverage.
- **Rationale:** the design doc's "port joust/centipede's checker, invent no new machinery" (higher-authority reuse mandate) conflicts with a flat shape. Both siblings' checker *compares* the verbatim and **deliberately never parses radix** (see the checker header's rule 3). Reusing it unchanged requires the nested `source`. The decoded `value` the AC wants is carried too, and its radix decode is re-derived from source in `citations-source.test.ts`, keeping the checker dumb (the sibling invariant) while still honouring AC1's fields.
- **Forward impact:** mc2-2's glossary and every mc3/mc4 claim inherit this shape. Architect/Reviewer: confirm or rule for a flat shape (would fork the checker from the siblings).

**D-2 — citation line basis: W3COMN=PHYSICAL, W3MAIN=LOGICAL (measured), and the EXDONE slip.**
- **Spec source:** mc2-1 ACs + project memory `mc-w3main-cite-double-spaced`.
- **Finding (measured, `citations-source.test.ts` pins it):** every W3COMN constant is cited by its PHYSICAL (grep -a) line (NCITY:39, TOPSCR:107, IHMIN:113, IVMAX:119 all match). W3MAIN anchors are LOGICAL (physical :1640 is blank; the ABMVEL label is at physical :3285). The skeleton's **EXDONE citation `W3COMN:111` is a LOGICAL-line slip — the symbol is physically at line 225.** The value (27) is correct; only the cited line is wrong, and no existing test checked the line, which is exactly why the guardrail is worth building.
- **Green obligation for Dev:** the EXDONE claim cites **physical 225**, and the stale `W3COMN:111` in `src/core/explosion.ts` and `tests/explosion.test.ts` is reconciled to 225.

## Branch Strategy
**Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

## Sm Assessment

**Setup verdict:** Ready for RED (TEA). mc2-1 is the keystone of epic mc2 — the citation guardrail every later mc2/mc3/mc4 constant leans on — and it is well-scoped for a 5-point chore.

**Scope is a PORT, not a design.** The reuse targets exist and were confirmed on disk: `plugins/joust/tools/audit/check-citations.mjs`, `plugins/joust/tests/helpers/claims.ts`, `plugins/joust/docs/rom-study/claims/` (centipede carries the same). TEA/Dev copy those shapes onto missile-command; no new machinery, no `src/shared` extraction. This keeps the diff and the review surface bounded.

**The retrofit surface is finite and enumerated** (field.ts / cursor.ts / explosion.ts / abm.ts / render.ts — the comment-only citations). AC3's "no un-cited numeric literal in src/core" guard is the mechanical backstop; TEA should mind the jsdom fs-read constraint when placing that guard (see Guardrails).

**The three traps are the real risk, not the port.** Radix-awareness, W3MAIN logical-line resolution, and `grep -a` on CR-terminated source are each capable of producing a false-green checker (a checker that passes because it silently read nothing, or that flags every correct hex claim). AC2 mandates a deliberately-wrong-claim reddening proof — TEA's RED tests must exercise all three traps, not just the happy path, or the guardrail ships hollow.

**Dependencies:** none blocking. Base `main` synced with origin (4bfc4b0) after rebasing past the unrelated jt9-29 joust work. No ID collision (mc2 is a fresh epic).

**Handoff:** TEA (Han Solo) for the RED phase — write the failing checker + claims tests, prove the three-trap coverage fails before Dev implements.
## Tea Assessment

**RED verdict:** clean. `npx vitest run --project missile-command` → **41 failed / 125 passed**. All 41 failures are in the new `tests/citations.test.ts` and trace to the three artifacts Dev must build (missing `tests/helpers/claims.ts`, no `docs/rom-study/claims/*.json`, no `tools/audit/check-citations.mjs`). No existing skeleton test regressed. `npm run lint` is clean.

**The double-entry (jt8-2 pattern).** Two files:
- `tests/citations.test.ts` — the CLAIM half (RED): apparatus exists (AC1), every skeleton constant is pinned by a claim (AC3 coverage), the checker reddens on a wrong claim (AC2), and no un-cited numeric literal survives in `src/core` (AC3 guard).
- `tests/citations-source.test.ts` — the SOURCE half (GREEN now, 15 tests): each core constant re-derives from the vendored source through a radix-16 decode, so a claim that agrees with a TYPO in the core cannot pass. This is the independent second entry, not a red signal.

**AC → test map.**
- **AC1** (helper + checker + `{symbol,value,module,line,meaning}` claims): `describe('the citation apparatus exists')` — loader loads non-empty, checker CLI present, every claim carries symbol/value/meaning + a `source` triple.
- **AC2** (checker fails on a wrong claim; radix-, line-, grep-a-aware): `describe('the checker byte-verifies…')` spawns the CLI against throwaway claims dirs — a byte-exact claim exits 0; a tampered verbatim, a logical-line miscite (the EXDONE:111 class), and an EMPTY set all exit non-zero. Radix is proven in the source file's `describe('the radix-16 decoder')` + per-constant decode.
- **AC3** (every hardcoded const claimed; no un-cited literal in core): the coverage `it.each` (27 constants) + the `src/core carries no un-cited numeric literal` guard.
- **AC4** (wired as a missile-command surface, lint/orchestrator green): the tests already run under the `missile-command` vitest project; lint is clean. Dev confirms `npm run test:orchestrator` after the port.

**Dev worklist (Yoda / GREEN).**
1. Port `tests/helpers/claims.ts` from joust (joust-compatible `loadClaims` + `claimCovers`; the extended mc shape — see Design Deviation D-1).
2. Port `tools/audit/check-citations.mjs` from joust/centipede. Honour the env overrides the teeth tests use: **`MC_CLAIMS_DIR`** and **`MC_SOURCE_DIR`**; refuse an empty claims set (non-zero exit); read `.MAC` as utf8 (the grep-a/non-UTF8 hazard). Keep it verbatim-compare — do NOT add radix parsing to the checker.
3. Write `docs/rom-study/claims/*.json` — one claim per constant in the coverage table. Values needing claims (the AC3 guard's flagged set):
   - `cursor.ts`: 8 (IHMIN), 45 (IVMIN), 206 (IVMAX=TOPSCR-16.), 247 (IHMAX)
   - `explosion.ts`: 13 (MAX_BLAST_RADIUS, derived), 27 (EXDONE)
   - `field.ts`: 3 (NMISBA), 6 (NCITY), and the city/base coord decodes 16,17,18,20,21,22,44,71,95,123,148,180,208,240
   - plus MAXMIS(10) and TOPSCR(222) from W3COMN.
4. **Fix the EXDONE citation** (Design Deviation D-2): the claim cites physical **225**; reconcile the stale `W3COMN:111` in `src/core/explosion.ts` and `tests/explosion.test.ts` to 225.

**Watch-outs.** Byte tests skip on CI (vendored `reference/source/` is gitignored — the jt1-3 pattern); the coverage/guard/teeth reds are the real signal and run everywhere except the byte-gated CLI teeth. Do not weaken the guard's TRIVIAL allowlist ({0,1,2,-1}) to make a magic number pass — claim it instead.

**Handoff:** Yoda (Dev) for GREEN.
## Dev Assessment

**Implementation complete. GREEN.** Ported the joust/centipede citation guardrail onto missile-command; the RED apparatus contract now passes (41 → 0 failing), with no skeleton regression.

**Verification (all three AC4 gates + the checker itself):**
- `npx vitest run --project missile-command` → **166/166 passed**
- `npm run lint` (tsc --noEmit, repo-wide) → clean
- `npm run test:orchestrator` → **398/398 passed**
- `node tools/audit/check-citations.mjs` over the 28 committed claims → **all claims verified**

**Artifacts:**
- `tests/helpers/claims.ts` — joust-ported loader (`loadClaims`, `claimCovers`, `asClaim`), extended mc shape.
- `tools/audit/check-citations.mjs` — joust-ported checker; `MC_CLAIMS_DIR`/`MC_SOURCE_DIR` overrides; verbatim-compared (never radix-parsed); refuses an empty set; `missile.cpp` is the pinned external MAME source.
- `docs/rom-study/claims/{field,cursor,explosion}.json` — 28 claims, verbatim generated byte-exact from the vendored source.
- `src/core/explosion.ts` + `tests/explosion.test.ts` — EXDONE citation `W3COMN:111` → `:225`.

**AC accountability:**

| AC | Status | Evidence |
|----|--------|----------|
| AC1 — helper + checker exist; `{symbol,value,module,line,meaning}` claims | DONE | claims.ts + check-citations.mjs present; 28 claims each carry symbol/value/meaning + `source:{file,line,verbatim}` (module=source.file, per D-1). `the citation apparatus exists` passes. |
| AC2 — checker fails on a wrong claim; radix/line/grep-a-aware | DONE | teeth tests: byte-exact→exit 0; tampered verbatim, logical-line miscite, empty set→non-zero. Radix double-entry in citations-source.test.ts (15 green). Source read as utf8 (grep-a hazard handled). |
| AC3 — every skeleton constant claimed; no un-cited literal in core | DONE | 27-row coverage `it.each` green; `src/core carries no un-cited numeric literal` green across all core files. |
| AC4 — wired surface; lint + orchestrator green | DONE | the three runs above. |

**Design deviations honoured:** D-1 (extended sibling claim shape, checker reused unchanged) and D-2 (EXDONE physical 225; stale :111 reconciled). Both logged under Design Deviations for Architect/Reviewer confirmation.

**For the Reviewer:** `src/core/abm.ts` carries no numeric game-constant literal (the ABM velocity is expressed structurally), and `src/shell/render.ts`'s `LOGICAL_HEIGHT` (222) is shell — outside the AC3 core guard — but its value is already backed by the `TOPSCR` claim. If fuller shell-surface coverage is wanted, that is a clean mc2-2 follow-up, not a gap in this AC.

**Handoff:** Obi-Wan (Reviewer).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (all gates green; port byte-faithful) | N/A — corroborated the value-verification concern |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — self-assessed [EDGE]: empty-set/external/traversal edges are tested; no finding |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — self-assessed [SILENT]: schema-only degrade is logged, not silent; no finding |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — self-assessed [TEST]: two findings (F1 value-unverified, F4 guard coincidence hole) |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 (high conf) | confirmed 1 (F2 stale header prose, both files are one issue), dismissed 0 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — self-assessed [TYPE]: claim shape well-typed; casts verified necessary by rule-checker; no finding |
| 7 | reviewer-security | Yes | findings | 1 (low) | confirmed 1 (F3 unguarded JSON.parse); traversal/symlink containment verified intact |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — self-assessed [SIMPLE]: F3 doubles as a robustness/simplicity item; no other complexity |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 30 rules / 61 instances | N/A — mutation-verified guard+checker bite; all 28 claims byte-exact; purity/reuse/radix pass |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 4 confirmed (1 MEDIUM, 3 LOW), 0 dismissed, 1 deferred (F4)

## Reviewer Assessment

**Verdict:** REJECTED

The port is genuinely excellent — rule-checker found 0 violations across 30 rules / 61 instances, mutation-verified that both the AC3 guard and the checker bite, and confirmed all 28 claims byte-exact against the vendored source; security confirmed the path-traversal/symlink containment survived the port intact; preflight is all-green. This is not a rejection over craft. It is a rejection because the story is *the fidelity guardrail itself*, and two of its own promises are not yet closed. The fixes are small and in-scope.

### Findings by dispatch source

- **[TEST] F1 — the claim `value` is never verified (MEDIUM).** The mc claim adds a decoded `value` field beyond the sibling shape, and AC2 says the checker "FAILS when a claimed symbol/**value**/line disagrees." It does not: I ran a claim `{symbol:NCITY, value:999999, verbatim:<correct line>}` through the checker → "all claims verified", exit 0. The checker is verbatim-only by design (D-1), and the source double-entry (`citations-source.test.ts`) checks *code↔source*, never *claim.value↔source*. So `value` is decorative and can silently drift — worse than joust, which never claims to verify it. Preflight independently flagged this. All 28 committed values are in fact correct (rule-checker verified), so this is a coverage hole, not a live bug — but it is a hole in the story's own AC.
- **[DOC] F2 — stale convention prose (LOW, high confidence).** Fixing D-2 flipped EXDONE `W3COMN:111 → :225` but left the block headers in `src/core/explosion.ts:12` and `tests/explosion.test.ts:9` asserting the whole-block convention is "logical cites." That prose now contradicts the physical `:225` beneath it. The reviewer's own new `citations-source.test.ts` proves W3COMN=physical / W3MAIN=logical — a distinction the header never draws. This is the "reconcile the WHOLE block, not just the number" lesson; I introduced it in D-2 and must close it.
- **[SEC]/[SIMPLE] F3 — unguarded `JSON.parse` in the CLI (LOW).** `check-citations.mjs` CLI entry does `readdirSync().flatMap(f => JSON.parse(readFileSync(f)))` — a malformed claims file throws an uncaught exception with a stack trace instead of a reported error, violating the checker's own stated invariant ("every problem is REPORTED, never thrown"). Not attacker-reachable (developer-controlled dir), but a cheap robustness fix that honours the file's own contract.
- **[TEST] F4 — AC3 guard checks value-membership, not per-symbol coverage (LOW, DEFERRED).** The guard passes any core literal whose value equals *any* claimed value: I injected `const COINCIDENCE = 22` into core and it passed (22 is a claimed coord value). It still bites genuinely-new magic numbers (`777` reddened it), so it is not toothless — but its precision is coarse. Deferred: tightening to per-symbol coverage needs a const-name→claim mapping that is disproportionate here; noted for mc2-2.
- **[RULE]** rule-checker: clean, 0 violations (purity p1, reuse-first p2, radix/citation p3, no-magic-numbers p4 all pass; casts verified necessary; no `.d.mts` needed).
- **[EDGE]** (self-assessed, subagent disabled): empty-set refusal, external-source marker, and traversal edges are all tested/verified. No finding.
- **[SILENT]** (self-assessed, disabled): the schema-only degrade when the source tree is absent is *logged* ("vendored tree absent — schema-only check"), not silent; intentional CI pattern. No finding.
- **[TYPE]** (self-assessed, disabled): claim interface is fully typed; the `as unknown as Claim` cast follows genuine field validation (rule-checker confirmed it necessary). No finding.

### Devil's Advocate

Assume this guardrail is a paper tiger. What breaks it? The most dangerous property of a citation checker is a checker that reports success while verifying nothing — and this one has two faces of that. First, the `value` field: a maintainer decoding a new W3COMN constant next month writes `IHMAX = 247` but fat-fingers `value: 24`, cites the correct line and verbatim, and the checker says "all claims verified." The one number a human most wants machine-checked — the radix decode, the exact thing the mc shape added over joust — is the one number nothing checks. Second, the AC3 guard's coincidence hole means a real magic number can hide behind an unrelated claim's value: an enemy-speed constant of `22` added in mc3 would sail through because a city sits at V=22. A confused reader is endangered too: the stale "logical cites" header tells them W3COMN:225 is a logical ordinal when it is physical — precisely inverting the convention the same commit establishes, so a future citation copied from that block's stated rule would be off by ~2×. A stressed filesystem breaks it a third way: one malformed byte in a claims JSON and the CLI dies with a stack trace mid-audit rather than naming the bad file, so a CI run reports a crash, someone reruns it, and the guardrail's "no empty set" and byte-verify guarantees never execute. None of these is catastrophic — the core byte+line verification is solid and mutation-proven, and every committed value happens to be correct today — but a guardrail is judged by what it will catch tomorrow, and today it would wave three of these through. Two are a ten-line fix; the third is a documented deferral. That is why this is a reject-to-tighten, not an approve-with-hope.

### Severity table

| ID | Tag | Severity | Blocking | Disposition |
|----|-----|----------|----------|-------------|
| F1 | TEST | MEDIUM | Yes (AC2) | Rework: add claim.value↔verbatim radix double-entry |
| F2 | DOC | LOW | Yes (self-introduced, misleading) | Rework: reconcile the "logical cites" header prose in both files |
| F3 | SEC/SIMPLE | LOW | Yes (cheap; honours invariant) | Rework: try/catch the CLI JSON.parse, name the bad file |
| F4 | TEST | LOW | No | Deferred to mc2-2 with note |

**Rework scope (green):** F1 + F2 + F3. F4 deferred.

**Handoff:** back to Yoda (Dev) for a tightly-scoped green rework.
## Dev Assessment (rework — round 2)

Addressed the Reviewer's rework scope (F1, F2, F3); F4 deferred to mc2-2 as ruled.
- **F1 (AC2 gap) — CLOSED.** Added a value↔verbatim radix double-entry in `citations-source.test.ts`: for each committed claim, decode its own verbatim's RHS per radix and assert it equals the claimed `value` (IVMAX/OLDRAD derived values checked explicitly: IVMAX=TOPSCR-16=206, OLDRAD peak=13). Mutation-verified: flipping NCITY's value to 999 reddens it. The claim `value` can no longer drift silently.
- **F2 (stale prose) — CLOSED.** `explosion.ts` and `explosion.test.ts` headers now scope "logical cites" to W3MAIN and state W3COMN cites are physical; the EXDONE line and the W3MAIN anchors carry `(physical)`/`(logical)` tags.
- **F3 (JSON.parse) — CLOSED.** The CLI now reports `cannot parse claims/<file>` and exits 2 on malformed JSON instead of throwing a raw stack trace. Verified.
- **F4 — DEFERRED** to mc2-2 (AC3 guard checks value-membership, not per-symbol coverage).

**Verification:** `npx vitest run --project missile-command` → **194/194**; `npm run lint` clean; `npm run test:orchestrator` → **398/398**; checker still verifies all 28 claims.

**Handoff:** back to Obi-Wan (Reviewer) for re-review.
## Reviewer Assessment (round 2 — re-review of rework)

**Verdict:** APPROVED

The green rework closed all three blocking findings; the round-1 REJECTED verdict above is superseded.

**Re-review scope.** The rework diff (`e7543f4..HEAD`, 62 lines / 4 files) is comment reconciliations (explosion.ts, explosion.test.ts — runtime byte-unchanged, verified), one new test (the F1 value double-entry), and one try/catch (the F3 CLI guard). It does not touch the checker's core logic, the claim shape, or the ported apparatus the round-1 subagent battery cleared, so that coverage (Subagent Results above, all received) stands; a full re-dispatch would be disproportionate to the change.

**Findings disposition:**
- **F1 [TEST] — CLOSED.** `citations-source.test.ts` now decodes each committed claim's own verbatim per radix and asserts it equals the claimed `value` (derived IVMAX/OLDRAD checked explicitly). Mutation-verified by me: flipping MC-NCITY's value to 999 reddens the suite (`claimed value 999 must equal the decode of "6"`). The `value` field can no longer drift silently — AC2's "value disagrees" is now enforced (verbatim==source via the checker, value==decode(verbatim) via this test).
- **F2 [DOC] — CLOSED.** Both headers now scope "logical cites" to W3MAIN and label W3COMN citations physical; the EXDONE line and W3MAIN anchors carry explicit `(physical)`/`(logical)` tags. No self-contradiction remains.
- **F3 [SEC/SIMPLE] — CLOSED.** Malformed claims file now yields `cannot parse claims/<file>` + exit 2 (verified) instead of an uncaught stack trace, honouring the checker's "report, never throw" invariant.
- **F4 [TEST] — DEFERRED** to mc2-2 (AC3 guard value-membership precision), as ruled in round 1.

**Adversarial re-check:** the F1 `it.each` is non-vacuous (42 tests run/pass; guarded by an explicit non-empty claims assertion) and mutation-proven; the F3 helper's `process.exit(2)` is appropriate for a CLI; the comment edits changed no runtime line. No new findings.

**Gates:** `npx vitest run --project missile-command` → 194/194; `npm run lint` clean; `npm run test:orchestrator` → 398/398; checker verifies all 28 claims.

**Handoff:** Grand Admiral Thrawn (SM) for finish.