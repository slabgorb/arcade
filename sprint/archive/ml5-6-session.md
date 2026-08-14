---
story_id: "ml5-6"
jira_key: "ml5-6"
epic: "ml5"
workflow: "tdd"
---
# Story ml5-6: Claims-test convention debt (ml5-2 Reviewer finding, rule #10/#18): every millipede claims-arm test re-declares a narrower local Claim interface and casts JSON.parse with no runtime check — import the real Claim from tools/audit/check-citations.d.mts and add one shared parse helper in tests/audit/dossier-sweep.ts; sweep high-scores/palette/waves-scoring/bonus-select claims tests onto it.

## Story Details
- **ID:** ml5-6
- **Jira Key:** ml5-6
- **Type:** chore
- **Workflow:** tdd
- **Points:** 2
- **Stack Parent:** none (not stacked)
- **Branch Strategy:** gitflow (feat/ml5-6-claims-tests-share-real-claim-type)
- **Branch:** feat/ml5-6-claims-tests-share-real-claim-type
- **PR:** https://github.com/slabgorb/arcade/pull/388 (code PR, MERGED 2026-08-14 as 2cfb50bd)

## Background

This is convention debt from ml5-2 Reviewer findings (rule #10/#18): every millipede claims-arm test locally re-declares a narrower `Claim` interface and casts `JSON.parse` with **no runtime validation**. The real `Claim` type lives in `plugins/millipede/tools/audit/check-citations.mjs` (with types in the sibling `check-citations.d.mts`), and is already imported in-tree by `plugins/millipede/tests/audit/dossier-sweep.ts:27-28` (canonical pattern: `import { isValidClaimSource } from '../../tools/audit/check-citations.mjs'` and `import type { Claim } from '../../tools/audit/check-citations.mjs'`).

The four target claims tests each re-declare a local `interface Claim` and perform an unsafe cast:
- `plugins/millipede/tests/audit/high-scores-claims.test.ts:34` (parses at :89,:102)
- `plugins/millipede/tests/audit/palette-claims.test.ts:40` (parses at :80,:93)
- `plugins/millipede/tests/audit/waves-scoring-claims.test.ts:29` (parses at :81,:94)
- `plugins/millipede/tests/audit/bonus-select-claims.test.ts:32` (parses at :96,:109)

The `dossier-sweep.ts` module already hardens its own load path (df1-6, :141-154). The solution: add one shared runtime-checked parse helper in `dossier-sweep.ts`, exported alongside the existing helpers, and sweep the four tests onto it. Note: other millipede tests (`mushroom-claims.test.ts`, `hud-claims.test.ts`, `citations.test.ts`) also re-declare `Claim` locally, but they are OUT of this story's named scope.

## Acceptance Criteria

1. **Import the real Claim type:** `plugins/millipede/tests/audit/dossier-sweep.ts` imports `Claim` (type), `checkClaims`, and `isValidClaimSource` from the real module at `../../tools/audit/check-citations.mjs`.

2. **Add shared parse helper:** `dossier-sweep.ts` exports a new function (e.g., `loadClaimsJSON`) that reads a file, parses JSON, and validates the result against the real `Claim` type using `isValidClaimSource` or similar runtime validation before returning the typed array.

3. **Sweep four target tests:** Each of the four named claims tests (high-scores, palette, waves-scoring, bonus-select) removes its local `Claim` interface re-declaration, imports the real `Claim` type from the shared module, and calls the new shared parse helper instead of `JSON.parse(... as Claim[])`.

4. **Verify no cast-without-check:** All unsafe `as Claim[]` casts are replaced with runtime-validated calls; linting and tests pass; no other claims tests are modified (mushroom, hud, citations remain out of scope).

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-14T19:28:53Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-14T18:58:03Z | 2026-08-14T19:00:14Z | 2m 11s |
| red | 2026-08-14T19:00:14Z | 2026-08-14T19:06:23Z | 6m 9s |
| green | 2026-08-14T19:06:23Z | 2026-08-14T19:14:52Z | 8m 29s |
| review | 2026-08-14T19:14:52Z | 2026-08-14T19:28:53Z | 14m 1s |
| finish | 2026-08-14T19:28:53Z | - | - |

## Delivery Findings

No upstream findings.

## Design Deviations

**One shared narrow guard added beyond the literal "one parse helper" (AC2).** The story
names one deliverable — the shared parse helper. GREEN adds TWO shared exports to
`dossier-sweep.ts`: `loadClaimsFile(path)` (the parse helper AC2 names) AND a small
`isTextClaim(c): c is TextClaim` guard + `TextClaim` type. Rationale: the real `Claim.source`
is the `{file,line,verbatim} | {file,offset,bytes}` union, and the four files read `.line` /
`.verbatim` (text-branch only). Something must narrow the union at those sites. The DRY choice
(lang-review #18, which this story's own finding cites) is ONE shared guard, not four local
`'verbatim' in c.source` narrows re-invented per file. `isTextClaim` is 3 lines, composes with
the existing `'line' in src` idiom in `claimCovers`, and keeps the "no local narrower Claim"
convention intact. Not gold-plating — it is the mechanism that makes the swap compile.

**Narrowing is an ASSERTION, not a filter, in the byte-verify loops.** In the `own` loops that
prove "every claim in this file cites a .MAC line with a verbatim", GREEN uses
`if (!isTextClaim(c)) expect.unreachable(...)` (which returns `never`, so it both narrows for
tsc AND fails loudly). This is STRICTER than the pre-refactor code, which merely assumed the
text shape via the local narrower type and never checked it. A byte claim smuggled into a
text-only claims file now reddens instead of type-erroring.

**`loadClaims` refactored to delegate to `loadClaimsFile`.** The df1-6 per-file parse+validate
body moved into `loadClaimsFile`; `loadClaims(dir)` now `.flatMap`s its files through it. Error
labels use `basename(path)` so the df1-6 messages ("claims file broken.json is not valid JSON…")
are byte-identical — `load-claims-hardening.test.ts` stays 8/8 green.

## Dev Verification (GREEN)
- `npm run lint` (tsc --noEmit, repo-wide): clean.
- millipede vitest project: **1131/1131** (68/68 files); new `claims-tests-use-real-claim.test.ts` **22/22** (was 22/22 RED); the four swept files green; `load-claims-hardening.test.ts` 8/8.
- `npm run test:orchestrator`: **498/498**.
- Diff scope: exactly `dossier-sweep.ts` + the four named files. Out-of-scope claims tests (`mushroom`/`hud`/`citations`) untouched (AC4). Commit `517859eb`.

## Sm Assessment

**Story ml5-6** (2pt, chore, millipede, tdd) — a convention-debt cleanup surfaced by the ml5-2 Reviewer (rules #10/#18): every millipede claims-arm test re-declares a narrower local `Claim` interface and casts `JSON.parse(...) as Claim[]` with no runtime check.

**Premise verified against the current tree before setup.** Sound, with one stale detail corrected: the epic description's bare path `tools/audit/check-citations.d.mts` does not exist. The real module is `plugins/millipede/tools/audit/check-citations.mjs`, which already `export`s `interface Claim` (:24), `checkClaims` (:68), and `isValidClaimSource` (:76). The canonical import pattern already lives in-repo at `plugins/millipede/tests/audit/dossier-sweep.ts:27-28` (`import type { Claim } from '../../tools/audit/check-citations.mjs'`) — that relative path, not the bare one, is what the claims tests adopt. sm-setup wrote Background/ACs from these measured facts, not the stale path.

**Named scope (four tests, each re-declaring `Claim` + unchecked cast):**
- `high-scores-claims.test.ts:34` (parses :89,:102)
- `palette-claims.test.ts:40` (parses :80,:93)
- `waves-scoring-claims.test.ts:29` (parses :81,:94)
- `bonus-select-claims.test.ts:32` (parses :96,:109)

The "one shared parse helper" belongs alongside `dossier-sweep.ts`'s existing hardened load path (df1-6, :141-154), exported for the four tests to sweep onto. **Out of scope** unless a later AC says otherwise: `mushroom-claims`, `hud-claims`, `citations` also re-declare `Claim` but were not named by the story.

**ACs derived** (epic YAML had `acceptance_criteria: null`) — no verbatim-copy drift to police.

**Board:** backlog → in_progress (stamped; sm-setup does not). No sibling owns ml5-6 (branch + session probes clean; a-1 is on ml8-2, different files). Merge gate clean. Claim committed (`6e6b15bb`) and branch `feat/ml5-6-claims-tests-share-real-claim-type` pushed for sibling visibility.

**Handoff → TEA (Leeloo) for RED.** Write failing tests proving the four named tests import the real `Claim` and route parses through the shared runtime-checked helper; the natural RED asserts no local `Claim` re-declaration and no unchecked `as Claim[]` cast survives in the four files.

## Tea Assessment

**RED landed.** New file `plugins/millipede/tests/audit/claims-tests-use-real-claim.test.ts` (commit `24e71081`), 22 tests, **all 22 RED for the right reasons**; rest of the millipede project green (1109/1109, 67/67 other files). Verified via testing-runner (`npx vitest run --project millipede`).

**What the RED pins (the GREEN spec):**
1. **Convention sweep** — for each of the four named files (`high-scores-claims`, `palette-claims`, `waves-scoring-claims`, `bonus-select-claims`): (a) no local `interface Claim`, (b) no `as Claim[]` cast, (c) no hand-rolled `JSON.parse(readFileSync(NEW_CLAIMS…))`, (d) imports `loadClaimsFile` from `./dossier-sweep`. 16 tests, RED because the debt is present today.
2. **Shared helper behaviour** — `loadClaimsFile(path): Claim[]`, a new export in `dossier-sweep.ts`: loads a good TEXT claim, accepts a BYTE claim, normalises a single object → one-element list, and runtime-rejects malformed JSON / no-source / partial-source with a controlled error that NAMES the file. 6 tests, RED because the helper does not exist yet (`TypeError: loadClaimsFile is not a function`).

**Design facts Dev MUST know (this is the 2-point work, not a rename):**
- The **real** `Claim.source` is a UNION — `{file;line;verbatim} | {file;offset;bytes}` (`plugins/millipede/tools/audit/check-citations.d.mts:44`). The four files' local `Claim` is the narrower text-only shape and they read `c.source.verbatim` / `c.source.line` directly. Swapping in the real type breaks every such access with **TS2339** (those fields live only on the text branch). This is expected — do NOT dodge it by re-introducing a local interface or an `as` cast. Narrow at the read sites; `dossier-sweep.ts:172-175` (`claimCovers`) already uses the `'line' in src` idiom.
- Each file has **three** casts to kill, not two: `(loadClaims() as Claim[])` (the narrowing lie — `loadClaims()` already returns the real `Claim[]`) plus two `JSON.parse(...NEW_CLAIMS...) as Claim[]`. After the refactor, `loadClaims()` needs no cast; the two `JSON.parse` sites become `loadClaimsFile(NEW_CLAIMS)`.
- **`loadClaimsFile` should share loadClaims' df1-6 hardening, not duplicate it** (lang-review #18: extract on the 5th consumer). Natural design: factor the per-file parse+validate body of `loadClaims` (`dossier-sweep.ts:151-166`) into `loadClaimsFile(absPath)`, and have `loadClaims(dir)` map its files through it. `loadClaimsFile` reads an absolute path (the tests pass `join(claimsDir, '…json')`).
- `dossier-sweep.ts` does NOT re-export `Claim`. Tests can `import type { Claim } from '../../tools/audit/check-citations.mjs'` (as dossier-sweep does), or Dev may add a re-export so tests have one import source — either satisfies "no local narrower Claim". Not asserted; Dev's call.

**Rule Coverage (typescript lang-review):**
- **#10 (input-validation — `JSON.parse` typed with `as T` without runtime validation):** the CORE of this story. RED tests 5-8 forbid the `as Claim[]` cast in each file; behaviour tests 20-22 require `loadClaimsFile` to runtime-validate (reject malformed / wrong-shape / partial-source). ✅ covered.
- **#18 (one concept, two helpers / test apparatus):** RED requires the parse to be the ONE shared `loadClaimsFile` rather than four hand-rolled copies. Dev instructed to factor from `loadClaims`, not duplicate. ✅ covered.
- **#1 (type-safety escapes — `as` casts):** negative guards forbid `as Claim[]` in the four files. ✅ covered.
- **#15/#25 (source-text guards):** the convention guards are absence checks over whole files (safe per #25) plus one positive guard anchored to an `import { … loadClaimsFile … } from './dossier-sweep'` STATEMENT (not a bare token). All four convention guards are RED today → mutation-proven non-vacuous by arrival. ✅.

**Out of scope (do NOT touch — AC4):** `mushroom-claims.test.ts`, `hud-claims.test.ts`, `citations.test.ts` also re-declare `Claim` locally but are not named by this story. A Reviewer diff concern (can't be asserted in-suite): confirm no other claims test file is modified.

**Handoff → Dev (Korben) for GREEN.** Add `loadClaimsFile` to `dossier-sweep.ts` (shared with `loadClaims`); sweep the four named files onto the real `Claim` + `loadClaimsFile`, narrowing text-branch accesses. Then all 22 go green with the rest of the project staying green.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings (hand-covered by Reviewer) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings (hand-covered by Reviewer) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings (hand-covered by Reviewer) |
| 7 | reviewer-security | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings (hand-covered by Reviewer) |
| 9 | reviewer-rule-checker | Yes | findings | 4 (1 High, 3 Low) | confirmed 3 (1 fixed round 2, 2 fixed), dismissed 1 (pre-existing/out-of-scope) |

**All received:** Yes (3 enabled returned; 6 disabled via settings, hand-covered)
**Total findings:** 3 confirmed (all resolved in review round 2), 1 dismissed (pre-existing, out of scope), 0 deferred

## Reviewer Assessment

**Verdict: APPROVED** — round-1 found one High; it was fixed and re-verified in review round 2 (commit `8623209d`). No open Critical or High remains.

This is a test-convention chore. The shipped code is correct and the deliverable — a *durable* guard against the re-declared-`Claim` / unchecked-`JSON.parse` debt — now actually holds. I did not rubber-stamp: the rule-checker mutation-proved the original guard was defeatable, and I required and applied the fix before approving.

**Enabled-subagent incorporation (plain tags):**
- [PRE] reviewer-preflight — CLEAN: tsc clean, millipede 1131/1131 (68 files), orchestrator 498/498, no smells, no leftover casts, out-of-scope files retained. Incorporated as the round-2 re-verification baseline.
- [SEC] reviewer-security — CLEAN, no findings: the diff is a net improvement on rules #10/#1 (removes 8 unchecked casts, routes parses through validated `loadClaimsFile`); no untrusted input, no path-traversal, no info-leak (inputs are committed fixtures + test-authored temp files). Confirmed against my own read; nothing to dismiss.
- [RULE] reviewer-rule-checker — 4 findings (1 High, 3 Low): the High and two Lows confirmed and FIXED in review round 2 (commit `8623209d`); one Low dismissed as pre-existing/out-of-scope (see finding 4). See the Findings list below for each with its [RULE] tag.

### Findings

1. `[RULE]` `[HIGH]` **(RESOLVED round 2)** — the four convention guards in `claims-tests-use-real-claim.test.ts` scoped their parse-check to the whole file AND anchored to the literal `NEW_CLAIMS` token (lang-review #15/#25). The rule-checker rerouted one call site through an intermediate variable (`const p = NEW_CLAIMS; JSON.parse(readFileSync(p,'utf8'))`) and all 22 stayed green — the exact df1-6 debt this story exists to remove would ship silently. **Fix:** the guard now forbids `JSON.parse` outright in the four consumer files (`claims-tests-use-real-claim.test.ts:78-90`), which parse no JSON directly anymore (verified: `grep JSON.parse` over the four = zero legitimate hits). **Re-mutation-proven by me:** reapplied the exact variable-routed parse to `bonus-select` → the strengthened guard reddened (`expected … not to match /\bJSON\.parse\b/`); restored, tree clean.
2. `[RULE]` `[LOW]` **(RESOLVED round 2)** — `isTextClaim` used `'verbatim' in c.source` with no null guard, unlike the sibling `claimCovers` (`if (!src || …)`) eleven lines away (#1). A null source smuggled past validation would throw on `in` instead of returning `false`. **Fix:** `dossier-sweep.ts:190` now reads `c.source != null && 'verbatim' in c.source`.
3. `[RULE]` `[LOW]` **(RESOLVED round 2)** — the new file's line-51 comment `// Undefined until GREEN — throws (RED) until it exists` read false in the squashed/merged view since GREEN had landed (#17). **Fix:** reworded to record provenance without a false present-tense claim.
4. `[RULE]` `[LOW]` **(DISMISSED — pre-existing, out of scope)** — `loadClaimsFile` validates `source` via `isValidClaimSource` but not `id`/`claim` string-ness before `return entries as Claim[]` (#10). Rationale: this logic was moved **verbatim** from the pre-refactor `loadClaims` (not introduced here), the docstring honestly scopes itself to "validate every entry's **source**", and the only inputs are committed local fixtures + test-authored temp files (security subagent concurred: no untrusted input reaches it). Widening validation is df1-6 territory, not ml5-6 scope.

### Observations (≥5)

- `[VERIFIED]` `loadClaimsFile` is a faithful extraction of `loadClaims`' prior inline body — error label `basename(filePath)` equals the old bare `readdirSync` filename, so df1-6 messages are byte-identical. Evidence: `load-claims-hardening.test.ts` stays 8/8 green (`toThrow(/broken\.json/)` etc.) and `loadClaims(dir)` now `.flatMap`s through it (`dossier-sweep.ts:180`).
- `[VERIFIED]` No open `as Claim[]` / `interface Claim` in the four consumer files — evidence: `grep` over the four returns zero; preflight confirmed; AC4 out-of-scope files (`mushroom`/`hud`/`citations`) still carry theirs unchanged (rule-checker #24 verified).
- `[VERIFIED]` `[TYPE]` `isTextClaim`/`TextClaim = Claim & { source: Extract<Claim['source'], { verbatim: string }> }` is a sound predicate; the byte-verify loops use it as an **assertion** (`if (!isTextClaim(c)) expect.unreachable(...)`, `never`-returning → narrows AND fails loud), which is *stricter* than the pre-refactor code that merely assumed the text shape. Evidence: `dossier-sweep.ts:184-192`, e.g. `high-scores-claims.test.ts:111`.
- `[VERIFIED]` `[RULE #19]` the `.filter(isTextClaim)` in `storyClaims`/`paletteClaims` filters on exactly the field the loop bodies read (`.line`/`.verbatim`) — the compliant shape #19 recommends, not a neighbouring-field exclusion; and these populations are TEXT-only by construction (GPL `.MAC` citations), with population floors that fail loud. Rule-checker independently confirmed.
- `[PRE]` `[VERIFIED]` full suite green with the round-2 fixes: `tsc --noEmit` clean, millipede **1131/1131** (68/68 files), orchestrator **498/498**.
- `[VERIFIED]` diff scope is exactly `dossier-sweep.ts` + the four named files + the new guard file (+ sprint context/epic YAML). No production game code touched — this is test tooling only.

### Rule Compliance (typescript lang-review)

- **#1 type-safety escapes** — COMPLIANT. Eight unchecked casts removed (four `JSON.parse … as Claim[]`, four `loadClaims() as Claim[]`); the sole remaining `entries as Claim[]` (`dossier-sweep.ts:170`) is post-`isValidClaimSource` and pre-existing. `isTextClaim` predicate has runtime validation inside.
- **#10 input-validation** — COMPLIANT (net improvement). All four single-file parses now route through the runtime-checked `loadClaimsFile`. Residual id/claim gap is pre-existing (finding 4, dismissed).
- **#15 / #25 source-text guards** — COMPLIANT after round-2 fix. Negative guards over whole file (safe per #25); the one positive guard anchors to an import statement; the parse guard now forbids `JSON.parse` outright (re-mutation-proven). Each of the 16 convention guards was individually RED at TEA's RED run.
- **#18 one concept / test apparatus** — COMPLIANT. One shared `loadClaimsFile` + one shared `isTextClaim`, not per-file duplication; the behaviour-block fixtures roundtrip through the real function (not self-referential).
- **#19 population filtered by neighbouring field** — COMPLIANT (filter keys on the read field).
- **#24 retirement scope** — COMPLIANT. Header enumerates in-scope (4) vs out-of-scope (3) files; grep confirms the 3 are unchanged.
- **#5 module/type exports** — COMPLIANT. `export type TextClaim` uses `export type`; import-extension convention matches the file's siblings.

### Devil's Advocate

Argue this is broken. First attack: the whole deliverable is a *test* that guards other tests — a guard that cannot fail is worse than none, because it certifies safety it does not provide. That attack landed once: the rule-checker showed the original parse guard was token-anchored and a one-line variable indirection defeated it while staying green. That is precisely the failure this file exists to prevent, reproduced inside the file itself. Fixed now, and re-mutation-proven — but it justifies suspicion of every other guard here. Second attack: the negative guards (`.not.toMatch`) are whole-file; could the debt hide in a form none of them match? A regressor could write `const raw = readFileSync(p,'utf8'); const own = JSON.parse(raw)` split across two statements — but the strengthened guard forbids `JSON.parse` *anywhere* in these four files, so that dodge now reddens too; the only escape is to stop parsing JSON entirely, which is the desired end state. Third attack: `isTextClaim` filtering could silently drop a legitimate claim, making a population floor pass on fewer entries than intended — but the floors (`>= 25`, `>= 23`, `>= 12`, `>= 8`) fail *loud* on under-count, and every one of these stories' claims is a `.MAC` text citation by construction, so the filter drops nothing real; a byte claim carrying a `BL-`/`HS-` prefix is not a thing the vendored data produces. Fourth attack: the `as const` `TARGETS` list could drift from the real set of files — but it is an explicit positive list of exactly the four swept files (#28 compliant), and it matches the diff. Fifth attack: a confused maintainer reads "RED phase (Leeloo)" in the header and thinks the file is unfinished — mitigated by the round-2 comment fix clarifying provenance. Sixth attack: what if `loadClaimsFile` is handed a path that does not exist? `readFileSync` throws ENOENT — but every call site guards with `existsSync(NEW_CLAIMS)` first, and the behaviour tests write real temp files, so the throw is unreachable in practice and would be a loud harness error, not a silent pass. Nothing in this pass survives as an open defect.

### Deviation Audit

- **One shared narrow guard beyond "one parse helper"** → ✓ ACCEPTED: the union-narrowing is unavoidable and one shared `isTextClaim` is the DRY choice the story's own #18 finding demands; not gold-plating.
- **Narrowing is an ASSERTION not a filter in byte-verify loops** → ✓ ACCEPTED: strictly stronger than the pre-refactor assumption; fails loud on a byte claim.
- **`loadClaims` delegates to `loadClaimsFile`** → ✓ ACCEPTED: removes duplication, df1-6 messages byte-identical (verified 8/8 green).

**Handoff → SM (Ruby) for finish.** Two review rounds, round-2 APPROVED. Round-1 High and two Lows all fixed in commit `8623209d` and independently re-verified; one Low dismissed as pre-existing/out-of-scope. No open blockers.