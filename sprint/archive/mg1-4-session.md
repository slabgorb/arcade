---
story_id: "mg1-4"
jira_key: "mg1-4"
epic: "mg1"
workflow: "tdd"
---
# Story mg1-4: sprint epics still route stories to per-game repos that repos.yaml no longer registers

## Story Details
- **ID:** mg1-4
- **Jira Key:** mg1-4
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-31T21:36:02Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-31T18:32:37+00:00 | 2026-07-31T18:35:10Z | 2m 33s |
| red | 2026-07-31T18:35:10Z | 2026-07-31T19:21:53Z | 46m 43s |
| green | 2026-07-31T19:21:53Z | 2026-07-31T19:31:15Z | 9m 22s |
| review | 2026-07-31T19:31:15Z | 2026-07-31T20:13:12Z | 41m 57s |
| red | 2026-07-31T20:13:12Z | 2026-07-31T20:23:56Z | 10m 44s |
| green | 2026-07-31T20:23:56Z | 2026-07-31T20:35:45Z | 11m 49s |
| review | 2026-07-31T20:35:45Z | 2026-07-31T21:36:02Z | 1h |
| finish | 2026-07-31T21:36:02Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings.

### Reviewer (code review)

- **Gap** (non-blocking): `pf validate context-epic {N}` checks only that the file exists and is non-empty, never that its rendered `- **Repo:**` still matches the sprint YAML it was generated from. Combined with sm-setup Step 4b creating an epic context only "if the epic has no context document yet", a generated context is written once and then drifts permanently, passing its gate the whole time. Affects `.pennyfarthing/gates/sm-setup-exit.md` (the check would need a content comparison, or sm-setup would need to regenerate unconditionally as it already does for story contexts). This is the mechanism behind finding 1 and it is pf's, not arcade's — routed to the same upstream home as the other pf items, **filed as `td1-15`'s sibling: see finding 1's fix instruction for the local remediation, and `td1-16` for the upstream check.** *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the sweep necessarily discarded the multi-app signal that lists like `lobby,tempest,star-wars,asteroids,battlezone,red-baron,centipede` carried on td1/uf1 stories — with one repo registered there is nowhere in `repos:` to keep it, so this is forced by AC-1 rather than a Dev choice. No replacement field records which apps a story touches. Affects `sprint/epic-td1.yaml`, `sprint/epic-uf1.yaml`. Not filed as its own story: epic uf1's description already carries the standing note that its stories "were written against nine repos and name paths like star-wars/src/core/", so the surviving signal lives in the story prose and is **owned by that epic note**. *Found by Reviewer during code review.*

### TEA (test design)

- **Gap** (non-blocking): `pf sprint story add`/`update` emit a YAML complex key (`- ? … / : …`) for any acceptance criterion whose text contains `': '`, silently changing that criterion's parsed type from string to dict — `yaml.safe_load` returns an object, not prose. `mg1-14` is a live instance, created 2026-07-31 by the sibling checkout and arriving here with the mg1-2 merge. Same round-trip class as the SH-1 truncation, different trigger character. Affects pf's YAML writer (`': '` in a scalar needs quoting on emit, exactly as `' #'` does). **Owned by `td1-15`**, whose description already covers pf's YAML/`repos` handling and is routed upstream; noted here so mg1-4's local guard is not mistaken for the upstream fix. *Found by TEA during test design.*


### Dev (implementation)

- **Gap** (non-blocking): a guard can exist, be correct, and still never meet real data. `yamlRoundTripRisks` detected the SH-1 shape from the moment it was written, yet re-adding the archived SH-1 line to a live shard left the suite **green** — because every test exercising list items used a fixture, and the only test reading live files still carried the old inline key:value scan. The capability and the coverage are separate things, and the review's finding was about the second. Affects `tests/sprint-repo-routing.test.mjs` (the live AC-4 test now delegates to the helper). Worth carrying as a review habit rather than a story: when a finding is "this guard cannot fail", verify the fix by mutating **live** data, not by reading the new detector. *Found by Dev during implementation.*


### Reviewer (code review, round 2)

- **Improvement** (non-blocking): the "mutation battery" discipline this story invented is now the repo's most productive review tool — it found every real defect across both rounds, while re-reading found none. It has a blind spot worth naming: a mutation proves a guard fires on *bad input*, but never that it fires when there is *no input*. Both round-2 Mediums are absence bugs, and neither was reachable by mutating a value. Affects no file — this is a technique note for the next reviewer: mutate the value, then delete it. **Owned by `td1-17`**, whose fix is exactly that assertion. *Found by Reviewer during code review.*
- **Question** (non-blocking): `pf sprint story add` still defaults `--repos` to `pennyfarthing`, so every story filed without an explicit flag lands naming a repo this registry does not know. mg1-4's guard now catches it at CI, which is the mitigation this story owed, and I passed `--repos arcade` explicitly when filing `td1-16` and `td1-17`. The underlying default remains pf's. **Owned by `td1-15`**; noted only because two more stories were filed during this review and both needed the manual flag. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

No design deviations.

### Reviewer (audit)

Dev logged "None", and for the two decisions TEA left open (`.` vs `arcade`; archive in or out) that stamp is correct — both were resolved inside the latitude the tests deliberately allow.

- **`.` vs `arcade` (Dev, logged)** → ✓ ACCEPTED by Reviewer: agrees with author reasoning. `generate.py:53` does render the key unconditionally, so dropping the field really would produce a blank `- **Repo:** ` — I confirmed the render site. Choosing the registry key over its path is defensible and the guard accepts both.
- **Archive left as written, `ARCHIVE_SCANNED = false` (Dev, logged)** → ✓ ACCEPTED by Reviewer: AC-3 asks only that the choice be stated, and it is stated as a machine-read boolean with the prose beside it. The scope test genuinely binds the flag to the scanner in both directions — I mutated both sides. The reasoning also turns out to be load-bearing beyond the archive: every stale *story* context on disk belongs to a `done` story, which is the same category.

### TEA (test design)

- No deviations from spec. The four ACs are unchanged and every new test maps to one of them: AC-1/AC-2 gained the rendered artefact (`contextRepoViolations`, `guardedContextFiles`), AC-3's archive rule was applied to set that scope, and AC-4 gained the two round-trip shapes it named but did not cover.
  - Spec source: `sprint/epic-mg1.yaml`, mg1-4 AC-1 through AC-4
  - Spec text: "The pf toolchain still round-trips every touched sprint file."
  - Implementation: the round-trip scan moves from an inline regex in the test file into a `yamlRoundTripRisks` helper export, covering list items and complex keys as well as `key:` scalars
  - Rationale: the inline version could not fail on the incident it was named after; moving it into the helper makes it implementable by Dev and testable by fixture
  - Severity: none — widens coverage within the AC as written, changes no AC
  - Forward impact: none

### Reviewer (audit, cont.)

- **UNDOCUMENTED — the "end to end" demonstration is n=1.** Commit `fb4370d` is titled "regenerate mg1-4 context — the fix, demonstrated end to end" and the Dev Assessment concludes "End-to-end, the actual failure mode is gone." `fb4370d` changed exactly one line of one file (`sprint/context/context-story-mg1-4.md`). The sweep's derived artefacts were not regenerated: four live epics' context files still name retired repos, and `context-epic-mg1.md` — this story's own epic — still reads `- **Repo:** .` while `sprint/epic-mg1.yaml:7` now reads `arcade`. Generalising a proof from one file to a class is the deviation; the spec deviation it hides is that AC-1's scope was silently narrowed to the YAML after Dev's own commit had established the context files as in scope. Severity: **High**. Recorded as finding 1 below.

## Sm Assessment

**Routed here from a different ask.** The user opened /pf-work on **jt5-1** (joust audio seam, p2). Setup was not run on it. jt5-1 carries `repos: joust`, which is precisely the defect mg1-4 exists to fix, and setup is the step that bakes that field into a session artifact — so writing jt5-1's session first would have manufactured one more instance of the bug. User chose to take mg1-4 (p1) first. **jt5-1 is queued behind this story** and should be set up once the sweep lands, at which point its routing is correct by construction.

**Claim was not clean.** sm-setup created the session and context but left the story at `status: backlog`, reporting "no sprint YAML files were modified" as a success signal. SM ran `pf sprint story update mg1-4 --status in_progress` separately. Verified surgical against a pre-mutation copy: the only delta in `sprint/epic-mg1.yaml` is `status` plus an added `started: '2026-07-31'`, no other epic touched, and all ten sprint YAML files still parse under `yaml.safe_load`. Flagged because the same gap will recur on the next story setup.

**Which suite the guard belongs in — a routing call, not an implementation one.** AC-2's guard is a repo-wiring invariant (sprint YAML vs. `.pennyfarthing/repos.yaml`), not an app behaviour. Per CLAUDE.md the two suites do not overlap: vitest owns the apps' `*.test.ts`, and `npm run test:orchestrator` owns `tests/**/*.test.mjs` under `node:test`, which is where "a change to CI, the justfile, the deploy workflow or this file" is guarded. This guard is the second kind. TEA should not add it to a vitest project.

**Scope boundaries TEA should hold:**
- AC-2 says the guard must *read* the registry, not hardcode the valid set, or it becomes the next stale list. That is the story's own stated failure mode.
- AC-3 is a genuine decision, not a formality: `sprint/archive/` holds ~400 completed session files and archived epics full of pre-collapse `repos:` values. Migrating them and leaving them as historical record are both defensible; the AC requires the choice be *stated* so the next reader does not read it as an oversight. Whichever way it goes, the guard's scope must match it — a guard that reads `sprint/archive/` while the sweep deliberately skipped it will be red on arrival.
- AC-4 exists because this repo has already lost an epic's acceptance criteria to a pf YAML round-trip through an unquoted value containing `#`. Re-read each touched file after writing; do not trust the write.

**Environment as it stands:** trunk-based, work proceeds on `main`, no feature branch. Merge gate clear — no open PRs. `origin/main` is at `4d7083b`; the working tree is clean apart from this story's own artifacts. Orchestrator suite was green at 329/329 immediately before setup, so a red there during red-phase is this story's doing, not inherited.

**Handoff:** TEA (red phase). SM has read no implementation files and planned no sweep; the file-level shape of the change is TEA's and Dev's to determine.

## TEA Assessment

RED is committed in two commits: `d046ab9` (the AC tests) and `d2e484b` (the rule-checklist tests). One new file, `tests/sprint-repo-routing.test.mjs`, 10 tests. **Suite: 339 tests, 331 pass, 8 fail — all 8 are this story's.**

**The premise was verified, not assumed.** `pf` here is an *editable* install: `pf.__file__` resolves to `/Users/slabgorb/Projects/orc-penny/pennyfarthing/pennyfarthing-dist/src/pf`, so that checkout is what actually runs and is the authority. In it, `context/generate.py:53` reads `story.get("repos", "")` and renders `- **Repo:** {repos}` as prose; `core/resolver.py:42` only collects epic values into a list. Neither resolves a path or consults the registry. The story's claim that nothing crashes holds, which is exactly why a guard is the deliverable and not just a sweep.

**Two failures the sweep must not cause, green before it starts.** The AC-4 tests import nothing beyond `node:fs`, so they pass right now and are a regression guard rather than a target. Measured baseline: 9 epic shards, 80 stories, every one carrying `id` + `title`, no empty `acceptance_criteria` list, no unquoted ` #`. They are count-free on purpose — pinning "80 stories" would redden the next time anyone files one, so they assert *relationships* (every `- id:` block has a title; every `acceptance_criteria:` key has an item under it) that truncation breaks without moving any total.

**The tests were proven to fail on the data.** A throwaway implementation was written, run, and deleted, so RED is not merely "the module is missing". Against it, AC-1 reddened naming real offenders by file and line (`epic-ad1.yaml:7 -> star-wars, battlezone, asteroids, joust, red-baron`), and every fixture test went green — they are satisfiable, not impossible. `tests/helpers/` is back to just `link5-inputs.mjs`; confirm before green that no probe survives.

**That probe earned a test.** `an entry with no explicit path falls back to its name` failed against it, because locating the block with `text.indexOf('\nrepos:')` — the idiom `monorepo-topology.test.mjs` uses, where the committed file happens to open with `pr_title_format:` — returns `-1` when `repos:` is the first line, handing back an **empty** identifier set. Empty is the worst outcome available: every sprint value becomes a violation at once and the guard reddens at 89 innocent lines. Anchor on start-of-line.

### The contract Dev implements

`tests/helpers/sprint-repos.mjs`, four exports. Relocating it (e.g. to `scripts/` with a CLI, mirroring `gen-registry.mjs`) is fine as long as the imports resolve.

| Export | Contract |
|---|---|
| `registeredRepoIdentifiers(registryYamlText)` | → `Set`. Entry names under `repos:`, plus each entry's `path:`, defaulting to the name — mirroring `pf/git/repos.py::_parse_repo_entry` (`path=data.get("path", name)`). Must be a Set/Map, never `{}`. |
| `repoRoutingViolations(files, identifiers)` | `files` is `[{path, text}]` → `[{file, line, token}]`, 1-indexed lines. Splits comma lists, trims. A file with no `repos:` line yields none. |
| `guardedSprintFiles(root)` | → `[{path, text}]`, `text` decoded to a **string**. |
| `ARCHIVE_SCANNED` / `ARCHIVE_POLICY` | Boolean decision + prose explaining it (≥80 chars, mentions the archive). |

### Decisions Dev inherits rather than re-litigates

- **`.` is valid, and so is `arcade`.** `.` is the registered `path` of the one registered entry, and 23 active stories already use it. The test asserts the real registry yields exactly `['.', 'arcade']`. This deliberately leaves the sweep free to normalise everything to `arcade`, or to leave `.` alone — both pass.
- **Dropping the field is a valid fix.** AC-1 says "or the field is dropped where it no longer carries meaning", and with one repo registered that reading is defensible. A test pins that an absent `repos:` is *not* a violation, so the guard cannot quietly convert AC-1's "or" into an "and".
- **The archive is Dev's call, but it must be declared.** ~490 pre-collapse values live in `sprint/archive/`. Either answer passes; what fails is leaving it ambiguous, or letting the declared flag disagree with what the guard actually scans.
- **No new dependency.** There is no YAML parser in `node_modules` and none was added. Adding one — or shelling out to `python3`/PyYAML — would re-run the bug this repo fixed two commits ago in `971c966`, where the suite assumed a binary the runner never had. Everything is text-and-regex, the house idiom.

### Rule Coverage — `.pennyfarthing/gates/lang-review/javascript.md`

No `.claude/rules/` or `SOUL.md` exists in this repo; the JavaScript checklist is the whole rubric. Applicable checks and where each is covered:

| # | Check | Coverage |
|---|---|---|
| 3 | Prototype pollution | **Test:** `inherited Object keys are not mistaken for registered repos` — `constructor`/`__proto__`/`toString`/`hasOwnProperty` rejected, and one asserted as a reported violation. Forces Set/Map over `{}`. |
| 6 | Node.js — `readFileSync` without encoding | **Test:** per-file `typeof f.text === 'string'` in the AC-3 test. A Buffer matches no anchored regex → zero violations → false green. |
| 4 | Equality / coercion | `node:assert/strict` throughout; no `==`, no truthiness checks on counts. |
| 8 | Test quality | Phase C self-check run: no `assert.ok(x)` without a message or a specific claim, no `.only`/`.skip`, no mocks, no vacuous `let _ =`. AC-1's assertion was *observed* failing on real data. |
| 9 | Module and scope | `const` only; no `var`; helper is import-side-effect-free. |
| 1, 10 | Silent errors / error handling | **Dev must carry:** a missing or malformed `.pennyfarthing/repos.yaml` must throw an `Error` with a message, never return an empty Set — see the empty-set trap above, which is this check's exact failure shape. Not directly testable without inventing a fixture path; called out here instead of faked. |
| 7 | Regex safety | No user input reaches `new RegExp()`. **Dev must carry:** do not use a `/g` regex with `.test()` in a loop — `lastIndex` is stateful and yields alternating results. |
| 2, 5, 11, 12 | Async / DOM / input validation / dependency hygiene | Not applicable — synchronous, no DOM, no external input, no dependency added. |
| 13 | Fix-introduced regressions | Dev's, after green. |

### Delivery Findings

- **Gap, non-blocking, upstream (pf 13.4.0).** `pf/core/resolver.py:42` does `for repo in epic.get("repos", [])`. Every epic in this repo stores `repos` as a comma-separated **string**, and iterating a string in Python yields characters — so `_collect_repos` on `repos: joust` produces `['j','o','u','s','t']`, not `['joust']`. It is latent here because the code path is only reached through a `sprint/sprints.yaml` registry entry, which this repo does not use. Outside mg1-4's file list and not fixed in passing; it is a pf bug, not an arcade one. **Filed as `td1-15`** (2pts, p3, bug) with the full reasoning in its description, to be routed upstream to pennyfarthing rather than patched in a vendored copy.

  Two things fell out of filing it. First, `pf sprint story add` defaults to `--repos pennyfarthing` — itself a repo this registry does not know — so every story filed without an explicit `--repos` lands pre-broken. That is precisely AC-2's "cannot silently reappear as new stories are filed", and it means the guard will earn its keep immediately rather than eventually. Second, the two AC-4 regression guards were run against the real `pf sprint story add` and `update` writes that filed `td1-15`, and stayed green while the diff stayed surgical — so they have now been exercised against an actual pf YAML round-trip, not just asserted to work.

**Handoff:** Dev (green phase).

## Dev Assessment

GREEN. **339/339 orchestrator · 10413 vitest (698 files) · `tsc --noEmit` clean.** Two commits: `1669634` (helper + sweep) and `fb4370d` (context regeneration).

**What shipped.** `tests/helpers/sprint-repos.mjs` with the four contracted exports, and 90 `repos:` lines across 9 epic shards rewritten to `arcade`.

**`arcade`, not `.`** — though the guard accepts both, so this was a choice and not a constraint. It is the registry *key*, which makes it the only value that would resolve correctly if anything ever did resolve the field, and `- **Repo:** arcade` tells an agent something that `- **Repo:** .` does not. Dropping the field was AC-1's other permitted reading and was rejected on evidence: `generate.py` renders the key unconditionally, so a dropped field becomes a blank `- **Repo:** ` in every generated context — trading a wrong answer for no answer.

**The sweep method was itself a risk decision.** `pf sprint story update --repos` round-trips *all* epic YAML on every call, so 80 stories would have meant 80 full rewrites of all nine shards — the maximum possible exposure to the truncation AC-4 exists to prevent. A line-targeted rewrite touches only `repos:` lines. Verified after: the only changed lines are `repos:` lines, and every file's line count is unchanged.

**AC-4 is proven, not asserted.** A real `pf sprint story update` was run against the swept files and all nine shards came back **byte-identical**, so the toolchain still round-trips them faithfully. All ten sprint YAMLs parse. TEA's two AC-4 regression guards stayed green throughout, including across the earlier real pf writes that filed `td1-15`.

**The guard was mutation-tested, because one that cannot fail is decoration.**

| Mutation | Result |
|---|---|
| `repos: centipede` — a retired name returning via copy-paste | ✖ `sprint/epic-cp5.yaml:15 -> centipede` |
| `repos: pennyfarthing` — pf's own `story add` default | ✖ `sprint/epic-cp5.yaml:15 -> pennyfarthing` |

Both reverted byte-identically afterwards. The second is the live one: `pf sprint story add` defaults to `--repos pennyfarthing`, so any story filed without an explicit `--repos` lands pre-broken and CI now catches it — AC-2's "cannot silently reappear as new stories are filed", demonstrated rather than hoped for.

**AC-3 — the archive is left as written**, declared by `ARCHIVE_SCANNED = false` with the reasoning in `ARCHIVE_POLICY`. Its ~490 values were accurate when filed; no agent is ever routed from a completed story; rewriting them would correct no routing while making the record claim a topology that did not exist at the time. That is the same rule CLAUDE.md applies to the nine archived GitHub repos — archived, never deleted.

**End-to-end, the actual failure mode is gone.** The defect was never the YAML value but what pf renders *from* it. Regenerating mg1-4's context turned `- **Repo:** .` into `- **Repo:** arcade`, diffed to that one line. And **jt5-1 — the story this session originally opened on — now reports `arcade`**, so it can be set up without manufacturing another instance of the bug.

**No new dependency.** There is still no YAML parser in `node_modules`; the helper is text-and-regex, the house idiom. Adding one, or shelling out to `python3`/PyYAML, would have re-run the failure fixed in `971c966`, where the suite assumed a binary the runner never had.

### Design Deviations

None. The four exports match TEA's contract exactly, and both decisions TEA left open (`.` vs `arcade`; archive in or out of scope) were resolved within the latitude the tests deliberately allow.

### Delivery Findings

- **Improvement, non-blocking, upstream (pf 13.4.0).** `pf sprint story add` defaults to `--repos pennyfarthing` — a repo no arcade checkout registers. It is now caught by the guard on the next CI run rather than silently, which is the mitigation this story owed. The underlying default is pf's, so it belongs with the other upstream item in **`td1-15`** rather than in a new story; noted here so the fix is not mistaken for a local one.

**Handoff:** Reviewer.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 339/339 orchestrator, `tsc --noEmit` clean, 10/10 sprint YAML parse, zero stray `repos:` values outside the archive, no leftover probe files in `tests/helpers/` |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed directly by Reviewer (findings 1, 3, 5) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed directly by Reviewer (finding 3; see [SILENT] in assessment) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed directly by Reviewer (findings 2, 6) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed directly by Reviewer (finding 2's false claim; see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain assessed directly by Reviewer (see [TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain assessed directly by Reviewer (see [SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain assessed directly by Reviewer (finding 4) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — full `javascript.md` enumeration performed directly by Reviewer, below |

**All received:** Yes (1 enabled specialist returned; 8 disabled via `workflow.reviewer_subagents` and assessed directly)
**Total findings:** 6 confirmed, 0 dismissed, 0 deferred

Because eight of nine specialists are disabled, this review was conducted as a **mutation battery** rather than a re-read — a guard that cannot fail is decoration, and re-reading cannot tell the difference. Eleven mutations were applied to real source and every one reverted byte-identically (`git diff --quiet` verified after each).

| # | Mutation | Expected | Result |
|---|---|---|---|
| A | `repos: centipede` at `epic-cp5.yaml:7` | red | ✔ red — `sprint/epic-cp5.yaml:7 -> centipede`, named by file and line |
| B | every `title:` deleted from a shard | red | ✔ red — story-shape guard fires |
| C | every `acceptance_criteria` item deleted | red | ✔ red — story-shape guard fires |
| D | **verbatim SH-1 line re-added as an unquoted AC item** | red | ✖ **GREEN, 10/10** — finding 2 |
| E | `repos:` as a YAML block sequence | red | ✖ **zero violations** — finding 3 |
| F | `repos: [joust, star-wars]` (flow seq) | red | ✔ red (tokens mangled to `[joust`/`star-wars]`, but fails loud) |
| G | `repos: joust` inside a block-scalar `description:` | green | ✖ false positive — finding 5 |
| H | `repos: arcade # the one repo` | green | ✖ false positive, token `arcade # the one repo` — finding 5 |
| I | registry re-indented to 4 spaces | throw, not empty | ✔ throws `the repos: block registered no entries` — fails closed |
| J | entry *with* explicit `path:` | name still present | ✔ present — proves `explicitPath` is inert, finding 4 |
| K | two real `pf sprint story add` + `update` writes (filing td1-16) | 9 shards byte-identical | ✔ only `epic-td1.yaml` changed; 339/339 stayed green |

Mutation A initially appeared to pass; that was a BSD `sed` no-op on my part, not a guard miss. Re-run with a verified-applied mutation, it fails correctly. Recorded because the first result was wrong and the correction matters more than the conclusion.

### Rule Compliance — `.pennyfarthing/gates/lang-review/javascript.md`

No `.claude/rules/` and no `SOUL.md` exist in this repo; the JavaScript checklist is the entire rubric. Two new `.mjs` files are in scope: `tests/helpers/sprint-repos.mjs` (4 exports) and `tests/sprint-repo-routing.test.mjs` (10 tests). Every rule enumerated against every function, not one exemplar per rule.

| # | Check | Every instance judged | Verdict |
|---|---|---|---|
| 1 | Silent error swallowing | No `try`/`catch` anywhere in either file; no `.catch()`; no `JSON.parse`. `registeredRepoIdentifiers` throws on all three failure modes (non-string/empty `:46`, no `repos:` key `:55`, zero entries `:90`). `readFileSync`/`readdirSync` in `guardedSprintFiles:134-137` throw naturally. TEA's explicit carry-forward ("must throw, never return an empty Set") is **honoured** — mutation I proves it. | **Compliant** |
| 2 | Promise / async pitfalls | Helper is fully synchronous. Test file: 8 `async` tests each `await helper()`; 2 sync tests correctly declared non-`async`. No floating promises, no `forEach` with an async callback (both `forEach` callbacks — `:110` helper, `:260`/`:298` test — are synchronous). | **Compliant** |
| 3 | Prototype pollution | `identifiers` is a `Set` (`:59`), membership via `.has()` (`:115`), never bracket access on YAML-derived text. `violations` is an array. No `Object.assign`, no spread into a lookup. Directly tested at `:170-193`. | **Compliant** |
| 4 | Equality / coercion | Every comparison enumerated: `:46` `typeof !== 'string'` (+ explicit `.trim() === ''`, not a truthy check), `:55` `start === -1`, `:65`/`:83` `current !== null`, `:90` `identifiers.size === 0` (numeric, not truthy), `:115` `token !== ''`. No `==`/`!=`. Tests use `node:assert/strict`. | **Compliant** |
| 5 | DOM / browser security | Not applicable — Node-only test tooling, no DOM, no `innerHTML`, no `eval`. | **N/A** |
| 6 | Node.js specific | `readFileSync(join(dir, f), 'utf8')` at `:137` — encoding present, the exact rule. No `child_process`, no variable `require()`, no `process.env`. The Buffer failure mode is additionally pinned by a test (`:229-231`), which is the right shape: a Buffer matches no anchored regex, so the guard would report zero violations and read as a clean pass. | **Compliant** |
| 7 | Regex safety | All 13 regexes enumerated. Anchored: `:54` `/^repos:\s*$/`, `:71` `/^\s*(#.*)?$/`, `:72` `/^\S/`, `:74` `/^ {2}([A-Za-z0-9._\-/]+):\s*$/`, `:82` `/^ {4}path:\s*(.+?)\s*$/`, `:111` `/^\s*repos:\s*(.*)$/`, `:135` `/^epic-.*\.yaml$/`; test-side `:261`, `:271`, `:275`, `:277`, `:295`. Two deliberately unanchored because they are searches, not validators: `:299` `/\s#/`, `:210` `/archive/i`. **No `/g` flag on any regex used with `.test()`** — TEA's second carry-forward, honoured. No user input reaches `new RegExp()`; no nested quantifiers, so no ReDoS. | **Compliant** |
| 8 | Test quality | No `.only`/`.skip`, no mocks, no spies, no snapshots. Every `assert.ok` carries a message. **One violation:** `:132-135` asserts `identifiers.size > 0` immediately after `:131` asserts `identifiers.has('solo')` — membership already implies size ≥ 1, so the second assertion cannot fail if the first passed. Vacuous under this check. Finding 6. **Second violation:** test at `:287` cannot fail on the case its own name claims. Finding 2. | **2 violations** |
| 9 | Module and scope | `const` throughout; no `var`; no `let` reassignment bugs (`current`/`explicitPath` at `:60-61` are intentional loop state). Module scope evaluates only two literal `export const`s — no I/O at import, so import order cannot matter. No circular dependency: the helper imports only `node:fs`/`node:path`. | **Compliant** |
| 10 | Error handling patterns | Three `new Error(...)`, all with specific messages naming the failed precondition (`:47`, `:56`, `:91`). No thrown strings, no bare `new Error()`, no `catch (e) { throw e }`, no custom subclasses. | **Compliant** |
| 11 | Input validation | `registeredRepoIdentifiers` validates its argument's type and emptiness (`:46`). `repoRoutingViolations` validates neither argument — but both failure shapes throw loudly (`identifiers.has` is not a function; `text.split` of `undefined`), so nothing passes silently. `guardedSprintFiles(root)` does `join(root, 'sprint')` with no `resolve()` + prefix check; the rule scopes itself to "API handlers, middleware, and user-facing functions", and `root` is a caller-side constant (`resolve(import.meta.dirname, '..')` at test `:40`), never external input. **Downgraded to Low, not dismissed**, per the rule's own scoping text. | **Compliant (scoped out)** |
| 12 | Dependency / config hygiene | No `console.log` in either file. No secrets. **No dependency added** — the house text-and-regex idiom preserved, avoiding a repeat of the `971c966` failure where the suite assumed a binary the runner lacked. `engines` (Node ≥ 22.18) already present in `package.json`. | **Compliant** |
| 13 | Fix-introduced regressions | The sweep is the fix, so it is re-scanned here. Verified independently of Dev's claim: `git diff 4d7083b..HEAD -- 'sprint/epic-*.yaml'` filtered of `repos:` lines leaves **only** the mg1-4 status/started fields and the added td1-15 story. Line counts unchanged in 7 of 9 shards; the 2 that differ are exactly the 2 that gained a story. No collateral edits. | **Compliant** |

### Devil's Advocate

Argue this is broken. Start with the strongest case, which is that **this story fixed the representation and left the artefact**. The defect as filed is not "a YAML file contains the string joust" — nobody reads the YAML. It is, in the story's own words, that "every future story setup hands the agent a context file telling it to work in a repo that does not exist." That sentence describes `sprint/context/context-epic-*.md`, and four of those files still say `joust`, `star-wars`, an eight-name list and a five-name list, today, after the sweep. Thirty open stories sit behind them. So a reviewer who approves this approves a story whose acceptance criteria are satisfiable by reading only the inputs of the machine, never its outputs — and the Dev Assessment's own phrase, "End-to-end, the actual failure mode is gone," is the tell: it is a claim about a class, evidenced by one file. That is precisely the failure shape this repo has been bitten by before, where the arithmetic gets tested and the claims about it do not.

What would a confused user misunderstand? An agent starting jt8-3 tomorrow. It is handed `context-epic-jt8.md`, reads `- **Repo:** joust`, and looks for a `joust/` directory at the repo root. There is none — it moved to `plugins/joust/`. Nothing throws. The agent either guesses correctly, wasting a step, or guesses wrong and edits something adjacent. The gate that was supposed to protect it, `epic-context-validated`, checked that the file was non-empty and waved it through. A stale artefact behind a green gate is worse than a missing one, because the missing one gets regenerated.

What would a malicious user do? Very little — there is no untrusted input here, the helper reads two repo-local files and no network. But a *careless* one has a live path: file a story with `pf sprint story add` and omit `--repos`, which defaults to `pennyfarthing`. That is caught, and I verified it by filing td1-16 deliberately with the explicit value. Then convert the field to a YAML list, which is the shape `resolver.py:42` already expects and the natural fix for td1-15 — and every violation becomes invisible, because the guard's regex captures the empty remainder of a `repos:` line and skips empty tokens. The guard that exists to stop silent reappearance has a silent-reappearance mode.

What would a stressed filesystem produce? Better answers than average. A missing `sprint/` throws from `readdirSync`; an unreadable shard throws from `readFileSync`; a registry with unexpected indentation throws rather than returning an empty set, which is the one outcome that would have reddened all 89 innocent lines at once. TEA identified that trap and the helper closes it. Credit where due.

And if config has unexpected fields? A trailing YAML comment on a `repos:` value produces the violation token `arcade # the one repo` — noise, but loud noise, and the AC-4 guard flags the same line independently. The block-scalar false positive is the sharper one: epic-td1's own td1-15 description quotes pf source about repos and escapes only because it renders as `"repos": [` with a leading quote. That is a near-miss, not a design.

The honest summary: the sweep is correct and surgical, the AC-1/AC-2 guard genuinely fires and names its offenders, and two of the four ACs are demonstrably met. AC-4's regression guard is half-real — it catches truncation by shape but not by the exact quoting bug it is named after. AC-1 is met in the YAML and unmet in the generated artefact. That is one blocking finding, not a rewrite.

## Reviewer Assessment

**Verdict:** REJECTED

The sweep itself is good work — surgical, independently verified, and the AC-1/AC-2 guard is real, wired into both `just ci` and `.github/workflows/deploy.yml:184`, and fires with file-and-line precision under mutation. One blocking finding: the story's actual user-visible failure mode is still live in four epics, and the guard's AC-4 companion cannot fail on the case it is named after.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] `[EDGE]` | **The sweep corrected the YAML but not the artefact generated from it.** `context-epic-jt8.md` → `joust`, `context-epic-sw8.md` → `star-wars`, `context-epic-td1.md` → `lobby,tempest,star-wars,asteroids,battlezone,red-baron,centipede,joust`, `context-epic-uf1.md` → `red-baron,joust,star-wars,lobby,.`. Those four epics hold **30 open stories**. sm-setup Step 4b regenerates a story context unconditionally but an epic context only "if the epic has no context document yet", and `epic-context-validated` checks existence only — so these never self-heal. This is verbatim the failure the story exists to remove. Also `context-epic-mg1.md` still reads `.` while `sprint/epic-mg1.yaml:7` reads `arcade` — this story's own epic. | `sprint/context/context-epic-{jt8,sw8,td1,uf1,mg1}.md` | Run `pf context create epic <id>` for jt8, sw8, td1, uf1 and mg1, and commit the five regenerated files. Then re-read them to confirm each `- **Repo:**` line reads `arcade`. Upstream prevention is filed as `td1-16`. |
| [MEDIUM] `[TEST]` `[DOC]` | **`no sprint scalar carries an unquoted ' #' — the exact shape that truncated epic-SH` cannot fail on that shape.** The regex at `:295` matches only `id\|title\|repos\|workflow\|status\|priority\|description` key–value lines. The SH-1 line that was actually truncated is an **acceptance_criteria list item** — `sprint/archive/epic-SH.yaml` preserves the fix as `- 'The dev inner-loop path (npm link or a #branch ref) is documented in the shared repo README.'`, single-quoted by SH-3 on 2026-07-07. Mutation D re-added that exact line unquoted to a live shard: **10/10 green.** The test name and its `:287-291` comment both assert coverage the code does not provide. | `tests/sprint-repo-routing.test.mjs:287-307` | Extend the scan to list items (`/^\s*- (.*)$/`) as well as `key:` lines, so the SH-1 line reddens. Re-run mutation D to confirm it now fails. If list items are deliberately excluded, the test name and comment must stop claiming otherwise. |
| [MEDIUM] `[EDGE]` `[SILENT]` | **A block-sequence `repos:` is invisible to the guard.** `repos:` followed by `  - joust` yields **zero** violations: `:111` captures the empty remainder, and `:115` skips empty tokens. That is the shape `pf/core/resolver.py:42` already expects (`epic.get("repos", [])` defaults to a list), and normalising to a list is the natural fix for `td1-15` — which this story filed. AC-2 exists so this "cannot silently reappear"; in that form it reappears silently and permanently. | `tests/helpers/sprint-repos.mjs:107-122` | Either parse block-sequence items under a `repos:` key as tokens, or make a `repos:` key with an empty scalar an explicit violation so the list form fails loud. Add a test for the list form. |
| [LOW] `[SIMPLE]` | **`explicitPath` is inert.** `identifiers.add(current)` at `:78` runs unconditionally for every entry, so `closeEntry`'s `if (current !== null && !explicitPath)` at `:65` can never change the Set; the flag, its assignment at `:85` and the conditional are all no-ops. The comment at `:64` concedes it — "which is already added". Mutation J confirms an entry with an explicit `path:` still yields its name. It reads as load-bearing to the next maintainer. | `tests/helpers/sprint-repos.mjs:60-68, 85` | Delete `explicitPath` and reduce `closeEntry` to `current = null`, or drop it entirely. Behaviour must not change — re-run mutation J. |
| [LOW] `[EDGE]` | **Two false-positive shapes.** A `repos: joust` line inside a block-scalar `description:` is reported as a violation (mutation G), and a trailing YAML comment yields the token `arcade # the one repo` (mutation H). Both fail loud rather than silent, so neither is a hole — but epic-td1's td1-15 description already quotes pf source about repos and escapes only because it renders as `"repos": [`. A near-miss, not a design. | `tests/helpers/sprint-repos.mjs:111-113` | Optional. Strip a trailing ` #…` comment before splitting; consider requiring the `repos:` key at a YAML-plausible indent. Acceptable to accept as-is with a comment noting the limit. |
| [LOW] `[TEST]` | **Vacuous assertion.** `:132-135` asserts `identifiers.size > 0` directly after `:131` asserts `identifiers.has('solo')`; membership implies size ≥ 1, so it cannot fail independently. `javascript.md` check #8. The intent (guarding the empty-set trap) is real and worth keeping — but it is already covered by mutation I, which shows the helper throws rather than returning empty. | `tests/sprint-repo-routing.test.mjs:132-135` | Either drop it or move it to a case where an empty set is actually reachable. |

**Verified good — with evidence, and checked against the rules that govern each:**

- `[VERIFIED]` `[SEC]` **No injection surface anywhere in the diff.** Enumerated against `javascript.md` #6 and #11: no `child_process`, no variable `require()`, no `new RegExp()` built from file text, no `process.env`, no network. `guardedSprintFiles:132` takes `root` from `resolve(import.meta.dirname, '..')` (test `:40`), a caller-side constant, so the unresolved `join` is not a traversal vector under the rule's own "API handlers, middleware, and user-facing functions" scoping. Rule #11 checked and scoped out, not dismissed.
- `[VERIFIED]` `[TYPE]` **`identifiers` is a `Set`, and that is enforced rather than assumed** — `tests/helpers/sprint-repos.mjs:59` constructs `new Set()`, `:115` queries `.has()`, and `tests/sprint-repo-routing.test.mjs:170-192` rejects `constructor`/`__proto__`/`toString`/`hasOwnProperty` *and* asserts a repo named `constructor` is reported as a violation. Complies with `javascript.md` #3, which requires `Map`/`Object.create(null)` for user-keyed lookups. A plain `{}` fails that test.
- `[VERIFIED]` `[SILENT]` **The empty-set trap is closed by throwing, not by defaulting** — `:90-92` throws when the block registers nothing, and mutation I (registry re-indented to 4 spaces) produced `the repos: block registered no entries` rather than a silent empty set. This is TEA's explicit carry-forward for `javascript.md` #1/#10 and it was honoured; the failure is loud and closed, which is the correct direction.
- `[VERIFIED]` `[RULE]` **The guard runs where it must.** `package.json:15` defines `test:orchestrator` as `node --test 'tests/**/*.test.mjs'`; `justfile:159` includes it in `ci`; `.github/workflows/deploy.yml:184` runs it before every build and upload. AC-2's "a guard fails" is genuinely wired to the deploy path, not merely to a local command. Matches CLAUDE.md's rule that orchestrator-suite invariants — not vitest — guard CI and workflow wiring.
- `[VERIFIED]` **AC-4's toolchain round-trip holds under a real, independent exercise.** Not taken on Dev's word: filing `td1-16` ran a real `pf sprint story add` plus a real `pf sprint story update --description`, and of the ten sprint YAMLs **only `epic-td1.yaml` changed** (mutation K). All ten still parse; 339/339 stayed green. Two live pf writes, nine shards byte-identical.
- `[VERIFIED]` **The sweep is surgical.** `git diff 4d7083b..HEAD -- 'sprint/epic-*.yaml'`, filtered of `repos:` lines, leaves only mg1-4's own `status`/`started` fields and the added td1-15 story. Seven of nine shards have identical line counts; the two that differ each gained exactly one story.

**Data flow traced:** `.pennyfarthing/repos.yaml` (text) → `registeredRepoIdentifiers` → `Set{'arcade','.'}` → `repoRoutingViolations(guardedSprintFiles(repo), identifiers)` → `[{file,line,token}]` → `assert.deepEqual(…, [])` with the offenders rendered into the failure message. Safe because every step is anchored-regex over decoded strings with a `Set` for membership, and every failure mode on the registry side throws instead of degrading to empty. **The flow ends at the YAML and never reaches `sprint/context/*.md`, which is finding 1** — the guard cannot see the artefact that actually misroutes an agent.

**Pattern observed:** the mutation-first discipline in the Dev Assessment is the right instinct and I extended it rather than replaced it — but it was applied to the guard and not to the guard's *claims*. Mutation D is the whole lesson: `tests/sprint-repo-routing.test.mjs:287` names a historical incident it does not cover, and only a mutation carrying that incident's literal text could reveal it.

**Error handling:** three throws with specific messages at `tests/helpers/sprint-repos.mjs:47`, `:56`, `:91`; no `try`/`catch` and no silent fallback anywhere in either file; `readFileSync`/`readdirSync` at `:134-137` propagate. Null/empty inputs to `registeredRepoIdentifiers` are rejected at `:46`; the unvalidated arguments to `repoRoutingViolations` fail loudly with a `TypeError` rather than passing.

**Handoff:** Back to Mr. Praline (TEA) for the red phase. Findings 2, 3 and 6 are test-shaped — a guard that cannot fail on its named case needs a failing test before a fix. Finding 1 is mechanical (correct five epic contexts) and finding 4 is a deletion; both can land in the green phase that follows.

### Addendum (Reviewer) — a sibling checkout landed 13 commits mid-review

Discovered at exit, not at setup: `origin/main` and this branch have **diverged 13 / 7**. A sibling checkout took **mg1-2** (the multi-app dev server — the story CLAUDE.md tracks as the fix that will redden `the dev server serves the LOBBY at every path`) and landed it while this story was in review. This does not race mg1-4's deliverable — I checked, and `origin/main`'s sprint YAML is entirely **un-swept** (29 `star-wars`, 20 `joust`, 24 `.`, plus every multi-name list). Nobody else did the sweep. But three things follow that TEA and Dev must not discover the hard way:

1. **The merge will resurrect ~90 un-swept `repos:` lines** into the same nine shards this story rewrote, so every one is a content conflict. **Resolve every `repos:` conflict to `arcade`.** The new guard will redden on any line resolved to the origin side — which is the guard working, not a regression, but it will look like one at 89 lines.
2. **My finding-1 fix instruction is now wrong as written, and this correction is the point of the addendum.** Origin carries `6e5d940 chore(sprint): epic mg1 context — the migration tail's cross-story guardrails`, an *enriched* epic context. `pf context create epic mg1` overwrites an enriched context with a regenerated stub — a known trap in this repo. So do **not** regenerate `context-epic-mg1.md`. Edit the `- **Repo:**` line in place instead, and check each of jt8/sw8/td1/uf1 for enrichment before regenerating those too.
3. **Origin's `context-epic-mg1.md` still reads `- **Repo:** .`** — the sibling enriched the prose and left the metadata line untouched. Finding 1 stands in full; it is not partly fixed upstream.

The process lesson is mine to wear: I fetched at review, not at setup, so this surfaced at the exit sequence rather than at the start. The standing rule in this repo is to fetch and grep origin for the story id **before setup and again at review** — I did the second half only.
## TEA Assessment (round 2 — rework RED)

**Tests Required:** Yes
**Test Files:** `tests/sprint-repo-routing.test.mjs` (extended, +7 tests → 17)
**Tests Written:** 7 new, 1 vacuous assertion replaced
**Status:** RED — **352 orchestrator tests, 345 pass, 7 fail, all 7 this rework's.** `tsc --noEmit` clean.

**The merge came first, and it was smaller than feared.** The Reviewer's addendum warned that merging `origin/main` would resurrect ~90 un-swept `repos:` lines as conflicts. It did not: the sibling touched **two** files this story also touched, not nine. The other eight shards were ours alone and merged clean, so the sweep survived intact — every live `repos:` value is `arcade` except their new `mg1-14`, which carries `.` and is legitimately registered. Resolution was union on `sprint/epic-mg1.yaml` (their mg1-2 completion + our swept value) and **theirs wholesale** on `context-epic-mg1.md` — ours was an 18-line setup stub, theirs 68 lines of real epic guardrails. Regenerating it would have destroyed that, which is precisely the clobber the Reviewer flagged. 345/345 green on the merged tree before a single new test was written, so the RED below is this rework's and nothing else's.

**The merge also handed us a live instance of AC-4's own failure mode.** `mg1-14`'s fourth acceptance criterion contains a `': '`, and pf's YAML writer emitted it as an explicit complex mapping key (`- ? …` / `: …`). `yaml.safe_load` parses that criterion as a **dict, not a string** — the text survived, the type did not. This is the AC-4 class ("the pf toolchain still round-trips every touched sprint file") caught in the act, in a file this story touched, and the existing story-shape guard waves it through because `- ? A test covers` still matches `/^ {6}- \S/` — the `?` is a non-space character. It is the only such offender in the tree, at `sprint/epic-mg1.yaml:186`.

**Both directions were proven, not asserted.** The Reviewer's central lesson was that a guard which cannot fail on its named case is decoration, so these tests were run against two throwaway implementations and both were deleted (`tests/helpers/` is back to `link5-inputs.mjs` + `sprint-repos.mjs`; the helper restored byte-identical, verified with `git diff --quiet`):

| Probe | Result | What it proves |
|---|---|---|
| **Naive** — quote-blind `#` scan, archive-blind context scan, no complex-key handling | **all 7 still fail** | They discriminate on *behaviour*, not on a missing symbol. Three of the seven fail with a bare `TypeError` before any implementation exists; that is not evidence of anything, and this probe is what converts them. |
| **Correct** — block-seq + empty handling, quote-aware, live-scoped | **15 of 17 pass, 2 fail** | The fixture tests are *satisfiable*, not impossible. The 2 still red are exactly the two that assert on **live data**, which is the honest split: the guard logic is achievable, the data debt is real and Dev must fix it. |

### The contract Dev implements

All four exports live in `tests/helpers/sprint-repos.mjs` beside the existing ones. One extension, three additions.

| Export | Contract |
|---|---|
| `repoRoutingViolations(files, identifiers)` | **EXTENDED.** A `repos:` key with an empty scalar must no longer yield nothing. Read the block-sequence items beneath it (`  - joust`) and report each unregistered token **at its own line**. A `repos:` key with neither a scalar nor any items is itself a violation, reported as `token: ''` at the key's line. The existing comma-split scalar path is unchanged and still tested. |
| `yamlRoundTripRisks(files)` | **NEW** → `[{file, line, kind, text}]`, 1-indexed. `kind: 'unquoted-hash'` for any unquoted `key:` value **or list item** containing ` #`; a value opening with `'` or `"` is safe and must not be reported. `kind: 'complex-key'` for a list item written as `- ? …`, reported at the line that opens it. This subsumes the inline scan the old AC-4 test carried. |
| `guardedContextFiles(root)` | **NEW** → `[{path, text}]`, `text` a decoded **string** (a Buffer matches no anchored regex and would read as a clean pass — javascript.md #6). Live scope only: `context-epic-<id>.md` where that epic has ≥1 non-`done` story, and `context-story-<id>.md` where that story is non-`done`. This is ARCHIVE_POLICY's rule applied, not restated. |
| `contextRepoViolations(files, identifiers)` | **NEW** → `[{file, line, token}]`. Scans the rendered `- **Repo:** <value>` prose line, comma-split and trimmed, same token rules as the YAML scan. |

### Decisions Dev inherits rather than re-litigates

- **The archive rule decides the context scope, and it was applied rather than assumed.** ~30 story contexts on disk belong to `done` stories and carry pre-collapse names; none belongs to an open story. So live-scoping costs no coverage and rewriting them would falsify the record — the same reasoning `ARCHIVE_POLICY` already makes for `sprint/archive/`. Two assertions pin both edges: `context-story-sw8-11.md` (done) must **not** be scanned, `context-epic-jt8.md` (4 open stories) **must** be.
- **The remaining RED is data, and only Dev can clear it.** Four epic contexts — `jt8 -> joust`, `sw8 -> star-wars`, `td1 -> ` an eight-name list, `uf1 -> ` a four-name list — plus the one complex-key AC at `sprint/epic-mg1.yaml:186`. **Do not run `pf context create epic <id>` on mg1**: origin's enriched 68-line context would be regenerated into a stub. Edit the `- **Repo:**` line in place. Check the other four for enrichment before regenerating those either.
- **`.` stays valid.** Their `mg1-14` carries `repos: .`, which is arcade's registered path. The guard accepts it and no test demands normalisation, so leave it or sweep it — both pass.
- **Still no new dependency.** The complex-key detection is a text shape (`/^ {6}- \? /`), not a YAML parse. Adding a parser here would re-run the failure fixed in `971c966`.

### Rule Coverage — `.pennyfarthing/gates/lang-review/javascript.md`

| # | Check | Test | Status |
|---|---|---|---|
| 6 | `readFileSync` without encoding | `context scope follows the archive rule` — per-file `typeof f.text === 'string'` | failing |
| 7 | Anchored validation regexes | `a repos key with neither a scalar nor list items is itself a violation` — an unanchored value scan cannot distinguish an empty key from an absent one | failing |
| 8 | Test quality — vacuous assertions | `an entry with no explicit path falls back to its name` — `identifiers.size > 0` could not fail after `.has('solo')`; replaced with the `assert.throws` it was reaching for | **fixed, passing** |
| 1, 10 | Silent errors / error handling | Same test's `assert.throws(/registered no entries/)` — an unparseable registry must throw, never degrade to an empty Set | passing |
| 4 | Equality / coercion | `node:assert/strict` throughout; `deepEqual` on shapes, no truthiness on counts | passing |
| 9 | Module and scope | `const` only; helper remains import-side-effect-free | passing |
| 13 | Fix-introduced regressions | `a scalar field with an unquoted # is still caught` — exists so widening the scan to list items cannot silently drop the coverage it already had | failing |

**Rules checked:** 7 of 7 applicable · **Self-check:** 1 vacuous assertion found and replaced; 0 remain (no `.only`/`.skip`, no mocks, every `assert.ok` carries a message)

### Delivery Findings

- **Gap** (non-blocking): `pf sprint story add`/`update` emit a YAML complex key (`- ? … / : …`) for any acceptance criterion whose text contains `': '`, silently changing that criterion's parsed type from string to dict. `mg1-14` is a live instance created 2026-07-31. This is the same round-trip class as the SH-1 truncation and belongs beside it. Affects pf's YAML writer (values containing `': '` need quoting on emit, as `'#'` already does). Routed upstream with the other pf items — **owned by `td1-15`**, whose description already covers pf's `repos`/YAML handling; noted here so the local guard is not mistaken for the fix. *Found by TEA during test design.*

### TEA (test design)

- No deviations from spec. The four ACs are unchanged and every new test maps to one of them: AC-1/AC-2 gained the rendered artefact (`contextRepoViolations`, `guardedContextFiles`), AC-3's archive rule was applied to set that scope, and AC-4 gained the two round-trip shapes it named but did not cover.

**Handoff:** To Bicycle Repair Man (Dev) for the green phase.

### Dev (implementation)

- **Edited a test file, which is normally TEA's alone**
  - Spec source: `.session/mg1-4-session.md`, TEA Assessment round 2 — "The contract Dev implements"
  - Spec text: "`yamlRoundTripRisks(files)` … This subsumes the inline scan the old AC-4 test carried."
  - Implementation: rewrote the body of `no sprint scalar carries an unquoted ' #'` to call `yamlRoundTripRisks(epicFiles())` instead of its own inline regex, and asserted on both risk kinds
  - Rationale: without it the subsumption was notional — mutation M2 proved the SH-1 shape still left the suite green on live data, which is the very defect the review raised. The test's name only became true once it delegated.
  - Severity: minor — TEA specified the subsumption; Dev performed it. No assertion was weakened and no test was deleted.
  - Forward impact: none. The test keeps its name and its live scope, and now covers list items and complex keys as well as `key:` scalars.
- **Swept `context-epic-mg1.md` from `.` to `arcade`, which no test required**
  - Spec source: TEA Assessment round 2 — "Decisions Dev inherits rather than re-litigates"
  - Spec text: "`.` stays valid … no test demands normalisation, so leave it or sweep it — both pass."
  - Implementation: swept it
  - Rationale: the file is generated from `sprint/epic-mg1.yaml:7`, which the sweep set to `arcade`. Leaving `.` would have left the artefact disagreeing with its own source — the exact drift this story exists to remove — and the Reviewer named mg1 in the fix list.
  - Severity: none — inside the latitude TEA granted
  - Forward impact: none

## Dev Assessment (round 2 — rework GREEN)

**Implementation Complete:** Yes
**Tests:** **352/352 orchestrator (17/17 this story's)** · `tsc --noEmit` clean · all 10 sprint YAMLs parse
**Branch:** `main` (trunk-based) — commit `be67a10`

**Files Changed:**
- `tests/helpers/sprint-repos.mjs` — `repoRoutingViolations` extended; `yamlRoundTripRisks`, `guardedContextFiles`, `contextRepoViolations` added; inert `explicitPath` removed
- `tests/sprint-repo-routing.test.mjs` — the live AC-4 test delegates to the helper (see deviation)
- `sprint/context/context-epic-{jt8,sw8,td1,uf1,mg1}.md` — one line each
- `sprint/epic-mg1.yaml` — mg1-14's mangled acceptance criterion re-quoted

**The four contracted exports landed as specified**, and TEA's predicted split held exactly: the helper alone took the suite to 15/17, leaving precisely the two live-data assertions red. Those were data, and they are now fixed.

**The High finding is closed at the artefact, not the source.** Four live epics' context files named retired repos — `jt8 -> joust`, `sw8 -> star-wars`, `td1` an eight-name list, `uf1` a four-name list — behind 30 open stories. All corrected **in place**. Not regenerated: `pf context create epic mg1` would have destroyed the 68-line enriched context that arrived with the mg1-2 merge, which both TEA and the Reviewer flagged as the trap. `context-epic-mg1.md` was swept from `.` to `arcade` as well, which no test demanded — it is generated from `sprint/epic-mg1.yaml:7`, and leaving the artefact disagreeing with its own source is the drift this story exists to remove.

**The re-quoted acceptance criterion is stable, and that was measured rather than hoped.** Re-quoting mg1-14's AC would be cosmetic if pf's writer simply re-mangled it on the next write, so a real `pf sprint story update` was run against the repaired tree: all five ACs came back as `str`, no `- ? ` shape returned, and **only `epic-mg1.yaml` changed** — the other nine shards byte-identical. That is AC-4 re-exercised independently of the earlier rounds.

**The finding I did not expect to make, and the one worth reading.** After the helper was green I mutated live data rather than re-reading the new code, and M2 came back **0 failures**: the archived SH-1 line, re-added unquoted to a live shard, still left the whole suite green. `yamlRoundTripRisks` had detected that shape correctly from the moment it was written — but every test exercising list items used a *fixture*, and the one test reading real files still carried the old inline `key:value` scan. The detector existed; nothing pointed it at the tree. That is the review's own finding reproduced one level up, and re-reading the code could not have surfaced it. Wiring the live test to the helper — which TEA's contract already called for with the word "subsumes" — is what made the test's name true.

**Every guard mutation-tested against live data, because one that cannot fail is decoration.** All reverted byte-identically.

| Mutation | Result |
|---|---|
| Retired repo returns to a live epic **context** | ✖ red |
| The archived **SH-1 line**, unquoted, as a live AC **list item** | ✖ red — `sprint/epic-cp5.yaml:18 [unquoted-hash]` (**green before the rewiring**) |
| A **complex-key** AC returns to a live epic | ✖ red (2 tests) |
| **Block-sequence** `repos:` naming a retired repo | ✖ red |
| Retired repo in live epic **YAML** (regression check) | ✖ red |

**What I deliberately did not do.** No YAML parser was added — the complex-key detection is a text shape (`/^\s*-\s*\?\s/`), keeping the house idiom and avoiding a repeat of `971c966`. `sprint/archive/` remains unscanned and `ARCHIVE_SCANNED` stays `false`; `guardedContextFiles` applies that same rule to context docs, which costs no coverage because every stale story context on disk belongs to a `done` story. Their `mg1-14` keeps `repos: .` — legitimately registered, and no test asks otherwise.

**Handoff:** To The Argument Professional (Reviewer).
### Reviewer (audit, round 2)

Dev logged two deviations this round and both are sound.

- **Edited a test file, normally TEA's alone** → ✓ ACCEPTED by Reviewer: TEA's contract used the word "subsumes", so performing the subsumption was following spec, not departing from it. More importantly Dev proved it was not optional — mutation showed the SH-1 shape still left the suite green until the live test delegated. I re-ran that mutation independently and confirm it reddens now. Editing a test to make its own name true is the correct call, and logging it was right.
- **Swept `context-epic-mg1.md` from `.` to `arcade` though no test required it** → ✓ ACCEPTED by Reviewer: the file is generated from `sprint/epic-mg1.yaml:7`, which the sweep set to `arcade`. Leaving the artefact disagreeing with its own source is the drift the story exists to remove, and I named mg1 in round 1's fix list. Inside TEA's stated latitude.
- **UNDOCUMENTED, and mild** — the round-2 Dev Assessment says the guards were "mutation-tested against live data", which is true of the five shapes tested. It is not true of the newest guard's own blind spot: no mutation asked whether `contextRepoViolations` can fail when it parses *nothing*. That is finding 1, and it is a gap in the battery's coverage rather than a false claim about it. Severity: **low** — the claim is accurate as written; it is the battery that was incomplete.

## Subagent Results (round 2)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 358/358, lint clean, tree clean, 10/10 YAML parse, every live context reads `arcade` or `.`. Its AC-type dump is what surfaced finding 2 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — assessed directly (findings 1, 2, 3) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — assessed directly (findings 1, 2; see [SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — assessed directly (findings 1, 2) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — assessed directly (see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — assessed directly (see [TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — assessed directly (see [SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — assessed directly (finding 4; see [SIMPLE]) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — `javascript.md` enumerated directly (see [RULE]) |

**All received:** Yes (1 enabled specialist returned; 8 disabled via `workflow.reviewer_subagents` and assessed directly)
**Total findings:** 4 confirmed, 0 dismissed, 0 deferred — 2 Medium, 2 Low, **no Critical or High**

### Round 1's findings — verified fixed by mutation, not by reading the claims

Every one re-tested against live data. The first two were **green in round 1** and are red now, which is the only evidence that counts.

| Round 1 finding | Re-test | Result |
|---|---|---|
| **[HIGH]** stale epic contexts | all live contexts read `arcade`/`.`; retired name reinstated in a context file | ✔ fixed, and the guard fires |
| **[MED]** SH-1 shape uncatchable | archived SH-1 line, unquoted, live AC list item | ✔ **now red** (was green) — `epic-cp5.yaml:18 [unquoted-hash]` |
| **[MED]** block-sequence invisible | `repos:` + `- joust` in a live shard | ✔ **now red** (was green) |
| **[LOW]** `explicitPath` inert | deleted; `{arcade, path}` still both registered | ✔ fixed, behaviour identical |
| **[LOW]** vacuous assertion | replaced with `assert.throws(/registered no entries/)` | ✔ fixed |
| **[LOW]** false positives | ruled optional in round 1 | carried forward, see finding 4 |

### Round 2 mutation battery

Eleven mutations on real source; all reverted byte-identically (`git diff --quiet` after each).

| Mutation | Expected | Result |
|---|---|---|
| Retired repo in a live epic **context** | red | ✔ red |
| Retired repo in live epic **YAML** | red | ✔ red |
| SH-1 line, unquoted, live AC **list item** | red | ✔ red |
| **Complex-key** AC in a live epic | red | ✔ red (2 tests) |
| **Block-sequence** `repos:` naming a retired repo | red | ✔ red |
| `- **Repo:** joust` **indented two spaces** | red | ✖ **GREEN 17/17** — finding 1 |
| `- **Repo:**` line **deleted from every live context** | red | ✖ **GREEN 17/17** — finding 1 |
| Every `acceptance_criteria` block → **`[]`** | red | ✖ **GREEN 17/17** — finding 2 |
| `- title: "a quoted value with a #hash"` | green | ✖ false positive — finding 3 |
| Multi-line quoted scalar with a `- …#hash` line | green | ✖ false positive — finding 3 (latent: 0 multi-line scalars exist) |
| `repos:` inside a block scalar | green | ✖ false positive — finding 4 (carried from round 1) |

### Rule Compliance — `.pennyfarthing/gates/lang-review/javascript.md`

Re-enumerated over the changed code only (`sprint-repos.mjs` +4 exports/1 extension, `sprint-repo-routing.test.mjs` +7 tests). No `.claude/rules/` or `SOUL.md` exists; this checklist is the whole rubric.

| # | Check | Judgement on every new instance | Verdict |
|---|---|---|---|
| 1 | Silent error swallowing | No try/catch, no `.catch`, no `JSON.parse` in any new function. `liveScope`/`guardedContextFiles` let `readdirSync`/`readFileSync` throw. **But** `contextRepoViolations` returning `[]` from finding-nothing is a silent success — that is finding 1, filed under this check. | **1 violation** |
| 2 | Async pitfalls | `yamlRoundTripRisks`, `liveScope`, `guardedContextFiles`, `contextRepoViolations` all synchronous; the 3 new async tests each `await helper()`; no async `forEach` | Compliant |
| 3 | Prototype pollution | `liveScope` returns two `Set`s; `contextRepoViolations` queries `identifiers.has()`. No bracket access on file-derived text anywhere new | Compliant |
| 4 | Equality / coercion | New comparisons enumerated: `value === ''`, `items.length === 0`, `match[1] === 'epic'`, `token !== ''`, `value === null`. All strict, none truthiness-on-count | Compliant |
| 5 | DOM / browser | N/A — Node-only test tooling | N/A |
| 6 | Node.js | `readFileSync(join(dir, file), 'utf8')` at both new call sites — encoding present. No `child_process`, no variable `require`, no `process.env` | Compliant |
| 7 | Regex safety | All 9 new regexes anchored (`^…$` or `^`-anchored intentionally). No `/g` with `.test()`. No file text reaches `new RegExp()`. **But** `scalarValue` tries the `-` branch before the mapping branch, so a list item that is itself a mapping has its quoted value mis-read — finding 3 | **1 violation** |
| 8 | Test quality | Round 1's vacuous assertion replaced. No `.only`/`.skip`, no mocks, every `assert.ok` carries a message. **But** the two new live-data assertions pass vacuously when their input carries nothing to check — findings 1 and 2 | **2 violations** |
| 9 | Module and scope | `const` throughout; `liveScope`/`scalarValue` are module-private, not exported; still import-side-effect-free | Compliant |
| 10 | Error handling | No new throws added; the three existing `new Error(...)` retain specific messages | Compliant |
| 11 | Input validation | `guardedContextFiles(root)` joins a caller-side constant, same scoping as round 1 (rule scopes itself to "API handlers, middleware, user-facing functions") — checked and scoped out, not dismissed | Compliant (scoped out) |
| 12 | Dependency hygiene | **No YAML parser added** — complex-key detection is a text shape. No `console.log`, no secrets | Compliant |
| 13 | Fix-introduced regressions | This section IS that check. The round-1 fixes introduced findings 1 and 3 — both are new code, and finding 1 is the same class as the defect it fixes | **2 violations** |

### Devil's Advocate

Argue this is broken. The strongest case is that **the fix for "a guard that cannot fail" contains a guard that cannot fail**, and I found it the same way I found the first one — by mutating live data instead of reading the diff. `contextRepoViolations` anchors on a line starting at column 0 with the literal `- **Repo:**`. Indent that line two spaces *and* change its value to `joust`, and the suite reports 17/17. Delete the line from every context file on disk and it still reports 17/17. The guard has no way to tell "every context is correct" from "I read seven files and found nothing to look at." That is the exact shape of round 1's rejection, reproduced inside its own remedy, and it is uncomfortable to approve.

The second-strongest case is that AC-4's story-shape guard still does not do what its name says. Round 1 caught it missing the `#` in list items; TEA fixed that. But rewrite every `acceptance_criteria:` block as `acceptance_criteria: []` and the suite stays green, because the regex insists on a bare key with nothing after the colon. PyYAML emits empty lists in exactly that flow style, so the single most likely rendering of a real truncation is the one shape the truncation guard ignores. Two holes, same test, two rounds.

What would a confused user do? Write an acceptance criterion containing a legitimately quoted hash — `- title: "fixes PR #42"` — and be told by CI that their safe, quoted value will be truncated. It will not. The `-` branch of `scalarValue` wins before the mapping branch, so the guard reads the whole `title: "…"` as the value, sees no opening quote, and flags it. That is a false positive that blocks landing, and the same precedence bug fires on any multi-line quoted scalar. Nothing in the tree triggers it today — I checked, there are zero multi-line scalars — which is luck, not design.

What would a stressed filesystem produce? Honest failures: a missing `sprint/context/` throws from `readdirSync`, an unreadable shard throws from `readFileSync`, an unparseable registry still throws rather than degrading to an empty Set. That direction is right and was re-verified.

And what saves this from rejection? The four acceptance criteria are met and I tested each rather than reading it. The High is gone: every live context names a registered repo, and reinstating a retired one reddens. The two guards that could not fail in round 1 now fail on the exact live shapes that defeated them. AC-4's round-trip was re-exercised twice with real `pf` writes — mine filing `td1-17`, which touched only `epic-td1.yaml` and left nine shards byte-identical. Nothing in the tree is wrong today. What remains are two robustness gaps in new guards, both Medium, both one-line fixes, neither corresponding to a live defect — and my own severity rubric says Medium does not block. Inflating them to High to justify a second rejection would be theatre, and dismissing them would be worse. They are filed as `td1-17`.

## Reviewer Assessment

**Verdict:** APPROVED

Round 1's High is genuinely closed, and I verified it by mutation rather than by reading the claims: every live context now names a registered repo, and reinstating a retired one reddens the suite. The two guards that were *green* against their own named cases in round 1 — the SH-1 list-item shape and the block-sequence `repos:` — are **red** now. `358/358 orchestrator`, `tsc --noEmit` clean, all 10 sprint YAMLs parse, working tree clean.

Four findings remain, none blocking. All four are filed or accepted; per the severity rubric Medium does not block, and no live defect corresponds to any of them.

| Severity | Issue | Location | Disposition |
|----------|-------|----------|-------------|
| [MEDIUM] `[SILENT]` `[TEST]` `[RULE]` | **The context guard passes on absence.** `- **Repo:** joust` indented two spaces → 17/17 green; the line deleted from every live context → 17/17 green. Nothing asserts a Repo line was ever parsed, so "all correct" and "nothing to read" are indistinguishable. Same class as round 1's rejection, inside its own remedy. It reads 7 files and finds a Repo line in all 7 today, so the fix is a non-zero-parsed assertion plus a template-drift test. | `tests/helpers/sprint-repos.mjs:269` | **Filed `td1-17`** |
| [MEDIUM] `[EDGE]` `[TEST]` | **AC-4's story-shape guard misses `acceptance_criteria: []`.** Its regex requires the key with nothing after the colon, so the flow-style empty list skips the check entirely — and that is how PyYAML renders a list whose contents were lost. Replacing every AC block with `[]` leaves 17/17 green. Note mg1-12 and mg1-13 legitimately carry no AC key at all, so a fix must separate "absent" from "present but emptied". | `tests/sprint-repo-routing.test.mjs:275-283` | **Filed `td1-17`** |
| [LOW] `[TYPE]` `[EDGE]` | **`scalarValue` tries the `-` branch before the mapping branch**, so `- title: "value with a #hash"` is read as the whole `title: "…"` string, sees no leading quote, and is flagged though the value is safely quoted. Same precedence bug fires on multi-line quoted scalars. Latent only — zero multi-line scalars exist in the tree, verified. | `tests/helpers/sprint-repos.mjs:153-159` | Accepted — fails loud, no live instance |
| [LOW] `[SIMPLE]` `[DOC]` | **Round 1's false positives carried forward** — `repos:` inside a block scalar is still reported. I ruled this optional in round 1 and stand by that, but the accompanying "comment noting the limit" was not added either, so the next reader meets it undocumented. | `tests/helpers/sprint-repos.mjs:104` | Accepted — documented here instead |

**Verified good — evidence, and the rules each was checked against:**

- `[VERIFIED]` `[EDGE]` **The SH-1 shape now reddens on live data** — re-adding the archived criterion from `sprint/archive/epic-SH.yaml` to `sprint/epic-cp5.yaml` fails `no sprint scalar carries an unquoted ' #'` at `epic-cp5.yaml:18 [unquoted-hash]`. In round 1 this identical mutation left the suite 10/10 green. The test's name is now true, which was the whole finding. Complies with `javascript.md` #13 (fix actually removes the defect class).
- `[VERIFIED]` `[SEC]` **No injection surface added.** All four new/changed exports enumerated against #6 and #11: no `child_process`, no variable `require()`, no `new RegExp()` over file text, no `process.env`, no network. `guardedContextFiles(root)`'s `join` takes a caller-side constant.
- `[VERIFIED]` `[TYPE]` **`liveScope` returns `Set`s, not objects** — `sprint-repos.mjs:208-209`, queried via `.has()` at `:262-263`. Complies with #3, the rule that forced the original `Set` choice; a `{}` here would have re-opened the prototype hole one level down.
- `[VERIFIED]` `[SIMPLE]` **`explicitPath` is gone and behaviour is unchanged** — an entry carrying an explicit `path:` still yields `{arcade, .}`. The only surviving mention is the comment explaining why it was removed, which is the right residue.
- `[VERIFIED]` **AC-4 re-exercised a third time, independently.** Filing `td1-17` ran a real `pf sprint story add` + `update`; only `epic-td1.yaml` changed, nine shards byte-identical, all 10 still parse, 358/358 stayed green.
- `[VERIFIED]` **The archive rule is applied, not restated** — `guardedContextFiles` scans 7 files; `context-story-sw8-11.md` (done) is excluded and `context-epic-jt8.md` (4 open stories) included, both asserted. Consistent with `ARCHIVE_SCANNED = false` and AC-3.

**Data flow traced:** `.pennyfarthing/repos.yaml` → `registeredRepoIdentifiers` → `Set{arcade, .}` → two parallel consumers, `repoRoutingViolations(guardedSprintFiles())` over the YAML and `contextRepoViolations(guardedContextFiles())` over the rendered artefact → `assert.deepEqual(…, [])` with offenders rendered into the message. The artefact branch is the one round 1 was missing, and it now exists — its weakness is that it cannot prove it read anything, which is finding 1.

**Pattern observed:** the team adopted "a guard that cannot fail is decoration" and applied it rigorously to the YAML guard, the round-trip guard and the block-sequence guard — Dev even caught their own `yamlRoundTripRisks` never meeting live data and wired it up, which is exactly right and is the best work in this story. The standard simply was not turned on the newest guard of all.

**Error handling:** three `new Error` with specific messages retained at `:47`, `:56`, `:91`; no new try/catch or silent fallback; `readdirSync`/`readFileSync` propagate in both new file-readers.

**Handoff:** To The Announcer (SM) for finish-story.

## Impact Summary

**Verdict: APPROVED (round 2). Blocking items: 0.**

This summary is written at finish and reflects the FINAL state of a two-round story. Round 1 was
REJECTED; round 2 approved. Both rounds' findings are recorded above, so read this section — not
the round-1 text — for what actually shipped.

**What shipped.** Every `repos:` value across the live sprint YAMLs moved from the retired
per-game names (`star-wars`, `battlezone`, `joust`, `centipede`, `red-baron`, `lobby`, and the
multi-repo lists) to the single registered identifier `arcade`. The sweep's derived artefacts —
the five live epic context files — were regenerated to match. A new helper, `tests/helpers/
sprint-repos.mjs`, reads `.pennyfarthing/repos.yaml` at test time rather than hardcoding the valid
set, which was AC-2's explicit requirement and the story's own stated failure mode. Guards live in
`tests/sprint-repo-routing.test.mjs` under the orchestrator suite (`node:test`), not vitest, per
the CLAUDE.md split.

**Round 1's HIGH is closed, and was verified by mutation rather than by reading the claim.** The
finding was that the sweep corrected the sprint YAML but not the context files generated from it,
leaving four live epic contexts naming retired repos behind ~30 open stories. Confirmed closed at
finish by direct inspection: `context-epic-{jt8,mg1,sw8,td1,uf1}.md` all render
`- **Repo:** arcade`, and reinstating a retired repo reddens the suite. Round 1's MEDIUM — the AC-4
guard named after the epic-SH truncation that could not fail on that truncation's shape — is closed
on the same standard: re-adding the archived SH-1 criterion to a live shard is now red.

**Four non-blocking findings remain.** Two MEDIUM guard gaps are **filed as `td1-17`**; both are
absence bugs, where the context scan and the AC-shape scan go green when there is nothing to read,
which is a gap no value-mutation can reach. Two LOW findings are accepted with reasons stated in
the round-2 assessment above — a `scalarValue` branch-precedence bug that is latent with zero live
instances in the tree, and the block-scalar `repos:` false positive. Per the severity rubric,
Medium does not block, and no live defect corresponds to any of the four.

**Everything descoped is filed or owned — no finding leaves this story as prose alone.**

| Descoped item | Home |
|---|---|
| pf's `_collect_repos` char-by-char iteration; `--repos` defaulting to `pennyfarthing`; `': '` complex-key emission | **`td1-15`** (backlog, p3) |
| `pf validate context-epic` checks existence but never freshness, so a generated context drifts and passes its gate forever | **`td1-16`** (backlog, p3) |
| The two MEDIUM absence gaps in this story's own new guards | **`td1-17`** (backlog, p2) |
| The multi-app signal lost when lists like `lobby,tempest,star-wars,…` collapsed to one repo | Owned by epic `uf1`'s standing description note |

**Final verification, run at finish rather than quoted from an earlier phase:** `358/358`
orchestrator tests pass, `npm run lint` (`tsc --noEmit`) clean, all 10 sprint YAMLs parse under
`yaml.safe_load`, working tree clean, `main` in sync with `origin/main`, and `td1-15`/`td1-16`/
`td1-17` all confirmed present in the backlog.

## SM Assessment (finish)

**The preflight was clean, and for once that is worth recording rather than distrusting.** The
standing gotcha is that `sm-finish` PHASE=preflight compiles the Impact Summary by scraping every
round's Delivery Findings and can resurrect a closed round-1 finding as BLOCKING. It did not do so
here — but only because the spawn prompt named the two-round structure, stated which finding was
closed, and demanded file:line evidence for any claimed blocker. The mitigation is cheap and it
worked; keep pre-loading the round structure into the preflight prompt rather than auditing its
output afterwards. It also made no file writes at all this run, so the "preflight is not read-only"
warning did not bite — the no-PR instruction is what removed that surface.

**The epic YAML's `review_findings` held round 1's rejection text next to `review_verdict:
approved`.** This is the documented failure mode and it was live again here. Rewritten via
`pf sprint story update --review-findings` to the approving round's outcome; verified surgical with
`git diff --stat` (one file, one line) and all 10 shards still parsing. Worth noting the recursion:
mg1-4's own AC-4 guard is what would have caught a corrupting round-trip on that very write, and
the write went through the pf path the story exists to make safe.

**No PR, no merge, no trial-merge.** Trunk-based on one repo, work landed directly on `main`, which
retires the whole subrepo merge ceremony the older gotchas describe. `origin/main` had not moved
since the review commit, so there was nothing to trial-merge against.

**Queued behind this story:** `jt5-1` (joust audio seam, p2) was the user's original ask at setup
and was deliberately deferred, because setting it up would have baked `repos: joust` into one more
session artifact — the exact defect mg1-4 existed to fix. That routing is now correct by
construction, and jt5-1 is the natural next pick.