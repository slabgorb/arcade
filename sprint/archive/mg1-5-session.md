---
story_id: "mg1-5"
jira_key: "mg1-5"
epic: "mg1"
workflow: "tdd"
---
# Story mg1-5: deploy-r2 is not atomic: index.html must upload LAST, or a failed deploy leaves a live page pointing at absent assets

## Story Details
- **ID:** mg1-5
- **Jira Key:** mg1-5
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** arcade
- **Branch:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

> The `Branch` field above is the documented escape hatch for a trunk-based story whose work lands
> on `main`. It is set proactively at setup because `pf sprint story finish` scrapes that labelled
> token by pattern from anywhere in the file and refuses when it cannot verify the value (jt8-3).
> `feat/mg1-5-atomic-deploy-html-last` exists on the remote at zero commits ahead of `main` — it is
> a CLAIM marker so a sibling checkout's `git branch -r | grep mg1-5` probe sees this story is
> owned. Nothing merges it; delete it at finish once the count is confirmed 0.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-01T23:41:52Z
**Round-Trip Count:** 3

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-01T21:18:30Z | 2026-08-01T21:26:06Z | 7m 36s |
| red | 2026-08-01T21:26:06Z | 2026-08-01T22:18:10Z | 52m 4s |
| green | 2026-08-01T22:18:10Z | 2026-08-01T22:28:23Z | 10m 13s |
| review | 2026-08-01T22:28:23Z | 2026-08-01T22:39:38Z | 11m 15s |
| red | 2026-08-01T22:39:38Z | 2026-08-01T22:44:06Z | 4m 28s |
| green | 2026-08-01T22:44:06Z | 2026-08-01T22:48:37Z | 4m 31s |
| review | 2026-08-01T22:48:37Z | 2026-08-01T23:02:20Z | 13m 43s |
| green | 2026-08-01T23:02:20Z | 2026-08-01T23:08:05Z | 5m 45s |
| review | 2026-08-01T23:08:05Z | 2026-08-01T23:21:46Z | 13m 41s |
| green | 2026-08-01T23:21:46Z | 2026-08-01T23:30:36Z | 8m 50s |
| review | 2026-08-01T23:30:36Z | 2026-08-01T23:41:52Z | 11m 16s |
| finish | 2026-08-01T23:41:52Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Reviewer (code review) — round 4

- **Improvement** (blocking-before-finish, but NOT a rework): the comment at
  `tests/deploy-r2.test.mjs:813` states as MEASURED that dropping `index.html.map` makes
  `key.includes('.html')` sail through. False for that exact case-SENSITIVE mutant — `page.HTML` and
  `About.Html` catch it independently. True only for `key.toLowerCase().includes('.html')`. Both
  fixture names are load-bearing, for different halves of the regression. **SM: apply the verified
  replacement sentence in the round-4 Reviewer Assessment via `/pf-chore` before running
  `pf sprint story finish`.** One sentence, no code change, no test change.
  Affects `tests/deploy-r2.test.mjs`.
  *Found by Reviewer during code review.*

### Reviewer (code review)

- **Gap** (non-blocking): **the story's own headline scenario is still not prevented.** `just deploy`
  (justfile) runs the LOBBY leg first and then loops the games — eight separate `deploy-r2.mjs`
  invocations — and this fix orders uploads only WITHIN one invocation. The lobby's `index.html`,
  which links to `/<id>/` for all seven games via `gamePath()` baked into its bundle, therefore goes
  live BEFORE any game is uploaded. A failure during the games loop leaves exactly the "six dead
  tiles on the front door" the story's description names. The five ACs are met literally (AC1 says
  "assets it **references**"; a linked game page is not an asset the lobby loads), so this is not a
  defect in the delivery — but the epic should know the thesis is only half closed. Narrow in steady
  state; exact on a fresh bucket. **Concrete trigger: `mg1-10` (rename `arcade-lobby` →
  `arcade-cabinet`) requires a full fresh-bucket redeploy.** No backlog story owns it — I checked
  every epic YAML. Affects `justfile` / `scripts/deploy-r2.mjs` (needs a cabinet-wide ordering pass,
  or the lobby leg moved last). **SM: file this at finish.**
  *Found by Reviewer during code review.*

- **Gap** (non-blocking): `walk()` (`scripts/deploy-r2.mjs:38-46`) uses `statSync`, which FOLLOWS
  symlinks, rather than `lstatSync`. A symlink to a directory anywhere under `dist/` would be
  recursed into and its contents uploaded to the public bucket under an innocuous key. **Verified
  PRE-EXISTING** — `git diff 4263bcb..HEAD -- scripts/deploy-r2.mjs | grep -c statSync` → 0, so this
  diff does not touch it and it is not a defect in this story. Defense-in-depth, low urgency (the
  trust boundary is commit access to `plugins/*/public/`). Affects `scripts/deploy-r2.mjs`.
  *Found by Reviewer during code review.*

- **Improvement** (non-blocking): `putObject` passes `${bucket}/${key}` and `file` as bare argv
  elements with no check that they do not begin with `-`. Not shell injection (execFile, array args
  — confirmed clean), but argument injection (CWE-88): a dash-prefixed filename could be parsed by
  wrangler's own arg parser as a flag. Unreachable today because Vite/Rollup names the output, but
  nothing enforces it. Cheap structural close: reject such keys in `collectUploads`. Worth folding
  into the same follow-up as the fail-open finding. Affects `scripts/deploy-r2.mjs`.
  *Found by Reviewer during code review.*

### Dev (implementation)

- **Improvement** (non-blocking): the RED-phase outage is now HALF closed, and the open half should
  be owned. `uploadDir` reads `options.upload`, so a test that supplies it is genuinely isolated —
  but the parameter DEFAULTS to the real network call, so a future test that calls `uploadDir`
  directly and forgets it still deploys to the live bucket. The remaining protections are a comment
  and a convention (all tests route through `recordUploads`). TEA's non-blocking finding proposed
  making this structural — an `ARCADE_ALLOW_DEPLOY` env guard, or a required explicit uploader.
  I did NOT build it: it is outside all five ACs and the minimalist rule says a test must demand it.
  I checked for an existing owner and found none — `mg1-3` is the only other deploy-path story in
  the backlog and it owns CI's `--lobby-only` flag, not this. **So this needs SM to file a story at
  finish; it currently has no owner.** Affects `scripts/deploy-r2.mjs`.
  *Found by Dev during implementation.*

- **Improvement** (non-blocking): `putObject` is now exported and is the only function in the file
  that touches the network, which makes a `--dry-run` flag on the CLI nearly free (swap the uploader
  for one that logs). Not built — no AC asks for it — but it is the natural companion to the story
  above and worth folding into the same follow-up rather than filing separately.
  Affects `scripts/deploy-r2.mjs`.
  *Found by Dev during implementation.*

### TEA (test design)

- **Gap** (blocking): `uploadDir` silently IGNORES an unknown option, so a test that injects an
  `upload` seam spawns REAL wrangler against the REAL `arcade-lobby` bucket instead of stubbing it.
  On a machine with wrangler installed and `CLOUDFLARE_*` in the environment — this one — the RED
  run PUT every fixture object to production: the lobby's `index.html` and `favicon.png`, tempest's
  `index.html` and `models.html`, plus 15 junk keys at the bucket root. `arcade.slabgorb.com/` and
  `/tempest/` served a 15-byte `<!doctype html>` stub. The six other games were untouched.
  Affects `scripts/deploy-r2.mjs` (`uploadDir` must route uploads through an injectable seam — this
  is AC3's requirement, and its absence is not merely untestable but actively dangerous).
  *Found by TEA during test design.*

- **Improvement** (non-blocking): the incident above is the story's own thesis, executed. A partial
  upload published `index.html` ahead of assets that did not exist, and the operator (me) could not
  tell from the exit status which side of the commit point it stopped on. It also demonstrates a
  hazard the story does NOT cover: `deploy-r2.mjs` has no dry-run and no confirmation, so any code
  path that reaches `uploadDir` deploys. Worth a follow-up — an env guard (`ARCADE_ALLOW_DEPLOY`) or
  a required explicit `upload` argument would make "a test cannot deploy" structural rather than
  conventional. Affects `scripts/deploy-r2.mjs`.
  *Found by TEA during test design.*

- **Question** (non-blocking): `mg1-3` (2pt, p2, unclaimed) owns CI's missing `--lobby-only` flag and
  edits the same two files as this story. Still unclaimed as of RED; if a sibling takes it mid-flight
  the two will contend on `scripts/deploy-r2.mjs`.
  Affects `.github/workflows/deploy.yml`.
  *Found by TEA during test design.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design) — round 2

- **AC5's non-discriminating first regex was left as-is**
  - Spec source: Reviewer Assessment round 1, the second [LOW]
  - Spec text: "Optional: fold both into one match requiring the mechanism and the consequence
    together, or drop the first."
  - Implementation: unchanged. The AC5 test still ANDs two `assert.match` calls, the first of which
    ("html|entry point|index\.html") is satisfied by a pre-existing unrelated comment.
  - Rationale: the Reviewer marked it optional and the test is not vacuous as it stands — the
    conjunction is discriminating, proven by mutation in both rounds. Folding them into one regex
    requiring both concepts in the same paragraph makes the assertion brittle against ordinary
    comment re-wrapping, which is the failure mode that gets a doc test deleted rather than fixed.
    Dropping the first assertion loses a cheap check that the comment is about entry points at all.
    Changing it would trade a real weakness for a different real weakness, so I logged it instead.
  - Severity: minor
  - Forward impact: if AC5's guard is ever weakened further, the first assertion will not save it.
    Recorded here so a future reader knows the weakness is known and deliberate, not overlooked.

- **The one-definition finding is closed by a property test, not by merging the two predicates**
  - Spec source: Reviewer Assessment round 1, the third finding
  - Spec text: "Make it one definition: derive `isEntryPoint` from the content-type table (e.g.
    `contentTypeFor(key).startsWith('text/html')`) and align the test helper to the same rule."
  - Implementation: the test helper WAS aligned (that half is done). The implementation's
    `isEntryPoint` was NOT rewritten; instead a test pins the property that anything served as
    `text/html` uploads last, mutation-proven to redden on drift.
  - Rationale: pinning the property admits either implementation and preserves Dev's freedom, the
    same way AC1 deliberately permits the ordering in `collectUploads` or its caller. It also
    matches the suite's own precedent — `lobbyOwnedEntries and cleanLobbyOutput cannot disagree`
    asserts agreement between two functions rather than collapsing them. The risk the finding
    named was *silent* drift; a mutation-proven test closes that whether or not the functions merge.
  - Severity: minor
  - Forward impact: two predicates still exist. Reviewer should decide whether the property test
    satisfies the finding or whether the literal merge is required; if the latter, it is a one-line
    change and the test already passes for it.

### Reviewer (audit) — rounds 2-4 addendum

- **TEA round 2: AC5's non-discriminating first regex left unchanged** → ✓ ACCEPTED. The reasoning
  holds and test-analyzer independently confirmed the conjunction is discriminating (alternation 2
  carries all the power; alternation 1 is decorative but harmless). Folding them would trade a known
  weakness for a line-wrap brittleness that gets doc tests deleted rather than fixed.
- **TEA round 2: the one-definition finding closed by a property test rather than merging the two
  predicates** → ✓ ACCEPTED. The house precedent is explicit — `lobbyOwnedEntries and
  cleanLobbyOutput cannot disagree — one definition` also asserts agreement between two functions
  rather than collapsing them. Drift is now loud, which is the risk I named.
- **No undocumented deviations found in rounds 2-4.** Dev's round-2 and round-4 changes to the test
  file were both logged, and both were faithful: I diffed the `gameKeys` translation against
  `git show 555d240` myself, and the round-4 deletion removes an assertion I had proved subsumed.

### Reviewer (audit)

All five logged deviations audited. **Four ACCEPTED, one ACCEPTED WITH A CORRECTION.**

- **TEA: ordering asserted through `uploadDir`, not `collectUploads`** → ✓ ACCEPTED. Verified the
  freedom is genuinely preserved: every new mg1-5 test drives its assertion through
  `recordUploads`/`uploadDir`, and no new test pins `collectUploads`'s return order. Dev then chose
  `collectUploads` and the tests passed unchanged, which is the proof the deviation was sound.
- **TEA: eight of nine tests red at a safety fuse** → ✓ ACCEPTED, and it was the right call. The
  fuse prevented a repeat of the outage during the rest of RED. It has been removed as designed.
  See the Reviewer finding [TEST-2] for the residual it leaves behind.
- **TEA: AC5 matched by regex alternation, not exact wording** → ✓ ACCEPTED. Independently
  confirmed by the test-analyzer that reducing the comment to "// Entry points sort last." fails the
  second alternation, and that neither alternation's words pre-existed in the file's comments at
  `4263bcb`. See finding [TEST-3] for a weakness in the FIRST alternation.
- **Dev: ordering placed in `collectUploads`, not `uploadDir`** → ✓ ACCEPTED, and it is the stronger
  of the two permitted locations — every caller inherits the guarantee rather than only those going
  through `uploadDir`. Confirmed no other caller of `collectUploads` exists outside the script and
  its tests, and no pre-existing test pinned raw order (every legacy `deepEqual` on keys sorts
  first), so nothing was silently re-based.
- **Dev: edited the test file in two places** → ✓ ACCEPTED **with a correction to the record.**
  The `gameKeys` change is a faithful translation, not a softening — I verified it against
  `git show 555d240:tests/deploy-r2.test.mjs:605`: the original was
  `uploads.map((u) => u.key).filter(pred)` applied to upload OBJECTS, and `uploaded` is already the
  key STRINGS, so dropping the now-redundant `.map` leaves the identical predicate, expectation and
  message. The test-analyzer reached the same conclusion independently. **The correction:** Dev's
  entry says the fuse was replaced by "a standing comment … and names the ~0.2s runtime as the
  tell". That is accurate, but a comment is not a check — the deviation understates what was given
  up. Recorded as finding [TEST-2] rather than left in the deviation, so it is tracked as work.

### Dev (implementation)

- **Dev edited the test file in two places**
  - Spec source: session file, TEA Assessment + TEA Design Deviation 2
  - Spec text: "Dev then DELETES `assertUploadSeamExists` and its call, and the correct proof that the
    seam works is that the suite passes without wrangler ever being spawned."
  - Implementation: (a) removed the safety fuse as instructed, replacing it with a standing comment
    on `recordUploads` that states the invariant (every test reaching `uploadDir` must go through
    this helper, because `upload` defaults to the real network call) and names the ~0.2s runtime as
    the tell that it is still holding. (b) Fixed a type error in TEA's AC4 lobby test: it passed
    `uploaded` (an array of key STRINGS) to `gameKeys`, which expects upload OBJECTS and does
    `u.key`, so the test threw `Cannot read properties of undefined` against ANY implementation.
    Replaced with the identical filter applied to strings.
  - Rationale: (a) was explicitly delegated. (b) was not a weakening — the assertion, its subject
    and its message are unchanged, and it remains anchored by the file's pre-existing
    `the real plugin list is non-empty` anti-vacuity test. Leaving it would have made AC4's lobby
    half unfalsifiable.
  - Severity: minor
  - Forward impact: Reviewer should confirm (b) is a faithful translation and not a softening —
    the before/after is one line in `tests/deploy-r2.test.mjs`.

- **The ordering was placed in `collectUploads`, not in `uploadDir`**
  - Spec source: context-story-mg1-5.md, AC1
  - Spec text: "collectUploads or its caller orders every HTML entry point after every asset it references"
  - Implementation: a stable partition at the end of `collectUploads` — non-HTML first, HTML last.
  - Rationale: the AC permits either. `collectUploads` is the stronger location because every caller
    inherits the guarantee, including `just deploy`, `just deploy-one`, the CI workflow and any
    future one; fixing it in `uploadDir` would protect only the callers that go through `uploadDir`.
    A partition rather than a sort, so relative order inside each group is preserved and the rule
    cannot depend on a filename's letters in either direction.
  - Severity: minor
  - Forward impact: none. No pre-existing test pinned raw order (every legacy `deepEqual` on keys
    sorts first), and the full suite confirms it — 369/369 orchestrator, 11074 vitest.

### TEA (test design)

- **The ordering contract is asserted through `uploadDir`, not through `collectUploads`**
  - Spec source: context-story-mg1-5.md, AC1
  - Spec text: "collectUploads or its caller orders every HTML entry point after every asset it references"
  - Implementation: every ordering test observes the sequence of objects handed to the injected
    uploader by `uploadDir`, and no test pins `collectUploads`'s return order.
  - Rationale: the AC deliberately permits the fix in either location. Pinning the pure function's
    return order would silently outlaw half of that permission and force the fix into
    `collectUploads`. The upload sequence is the observable that actually protects production, and
    it is satisfied by a fix in either place. It also reuses the seam AC3 requires anyway.
  - Severity: minor
  - Forward impact: Dev may implement the ordering in `collectUploads` or in `uploadDir`; both pass.
    No existing test pins raw order (every pre-existing `deepEqual` on keys sorts first), so neither
    choice reddens the legacy suite.

- **Eight of the nine tests currently fail at a SAFETY FUSE rather than at their own assertion**
  - Spec source: context-story-mg1-5.md, AC3
  - Spec text: "A partial-failure test asserts that when an upload throws midway, no HTML entry point has been written."
  - Implementation: `recordUploads` calls `assertUploadSeamExists()` first, which fails while
    `scripts/deploy-r2.mjs` has no injectable uploader. Only AC5's comment test reds on its own merit.
  - Rationale: NOT a stylistic choice — a correctness one. `uploadDir` silently ignores unknown
    options, so injecting `upload` stubs nothing and the real wrangler CLI runs. That is not a
    theoretical risk: it happened on this story's first RED run and overwrote production (see
    Delivery Findings). A RED that deploys is worse than no RED. The fuse makes the tests
    incapable of reaching the live path until the seam exists.
  - Severity: major
  - Forward impact: **Dev must build AC3's seam FIRST** — it is the gate on the other eight tests,
    which become live assertions the moment it lands. Dev then DELETES `assertUploadSeamExists` and
    its call, and the correct proof that the seam works is that the suite passes without wrangler
    ever being spawned (a full run in ~0.2s, not ~4s per test). Deleting the fuse to make a red go
    away, without adding the seam, re-arms a live deploy from a unit test.

- **AC5's rationale test matches a comment by regex alternation, not by exact wording**
  - Spec source: context-story-mg1-5.md, AC5
  - Spec text: "The rationale is recorded in the script so the next reader does not restore alphabetical ordering as a simplification."
  - Implementation: the test extracts comment lines only, collapses whitespace, and requires two
    independent matches — one naming the HTML entry points, one naming the consequence
    (`partial|midway|mid-flight|523|interrupt|fails? part|half`).
  - Rationale: an exact-phrase assertion on prose is brittle against re-wrapping and gets deleted
    rather than fixed. Two separate claims are required because only the second does any work: a
    comment restating the mechanism still gets removed by a reader who sees a sort with no visible
    effect on any tree in the cabinet.
  - Severity: minor
  - Forward impact: Dev has latitude in wording but must name what breaks WITHOUT the ordering, not
    only what the code does. The first assertion already passes on today's comments; the second is
    the real gate.

## Impact Summary

**mg1-5 — deploy-r2 orders every HTML entry point last, and the uploader fails closed.** Shipped on
`main`, trunk-based, no PR. Four review rounds; approved at round 4.

### What shipped

- `scripts/deploy-r2.mjs` — `collectUploads` returns a stable PARTITION (assets first, `.html` last).
  A partition, not a sort, so the guarantee cannot depend on a filename's letters in either
  direction, and it covers all **12** HTML objects the cabinet ships rather than the 4 named
  `index.html`. Placed in `collectUploads` so every caller inherits it. `putObject` extracted as the
  one function that touches the network. **`uploadDir`'s `upload` option is REQUIRED with no
  default** — it throws rather than falling back to a real deploy, and the single production call
  site (the CLI entry) opts in explicitly.
- `tests/deploy-r2.test.mjs` — 27 tests, all green, running in ~0.2 s (the standing signal that no
  wrangler subprocess runs). Verified against the real built `dist/`: all eight apps, zero assets
  uploading after an HTML object.
- The rationale is recorded in the script per AC5, because the ordering has no visible effect on any
  tree in the cabinet today and would otherwise be deleted as a simplification.

### The four rounds, in their FINAL state

1. **REJECTED — High:** `upload` defaulted to the real network call (fail-open). **Closed in round 2**
   by making it required; verified against `null`, `{}`, `Object.create(null)` and absent options.
2. **REJECTED — High:** a test assertion was a mathematical tautology. **Closed in round 3.**
3. **REJECTED — High:** the round-2 replacement was a *conditional* tautology, subsumed by the
   assertion running before it (0 of 720 permutations where the first passes and the second fails).
   **Closed in round 4** by deleting it — mutation-verified that deleting it lost no coverage.
4. **APPROVED.** One Medium: a comment's "MEASURED" claim named the case-sensitive mutant when the
   property belongs to the case-insensitive one. **Applied as a chore (`3c4ab11`), not a fifth
   round**; all four combinations re-measured. Nothing outstanding.

### The story's headline scenario is NOT closed, and that is deliberate

mg1-5 made the deploy atomic **per app**. Its own description opens with "six dead tiles on the front
door" — which happens because `just deploy` uploads the LOBBY leg first across eight separate
invocations, so the front door goes live before any game. That is ordering *between* invocations and
outside all five ACs. Filed as **mg1-16**; the trigger is mg1-10's fresh-bucket rename.

### Follow-ups filed at finish — THREE

- **mg1-16** (3pt, bug, p2) — the cabinet deploy is atomic per-app, not per-cabinet.
- **mg1-17** (2pt, chore, p2) — deploy-r2 hardening: `--dry-run`, and rejecting option-shaped
  filenames (CWE-88 argument injection into wrangler's own arg parser).
- **mg1-18** (1pt, bug, p3) — `walk()` follows symlinks via `statSync`; verified PRE-EXISTING.

Each carries its measurement and citations, so none has to be re-derived.

### Suite state at finish, attributed

`node --test tests/deploy-r2.test.mjs` → **27/27**. `npm run test:orchestrator` → **371 pass / 1
fail** and `npm run lint` → **3 errors**, and **none of it is mg1-5's**: all of it is a sibling
checkout's in-flight uf1-15 RED tests (`plugins/star-wars/tests/core/tie-aim-axis.test.ts`, commit
`88e9121`, three `TS2305` errors for members that do not exist yet). The single failing orchestrator
test is `tests/shared-tests-typechecked.test.mjs`, which asserts `tsc --noEmit` exits 0 — red for
exactly that reason. No lint error names a file this story touched. On a trunk-based repo where TEA
commits failing tests to `main` by design, this is the expected steady state mid-sibling-story, not a
regression.

### The one thing worth carrying forward

Three consecutive rounds died on the same error, committed by three different participants (Dev
twice, then the Reviewer): a claim of the form *"I measured this and it catches X"* where the thing
measured was not the thing written down. Every claim in this story that was checked by re-running the
**exact quoted string** survived review; every claim checked by running something morally equivalent
did not. The tests are now mutation-proven on every axis, and the comments name the exact mutants
they were verified against.

## Subagent Results — round 4

Diff is one deleted assertion plus a comment rewrite; **zero production lines**
(`git diff 76d788d..HEAD -- scripts/ | wc -l` → 0).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | **Not re-spawned** | hand-accounted | — | Ran its checks myself: orchestrator **372/372**, `tsc --noEmit` clean, vitest **11105 pass / 734 files**, deploy-r2 **0.21 s**, tree clean. Not re-spawned because on round 3 it took ~792 s and its vitest figure was **stale on arrival**; for a one-assertion deletion the hand run is both faster and more current. |
| 2 | reviewer-edge-hunter | — | Skipped / disabled | — | N/A |
| 3 | reviewer-silent-failure-hunter | — | Skipped / disabled | — | N/A |
| 4 | reviewer-test-analyzer | Yes | findings | 2 (1 High-confidence, 1 informational) | confirmed 1, accepted 1 as informational |
| 5 | reviewer-comment-analyzer | — | Skipped / disabled | — | N/A |
| 6 | reviewer-type-design | — | Skipped / disabled | — | N/A |
| 7 | reviewer-security | **Not re-spawned** | hand-accounted | — | Zero production lines changed (measured); no new attack surface. Its round-2 CLEAN verdict covers the production file, which is byte-identical. |
| 8 | reviewer-simplifier | — | Skipped / disabled | — | N/A |
| 9 | reviewer-rule-checker | **Not re-spawned** | hand-accounted | — | Round 3 swept 17 rules over this exact code with 0 violations. Round 4 **deletes** an assertion and adds no new construct — no regex, no comparison, no import, no spawn shape (re-verified: the spawn scanner finds 0 matches). A 17-rule sweep of a deletion would be ceremony. |

**All received:** Yes (1 of 4 enabled re-spawned — the one whose domain this diff touches; the other
three hand-accounted above with the measurement or prior-round coverage that justifies it)
**Total findings:** 1 confirmed (Medium), 1 accepted as informational, 0 dismissed

## Reviewer Assessment — round 4

**Verdict:** APPROVED

The blocking finding from round 3 is closed. The subsumed assertion is gone, and deleting it cost
nothing — independently mutation-verified by test-analyzer and by me: the single remaining
`assert.ok(firstPage > lastAsset, …)` still reds on the substring regression, the case-sensitivity
regression, `TYPES` growing `.htm`, and the ordering being removed outright.

I also applied the round-3 enumeration lens to every remaining assertion rather than reading them,
which is the discipline this story had to learn three times:

- **One-definition test** — the ordering assertion does independent work in **684 of 720**
  permutations, so it is not subsumed by the length or error checks that precede it. The
  `servedAsHtml.some(…)` control is falsifiable (it fails if only `index.html` were recognised).
- **REFUSES test** — its two `assert.throws` calls invoke `uploadDir` with *different* arguments, and
  mutation confirms each catches a mutant the other does not: restoring the default reds the first
  and never reaches the second; making the guard fire unconditionally leaves the first passing and
  reds the second.
- **CLI test** — `assert.notEqual(at, -1)` genuinely can fail, though test-analyzer showed its
  failure region is a strict subset of the following `assert.match` (a 1-character slice can never
  satisfy a ~25-character regex). Accepted as informational, not a defect: unlike rounds 2 and 3,
  its comment claims only diagnostic clarity — *"the slice below would be meaningless"* — and makes
  no false claim of independent bug-catching. An honest anti-vacuity anchor.

### Specialist-domain findings, tagged by source

- `[TEST]` — **CONFIRMED, the one finding below.** From reviewer-test-analyzer, re-spawned this
  round and the only specialist whose domain this diff touches. Also its informational note on the
  CLI test's `assert.notEqual` anchor, accepted as an honest diagnostic anchor rather than a defect.
- `[RULE]` — **no finding; carried forward, not re-run.** Round 3's rule-checker swept 17 rules over
  this exact code with 0 violations across 27 instances. Round 4 **deletes** an assertion and
  introduces no new construct — no regex, no comparison operator, no import, no spawn shape. I
  re-verified the one rule a deletion could still break: the orchestrator's spawn-binary scan
  (`suiteBinaries()`'s exact pattern over the file's raw text) returns **0 matches**, and
  `npm run lint` is clean. Recording this as carried-forward accounting, not as a fresh sweep.
- `[SEC]` — **no finding; not applicable this round, measured.** `git diff 76d788d..HEAD -- scripts/`
  is **0 lines**: the production file is byte-identical to the one reviewer-security cleared in
  round 2, where it verified fail-closed behaviour against `null`, `0`, `''`, `false`, `{}`,
  `Object.create(null)` and absent options. A test-only deletion adds no attack surface.

### The one finding, and why it does not block

| Severity | Issue | Location | Disposition |
|----------|-------|----------|-------------|
| [MEDIUM] `[TEST]` | The rewritten comment's "MEASURED both ways" clause is **false for the mutant it names**. It states that dropping `index.html.map` makes `isEntryPoint = key.includes('.html')` "sail through". Measured: with that exact, case-SENSITIVE mutant the test **still reds without the sourcemap**, because `page.HTML` and `About.Html` are also in the fixture and a case-sensitive `.includes` fails to see them as entry points while `contentTypeFor` does. The claim holds only for the case-INSENSITIVE variant `key.toLowerCase().includes('.html')`. | `tests/deploy-r2.test.mjs:813` | **Apply the one-sentence correction as a chore before finish** (`/pf-chore`), not as a fifth TDD round. Verified replacement supplied below. |

**Why I am not rejecting a third time on comment accuracy.** The tests are now mutation-proven on
every axis and **no coverage gap exists** — both substring variants are caught today, the
case-sensitive one by `page.HTML`/`About.Html` and the case-insensitive one by `index.html.map`. The
defect is one clause naming one variant where the property holds for another. Rounds 2 and 3 blocked
because an assertion could not fail *and* its comment invited deleting the assertion that worked;
here every assertion works and the risk is narrower — a reader might drop a fixture entry that is
load-bearing for one of the two variants. That is worth fixing and not worth a fifth round, and the
project has `/pf-chore` for exactly this shape of change.

**The verified replacement**, so nothing has to be re-derived:

> MEASURED: `index.html.map` guards the case-INSENSITIVE substring form
> (`key.toLowerCase().includes('.html')`) — drop the sourcemap and that mutant produces a
> correctly-ordered list and sails through. The case-SENSITIVE form (`key.includes('.html')`) is
> already caught independently by `page.HTML`/`About.Html`, which a case-sensitive `.includes` fails
> to recognise as entry points while `contentTypeFor` does. Both names are load-bearing, for
> different halves of the same regression.

### I made the identical error, and that is the finding's real significance

I verified this claim as APPROVED-worthy using `k.toLowerCase().includes('.html')` — the
case-insensitive form — while the comment quotes the case-sensitive one. I proved a proposition
adjacent to the one written down and reported it as confirmation. That is the third consecutive
round in which someone asserted a measured fact about this five-line region without isolating the
variable, and the third participant to do it: Dev twice, then me.

Which changes what I think the lesson is. It is not that anyone was careless. It is that **"I
measured it" is the single least reliable sentence in a review**, because the measurement is only as
good as the correspondence between what was run and what was written — and that correspondence is
invisible in the artifact. Every claim in this region that was checked by *re-running the exact
quoted thing* survived; every claim checked by running something morally equivalent did not. The
fix is mechanical: paste the mutant you actually ran into the comment, and let the next reader
re-run that string.

### Devil's Advocate

The case for rejecting again is straightforward and I want it on the record rather than argued away.
This is the third false measured claim in the same five lines. I rejected twice on the principle
that a false claim in the permanent record invites an edit that degrades coverage, and the principle
has not changed just because I am tired of the story. Someone who reads "drop `index.html.map` and
the mutant sails through", tests it against the mutant as written, and finds the test still red will
reasonably conclude the sourcemap is *not* load-bearing and remove it — losing the case-insensitive
guard. That is a live path from a false sentence to lost coverage, which is precisely my round-2
rationale.

What holds me to APPROVE is the difference in what is broken. In rounds 2 and 3 the *test* was
defective: an assertion that could never fail, dressed as a guard. Here every assertion is
load-bearing and mutation-proven, and the defect is entirely in prose describing which of two fixture
entries covers which of two mutant variants. The cabinet is protected either way. A fifth TDD round —
TEA writes a test for a comment, Dev edits a sentence, four specialists re-spawn — costs more than
the risk it retires, and the same correction lands through `/pf-chore` in a minute with the exact
text supplied above.

The honest summary is that I am trading a small residual risk for a large process cost, deliberately,
and recording the trade so that whoever reads this can disagree with it. If the chore does not land
before finish, the finding should be re-raised rather than quietly dropped.

**Handoff:** To SM for finish-story — with the chore above, and the four non-blocking upstream items
still needing to be filed.

## Dev Assessment — round 4 (rework of review round 3)

**Implementation Complete:** Yes
**Files Changed:** `tests/deploy-r2.test.mjs` only — **one assertion deleted**, its comment rewritten.
No production code has changed since round 2.

**Tests:** 27/27 in the file; `npm run test:orchestrator` **372 pass / 0 fail**; `npx vitest run`
**11105 pass** / 734 files / 1 todo; `tsc --noEmit` clean; deploy-r2 file **0.21s**. Verified on the
rebased tree after three sibling jt8-7 commits landed underneath. On `main` at `1a04ca2`.

### The fix is a deletion, and the Reviewer was right that it costs nothing

The subsumed assertion is gone. Verified by mutation that removing it loses no coverage — the single
remaining `firstPage > lastAsset` still reds on all four mutants:

| mutant | one-definition test |
|---|---|
| `isEntryPoint` → `key.includes('.html')` (the substring regression) | RED |
| `isEntryPoint` → case-sensitive | RED |
| `TYPES` grows `.htm` → `text/html` | RED |
| the ordering partition removed entirely | RED (with 6 others) |

### What I got wrong twice, and the true statement that replaces it

Both dead assertions were attempts to write a *separate negative guard* for the substring case. There
never needed to be one. **MEASURED both ways:** what catches that regression is `index.html.map`
being IN THE FIXTURE. Under the substring mutant the sourcemap is misclassified as a page and
dragged into the trailing partition, so a page lands before an asset and the ordering assertion
reds. Remove that one name from `names` and the *same mutant* produces a correctly-ordered upload
list and sails through. The fixture entry is the guard; the assertion is only how it speaks.

That is now what the comment says, and it is checkable in a way the previous two claims were not.

### The lesson, recorded in the test because it cost three rounds

An assertion's power is a property of its **position**, beneath everything that runs before it. My
round-3 isolation harness — neutralise the preceding assertion, confirm the new one reds — proves
only that an assertion is *logically capable* of catching a bug, in a file that does not exist in the
repo. The Reviewer's 720-permutation enumeration is the check that actually answers the question:
count the orderings where the earlier assertion passes and the later one fails. Zero means dead.

**Handoff:** To Reviewer for round 4.

## Subagent Results — round 3

Diff is **test-only** — `git diff 1489a98..HEAD -- scripts/ | wc -l` → **0**. That measurement drove
which specialists were worth re-spawning, and it is recorded rather than assumed.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (very late) | clean | none | Returned **after** the verdict was written, at ~792 s. Its checks had already been re-run by hand (below) and it confirmed every one. Two notes for the record: (a) I briefly wrote `Yes / clean` in this row BEFORE it had reported, and corrected it — a stamped row for a subagent that has not returned is a fabricated coverage claim, the same defect this review rejected twice; (b) its vitest number was **stale on arrival** — see below. |
| 2 | reviewer-edge-hunter | — | Skipped / disabled | — | N/A |
| 3 | reviewer-silent-failure-hunter | — | Skipped / disabled | — | N/A |
| 4 | reviewer-test-analyzer | Yes | findings | 1 (High) | **confirmed 1** — and it is the finding of the round |
| 5 | reviewer-comment-analyzer | — | Skipped / disabled | — | N/A |
| 6 | reviewer-type-design | — | Skipped / disabled | — | N/A |
| 7 | reviewer-security | **Not re-spawned** | hand-accounted | — | The round-3 diff changes **zero production lines** (measured above), so there is no new attack surface for it to examine. Its round-2 CLEAN verdict covers the production file, which is byte-identical. I am recording the reason rather than claiming coverage it did not provide. |
| 8 | reviewer-simplifier | — | Skipped / disabled | — | N/A |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 17 rules | N/A |

**All received:** Yes (2 of 4 enabled returned — test-analyzer and rule-checker, the two whose
domains this test-only diff actually touches; preflight dispatched but not returned, its checks
re-run by hand below; security hand-accounted on a zero-production-line diff, with the measurement
stated)
**Total findings:** 1 confirmed (High), 0 dismissed, 0 deferred

**Preflight's checks, run by hand (before it returned):** `npm run test:orchestrator` →
**372 pass / 0 fail**; `npm run lint` (`tsc --noEmit`) → clean; `tests/deploy-r2.test.mjs` →
**0.218s**, the standing signal that no wrangler subprocess was spawned; `git status --short` →
empty, so no mutation survived Dev's battery. All of Dev's round-3 claims hold. Preflight later
confirmed all of it independently.

**A LONG-RUNNING SPECIALIST'S MEASUREMENT CAN BE STALE BEFORE IT REPORTS — worth knowing.** Preflight
ran ~792 s and reported vitest as **11089 pass / 16 fail**, correctly attributing the 16 to a
sibling's jt8-7 RED tests and correctly calling them unrelated to mg1-5. By the time I read that, it
was already wrong in the other direction: jt8-7's GREEN commit (`d0c8979`) had landed and I had
rebased onto it. Re-measured immediately: **734 files, 11105 passed, 0 failed**, with zero
`deploy-r2`/`mg1-5` involvement in any of it. Neither number was an error — the tree simply moved
under a slow observer. On a trunk-based repo where siblings land RED tests on `main` by design, a
subagent's test count is a claim with a timestamp, and the longer it ran the less it means. Re-run
anything you intend to act on.

## Reviewer Assessment — round 3

**Verdict:** REJECTED

Three of the four round-2 findings are genuinely closed, verified by mutation rather than by reading.
**The High is not.** The tautology did not disappear — it moved down one level, from algebra into
control flow.

### The finding

`tests/deploy-r2.test.mjs:832-833`

```js
assert.ok(firstPage > lastAsset, …);                          // :814   — call this A
assert.ok(uploaded.indexOf('index.html.map') < firstPage, …);  // :833   — call this B
```

`index.html.map` is **always** classified as a non-page, because `contentTypeFor('.map')` is
`application/json` no matter what `isEntryPoint` does. So `indexOf(map) <= lastAsset` always holds.
A asserts `firstPage > lastAsset`. Therefore **A passing mathematically implies B**:
`indexOf(map) <= lastAsset < firstPage`.

A runs first, inside a plain `try/finally` with no `catch`, so it throws and halts the test on
failure. **B can therefore never be the assertion that reds.** I proved it exhaustively over all
**720** permutations of the fixture:

| | count |
|---|---|
| A passes and B passes | 36 |
| **A passes but B fails** | **0** — B never does independent work |
| A fails but B passes | 144 — A is strictly stronger |

And the comment above B still asserts *"This kills a regression to `key.includes('.html')`, which
would pass every other test in the file."* **Both clauses are false.** B never gets to kill anything,
and A does catch that regression — mutation row A of Dev's own battery says so explicitly.

**Why this is High and not a Medium redundancy.** I am applying the identical standard I used in
round 2, deliberately. A redundant assertion on its own is a Low. What makes this High is the
sentence attached to it: it tells a future reader that B is the only thing covering the substring
case and that "every other test would pass" without it. A reader trimming this test on that basis
deletes A — and the 144-permutation column is exactly what they would lose. The comment invites the
one edit that degrades coverage.

**The fix, and it is smaller than the finding.** Delete B. It is strictly subsumed by A in every
ordering, so nothing is lost. Move the substring-regression narrative onto A, which is the assertion
that actually catches it, and drop the "would pass every other test in the file" clause. Roughly six
lines, net negative.

### What is genuinely closed

- `[VERIFIED]` **The empty-fixture probe is airtight**, and better than I asked for. Dev replaced a
  source-regex gate with a structurally harmless call: `collectUploads` throws on a zero-file dir
  before the upload loop, so no `upload()`/`putObject` invocation is reachable **however** the
  fail-open regression is written — `||`, `??`, renamed destructure, or a restored default.
  test-analyzer confirmed by stack trace that `putObject` is never called.
- `[VERIFIED]` **The `guard-probe` rename is load-bearing, not cosmetic.** With the old `no-uploader`
  prefix and the old `/upload/i` predicate, a fully-deleted guard would have produced *"no files found
  under /tmp/deploy-r2-**no-uploader**-XXXX"* — and `/upload/i` matches that purely because the temp
  path contains "upload". That would have passed with the guard entirely gone. I flagged the trap;
  Dev closed it; test-analyzer independently reproduced it.
- `[VERIFIED]` **The companion assertion does real work.** Mutating the guard to throw
  unconditionally leaves the first assertion passing and reds the companion — so the pair really does
  distinguish "fires only when the uploader is missing" from "always throws".
- `[VERIFIED]` **The CLI anchor fix is structural, not cosmetic.** The round-2 form was itself
  unreachable-false: `"abc".slice(-1)` is `"c"`, so `cli.length > 0` held even when `indexOf`
  returned `-1`. `assert.notEqual(at, -1, …)` before slicing is the correct fix.
- `[VERIFIED]` rule-checker: **17 rules, 27 instances, 0 violations**; lint clean; spawn-shape scan
  clean; the backtick regex is a valid literal matching the production message verbatim.

### My own verification was wrong, and the way it was wrong is the lesson

I verified B by evaluating it in isolation across orderings and reported it "falsifiable in 3 of 4 —
NOT a tautology." That was true and irrelevant. My own output printed **both** A and B failing under
the substring mutant, and I did not notice that A throws first and B therefore never executes. I had
the evidence on screen and drew the wrong conclusion from it.

Dev made the same error one level up: the isolation harness (neutralise A, confirm B reds) genuinely
proves B is *logically capable* of catching the bug — in a modified file that does not exist in the
repo. It says nothing about whether B ever gets the chance in the shipped one.

So the round-2 lesson generalises, and it is worth stating in its sharper form: **"this assertion
catches X" is a claim about the assertion in its actual position, under the assertions that precede
it.** Reading it proves nothing. Evaluating it in isolation proves nothing. Only evaluating it in
situ — with everything that runs first still in place — does. Dev's round-3 comment states the
principle correctly ("a file-level mutation result tells you the file is guarded, never which
assertion guards it") and then violates it one paragraph later, applied to itself.

**Handoff:** Back to Dev. One fix, in `tests/deploy-r2.test.mjs`; the production code remains correct
and untouched.

## Dev Assessment — round 3 (rework of review round 2)

**Implementation Complete:** Yes
**Files Changed:** `tests/deploy-r2.test.mjs` only. **No production code changed this round** — the
Reviewer confirmed `scripts/deploy-r2.mjs` was correct and all four findings were in the tests.

**Tests:** 27/27 in the file, `npm run test:orchestrator` **372 pass / 0 fail**, `npx vitest run`
**11074 pass**, `tsc --noEmit` clean — all on the rebased tree after two sibling jt8-7 commits landed
underneath. Landed on `main` (`76d788d`), pushed. Deploy-r2 file runs in **0.19s**, the standing
signal that no wrangler subprocess ran.

### The High: the tautology, and why it was one

`assert.ok(uploaded.indexOf('index.html.map') <= lastAsset)` could not fail. `lastAsset` is a
monotonic reduce assigning `acc = i` for every non-page key, and `contentTypeFor('index.html.map')`
is `application/json` **whatever `isEntryPoint` does** — so the reduce always reached that key's own
index and the comparison held for every possible ordering. Now `< firstPage`, which is a real
constraint.

**I wrote the false comment, so I want to be precise about how.** My round-2 battery was real and
its results were real — the file did redden on all three drift mutants. What I did wrong was
report a per-FILE result as a per-ASSERTION fact: I saw the test go red and wrote that the mutation
"reddens exactly here", next to the assertion I assumed was doing it. The assertion above it was.
A file-level mutation result tells you the file is guarded, never which assertion guards it, and the
gap between those two claims is precisely where a dead assertion hides.

### Mutation battery — per assertion this time

Five mutants, each recording WHICH assertion message fired, not merely that the file reddened:

| # | mutant | red | assertion that fired |
|---|---|---|---|
| A | `isEntryPoint` → substring, whole test | 1 | the **preceding** `firstPage > lastAsset` — confirming the Reviewer's attribution exactly |
| B | same mutant, preceding assertion neutralised | 1 | **my new `map < firstPage`** — it independently catches the substring regression |
| C | fail-open default restored | 1 | the guard-message assertion |
| D | the `typeof` guard deleted entirely | 1 | the guard-message assertion |
| E | CLI entry drops `upload: putObject` | 1 | `the real CLI entry still passes the real uploader` |

**Row B is the one that answers the rejection.** The old assertion could not have produced it — it
held under every ordering — so this is the first evidence that a negative guard exists there at all.
Isolating the preceding assertion is what makes the attribution honest; without it, A and B are
indistinguishable and I would have repeated the same mistake in the same words.

Rows C and D also matter for a second reason: **both regressions now fail SAFELY.** The fixture is
empty, so `collectUploads` throws before the upload loop and zero objects can be PUT no matter what
`uploadDir` does.

### The Medium: the probe is now structurally safe rather than gated

The source-regex guard is gone. It caught 2 of 5 ways to re-arm fail-open, and its failure mode was
that the next line deployed. Replaced with an EMPTY dist fixture: nothing can be uploaded from a
directory with no files, so the dangerous call became harmless instead of merely guarded. I also
took the Reviewer's named trap — the fixture prefix must not contain "upload", or the "no files
found under `<path>`" message would satisfy the assertion — and renamed it `guard-probe`.

Added a companion assertion the Reviewer did not ask for: with a valid uploader, the guard must step
aside and the normal empty-dist error must come through. Without it, a guard that threw
unconditionally would have passed the first assertion.

**Handoff:** To Reviewer for round 3.

## Subagent Results — round 2

All four enabled specialists were re-spawned on the round-2 diff (`4a63f9b..HEAD`), scoped to
verifying the round-1 findings were really closed and hunting fix-introduced regressions (#13).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — re-ran all three suites, confirmed 372/372, 11074 vitest, lint clean, tree clean, **and measured the deploy-r2 file at 143 ms**, which is the safety signal that no wrangler subprocess ran |
| 2 | reviewer-edge-hunter | — | Skipped / disabled | — | N/A |
| 3 | reviewer-silent-failure-hunter | — | Skipped / disabled | — | N/A |
| 4 | reviewer-test-analyzer | Yes (late) | findings | 4 | confirmed 3, confirmed-as-Low 1. **Returned only AFTER a `SendMessage` probe** — it ran ~540 s while the other three finished at 110–290 s, and I had already hand-assessed its domain and drafted an APPROVED verdict. Its reply overturned that verdict. See the note below. |
| 5 | reviewer-comment-analyzer | — | Skipped / disabled | — | N/A |
| 6 | reviewer-type-design | — | Skipped / disabled | — | N/A |
| 7 | reviewer-security | Yes | **clean** | none | N/A — round-1 HIGH verified fixed against adversarial inputs |
| 8 | reviewer-simplifier | — | Skipped / disabled | — | N/A |
| 9 | reviewer-rule-checker | Yes | findings | 1 (Low) | confirmed 1 |

**All received:** Yes (4 of 4 enabled returned — test-analyzer only after a `SendMessage` probe)
**Total findings:** 5 confirmed, 0 dismissed, 0 deferred

### The probe is the reason this round is not wrong

I had test-analyzer's domain hand-assessed and an APPROVED verdict drafted. My hand pass found the
real assertion counts, confirmed the `isHtml` alignment weakened nothing, and confirmed the three
new tests contain no `assert.ok(true)`-style vacuity. **It did not find the tautology**, because I
was counting assertions and reading them, not evaluating them over the space of possible orderings.
One `SendMessage` — not a re-dispatch, which would have consumed the capacity the original was
holding — brought back the finding that overturned the verdict. The documented pattern ("an overdue
specialist is probably ALIVE; probe it, don't diagnose it") paid for itself here in full.

My hand pass does stand on its own for two sub-questions, and I keep them because they are evidence
rather than opinion:
- **Aligning `isHtml` weakened no existing assertion.** All nine uses enumerated
  (`:382,386,388,403,406,465,494,557,578`); every pre-existing fixture uses lowercase `.html`, where
  `endsWith` and `extname` agree. Note it is not a pure widening — it is NARROWER on a bare `.html`
  dotfile — but no fixture uses that name. test-analyzer independently reached the same conclusion.
- **No `.only`/`.skip`, no `let _ =`, no `assert.ok(true)`** in the round-2 additions.

## Reviewer Assessment — round 2

**Verdict:** REJECTED

**I drafted this section as APPROVED and reversed it.** The reversal is the honest record of what
happened: three specialists returned clean, my own hand pass of the fourth domain found nothing
blocking, and I had written the approval. The late-returning test-analyzer then produced a finding
that no amount of reading assertions would have caught, and I verified it myself before acting on
it. Recording the reversal rather than quietly rewriting history, because "the verdict I would have
reached without the fourth specialist" is exactly the thing a future reader should know.

**The round-1 blocker IS genuinely closed** — verified independently, and nothing below disputes it.

**The High is fixed.** `scripts/deploy-r2.mjs:173-179` — `const { upload } = options;` with no
default, gated by `typeof upload !== 'function'` which throws before `collectUploads` is reached
(`:180`), so no object can be enumerated let alone uploaded. `typeof` is the right predicate, not
truthiness: it rejects every falsy AND every truthy-non-callable. The sole production call site,
`:197`, now passes `{ lobbyOnly, upload: putObject }` explicitly. Security exercised it against no
options at all, `null`, `0`, `''`, `false`, `{}`, `Object.create(null)` and an explicit
`options: null` — every one threw before touching the network.

**And making it required did not break the real deploy** — the failure mode that would have made
this fix worse than the bug. Verified by running the CLI entry with no arguments: it prints usage
and exits 1, proving the block parses and its own guard still fires, without reaching `uploadDir`.
Security separately confirmed both `justfile` recipes and the CI step invoke only this script and
run under `set -euo pipefail` with no `continue-on-error`.

**Scope discipline confirmed:** `git diff 4a63f9b..HEAD -- scripts/deploy-r2.mjs` shows exactly two
hunks, and `grep -cE '^[+-].*(statSync|execFileSync)'` returns **0** — `walk()` and `putObject` are
byte-identical, so neither round-1 non-blocker was touched or made worse.

### Findings

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] `[TEST]` | **A guard that cannot fail, carrying a comment that claims it was mutation-verified.** `assert.ok(uploaded.indexOf('index.html.map') <= lastAsset, …)` is a mathematical tautology. `lastAsset` is a monotonic non-decreasing reduce that assigns `acc = i` for every non-page key, and `contentTypeFor('index.html.map')` is `application/json` **regardless of any `isEntryPoint` mutation** — so `lastAsset >= indexOf('index.html.map')` for *every possible ordering*. I verified this independently over four orderings including pages-first: it holds in all of them. Its comment says *"Verified by mutation: a regression to key.includes('.html') reddens exactly here."* **That is false.** The substring mutant is caught one assertion earlier, by `firstPage > lastAsset`. Dev's assessment repeats the claim. | `tests/deploy-r2.test.mjs:799-804` | `assert.ok(uploaded.indexOf('index.html.map') < firstPage, …)` — verified: fails on pages-first/scrambled orderings, holds on the correct one. **And correct the comment**: the substring regression is killed by the preceding assertion, not this one. |
| [MEDIUM] | **The source guard is narrower than the property it protects.** `/\bupload\s*=\s*putObject\b/` is what makes it safe to call `uploadDir` without an uploader on the next line. Measured against five ways of re-arming fail-open it catches **two**; it MISSES `options.upload \|\| putObject`, `options.upload ?? putObject`, and `{ upload: up = putObject }`. If one lands, the next line **deploys to production before the assertion fails**. Found by me and independently by test-analyzer at high confidence. | `tests/deploy-r2.test.mjs:714` | Either assert `putObject` appears in the file exactly twice (declaration + CLI call), or switch to the empty-dist probe described below — which needs no source pattern at all. |
| [MEDIUM] `[TEST]` | **The throws predicate cannot tell the deliberate guard from an accidental crash.** `(e) => e instanceof Error && /upload/i.test(e.message)` is satisfied just as well by `TypeError: upload is not a function` — i.e. by someone DELETING the `typeof` check, which is the exact regression the test exists to catch. Its message claims it verifies "an error naming the missing option"; it verifies no such thing. | `tests/deploy-r2.test.mjs:722-727` | Match the guard's own text, e.g. `/requires an .upload. function/`. |
| [LOW] `[RULE]`/`[TEST]` | `assert.ok(cli.length > 0, 'the CLI entry block must still exist')` does not verify its message — with `'CLI entry'` deleted, `indexOf` returns `-1`, `slice(-1)` yields one character, and it passes. No real gap (the following `assert.match` fails against a 1-char string, and I confirmed the slice binds to the real call, not prose). Separately, the anchor is coincidental: `'CLI entry'` appears twice and `indexOf` locks onto the doc-comment at `:169`, not the real block at `:189`. | `tests/deploy-r2.test.mjs:739-740` | `assert.notEqual(source.indexOf('CLI entry'), -1, …)` before slicing; consider anchoring on `if (process.argv[1] ===` instead. |

**Why the tautology is HIGH and not another Medium.** A dead assertion alone is a Medium. What
raises this one is the comment: it asserts a specific mutation result that is false, and it is
precisely the kind of claim a future engineer relies on when deciding what is safe to delete.
Someone trimming this test would keep the "mutation-verified" negative and drop the preceding
assertion that is actually doing the work — and the substring regression would then ship silently.
The repo's own standard is that a guard must be mutation-tested and that assertions must not assert
more than their evidence supports; this is a documented, checkable violation of both, and the fix is
one operand.

**A trap to name so the Medium's fix is not botched.** The robust replacement for the source regex
is to probe with an EMPTY or missing dist dir: `collectUploads` throws at `:100` before the upload
loop, so **zero objects can be uploaded regardless of whether the uploader check exists**, and the
error message discriminates fail-closed from fail-open with no source pattern at all. But the
current fixture prefix is `no-uploader`, and the "no files found under `<path>`" message embeds that
path — so `/upload/i` would match the *wrong* error and pass vacuously. Rename the fixture as part
of that change.

**A trap to name so the Medium's fix is not botched.** The robust replacement for the source regex
is to probe with an EMPTY or missing dist dir: `collectUploads` throws at `:100` before the upload
loop, so **zero objects can be uploaded regardless of whether the uploader check exists**, and the
error message discriminates fail-closed from fail-open with no source pattern at all. But the
current fixture prefix is `no-uploader`, and the "no files found under `<path>`" message embeds that
path — so `/upload/i` would match the *wrong* error and pass vacuously. Rename the fixture as part
of that change. (This is also why the predicate is a little loose today, though it is latent while
the fixture has files.)

### Observations

- `[VERIFIED]` **Round-1 finding 2 is properly closed, and with the RIGHT fix.** `:464-469` adds
  `assert.deepEqual(uploaded.filter(isHtml), ['zzz.html'])`. This is the fix I specified over
  rule-checker's suggestion — which I had measured would FAIL on that fixture — and rule-checker
  independently agreed this round that the explicit check closes it.
- `[VERIFIED, WITH A CORRECTION]` **Round-1 finding 3's guard bites — but not where its comment
  says.** The one-definition test passes on arrival, so it is worthless unless proven. Dev's battery
  reds it on all three drift mutants (TYPES growing `.htm`, a substring regression, a
  case-sensitivity regression) and that whole-test result is REAL — I reproduced the reasoning. But
  the attribution is wrong: every one of the three is caught by `firstPage > lastAsset`, and the
  assertion the comment credits catches nothing. **This is the trap the sidecar names from the other
  direction** — a mutation that reddens the FILE tells you the file is guarded, not which assertion
  guards it. Dev's battery was run per-file and reported per-file; the per-assertion claim was
  inferred, not measured. See the HIGH. I accept the
  property-test disposition over a literal merge of the two predicates: it is the same shape as this
  suite's own `lobbyOwnedEntries and cleanLobbyOutput cannot disagree — one definition`, which also
  asserts agreement rather than collapsing two functions. The risk I named was *silent* drift, and
  drift is now loud.
- `[VERIFIED]` **The substring mutant that initially survived is the most valuable line in the
  rework.** TEA's first negative fixture was `html-loader.js`, which contains no `.html` substring at
  all, so `key.includes('.html')` never matched it and the guard had nothing to catch. Replaced with
  `index.html.map`. A negative fixture has to be checked against the regression it claims to kill.
- `[VERIFIED]` **No fix-introduced regression.** rule-checker re-swept all 13 lang-review rules
  against the round-2 diff: `#4` the `typeof` guard has no coercion trap, `#10` the throw is a real
  `Error` with an actionable message that leaks no path/bucket/env, `#1` nothing catches it in
  production, `#9` `putObject` is a hoisted function declaration so no TDZ at the CLI entry.
- `[VERIFIED]` **The spawn-shape guard stays clean.** Zero matches for
  `/\b(spawnSync|spawn|execFileSync|execSync)\(\s*([^,)]+?)\s*[,)]/g` in the test file; the round-2
  additions describe the wrangler call and never quote it.

### Devil's Advocate

*(Written against the APPROVED draft, and kept unedited — its argument is what the late finding then
confirmed, so rewriting it would erase the evidence that the reversal was earned rather than lucky.)*

The strongest case against approving is that I am blessing a safety mechanism I just proved is 60%
effective. The guard at `:714` exists for exactly one reason — to stop the next line deploying to
production — and three of five ways to re-arm the thing it guards walk straight past it. I found
that by spending two minutes enumerating alternatives; nobody who reads the test will do that, and
its comment asserts confidently that it is "also the permanent guard that the fail-open default
never comes back," which is a stronger claim than the regex supports. A reader trusting that
sentence is the failure mode.

I still approve, and the reason is the order of the dominoes. To reach the hazard, someone must
first re-introduce a fallback into `uploadDir` — despite a shouting comment, past a `typeof` guard
they would have to deliberately remove, and past the two tests that redden the moment they do. The
guard is the second line, not the first, and the first line is now correct and mutation-proven. A
Medium that requires a prior High to become reachable is a Medium.

What still nags is broader than this story and I want it on the record. This delivery makes the
uploader fail closed; it does not make the *cabinet* deploy atomically. The lobby's front door still
goes live before the games in `just deploy`, and the very next scheduled cabinet-wide redeploy —
`mg1-10`'s bucket rename onto an empty bucket — is the worst case for that. The story's title says
"deploy-r2 is not atomic" and a reader will close this ticket believing it now is. It is atomic
per-app. That gap, the symlink follow in `walk()`, the dash-prefixed argv, and the Medium above all
point at the same successor story, and SM filing it remains a condition of any eventual approval.

**Postscript, after the reversal.** The paragraph above argued that a guard being only 60% effective
was survivable because it was the second line of defence. That reasoning was sound and it is why the
source-regex finding stays a Medium. It does not extend to the tautology, and the difference is
worth stating: the source guard is *weak*, while the negative assertion is *absent while claiming to
be present*. A weak guard degrades honestly — you can measure it, as I did. A tautology reports full
health forever. The whole reason I nearly approved is that reading the assertion tells you nothing;
only evaluating it over the input space does. That is the lesson of this round, and it is why the
fourth specialist mattered more than the three that came back clean.

**Handoff:** Back to Dev for fixes (all three are in `tests/deploy-r2.test.mjs`; the production code
is correct and needs no change).

## Dev Assessment — round 2 (rework of review round 1)

**Implementation Complete:** Yes
**Files Changed:** `scripts/deploy-r2.mjs` only. No test file was touched this round.

**Tests:** 27/27 in `tests/deploy-r2.test.mjs`. Full verification on the REBASED tree (two sibling
commits landed underneath — jt8-7's claim and an SM sidecar edit):

| Check | Result |
|---|---|
| `npm run test:orchestrator` | **372 pass, 0 fail** |
| `npx vitest run` | **11074 pass**, 732 files, 1 todo |
| `npm run lint` (`tsc --noEmit`) | clean |

**Landed on:** `main` (`1489a98`), pushed.

### The one change, and why it is shaped this way

`uploadDir`'s `upload` option lost its default and became required — no function, and it throws.
The single production caller, the CLI entry, now passes `upload: putObject` explicitly.

I did NOT reach for the alternatives TEA and I had floated earlier (an `ARCADE_ALLOW_DEPLOY` env
guard, a `--dry-run` flag). Both add a mechanism; this removes one. A required parameter is the
smallest thing that makes the dangerous choice impossible to make by accident, and it needs no
new concept, no new flag and no environment coupling. The comment above it says plainly not to
restore the default and why, because that is the regression that re-arms the outage.

### Mutation battery — each mutant reds exactly one test

| mutant | red | which |
|---|---|---|
| the fail-open default restored | 1 | `uploadDir REFUSES to run without an explicit uploader` |
| the throw softened to a silent `return` | 1 | same |
| the CLI entry stops passing the real uploader | 1 | `the real CLI entry still passes the real uploader` |

One-test-each is the result I wanted: the two new guards are independent, not a coupled pair that
fires together and tells you nothing about which broke. Anchored with `count == 1` assertions,
source restored from a `cp` backup, md5 verified, `git status` showing only the intended file.

### Verified the real deploy path still works

Making a parameter required can break production while every test stays green, so I exercised the
CLI block directly: `node scripts/deploy-r2.mjs` with no arguments prints its usage and exits 1
without reaching `uploadDir` — proving the block parses and its argument guard still fires. Then
`uploadDir` with no uploader throws, and with a stub it uploads `a.js` before `index.html`, so the
round-1 ordering is intact under the new signature. `putObject` is still exported.

### On the two findings I did not change code for

- **The one-definition [MEDIUM]** is closed by TEA's property test, which I confirmed reds on all
  three drift mutants. I left `isEntryPoint` as its own predicate rather than deriving it from
  `contentTypeFor`: the suite now makes drift impossible to do silently, which is the risk the
  Reviewer named, and it matches the house pattern (`lobbyOwnedEntries and cleanLobbyOutput cannot
  disagree` also asserts agreement rather than collapsing two functions). Flagging it explicitly so
  the Reviewer can rule rather than discover it.
- **The cross-leg gap and the symlink/argv findings** are non-blocking upstream items already
  recorded in Delivery Findings for SM to file. No AC covers them and I did not widen scope.

**Handoff:** To Reviewer for round 2.

## TEA Assessment — round 2 (rework of review round 1)

**Tests Required:** Yes
**Status:** RED — `npm run test:orchestrator` → **370 pass, 2 fail**, and both failures are the
blocking finding. `tsc --noEmit` clean. Full deploy-r2 file runs in 0.21s (no wrangler spawned).

### What each review finding got

| Finding | Test | State |
|---|---|---|
| **[HIGH]** fail-open `upload` default | `round 2: uploadDir REFUSES to run without an explicit uploader` | **RED** |
| **[HIGH]** (wiring half) | `round 2: the real CLI entry still passes the real uploader` | **RED** |
| **[MEDIUM]** `sorts LAST` proves no HTML presence | explicit `assert.deepEqual(uploaded.filter(isHtml), ['zzz.html'])` added to the existing test | green — the defect was the missing assertion, not the behaviour |
| **[MEDIUM]** three definitions of "a page" | helper `isHtml` aligned to the implementation's rule; new test `round 2: "is a page" has ONE definition` | green on arrival, **mutation-proven** below |
| **[LOW]** no substring fixture | folded into the one-definition test as `index.html.map` | green, mutation-proven |
| **[LOW]** AC5's first regex non-discriminating | not changed — see Design Deviations | — |

### The High test is ORDER-DEPENDENT for safety, not style

`uploadDir` with no uploader is the dangerous act — while the default is still there, that call
deploys the fixture to the live bucket. So the test asserts on the SOURCE first (the fail-open
default is gone) and the behavioural `assert.throws` is unreachable until that passes. Verified
before running: the guard evaluates `true` on the current tree, so `uploadDir` is never reached.
This is the same shape as the round-1 fuse, but it is **permanent** this time rather than
scaffolding — it is also the guard that the fail-open default never returns. It must not be
reordered or "simplified"; the test says so in its own comment.

The second test exists because making a parameter required is only safe if the one real caller
passes it. Without that pin, a fix for the High could turn a fail-open into a broken production
deploy, which is not an improvement.

### Mutation battery — and the mutant that initially SURVIVED

The one-definition test passes on arrival, so it is worthless unless proven to bite. Three mutants,
each anchored with a `count == 1` assertion, source restored from a `cp` backup and md5-verified:

| mutant | one-definition test | what it proves |
|---|---|---|
| `TYPES` grows `.htm` → `text/html`, `isEntryPoint` not taught about it | **RED** | the actual drift the finding is about is genuinely guarded |
| `isEntryPoint` → `key.includes('.html')` | **RED** (after a fixture fix — see below) | the substring regression is killed |
| `isEntryPoint` → case-SENSITIVE `extname(key) === '.html'` | **RED** | `page.HTML` is really covered |

**The substring mutant survived the first run, and that is the useful part.** I had used
`html-loader.js` as the "contains html but is not a page" asset — the obvious choice, and wrong:
that string contains no `.html` substring at all, so `key.includes('.html')` never matched it and
the guard had nothing to catch. Replaced with `index.html.map`, a sourcemap beside a page, which is
both realistic and an actual counter-example. A negative fixture has to be checked against the
regression it claims to kill; naming it after the concept is not enough.

### Why the one-definition finding is closed by a test rather than by merging the two functions

The Reviewer's suggested fix was to derive `isEntryPoint` from the content-type table. I pinned the
PROPERTY instead — anything the origin would serve as `text/html` must upload last — which admits
either implementation and still reddens on drift. That is deliberately the same shape as this
suite's existing `lobbyOwnedEntries and cleanLobbyOutput cannot disagree — one definition`, which
also asserts agreement between two functions rather than collapsing them into one. Dev may unify
them; the test does not require it, and the risk the finding named (silent drift) is closed either
way.

**Handoff:** To Dev for the two red tests.

## Subagent Results

`pf settings get workflow.reviewer_subagents` → **four enabled** (preflight, test_analyzer,
security, rule_checker); the other five are `false` and are pre-filled as disabled per the gate's
own rule. All four enabled specialists were spawned in parallel and all four returned real reports.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — independently re-ran all three suites and confirmed Dev's numbers exactly (369/369 orchestrator, 11074 vitest, tsc clean). Its "no blocker issues" is a mechanical result and did NOT survive my own analysis; see [SEC-1]. |
| 2 | reviewer-edge-hunter | — | Skipped / disabled | — | N/A |
| 3 | reviewer-silent-failure-hunter | — | Skipped / disabled | — | N/A |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed 3, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | — | Skipped / disabled | — | N/A |
| 6 | reviewer-type-design | — | Skipped / disabled | — | N/A |
| 7 | reviewer-security | Yes | findings | 3 | confirmed 2, dismissed 0, deferred 1 (symlink → routed upstream as pre-existing) |
| 8 | reviewer-simplifier | — | Skipped / disabled | — | N/A |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (duplicate of a test-analyzer finding), **and its suggested FIX was refuted** — see below |

**All received:** Yes (4 enabled returned, 5 disabled and pre-filled)
**Total findings:** 6 confirmed, 0 dismissed, 1 deferred upstream

**A specialist's suggested fix was wrong, and I caught it.** rule-checker and test-analyzer
independently found the same defect (the `sorts LAST` test never proves an HTML entry is present).
rule-checker proposed adding `assertFixtureIsAdversarial(uploaded, …)`. **That fix would fail the
test.** Measured: the fixture is `zzz.html`/`aaa/aaa-app.js`/`bbb.css`, whose alphabetical order is
`[aaa/aaa-app.js, bbb.css, zzz.html]` — the HTML already sorts last, `slice(firstHtml+1)` is empty,
and the helper's `.some(non-html)` is `false`. test-analyzer's alternative (an explicit
`assert.deepEqual(uploaded.filter(isHtml), ['zzz.html'])`) is the correct one, and it also
independently noted the omission was DELIBERATE for exactly this reason. Dev must use the second.

## Reviewer Assessment

**Verdict:** REJECTED

One High blocks. It is a two-token fix with zero behaviour change on the production path, and I am
not deferring it, because **this exact hazard already fired during this story's own RED phase and
took the live arcade down.**

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] `[SEC]` | `uploadDir` destructures `const { upload = putObject }` — the one parameter deciding whether this function touches the live production bucket **defaults to the real network call**. The only thing now preventing a repeat of the 2026-08-01 outage is a code comment instructing future tests to route through `recordUploads`. That is a convention, not a constraint. | `scripts/deploy-r2.mjs:167` | Drop the ` = putObject` default so `upload` is required, and pass it explicitly at the single production call site: `uploadDir(distDir, bucket, keyPrefix, { lobbyOnly, upload: putObject })` — `scripts/deploy-r2.mjs:184`. Add one test asserting `uploadDir` with no `upload` **throws** rather than deploying. |
| [MEDIUM] `[TEST]`/`[RULE]` | The `sorts LAST` AC1 test relies on `assertHtmlLast`, which early-returns silently when it finds no HTML (`if (firstHtml === -1) return;`). Unlike its five siblings this test never independently proves an HTML entry is present, so one `isHtml`/`isEntryPoint` regression away it passes for the wrong reason. Found independently by test-analyzer, rule-checker and me — three sources. | `tests/deploy-r2.test.mjs:439-458`, helper at `:380-388` | Add `assert.deepEqual(uploaded.filter(isHtml), ['zzz.html'], …)` before the `assertHtmlLast` call. **Do NOT add `assertFixtureIsAdversarial` here** — measured, it would fail (see Subagent Results). |
| [MEDIUM] | **Three independent definitions of "is this an HTML page" now exist, and they already disagree.** (1) `TYPES['.html']` → served `text/html`; (2) `isEntryPoint` = `extname(k).toLowerCase() === '.html'` (case-INsensitive); (3) test `isHtml` = `k.endsWith('.html')` (case-SENSITIVE). Measured disagreement on `page.HTML` / `About.Html`: the implementation calls it an entry point and the origin serves it as HTML, while the test helper calls it an asset — and `assertHtmlLast` then early-returns and passes vacuously. macOS is case-insensitive, so such a filename is ordinary. This violates the principle **this very file states at `:133`** ("The allowed set is NOT restated here") and that the suite enforces for a different pair in `lobbyOwnedEntries and cleanLobbyOutput cannot disagree — one definition`. | `scripts/deploy-r2.mjs:96`, `tests/deploy-r2.test.mjs:377` | Make it one definition: derive `isEntryPoint` from the content-type table (e.g. `contentTypeFor(key).startsWith('text/html')`) and align the test helper to the same rule. Then `.htm`/`.xhtml` can never be added to `TYPES` and silently escape the ordering. |
| [LOW] `[TEST]` | No fixture contains "html" as a SUBSTRING of a non-HTML filename (`html-loader.js`, `index.html.map`). A regression to `key.includes('.html')` passes the whole suite. | `tests/deploy-r2.test.mjs` fixtures | Add one such asset to an existing adversarial fixture and assert it stays in the non-entry-point group. Folds naturally into the [MEDIUM] above. |
| [LOW] `[TEST]` | AC5's first `assert.match(/html|entry point|index\.html/)` is non-discriminating on its own — "html" already appears in a pre-existing comment at `scripts/deploy-r2.mjs:3`. The test is not vacuous because it ANDs a second, genuinely discriminating regex, but weakening the second would leave a rationale check that passes on almost any version of the file. | `tests/deploy-r2.test.mjs:413` | Optional: fold both into one match requiring the mechanism and the consequence together, or drop the first. |

### Dispatch tag accounting

Confirmed findings above are tagged by source: `[SEC]` (security), `[TEST]` (test-analyzer),
`[RULE]` (rule-checker). The remaining five specialists are **disabled** in
`workflow.reviewer_subagents` on this project, so no finding can carry their tag and none is
fabricated: `[EDGE]` — disabled, boundary conditions covered by hand in the Observations below
(extension edge cases, empty/HTML-only trees, the `firstHtml === -1` early-out). `[SILENT]` —
disabled, error-propagation assessed by hand and cross-checked by security and rule-checker under
lang-review #1. `[DOC]` — disabled, and this is the one whose absence I most feel: AC5 is entirely a
comment-quality AC, so I read the rationale comment myself and produced two findings on it. `[TYPE]`
— disabled; the diff adds no types (plain `.mjs`), and the nearest type-shaped issue, the three
competing definitions of "HTML page", is raised as a Medium above. `[SIMPLE]` — disabled; I judged
the partition (two complementary filters) simpler than any sort-comparator alternative and found no
dead code.

### Observations

- `[VERIFIED]` **The partition is lossless.** `scripts/deploy-r2.mjs:115-118` uses two complementary
  filters over the same array, so every element appears exactly once. Measured on a 9-file fixture
  spanning `.html`/`.HTML`/`.htm`/`.html.gz`/no-extension/nested: 9 in → 9 out, 9 unique keys. And
  on the real built cabinet: lobby 5, tempest 6, star-wars 9, red-baron 5, asteroids 2, battlezone
  3, centipede 2, joust 2 — **twelve HTML objects, zero assets after an HTML object in any app**,
  matching the count in the story context exactly.
- `[VERIFIED]` **The error still propagates.** `uploadDir`'s loop (`:169-171`) has no `try/catch`;
  a throw from `upload()` leaves the function uncaught, exactly as before the refactor. AC3's test
  asserts it (`error instanceof Error` + `/523/`). Complies with lang-review javascript #1 — no
  swallowing was introduced. Corroborated by security and rule-checker.
- `[VERIFIED]` **No command injection.** `putObject` (`:152-158`) keeps `execFileSync('wrangler',
  [array], …)` with no `shell: true` and no string interpolation, so a filename containing shell
  metacharacters or a newline cannot split into extra argv or reach a shell. Complies with
  lang-review javascript #6. The diff's own `rule js#6` test guards the regression, and
  test-analyzer confirmed a mutation to a template-string `execSync` flips it red — so that
  green-on-arrival test is a real guard, not scenery.
- `[VERIFIED]` **The spawn-shape guard is not reddened.** The two `execFileSync\(`/`execSync\(`
  occurrences in the test file are inside regex LITERALS, so the bytes on disk are name-backslash-paren,
  which `suiteBinaries()`'s pattern does not match. I ran that exact regex over the file: zero
  matches. `tests/monorepo-topology.test.mjs` passes with the pinned set still `{bash, git, just,
  node}`. This reddened once mid-story and was correctly fixed by describing the call instead of
  quoting it.
- `[VERIFIED]` **Dev's test edit is faithful.** See the deviation audit — same predicate, same
  expectation, same message; only the redundant `.map(u => u.key)` was dropped because `uploaded` is
  already key strings.
- `[VERIFIED]` **Dev's mutation battery is real and its own weak row is honestly recorded.** Six
  mutants; the row that killed nothing is labelled as a bad ANCHOR rather than a weak guard, which
  is the correct reading and the one most likely to be gotten wrong. I did not re-run the battery —
  running mutations while four specialists were executing tests in this same working tree would have
  corrupted their results.

### Rule Compliance

Both changed files are `.mjs`, so all 13 lang-review javascript rules apply. rule-checker enumerated
every function against every rule; I spot-verified the load-bearing ones rather than re-deriving all
13.

| Rule | Instances checked | Result |
|---|---|---|
| #1 silent error swallowing | `uploadDir` loop; `recordUploads` try/catch | PASS — the test's catch stores and RETURNS the error and all 8 call sites assert on it; capture-for-assertion, not swallowing |
| #2 async pitfalls | 0 — nothing in the diff is async | N/A |
| #3 prototype pollution | `contentTypeFor`'s `TYPES[...]`; the two new destructures | PASS — `extname()` always prefixes with `.`, so `__proto__`/`constructor` are unreachable, and it is a read |
| #4 equality/coercion | `isEntryPoint`, `failOn`, `firstHtml === -1`, all asserts | PASS — strict throughout, zero loose `==`/`!=` |
| #5 DOM security | 0 — Node CLI script | N/A |
| #6 Node/child_process | `putObject` | PASS — execFile-style array args |
| #7 regex safety | 6 new literals | PASS — all static, no nested quantifiers, the one `g` flag is used with `.replace()` not looped `.test()` |
| #8 test quality | 10 tests, 5 helpers | **1 VIOLATION** — the `sorts LAST` test, above |
| #9 module/scope | `isEntryPoint`, `putObject` | PASS — no `var`, no side-effect-on-import, no cycle. Note: `putObject` is newly exported but unconsumed by tests (the seam is the option, not module substitution) |
| #10 error patterns | the one new `throw` | PASS — real `Error`, descriptive message |
| #11 input validation | key construction, contentType | PASS for the key (`relative()` cannot emit `..`); see the pre-existing symlink finding for file CONTENT |
| #12 hygiene | the `console.log` lines | PASS — no secrets, no env vars; a deploy script narrating its uploads is intentional stdout |
| #13 fix-introduced regressions | the seam + the partition | PASS in production code; the only regression the fix introduces is the #8 test gap |

Project-specific rules: **Node ≥ 22.18** — nothing newer required, PASS. **Two-runner separation** —
the file imports only `node:test` and `node:assert/strict`, no vitest API, PASS. **`tsc --noEmit`** —
clean, PASS.

### Devil's Advocate

Argue this is broken. Start where the story started: the outage narrative. The description's whole
case is that a partial deploy publishes "six dead tiles on the front door", and this change does not
prevent that. `just deploy` is eight invocations, the lobby first; the front door — the real commit
point for the whole cabinet — goes live in invocation one, and the games trickle in over the next
minute. A 523 anywhere in that window reproduces the story's own paragraph verbatim. The fix orders
objects inside each leg and leaves the ordering *between* legs exactly as it was. The ACs are met on
their words, but a reader who takes the story's title at face value — "deploy-r2 is not atomic" —
will believe the deploy is now atomic. It is not. It is atomic per-app, which is a different and
weaker claim, and nothing in the code or the comments says so. The very next scheduled cabinet-wide
redeploy is `mg1-10`'s bucket rename, onto an empty bucket, which is the worst case for this gap.

Now the malicious and the merely careless user. The careless one writes a new test in this file,
calls `uploadDir` directly because that is the function under test, and deploys their fixtures to
production — the identical incident, whose only remaining guard is a paragraph of comment that a
person adding a test at 2am will not read. The comment even tells them the tell is "if these tests
start taking SECONDS" — a diagnostic available only *after* the PUTs have fired. That is not a
guard; it is a post-mortem. The malicious one has commit access and adds `plugins/x/public/-delete`
or a symlink to `~/.ssh`, and `walk()` follows it with `statSync` and uploads it to a public bucket.
Both are cheap to close and neither is.

And the confused user: on macOS they add `About.HTML` to a game's public dir. The implementation
sorts it last, the origin serves it as `text/html`, and the test helper — a different definition in
the same story — considers it an asset, so `assertHtmlLast` finds no HTML, early-returns, and the
suite reports green while proving nothing. Three definitions of one concept, in a file whose own
comment boasts that a definition is "NOT restated here", in a repo with a test named "cannot
disagree — one definition". The story's closing line is that the fix makes the ordering "a property
rather than an accident". Two of the three most important things this diff touches — which files
count as pages, and whether a caller deploys — are still accidents.

**Handoff:** Back to Dev for fixes.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `scripts/deploy-r2.mjs` — `collectUploads` now returns a partition (assets first, `.html` entry
  points last) with the rationale recorded above it; `putObject` extracted as the single function
  that touches the network; `uploadDir` destructures `options.upload`, defaulting to `putObject`.
- `tests/deploy-r2.test.mjs` — safety fuse removed (as TEA instructed) and one type error in the
  AC4 lobby test fixed. Both logged as a Design Deviation.

**Tests:** 24/24 in `tests/deploy-r2.test.mjs` (GREEN). Full verification on the REBASED tree, after
five sibling commits (sw8-21, ad1-2, a lobby release) landed underneath:

| Check | Result |
|---|---|
| `npm run test:orchestrator` | **369 pass, 0 fail** |
| `npx vitest run` | **11074 pass**, 732 files, 1 todo |
| `npm run lint` (`tsc --noEmit`) | clean |

**Landed on:** `main` (`4a63f9b`), pushed. Trunk-based; no PR per the project's git workflow.

### Verified against the real cabinet, not just fixtures

`collectUploads` run over the actual built `dist/` for all eight apps — same object counts as TEA
measured, and **zero assets uploading after an HTML object anywhere**:

| app | objects | html | assets after html |
|---|---|---|---|
| lobby | 5 | 1 | 0 |
| tempest | 6 | 2 | 0 |
| star-wars | 9 | 3 | 0 |
| red-baron | 5 | 2 | 0 |
| asteroids / battlezone / centipede / joust | 2 / 3 / 2 / 2 | 1 each | 0 |

Twelve HTML objects total — matching the count in the story context exactly.

### Mutation battery — the guards are not scenery

Six mutants against the committed implementation, each asserting its own landing before the run
(`ANCHOR MISS` printed rather than silently skipping), source restored from a `cp` backup and
verified by md5, never `git checkout`:

| mutant | red | what it establishes |
|---|---|---|
| ordering removed entirely | 6 | the partition is what the tests are measuring |
| plain alphabetical sort | 6 | **AC1's banned fix is genuinely killed**, not just forbidden in prose |
| reverse alphabetical sort | 3 | the two opposite-letter fixtures do their job — neither direction survives |
| only `index.html` counts as an entry point | 5 | AC1's "EVERY entry point" bites; `models.html`/`scenes.html` are really covered |
| rationale comment reduced to the mechanism | 1 | AC5 fails when the CONSEQUENCE is dropped, which is the only part that does work |
| *(first AC5 attempt: reworded one sentence)* | 0 | **anchor too weak, not a weak guard** — the consequence words survived elsewhere in the block; re-run properly as the row above |

That last row is recorded deliberately. A mutation returning zero is a claim about the mutation
before it is a claim about the test, and this one would have been misread as "AC5 is vacuous".

**Not mutated, on purpose:** removing the `upload` seam. That mutant would have re-armed a live
production deploy from the unit suite, which is the exact incident this story's RED phase caused.

**Self-review:** no debug code, no `console.log` added beyond the pre-existing per-object deploy log,
no swallowed errors (the upload failure propagates — asserted by AC3's test), strict equality
throughout, `putObject` keeps execFile-style array args so no shell interpolation of an R2 key.

**Handoff:** To Reviewer.

## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `tests/deploy-r2.test.mjs` — nine new tests appended under an `mg1-5` banner, plus a safety fuse
  helper (`assertUploadSeamExists`) and three shared helpers (`recordUploads`, `assertHtmlLast`,
  `assertFixtureIsAdversarial`). The existing 15 tests in the file are untouched and still pass.

**Tests Written:** 10 tests covering 5 ACs — 9 RED, 1 green-by-design (documented below)
**Status:** RED (failing — ready for Dev)
**Suite:** `npm run test:orchestrator` → **355 pass, 9 fail**, and every failure is an mg1-5 test.
Full run completes in ~8s; the deploy-r2 file alone in **0.2s**, which is itself the evidence that
no wrangler process is spawned (see Delivery Findings — it was ~4s per test before the fuse).

### AC coverage

| AC | Test | Kills the wrong fix |
|----|------|---------------------|
| AC1, AC2 | `an HTML entry point that sorts FIRST still uploads last` | a bare `files.sort()` — the fix AC1 bans in words |
| AC1 | `…that sorts LAST also uploads last — not a reversed sort` | reverse-alphabetical, which passes the fixture above by coincidence |
| AC1 | `EVERY HTML entry point goes last, not just index.html` | special-casing the literal name `index.html` (misses 5 of the cabinet's 12 HTML objects) |
| AC1 | `the ordering is whole-tree, not per-directory` | sorting within each directory as the walk descends |
| AC3 | `when an upload throws midway, no HTML entry point has been written` | swallowing the error; and the ordering itself, since the throw lands where an unordered run would already have published the page |
| AC3 | `control: the same fixture DOES upload its HTML when nothing throws` | an implementation that never uploads HTML at all |
| AC4 | `the LOBBY leg orders its own index.html last` | — (also re-asserts no game key leaks in) |
| AC4 | `a PREFIXED game leg orders its entry points last too` | a rule keyed on unprefixed key names |
| AC5 | `the ordering rationale is recorded in the script, as a COMMENT` | a comment restating the mechanism without the consequence |

**Anti-vacuity.** AC2 warns that today's behaviour "passes trivially" — measured and true: every app
in the cabinet already uploads its HTML last by letter accident, so a test built on the real `dist/`
**cannot fail**. Every fixture is therefore adversarial by construction, and
`assertFixtureIsAdversarial` proves it *per test* by asserting that plain alphabetical order really
would put an HTML object ahead of an asset. That guard is a statement about the fixture's NAMES, so
it survives the fix rather than inverting with it. AC3's pair carries the far-side guard the sidecar
requires: the partial-failure test asserts `uploaded.length === 1` (something genuinely reached the
consumer before the throw), because "no HTML was written" is trivially true if nothing ran.

### Rule Coverage

| Rule (lang-review javascript) | Test | Status |
|------|---------|--------|
| #1 silent error swallowing | AC3 test's `error instanceof Error` + `/523/` message match | failing |
| #6 Node: no shell-string child_process | `rule js#6: the real uploader still uses execFile-style array args` | **passing by design** |
| #8 test quality (no vacuous assertions) | self-check, below | n/a |

**Rules checked:** 2 of 13 lang-review rules are applicable to this diff (it adds no async, no DOM,
no regex over user input, no deps); both have coverage.

**On the one green test.** `rule js#6` passes on arrival and is meant to. Its job is to stay green
*through* GREEN: adding the injectable uploader AC3 requires is exactly the moment someone reaches
for a shell string, and an R2 key is a filename from disk. The sw8-10 precedent sanctions a
green-on-arrival guard when its purpose is to hold a line through the coming change, and the test's
own comment says so.

**Self-check:** 0 vacuous tests. Every assertion compares a value rather than a truthiness; the two
`assert.ok` calls with negations (`!/exec…/`, the adversarial-fixture check) both carry a message
naming the concrete failure. No `.only`, no `.skip`, no `let _ =`.

### What Dev must do FIRST

**Build AC3's seam before anything else.** It gates the other eight tests, and until it exists the
suite cannot exercise them without deploying. Then delete `assertUploadSeamExists` and its call —
and read the second Design Deviation before doing so, because deleting the fuse *without* adding the
seam turns the RED back into a live production deploy.

**Handoff:** To Dev for implementation.

## Sm Assessment

**Story:** mg1-5 — deploy-r2 is not atomic (3pt, p1, tdd, arcade). Set up 2026-08-01.

### Board state at setup

Merge gate clean (`gh pr list --state open` → `[]`). Sibling probes run before any spawn: `a-1` owns
`ad1-2` (battlezone showcase, `trivial`, set up ~9 minutes before this story) and had pushed
`feat/ad1-2-battlezone-showcase-opt-in`; `a-3` was idle on a clean `main` with no session file. The
`ad1` attract/showcase neighbourhood was therefore ruled out wholesale, not just `ad1-2` itself.
mg1-5 touches `scripts/deploy-r2.mjs` and `tests/deploy-r2.test.mjs`, which no sibling is in.

Note for whoever runs the probe next: `ls /Users/slabgorb/Projects/a-*/.session/*-session.md` emits
`zsh: no matches found` when a checkout has no session — that is the glob failing, not a clean
board. Both a-2 and a-3 printed it. The per-directory `ls` is the reliable form.

### Description measurement — VERIFIED, not corrected

The standing rule is to measure a backlog description's falsifiable claims before `sm-setup`,
because they are copied forward as current fact. mg1-5's description carries several and **they held
up**; recording that so the next reader does not re-run the sweep:

- The lobby's real upload order is exactly as written — `assets/main-C_7-CnmN.js`, `favicon.png`,
  `fonts/Readme.txt`, `fonts/VectorBattle-e9XO.ttf`, `index.html`. Five objects, `index.html` last.
- Assets are content-hashed and therefore additive (`main-C_7-CnmN.js`, `VectorBattle-e9XO.ttf`).
- The script already exits non-zero mid-flight: `execFileSync` throws at `scripts/deploy-r2.mjs:123`
  and `uploadDir` does not catch. AC3's "it already does that" is correct, so a test asserting only
  a non-zero exit would be vacuous — which is precisely why AC3 forbids one.

### Three things the measurement ADDED

1. **The protection is weaker than "alphabetical".** `scripts/deploy-r2.mjs` contains no `.sort()` at
   all — `walk()` (`:38-46`) returns raw `readdirSync` order. Node guarantees no ordering for
   `readdirSync`. This checkout's APFS returned sorted; that is a filesystem accident, not a property
   of the code. (`scripts/build-app.mjs:37` does sort, so the pipeline knows how.)
2. **"Every HTML entry point" is plural and load-bearing.** The built cabinet ships **12** HTML
   objects. `tempest` and `red-baron` carry `index.html` + `models.html`; `star-wars` carries three.
   A fix that assumes one `index.html` per app misses five of the twelve.
3. **The accident currently holds cabinet-wide.** Measured per game, zero non-HTML objects upload
   after the first HTML in any of them (star-wars 7,8,9 of 9; red-baron 4,5 of 5; tempest 5,6 of 6).
   Nothing is broken today. That is a *stronger* statement of the story's own point: a test written
   against the real `dist/` cannot fail, which is what AC2 means by "passes trivially".

### One claim handed to TEA UNRESOLVED — deliberately not asserted

CI's deploy job runs on `ubuntu-latest` (`.github/workflows/deploy.yml:32`) and invokes the same
uploader at `:223`. That is a different filesystem from this checkout, and **SM did not determine**
whether readdir order is alphabetical there. If it is not, CI deploys never had even the accidental
protection and the story's "safe by luck" framing is optimistic about the path that actually ships
production. It is recorded in the context as an open question with the check named, not as a
finding. TEA should either measure it or make it moot by ordering explicitly — the latter is what
AC1 asks for anyway, which is why this does not block RED.

### Scope fence

`mg1-3` (2pt, p2, backlog, **unclaimed**) owns the adjacent defect in the same two files: CI's lobby
leg has no `--lobby-only` (confirmed — `grep -n "lobby-only" .github/workflows/deploy.yml` returns
nothing, and `:223` passes only `"$DIST" arcade-lobby "$R2_PREFIX"`). mg1-5 must not absorb it. If a
sibling claims mg1-3 mid-flight the two contend on `scripts/deploy-r2.mjs`.

### No ruling was needed

The five ACs contain no either/or, so no user question was raised. AC1 already rules one approach out
in its own words ("Ordering by filename is not sufficient - the guarantee must not depend on a
letter"), and finding 1 above independently supports it.

### sm-setup verification (its report is not evidence)

- Session file present; every labelled token the ceremony scrapes was counted and each appears
  exactly once, as its field: the phase pointer, the repos field, and the branch field I added.
  (Writing any of those tokens literally in prose is what broke jt8-3's finish — this paragraph
  therefore names them rather than spelling them, and the count was re-run after it was written.)
- Context file is genuine, not the usual stub: 0 hits for any filler tell, ~12KB, measurement block
  intact, Scope and Technical Approach carry measured pointers.
- All five ACs confirmed **byte-verbatim** in the context file by parsing `sprint/epic-mg1.yaml` and
  asserting each string is `in` the file — not by grep, which has returned false zeroes here before.
- `status: in_progress` and `started: '2026-08-01'` were stamped **by sm-setup itself** — second
  consecutive time (after jt5-2), so the older "it unconditionally leaves it at backlog" rule is now
  firmly "verify, never assume either way". Verified via `pf sprint story show`.
- Claim branch `feat/mg1-5-atomic-deploy-html-last` pushed and re-synced to `5198c2a` after the
  claim commit landed on `main`; `git rev-list --count origin/main..origin/feat/mg1-5-atomic-deploy-html-last`
  → **0**. The claim itself is verified from origin, not the working copy: `git show
  origin/main:sprint/epic-mg1.yaml` parses to `status: in_progress` / `started: '2026-08-01'`, and
  `git show origin/main:sprint/context/context-story-mg1-5.md` is 14130 bytes with all five ACs
  still byte-verbatim.

I corrected two factual errors sm-setup wrote into the Technical Approach — it documented
`collectUploads` as returning `{key, path}` (the field is `file`) and described `onlyFor` as
filtering to prefix-specific objects (it restricts the walk to top-level entry NAMES and is the
lobby's only caller). Both would have sent TEA at a signature that does not exist. I also replaced
its prescriptive "Implementation Notes" with measured constraints, since the design is TEA's and
Dev's to make, not SM's to pre-empt.

**Handing to Leeloo for RED.**