---
story_id: "tp1-22"
jira_key: "tp1-22"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-22: THE CITATION GATE — freeze the audit's 'ours' side to the audit commit; stop re-pointing 82 citations by hand every story

## Story Details
- **ID:** tp1-22
- **Jira Key:** tp1-22
- **Epic:** tp1 (Tempest — ROM fidelity against Theurer's original 1981 source)
- **Type:** chore
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repos:** tempest
- **Branch:** chore/tp1-22-citation-gate-freeze

## Workflow Tracking
**Workflow:** tdd
**Phase:** approved
**Phase Started:** 2026-07-18T10:47:48Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T10:47:48Z | - | - |

## Acceptance Criteria

1. `tools/audit/check-citations.mjs` reads the 'ours' side from the audit commit (git show 4232ed4:<file>), not from the working tree. The audit record is immutable by construction.

2. The ROM 'source' side is still byte-checked unconditionally against ~/Projects/tempest-source-text (the LF copy — NEVER the CRLF sibling ~/Projects/tempest-source). This is non-negotiable: it is where the audit's authority lives.

3. The 82 citations tp1-1 re-pointed by hand and the 'remediated_by' flag it introduced are NOT reverted. They are the interim record and they stand.

4. A finding whose class is NO_COUNTERPART can never be marked remediated_by — today that combination hard-errors with a confusing message. Either make it a clear error or make it unnecessary, and comment the branch: tp1-4/tp1-6/tp1-8 all ADD systems we do not have, which is exactly the NO_COUNTERPART class.

5. A test proves the gate survives a simulated code fix: mutate a cited 'ours' line in the working tree and citations stays green, while a mutated ROM source line still goes red.

6. npm test -- citations stays green (currently 8/8).

## Technical Approach

**Obi-Wan's Ruling 2** from the tp1-1 review (2026-07-13), filed as its own story because the Reviewer fenced tp1-1 to the frame-rate family.

**THE PROBLEM:** The citation gate cannot survive its own remediation. `docs/audit/findings/*.json` are an AUDIT RECORD — 'ours.verbatim' IS the defect text — so the moment any tp1 story fixes anything, `tests/audit/citations.test.ts` goes red. tp1-1 alone produced 98 failures: 82 were pure line drift (defect intact, only moved) and were re-pointed BY HAND; the other 16 were code actually fixed, and re-pointing those would have made the finding assert that the FIX is the defect. Dev's interim 'remediated_by' flag solved tp1-1 and MUST NOT BE REVERTED — but it does not scale: every one of the remaining 19 stories pays the same hand re-pointing tax.

**THE DURABLE FIX (Dev's own recommendation, adopted by the Reviewer):** Read the 'ours' side from the AUDIT COMMIT (git show 4232ed4:<file>) rather than from the working tree. The audit's record then becomes immutable, the gate becomes permanently stable, and the per-story re-pointing tax goes to zero.

**MUST LAND BEFORE tp1-4** (the CAM), which rewrites `src/core/enemies/` and churns `sim.ts` heavily — it will drift citations far harder than tp1-1 did.

## Key Artifacts

- `tempest/tools/audit/check-citations.mjs` — the citation checker
- `tempest/tests/audit/citations.test.ts` — the gate test suite
- `tempest/tools/audit/reanchor-citations.mjs` — citation maintenance tool
- `tempest/docs/audit/findings/*.json` — audit findings database
- Audit commit SHA: 4232ed4
- ROM source at: ~/Projects/tempest-source-text (canonical LF copy, NOT CRLF sibling)

## Delivery Findings

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Current mechanism (read before you touch it).** `tools/audit/check-citations.mjs`:
  - **`ours` is read from the WORKING TREE.** The live arm is the final `else` at
    **check-citations.mjs:154–165**: `const actual = lineAt(join(repoRoot, f.ours.file), f.ours.line)`
    (`lineAt`, lines 26–32, does `readFileSync(path).split('\n')[n-1]`), byte-compared
    `actual.trimEnd() !== f.ours.verbatim.trimEnd()` at **:158**. **This is the one line to change** (repoRoot → audit commit).
  - **`source` is read live from `sourceDir`** at **:77** `lineAt(join(sourceDir, f.source.file), f.source.line)`,
    compared at **:80**, guarded by `else if (sourceDir)` at **:76** (skipped when sourceDir is null, e.g. CI). **Leave this arm alone** — it is AC-2 and must stay live against `~/Projects/tempest-source-text` (the LF copy, NEVER the CRLF sibling `~/Projects/tempest-source`).
  - **`remediated_by` short-circuit** at **:117** `else if (f.remediated_by)` skips the `ours` byte-check entirely (NO_COUNTERPART branch :139 validates shape only; non-NO_COUNTERPART remediated :147 requires `ours.file` present but does NOT byte-compare). `node_modules` is rejected first at **:111**.
- **Test file:** `tempest/tests/audit/citation-gate-freeze.test.ts` (deliberately NOT named `*citations*`, so `npm test -- citations` still runs only the live gate — 25 green — while these run under `npm test -- freeze`). 5 tests:
  - **AC-5 headline `GREEN` (the RED pin):** builds a synthetic DIVERGENCE finding whose `ours.verbatim` is the **audit-commit** text of a line that changed since `4232ed4`, then asserts `checkFindings(...) === []`. FAILS today because the checker reads the working tree.
  - **AC-5 `ANTI-VACUOUS`:** a frozen `ours` quote present in *no* version of the file must still redden (blocks a "skip the ours check" cheat). Green now + after.
  - **AC-5 `SOURCE STAYS LIVE` (skipIf no source):** a mismatched ROM `source` line still reddens (blocks a "freeze both sides" mistake). Green now + after.
  - **AC-4a:** the real **S-010** (a NO_COUNTERPART + `remediated_by` whose `ours` points at post-audit ADDED code) must stay green — the checker must NOT byte-read a remediated finding's `ours` from the audit commit.
  - **AC-4b (robustness):** a finding whose `ours.file` is absent from the audit commit must yield a *returned* error string, `.not.toThrow()` — because `git show 4232ed4:<absent>` throws. This is the "clear error, not confusing hard-error" AC-4 actually needs.
- **How AC-5 is made non-gameable / hermetic:** driven programmatically through `checkFindings` (no re-derivation of its arithmetic). The fixture line is *found* (`pickChangedLine`) by diffing the audit commit against the working tree, and a guard asserts the two texts differ (`expect(auditText).not.toBe(workingText)`) so the fixture can't go vacuous. The green-on-`ours`-mutation direction (headline) and the red-on-`source`-mutation direction (source-live) are both asserted, plus red-on-ghost-`ours`; a checker that trivially passes everything fails the anti-vacuous/source tests, one that trivially fails everything fails the headline.
- **RED proof (right reason):** headline fails on `src/core/rules.ts:3` — audit commit says `import { type Rng, nextFloat } ...`, working tree says `... nextInt ...`; current checker read the working tree and pushed `AC5-FROZEN: ours src/core/rules.ts:3 does not match verbatim`. `1 failed | 4 passed`. Live gate `npm test -- citations` = **25 passed** (4 files), unchanged.

**Gotchas for Dev (GREEN):**
1. **`ours.line` is NOT the audit-commit row.** tp1-1 (and later stories) re-anchored line numbers to the WORKING TREE. Of 104 non-remediated `ours`-bearing findings measured against `4232ed4`: **17** match verbatim at `ours.line` (by-line read works), **71** have the text present but at a *different* line (need a TEXT search — mirror `reanchor-citations.mjs:62`'s nearest-match), **12** have the verbatim ABSENT from the frozen file entirely, **4** have `ours.file` absent from the frozen commit. So a naive `git show 4232ed4:<file>` at `ours.line` reddens ~87; even a by-text search reddens 16. **AC-6 (gate stays green) is NOT free** — Dev must re-baseline those 16 verbatims to their `4232ed4` text (or mark them `remediated_by` if actually fixed) and read `ours` by TEXT, not by stored line.
2. **Keep `remediated_by` skipping the `ours` byte-check** — do not read a remediated finding's `ours` from the frozen commit (S-010's `ours` is post-audit added code, absent as a quote at `4232ed4`).
3. **Wrap `git show` in try/catch → clear returned error**, never let it throw (AC-4b).
4. Keep the audit SHA as one named constant; the test hardcodes `4232ed4` and must match it.
5. **CONFLICT — AC-4 as worded is wrong.** "NO_COUNTERPART can never be marked `remediated_by`; today that combination hard-errors" is false against the repo: the current checker ACCEPTS it, **ten** real findings are NO_COUNTERPART + `remediated_by` (W-002, W-032, V-020, V-022, S-010, S-014, S-015, DB-008, DB-014, WD-018), CLAUDE.md blesses S-010, and AC-3 forbids reverting them. Do **not** implement a ban — that would fail 10 real findings and violate AC-3. The genuine hazard is the `git show` crash (AC-4b); the tests pin the defensible behavior (combination stays valid, freeze must not break it).

### Dev (implementation)

**The checker change (`tools/audit/check-citations.mjs`).** `ours` is now read from the AUDIT
COMMIT, never the working tree.
- Added `import { execFileSync }` and `const AUDIT_COMMIT = '4232ed4'` (one named constant;
  matches the test's hardcoded SHA). check-citations.mjs:2, :20.
- New `frozenFileAt(repoRoot, file)` (check-citations.mjs:51–67): reads `git show
  4232ed4:<file>` once per file (cached), `stdio` discards stderr. `git show` THROWS for a
  path absent from the commit → caught → returns `{ error }`, never propagates (AC-4b).
- The old working-tree `else` arm (was :154–165) now (check-citations.mjs:~200–224) reads the
  frozen file and matches the verbatim **BY TEXT** — `frozen.lines.some(l => l.trimEnd() ===
  verbatim.trimEnd())` — mirroring `reanchor-citations.mjs`, because tp1-1+ re-anchored
  `ours.line` to the working tree so the stored row is no longer the audit row. `ours.line` is
  now decorative. Absent-from-commit → clear returned error ("cannot be frozen … re-baseline
  … or mark remediated_by"); verbatim-absent → "does not match verbatim at 4232ed4".
- **Source side untouched** (AC-2): still live via `lineAt(sourceDir, …)`, still `else if
  (sourceDir)`-guarded, so the null-source (CI) path only skips `source`. Verified: CI
  simulation `checkFindings(all, {sourceDir:null})` = **0 errors** over all 237 findings.
- **`remediated_by` short-circuit kept** (check-citations.mjs:152): a remediated finding's
  `ours` is never frozen-read (S-010 points at post-audit ADDED code). AC-4a stays green.
- **No NO_COUNTERPART-cannot-be-remediated ban** implemented (would fail the 10 real
  NO_COUNTERPART+remediated findings and violate AC-3; AC-4 is satisfied by the AC-4b clear
  error). Confirmed TEA's CONFLICT reading.
- **Fixed a stray NUL byte** I introduced in the cache-key template on first write (git saw
  the file as binary); replaced with `::`. File is valid UTF-8 again; `node --check` clean.

**The re-baselining work (AC-6 — 16 findings that the frozen read reddened).** Measured live
(matches TEA exactly: 17 by-line, 71 by-text present, 12 verbatim-absent, 4 file-absent). For
each of the 16 I restored `ours` to its **exact `4232ed4` value** (file+line+verbatim, pulled
from `git show 4232ed4:docs/audit/findings/*.json` — the immutable record itself), because in
EVERY case the finding's own **claim text still references the audit-commit code** (`level`
not `wave`, `FAR_RATIO` not `r`, `spawn.remaining` not `spawn.nymphs.length`, `render.ts:790`
etc.) — later stories dragged only the `ours` block forward, not the claim. Re-baselining
re-aligns `ours` with its own claim and restores the record.
- **Pure drift / rename / code-moved-to-another-file — RE-BASELINED (14), no `remediated_by`**
  (all CONFIRMED / STRUCTURAL / accepted / wont_fix — never a defect to "fix", just drifted):
  W-031 (tanker.ts:22, code moved to sim.ts), W-036 (rules.ts:252; tp1-8 replaced the
  weighted-roll gate with max tables but finding is CONFIRMED, waves still match), V-003
  (render.ts:263), DB-005 (geometry.ts:38, FAR_RATIO→r rename), DB-013 (render.ts:251), SC-006
  (render.ts:701), SC-007 (render.ts:699, comment reworded), P7-004 (state.ts:93), WD-003 +
  WD-011 (rules.ts:51, level→wave rename), WD-016 (sim.ts:538, spawn.remaining→nymphs.length),
  W-038 (spiker.ts:13, moved to interpreter.ts), W-041 (sim.ts:161, moved), W-048
  (flipper.ts:16, moved). Their audit files tanker/spiker/flipper/pulsar.ts were deleted (all
  enemy code consolidated into interpreter.ts) — the frozen commit still has them, so the
  freeze resolves.
- **V-018 — RE-BASELINED (render.ts:790), NOT stamped, FLAGGED.** tp1-20 (#136, 48c1d8b) DID
  fix the color/caption half (working HUD is green score / blue level / green hi-score, no
  captions — exactly the finding's ROM template). BUT V-018 also claims the ROM places the hi
  score *under player 1's score*, not centred at top — working code is still `W/2 … 'center'`.
  Partial fix ⇒ I did NOT stamp `remediated_by` (avoids a partial phantom fix). **Reviewer:
  decide if tp1-20 fully remediates V-018 or if the layout sub-claim is a live remainder /
  its own finding.**
- **W-028 — RE-BASELINED (pulsar.ts:19) + `remediated_by: tp1-1`.** VERIFIED genuine fix, not
  a phantom: W-028 = "BOTH pulsar speeds 2.11× too fast … 82.5 is literally 1.375×60". tp1-1
  (#97, d75a4a2 "rom fps rebase") removed 82.5 — its commit message names *both* speeds
  ("FLIPPER_L1 was 82.5/224 — that 82.5 IS 1.375 x 60" and "PULSAR_NEAR_SPEED, same hidden
  60"). Working `PULSAR_CLIMB_SPEED` is now `(PULSAR_ALONG_PER_FRAME * ROM_FPS)/WARP_ALONG_SPAN
  ≈ 0.175 depth/s`; `flipperSpeed` derives from `ROM_FPS`. Single clean cause, verified in code
  + commit. **Reviewer: scrutinize this one `remediated_by` — it is the only fix claim I added.**

**reanchor-citations.mjs — rewritten (necessary, flagged).** After re-baselining, the tool
still read the WORKING tree and reported **12 LOST** (the re-baselined findings whose audit
code was renamed/removed in the working tree) — it now contradicted the frozen checker. Since
`ours` is frozen and `ours.line` is decorative, the tool can no longer re-point lines against
the working tree (that would drift citations off the immutable record and, on `--write`,
revert AC-3's 82). Rewrote it to VALIDATE each `ours` verbatim against `git show 4232ed4:` and
report LOST if absent (skip remediated + files-absent-from-commit); removed the move/`--write`
machinery. Now: **103 present, 0 lost**.

**Docs.** Updated `tempest/CLAUDE.md` "citation gate" section: `ours` reads from `4232ed4`,
CI `fetch-depth: 0` keeps the blob reachable, and the old rule-2 "run reanchor `--write` to
re-point citations by hand" is retired (that tax is the whole thing tp1-22 removes). Stale
`--write` mentions remain in tp1-7/tp1-8 test-file COMMENTS only (non-load-bearing) — left for
a doc-hygiene follow-up.

**CI safety.** The frozen `git show 4232ed4:` needs the audit commit in history. The reusable
deploy workflow already uses `fetch-depth: 0` *specifically* for red-baron's identical
audit-commit gate (orchestrator `.github/workflows/deploy-r2.yml:28–36`), so tempest now joins
that established pattern — CI-safe.

**Gate results:** `npm test -- freeze` **5/5**; `npm test -- citations` **25/25** (was 25 — 2
pre-existing `citations.test.ts` ACCEPT tests built fixtures from the working tree and had to
be re-sourced from `4232ed4`, preserving intent); full `npm test` **1659/1659** (140 files);
`npm run build` clean; `reanchor` **0 lost**; CI null-source sim **0 errors**.

### Reviewer (code review)

- **Verification** (non-blocking): W-028's `remediated_by: tp1-1` is a GENUINE fix, not a phantom. Verified in commit `d75a4a2` (#97): it removed `PULSAR_CLIMB_SPEED = 82.5 / WARP_ALONG_SPAN` and replaced it with `(PULSAR_ALONG_PER_FRAME * ROM_FPS) / WARP_ALONG_SPAN ≈ 0.175 depth/s` — exactly the target W-028's claim demands — and rebased `flipperSpeed` off `ROM_FPS`; both speeds, one cause (the hidden ×60), one commit. Fix is live in `src/core/rules.ts:449` (not reverted). *Found by Reviewer during code review.*
- **Verification** (non-blocking): all 16 re-baselines restore the TRUE `4232ed4` text — each new `ours.verbatim` is EXACT at its cited line at the audit commit AND unique in that file (by-text hit count = 1). No fabricated or post-fix strings; no corrupted audit records. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the frozen `ours` match is by-text-anywhere-in-file (`frozen.lines.some(l => l.trimEnd() === want)`), so `ours.line` is decorative. This is a mild, deliberate looseness vs the old by-line check, but current exposure is ZERO: across all 103 non-remediated findings, non-unique verbatims = 0 and short (≤8-char) verbatims = 0. Reads the immutable commit and is fail-closed (a missing blob reddens, never falsely greens). Affects `tools/audit/check-citations.mjs:204`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `AUDIT_COMMIT` is the 7-char short SHA `'4232ed4'` in `check-citations.mjs:20`, `reanchor-citations.mjs`, and both test files. Pinning the full 40-char SHA (`4232ed41df431218b78b2fc28f772c2de09b730d`) would foreclose any future prefix-ambiguity; failure mode is already fail-closed. *Found by Reviewer during code review.*
- **Gap** (non-blocking): V-018's hi-score LAYOUT sub-claim (ROM places the hi-score under player 1's score, not centred at top) remains LIVE — `src/shell/render.ts:906` still draws it `W/2 … 'center'`. Dev correctly left V-018 un-stamped (tp1-20 fixed only the colour/caption half); recommend filing the layout remainder as its own follow-up so it is not lost. *Found by Reviewer during code review.*

## TEA Assessment

**Tests Required:** Yes
**Reason:** New tooling behavior (freeze `ours` to the audit commit; source stays live) must be pinned before Dev implements.

**Test Files:**
- `tempest/tests/audit/citation-gate-freeze.test.ts` — AC-5 headline (RED) + anti-vacuous/source-live guards + AC-4a/AC-4b guards. 5 tests.

**Tests Written:** 5 tests covering AC-4 and AC-5 (AC-1/AC-2 are exercised through the AC-5 headline + source-live tests; AC-3/AC-6 are guarded by the live gate staying at 25 green).
**Status:** RED — headline fails against current tooling for the right reason (`ours` read from the working tree); the 4 guards pass now and must stay green.

**Handoff:** To Dev for implementation (GREEN).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `tools/audit/check-citations.mjs` — `ours` read from audit commit `4232ed4` by text (was working tree); AC-4b try/catch; source side unchanged.
- `tools/audit/reanchor-citations.mjs` — validates `ours` against the frozen commit (was working-tree line re-anchoring).
- `tests/audit/citations.test.ts` — 2 pre-existing ACCEPT tests re-sourced their fixture from `4232ed4` (contract change from the freeze).
- `docs/audit/findings/*.json` (6 files) — 16 findings' `ours` re-baselined to their `4232ed4` values; `remediated_by: tp1-1` added to W-028.
- `CLAUDE.md` — citation-gate section updated to the frozen model.

**Tests:** freeze 5/5, citations 25/25, full 1659/1659 (GREEN). Build clean. reanchor 0 lost. CI null-source sim 0 errors.
**Branch:** chore/tp1-22-citation-gate-freeze (committed; not pushed)

**For the Reviewer to scrutinize:**
- The single `remediated_by: tp1-1` I added (W-028) — verified against commit d75a4a2 (#97), which names both pulsar speeds.
- V-018 — re-baselined but NOT stamped; tp1-20 fixed colors/captions, the layout sub-claim may remain live. Judgement call flagged.
- reanchor rewrite + CLAUDE.md edit — necessary consequences of the freeze, beyond the checker itself.

**Handoff:** To review.

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- **Re-baselined 16 findings + rewrote reanchor (beyond the checker):** TEA's plan scoped the change to check-citations.mjs + re-baselining. On contact, re-baselining the 16 `ours` blocks to their `4232ed4` values made `reanchor-citations.mjs` (which still read the WORKING tree) report 12 LOST — it now contradicted the frozen checker. Rewrote reanchor to validate against the audit commit (0 lost). Also updated `CLAUDE.md` (its rule-2 "reanchor `--write` to re-point by hand" is exactly the workflow tp1-22 retires). Both are causally required by the freeze; flagged for Reviewer.
- **V-018 left un-stamped despite a real partial fix:** tp1-20 remediated its color/caption half; the hi-score-layout sub-claim appears unaddressed. Chose re-baseline + flag over `remediated_by` to avoid a partial phantom fix (per the documented trap). Reviewer to adjudicate.
- **`ours.line` now decorative:** the frozen checker matches the verbatim by TEXT anywhere in the audit-commit file (mirrors reanchor's nearest-match), so the stored line no longer gates. The 71 tp1-1 by-text re-pointings keep their working-tree line numbers untouched (AC-3) — the checker ignores them.
