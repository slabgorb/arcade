---
story_id: "df1-10"
jira_key: "df1-10"
epic: "df1"
workflow: "tdd"
---
# Story df1-10: Retire centipede inline loadSoundClaims (sound-dossier.test.ts:399), adopt the hardened dossier-sweep loader

## Story Details
- **ID:** df1-10
- **Jira Key:** df1-10
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** arcade
- **Branch:** feat/df1-10-centipede-adopt-hardened-loader

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T12:50:30Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T10:18:26Z | 2026-08-16T10:19:37Z | 1m 11s |
| red | 2026-08-16T10:19:37Z | 2026-08-16T10:32:33Z | 12m 56s |
| green | 2026-08-16T10:32:33Z | 2026-08-16T10:37:07Z | 4m 34s |
| review | 2026-08-16T10:37:07Z | 2026-08-16T12:33:19Z | 1h 56m |
| green | 2026-08-16T12:33:19Z | 2026-08-16T12:40:15Z | 6m 56s |
| review | 2026-08-16T12:40:15Z | 2026-08-16T12:50:30Z | 10m 15s |
| finish | 2026-08-16T12:50:30Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- No upstream findings during test design. The scope is self-contained; the single-file
  design constraint is encoded in the RED tests (PART 2b) and the GREEN target is spelled
  out in the assessment below and the test-file header.

### Dev (implementation)

- No upstream findings during implementation. The df1-6/df1-8 fleet-residue sweep closes with
  this story: centipede's inline sound-claims parse was the last unhardened `as Claim | Claim[]`
  copy, and it now shares dossier-sweep.ts's one hardened loader.

### Reviewer (code review)

- **Improvement** (non-blocking): the PART 2b single-file-semantics guard asserts
  `loadClaimsFile(sound).length < loadClaims().length`, which couples to the fleet having >1
  claims file. If centipede's `claims/` were ever reduced to only `16-sound.json`, this reddens
  falsely. Fine today (17 files) — noted for whoever prunes claims. Affects
  `plugins/centipede/tests/audit/sound-claims-loader-retirement.test.ts` (PART 2b).
- **Improvement** (non-blocking): pre-existing `citations.test.ts:603` line-ref in the
  `dossier-sweep.ts` header (line 19) is a drift-prone `.ts:<line>` citation this story's own theme
  (symbol-over-line-number) argues against — outside this PR's hunks, so left untouched. Affects
  `plugins/centipede/tests/audit/dossier-sweep.ts` (header comment). *Found by Reviewer during re-review.*
- **Improvement** (non-blocking): `withClaimsFile` allocates the temp dir (`mkdtempSync`+`writeFileSync`)
  before the caller's `try/finally`, so a write throw leaks an empty temp dir. Cosmetic (no untrusted
  input). Affects `plugins/centipede/tests/audit/sound-claims-loader-retirement.test.ts` (move
  allocation inside the try). *Found by Reviewer during re-review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (green rework)

- No deviations from spec. The three reviewer-required fixes were applied as written. For
  the [RULE] fix the reviewer offered two options ("delete it OR replace with a structural
  check"); I took the delete option — the reviewer confirmed the import + call AST checks
  already fail loudly if `loadSoundClaims` vanishes, so the keyword-match precondition was
  redundant, not merely re-implementable. Anti-vacuity intent preserved as a comment on the
  remaining PART 1 checks.

### Reviewer (audit)

- **Dev's "No deviations from spec" (green rework)** → ✓ ACCEPTED by Reviewer: agrees with author
  reasoning. The reviewer offered "delete OR replace with a structural check" as equal options;
  taking the delete option is not a deviation. Independently confirmed the redundancy claim — the
  PART 1 import/call AST checks fail loudly (2/16 red) when `loadSoundClaims` is reverted, so the
  deleted keyword precondition guarded nothing the AST checks don't already guard. No undocumented
  deviations found: the diff is exactly the three required fixes, no scope creep.

## Subagent Results

_Re-review after the green rework (round-trip 1). Round-trip 0's REJECT table is in git
history + `epic-df1.yaml` `review_findings`._

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1293 vitest + 505 orchestrator pass, tsc clean, tree clean; `src` not orphaned by the deleted test |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | clean | none (1 info) | N/A — all 5 citations now symbol-based, prose verified accurate vs live source; 1 out-of-scope pre-existing ref noted |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none (1 nit) | N/A — test/audit tooling, static/temp paths, no untrusted input; the pre-existing temp-dir-leak nit re-confirmed non-blocking |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 33 rules | N/A — #15/#25 violation CONFIRMED GONE, mutation-verified (reinstated the retired cast → 2/16 red → restored clean) |

**All received:** Yes (4 enabled returned — all clean; 5 disabled via settings)
**Total findings:** 0 confirmed blocking; both round-0 REJECT clusters (the vacuous #15/#25 guard + the 5 drifted citations) verified fixed; 2 pre-existing non-blocking notes carried forward (temp-dir-leak hygiene, PART 2b fleet-size coupling)

## Prior Review — Round-Trip 0 (REJECTED, superseded by the APPROVED re-review below)

**Verdict:** REJECTED
**Rework phase:** green (Dev) — the fixes are comment rewording + one test line; no test logic changes.

### Why REJECT despite low severities

Every finding is Low/Info severity, so this is not a Critical/High block. It is rejected because
BOTH defect clusters are **introduced by this PR into a brand-new guard file** and are **surgically
fixable now**, and one is a **confirmed lang-review violation (#15/#25) that the reviewer rule
explicitly forbids dismissing**. Shipping a guard file that contains a vacuous "the guard has teeth"
test, plus five wrong line-number citations this same commit caused, is exactly the rot this repo's
source-guard and comment-accuracy rules exist to stop. Cost to fix ≈ 5 minutes; re-review of a
comment-only + one-line-test change is fast.

### Severity Table

| Severity | Tag | Finding | Location |
|----------|-----|---------|----------|
| Low | [RULE] | `expect(src).toMatch(/soundClaimsPath/)` is a whole-file positive keyword match satisfied by the `const soundClaimsPath` declaration in that same file (sound-dossier.test.ts:77) — it proves nothing about `loadSoundClaims`'s usage yet advertises itself as "the guard has teeth" (lang-review #15 token-not-claim + #25 whole-file scope). Confirmed by rule-checker, cannot be dismissed. | sound-claims-loader-retirement.test.ts:128-131 |
| Low | [DOC] | Five `.ts:line` citations drifted by this PR's own +5 line shift in sound-dossier.test.ts (a NEW file / a same-commit JSDoc shipping wrong numbers): `:399`→now `}`, `:391-401`→392-406, `:980`→985, `:1005`→1010. | dossier-sweep.ts:168; sound-claims-loader-retirement.test.ts:5, 25, 28, 133 |
| Info | [DOC] | Present-tense RED narration ("Until then this named binding is undefined and PART 2 reds") reads as still-true though GREEN has landed. Intentional TDD-story framing — past-tense it if convenient. | sound-claims-loader-retirement.test.ts:34 |
| Info | [SEC] | `withClaimsFile` runs `writeFileSync` before the caller's `try/finally`, so an I/O throw there leaks an empty temp dir. No untrusted input; cosmetic. | sound-claims-loader-retirement.test.ts:159-164 |

### Required fixes (green rework)

1. **[RULE] test:128-131 vacuous guard** — delete it (the three AST checks below already fail loudly
   if adoption is absent, so the vacuity precondition is redundant), OR replace it with a *structural*
   check (e.g. that `loadSoundClaims` is still a declared FunctionDeclaration via the AST helpers) so it
   actually guards what its name claims. Do not leave a keyword `toMatch` standing in for teeth.
2. **[DOC] line-ref drift** — reword the five drifted citations to **symbol-based** references (this repo
   prefers symbols; joust even has a `comment-line-refs` guard) rather than re-pinning numbers that will
   re-drift. e.g. dossier-sweep.ts JSDoc "lived at sound-dossier.test.ts:399" → "lived inside
   `loadSoundClaims`"; header `:391-401`/`:980`/`:1005` → name the functions/tests; `:133` "the tell at
   :399 is gone" → "the unhardened as-cast is gone".
3. **(optional, non-blocking)** past-tense the `:34` RED narration; move `writeFileSync` inside the
   test's `try` if touching that helper.

### Rule Compliance (lang-review typescript.md — applied to the diff)

- **#1 type-safety escapes:** `(entry as { source?: unknown })` (dossier-sweep.ts:180) and
  `entries as Claim[]` (:185) — COMPLIANT; both are a verbatim relocation of df1-6's already-reviewed
  hardened parser, and the `as Claim[]` is preceded by the `isValidClaimSource` loop over every entry.
  No `as any` / `@ts-ignore` / non-null `!` anywhere in the diff. `(c: Claim)` annotations
  (test:258,260) redundant-but-harmless.
- **#8 test quality:** 17 new tests — real fixtures (`16-sound.json`), no `dist/` imports, no vacuous
  `assert(true)`. The one exception is finding [RULE] above (#15/#25).
- **#11 error handling:** `catch (e)` narrowed with `instanceof Error` (dossier-sweep.ts:175,
  test:183) — COMPLIANT.
- **#15/#25 source-text guards:** the three AST helpers (`liveAsCasts`/`importsNamedFrom`/`callsCallee`)
  are structural, not keyword, and are themselves mutation-tested in PART 3 — COMPLIANT; the one
  keyword-match precondition (test:130) is the violation.
- **#17 comments assert real mechanism:** the "behaviour identical → df1-6 stays green" claim was
  re-run green — COMPLIANT (separate from the line-*number* drift in [DOC]).
- **#18 one-concept-one-helper (CLAUDE.md):** VERIFIED reduction — `git diff` shows the inline
  `JSON.parse(...) as Claim | Claim[]` + concat fully removed from sound-dossier.test.ts, both callers
  now share `loadClaimsFile`. This is the story's core win.
- **#24 retirement applied fleet-wide:** grep for live `as Claim | Claim[]` across `plugins/centipede`
  → zero live occurrences remain (only guard/fixture strings). COMPLIANT.
- **core/shell boundary, src/shared rule:** N/A — diff touches only `tests/audit/`.

### Observations (VERIFIED + findings)

- [VERIFIED] Behaviour-preserving extraction — evidence: dossier-sweep.ts:190-195 `loadClaims` now
  `flatMap((f) => loadClaimsFile(join(dir, f)))`; df1-6 `load-claims-hardening.test.ts` re-run 7/7 green,
  cp6-1 sound-dossier suite 50/50 green. Complies with #18 (reduces duplication).
- [VERIFIED] Single-file semantics preserved — evidence: `loadSoundClaims` (sound-dossier.test.ts:392)
  delegates to `loadClaimsFile(soundClaimsPath)`, a single path, not `loadClaims()`; PART 2b pins
  `sound.length < all.length`. The `:985` count floor stays a floor on the sound file, not vacuous.
- [VERIFIED] Error messages name the file — evidence: dossier-sweep.ts:175,182 interpolate
  `basename(file)`; PART 2 asserts `.toContain('broken.json')` and `.not.toMatch(/^Unexpected token/)`.
- [RULE] Vacuous teeth-check at test:130 (see severity table) — confirmed, blocking this rework.
- [DOC] This-PR-introduced line-ref drift across 5 sites (see severity table) — confirmed, blocking.
- [SEC] Clean — audit tooling on statically-derived paths, no untrusted input reaches `readFileSync`
  or the temp APIs (security subagent); one non-blocking temp-dir-leak nit.
- Tags with no findings: [EDGE] disabled, [SILENT] disabled, [TEST] disabled (test-analyzer off),
  [TYPE] disabled, [SIMPLE] disabled — their domains were spot-checked by the reviewer directly and
  by rule-checker's #1/#8/#11 passes.

### Devil's Advocate

Assume this code is broken. The most dangerous thing here is a guard file that *looks* rigorous but
contains a lie: the `toMatch(/soundClaimsPath/)` "the guard has teeth" test. A future maintainer who
deletes `loadSoundClaims` entirely but leaves the `const soundClaimsPath` declaration standing would
see that test stay green — it advertises a vacuity check it does not perform, so it actively feeds
false confidence. That is worse than no test, because the name promises protection. Next: the error
message contract. `loadClaimsFile` takes a full path but names only `basename(file)` in its throw — if
two claims directories ever held a same-named file (e.g. a temp `broken.json` and a real
`broken.json`), the operator could not tell which one blew up; today there is one claims dir so it is
safe, but the guarantee is narrower than the prose implies. A confused reader following the header's
`:980`/`:1005`/`:391-401` citations lands on unrelated lines — a comment banner, a delegation stub —
and wastes time or, worse, edits the wrong place. The `entries as Claim[]` cast still validates only
`source`, not `id`/`claim`; a well-formed file with a valid source but a numeric `claim` flows through
— though this is inherited df1-6 behaviour, out of scope, and green under df1-6's own suite. A stressed
filesystem that throws mid-`writeFileSync` in `withClaimsFile` leaks an empty temp dir because creation
precedes the caller's `try/finally`. And PART 2b's `sound.length < all.length` is a fleet-size coupling:
prune centipede's claims to one file and a passing suite suddenly reddens on a change that broke
nothing. None of these are Critical, but the vacuous guard and the wrong citations are real, this-PR
defects in a file whose entire job is to be trustworthy — they must be fixed before this merges.

**Verdict:** REJECTED → green rework (Dev).

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/centipede/tests/audit/dossier-sweep.ts` — extracted the per-file hardened parse
  out of `loadClaims`'s flatMap into an exported `loadClaimsFile(file)` (try/catch naming
  `basename(file)`, `isValidClaimSource` shape-check, `Claim | Claim[]` normalised);
  `loadClaims` now maps its dir entries through it (behaviour identical).
- `plugins/centipede/tests/audit/sound-dossier.test.ts` — `loadSoundClaims` deletes its inline
  `JSON.parse(...) as Claim | Claim[]` + concat and delegates to `loadClaimsFile(soundClaimsPath)`,
  keeping its `existsSync` "cp6-1 not delivered" guard; imports `loadClaimsFile` from `./dossier-sweep`.

Followed the TEA GREEN target exactly — single-file semantics preserved (the four AC-2 callers
still read only `16-sound.json`), one shared hardened implementation (lang-review #18).

**Tests:** df1-10 suite 17/17, full centipede project 1294/1294, `load-claims-hardening.test.ts`
(df1-6) still green, lint (`tsc --noEmit`) clean, orchestrator 505/505. RED→GREEN (10 failing →
all passing) is itself the AC4 mutation proof — the PART 1 import/call guards and PART 2b subset
test remain the durable teeth.
**Branch:** feat/df1-10-centipede-adopt-hardened-loader (pushed)

**Handoff:** To Reviewer for code review.

### Green Rework — reviewer-required fixes (round-trip 1)

Applied the three fixes from the REJECTED review; no test logic changed.

**Files Changed:**
- `plugins/centipede/tests/audit/sound-claims-loader-retirement.test.ts` — (1) [RULE] deleted the
  vacuous `expect(src).toMatch(/soundClaimsPath/)` "the guard has teeth" test (it was satisfied by the
  `const soundClaimsPath` declaration and proved nothing); anti-vacuity is now documented as a comment
  on the PART 1 import/call checks, which fail loudly if `loadSoundClaims` vanishes. (2) [DOC] reworded
  four drifted line-number citations to symbol-based refs (`:391-401`→"inside `loadSoundClaims`";
  `sound-dossier.test.ts:980`→named the SOUNDS-floor test; `(:1005)`→dropped, "two-decimal-20s test"
  already names it; `:399` in the cast-guard title→"the unhardened as-cast is gone"). (3) past-tensed
  the RED-narration comment now that GREEN has landed.
- `plugins/centipede/tests/audit/dossier-sweep.ts` — [DOC] `loadClaimsFile` JSDoc "lived at
  sound-dossier.test.ts:399" → "lived inside sound-dossier.test.ts's `loadSoundClaims`".

The pre-existing `:NNN` refs left in `dossier-sweep.ts` (a df1-6 header ref to `citations.test.ts:603`
and ROM-format examples like `CENTI4.MAC:2455`) are not this PR's drift and were left untouched.

**Tests:** df1-10 suite 16/16 (was 17 — the vacuous test removed), df1-6 `load-claims-hardening.test.ts`
7/7 (behaviour-preserving extraction still green), full centipede project 1293/1293, orchestrator 505/505,
lint (`tsc --noEmit`) clean. All suites exit 0.
**Branch:** feat/df1-10-centipede-adopt-hardened-loader (pushed)

**Handoff:** To Reviewer for re-review (comment + one-test-deletion change only).

## Reviewer Assessment

**Verdict:** APPROVED

Re-review (round-trip 1) of the green rework. Round-trip 0 REJECTED on two Low-severity,
this-PR-introduced defects in a new guard file: (1) [RULE #15/#25] a vacuous whole-file
`expect(src).toMatch(/soundClaimsPath/)` "the guard has teeth" test, and (2) [DOC] five
line-number citations drifted by this PR's own edits. Both are now fixed and independently
verified. No new Critical/High/Medium issue surfaced in the rework. The full extraction was
already analysed at length in the round-0 review above; this pass verifies the fixes and
re-scans the changed surface.

**Data flow traced:** a claims file path (`join(claimsDir, f)` from a `readdirSync` filtered to
`.json`, or the hardcoded `soundClaimsPath`, or a test-owned `mkdtempSync` path) →
`loadClaimsFile` → `JSON.parse` (typed `unknown`) → per-entry `isValidClaimSource` shape-check →
`Claim[]`. Safe because every runtime call site passes a statically-derived path (no
caller/attacker input reaches `readFileSync`), and a bad shape or bad JSON now throws a
controlled error naming `basename(file)` instead of casting through unchecked — verified live by
PART 2's `.toContain('broken.json')` / `.not.toMatch(/^Unexpected token/)` assertions.

**Pattern observed:** the guard file proves adoption/retirement by walking the TypeScript AST
(`liveAsCasts`/`importsNamedFrom`/`callsCallee` at `sound-claims-loader-retirement.test.ts:75-118`),
not by grepping source text — the correct #15/#25-safe pattern, and each helper is itself
mutation-tested against comment/string decoys in PART 3.

**Error handling:** `loadClaimsFile` narrows the catch with `instanceof Error`
(`dossier-sweep.ts:175`) before reading `.message`; the shape-check throws a file-named error for
every non-conforming entry (`:181-183`). Null/degenerate input: `entry == null` is handled
(`:180`); empty/whole-dir semantics preserved (PART 2b `sound.length < all.length`).

### Subagent Dispatch Tags (all 8 accounted for)

- `[RULE]` (rule-checker, **enabled**) — CLEAN, 0 violations across 33 rules. The round-0
  #15/#25 violation is CONFIRMED GONE; the checker independently mutation-verified by reinstating
  the retired `JSON.parse(...) as Claim | Claim[]` cast into `sound-dossier.test.ts` → 2 of 16
  tests reddened (the as-cast check + the live-call check) → tree restored clean. Casts
  (`entries as Claim[]`, `(entry as { source?: unknown })`) confirmed byte-for-byte df1-6
  relocations, not new. This diff FIXES a #18 duplication rather than creating one.
- `[DOC]` (comment-analyzer, **enabled**) — CLEAN. All five PR-introduced citations reworded to
  symbol-based prose; zero drift-prone `.ts:<line>` refs remain in either changed file. The new
  anti-vacuity comment, the past-tensed RED narration, and the `loadClaimsFile` JSDoc all verified
  accurate against live source (`loadSoundClaims` at `sound-dossier.test.ts:392` delegates at :405).
  One INFO-only note: a pre-existing `citations.test.ts:603` ref at `dossier-sweep.ts:19` predates
  df1-10 and is outside this diff — deferred (see Delivery Findings).
- `[SEC]` (security, **enabled**) — CLEAN, no blocking issues. Test/audit tooling, no untrusted
  input, no path-traversal/injection/deserialization sink. One LOW non-blocking hygiene nit
  re-confirmed: `withClaimsFile` runs `mkdtempSync`+`writeFileSync` before the caller's try/finally,
  so a write throw would leak an empty temp dir — cosmetic given literal inputs, deferred.
- `[EDGE]` (edge-hunter) — **disabled via settings**; boundary paths spot-checked directly (null
  entry, empty dir, single-object-vs-array normalisation all covered by PART 2/2b).
- `[SILENT]` (silent-failure-hunter) — **disabled**; no swallowed errors — the only catch rethrows
  a controlled, file-named error (`dossier-sweep.ts:175-177`).
- `[TEST]` (test-analyzer) — **disabled**; test quality assessed directly + via rule-checker #8/#18:
  real temp-file fixtures, no `dist/` imports, no vacuous assertions (the one vacuous test is now
  deleted), PART 3 self-proves the AST helpers' teeth.
- `[TYPE]` (type-design) — **disabled**; assessed via rule-checker #1/#2/#10: `unknown`-typed parse
  narrowed by a runtime guard, no `as any`/`@ts-ignore`/non-null bypass.
- `[SIMPLE]` (simplifier) — **disabled**; the rework is a net simplification (one vacuous test
  removed, no abstractions added).

### Rule Compliance (lang-review typescript.md — re-review scope)

- **#1 / #10 type-safety & input validation:** COMPLIANT — parse typed `unknown`, validated by
  `isValidClaimSource` before the `as Claim[]` narrowing; casts are unchanged df1-6 relocations
  (confirmed via `git show develop:…dossier-sweep.ts`). No `as any`/`@ts-ignore`/`!`.
- **#11 error handling:** COMPLIANT — `instanceof Error` narrowing at `dossier-sweep.ts:175` and
  `sound-claims-loader-retirement.test.ts:183`.
- **#15 token-not-claim / #25 whole-file-scope source guards:** COMPLIANT (was the round-0
  violation) — the whole-file keyword `toMatch` is deleted; the surviving guards are AST node-kind
  matches (AsExpression/ImportDeclaration/CallExpression), mutation-tested in PART 3. No other
  whole-file positive keyword source-scan survives in the changed files.
- **#8 test quality / #18 one-concept-one-helper:** COMPLIANT — `loadClaimsFile` is the single
  shared implementation for both `loadClaims` (whole-dir) and `loadSoundClaims` (single-file); the
  story's core win. Fixtures are real, no vacuous assertions remain.
- **#17 comments assert a re-run mechanism:** COMPLIANT — de-anchoring the drifted line numbers to
  symbols is exactly #17's remedy, and every reworded claim was verified against current code.
- **core/shell boundary, src/shared:** N/A — diff is `tests/audit/` tooling only.

### Observations (≥5)

- [VERIFIED] The round-0 [RULE] fix is real, not cosmetic — evidence: the vacuous
  `expect(src).toMatch(/soundClaimsPath/)` is gone from the diff, and rule-checker's live mutation
  (reinstate the retired cast → 2/16 red) proves the remaining AST checks carry the teeth the
  deleted test only advertised. Complies with #15/#25.
- [VERIFIED] The round-0 [DOC] fix is complete — evidence: comment-analyzer's whole-file scan finds
  no `.ts:<line>` ref remaining in either changed file; the four converted refs + the JSDoc all name
  symbols now. `loadSoundClaims` genuinely exists and delegates (`sound-dossier.test.ts:392,405`).
- [VERIFIED] Behaviour-preserving extraction holds — evidence: preflight ran df1-6
  `load-claims-hardening.test.ts` 7/7 green and full centipede 1293/1293; `loadClaims` now
  `flatMap((f) => loadClaimsFile(join(dir, f)))` (`dossier-sweep.ts:194`).
- [VERIFIED] Deleting the test left no dead code — evidence: `src` still consumed at
  `sound-claims-loader-retirement.test.ts:137/143/151`; tsc `--noEmit` clean; tree clean.
- [SEC] LOW/non-blocking — `withClaimsFile` temp-dir leak on a `writeFileSync` throw
  (`sound-claims-loader-retirement.test.ts` helper). Pre-existing, no untrusted input, explicitly
  optional in round-0. Deferred, not blocking.
- [DOC] INFO/non-blocking — pre-existing `citations.test.ts:603` line-ref at `dossier-sweep.ts:19`,
  outside this PR's hunks. Deferred for whoever next touches that header.
- Tags with no findings: [EDGE]/[SILENT]/[TEST]/[TYPE]/[SIMPLE] disabled via settings — domains
  spot-checked directly and cross-covered by rule-checker #1/#8/#11/#18.

### Devil's Advocate

Assume this rework is broken. The most dangerous move in a re-review is rubber-stamping "it's just
comments" — a comment change can quietly turn a real guard vacuous, and a test *deletion* is exactly
where teeth silently vanish. So the sharpest question is: did removing the "guard has teeth" test
open a hole? It did not, and this was not taken on faith — the rule-checker reinstated the precise
retired pattern (`JSON.parse(...) as Claim | Claim[]`) into `sound-dossier.test.ts` and watched two
tests redden, then restored the tree; the surviving import/call AST checks demonstrably fail if
`loadSoundClaims` is reverted or deleted. Next worry: a maintainer chasing a symbol that no longer
exists. But `loadSoundClaims` was read live at `sound-dossier.test.ts:392` and confirmed to delegate
to `loadClaimsFile` at :405, so every reworded reference points at something real — the opposite of
the drifted line numbers the round-0 review caught. Could the citation rewording have introduced a
*new* wrong claim? Comment-analyzer scanned both changed files end-to-end and found zero drift-prone
`.ts:<line>` refs and no inaccurate prose. What about the error contract — `loadClaimsFile` names
only `basename(file)`, so two same-named files in different dirs would be indistinguishable in a
throw; true, but there is one claims dir today and the temp files use distinct literal names, so the
guarantee is narrower than universal, not wrong. A stressed filesystem throwing mid-`writeFileSync`
in `withClaimsFile` still leaks an empty temp dir — real, but unreachable by any adversary and
explicitly deferred as hygiene. And PART 2b's `sound.length < all.length` remains a fleet-size
coupling that would falsely redden if centipede's `claims/` were pruned to one file — noted for
whoever prunes. None of these are Critical or High; the two round-0 blockers are fixed and verified,
and nothing new rises above deferred. The rework is trustworthy.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Retiring a duplicated loader is a behaviour-preserving refactor with a real
regression risk (the centipede wrinkle below), so it needs teeth, not a chore bypass.

**Test Files:**
- `plugins/centipede/tests/audit/sound-claims-loader-retirement.test.ts` — AST retirement/
  adoption guard + behavioural hardening of the adopted single-file loader + single-file
  semantics guard + guard-integrity.

**Tests Written:** 17 tests (10 failing, 7 passing) covering all 4 derived ACs.
**Status:** RED (failing — ready for Dev)

### The GREEN target (design — read before implementing)

This is the centipede analog of df1-8 (joust), but it is **NOT a clean swap**. joust's inline
`loadClaims` read the whole `claims/` dir, so adopting the shared whole-dir `loadClaims`
changed nothing but the teeth. centipede's inline `loadSoundClaims`
(`sound-dossier.test.ts:391-401`) reads **exactly one file** (`16-sound.json`), and its four
callers depend on that (the `:980` "SOUNDS cannot reduce to zero" floor is a floor on the
*sound* file; the `:1005` two-decimal-20s test filters by source LINE alone). Calling the
whole-dir `loadClaims()` would make `:980` vacuous and invite a cross-file line collision.

So GREEN must preserve single-file semantics while sharing ONE hardened implementation:
1. In `plugins/centipede/tests/audit/dossier-sweep.ts`, extract the per-file hardened parse
   out of `loadClaims`'s `flatMap` into an exported `loadClaimsFile(file: string): Claim[]`
   (try/catch naming `basename(file)`, `isValidClaimSource` shape-check, `Claim | Claim[]`
   normalised — same messages df1-6 already uses).
2. Refactor `loadClaims(dir)` to `readdirSync(dir).filter(json).flatMap(f => loadClaimsFile(join(dir, f)))`
   — behaviour identical, so `load-claims-hardening.test.ts` (df1-6) stays green.
3. In `sound-dossier.test.ts`: delete the inline `JSON.parse(...) as Claim | Claim[]` + concat;
   `loadSoundClaims` keeps its `existsSync` "cp6-1 not delivered" guard and returns
   `loadClaimsFile(soundClaimsPath)`. Import `loadClaimsFile` from `./dossier-sweep`.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| lang-review #18 — one concept, one helper (no duplicate loaders) | PART 1 (no-live-cast / imports loadClaimsFile / calls loadClaimsFile) | failing |
| Controlled errors name the offending file (df1-6 lineage) | PART 2 `rejects a syntactically broken file …`, `… WRONG shape …`, `… NO source …`, `… missing verbatim …` | failing |
| Loader is essential / not vacuous (mutation-proof AC4) | PART 2 `loads a well-formed TEXT-shaped array`, `normalises a single object`; PART 2b subset test | failing |
| Semantics preserved — no whole-dir broadening (centipede wrinkle) | PART 2b `… strict subset of whole-dir loadClaims()` | failing |
| Guard cannot be faked / over-fire | PART 3 (liveAsCasts / importsNamedFrom / callsCallee integrity) | passing |

**Rules checked:** the applicable centipede lang-review rule (#18 duplicate-helper) plus the
df1-6 hardening contract have test coverage; PART 3 self-proves the AST guards' teeth.
**Self-check:** 0 vacuous assertions — every failing test names a concrete tell (a live cast,
a missing import/call, a file-named error, a subset relation).

**One expected tsc error:** `TS2724 loadClaimsFile is not exported` — this is the RED signal
for the new API; GREEN clears both it and the 10 vitest failures. No other type errors remain
(the cascading implicit-any was annotated away so Dev sees exactly one target).

**Handoff:** To Dev for implementation (GREEN).

## Sm Assessment

Setup complete for df1-10 (centipede analog of df1-8). Session, context, and branch
`feat/df1-10-centipede-adopt-hardened-loader` created from develop (in sync). No sibling
claim: no remote df1-10 branch, no local session. Scope is a focused residue retirement —
delete centipede's inline `JSON.parse(readFileSync(soundClaimsPath)) as Claim | Claim[]`
loader at `plugins/centipede/tests/audit/sound-dossier.test.ts:399` and adopt the hardened
`loadClaims()` from `dossier-sweep.ts` (hardened in df1-6). Four derived ACs recorded in
context (no explicit ACs in YAML). Handing off to TEA for the RED phase.