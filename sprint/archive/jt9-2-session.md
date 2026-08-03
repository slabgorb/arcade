---
story_id: "jt9-2"
jira_key: "jt9-2"
epic: "jt9"
workflow: "trivial"
---
# Story jt9-2: Test-hygiene sweep: move the 27 joust suites carrying a local loadClaims/claimCovers onto tests/helpers/claims.ts (the line-ref half is disposed — uf1-9 did it; remainder is jt9-30)

## Story Details
- **ID:** jt9-2
- **Jira Key:** jt9-2
- **Branch:** none
- **PR:** none
- **Workflow:** trivial
- **Stack Parent:** none
- **Type:** chore
- **Points:** 2

## Workflow Tracking
**Workflow:** trivial
**Repos:** arcade
**Phase:** finish
**Phase Started:** 2026-08-03T00:20:58Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-02T23:25:10.287166+00:00 | 2026-08-02T23:52:29Z | 27m 18s |
| implement | 2026-08-02T23:52:29Z | 2026-08-03T00:08:34Z | 16m 5s |
| review | 2026-08-03T00:08:34Z | 2026-08-03T00:20:58Z | 12m 24s |
| finish | 2026-08-03T00:20:58Z | - | - |

## Background

**Epic:** jt9 — Joust — the remainder, re-ordered: apparatus, gameplay, geometry, brains, dossier

**Story Type:** Chore

**Points:** 2

**Renumbered from:** jt8-12 (per `pf story move` on 2026-08-02)

**Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

## Acceptance Criteria

> **SCOPE CORRECTED BY SM AT SETUP, 2026-08-02.** The story as filed had two halves.
> Half (2) — the stale `enemy.ts:<line>` comment refs — **was already done by uf1-9**
> and is disposed of below as AC5, with its live remainder filed as **jt9-30**. This
> story is now the claims-loader sweep only. The ACs sm-setup first wrote (30 files,
> and a "fix" to `difficulty-wiring.test.ts:33-35`) were **wrong on both counts** and
> have been replaced. Re-measure anyway before you start; these counts drift.

1. Every joust test file carrying its own local `loadClaims` and/or `claimCovers`
   definition imports them from `plugins/joust/tests/helpers/claims.ts` instead, and
   the local definition is deleted. **Measured 2026-08-02: 27 files** — 24
   `-source.test.ts` suites plus **three non-`-source` files the story text does not
   mention**: `demo-jt5-16.test.ts`, `dossier-process-block.test.ts`,
   `pictures.test.ts`. Re-measure with:
   ```bash
   cd plugins/joust/tests && grep -rlE "(function|const) (loadClaims|claimCovers)" *.test.ts
   ```

2. `homing-source.test.ts` and `steering-source.test.ts` are already on the helper and
   are **not** modified. After the sweep, the grep in AC1 returns **zero** files.

3. **The hardened loader's behaviour is not weakened to accommodate a caller.** If a
   local copy differs from `helpers/claims.ts` in a way that makes its suite fail on
   the helper, that is a finding to report — record it under Delivery Findings and say
   which suite and how they differ. Do not loosen the helper and do not leave the copy.

4. Green and clean: `npx vitest run --project joust` passes, `npm run lint` passes.
   This is a no-behaviour-change refactor — the pass count should not drop.

5. **DISPOSED — do not do this work.** The filed finding "comment-body `enemy.ts:<line>`
   refs go stale" named `audio-flap.test.ts:536` and `difficulty-wiring.test.ts:27`.
   **uf1-9 already converted both**, and the suite now contains **zero**
   `enemy.ts:<number>` refs. In particular, the `:115/:118 → :266/:273` numbers at
   `difficulty-wiring.test.ts:33-35` are a **historical note explaining that repair**,
   not a live defect — **deleting them destroys the record.** The finding's live
   remainder (86 distinct `<our>.ts:<line>` refs across 30 files) is filed as **jt9-30**.

6. No other test changes. In particular the **283 `JOUSTRV4.SRC:<line>` ROM citations
   are untouched** — they are pinned by the citation gates and converting one is a
   regression.

## Technical Approach

### The claims-loader sweep — 27 files

**Measured by SM at setup, 2026-08-02, from `plugins/joust/tests`:**

| Measurement | Command | Result |
|---|---|---|
| files carrying a local copy | `grep -rlE "(function\|const) (loadClaims\|claimCovers)" *.test.ts` | **27** |
| …of which are `-source.test.ts` | same, `grep -c -- -source.test.ts` | 24 |
| …of which are **not** | same, `grep -v -- -source.test.ts` | 3 — `demo-jt5-16`, `dossier-process-block`, `pictures` |
| local `loadClaims` defs | `grep -rlc "function loadClaims\|const loadClaims"` | 27 files |
| local `claimCovers` defs | `grep -rlc "function claimCovers\|const claimCovers"` | 15 files |
| already on the helper | `grep -rln "helpers/claims" *.test.ts` | 2 — `homing-source`, `steering-source` |
| total `-source.test.ts` | `ls *-source.test.ts` | 32 |

**Two corrections to the numbers you will read elsewhere.** The story title says "27
legacy **-source** suites" — 27 is the right *file* count but only **24 are `-source`
suites**; the other three are ordinary test files, and a sweep that globs `*-source.test.ts`
will silently miss them. sm-setup's first pass said "30 files requiring refactor"; that
counted every `-source.test.ts` not yet importing the helper, including files that carry
no local copy and need no change. **27 is the number.** Re-measure before you start.

Not every file has *both* definitions — 27 have `loadClaims`, 15 have `claimCovers`.
Import only what each file actually used.

**Refactor template — `homing-source.test.ts`**, moved onto the helper during jt8-3 and
green at 78/78. `steering-source.test.ts` is a second worked example. Read one of them
before touching the other 27; do not invent a shape.

- Delete the local `loadClaims` / `claimCovers` definition(s)
- Import from `../helpers/claims.js` (confirm the exact specifier and extension from the
  two template files — this repo's import idiom, not a guess)
- The helper is the **hardened** loader, so a copy that silently tolerated something the
  helper rejects will now fail. That is a real finding about that suite, not a reason to
  soften the helper — see AC3.

**Expected outcome:** no behaviour change, identical pass count before and after. Capture
the baseline pass count *first* so "identical" is a measurement and not an impression.

### The line-ref half is disposed of — see AC5

Do not do it. Both named sites were already converted by uf1-9; the suite has zero
`enemy.ts:<number>` refs. The `:115/:118 → :266/:273` numbers still visible at
`difficulty-wiring.test.ts:33-35` are the *explanation of that repair* and must stay. The
live remainder — 86 distinct `<our>.ts:<line>` refs across 30 files, with the 283
`JOUSTRV4.SRC:<line>` ROM citations explicitly excluded — is filed as **jt9-30** (3pts,
tdd, p3), which carries the full measurement and the two classification traps.

## Sm Assessment

**Setup measured both halves of the story before routing, and both were wrong as filed.**

**The line-ref half is dead work — it was already done.** The Reviewer's jt8-3 finding
named two sites; `uf1-9` converted both, and the joust suite now contains **zero**
`enemy.ts:<number>` refs (`grep -rn "enemy\.ts:[0-9]" *.test.ts` → nothing).
`audio-flap.test.ts:543` now reads `` `stepEnemyDetailed` (enemy.ts) … UPDATED BY uf1-9``
and `difficulty-wiring.test.ts:33-35` reads `BOUNDR_DOWN_BRAKE / B2UNDR_DOWN_BRAKE …
named rather than line-cited, because uf1-9 grew that file and the numbers moved
(:115/:118 → :266/:273)`. sm-setup's first pass read that last clause as a live defect
and wrote an AC to "fix" it — which would have **deleted the note recording the repair**.
That AC is replaced by AC5, a disposal. The user chose disposal over broadening, and the
live remainder (86 distinct `<our>.ts:<line>` refs / 30 files, ROM citations excluded) is
filed as **jt9-30** (3pts, tdd, p3) rather than left in an archive note.

**The sweep half is live, and its count is right for the wrong reason.** "27 legacy
`-source` suites" — 27 *is* the file count, but only **24 are `-source.test.ts`**. Three
ordinary test files (`demo-jt5-16`, `dossier-process-block`, `pictures`) carry a copy too,
and any sweep that globs `*-source.test.ts` — which is exactly what the story title
invites — silently skips them and still reports a clean grep against its own glob. That is
the trap in this story. sm-setup's own "30 files" was a different miscount (it counted
`-source` files not yet importing the helper, including ones with nothing to refactor).
AC1 carries the command; Dev re-measures.

**Routing:** trivial workflow, no RED phase, straight to Dev for `implement`. This is a
no-behaviour-change refactor, so the guard against a silent regression is the pass count:
capture it before the sweep, compare after. AC3 exists because the target loader is the
*hardened* one — a suite that fails on it has found something, and softening the helper to
make it pass would undo jt8-2/jt8-3's work.

## Dev Assessment

**Done: 27 files swept, 28 files changed, +172 / −649 lines. Green at 104 files / 2499
tests — byte-identical to the pre-change baseline, which was captured first.**

### The pass count alone would NOT have caught a broken refactor, so I mutated the helper

A refactor that accidentally leaves a suite importing nothing, or wired to a loader that
silently returns `[]`, stays green: every `claimCovers(loadClaims(), …)` assertion that
expects `false` still passes, and the ones expecting `true` are the only tripwires. So the
matching count is a weak signal on its own.

I planted a mutant — `loadClaims()` returning `[]` unconditionally — and re-ran:

| | Test files | Tests |
|---|---|---|
| baseline | 104 passed | 2499 passed |
| after sweep | 104 passed | 2499 passed |
| **helper mutated** | **29 failed** / 75 passed | **255 failed** / 2244 passed |

**29 is exactly the right number**: the 27 swept files plus `homing-source` and
`steering-source`, which were already on the helper. Every file I touched is genuinely
executing the shared loader. The helper was restored from a backup and `git diff` on it
confirms only my intended comment edit remains.

### Three things the story's grep did not know

**1. The count is 27 files but 33 definitions.** Five files (`game-bounty`, `game-extra`,
`game-jt4-5`, `game-loop`, `game-source`) carried the `claimCovers` clone under the name
**`covers`** — same body, different name — which AC1's `(function|const) (loadClaims|claimCovers)`
grep cannot see. All five were already in the 27 via their `loadClaims`, so **the file
count was right and no file was missed**; only the definition count was understated. Their
call sites now use the shared `claimCovers`.

**2. `baiter-source.test.ts`'s `jt35Covers` is NOT a clone** — it adds a `JT35-` id filter
so jt1-8's existing citations cannot cover jt3-5's ranges vacuously. Left local, deliberately.

**3. Two local copies had genuinely different semantics** (AC3's case). Neither was
resolved by weakening the helper:

- `egg-source` and `joust-source` compared `c.source.file` **whole**, where the helper
  basenames it first. I checked the data rather than assuming: **all 938 committed claims
  store a bare filename** (`JOUSTRV4.SRC`, `JOUSTI.SRC`, …) with no directory component, so
  `basename(x) === x` and the two rules are equivalent on the current registry. The helper's
  is also what 15 of the other local copies already did.
- `demo-jt8-7-source` was the one copy with **no `existsSync` guard** — it threw on a
  missing `claims/`. On the helper that returns `[]`. Strictly more tolerant, and the
  directory is committed, so no live behaviour changes.

### The one deliberate exception to "the grep returns zero"

`transporter-source.test.ts` had a `claimCovers` that was a **superset**, not a copy: an
extra `prefix?: string` narrowing the set by claim id, which jt2-6 needs so an existing
JT8/JT23 citation cannot cover its range. Swapping it for the shared helper would have
**silently deleted that guard** — the suite would still have been green, and weaker.

I kept the narrowing as `claimCoversWithPrefix` and made it **delegate** the range match to
the shared `claimCovers`, so the coverage rule still lives in exactly one place. AC1's grep
matches the name by prefix, so it reports 1 file rather than 0. That is the grep's prefix
match, not a surviving duplicate: **zero duplicate loaders remain.**

### Also fixed: the helper's own comment had gone false

`tests/helpers/claims.ts` still said "The 27 older `-source` suites still carry their own
pre-hardening local copies — that sweep is a filed follow-up, not this story's scope." This
story IS that sweep, so the sentence describes a world that stopped existing in this commit.
Rewritten to state the invariant it now guards (one loader, 29 dependents) and to name the
`transporter` exception, so the next reader is not told to expect copies that are gone.

### Verification

- `npx vitest run --project joust` → **104 files / 2499 passed / 0 failed / 0 skipped** (= baseline)
- `npm run lint` (tsc --noEmit, repo-wide) → clean. `noUnusedLocals` is on and caught every
  orphaned `claimsDir` / `repoRoot` / `readdirSync` as I went; all pruned.
- `npm run test:orchestrator` → **390 / 390 pass**
- Mutation control → 29 files / 255 tests red, as above.

**AC5 (the disposed line-ref half) was not touched**, and neither were the 283
`JOUSTRV4.SRC:<line>` ROM citations (AC6). The diff is joust tests only — no production code.

## Delivery Findings

**AC1's grep under-reports the duplication it defines.** `(function|const) (loadClaims|claimCovers)`
counts *names*, and five of the 27 files carried the clone as `covers`. Here it cost nothing
— those files were caught anyway by their `loadClaims` — but a future sweep scoped by that
grep alone would report a clean tree while renamed clones survive. Worth matching on the
body, e.g. `c.source && basename(c.source.file) === file`, which is what found them.

**Nothing was descoped.** Findings 1's live remainder is complete; finding 2 was disposed of
at setup with its remainder filed as jt9-30.

## Design Deviations

### Dev (implementation)
- **Kept a prefix-filtering `claimCovers` variant local instead of removing it**
  - Spec source: `.session/jt9-2-session.md`, AC1 / AC3
  - Spec text: "Every joust test file carrying its own local `loadClaims` and/or `claimCovers`
    definition imports them from `plugins/joust/tests/helpers/claims.ts` instead, and the
    local definition is deleted" / "Do not loosen the helper and do not leave the copy."
  - Implementation: `transporter-source.test.ts` retains `claimCoversWithPrefix`, which
    filters claims by id prefix and delegates the range match to the shared `claimCovers`.
  - Rationale: it is a superset, not a copy. Its `prefix` argument is a real guard (jt2-6
    requires a `JT26-*` claim specifically, so a pre-existing JT8/JT23 citation must not
    satisfy the range). Deleting it in favour of the shared helper would have dropped that
    guard silently and stayed green. AC3 forbids loosening the helper to suit one caller, so
    extending the shared signature was also wrong. Delegation removes the duplicated
    matching logic — the actual goal — while preserving the narrowing.
  - Severity: minor
  - Forward impact: minor — AC1's grep reports 1 file rather than 0 because it prefix-matches
    the name `claimCoversWithPrefix`. Any future sweep re-running that grep should expect
    this one hit and read the delegation before "fixing" it.
  - → ✓ **ACCEPTED by Reviewer.** Verified by mutation, not by reading the rationale.
    M5 (prefix `'JT26'` → `'ZZZZ'`) reddens **11 tests** in that file, so the argument is
    genuinely threaded through the delegation and the narrowing still bites. Removing the
    function as AC1 literally demanded would have deleted a live guard while staying green.
    Correct call.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings |

**All received:** Yes (1 enabled specialist returned; 8 disabled via `workflow.reviewer_subagents`)
**Total findings:** 4 confirmed, 0 dismissed, 0 deferred — 3 fixed in place during review, 1 filed as jt9-31

Eight of nine specialists are disabled in this project, so preflight's mechanical pass is the
only automated coverage. **Every finding below came from a mutation battery, not from
re-reading the diff** — re-reading a refactor this uniform finds nothing, because the whole
change is 27 repetitions of the same correct edit.

## Reviewer Assessment

**Verdict: APPROVED.** Four findings, none blocking. Three fixed in place during review (two
stale-prose defects and one duplicated-helper inconsistency); one coverage gap filed as
**jt9-31**.

### The mutation battery — six mutants, and what each proved

| # | Mutation | Result | What it establishes |
|---|---|---|---|
| M1 | `loadClaims()` → `[]` (Dev's own) | **29 files / 255 tests red** | Every swept file executes the shared loader — 27 swept + the 2 already on it |
| M4 | `claimCoversWithPrefix` drops the prefix filter | **all green** | **Nothing** — see below |
| M5 | prefix `'JT26'` → `'ZZZZ'` | **11 tests red** | The prefix IS threaded through the delegation; the deviation is sound |
| M6 | `line >= start` → `> start` | **19 files / 100 tests red** | Range starts are precisely pinned, not approximately |
| M7 | `line <= end` → `< end` | **16 files / 82 tests red** | Range ends likewise |
| M8 | `asClaim` gutted to `return value as Claim` | **all green** | The "hardening" has zero coverage → jt9-31 |

**M4 is worth recording as a mistake so the next reviewer does not repeat it.** I first tried
to test the prefix guard by *removing* it. That mutation is in the **permissive** direction,
and every assertion it feeds is `.toBe(true)` — a more permissive predicate can only turn
red→green, so the mutant was undetectable *by construction* and its survival proved nothing
about the code. The informative mutation for a `.toBe(true)` coverage assertion is a
**restrictive** one (M5, M6, M7). Direction matters as much as the mutation.

A secondary reading of M4 stands on its own: because dropping the filter changes no outcome,
every range transporter cites currently *does* have a `JT26-*` claim. The filter is a guard
against a future range being covered vacuously by an older JT8/JT23 citation — legitimate,
and equally true before this story. Not a finding against jt9-2.

### Findings

**1. [MEDIUM][TEST] The loader's `asClaim` hardening is completely untested — filed as jt9-31.**
M8 deletes every shape check and all 2499 tests stay green. `asClaim` occurs in exactly two
other files (`arena-destruction-source.test.ts:37`, `homing-source.test.ts:28`) and **both are
comments**. Pre-existing (jt8-3 shipped it untested), so **not a defect of this story and not
grounds to reject it** — but jt9-2 took its dependents from 2 files to 29, which converts a
minor gap into the single unguarded chokepoint for every claims assertion in the joust suite.
Filed with the mutation, the required cases, and a positive control (`source`-less claims are
legal data and must NOT throw, or an over-strict "fix" reddens the registry).

**2. [LOW][DOC] The sweep left 12 `// Claims plumbing (the X pattern)` banners labelling code
that is no longer claims plumbing. FIXED IN PLACE.** In five files the banner ended up sitting
directly above a **ROM source-line reader** — `dissolve-source.test.ts:110` over `jline()`,
`difficulty-source.test.ts:47` and `wave-source.test.ts:46` over `line()`, `ptero-source.test.ts:38`
and `troll-source.test.ts:36` over "Raw-line reader for INSTRUCTION lines". A reader following
that banner would look for the claims code and find a line accessor. In the other seven the
`(the wave-source.test.ts pattern)` style cross-reference had become a **dangling pointer** —
each named a file whose local pattern this very story deleted. The banners were accurate
before the sweep, so this defect is jt9-2's own. Removed where the plumbing is gone, retitled
to name the shared loader where claims-adjacent code remains.

**3. [LOW][DOC] "all 921 committed claims" is wrong — the figure is 938. CORRECTED in the
session.** The *conclusion* was right and I re-verified it independently: 938 of 938 claims
carry a `source.file`, and **0** contain a `/`, so the helper's basename match and the old
whole-string match are equivalent on the current registry. Only the count was mis-summed. It
is in the pushed commit message, which is immutable — the Dev Assessment now carries 938 and
this section records the discrepancy so the archive is not the only place the wrong number
survives. Preflight then repeated "921" back verbatim from the commit message, which is a
tidy demonstration of why a wrong number in a permanent record is worth correcting: the next
reader does not re-derive it, they quote it.

**4. [LOW][RULE] One concept, two helpers — the story solved the same problem two ways in
one commit. FIXED IN PLACE.** Caught against **lang-review check #18**, which a sibling
checkout updated into `.pennyfarthing/gates/lang-review/typescript.md` while this review was
running (I re-read the checklist after the rebase precisely because it had moved). Check #18:
*"One concept, two helpers … worse than duplication — the next reader picks the wrong one."*

`transporter-source.test.ts`'s `claimCoversWithPrefix` narrows by claim id and **delegates**
the range match to the shared `claimCovers`. `baiter-source.test.ts`'s `jt35Covers` narrowed
identically — the doc comments give the *same* rationale, that a bare `claimCovers` would go
vacuously green — but **re-implemented** the match inline, and therefore still carried a local
`basename`: a copy of exactly the logic this story exists to centralize. `jt35Covers` now
delegates too, and the local `basename` is gone with it.

The narrowing is preserved **exactly**: it stays a strict `/^JT35-\d+$/` regex rather than
adopting transporter's `startsWith`, because `startsWith('JT35')` would also admit a
hypothetical `JT350-*` namespace. Making the two *identical* would have widened one of them —
the wrong kind of consistency, and the trap this finding could easily have created.

Mutation-tested, not assumed: narrowing rewritten to match nothing → **2 tests red** (it is
wired); narrowing removed entirely → green, the permissive direction again. That second
result *confirms* the comment's claim rather than undermining it — jt1-8 already pins those
lines (`JT8-015 :2150`, `JT8-094 :2135`), so a bare `claimCovers` genuinely would pass
vacuously, which is why the JT35 narrowing exists at all.

### Verified, with evidence

- `[VERIFIED]` **All 24 `covers(` → `claimCovers(` renames are pure.** Normalised the removed
  and added call-site lines for all five game files and compared: 8/4/4/7/1 call sites, zero
  mismatches; the only unpaired removal is each file's deleted `function covers(` definition.
  My first attempt used `sed \b`, which BSD sed does not support and which silently normalised
  nothing — re-run in Python before I trusted it.
- `[VERIFIED]` **The basename-vs-whole-string change is a no-op on current data** — 938/938
  bare filenames, 0 containing `/` (measured across all 30 claims files, not inferred from the
  commit message).
- `[VERIFIED]` **Dropping the old variants' trailing `.flat()` is safe** — 0 nested array
  elements across 30 claims files, 0 files whose top level is not a list. Where the old code
  would have silently flattened, the helper throws instead, which is the louder behaviour.
- `[VERIFIED]` **The helper's new comment is accurate** — it claims 29 dependent test files;
  `grep -rln "helpers/claims" *.test.ts` returns exactly 29.
- `[VERIFIED]` **`claimsDir` resolves identically** — the helper computes `helpers/../..`
  where the local copies computed `tests/..`; both land on `plugins/joust/`. Not argued from
  the paths: M1 proves it, since 255 assertions depend on the directory being found.
- `[VERIFIED]` **No test logic changed** — every added line in the diff is a comment, an
  import, the `claimCoversWithPrefix` body, or one of the 24 renames.
- `[VERIFIED]` **Tree clean after six mutations** — `git status --porcelain` empty, helper
  byte-identical to the commit.

### Rule Compliance

- **CLAUDE.md core/shell boundary** — N/A in substance, and checked rather than waved past:
  the diff touches only `plugins/joust/tests/`, no file under `src/core/` or `src/shell/`, so
  no purity scanner is in scope. The joust purity test still passes as part of the 2499.
- **CLAUDE.md "extract into shared only once a second game proves the duplication"** — not
  engaged; `tests/helpers/claims.ts` is joust-local, not `src/shared/`.
- **Repo topology / `never_edit`** — all 28 changed paths are under `plugins/joust/tests/`,
  owned by the orchestrator repo, no symlinked or generated path touched.
- **`tsconfig` strictness** — `noUnusedLocals: true` is the rule that governs this diff most
  directly, and it is satisfied repo-wide: `npm run lint` is clean, and it did real work here,
  catching orphaned `claimsDir` / `repoRoot` / `readdirSync` in three files mid-sweep.
- **Two suites, two runners** — vitest for the app tests, `test:orchestrator` for wiring;
  both run and both pass. The diff adds nothing to `tests/`, so no orchestrator invariant moved.

### Devil's Advocate

*Argue this change is broken.* The strongest case: a 27-file mechanical sweep is exactly where
a reviewer's attention fails, because after the fourth identical hunk the eye stops reading and
starts pattern-matching. The diff is −477 lines, and **deleting 649 lines of test infrastructure
while every test still passes is precisely the signature of a change that removed guards
nobody was checking.** A green suite proves nothing here: a suite that lost its teeth is
green, and greener than before.

So where could a guard have died silently? Three places, and each needed a different probe.
(a) A file could import the helper and never call it — `noUnusedLocals` and TS6192 close that,
and lint is clean. (b) A file could call the helper against a *different* claims directory,
returning `[]`, and every `claimCovers(...)` assertion expecting `false` would still pass while
the `true` ones failed — M1 closes it: 255 tests genuinely depend on the registry resolving.
(c) A local copy could have been *stricter* than the helper, so swapping it silently widened
what counts as coverage. This is the real one, and it happened twice — `egg-source` and
`joust-source` compared the whole `source.file`. Had one claim ever stored `reference/JOUSTRV4.SRC`,
those two suites would have started accepting a citation they previously rejected, with no test
failing anywhere. It is safe **only** because 0 of 938 claims contain a path separator, which is
a property of today's data, not an invariant anyone enforces. If a future story adds a claim
with a path, the widening becomes live and silent. That is worth knowing, though it is a
property of the shared helper's design (and of the 15 local copies that already basenamed),
not a regression this story introduced.

What would a confused maintainer do? Read `// Claims plumbing` in `dissolve-source.test.ts`,
find `jline()`, and conclude the claims code lives somewhere they cannot see — finding 2,
now fixed. What would a malicious input do? Nothing: the loader reads committed repo files
under a path derived from `import.meta.url`, with no user input, no network, no shell. The
one hostile-input surface is a malformed `claims/*.json`, and the code that defends against
it is `asClaim` — which M8 shows is entirely unexercised. That is the finding this section
earned, and it is filed.

**Verdict: APPROVED.** No Critical or High. The refactor is correct, mechanically verified,
and the one judgement call in it (transporter) is the right call for the right reason.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->