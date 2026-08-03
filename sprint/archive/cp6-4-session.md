---
story_id: "cp6-4"
jira_key: "cp6-4"
epic: "cp6"
workflow: "trivial"
---
# Story cp6-4: centipede's rogue-manifest guard asserts only the interpolated cue name — rewording the diagnostic wholesale leaves it green

## Story Details
- **ID:** cp6-4
- **Jira Key:** cp6-4
- **Points:** 2
- **Priority:** p3
- **Repos:** arcade
- **Workflow:** trivial
- **Branch:** none
- **Stack Parent:** none

> Trunk-based. Work lands directly on `main`. The claim branch
> `feat/cp6-4-message-not-name` is pushed EMPTY (tip == `main` at 693a82b) purely so a
> sibling checkout's `git branch -r | grep cp6-4` probe sees the claim; nothing ever
> merges it.

> **Points raised 1 → 2 at setup, on measurement.** Filed as an assertion rewrite. The
> filing's conditional — "check whether the bracket reads have that same shape; if they
> do, `Object.hasOwn` belongs in this story" — was measured and the condition is MET, so
> the scope is now an assertion rewrite plus a two-line source hardening plus its own
> guard test. Still inside `trivial`'s 2-point ceiling.

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-08-03T20:13:22Z
**Round-Trip Count:** 0

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-03T15:20:00Z | 2026-08-03T19:07:31Z | 3h 47m |
| implement | 2026-08-03T19:07:31Z | 2026-08-03T19:17:39Z | 10m 8s |
| review | 2026-08-03T19:17:39Z | 2026-08-03T20:13:22Z | 55m 43s |
| finish | 2026-08-03T20:13:22Z | - | - |

## Acceptance Criteria

1. AC-1 THE ASSERTION PINS THE MESSAGE, NOT THE NAME. The `cp6-2 AC3 > a manifest cue with no bake spec THROWS` test in plugins/centipede/tools/pokey-bake/bake-sfx.test.mjs asserts the ENTIRE diagnostic string with `toBe`, not a regex on the interpolated cue name, and it asserts through a helper that FIRST proves an Error was actually thrown (joust bake-samples.test.mjs:100-112 is the worked shape). Measured at setup: rewording the message wholesale while keeping ${cue} leaves the file 25/25 GREEN; only deleting ${cue} reddens it. Under the new assertion the wholesale reword must redden.

2. AC-2 THE GUARD READS OWN PROPERTIES. The two bracket reads at bake-sfx.mjs:401-402 (`FIXTURE.cues[cue]` and `STAND_IN_SPECS[cue]`) become `Object.hasOwn` checks. This is NOT optional hardening: measured at setup, a manifest cue named `toString`, `constructor` or `valueOf` today bakes COMPLETELY CLEAN with no throw at all — bakeSfx returns 15 instead of 14 and writes a 44-byte header-only wav that just deploy-assets would upload as a silent cue. The mechanism is three undefined-vs-null comparisons that all read false on a prototype object: `known.freqTable !== null` reads the cue as transcribed, then romEvents `c.contImmediate === null` is false and `c.lengthFrames !== c.tableLengthBytes` is false, and the render loop runs zero iterations. Hardening the guard alone suffices because romEvents and standInEvents are only reached after it passes.

3. AC-3 THE PROTOTYPE HOLE HAS ITS OWN TEST, WITH ITS PRECONDITIONS ASSERTED. Follow joust bake-samples.test.mjs:589-621: assert that the value IS reachable by a bracket read and is NOT an own property, so a future reader can see the test still separates the two implementations, then assert the whole message. This story is worse than the joust case its filing predicted — joust got the right cue name beside the wrong diagnosis, centipede gets no diagnosis at all — so say that in the test prose rather than copying joust wording that understates it.

4. AC-4 MUTATION-PROVEN BOTH WAYS, EVERY MUTANT RECORDED VERBATIM. Baselines measured at setup: 25/25 in bake-sfx.test.mjs, 62 files / 1157 tests in the centipede project, and the hasOwn fix has a ZERO-red blast radius across all 1157 — so the tests written here ARE the entire observable deliverable. For each new or changed assertion name the source mutation that reddens it and paste the mutated string. At minimum: the wholesale message reword (green today, must redden) and the hasOwn revert (green today, must redden). A POSITIVE CONTROL must show the shipped 14-cue manifest still bakes clean, or the two tests above prove nothing about the gate.

## Sm Assessment

### What I measured, and what changed because of it

Every falsifiable claim in the filing was re-run against `main` at 693a82b before this
handoff. The battery below was applied to a `cp` backup of `bake-sfx.mjs` and restored
byte-identically after each run (`cmp` clean, `git status --short` empty).

| # | mutation | result | what it establishes |
|---|---|---|---|
| A | reword the diagnostic wholesale, KEEP `${cue}` | **25/25 GREEN** | the gap is real, exactly as filed |
| B | drop `${cue}`, keep the rest of the diagnostic | 1 red | the assertion pins the interpolation and nothing else |
| C | `if (!transcribed && !standIn)` → `if (false)` | 1 red | the dead-guard half is CLOSED |

Mutation C is the one worth naming: the finding as jt9-4's TEA originally measured it
claimed the guard was dead. It is not, and the filing's own SM narrowing already said so.
Re-measured here rather than inherited — `grep -c "no bake spec for manifest cue"` returns
1, the fallthrough dies in `standInEvents` on an undefined spec, and the test reddens. **No
work is owed on that half.**

**The joust precedent checks out.** `plugins/joust/tools/sample-bake/bake-samples.test.mjs`
asserts `expect(err.message).toBe(<whole string>)` at eight sites, through a `bakeFailure`
helper (`:100-112`) that first asserts an `Error` was actually thrown — which is what stops
a resolved bake from silently skipping the message assertion.

### The correction: the filing UNDERSTATES its own second half

The filing asked me to check whether centipede's bracket reads carry jt9-4's prototype
shape, and predicted joust's failure mode if they do — *"the right cue name appears beside
the wrong diagnosis"*. They do carry the shape, and **centipede's is worse: there is no
diagnosis at all.**

Probed directly against the real module under plain `node`:

```
cue 'toString':        BAKED CLEAN — no throw at all
cue 'constructor':     BAKED CLEAN — no throw at all
cue 'valueOf':         BAKED CLEAN — no throw at all
cue 'aCueNobodyBaked': threw Error: no bake spec for manifest cue 'aCueNobodyBaked' — ...
```

`bakeSfx` returns **15** where the shipped manifest returns 14, and writes `to_string.wav`
at **44 bytes** — a bare WAV header with zero audio frames, the artifact joust's own suite
describes as "a header with no audio in it". `just deploy-assets` would upload it.

The mechanism is three `undefined`-vs-`null` comparisons that all read false on a value
pulled off `Object.prototype`:

- `known.freqTable !== null` — `undefined !== null` is **true**, so the cue is classified
  *transcribed* and takes the ROM path;
- `romEvents`'s `!cont && c.contImmediate === null` — `undefined === null` is **false**, so
  the "refusing to invent a control byte" throw never fires;
- `c.lengthFrames !== c.tableLengthBytes` — `undefined !== undefined` is **false**, so the
  length-disagreement throw never fires either;
- then `for (let i = 0; i < c.lengthFrames; i++)` runs **zero** iterations against
  `undefined`, and a header-only file is written.

Three guards in a row, each of which reads as protection, and a prototype key walks past
all three. That is why this is an AC and not a footnote.

**The prescribed fix was verified before it was written into the ACs**, not merely
described: `Object.hasOwn` on the two reads at `bake-sfx.mjs:401-402` makes all four rogue
cues throw the correct diagnostic, and hardening the guard alone is sufficient because
`romEvents` and `standInEvents` are only reachable *after* it passes.

### Blast radius, and why it is not reassurance on its own

Under the fix: **62 files / 1157 tests, zero red** across the whole centipede project.

The standing rule here is that a near-zero radius is equally consistent with "nothing can
observe this" and "nothing can observe this going *wrong*", so it was paired with the
direction probe above rather than read as comfort. The direction is right, and the zero
means **no existing test observes this behaviour** — the tests written in this story are
the entire observable deliverable. Dev should size the work accordingly: the source change
is two lines and the tests are the story.

### Baselines for the implement phase

- `npx vitest run --project centipede tools/pokey-bake/bake-sfx.test.mjs` → **25 passed (25)**, 1 file
- `npx vitest run --project centipede` → **1157 passed (1157)**, 62 files
- `main` at **693a82b**; working tree clean at handoff

### Two things that are NOT in scope, both checked rather than assumed

- **No citation blast radius.** centipede's `tests/audio-citations.test.ts` is scoped to
  `src/main.ts` only; nothing cites `bake-sfx.mjs` by line, and the sole reference to the
  test file (`tests/audit/sound-dossier.test.ts:548`) is by path. Editing either file drifts
  no pin. This was worth checking — `jt9-35` re-anchored centipede's citations one commit
  before this setup.
- **The dead-guard claim must not be re-filed.** It was true when TEA measured it and is
  false now; two stories a day apart moved the code underneath it. Mutation C above is the
  proof, taken fresh.

### Handoff to Yoda (Dev)

Implement phase. The ACs are byte-identical in the epic YAML, this session and
`sprint/context/context-story-cp6-4.md`. Four things in order:

1. Rewrite the `cp6-2 AC3 > a manifest cue with no bake spec THROWS` assertion to `toBe` on
   the whole message, behind a thrown-Error helper (AC-1).
2. Harden `bake-sfx.mjs:401-402` with `Object.hasOwn` (AC-2).
3. Add the prototype-cue test with its two preconditions asserted (AC-3).
4. Run the mutation battery both ways and paste each mutant verbatim, plus the positive
   control (AC-4). Mutations A and C above are already written out — re-run them, do not
   copy my results.
## Design Deviations

### Dev (implementation)

- **The prototype fixture uses the SHIPPED objects, where joust constructs one**
  - Spec source: context-story-cp6-4.md, AC-3
  - Spec text: "Follow joust bake-samples.test.mjs:589-621: assert that the value IS reachable by a bracket read and is NOT an own property"
  - Implementation: both preconditions asserted exactly as specified, but against the real `STAND_IN_SPECS` with the cue name `toString`, rather than against `Object.assign(Object.create({...}), ...)` as joust does.
  - Rationale: joust's hole needed a constructed prototype because its trigger (`enemyThud: 42`) is not something `Object.prototype` supplies. centipede's is reachable through the shipped objects with **no injection at all** — that is what makes it worse than joust's, and a fixture that had to build its own prototype would have quietly understated it. The two preconditions the AC actually names are what keep the test honest, and both are asserted.
  - Severity: minor
  - Forward impact: none — the assertion shape and the preconditions match the AC; only the source of the inherited value differs.

- **The rogue-cue test now bakes into a throwaway directory, not the shared `staging`**
  - Spec source: context-story-cp6-4.md, Scope
  - Spec text: scope names "the `cp6-2 AC3` throw assertion, plus the new prototype-cue test and its positive control" — it does not mention the staging directory.
  - Implementation: added a `scratchDir(label)` helper; both throw-tests and the positive control use their own `mkdtemp` directory.
  - Rationale: `staging` is shared with `cp6-2 — bakeSfx(outDir) writes the manifest…`, whose first assertion is `readdirSync(staging)` equals exactly the fourteen shipped filenames. Before the fix, the prototype cue **writes a file**; had it written into `staging` it would have reddened that unrelated 14-file assertion, and the mutation battery below would have been reading a collision instead of the gate. This keeps each mutant's red list attributable.
  - Severity: minor
  - Forward impact: none — no existing assertion reads the rogue tests' output directory.

- **The prototype test also asserts the output directory is EMPTY**
  - Spec source: context-story-cp6-4.md, AC-3
  - Spec text: "assert that the value IS reachable by a bracket read and is NOT an own property … then assert the whole message"
  - Implementation: added a third assertion, `readdirSync(dir)` equals `[]`, after the message assertion.
  - Rationale: the message assertion pins that the gate FIRED; it does not pin that the gate fired *before the write*. The measured defect was a 44-byte file on disk, so the file's absence is the half of the finding a message cannot express. Pass 1 renders and pass 2 writes, so a gate that slid below the write would keep the message and lose the property.
  - Severity: minor
  - Forward impact: none — additive assertion on a new test.

## Delivery Findings

### Dev (implementation)

- **Gap** (non-blocking): three sibling bracket reads in the same file are still bare, and are protected only by REACHABILITY rather than by their own check — `romEvents`' `FIXTURE.cues[cue]` (`bake-sfx.mjs:218`), `audcStreamFor`'s `FIXTURE.cues[cue].pokeyVoice` (`:283`) and `standInEvents`' `STAND_IN_SPECS[cue]` (`:288`). The gate this story hardened now throws before any of them is reached with a prototype key, which is why the fix is complete as specified and why hardening them changes no behaviour today. But joust hardened **both** of its lookups (`SPECS[name]` and `frameDurations[name]`) rather than resting on reachability, and `audcStreamFor` is exported for the suite and callable directly with any string — so the reachability argument does not cover it at all. Affects `plugins/centipede/tools/pokey-bake/bake-sfx.mjs` (`:218`, `:283`, `:288` — either harden with `Object.hasOwn` or record why reachability is sufficient). *Found by Dev during implementation.*

- **Improvement** (non-blocking): with this story landed the four bakers are uniform, and the measurement is worth recording so nobody re-opens it — joust (`tools/sample-bake/bake-samples.mjs:328,339`) and star-wars' music bake (`tools/music-bake/bake-music.mjs:245`) already use `Object.hasOwn`; tempest's baker iterates `for (const spec of SFX)` over an ARRAY of spec objects (`tools/pokey-bake/bake-sfx.mjs:273`) and performs no name lookup at all, so it is structurally immune rather than merely fixed. centipede was the sole outlier. Affects nothing — this is a closed question, filed so the next fleet sweep can skip it. *Found by Dev during implementation.*

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/centipede/tools/pokey-bake/bake-sfx.mjs` — the two bracket reads in `bakeSfx`'s pass-1 loop become `Object.hasOwn` checks (AC-2), with a comment recording the measured defect and why the three downstream null-comparisons never caught it.
- `plugins/centipede/tools/pokey-bake/bake-sfx.test.mjs` — `bakeFailure` and `scratchDir` helpers; the `cp6-2 AC3` throw assertion rewritten from `.rejects.toThrow(/aCueNobodyBaked/)` to `toBe` on the whole message (AC-1); a new inherited-spec test (AC-3); a positive control (AC-4).

**Tests:** 27/27 in `bake-sfx.test.mjs` (was 25), 1159/1159 across the centipede project (was 1157), 390/390 orchestrator, `npm run lint` exit 0.

**Branch:** none — trunk-based, landed on `main`.

### The mutation battery (AC-4)

Applied one at a time to the GREEN tree by literal string replacement with an anchor
assertion, restored by `cp` from a backup — never `git checkout --`, because the story's
work was uncommitted throughout.

**CORRECTED in round 2 (review finding).** This paragraph originally ended "the script is
reproduced below each row." No script was reproduced anywhere, and M2/M2a/M2b/M3 were prose
descriptions rather than the verbatim replacement strings AC-4 requires — so the record
promised a reader they could re-run the battery when they could not. The round-2 battery
below carries the literal strings, and its script is committed at
`plugins/centipede/tools/pokey-bake/` review notes in the commit body rather than left in a
scratch directory. Round 1's table is kept as measured, with the elided entries spelled out.

| # | mutation | red | which tests |
|---|---|---|---|
| M1 | the whole diagnostic → `` `WOMBAT ${cue} BANANA` `` | **2** | both throw-tests |
| M2 | `const known = Object.hasOwn(FIXTURE.cues, cue) ? FIXTURE.cues[cue] : undefined` + the `standIn` line beneath it → `const known = FIXTURE.cues[cue]` / `const standIn = STAND_IN_SPECS[cue]` | 1 | inherited-spec |
| M2a | `const known = Object.hasOwn(FIXTURE.cues, cue) ? FIXTURE.cues[cue] : undefined` → `const known = FIXTURE.cues[cue]` | 1 | inherited-spec |
| M2b | `const standIn = Object.hasOwn(STAND_IN_SPECS, cue) ? STAND_IN_SPECS[cue] : undefined` → `const standIn = STAND_IN_SPECS[cue]` | 1 | inherited-spec |
| M3 | `manifest cue '${cue}'` → `manifest cue` | 2 | both throw-tests |
| M4 | `if (!transcribed && !standIn) {` → `if (false) {` | 2 | both throw-tests |
| M5 | CONTROL — inert comment edit inside the same loop | **0** | — |

**M1 is the story.** At setup this exact mutation left the file **25/25 GREEN**; it now
reddens two tests. That is the gap cp6-4 was filed to close, measured before and after on
the same string.

**M2a and M2b were run because AC-2 is a conjunction**, and the standing rule is that a
single mutant violating both halves tells you nothing about which half works. Each half
reddens on its own, by a different route: with `FIXTURE.cues` bare, `toString` is classified
*transcribed* and takes the ROM path; with `STAND_IN_SPECS` bare, `standIn` is truthy so the
gate's second conjunct is false and the bake falls into `standInEvents`. Both end in a
resolved bake, which `bakeFailure` reports as "the bake RESOLVED" rather than as a message
mismatch — the helper distinguishing the two failures is doing visible work.

**M5 stayed green**, so the battery is not reddening for a mechanical reason. It also
earned its place twice: the first attempt reported `ANCHOR MISS` because the anchor carried
four leading spaces where the file has two. An anchor miss that is not reported is
indistinguishable from a surviving mutant, which is the failure this harness is built to
refuse.

**No stray artifacts.** The battery drives a file-writing path, so `find . -name "*.wav"`
outside `node_modules` was run before `git status` — a clean porcelain on the source says
nothing about untracked binaries dropped elsewhere. Empty.

### One thing the setup measurement got exactly right, and one it did not have to guess

The predicted blast radius was zero and it was zero: no existing test observes this
behaviour, so the three tests here are the entire observable footprint and the source change
is two lines. The count moved 1157 → 1159 by exactly the two added tests.

What setup could not know is that both halves of AC-2 are independently load-bearing. That
came out of M2a/M2b, not out of reading the code.

**Handoff:** To review (Obi-Wan Kenobi).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — all four baselines independently reproduced |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | findings | 3 | confirmed 2, dismissed 0, deferred 1 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 3 | confirmed 3, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 7 confirmed (after cross-agent dedup), 0 dismissed, 1 deferred as out-of-scope

Note on independence: the four enabled specialists converged on `bake-sfx.mjs:414-415` from three
different directions — security by tracing exported entry points, comment-analyzer by executing
`audcStreamFor('toString')` against HEAD, rule-checker by grepping the defect PATTERN rather than
the AC's named location. I had reached the same line independently before any of them returned.
Four-way agreement on a claim I wrote is the strongest signal in this review.

## Design Deviations

### Reviewer (audit)

- **The prototype fixture uses the SHIPPED objects, where joust constructs one** → ✓ ACCEPTED by
  Reviewer: verified the reasoning holds. rule-checker confirmed by experiment that a spread key
  colliding with an `Object.prototype` member produces a real own enumerable property that
  `Object.keys` iterates (descriptor `{enumerable, writable, configurable}` all true), so the test
  does not pass for the wrong reason, and both preconditions the AC named are asserted. Using the
  shipped objects is the stronger fixture precisely because it needs no injection.

- **The rogue-cue test now bakes into a throwaway directory, not the shared `staging`** → ✓ ACCEPTED
  by Reviewer, and the rationale is stronger than Dev stated. Confirmed by running mutant R2 (write
  during pass 1): the bake drops all fourteen shipped files before the gate fires. Had these tests
  used the shared `staging`, that mutant — and M2/M2a/M2b, which complete the bake — would each have
  reddened the unrelated fourteen-file assertion at `:385` as collateral, and the battery's red
  counts would have been unattributable.

- **The prototype test also asserts the output directory is EMPTY** → ✓ ACCEPTED by Reviewer, and
  independently proven non-vacuous twice. My mutant R2 reddens it by name:
  `the gate must fire before anything is written: expected [ 'bonus_life.wav', …(13) ] to deeply
  equal []`. rule-checker reached the same conclusion via M2, observing the 44-byte `to_string.wav`
  land in the directory. This assertion was the one I most expected to be decoration; it is not.

### Reviewer (audit) — UNDOCUMENTED deviations found

- **AC-4 says "paste the mutated string"; four of seven entries are descriptions, not strings.**
  Spec source: context-story-cp6-4.md AC-4, "name the source mutation that reddens it and paste the
  mutated string." M1, M4 and M5 comply. M2 is recorded as `both Object.hasOwn(…) ? … : undefined →
  bare bracket reads` — the ellipses make it non-re-runnable as written. M2a, M2b and M3 are prose
  descriptions only. Not logged by Dev. Severity: M.

- **The battery table states "the script is reproduced below each row." No script is reproduced
  anywhere in the session.** Spec source: the story's own standing rule that a recorded mutant must
  be re-runnable. Not logged by Dev, and not caught by any specialist. Severity: M — this is a false
  claim of verification sitting in what becomes the permanent archived record.

## Delivery Findings

### Reviewer (code review)

- **Gap** (non-blocking): the exported `audcStreamFor` is a second, ungated entry point into
  `romEvents`, so the module's stated invariant — a cue it cannot account for THROWS — does not hold
  across its public surface. Empirically confirmed against HEAD by two independent specialists:
  `audcStreamFor('toString')`, `('constructor')`, `('valueOf')` and `('hasOwnProperty')` all return
  `[]` with no throw. It cannot write a file so it cannot reproduce the silent-wav defect, but it is
  the identical defect class on an already-public export. Affects `plugins/centipede/tools/pokey-bake/bake-sfx.mjs` (`:218`, `:283` — harden with `Object.hasOwn` and throw, or centralise the lookup in one hardened accessor). *Found by Reviewer during code review.*

- **Gap** (non-blocking): the `PROVENANCE` builder at `bake-sfx.mjs:59` performs the same unguarded
  bracket read over `Object.keys(SOUNDS)`. A shipped manifest cue named `toString`/`constructor`/
  `valueOf` would be silently mislabelled `'rom'` at module load rather than caught — independent of
  `bakeSfx`'s now-hardened gate, and not exercised by any test. Affects `plugins/centipede/tools/pokey-bake/bake-sfx.mjs` (`:59`). *Found by Reviewer during code review.*

- **Improvement** (non-blocking): `bakeSfx`'s pass-2 write is `join(outDir, sounds[cue])` with no
  validation of the filename VALUE. `path.join` does not stop `..` segments, so a malformed manifest
  entry could write outside the mandatory staging directory — the one guarantee CLAUDE.md calls
  non-negotiable for bakers. Pre-existing, not introduced by this diff, and not attacker-reachable
  under the trust model (the manifest is hand-authored, in-repo, reviewed), which is why it is filed
  rather than blocked. Affects `plugins/centipede/tools/pokey-bake/bake-sfx.mjs` (`:435` — validate
  each filename against a strict pattern, or `resolve()` and assert the prefix). *Found by Reviewer during code review.*

- **Question** (non-blocking): `bakeFailure`'s `toBeInstanceOf(Error)` is satisfied by ANY Error,
  including an unrelated `TypeError` from a typo in the test itself. Safe in both current call sites
  because each follows with an exact-message `toBe` that reddens on a foreign crash (rule-checker
  confirmed this by injecting one). The exposure is latent in the helper's shape, not live today —
  worth a note in the helper's docblock if a third caller ever omits the message check. Affects
  `plugins/centipede/tools/pokey-bake/bake-sfx.test.mjs` (`:131-144`). *Found by Reviewer during code review.*

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/javascript.md` (13 checks), plus the language-agnostic
checks from `typescript.md`. Both changed files are plain `.mjs`; typescript.md's type-syntax checks
are N/A. rule-checker enumerated 46 instances across 24 rules; I re-derived the ones that bear on the
verdict and agree with its mapping.

| Check | Instances | Verdict |
|---|---|---|
| JS #1 silent error swallowing | 1 | Compliant — `bakeFailure`'s catch captures, asserts and returns; not an empty catch. Latent caveat filed as a Question. |
| JS #2 async pitfalls | 4 | Compliant — every `bakeSfx`/`bakeFailure` call is awaited; no floating promises, no async `forEach`. |
| **JS #3 prototype pollution / bracket access** | 4 | **1 VIOLATION** — `:418`/`:419` compliant and mutation-proven; `:218` compliant only via caller gating; `:283` `audcStreamFor` VIOLATION, exported and ungated. |
| JS #4 equality and coercion | 3 | Compliant — strict operators throughout; the ternaries test real booleans. |
| JS #5 DOM/browser security | 0 | N/A — Node-only build tool, never bundled. Verified: the only importers are the justfile's `node` invocation and this test file. |
| JS #6 Node specifics | 3 | Compliant — `Object.hasOwn` needs Node 16.9; repo floor is `>=22.18`. |
| JS #7 regex safety | 0 | N/A — the diff REMOVES the only regex (`/aCueNobodyBaked/`) and adds none. |
| **JS #8 test quality** | 6 | **1 VIOLATION** — both preconditions and the empty-dir assertion proven non-vacuous; POSITIVE CONTROL's count assertion structurally cannot fail on content. |
| JS #9 module and scope | 2 | Compliant — `const` only, no `var`, no reassignment. |
| JS #10 error handling | 3 | Compliant — real `Error` objects with descriptive messages; no string throws. |
| JS #11 input validation | 0 | N/A at the literal check (no HTTP boundary). The cue-name trust boundary is judged under #3; the filename-value gap is filed as a Delivery Finding. |
| JS #12 dependency hygiene | 0 | N/A — no `console.log`, secrets or dependency changes in the diff. |
| JS #13 fix-introduced regressions | 1 | Compliant — re-scanned the fix diff against #1-12; nothing new introduced. |
| TS #15 assertions matching a TOKEN not the CLAIM | 3 | Compliant — this diff is the FIX for a #15 defect, not a new instance. |
| **TS #17 comments asserting a mechanism nobody re-ran** | 5 | **1 VIOLATION** — the 44-byte/count-15 claims all reproduce exactly; the sufficiency claim at `:414-415` does not. |
| **TS #18 test apparatus that fails by PASSING** | 3 | **1 VIOLATION** — same instance as JS #8; `bakeFailure` and `scratchDir` themselves are clean. |
| TS #20 a quantity measured from an artifact the same diff changes | 3 | Compliant — 27/27, 1159/1159 and 390/390 each independently reproduced by preflight AND rule-checker. |
| **TS #23 a recorded MUTANT that cannot be re-run** | 6 | **1 VIOLATION** (rule-checker: M3) — I extend it to M2/M2a/M2b, see the undocumented deviation above. |
| **TS #24 a retirement applied where the AC named it, and nowhere else** | 1 | **1 VIOLATION** — AC-2 named "the two bracket reads in bakeSfx's pass-1 loop"; grepping the PATTERN finds it surviving at `:59`, `:218`, `:283`. |
| TS #14, #16, #19, #21, #22 | 0 | N/A — no state machines, UI/aria, population filters, `??` defaulting or rewritten comparison predicates in this diff. |

### Observations

- `[RULE]` `[SEC]` `[DOC]` **The sufficiency claim at `bake-sfx.mjs:414-415` is false** — "romEvents and
  standInEvents are reachable only once this gate has passed." `audcStreamFor` (`:282-285`, exported,
  live in the suite at `bake-sfx.test.mjs:425`) calls `romEvents(cue)` directly. True for
  `standInEvents`; false for `romEvents`. Four-way confirmation, three of them by execution.
- `[RULE]` **The POSITIVE CONTROL's count assertion is structurally tautological** at
  `bake-sfx.test.mjs:294-296`. `bakeSfx` returns `rendered.length`, one push per
  `Object.keys(sounds)` — so it compares the input to itself and can only fail on a throw. Proven
  twice by different routes: my R1 (pass 2 writes nothing → 8 tests red, control GREEN) and
  rule-checker's FREQ0-forcing content mutation (13 of 14 cues wrong → control GREEN).
- `[DOC]` **The mechanism generalisation at `:404-405` covers 2 of the 4 items it lists.** "Each of
  them spells missing as a comparison against null" is true of `freqTable !== null` and
  `contImmediate === null`; `lengthFrames !== tableLengthBytes` is a field-to-field equality that
  passes because both sides are equally undefined, and `i < undefined` is a loop bound, not a gate.
- **The session's battery table claims "the script is reproduced below each row." It is not.** No
  specialist caught this; it is a false claim of verification in the archived record, and the
  clearest instance in this diff of the very defect the story exists to fix.
- `[VERIFIED]` **The empty-directory assertion is not decoration** — evidence: mutant R2 (write during
  pass 1) reddens `bake-sfx.test.mjs:282` on its own message, `expected [ 'bonus_life.wav', …(13) ]
  to deeply equal []`. Complies with JS #8 (non-vacuous) and TS #18.
- `[VERIFIED]` **AC-1 is fully met and mutation-proven** — evidence: `bake-sfx.test.mjs:239-243`
  asserts the entire diagnostic with `toBe` behind a thrown-Error helper; M1 (`WOMBAT ${cue} BANANA`)
  was GREEN at setup under the old regex and reddens 2 tests now, reproduced independently by
  rule-checker. Complies with TS #15.
- `[VERIFIED]` **The two preconditions in the prototype test are real, not decorative** — evidence:
  `bake-sfx.test.mjs:264-271`; rule-checker confirmed the spread key produces an own enumerable
  property (`Object.keys` iterates it) and that `Object.hasOwn` returns false, so neither assertion
  is trivially satisfied. Complies with JS #8.
- `[VERIFIED]` **Both halves of AC-2's conjunction are load-bearing** — evidence: M2a and M2b each
  redden the inherited-spec test alone, by different routes (bare `FIXTURE.cues` classifies the cue
  transcribed; bare `STAND_IN_SPECS` makes the gate's second conjunct false). Reproduced by
  rule-checker at exactly 1 red each.
- `[SEC]` **`PROVENANCE` (`:59`) carries the same unguarded read** — low severity, requires editing the
  trusted manifest to trigger, mislabels rather than mis-writes. Filed, not blocked.
- `[SEC]` **`join(outDir, sounds[cue])` does not validate the filename value** (`:435`) — pre-existing,
  not introduced here, not attacker-reachable under this trust model. Filed as a Delivery Finding.

### Devil's Advocate

Argue the code is broken. The strongest case is not any single line — it is that this story shipped
the exact defect it was written to eliminate, three times, and I am the one who wrote all three.

The story's thesis is that an assertion which pins a proxy for a property, rather than the property,
is not a guard. cp6-4 replaced `toThrow(/aCueNobodyBaked/)` because it pinned the interpolation and
not the diagnosis. Then it added a POSITIVE CONTROL that pins the number of manifest keys and not the
number of files — a proxy, and a worse one, because `bakeSfx`'s return value is derived from the same
expression the assertion compares it against. Two independent mutations prove it: a bake that writes
nothing passes it, and a bake whose audio content is wrong for thirteen of fourteen cues passes it.
Its own comment says "if this reds, the two tests above are throwing because of the injection itself"
— which is the narrow thing it does prove — but the assertion chosen to prove it reads as a
verification of output and is not one. A reader who trusts it learns nothing about whether files
landed. Eight other tests happen to cover that property, which is precisely the shape this repo's own
sidecar warns about: a guard whose rationale is false while something else quietly does the work.

The second charge is worse because it authorises inaction. The comment at `:414-415` tells the next
reader that hardening the gate is sufficient, that `romEvents` cannot be reached any other way. That
sentence is false, and it is false about an already-exported function that four separate analyses
found in minutes. A future maintainer asked to widen the hardening will read that comment, believe
the question is settled, and stop. The story's own Delivery Finding names the three bare reads — so
the author knew — and the comment still claims sufficiency. Knowing the gap and writing the
reassurance anyway is the more serious version of the error.

The third: the session says the mutation scripts are reproduced below each row. They are not. Four of
seven mutants are prose, not strings. The archived record therefore promises a reader that they can
re-run the battery, and they cannot. Every figure in that table is correct — preflight and
rule-checker both reproduced them — which is exactly what makes the sentence dangerous: accurate
numbers next to a false claim about how to reproduce them is the configuration most likely to be
trusted and least likely to be checked.

What would a confused user do? Read `:414-415`, conclude `audcStreamFor` is safe, and pass it a
manifest key from a loop. They get `[]` and no error. What would a stressed filesystem produce? An
`mkdtemp` failure inside `scratchDir` throws outside `bakeFailure`'s try, which is correct, and the
positive control's `rmSync` is `force: true`, so no cleanup crash. Those hold. The defects here are
not in what the code does — the code change itself is correct, minimal and well-proven. They are in
what the tests and comments CLAIM about it, which for this particular story is the whole deliverable.

### Round 1 Reviewer Assessment (REJECTED — superseded by round 2)

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| `[RULE]` `[SEC]` `[DOC]` HIGH | "romEvents and standInEvents are reachable only once this gate has passed" is false — exported `audcStreamFor` reaches `romEvents` ungated, returning `[]` instead of throwing for `toString`/`constructor`/`valueOf`/`hasOwnProperty` | `bake-sfx.mjs:414-415`, `:282-285`, `:218` | Prefer making the claim TRUE: harden `romEvents`/`audcStreamFor` with `Object.hasOwn` so the invariant holds across the module's public surface. If instead narrowing the claim, say explicitly that `audcStreamFor` is ungated and why that is acceptable. |
| `[RULE]` MEDIUM | POSITIVE CONTROL's count assertion is structurally tautological — `bakeSfx` returns `rendered.length`, one push per `Object.keys(sounds)`, so it compares the input to itself and cannot observe output | `bake-sfx.test.mjs:294-296` | Add `expect(readdirSync(dir).sort()).toEqual(Object.values(manifest.SOUNDS).sort())`. Verified during review: green unmutated, and under a pass-2-writes-nothing mutant it reddens on its OWN assertion rather than via a sibling. |
| `[DOC]` MEDIUM | The "each of them spells missing as a comparison against null" generalisation is true of 2 of the 4 items listed beneath it | `bake-sfx.mjs:404-405` | Split the framing per comment-analyzer's suggestion. Mirrored at `.pennyfarthing/sidecars/sm/gotchas.md:2477` ("at every link") — fix both. The pushed commit message carries it too and stays as history. |
| MEDIUM | "the script is reproduced below each row" — no script is reproduced anywhere in the session; M2/M2a/M2b/M3 are descriptions, not the verbatim strings AC-4 requires | `.session/cp6-4-session.md`, battery table | Either paste the four literal replacement strings, or delete the sentence. Do not leave a promise of reproducibility the record does not honour. |

**Not blocking, filed as Delivery Findings:** `[SEC]` the `PROVENANCE` builder's unguarded read
(`:59`), `[SEC]` the unvalidated filename value at `:435` (pre-existing), and the latent
`bakeFailure` caveat.

**Data flow traced:** a manifest cue name → `Object.keys(sounds)` in `bakeSfx`'s pass-1 loop →
`Object.hasOwn` gate (`:418-419`) → `romEvents`/`standInEvents` → `render` → pass-2
`writeWav(join(outDir, sounds[cue]))` → staging dir → `just deploy-assets` → public R2 bucket. Safe
on this path after the fix: a prototype-shadowed name now throws at the gate, before any render or
write. The parallel path `audcStreamFor(cue)` → `romEvents` bypasses the gate entirely — it cannot
write, so it cannot reach the bucket, but it is where the module's invariant breaks.

**Pattern observed:** good — mutating each conjunct of a compound gate separately (M2a/M2b) proved
both halves load-bearing by different routes, which a single combined mutant would have hidden.
`bake-sfx.mjs:418-419`.

**Error handling:** correct and improved. `bakeFailure` (`bake-sfx.test.mjs:131-144`) separates "did
it throw" from "what did it say", which is what made three of the six mutants legible — M2/M2a/M2b
all produce a RESOLVED bake and would have been indistinguishable under the old regex assertion.

**Handoff:** Back to Dev for fixes. The code change itself is correct, minimal and well-proven; every
finding is in what the tests and comments CLAIM about it. All four fixes are small, and the fix for
the second one is already measured.

---

## Dev Assessment — round 2

**Implementation Complete:** Yes

All four blocking findings fixed. The review's central point stands and shaped the fix: the
code change was correct, and every defect was in what the tests and comments CLAIMED about
it.

**Finding 1 (HIGH) — the false sufficiency claim.** Fixed by making the claim TRUE rather
than by narrowing it, which is what the Reviewer prescribed. Every by-name lookup in the
module now goes through one accessor, `ownSpec(record, cue)`, and `romEvents` carries its own
gate because `audcStreamFor` reaches it without passing `bakeSfx`'s. The `PROVENANCE` builder
(`:59`) went through the same accessor — the Reviewer's own suggested fix was "centralize the
lookup in one hardened accessor used everywhere", which covers it, so it moved from a filed
Delivery Finding into this round. `audcStreamFor('toString'/'constructor'/'valueOf'/'hasOwnProperty')`
now throws instead of returning `[]`.

**Finding 2 (MEDIUM) — the tautological control.** Fixed with the assertion the Reviewer had
already measured: `readdirSync(dir).sort()` against the manifest's values. Mutant N4 (pass 2
writes nothing) now reddens the control FIRST in the list; in round 1 it survived that exact
mutant.

**Finding 3 (MEDIUM) — the over-generalised mechanism comment.** The four items are three
distinct mechanisms, not four null comparisons: two are null comparisons, one is an equality
between two equally-`undefined` fields, and one is a loop bound. Rewritten to say so, and the
mirror at `.pennyfarthing/sidecars/sm/gotchas.md` corrected in the same commit. The pushed
round-1 commit message keeps the wrong phrasing and stays as history.

**Finding 4 (MEDIUM) — the false reproducibility claim.** "The script is reproduced below
each row" is deleted and replaced with a correction that says what was wrong. Round 1's four
elided mutants are spelled out as literal replacement strings. Round 2's battery is verbatim
by construction.

### An equivalent mutant, and what I did about it

I first gave `standInEvents` its own throw, matching `romEvents`. **Mutant N3 removed that
throw and all 28 tests stayed green** — because `standInEvents` has exactly one caller and it
is the pass-1 gate, which has already established the spec is truthy. The guard was
unreachable. I deleted it rather than shipping a guard nobody can watch fail, kept `ownSpec`
there for uniformity, and recorded the measurement in the comment so the next reader does not
re-add it. This is the story's own standard applied to my own new code.

### Round 2 battery — verbatim, re-runnable

Each row's `old`/`new` are literal source text; the script is `battery2.py`, reproduced in
full in the commit body so it survives outside a scratch directory.

| # | mutation | red | which tests |
|---|---|---|---|
| N1 | `const ownSpec = (record, cue) => (Object.hasOwn(record, cue) ? record[cue] : undefined)` → `const ownSpec = (record, cue) => record[cue]` | 2 | inherited-spec, audcStreamFor |
| N2 | delete `romEvents`' own `if (!c) { throw … }` | **1** | audcStreamFor ONLY |
| N3 | delete `standInEvents`' own `if (!s) { throw … }` | **0** | EQUIVALENT MUTANT — guard removed, see above |
| N4 | `for (const [cue, samples] of rendered) {` → `for (const [cue, samples] of []) {` | 9 | POSITIVE CONTROL **+ 8** |
| N5 | the whole diagnostic → `` `WOMBAT ${cue} BANANA` `` | 2 | both throw-tests |
| N6 | `if (!transcribed && !standIn) {` → `if (false) {` | 2 | both throw-tests |
| N7 | CONTROL — inert comment in the pass-1 loop | **0** | — |

**N2 is the round-1 defect, isolated.** It reddens exactly one test — the new `audcStreamFor`
one — because `bakeSfx`'s pass-1 gate still catches the same cue first. That is precisely why
round 1's comment looked true and was not: nothing in the old suite could distinguish "the
gate is in the lookup" from "the gate is in the one caller I checked."

**N4 is the proof that finding 2 is closed.** Round 1: control survived. Round 2: control is
the first test to fail.

**Tests:** 28/28 in the file (was 27), 1160/1160 across centipede (was 1159), 390/390
orchestrator, `npm run lint` exit 0. No stray `.wav` outside `node_modules`.

**Branch:** none — trunk-based.

## Design Deviations

### Dev (round 2)

- **`PROVENANCE` (`:59`) hardened, though the Reviewer filed it as non-blocking**
  - Spec source: Reviewer Assessment round 1, Delivery Findings + finding 1's prescribed fix
  - Spec text: filed as "Gap (non-blocking)", but finding 1's fix reads "or centralize the lookup in one hardened accessor used everywhere `FIXTURE.cues`/`STAND_IN_SPECS` are read by key"
  - Implementation: included in this round via `ownSpec`.
  - Rationale: the centralised accessor was the prescribed fix for the blocking finding, and it covers this site for free. Leaving it out would have forced the accessor's docblock to carry an exception ("every lookup except one"), which is the shape of claim this whole round exists to remove.
  - Severity: minor
  - Forward impact: none — `PROVENANCE`'s output is unchanged for the shipped manifest.

- **`standInEvents` got NO guard of its own, unlike `romEvents`**
  - Spec source: symmetry with finding 1's fix
  - Spec text: "harden `romEvents`/`audcStreamFor` … so the invariant holds across the module's public surface"
  - Implementation: `ownSpec` lookup, no throw.
  - Rationale: measured, not assumed. `standInEvents` is module-private with one caller, the already-gated pass-1 loop; mutant N3 proves a guard there is unreachable. `romEvents` is different in kind because the exported `audcStreamFor` calls it directly, which is the whole finding.
  - Severity: minor
  - Forward impact: if `standInEvents` ever gains a second caller, it needs its own gate — the comment at the lookup says so.

## Delivery Findings

### Dev (round 2)

- No new upstream findings. The three the Reviewer filed are now partly discharged: the `audcStreamFor`/`romEvents` gap and the `PROVENANCE` gap are both fixed in this round. The unvalidated filename value at the pass-2 write (`join(outDir, sounds[cue])`) is untouched and remains open as filed — it is pre-existing, outside this story's ACs, and its fix is a filename validation policy rather than a lookup fix.

**Handoff:** Back to review (Obi-Wan Kenobi), round 2.
## Subagent Results — round 2

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — all four baselines reproduced, both deltas exactly +1 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1 (downgraded to LOW, routed to finish chore), dismissed 0, deferred 0 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none new | N/A — round-1 findings 1 and 2 CLOSED by execution, 3 unchanged and deferred |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 39 rules | N/A — all four round-1 findings independently re-verified CLOSED |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 1 confirmed (LOW, prose), 0 dismissed, 2 carried forward as previously-filed non-blocking Delivery Findings

### Rule Compliance — round 2

rule-checker enumerated 47 instances across 39 rules (javascript.md #1-13, typescript.md's
language-agnostic #14-26) and returned **zero violations**. The four checks that carried round-1
violations are the ones that matter, and all four flipped:

| Check | Round 1 | Round 2 | Evidence |
|---|---|---|---|
| JS #3 prototype access | 1 violation (`audcStreamFor`) | **0 / 6 instances** | all six by-name reads route through `ownSpec`; four rogue names verified throwing by execution |
| JS #8 test quality | 1 violation (tautological control) | **0 / 3** | the new file-list assertion reddens under N4 while the sibling count assertion stays green |
| TS #17 comments asserting an unrerun mechanism | 1 violation (`:414-415`) | **0 / 3** | each of the three new claims verified — by grep, by mutation, and against the actual operators |
| TS #18 apparatus that fails by passing | 1 violation | **0 / 2** | both new assertions counter-mutated |
| TS #23 mutants not re-runnable | 1 violation (M3 elided) | **0 / 7** | every N-mutant independently re-applied from the committed literal strings |
| TS #24 fix applied only where the AC named it | 1 violation (`PROVENANCE`) | **0 / 1** | `PROVENANCE` now routes through the accessor; no unguarded read remains |

### Observations

- `[RULE]` `[SEC]` **Round-1 finding 1 (HIGH) is CLOSED, and both specialists proved it by running it**
  rather than reading the diff: `audcStreamFor('toString'/'constructor'/'valueOf'/'hasOwnProperty')`
  now throws the exact diagnostic instead of returning `[]`. `bake-sfx.mjs:67`, `:242-245`, `:313`.
- `[RULE]` **Round-1 finding 2 (MEDIUM) is CLOSED, and the proof is the discriminating one.** Under
  mutant N4 the new file-list assertion reddens on its own message while the original count
  assertion beside it stays green — so the two assertions are demonstrably not measuring the same
  thing, which is exactly what was wrong before. `bake-sfx.test.mjs:303-305`.
- `[VERIFIED]` **N2 is the cleanest evidence in this story.** Deleting `romEvents`' own gate reddens
  exactly ONE test — the new `audcStreamFor` one — because pass 1's gate still catches the same cue
  first. That single number is the whole reason round 1's comment read as true: no test in the old
  suite could separate "the gate is in the lookup" from "the gate is in the one caller I checked".
  Complies with TS #23 (a red count that IS the blast radius).
- `[VERIFIED]` **The equivalent mutant was handled correctly, and rule-checker re-proved it both
  ways** — static (one caller, `bake-sfx.mjs:466`, behind an already-truthy `standIn`) and empirical
  (guard added → 28/28; guard removed → 28/28). Dev deleted it rather than shipping it and recorded
  the measurement at the lookup. That is this repo's own standard applied to the author's own new
  code, unprompted.
- `[VERIFIED]` **The four-name loop cannot hide a dead iteration** — evidence: rule-checker patched
  `ownSpec` so only the THIRD name resolved, and the test failed at exactly that iteration
  (`audcStreamFor('valueOf') must throw`). A `for` loop of assertions is normally a place a case can
  silently not run; here it was counter-mutated. `bake-sfx.test.mjs:317-322`. Complies with JS #8.
- `[DOC]` **LOW — the `ownSpec` docblock's "Every by-name lookup now goes through here" has one
  exception**, `sounds[cue]` at `bake-sfx.mjs:474`. Two specialists judged the claim true (scoping
  "by-name lookup" to the two spec records the docblock names); comment-analyzer judged it false
  (`sounds[cue]` is keyed by a cue name). Both readings are defensible, and the exception is safe by
  construction — `cue` always comes from `Object.keys(sounds)`, so it can never resolve through the
  prototype. Downgraded to LOW and routed to a finish chore rather than a third round: one
  qualifying word fixes it, and the specialist split is itself evidence the sentence is ambiguous
  rather than wrong.
- `[VERIFIED]` **The historical claims embedded in the new comments are accurate** — evidence:
  comment-analyzer matched "a mutant whose pass 2 writes NOTHING passed it", "13 of 14 cues from the
  wrong ROM table" and "returned `[]` with no throw" verbatim against round 1's own commit `01f9336`.
  No fabricated measurement.
- **Minor duplication, not a defect:** the new file-list assertion overlaps the pre-existing "one
  .wav per SOUNDS entry" test, but exercises the `opts.sounds` explicit-override branch of
  `const sounds = opts.sounds ?? SOUNDS` where the old one exercises the default. Different path,
  same invariant. Noted for a future pass, not actioned.

### Devil's Advocate

Argue this is still broken. The strongest case is that the fix pattern itself is the problem: this
round replaced a specific hardening with a general one, and general mechanisms hide their edges.
`ownSpec` now sits between every consumer and the two records, which means a future reader has
exactly one place to look — and also exactly one place to break. Mutant N1 shows the blast radius of
that single line is only two tests. Two. A one-character edit inside `ownSpec` that made it, say,
`Object.hasOwn(record, cue) ? record[cue] : record[cue]` would sail past six call sites and be caught
by a pair of assertions in one describe block. Centralisation bought clarity and sold redundancy, and
nothing in this story measures that trade.

The second charge is that the `standInEvents` deletion is the wrong lesson learned. The author found
a guard unreachable and removed it, which is defensible today, but the reason it is unreachable is a
caller-side invariant three lines away in a different function. The comment records the measurement
honestly — but it also means the module now has two lookup sites with opposite policies (`romEvents`
throws, `standInEvents` does not) whose difference is justified by call-graph shape rather than by
anything local. Add one caller to `standInEvents` and the asymmetry becomes a silent hole of exactly
the class this story exists to close. The comment says so; comments were this story's weak point
twice already.

Third: what would a confused user do? Read "The ONE way this module looks a cue up by name", then
write `sounds[cue]` in a new pass-3 loop, believing the module has a uniform policy. The one
exception to that sentence is the one line most likely to be copied, because it is the write path.
That is why the LOW is filed rather than waved through.

What would a stressed filesystem produce? `readdirSync` on a directory removed underneath the test
throws rather than returning `[]`, so the new assertion fails loudly rather than passing vacuously —
checked. What about the `?.` in the PROVENANCE builder: `ownSpec(...)?.freqTable === null` returns
`'rom'` for an absent cue rather than throwing, so a cue in `SOUNDS` but missing from the fixture is
still labelled rather than caught. But `bakeSfx` throws on that same cue the moment anyone bakes it,
and `PROVENANCE`'s own test asserts it covers the manifest cue-for-cue, so the gap is closed one
layer out. Not a finding, but it is the nearest thing to one left in this file.

None of these overturn the round. They are the arguments a third round would have to answer, and
each of them ends at "filed" or "measured" rather than "broken".

## Reviewer Assessment

**Verdict:** APPROVED

All four round-1 blocking findings are CLOSED, each independently re-verified by a specialist that
re-ran the measurement rather than trusting the session:

| Round-1 finding | Status | How it was proved |
|---|---|---|
| `[RULE]` `[SEC]` `[DOC]` 1 (HIGH) false sufficiency claim + ungated `audcStreamFor` | **CLOSED** | executed: four rogue names now throw the exact diagnostic; all six by-name reads route through `ownSpec` |
| `[RULE]` 2 (MEDIUM) tautological positive control | **CLOSED** | mutant N4 reddens the new assertion while the old one stays green — they measure different things |
| `[DOC]` `[RULE]` 3 (MEDIUM) over-generalised mechanism comment | **CLOSED** | four items, three mechanisms, checked operator by operator; sidecar mirror corrected too |
| `[RULE]` 4 (MEDIUM) false "the script is reproduced below each row" | **CLOSED** | `battery2.py` is in the commit body verbatim; round 1's elided mutants spelled out; every N-mutant re-applied independently |

**Remaining, all non-blocking and filed:** `[DOC]` the `ownSpec` docblock's one-word overreach on
`sounds[cue]` (LOW — two specialists read the claim as true, one as false; routed to a finish chore),
`[SEC]` the unvalidated filename value at `:474` (pre-existing, outside these ACs), and a noted
minor test duplication.

**Data flow traced:** cue name → `Object.keys(sounds)` → `ownSpec` gate → `romEvents`/`standInEvents`
→ `render` → `writeWav(join(outDir, sounds[cue]))` → staging → `just deploy-assets` → R2. The
parallel path `audcStreamFor(cue)` → `romEvents` now hits `romEvents`' own gate, which is the round-1
hole and is closed.

**Pattern observed:** good, and worth copying — Dev found a guard of its own making unreachable (N3),
recorded it as an equivalent mutant, and deleted it rather than shipping a guard nobody can watch
fail. `bake-sfx.mjs:317-323`.

**Error handling:** `ownSpec` returning `undefined` was audited at every call site for a new
crash-on-undefined path; none exists. `audcStreamFor` deliberately calls `romEvents` first so an
unknown cue reports the missing fixture entry rather than a TypeError. `bake-sfx.mjs:309-314`.

**Handoff:** To SM for finish-story, with one prose chore.

## Design Deviations

### Reviewer (audit) — round 2

- **`PROVENANCE` (`:59`) hardened, though the Reviewer filed it as non-blocking** → ✓ ACCEPTED by
  Reviewer: correct reading of the prescribed fix. Round 1's finding-1 remedy explicitly offered
  "centralize the lookup in one hardened accessor used everywhere `FIXTURE.cues`/`STAND_IN_SPECS` are
  read by key", which covers this site. Including it is what let the accessor's docblock state a
  uniform policy instead of carrying an exception, and rule-checker's TS #24 re-check now returns
  zero remaining unguarded reads.

- **`standInEvents` got NO guard of its own, unlike `romEvents`** → ✓ ACCEPTED by Reviewer, and the
  asymmetry is justified by measurement rather than taste. Independently re-verified both ways:
  statically, `standInEvents` is unexported with one call site (`:466`) behind an already-truthy
  `standIn`; empirically, adding the guard back and removing it again both give 28/28. The comment at
  the lookup records this and tells a future maintainer what changes if a second caller appears —
  which is the right place for it, since the justification is call-graph shape rather than anything
  local. Flagged in Devil's Advocate as the thing most likely to rot; not a defect today.

## Delivery Findings

### Reviewer (code review) — round 2

- **Improvement** (non-blocking): the `ownSpec` docblock says "Every by-name lookup now goes through
  here"; `sounds[cue]` in the pass-2 write loop does not. It is safe by construction — `cue` always
  comes from `Object.keys(sounds)`, so it cannot resolve through the prototype — and two of three
  specialists read the claim as scoped to the two spec records the docblock names. One qualifying
  word ("every cue-record lookup") removes the ambiguity. Affects
  `plugins/centipede/tools/pokey-bake/bake-sfx.mjs` (`:63-64`). *Found by Reviewer during code review.*

- **Improvement** (non-blocking): the new positive-control file-list assertion overlaps the
  pre-existing "one .wav per SOUNDS entry" test. Not redundant — one exercises the `opts.sounds`
  explicit-override branch and the other the default-argument branch of
  `const sounds = opts.sounds ?? SOUNDS` — but a future pass could decide whether both are wanted.
  Affects `plugins/centipede/tools/pokey-bake/bake-sfx.test.mjs` (`:303-305` and `:505-511`).
  *Found by Reviewer during code review.*

- **Gap** (non-blocking, CARRIED FORWARD from round 1, still open): `join(outDir, sounds[cue])`
  does not validate the filename VALUE, so a malformed manifest entry containing `../` could write
  outside the mandatory staging directory. Pre-existing, unchanged by either round, outside this
  story's ACs, and not attacker-reachable under the trust model. Re-confirmed unchanged in round 2.
  Affects `plugins/centipede/tools/pokey-bake/bake-sfx.mjs` (`:474`). *Found by Reviewer during code review.*
## Impact Summary

**What shipped.** centipede's rogue-manifest guard now pins the operator's diagnostic rather
than the interpolated cue name, and the prototype hole underneath it is closed at the lookup
instead of at one caller.

The story was filed as a one-point assertion rewrite. Its own conditional — "check whether the
bracket reads have that same shape; if they do, `Object.hasOwn` belongs in this story" — turned
out to be met, and to understate what it found. The filing predicted joust's failure mode, a
right cue name beside a wrong diagnosis. centipede's was worse: a manifest cue named `toString`,
`constructor` or `valueOf` **baked completely clean**, returning 15 files where the shipped
manifest returns 14 and writing a 44-byte header-only wav that `just deploy-assets` would have
uploaded as silence under a real cue's name. Three gates in a row read the inherited value as
present, by three different mechanisms.

**Delivered:** `bake-sfx.mjs` gained one accessor, `ownSpec`, through which every spec-record
lookup by cue name now passes, plus its own gate in `romEvents`. `bake-sfx.test.mjs` gained a
whole-message assertion behind a thrown-Error helper, an inherited-spec test, a positive control
that checks files on disk, and an `audcStreamFor` refusal test. 28 tests in the file (was 25),
1160 across centipede (was 1157).

**Two review rounds, and both rejections were about claims rather than code.** The implementation
was correct from round 1. What was wrong was a comment asserting the hardening was sufficient
when an exported function bypassed it, a positive control that compared the input to itself, a
mechanism description that called three different failure modes one, and a session sentence
promising a reproduction script that was not there. Every one of those is the same defect the
story exists to fix, wearing a different hat — an assertion that pins a proxy for the property
instead of the property.

**The measurement worth keeping** is mutant N2: deleting `romEvents`' new gate reddens exactly
one test. That single digit explains why round 1's false comment read as true — nothing in the
old 27-test file could separate "the gate is in the lookup" from "the gate is in the one caller
I checked."

**Left open, filed as Delivery Findings:** the unvalidated filename value at the pass-2 write
(pre-existing, outside these ACs) and a minor overlap between the new positive control and an
existing test. Neither blocks.
