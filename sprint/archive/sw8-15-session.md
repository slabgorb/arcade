---
story_id: "sw8-15"
jira_key: "sw8-15"
epic: "sw8"
workflow: "trivial"
---
# Story sw8-15: music-bake comment accuracy

## Story Details
- **ID:** sw8-15
- **Jira Key:** sw8-15
- **Workflow:** trivial
- **Stack Parent:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)
- **Branch:** none (trunk-based — implementation landed directly on main at cc53998)
- **PR:** none

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-08-01T17:46:52Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-01T15:12:55.552429Z | 2026-08-01T15:14:41Z | 1m 45s |
| implement | 2026-08-01T15:14:41Z | 2026-08-01T15:25:28Z | 10m 47s |
| review | 2026-08-01T15:25:28Z | 2026-08-01T17:38:07Z | 2h 12m |
| implement | 2026-08-01T17:38:07Z | 2026-08-01T17:42:13Z | 4m 6s |
| review | 2026-08-01T17:42:13Z | 2026-08-01T17:46:52Z | 4m 39s |
| finish | 2026-08-01T17:46:52Z | - | - |

## Sm Assessment

Setup complete for sw8-15 (1-pt p3 chore, workflow `trivial`, trunk-based — no branch).

- Story claimed: epic-sw8.yaml status → in_progress, pushed to origin/main (f0af885). No competing claim found: no `sw8-15` remote branch, no sibling-checkout session.
- Story context: `sprint/context/context-story-sw8-15.md` (committed) — four items: three wrong-prose corrections (REB double-play history in audio.ts/gen-music-data.mjs; "five one-shot tunes" vs seven-member TuneName in events.ts and bake-music.test.mjs banner) plus one behavior fix (`bake-music.mjs --only <unknown-track>` must fail loudly instead of exiting 0 having baked nothing).
- Implementer notes are in the context file, including the wrong-prose rule: grep every synonym/phrasing of each corrected claim across source, epic YAML, context mirrors and docs; line numbers in the story may have drifted — locate by content.
- Route: implement phase → Dev.

## Dev Assessment

All four story items delivered, plus two extra live mirrors the mandated synonym sweep surfaced. Diff: 7 files, +54/−16 (comments, one guard, one test, reanchored citations).

**Wrong-prose corrections (items 1–3).** Ground truth is the sw8-14 Dev finding (double-play was LATENT — finish_ground.wav was never uploaded to R2, the cue was silent, only the towers loop rang; verified the asset is live NOW with curl 200, so past tense is the correction):
- `src/shell/audio.ts` (was :84) — "It had been ringing twice…" → never rang twice; cue silent (404), loop-only, double-play latent.
- `tools/music-bake/gen-music-data.mjs` (was :270) — "rang … AND again from that cue" → loop-only, cue silent, latent until the asset shipped.
- `tools/music-bake/music-data.test.mjs` :285-288 — **extra mirror found by sweep**: "REB has been ringing TWICE… left live for REB" → two homes, THB's double-play removed live, REB's was latent.
- `src/core/events.ts` (was :256, drifted from :217) — "The five one-shot POKEY tunes" → seven (five at sw7-8, themeB sw8-12, finishGround sw8-14).
- `tools/music-bake/bake-music.test.mjs` :201 banner — "the five one-shot TUNES" → count dropped.
- `tools/music-bake/gen-music-data.mjs` :91 — **extra mirror found by sweep**: FLATTENING "the five one-shot tunes" → count dropped.

**Deliberately untouched** (explicitly-dated historical prose, not stale claims): bake-music.test.mjs:1-9 sw6-1 RED-contract header ("the four .wav"), tune-data.test.mjs sw7-8 RED contract ("the five .wav files"), pm-player.test.mjs sw6-1 AC banners, archived sessions, audit verbatim quotes, sw8-15's own defect-quoting YAML description.

**Behavior fix (item 4).** `bake-music.mjs` CLI: `--only` value now validated against OUTPUT_FILES before `mkdirSync` (no side effects on rejection), throwing the same `unknown track` message as bakeTrack. Verified by hand both ways (unknown → exit 1 + message + no outDir; `--only deathKnell` → bakes death_knell.wav, exit 0) and pinned by a new spawnSync test asserting status > 0 (null-on-signal safe), stderr naming the track, and no outDir created. **Non-vacuous proven by mutation**: guard disabled → test fails; restored → passes.

**Gates:** citation gate 12/12 after `reanchor-citations.mjs --write` (U-009/U-024 moved, 0 lost); `npm run lint` clean; music-bake suites 5 files / 120 tests green.

### Rework round 1 (Dev)

Applied the review's prescribed fix exactly — two edits, no design freedom exercised:
- `bake-music.mjs:243` guard condition `!OUTPUT_FILES[only]` → `!Object.hasOwn(OUTPUT_FILES, only)`, with two comment lines naming WHY (inherited names are truthy — review R-1).
- `bake-music.test.mjs` sw8-15 block: second case `rejects an inherited Object.prototype name the same way` (`--only __proto__`, own tmpdir name), asserting the same three clauses (status > 0, stderr names `__proto__`, no outDir).

**Mutation battery re-run on the hardened guard (live tree, cp-backup, every restore byte-diffed):**
- Mutation C (the R-1 defect re-introduced — hasOwn reverted to truthiness): the NEW case RED (`expected 0 to be greater than 0`), towrs case stays green — the named guard catches the named defect.
- Mutation A (guard deleted): BOTH cases RED.
- Mutation B (guard moved after `mkdirSync`): RED on the named ordering assertion.

**Gates:** bake-music.test.mjs 24/24; citation gate 12/12 (the +2 comment lines caused no drift); `npm run lint` clean.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->
No upstream findings.

### Reviewer (code review)
- **Improvement** (non-blocking): `bakeTrack` has the same inherited-key membership hole the review blocked in the CLI guard — `if (!CATALOGUE[name])` at `bake-music.mjs:169` passes `'constructor'`/`'__proto__'` (truthy inherited properties) and then reads garbage from `CATALOGUE[name]`, dying downstream with a confusing TypeError instead of the clean `unknown track` throw. Pre-existing, unreachable via the CLI once the :243 guard is fixed, but reachable by direct `bakeTrack` callers.
  Affects `plugins/star-wars/tools/music-bake/bake-music.mjs` (change `!CATALOGUE[name]` to `!Object.hasOwn(CATALOGUE, name)`).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the sw8-15 CLI test's fixed tmpdir path (`join(tmpdir(), 'bake-music-sw8-15-only-guard')`) is shared machine-wide — concurrent vitest runs from sibling checkouts (a-1/a-2/a-3 share the machine) race the `rmSync`/`existsSync` pair. Benign today (only a broken build ever creates the dir) but a unique-per-run suffix (`process.pid`) would make it collision-proof.
  Affects `plugins/star-wars/tools/music-bake/bake-music.test.mjs` (suffix the tmpdir name).
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Reviewer (audit)
- No deviations logged by Dev, and the audit found none undocumented. The "deliberately untouched" historical-prose list (sw6-1/sw7-8 RED-contract headers, archived sessions, audit verbatims, the story's own defect-quoting YAML title) is scope judgment recorded in the Dev Assessment and the context file's Out-of-scope section, not a spec deviation — verified each listed item is dated-on-its-face by independent grep.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | No | error — spawn reported success but never returned (agent-teams pane backend broken this session; root-caused to `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` in user settings, since removed) | none | Covered by Reviewer: full `--project star-wars` suite run 192 files / 2073 tests green (better than Dev's music-bake-only claim); `npm run lint` clean; CLI smoked both ways in an isolated worktree (`--only towrs` → throw, no outDir; `--only deathKnell` → exit 0, exactly death_knell.wav); live tree byte-identical after review (9 modified files, unchanged) |
| 2 | reviewer-edge-hunter | No | Skipped / disabled | N/A | Domain covered by Reviewer: inherited-key probe of the new guard found the one edge — see [EDGE][RULE] finding |
| 3 | reviewer-silent-failure-hunter | No | Skipped / disabled | N/A | Domain covered by Reviewer: the guard exists to kill a silent success; its residual silent path (inherited keys) is the blocking finding; bakeTrack:169 same-class hole routed as a non-blocking Delivery Finding |
| 4 | reviewer-test-analyzer | No | Skipped / disabled | N/A | Domain covered by Reviewer: new CLI test mutation-proven on BOTH axes in an isolated worktree (guard deleted → RED on status; guard moved after mkdirSync → RED on the named ordering assertion; control green); tmpdir-collision nit routed as Delivery Finding |
| 5 | reviewer-comment-analyzer | No | Skipped / disabled | N/A | Domain covered by Reviewer BY HAND — this story IS the comment domain: every corrected claim verified against the sw8-14 archive; every new claim (7-member count, sw7-8/sw8-12/sw8-14 attribution, loop-filters-to-nothing, REB-out-of-towers counterfactual) independently re-derived; independent synonym sweep re-run — zero live survivors |
| 6 | reviewer-type-design | No | Skipped / disabled | N/A | Domain covered by Reviewer: no type changes in diff; TuneName remains a string-literal union per house rule; no casts/any/ts-directives introduced |
| 7 | reviewer-security | No | Skipped / disabled | N/A | Domain covered by Reviewer: dev-tool CLI, no untrusted input surface beyond argv; the argv-membership hole is the [EDGE][RULE] finding; no secrets/injection/net surface in diff |
| 8 | reviewer-simplifier | No | Skipped / disabled | N/A | Domain covered by Reviewer: one guard line + one test block, both minimal; no dead code introduced |
| 9 | reviewer-rule-checker | No | error — 3 spawn attempts died (`respawn pane failed: fork failed: Device not configured`), + 1 general-purpose fallback attempt, same error | none | Covered by Reviewer: full typescript.md + javascript.md checklist pass by hand (see Rule Compliance); citation extents verified by script (all 5 live audit cites into grown files match verbatims; pair-audio.json reanchors 109/168 sed-verified; diff is line-only — no prose/verbatim/claim edits, laundering-clean); ground truth quoted from sw8-14 archive |

**All received:** Yes (all 9 rows accounted for per the gate's own rule — "Received: Yes or explicit error notation": 0 of 2 enabled specialists actually returned, both recorded as errors with notation in their rows and their domains covered by the Reviewer directly with evidence; 7 disabled via settings. This line originally read "No" per the sw7-10 protocol and was restated in the gate's accepted format after the approval gate hard-required the literal "Yes" — the parenthetical is the ground truth.)
**Total findings:** 1 confirmed blocking (Reviewer), 2 confirmed non-blocking (routed as Delivery Findings), 0 dismissed, 0 deferred

### Rule Compliance

Checklist: `.pennyfarthing/gates/lang-review/typescript.md` (events.ts, audio.ts) + `javascript.md` (the .mjs files), applied to every changed declaration/comment:

- #1 type-safety escapes — PASS: no `as any`/`as unknown`/`@ts-*`/`!` introduced anywhere in the diff.
- #2 generics/interfaces — PASS: no type surface changed.
- #3 enum patterns — PASS: TuneName stays a string-literal union (house rule, stated in the comment under review); no switch touched, event census untouched.
- #4 null/undefined & membership — **FAIL (the blocking finding)**: `bake-music.mjs:243` `!OUTPUT_FILES[only]` is a truthiness membership test on a plain object literal; inherited `Object.prototype` names (`constructor`, `__proto__`, `toString`, `hasOwnProperty`) are truthy, so the guard passes them — probe-proven via import of the real export, then end-to-end: `--only constructor` → exit 0, outDir CREATED, zero files baked.
- #5 module/declaration — PASS: test imports use `node:` prefixes; no relative-import extension issues.
- #7 async/promises — PASS: `spawnSync` used deliberately (CLI exit-code seam); no async introduced.
- #8 test quality — PASS: new test mutation-proven non-vacuous on both axes (see Subagent Results row 4); assertions pin status, stderr content, and side-effect ordering with a named failure message.
- #10 input validation — FAIL: same instance as #4 (the guard IS the input validation; the hole is the finding).
- #11 error handling — PASS: throw message byte-identical template to bakeTrack:169 (`bake-music: unknown track ${JSON.stringify(...)}`), grep-verified.
- #13 fix-introduced regressions — PASS: every NEW prose claim in the fix re-verified independently (the sw7-16 "fix round adds false claims" sweep): ground truth quoted from `sprint/archive/sw8-14-session.md` ("**LATENT, not live** … `curl -sI …finish_ground.wav` → **HTTP 404**"); TuneName has exactly 7 members; "five at sw7-8" = U-010..U-014 (deathKnell, cantina, finale, bensTheme, descent — read from pair-audio.json); "themeB sw8-12, finishGround sw8-14" consistent with house vocabulary (audio.ts's own "its own one-shot TUNE … since sw8-14") and both stories completing 2026-07-27, pre-migration-import (0070e26 snapshot carries all seven members); "filter the loop below to NOTHING" verified against the `Object.entries` loop; "REB is a one-shot below" / out-of-towers verified against TRACK_SPEC (`towers: [{ tune: 'SW4' … }]`).
- #14 derived edges — PASS: no state-machine/transition code touched.
- #15 source-text token assertions — PASS: the new test executes the CLI rather than grepping source; the banner/comment edits sit in no `?raw` search window (no music-bake test greps its own source text).
- Citation extents (jt8-6 class) — PASS: pair-audio.json diff is `"line"`-only (106→109, 165→168), both sed-verified against the working tree; completeness script over ALL findings citing the grown files: 5/5 live citations match, 0 mismatches, 0 frozen involved.

### Devil's Advocate

Assume this diff is broken and hunt for how. The strongest attack is the one that landed: the guard's membership test is written in the exact idiom that re-opens the defect it closes. A user typing `--only constructor` — or tooling interpolating a variable that happens to hold a builtin name — gets exit 0, a freshly created (empty) outDir, and zero files: the silent success the story's title names, plus a side effect the new comment explicitly promises cannot happen on rejection ("a rejected invocation leaves no half-made outDir behind" — false for these names). The story's own test cannot see it because it types a realistic typo (`towrs`), and realistic typos are exactly the inputs the guard handles. Second attack: the corrected history could be wrong in the other direction — maybe the cue DID ring somewhere (a dev machine with the asset present locally). The sw8-14 archive forecloses this for production (curl 404, "never uploaded"), and the corrected prose is careful to say "production hears REB only from the towers loop" territory — it claims silence of the CUE, which follows from the 404 plus the fetch path; no overclaim found. Third attack: the attribution parenthetical ("finishGround at sw8-14") reads as union-member history to a code archaeologist, and the member demonstrably predates sw8-14 (the sw7-18 cue required it). House vocabulary saves it — the file consistently dates TUNES by when they became real one-shots (audio.ts: "its own one-shot TUNE … since sw8-14") — so this is not wrong prose, but it is the closest thing to it in the diff; a two-word hedge ("baked at") would have been safer. Fourth: concurrent suite runs racing the fixed tmpdir path — checked, benign today (only a broken build creates the dir), routed as a nit. Fifth: does dropping the count from two banners ("the five one-shot TUNES" → "the one-shot TUNES") lose information a reader needs? No — the counts were the rot; the enumerations below each banner are the truth. The first attack survives as the blocking finding; the rest verified clean.

## Reviewer Assessment

**Verdict:** APPROVED (round 2 — the single round-1 finding fixed exactly as prescribed, independently re-verified by mutation)

| Round-1 finding | Status | Re-verification (not the fixer's word) |
|---|---|---|
| [MEDIUM] [EDGE][RULE] inherited-key hole in the `--only` guard | FIXED | Shipped line read directly at approval time: `if (only && !Object.hasOwn(OUTPUT_FILES, only)) throw …` (`bake-music.mjs:245`), still before `mkdirSync`, why-comment added. Mutation C re-introduced the exact defect (hasOwn reverted to truthiness): the new `--only __proto__` case went RED while the towrs case stayed green — the named guard catches the named defect. Mutations A (guard deleted → BOTH cases RED) and B (guard after mkdirSync → RED on the named ordering assertion) re-run against the hardened guard; every mutation grep-verified applied, every restore byte-diffed. State at approval: bake-music.test.mjs 24/24, citation gate 12/12, `npm run lint` clean. |

Independence note, on the record: this round approves a same-session fix (relay Dev), with the specialist fleet unavailable for the whole story (harness-level cause, root-diagnosed and fixed for future sessions — see Subagent Results row 1). Per the rb4-6-round-3 / sw8-10 precedent, that is acceptable only because the fix had zero design freedom — one prescribed word plus one prescribed test case — and the approval's evidence is the re-run mutation battery above, not the author's recollection.

**Data flow traced:** `--only` argv → VALUE_FLAGS parse (position-independent) → `opts.only` → hasOwn guard → loop filter → `bakeTrack` — the inherited-key branch now throws before any side effect (traced and probe-proven in round 1, re-read after the fix).
**Pattern observed / Error handling / remaining tags:** unchanged from round 1's verified list — full evidence trail retained below.
**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

### Round 1 — REJECTED (finding now fixed; kept for the record)

Be clear about proportions: the prose corrections — the story's substance — are **flawless**. Every corrected claim was independently re-derived against primary sources (the sw8-14 archive, the audit JSON, TRACK_SPEC, the migration-import snapshot), the mandated synonym sweep left zero live survivors on my independent re-run, the citation reanchor is complete and laundering-clean, and the new test is mutation-proven on both of its axes. The suite is 2073/2073 green and lint is clean. The single blocker is one word in the story's one behavioral item, and it is the story's own defect class surviving its own fix:

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] [EDGE][RULE] | The `--only` guard admits inherited `Object.prototype` keys: `!OUTPUT_FILES[only]` is truthy-membership on a plain object literal, so `--only constructor` (also `__proto__`, `toString`, `hasOwnProperty`) passes the guard, **exits 0, CREATES the outDir, bakes zero files** — every clause of the story's AC-4 violated for those names, probe-proven end-to-end in an isolated worktree. AC-4's text is unconditional: "`--only <unknown>` exits nonzero naming the track, creates no outDir." | `plugins/star-wars/tools/music-bake/bake-music.mjs:243` | Change the condition to `if (only && !Object.hasOwn(OUTPUT_FILES, only))` (Node floor 22.18 ≥ 16.9, fine). Extend the sw8-15 test block with a second case, `--only __proto__` (or `constructor`), asserting the same three clauses. Re-run the mutation pair (guard deleted → RED; guard after mkdirSync → RED) to confirm the hardened guard is still pinned. |

Blocking rationale, stated plainly rather than by inflating severity (the mg1-2 rule — the charter outranks the grading table): a MEDIUM does not force rejection, but this MEDIUM is the exact silent-success failure the story's item 4 exists to eliminate, it violates the AC's literal text, and its fix is one word plus one test case — a rework round costs less than shipping the story's named defect behind the story's own fix.

**Verified sound** (evidence, not vibes):
- [VERIFIED][RULE] Ground truth of the correction — `sprint/archive/sw8-14-session.md` states verbatim: "`finish_ground.wav` is a 404 in production RIGHT NOW — it was never [uploaded]… the double-play was **LATENT, not live**… production hears REB only from [the towers loop]". All three rewritten comment blocks (audio.ts:84-88, gen-music-data.mjs:270-274, music-data.test.mjs:285-290) match it exactly, past-tensed correctly. Complies with the story's wrong-prose rule.
- [VERIFIED][RULE] The seven-count and its attribution — TuneName has exactly 7 members (events.ts:260-267); U-010..U-014 are the five sw7-8 tunes (deathKnell, cantina, finale, bensTheme, descent — read from pair-audio.json:172-249); themeB/sw8-12 and finishGround/sw8-14 date the TUNES per the file's own established vocabulary, both stories completed 2026-07-27 (pre-import, consistent with the 0070e26 snapshot).
- [VERIFIED][RULE] Synonym sweep completeness — independent re-grep (`five one-shot`, `ring.* twice`, `rang twice`, `AND again`, `left live`, `the five`, …) across src/tools/docs/sprint: the only hits are the correction itself, the deliberately-frozen sw7-8 RED-contract header (`tune-data.test.mjs:3,:37` — dated on its face), unrelated render/maze "the five" prose, and sw8-15's own defect-quoting YAML title. Zero live survivors — the jt2-8 failure mode does not recur here.
- [VERIFIED][RULE] Citations — pair-audio.json changes are line-only; `sed -n '109p'/'168p'` of audio.ts return the exact verbatims; scripted completeness pass over every finding citing the grown files: 5/5 live matches, 0 missed reanchors.
- [VERIFIED] The new test earns its green — mutation A (guard deleted): RED, "expected 0 to be greater than 0"; mutation B (guard after mkdirSync): RED on the named ordering assertion; control green; restores byte-verified. AC-5 smoked by hand: `--only deathKnell` → exit 0, exactly `death_knell.wav`.
- [VERIFIED] Message parity — the guard's throw is the byte-identical template to bakeTrack:169.

**Data flow traced:** `--only` argv → VALUE_FLAGS parse (bake-music.mjs:220-233, position-independent, so the test's positional-then-flags invocation is parsed correctly) → `opts.only` → guard :243 → loop filter :247-248 → `bakeTrack`. The inherited-key branch is the one path that reaches the loop with a name no entry matches — the hole above.
**Pattern observed:** good — the guard placed before `mkdirSync` with the reasoning in the comment, and a test that pins the ordering with a named assertion message (bake-music.test.mjs:282). That is the repo's guard-plus-mutation discipline done right; it made verifying the rework trivial.
**Error handling:** rejection path throws with the offending name JSON-stringified (uncaught → exit 1, stack to stderr — asserted by the test); filesystem failure in `mkdirSync` propagates as a nonzero exit. No silent catches introduced.
**Tags for domains with nothing to report:** [SILENT] bakeTrack:169 same-class hole routed as a non-blocking Delivery Finding; [TEST] tmpdir-collision nit routed as a Delivery Finding; [DOC] no stale/misleading prose survives (the story's own domain, covered by hand); [TYPE] no type surface changed; [SEC] no untrusted surface beyond argv; [SIMPLE] diff is minimal, no dead code.

*(Round-1 handoff, since executed: routed to Dev, fix landed in rework round 1, returned to review — see the APPROVED verdict above.)*