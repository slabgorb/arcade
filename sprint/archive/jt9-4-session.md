---
story_id: "jt9-4"
jira_key: "jt9-4"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-4: The bake's synth-spec gate is itself unguarded — only the missing-outDir throw is pinned

## Story Details
- **ID:** jt9-4
- **Jira Key:** jt9-4
- **Workflow:** tdd
- **Stack Parent:** none
- **Type:** chore
- **Points:** 2
- **Priority:** p1
- **Branch:** main
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-03T12:19:36Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-03T11:25:22Z | 2026-08-03T11:27:32Z | 2m 10s |
| red | 2026-08-03T11:27:32Z | 2026-08-03T11:48:15Z | 20m 43s |
| green | 2026-08-03T11:48:15Z | 2026-08-03T12:00:07Z | 11m 52s |
| review | 2026-08-03T12:00:07Z | 2026-08-03T12:19:36Z | 19m 29s |
| finish | 2026-08-03T12:19:36Z | - | - |

### Branch and Context
**Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)
**Context File:** sprint/context/context-story-jt9-4.md ✓ (created)

## Background

**Epic:** jt9 — Joust — the remainder, re-ordered: apparatus, gameplay, geometry, brains, dossier

**Story Context:** The `bakeSamples` function throws on two error conditions to guard against uploading unbaked manifest entries to the R2 bucket under `just deploy-assets` (which runs under `set -euo pipefail`). However, only the missing-outDir throw is currently pinned in the test suite; the missing-spec and missing-duration throws are completely unguarded. A mutation that removes either throw would pass all 2499+ joust tests. This story pins both guards with specific message assertions.

## Delivery Findings

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### SM (setup research)

- **Observation** (non-blocking, ROUTED): Centipede's bake (`plugins/centipede/tools/pokey-bake/bake-sfx.mjs:286-289`) has an identical missing-spec gate with identical unarguability. It uses a different architecture (FIXTURE-based) and does not have an explicit FRAME_DURATIONS check, but the same issue applies: the gate is unguarded by any test. Routed to findings for SM to file a parallel story.

- **Technical note** (non-blocking): The story's original line citations (bake-samples.mjs:305-306, :311) drifted to :316-318 and :322 (measured 2026-08-03). SM verification: missing-outDir is still at :311, missing-spec is at :316-318, missing-duration is at :322. Cite by statement content, not line number, in test messages.

### TEA (test design)

- **Gap** (non-blocking, NEEDS A STORY ID — request: `cp6-3`): **SM's withdrawal of setup's centipede finding was right on the facts and wrong on the conclusion. centipede's guard IS present, and it IS holed — measured, not argued.** SM correctly overturned setup's "centipede is unguarded": `plugins/centipede/tools/pokey-bake/bake-sfx.test.mjs:190-205` does inject a rogue manifest. But SM's suspicion that `.rejects.toThrow(/aCueNobodyBaked/)` is too weak is CONFIRMED by mutation. Three mutants, run against `--project centipede`:
  - **C-M2** — the primary gate `if (!known && !standIn) {` replaced by `if (false) {`, i.e. the missing-spec gate DELETED: **the whole centipede project stays green, 61 files / 1118 tests, 0 failed**, including the very test written to pin it. It survives because `bakeSfx` carries a SECOND throw a few lines down (`no bake spec for manifest cue '${cue}' — no ROM table and no stand-in`) which also interpolates the cue name, so the name-only regex cannot tell the two apart.
  - **C-M3** — the primary message reworded wholesale (`no bake spec for manifest cue` → `no spec at all for cue`), cue name kept: **green**. The message is not pinned at all; only the cue name is.
  - **C-M4** — the cue name dropped from the message, text kept: RED. So the guard pins exactly one thing, the interpolation.
  This is **not a live safety regression** — the fallback throw still aborts `just deploy-assets` — so it is a guard-strength defect, not a deploy hole. Severity LOW-MEDIUM. It is the same weak form jt9-4 exists to remove, and after this story joust and centipede are asymmetric on the identical seam. `sprint/epic-cp6.yaml` currently holds cp6-1 (done) and cp6-2 (in_review, the story that shipped this guard), so **cp6-3** is the natural id. Per the standing rule an archive note is not enough — this needs filing.

- **Question** (non-blocking, for jt9-5): jt9-4 now pins `no FRAME_DURATIONS entry for '<name>' — the ROM window sizes the file` with `toBe` on the whole message, in TWO tests — including one that drives it with an entry of **0** rather than a missing entry. jt9-5's whole point is that a `kind: invention` cue gets `framesFor() === 0` and this message then lies (there IS an entry). **jt9-5 must edit `bake-samples.test.mjs` when it changes that message; the tests will redden and that is deliberate** — it is what turns jt9-5's fix from prose into a visible change. Flagging so jt9-5 is not surprised.

- **Improvement** (non-blocking, absorbed into this story): `SPECS[name]` is a bracket read on an object literal, so a manifest cue named after an `Object.prototype` member (`toString`, `valueOf`, `constructor`, `__proto__`) inherits a truthy value, **sails past the missing-spec gate**, and then trips the FRAME_DURATIONS gate instead — the right cue name attached to the wrong diagnosis. This is check 3 of the repo's own `.pennyfarthing/gates/lang-review/javascript.md` ("bracket notation with user input — prototype access"). A guard for it is in the RED set; the one-line fix is `Object.hasOwn`. See Design Deviations.

### Dev (implementation)

- No upstream findings during implementation. TEA's diff applied verbatim; independent re-run of all 19 mutants matched TEA's per-guard table exactly (see Dev Assessment for the full list). The one open item — `cp6-3` filing for centipede's own weak guard — was already filed as `cp6-4` per `git log` (commit `973bc53`, "file cp6-4 — and narrow it, because half the finding went stale in a day") before I picked this story up; nothing further to route.

### Reviewer (code review)

- **Gap** (non-blocking, FILED as `jt9-32`): nothing pins WHAT the joust bake produces. Mutant R12 (`const RATE = 22050` → `24000`) survives all 101 tests across the four files that touch the bake, and the full joust project — every one of the eighteen shipped `.wav` files becomes different audio with no observer. jt5-2's suite pins shape (decodable, format, sane rate, not silence, pairwise distinct) and pins determinism across two runs of the *same* code, which is the near miss: a constant change moves both sides together. Compounded by `@shared/audio` degrading silently, by the deploy-assets recipe's unverified "re-uploads byte-identical files" idempotency claim, and by CI never diffing the bucket. Affects `plugins/joust/tools/sample-bake/bake-samples.test.mjs` (needs a golden per-file sha256 table, RED under R12, GREEN unmutated). **Pre-existing (jt5-2), not this story's regression** — jt9-4's own byte-identity was proven out of band (combined sha256 `4499a28b…` identical pre- and post-refactor). *Found by Reviewer during code review.*

- **Improvement** (non-blocking, FIXED IN PLACE this review): the CLI's own refusal was pinned only by `expect(run.status).not.toBe(0)` while the test's name promised "loudly". Mutant R7 blanked `console.error('usage: node bake-samples.mjs <outDir>')` and survived. This is a *second, different* refusal from the one the story sharpened — the `if (!dir)` arm exits 2 without ever reaching `bakeSamples`'s `usage:` throw — so the file's own claim to have removed the weak form "everywhere else" was false by one describe block. A stderr assertion now backs the name; R7 re-run and RED, control GREEN. *Found by Reviewer during code review.*

- **Improvement** (non-blocking, FIXED IN PLACE this review): the line citation at the head of the jt9-4 block (`:316-318/:322`) was measured at RED and made stale by GREEN — Dev's own twelve-line header paragraph pushed the throws to `:330-332/:336`. A comment-only edit breaking a line citation is the exact drift the sentence containing it is *about*, so it is corrected to three positions and kept as the worked example rather than deleted. *Found by Reviewer during code review.*

- **Gap** (non-blocking, FIXED IN PLACE this review): TEA's warning that jt9-5 must edit `bake-samples.test.mjs` lived only in this session file and in a test comment. The session file is archived at finish, and a story's author plans from the story record — which said nothing. A `READ THIS BEFORE PLANNING` paragraph is now in `sprint/epic-jt9.yaml`'s jt9-5 entry, naming the two tests, the `toBe` assertion and the entry-of-`0` probe. The test-comment mechanism (jt9-5 arrives as a RED test) is good and stays; this just means the author is not surprised by it. *Found by Reviewer during code review.*

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **The refactor is NOT in this commit, by design.** SM's dispatch listed "the refactor plus the guards" as the TEA deliverable. The TEA agent definition is unambiguous the other way (`CANNOT: Modify source files, implement features`), and shipping the refactor here would have left the story green on arrival with no RED for Dev to close — the opposite of what a pinning story is for. So: the tests are committed RED, and the exact refactor is handed to Dev below, already measured against the full battery. Zero design work is left; it is a paste. If SM wants it merged into the RED commit instead, say so and it is one command.
- **Injection shape: `opts.sounds` AND `opts.frameDurations`, not an exported `SPECS`.** Spec said "either an injectable manifest or exporting SPECS"; tests use the parameter form, for three measured reasons. (1) It mirrors centipede's `bakeSfx(outDir, opts = {})` (cp6-2), which SM asked for. (2) `opts.sounds` alone **cannot reach the duration gate** — every cue with a SPECS row also has a FRAME_DURATIONS row, and a cue with neither trips the spec gate first — so a second override is required whatever else is chosen. (3) Exporting SPECS would make a live sentence in `plugins/joust/tests/audio-transporter-split.test.ts` FALSE: it reasons "SPECS is module-private, so behaviour is also the only honest reach". SPECS stays private.
- **Two overrides, and they are exactly the two records the tool imports from `audio-manifest.ts`** — not an arbitrary pair. That is the whole seam; nothing else is opened.
- **One hardening beyond "change no behaviour": `Object.hasOwn`.** SM said not to refactor the throws away. This does the reverse — it makes the spec gate fire in a case where it currently does not. Flagged as a deviation rather than absorbed silently, because "change no behaviour" was the stated constraint and this changes behaviour for one input class. If SM or Reviewer rules it out of scope, delete the single test `a cue named after an Object.prototype member is NOT waved through` and the `Object.hasOwn` line; nothing else depends on either.
- **Mutation loop run directly rather than through `testing-runner`.** The subagent ran the baseline and the final three-command verification. The 19-mutant battery was driven by a script in the scratchpad against the single suite file, because each mutant needs the exact per-test red list and 19 subagent round-trips would lose that. Strictly sequential throughout — never two runs against the tree at once (jt9-3's Dev got a false failure that way).

### Dev (implementation)

- **`Object.hasOwn` KEPT, not dropped.** This is the one judgment call the dispatch left to Dev: TEA's diff is a one-line behaviour change (`SPECS[name]` → `Object.hasOwn(SPECS, name) ? SPECS[name] : undefined`) inside a story whose text says "no production behaviour change." Ruling: keep it, for three reasons. (1) It fixes a real, independently-named defect class — the repo's own `.pennyfarthing/gates/lang-review/javascript.md` check 3 ("bracket notation with user input — prototype access") is precisely this shape: a manifest cue named `toString` (or `valueOf`, `constructor`, …) inherits an `Object.prototype` member through the bracket read, is truthy, sails past the missing-spec gate, and then mis-fires the FRAME_DURATIONS gate instead — the right cue name attached to the wrong diagnosis. (2) It is one line, on the exact lookup this story's own refactor is already touching (the `for` loop body), not a drive-by change elsewhere. (3) It ships with its own dedicated test (`a cue named after an Object.prototype member is NOT waved through`), already written into the RED set and independently confirmed by my own re-run of mutant M9 (`SPECS[name]` restored, `Object.hasOwn` removed) to redden exactly that one test and nothing else — deleting the fix without deleting the test would leave a guard for a fix that isn't there, which is the worse of the two options the dispatch posed. Read narrowly, "no production behaviour change" scoped the two THROWS themselves (don't redesign when/why they fire) — not a blanket ban on closing an adjacent, cheaply-fixed misdiagnosis in the same function while it's already open. If the Reviewer disagrees, the dispatch's own escape hatch applies: delete the `Object.hasOwn` line and its one test together, nothing else depends on either.
- No other deviations. The refactor was applied verbatim from TEA's diff; the only addition beyond the diff itself was the header-comment paragraph the handoff explicitly asked for ("WHY THIS FILE IMPORTS THE MANIFEST... jt9-4 gave it a reason to"), which is documentation, not behaviour.

## Sm Assessment

**Routing:** tdd (phased) → red → TEA

**Test count baseline (2026-08-03):** `npx vitest run --project joust` reports 2510 tests in 104 files (unchanged from jt9-3's verified count). jt9-3 added 11 tests to two existing suites; this story adds tests to `bake-samples.test.mjs` (a new file group, not a new file).

**Refactor choice — Tea owns it:** The story description proposes two options: (a) making `bakeSamples` accept an injectable manifest as an optional parameter, or (b) exporting SPECS. Both are viable. Either option must preserve the justfile recipe's existing call (`node bake-samples.mjs "$staging/joust/sfx"` with no optional arguments) and must not introduce new linter errors. The choice between them (parameter vs export) is a design call; the constraints are yours to establish.

**Centipede finding routed:** The missing-spec gate in centipede's bake-sfx.mjs (lines 286-289 and 294) is unguarded for the same reason joust's is. This is NOT in scope for jt9-4. Document it plainly in Delivery Findings (done above) so SM can file a follow-up story.

**Not in scope:** Sharpening the existing `bake-samples.test.mjs:119` test from bare `rejects.toThrow()` to `rejects.toThrow(/specific message/)` is a nice-to-have but not a blocker. The REAL guard is the new tests for the missing-spec and missing-duration paths. If the existing test survives the changes, it is fine to leave it as is.

**Branch:** none. Trunk-based (arcade). Work lands on `main` directly, as jt9-1, jt9-2, and jt9-3 did.

## Tea Assessment

**Tests Required:** Yes — the entire deliverable is guarding two unguarded throws.

**Test Files:**
- `plugins/joust/tools/sample-bake/bake-samples.test.mjs` — 8 new guards, 1 existing guard sharpened, 1 new guard split out of it. No new test FILE (see "the file-count guard" below).

**Tests Written:** 10 new-or-changed guards (2510 → 2519 tests). **Status: RED — 5 failing, by design.**

**Commits:** `4c85600` (RED) and `f0ba370` (the battery record).

### What was re-measured before anything was built

Every claim in the dispatch was re-opened. Results:

| Claim | Verdict |
|---|---|
| `bake-samples.mjs:316-317` / `:322` are the two throws | **Confirmed**, and now cited by SYMBOL: both live in `bakeSamples`, the `if (!spec)` arm and the `if (!(frames > 0))` arm. |
| "SOUNDS and SPECS are both module-scope consts" (story text) | **False, as setup said.** `SOUNDS` and `FRAME_DURATIONS` are IMPORTED from `src/shell/audio-manifest.ts` (`bake-samples.mjs`, the import beside `export { SOUNDS }`); only `SPECS` is local. This is what forced the two-override shape — see Design Deviations. |
| "nothing anywhere asserts the missing-spec or missing-duration throws" | **Confirmed.** Search stated below. |
| The justfile recipe calls it with one argument, under `set -euo pipefail` | **Confirmed**, `justfile` recipe `deploy-assets`: `set -euo pipefail` on line 3 of the recipe, four bakes staged into one `mktemp -d` and a single `deploy-r2.mjs` upload after all four. A throw in joust's bake therefore discards star-wars' and centipede's staging too and uploads nothing. |
| A new test file would redden `audio-seam-scope.test.ts`'s derived file count | **Not applicable, and checked rather than assumed.** That guard counts test FILES via `walk(plugins/joust)` — `tools/sample-bake/` IS inside it (its own comment says so: "Note the two `.mjs` files under tools/sample-bake/"). But these guards went into an EXISTING file, so the count is unchanged: **104 before, 104 after**. The TEST count is explicitly in that file's "NOT DERIVABLE / indicative" column, so 2510 → 2519 reddens nothing. No jt9-28 interaction. |
| Baseline | **104 files / 2510 tests green**, matching SM. |

**The absence claim, with its search stated.** `grep -rn` for the literal strings `no synth spec` and `FRAME_DURATIONS entry` across the whole repo excluding `node_modules`, `.git` and `dist`, plus `grep -rln bakeSamples` for every file that mentions the function at all. Outside `sprint/` (story text, context, archives) the only hits are: the throws themselves in `bake-samples.mjs`; a comment in the same file; and `plugins/joust/tests/audio-transporter-split.test.ts` around the jt5-6 AC4 block — which asserts the bake **`.resolves`**, i.e. that the throw does NOT fire. Nothing asserted either throw. Confirmed.

### The guards

Five RED on arrival, five green-on-arrival — and which is which is stated, not left to be discovered:

| Guard | On arrival |
|---|---|
| a RENAMED file in the injected manifest is the file actually written | **RED** |
| the missing-spec gate fires with ITS message, naming the cue | **RED** |
| a cue named after an `Object.prototype` member is NOT waved through | **RED** |
| the missing-duration gate fires with ITS message, naming the cue | **RED** |
| a window of ZERO frames is refused too | **RED** |
| an empty `opts` bakes the shipped manifest (the recipe's call is untouched) | green — backward-compat guard |
| POSITIVE CONTROL: that same manifest MINUS the rogue cue bakes clean | green — control |
| POSITIVE CONTROL: the shipped durations, passed EXPLICITLY, bake clean | green — control |
| refuses to run without an explicit output directory — by THAT message | green — the sharpened `:119` |
| an EMPTY output directory is refused too (`length === 0`) | green — new, previously free to delete |

**Every assertion is `toBe` on the entire message.** SM's warning was the design driver: both gates interpolate the cue name, so `/aCueNobodyBaked/` cannot tell them apart. That is not hypothetical here — the `Object.prototype` guard is a case where the WRONG gate fires with the RIGHT cue name, and a name-only regex passes it.

### Non-vacuity

Two explicit positive controls (`{ ...BAKE_SOUNDS }` with nothing removed; `FRAME_DURATIONS` passed straight back in) prove the injected object is real and the injection path itself does not throw. A `bakeFailure()` helper asserts `toBeInstanceOf(Error)` before any message is read, so a bake that RESOLVES can never leave a message assertion unrun — which is exactly how the pre-refactor `bakeSamples` behaves. And the two duration probes deliberately name DIFFERENT cues (`playerWingUp`, `enemyThud`) so a hardcoded name in the message cannot satisfy both.

### The mutation battery — 19 mutants, 0 survivors

Full verbatim table is in the test file's jt9-4 header block; each guard carries the mutant ids that redden it. Every one of the ten guards reddens under at least one mutant. Honest reading of the coverage:

- **Best covered:** the `Object.prototype` guard (9 mutants) and the missing-spec guard (7).
- **Thinnest, and named as such:** the two positive controls redden only under M3/M5/M16/M18 — mutants that break the bake outright. That is correct for a control and no targeted mutant *should* redden them; it is reported so nobody mistakes it for coverage.
- **M3 and M5 (`if (!spec)` → `if (spec)`, `if (!(frames > 0))` → `if (frames > 0)`) are the RESTRICTIVE inversions the project memory demands.** M7, M9, M14, M15 and M19 are permissive; they are included because each REDDENED, which is informative — the rule is that a permissive mutant's *survival* proves nothing, not that it must not be run.
- **M11 and M12 are decoys**, hardcoding into the message the very cue name one probe uses. Neither is caught by that probe. Both are caught by the second, differently-named probe — which is why the second probe exists.

**The battery found a real fact that reasoning had missed:** M7 (delete the `|| outDir.length === 0` clause) wrote all eighteen `.wav` files into the **repo root** — `join('', …)` is relative and vitest's cwd is the root, not the plugin, so `audio-seam-scope.test.ts` does not walk there. They were removed by hand. My first draft of that guard's comment said "the plugin tree"; it now says what was measured.

**What no mutation has exercised:** nothing among the ten. But the battery only ever mutated `bake-samples.mjs` — it did **not** mutate `audio-manifest.ts`, so the claim "the control passes the bake's OWN `FRAME_DURATIONS` instance" rests on the import path, not on a mutant. Reviewer may want one there.

**Status goal met:** 104 files (unchanged), `npm run lint` clean, `npm run test:orchestrator` 390 pass / 0 fail (unchanged).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/joust/tools/sample-bake/bake-samples.mjs` — applied TEA's exact diff verbatim: `bakeSamples(outDir, opts = {})`, `opts.sounds ?? SOUNDS` / `opts.frameDurations ?? FRAME_DURATIONS`, `Object.hasOwn(SPECS, name) ? SPECS[name] : undefined`, write path switched to `sounds[name]`. Also added the "jt9-4: `opts.sounds` / `opts.frameDurations`" header paragraph the handoff asked for, explaining the seam (the pre-existing "WHY THIS FILE IMPORTS THE MANIFEST" paragraph explained the throw but not the injection).

**Tests:** 104/104 files, 2519/2519 passing (GREEN) — matches TEA's predicted count exactly, confirmed AFTER the SM's 8-commit upstream pull (cp6-2 completion, sw8-27 setup, cp6-4 filing), so no drift landed between RED and GREEN.
**Branch:** main (trunk-based, no branch — pushed by virtue of committing straight to main)

**Verification (run sequentially, one command at a time, per the story's own caution about racing testing-runner subagents):**
- `npx vitest run --project joust` → **104 files / 2519 tests, all green** (was 5 failed pre-refactor).
- `npm run lint` → clean (`tsc --noEmit`, exit 0).
- `npm run test:orchestrator` → **390 pass / 0 fail**, unchanged from TEA's baseline.

**Independent re-run of the full 19-mutant battery** (all 19, not just the minimum 7 asked for), via a scratch Python script (`jt9-4-mutate.py`) that snapshots the GREEN file to a backup and restores from THAT — not `git checkout --`, which would have reverted to the pre-refactor RED state since the refactor isn't committed yet. Every mutant reddened, and the per-guard breakdown matched TEA's documented table exactly:

| Mutant | Failed | Test(s) reddened |
|---|---|---|
| M1 (`sounds = SOUNDS`, drop override) | 3 | renamed-file, missing-spec, Object.prototype |
| M2 (`frameDurations = FRAME_DURATIONS`, drop override) | 2 | missing-duration, zero-frames |
| M3 (`if (!spec)` → `if (spec)`, RESTRICTIVE) | 14 | blunt breakage incl. both positive controls |
| M4 (spec message reworded, name kept) | 2 | missing-spec, Object.prototype |
| M5 (`if (!(frames>0))` → `if (frames>0)`, RESTRICTIVE) | 14 | blunt breakage incl. both positive controls |
| M6 (duration message reworded, name kept) | 2 | missing-duration, zero-frames |
| M7 (drop `outDir.length === 0` clause) | 1 | empty-string outDir guard only |
| M8 (outDir usage message reworded) | 2 | both outDir-throw tests |
| M9 (`Object.hasOwn` removed) | 1 | Object.prototype guard only |
| M10 (write path back to `SOUNDS[name]`) | 1 | renamed-file guard only |
| M11 (spec message name hardcoded to `aCueNobodyBaked`, a decoy) | 1 | Object.prototype guard (differently-named probe) |
| M12 (duration message name hardcoded to `playerWingUp`, a decoy) | 1 | zero-frames guard (differently-named probe) |
| M13 (`Object.keys(sounds)` → `Object.keys(SOUNDS)`) | 2 | missing-spec, Object.prototype |
| M14 (`if (!spec)` → `if (spec === null)`) | 2 | missing-spec, Object.prototype |
| M15 (`if (!(frames>0))` → `if (frames === undefined)`) | 1 | zero-frames guard only |
| M16 (`opts.sounds ?? {}`) | 10 | wide breakage |
| M17 (drop `opts = {}` default) | 6 | wide breakage (recipe's 1-arg call form) |
| M18 (`opts.frameDurations ?? {}`) | 11 | wide breakage |
| M19 (whole outDir-guard block deleted) | 2 | both outDir-throw tests |

**0 survivors, 19/19 caught — independently confirmed, not just re-trusted from TEA's record.** After the M7 run, 18 stray `.wav` files appeared at the repo root exactly as TEA's note predicted (`join('', name)` is relative, vitest's cwd is the repo root) — removed by hand before continuing; `git status --porcelain` confirmed clean after every single mutant's revert and again at the end.

**Ruling on `Object.hasOwn`:** KEPT. Full reasoning in Design Deviations > Dev (implementation). Short version: one line, fixes a real prototype-bracket-read misdiagnosis the repo's own lint gate names, ships with its own test that the mutation battery confirms is load-bearing (M9), and "no production behaviour change" reads as scoped to the two throws' conditions/timing, not as a ban on closing an adjacent one-line defect in the exact code this story already opens.

**Handoff:** To review.

## Reviewer Assessment

**Verdict:** APPROVED

Two agents ran the same 19-mutant battery and got the same numbers, which is one experiment run twice. So this review ran a **different** battery: 12 mutants nobody had run, plus independent re-measurement of all 19. **Two survivors**, both now closed — one fixed in place, one filed.

Eight of nine specialists are disabled in this repo (`workflow.reviewer_subagents`), so per the standing sidecar rule the mutation battery *is* the review. 31 mutations were run for this verdict; the table is in `## Subagent Results` below.

### Findings

| Severity | Issue | Location | Disposition |
|----------|-------|----------|-------------|
| [MEDIUM] | The CLI refusal was still weakly pinned — the test is named "refuses, **loudly**" and nothing checked loudness. Mutant **R7** (`console.error('usage: node bake-samples.mjs <outDir>')` → `console.error('')`) **SURVIVED** the whole suite | `bake-samples.test.mjs` (`node bake-samples.mjs` with no directory refuses, loudly) | **FIXED IN PLACE** — stderr assertion added; R7 re-run and now RED, unmutated control GREEN, R8 still RED |
| [LOW] | Baked audio CONTENT is unpinned. Mutant **R12** (`RATE 22050` → `24000`) **SURVIVED** 101/101 — all eighteen shipped `.wav` files change and nothing notices | `bake-samples.test.mjs` (jt5-2 suite, pre-existing) | **FILED as jt9-32** (1pt, p3) with R12 as the acceptance mutant |
| [LOW] | Stale line citation caused by *this story's own commit* — `:316-318/:322` was true at RED, and Dev's 12-line header paragraph pushed the throws to `:330-332/:336` | `bake-samples.test.mjs:277-279` | **FIXED IN PLACE** — corrected to three positions and left as the worked example |
| [LOW] | jt9-5's story record carried no warning that jt9-4 pins the message jt9-5 must change | `sprint/epic-jt9.yaml` (jt9-5) | **FIXED IN PLACE** — READ THIS BEFORE PLANNING paragraph added to the record (the session file gets archived; the record does not) |

No Critical, no High. Nothing blocks.

### Deviation audit

- **TEA — refactor withheld from the RED commit.** ACCEPTED. Correct reading of the agent definition; shipping it would have made the story green on arrival.
- **TEA — `opts.sounds`/`opts.frameDurations` rather than exporting `SPECS`.** ACCEPTED, and reason (2) independently verified: every one of the 18 shipped cues has a `>0` window, so `opts.sounds` alone genuinely cannot reach the duration gate. `SPECS` confirmed still module-private (`export` appears twice in the module: `SOUNDS` and `bakeSamples`), so `audio-transporter-split.test.ts`'s sentence stays true.
- **TEA — mutation loop run directly rather than via `testing-runner`.** ACCEPTED; per-test red lists are the whole product and would not survive the round trip.
- **Dev — `Object.hasOwn` KEPT.** **ACCEPTED, and its justification is now measured rather than asserted.** Both agents *described* the pre-fix misdiagnosis; neither printed it. I did, by reverting the hardening and calling the bake with a `toString` cue:
  - pre-fix: `no FRAME_DURATIONS entry for 'toString' — the ROM window sizes the file` (right cue, **wrong** gate)
  - as shipped: `no synth spec for manifest cue 'toString' — a new cue must arrive with its own sound`
  **Completeness checked across all three bracket reads in the function, because a half-applied fix is worse than none:** `SPECS[name]` was the only exploitable one and it is hardened. `frameDurations[name]` needs no `hasOwn` — every `Object.prototype` member is a function or object, so `!(frames > 0)` rejects all of them on value; a bypass would need an inherited *number* greater than zero, which does not exist. `sounds[name]` needs none either — `name` comes from `Object.keys(sounds)`, which yields own enumerable keys only, so it can never be inherited. The fix is complete, not half-applied. Scoping argument accepted: "no behaviour change" governed the two throws' conditions, and this changes which of them fires for one impossible-today input class, with its own load-bearing test.
- **UNDOCUMENTED deviations found:** none.

### Mandatory steps

- **Data flow traced end to end.** A manifest cue name is the user input: `Object.keys(sounds)` → `Object.hasOwn(SPECS, name) ? SPECS[name] : undefined` (prototype-safe) → `if (!spec)` throw → `frameDurations[name]` → `if (!(frames > 0))` throw (value-checked, so prototype-safe by construction) → `Math.round((frames / FRAME_HZ) * RATE)` → `writeFileSync(join(outDir, sounds[name]), …)`. Safe at every hop; the only unguarded axis is the *content* of the last one, which is jt9-32.
- **Wiring verified by execution, not by reading.** The justfile recipe's exact form — `node plugins/joust/tools/sample-bake/bake-samples.mjs "$staging/joust/sfx"`, one argument, plain node, from the repo root (justfile:286) — exits 0 and stages 18 files.
- **The refactor changed nothing that ships. Proven, not assumed.** The pre-refactor module (`a4e43e9^`) and the shipped one were each baked into a temp directory: same 18 filenames, `diff -r` clean, combined sha256 `4499a28b47e95eb778d2f33d92c50a6de0a6ff43a70fbb172d686992992c9962` on both sides. **This had to be done by hand precisely because R12 proves the suite cannot see it** — the one place where the two headline findings meet.
- **Error handling:** all three throw paths exercised; the silent-degrade shape (R3: gate `continue`s instead of throwing — the story's actual threat model, and a mutant the battery never ran) reddens two guards.
- **Security:** the one class that applies here is prototype pollution via bracket reads on attacker-shaped keys — audited above, all three reads clear. No auth, network or secret surface in a build-time synth tool.

### Observations (10)

1. **VERIFIED GOOD — every one of TEA's ten "Reddened by:" citations is exactly right.** I re-ran 18 of the 19 mutants and compared per-guard red sets: all ten lists match, with no missing and no spurious entries. The five uniqueness claims ("M7/M10/M12/M15 seen by this test and nothing else", "the only one that sees M9 or M11") each reddened exactly the one named test out of 101. Given this repo has a whole story class about mislabelled citations, that is worth recording as a clean result.
2. **VERIFIED GOOD — the "M3 and M5 redden fourteen tests each" claim is exact.** 14 in `bake-samples.test.mjs`; my four-file run shows 20 across the joust project, the extra 6 being `audio-transporter-split.test.ts`. The number is right and correctly scoped to the suite it names.
3. **TEA's concession about the positive controls is accurate and does NOT understate it.** G6 reddens only under M3/M5/M18 and G10 only under M3/M5/M16 — and none of my 12 novel mutants touched either. So there is genuinely no targeted mutant reaching either control. That is what a control is; their value is non-vacuity insurance for the negative tests, and `bakeFailure()`'s `toBeInstanceOf(Error)` is the better-aimed version of the same idea.
4. **Guards nobody had exercised held anyway.** Six novel mutants aimed at the gate logic all died: R1 gate ORDER (duration checked first) reddens 2; R3 SILENT DEGRADE (`continue` instead of throw) reddens 2; R4 the classic off-by-one `!(frames >= 0)` reddens the zero-window test; R5 iterating `Object.keys(frameDurations)` reddens 3; R6 `hasOwn` on the wrong record reddens the prototype test; R10 reading `FRAME_DURATIONS` at the use site reddens 2. R2 (the two gate messages swapped) reddens all four message guards.
5. **The `bakeFailure()` helper is the right shape.** The failure mode for a family of message tests is the bake *resolving* so the assertion never runs; asserting `toBeInstanceOf(Error)` inside the helper makes that unforgettable rather than per-test discipline.
6. **Every message assertion is `toBe` on a whole string — checked individually, none fell back to substring or regex.** Six of them. The story demanded exactly this and got it.
7. **Considered and declined: making `audio-seam-scope.test.ts` walk the repo root.** I reproduced M7's pollution myself (18 `.wav` at the root, removed). But that test's `root` is `plugins/joust` by design — it guards the *plugin tree* from growing binaries. Widening it to the repo would collide with star-wars' and centipede's own bake tooling and buy little: `git status` already surfaces stray root `.wav` (confirmed — nothing gitignores them), `git commit -a` cannot stage untracked files, and preflight confirms none were committed. Not a defect; no story filed, deliberately.
8. **cp6-4 verified on BOTH halves — SM's narrowing is correct and does not overstate.** I re-ran the mutation SM claims went stale: `if (!transcribed && !standIn)` → `if (false)` now reddens exactly the test SM named (`cp6-2 AC3 — … a manifest cue with no bake spec THROWS`), 1124/1125. And the surviving half reproduces: rewording centipede's diagnostic wholesale while keeping `${cue}` leaves 61 files / 1125 tests fully green. Both halves of the filing are accurate.
9. **The story's own status field is still `backlog`** while jt9-1/2/3 read `done`. That is the SM's finish step, not a defect — noted so it is not mistaken for one.
10. **One process note on my own method:** my first attempt at the centipede mutation failed to apply (a perl `s{}{}` whose replacement contained an unbalanced brace) and printed a full green run. A green suite from a mutation that never applied is the most persuasive wrong answer available — I only caught it because the harness prints the applied diff. Every mutation reported here was confirmed applied before its run.

**Handoff:** To SM for finish-story.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — joust 104 files / 2519 tests, lint clean, orchestrator 390/390, tree clean, no tracked `.wav`, no `.wav` in the story's commits. Independently re-run by the Reviewer. |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via `workflow.reviewer_subagents` |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via `workflow.reviewer_subagents` |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via `workflow.reviewer_subagents` |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via `workflow.reviewer_subagents` |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via `workflow.reviewer_subagents` |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via `workflow.reviewer_subagents` |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via `workflow.reviewer_subagents` |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via `workflow.reviewer_subagents` |

**All received: Yes**

The one enabled specialist returned clean, which is why the verdict rests on the 31-mutant battery instead: a clean preflight is the starting point of this review, not its conclusion.

## What remains for Dev (RED → GREEN)

**One file, one function, and the exact diff is below — it was applied, measured against all 19 mutants, confirmed to turn 5 RED into 19/19 green, and then reverted so the RED would be real.** Paste it.

```diff
--- a/plugins/joust/tools/sample-bake/bake-samples.mjs
+++ b/plugins/joust/tools/sample-bake/bake-samples.mjs
-export async function bakeSamples(outDir) {
+export async function bakeSamples(outDir, opts = {}) {
   if (typeof outDir !== 'string' || outDir.length === 0) {
     // No default on purpose: the plugin tree must never grow a .wav
     // (audio-seam-scope.test.ts forbids audio binaries anywhere under joust).
     throw new Error('usage: bakeSamples(outDir) — pass an explicit staging directory')
   }
-  for (const name of Object.keys(SOUNDS)) {
-    const spec = SPECS[name]
+  const sounds = opts.sounds ?? SOUNDS
+  const frameDurations = opts.frameDurations ?? FRAME_DURATIONS
+  for (const name of Object.keys(sounds)) {
+    const spec = Object.hasOwn(SPECS, name) ? SPECS[name] : undefined
     if (!spec) {
       throw new Error(
         `no synth spec for manifest cue '${name}' — a new cue must arrive with its own sound`,
       )
     }
-    const frames = FRAME_DURATIONS[name]
+    const frames = frameDurations[name]
     if (!(frames > 0)) {
       throw new Error(`no FRAME_DURATIONS entry for '${name}' — the ROM window sizes the file`)
     }
     const n = Math.round((frames / FRAME_HZ) * RATE)
     const samples = spec(n, mulberry32(seedFrom(name)))
-    writeFileSync(join(outDir, SOUNDS[name]), encodeWav(samples))
+    writeFileSync(join(outDir, sounds[name]), encodeWav(samples))
   }
 }
```

Then update the file's header comment — the "WHY THIS FILE IMPORTS THE MANIFEST" paragraph explains the throw but not the seam, and jt9-4 gave it a reason to.

### Five traps, each one measured as a mutant that reddens

1. **Do NOT give `bakeSamples` a return value.** centipede's `bakeSfx` returns `Object.keys(sounds).length` and mirroring it that far breaks `plugins/joust/tests/audio-transporter-split.test.ts`, which asserts `.resolves.toBeUndefined()`. Different game, different contract.
2. **`opts = {}` needs its default.** Without it the recipe's one-argument call throws a TypeError on `opts.sounds` (mutant M17: 6 tests red).
3. **The defaults are `?? SOUNDS` and `?? FRAME_DURATIONS`, not `?? {}`** (M16: 10 red; M18: 11 red).
4. **The write path must use `sounds[name]`, not `SOUNDS[name]`.** No throw test can see this — the rogue cue throws before anything is written. Only the renamed-file guard catches it (M10).
5. **`Object.hasOwn` is load-bearing** for the `Object.prototype` guard (M9), and it is the one line that changes behaviour rather than merely opening the seam. It is flagged in Design Deviations; if it gets ruled out of scope, delete that line and its one test together.

### Do not

- Export `SPECS`. It stays module-private — `audio-transporter-split.test.ts` reasons out loud that it is, and exporting it makes that sentence false.
- Touch `plugins/joust/src/`. Nothing there is in scope.
- Touch the `justfile`. The recipe's call is unchanged by construction, and there is a guard that it still works (`node bake-samples.mjs <outDir>` spawned under plain node).

### Verify

`npx vitest run --project joust` → **104 files / 2519 tests, all green**; `npm run lint` → clean; `npm run test:orchestrator` → **390 pass / 0 fail**. Run them one at a time.


## Sm Assessment

**Routing:** tdd (phased) → red → TEA. 2-point p1 pinning story, same family as jt9-3
which just shipped: the behaviour is correct, the guard is missing, and the deliverable
is a test that has been watched to fail.

**THE HEADLINE, AND IT OVERTURNS ONE OF SETUP'S OWN FINDINGS.** Setup reported that
centipede's parallel bake gate "has the identical missing-spec gate, also unguarded" and
recommended SM file a story for it. **That is false, and I re-opened it before believing
it.** cp6-2 landed within the last day and centipede's bake is guarded:
`plugins/centipede/tools/pokey-bake/bake-sfx.test.mjs:190-205` injects a rogue manifest
and asserts `.rejects.toThrow(/aCueNobodyBaked/)`. No story to file. Setup's finding 7 is
withdrawn.

**What that turns into instead is the most useful thing in this setup: the refactor jt9-4
calls for is already DESIGNED AND SHIPPED in a sibling game.** centipede's signature is
`export async function bakeSfx(outDir, opts = {})` (bake-sfx.mjs:274) with the manifest
injected as `opts.sounds`, plus `export { SOUNDS }` (:37). The justfile recipe still calls
`bakeSfx(staging)` with no second argument and is unaffected. That is precisely the
"either bakeSamples taking its manifest as an argument, or exporting SPECS" choice this
story poses — and one of the two options has a working precedent one directory over,
written by the same pipeline, one day ago. **TEA should mirror centipede's shape rather
than invent a third one.** Two games with the same seam and two different injection
idioms is a worse outcome than either idiom alone.

**But do NOT mirror centipede's ASSERTION — it is weaker than this story requires, and
it may be a defect in centipede.** jt9-4's text demands the test assert "the SPECIFIC
message, not just that something threw". centipede asserts `/aCueNobodyBaked/`, a regex
on the interpolated CUE NAME. joust's two throws BOTH interpolate the cue name:
`no synth spec for manifest cue '<name>'` (:316-317) and `no FRAME_DURATIONS entry for
'<name>'` (:322). So a name-only regex cannot tell those two apart — it would pass if the
wrong gate fired. TEA: assert the message text, and while you are there, rule on whether
centipede's guard has the same hole. If it does, that is a finding to FILE with a story
id, not to note (standing rule: an archive note alone is forgetting).

**Line drift, re-measured by SM.** The story's citations are from 2026-08-01 and all
three moved. Current: missing-outDir throw at **:311** (this is the one that IS pinned),
`no synth spec` at **:316-317**, `no FRAME_DURATIONS entry` at **:322**. Cite the SYMBOL,
not the line — jt9-3 measured a joust citation that moved three times in three days, and
jt9-30 exists to convert these refs wholesale.

**The existing pin is itself the weak form the story complains about.**
`bake-samples.test.mjs:119` is `await expect(bakeSamples()).rejects.toThrow()` — no
argument, so ANY throw satisfies it. Worth noticing that the one guard that exists
demonstrates the exact defect being fixed. Whether to strengthen it in passing is TEA's
call; it is cheap and in the spirit of the story, but it is not in the story's text.

**Non-vacuity is the risk here, not correctness.** A test that injects a manifest whose
cue is missing from SPECS proves nothing unless the manifest is otherwise REAL — if the
injected object is malformed in some other way, the bake may throw for an unrelated
reason and the test still passes. Setup already calls for a positive control; I am
restating it because `mutate-with-a-WRONG-value-not-the-old-one` is the exact trap: a
guard can ban a stale spelling and never compare the value.

**Branch:** none. Trunk-based; work lands on `main`, as jt9-1 through jt9-3 did.