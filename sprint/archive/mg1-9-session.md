---
story_id: "mg1-9"
jira_key: "mg1-9"
epic: "mg1"
workflow: "tdd"
---
# Story mg1-9: Typecheck arcade-shared's tests: 22 pre-existing errors in WebAudio doubles

## Story Details
- **ID:** mg1-9
- **Jira Key:** mg1-9
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-31T21:38:53Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-31T20:23:28Z | 2026-07-31T20:26:50Z | 3m 22s |
| red | 2026-07-31T20:26:50Z | 2026-07-31T20:43:53Z | 17m 3s |
| green | 2026-07-31T20:43:53Z | 2026-07-31T20:53:24Z | 9m 31s |
| review | 2026-07-31T20:53:24Z | 2026-07-31T21:29:20Z | 35m 56s |
| green | 2026-07-31T21:29:20Z | 2026-07-31T21:35:31Z | 6m 11s |
| review | 2026-07-31T21:35:31Z | 2026-07-31T21:38:53Z | 3m 22s |
| finish | 2026-07-31T21:38:53Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)

- **Improvement** (non-blocking): the orchestrator suite's CI-provisioning guard caught a real
  newcomer on its first run — a `spawnSync('npx', …)` in the new test file — and the fix was to
  spawn `process.execPath` with the lockfile-installed `node_modules/typescript/lib/tsc.js`
  instead. Affects `tests/shared-tests-typechecked.test.mjs` (nothing further needed; recorded
  because the guard proving itself on an unrelated story is evidence it is worth keeping, and
  because the next person to add a spawning orchestrator test will hit it too).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): `tsconfig.json:28,37` and the retired guard in
  `tests/monorepo-topology.test.mjs` all cite this story by its pre-split id `uf1-28`. The guard is
  now deleted; the two tsconfig comments go away with the `exclude` line Dev removes. Affects
  `tsconfig.json` (delete the whole comment block, not just the setting — it is a note about a
  measurement that will no longer be true). *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): the shipped doubles are now a reusable pattern for any suite that
  needs Web Audio without a browser — `implements` rather than a cast, `extends EventTarget` for the
  listener trio, lazy getters for untouched members. Affects `plugins/battlezone` and
  `plugins/red-baron`, which carry their own weaker fakes (battlezone's `close()` is cosmetic, noted
  at `synth.test.ts:56-59`, so it cannot express the closed-context bug this suite exists to pin).
  Not in scope here and not urgent — recorded so a future extraction story has the precedent.
  *Found by Dev during implementation.*
- **Question** (non-blocking): `FakeAudioParam.setValueCurveAtTime` and the 20 unused
  `create*`/`decodeAudioData` members are honest `unused()` throwers. If a later story needs one, it
  is a two-line change — but if several are needed at once, that is the signal to extract this
  double into `src/shared/tests/helpers/` rather than grow it in place. Affects
  `src/shared/tests/synth.test.ts` (no action now). *Found by Dev during implementation.*

### Reviewer (review round 1)

- **Gap** (non-blocking): `comment_analyzer` is disabled in `workflow.reviewer_subagents`, and all
  four documentation findings in this review are ones I had to find myself. The same gap cost jt8-6
  three rounds. Affects `.pennyfarthing` settings (consider enabling it for prose-heavy stories, or
  make the Reviewer's ownership of that domain explicit when it is off).
  *Found by Reviewer during review.*
- **Improvement** (non-blocking): `src/shared/tests/synth.test.ts:982`'s pre-existing
  `(synth as unknown as Record<string, unknown>).onRebuild` can be written `'onRebuild' in synth`
  with no cast at all — same runtime check, and it would let a future story tighten the AC2 scanner
  to ban ALL double-casts in this file rather than only WebAudio-targeted ones. Affects
  `src/shared/tests/synth.test.ts` (out of scope for mg1-9; deliberately carved out by the scanner's
  own fixtures). *Found by Reviewer during review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### Dev (rework round 1)

- No deviations from spec. Every finding was fixed as specified; the one suggestion I declined
  (rewriting the pre-existing line-982 double-cast) was explicitly marked out of scope by the
  Reviewer and is recorded as a Delivery Finding instead.

### Reviewer (review round 1)

- No deviations from spec. The rejection is on the guard's implementation and its prose, not on any
  spec disagreement — AC1-AC4 are all functionally satisfied and I am asking for no change to the
  doubles, the tsconfig or any production code.

### Dev (implementation)

- No deviations from spec. Every AC was met by its literal reading, including the two TEA
  interpreted strictly: no cast, `any` or `@ts-` directive was used anywhere (AC2), and
  `src/shared/synth.ts` was not touched at all — so the production-seam guard TEA logged as a
  deviation never had to be argued with. The four families of error all closed inside
  `synth.test.ts`, which is where the story said the fix belonged.

### TEA (test design)

- **Pinned the production seam's types, which no AC asks for**
  - Spec source: context-story-mg1-9.md, AC2
  - Spec text: "The WebAudio doubles satisfy the real types rather than being cast to them, since a
    cast reintroduces the same blindness the exclude created."
  - Implementation: added `the production synth seams still demand the REAL WebAudio types`, which
    asserts `src/shared/synth.ts` still declares `noiseBuffer(context: AudioContext, …)`,
    `SynthTarget.context: AudioContext` and `SynthTarget.out: GainNode`.
  - Rationale: AC2 bans raising the double to the type by assertion, but says nothing about the
    opposite move — LOWERING the type to the double. Narrowing `noiseBuffer` to
    `Pick<AudioContext, 'sampleRate' | 'createBuffer'>` clears all 22 errors with the doubles
    untouched and leaves every other test in the suite green. That is the exclusion's own bargain
    (buy a green check by shrinking what is checked) moved one level down, except it weakens a
    shared-library signature that seven cabinets compile against. Verified by mutation: applying
    exactly that narrowing reddens the new test.
  - Severity: minor
  - Forward impact: if the epic or the Reviewer would rather permit interface segregation here —
    it is a defensible design in the abstract — this is the one test to delete, and AC2 should be
    reworded to say so. Flagged rather than assumed because it constrains Dev's solution space
    beyond the literal AC.

- **Deleted a passing test from `tests/monorepo-topology.test.mjs`**
  - Spec source: context-story-mg1-9.md, "LOAD-BEARING GUARD TEST"
  - Spec text: "deleting that test is IN SCOPE for this story, not collateral damage"
  - Implementation: removed `the tsc exclusion is ONE file, not the src/shared/tests directory`,
    leaving a comment in its place that names its successors.
  - Rationale: it asserts the `exclude` exists and equals `['src/shared/tests/synth.test.ts']` —
    the direct contradiction of the target state and of the new `the root tsconfig excludes
    nothing`. Leaving it would hand Dev a tree that cannot go green. Its own closing message
    (`'…if uf1-28 landed, delete this test with it'`) authorises this.
  - Severity: minor
  - Forward impact: none — the property it guarded (the exclusion is narrow, not directory-wide)
    is strictly subsumed by "there is no exclusion, and every file is in the tsc program."

## Sm Assessment

Setup complete. The phase pointer read `setup` on arrival and the workflow is `tdd` (phased);
next owner is TEA for RED.

### The story's own description is partly stale — measured, not assumed

The epic YAML's `description` for mg1-9 describes a world that no longer exists, and it would have
sent TEA after the wrong target. Two of its claims are refuted by the current tree:

1. **"src/shared/tests is excluded from the root tsconfig"** — no longer true. `tsconfig.json:40`
   reads `"exclude": ["src/shared/tests/synth.test.ts"]`. The exclusion was **narrowed to one file**
   after the story was filed.
2. **"Task 21's highscore.dom.test.ts is untypechecked today"** — false. It is typechecked, along
   with 24 other files. Exactly one file in that directory is excluded.

What survives is the core of the story: 22 real type errors, and an exclusion that must go.

**Measured by SM before handoff** (emptied the exclude, ran `npx tsc --noEmit`, reverted; working
tree verified clean afterward with `git status --short` empty):

| | |
|---|---|
| exit code | 2 |
| total errors | 22 |
| files affected | 1 — `src/shared/tests/synth.test.ts` |
| TS2345 (argument type) | 14 |
| TS2554 (wrong argument count) | 5 |
| TS18048 (possibly undefined) | 2 |
| TS2493 (tuple index out of range) | 1 |

This exactly matches the census in `tsconfig.json`'s own comment block, so the narrowing commit's
measurement is still accurate and nothing has drifted since.

### The blast radius includes a guard test that must be DELETED, not fixed

`tests/monorepo-topology.test.mjs` (~line 254) carries
`the tsc exclusion is ONE file, not the src/shared/tests directory`, which asserts the exclude
exists **and** equals `['src/shared/tests/synth.test.ts']`. Dropping the exclusion turns
`npm run test:orchestrator` red. That test's own comment anticipates this story and says to delete
it when the story lands — so its removal is in scope, and a red orchestrator suite mid-work is
expected rather than a regression. Flagged prominently in the context because a Dev who reads the
red as damage will "fix" it by keeping the exclusion, which fails AC1.

### This story is also known by a dead id

It was `uf1-28` before the 2026-07-31 epic split. The dead id is cited in four places, all inside
this story's own blast radius: `tsconfig.json:28`, `tsconfig.json:37`,
`tests/monorepo-topology.test.mjs:259`, `tests/monorepo-topology.test.mjs:275`. Two of those are
instructions addressed to this story ("Delete this line entirely when uf1-28 lands"), so a reader
who greps `mg1-9` finds nothing and a reader who greps `uf1-28` finds a story id that is not on the
board. All four go away with the work.

### Notes for TEA

- **AC4 needs a baseline captured BEFORE the first edit.** `npx vitest run --project shared` for the
  narrow number, full `npx vitest run` for the cabinet-wide one. Record it here — after the edit
  there is no way to reconstruct it.
- **AC2 forbids casts.** The bar is that `FakeAudioContext`/`FakeGain` genuinely satisfy the WebAudio
  types. `as AudioContext` would make `tsc` exit 0 while restoring precisely the blindness the
  exclusion created, so a RED test that only checks the exit code cannot distinguish a real fix from
  a cast. Worth a check that reads the source text for casts, in the spirit of the games' own
  `purity` / `source-rules` scanners — `src/shared/tests/synth-source-rules.test.ts` already exists
  as a local pattern to copy.
- **AC3** is a "nothing else was added" assertion: the exclude list ends empty, or the key is gone.

### Board state

- Working tree clean at handoff; nothing staged from my measurement.
- **Sibling contention:** `a-1` is in RED on **mg1-4**, which sweeps stale `repos:` values across
  every sprint YAML — including `sprint/epic-mg1.yaml`, the file my status stamp lands in. Expect a
  textual conflict there on the next pull; union-resolve (keep their `repos:` rewrite and my
  `status:` stamp). No source-file overlap with mg1-9 — their story is sprint YAML only.
- Probes run before setup: `git branch -r | grep -Ei mg1` returned **nothing** (read the output, not
  just the exit code) and the cross-checkout `.session` sweep returned only a-1's mg1-4. No sibling
  owns mg1-9.
## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `tests/shared-tests-typechecked.test.mjs` — 7 tests (new). Orchestrator suite (`node:test`),
  because the subject is a cabinet-wide wiring invariant: the root tsconfig and what tsc compiles.
- `tests/monorepo-topology.test.mjs` — retired `the tsc exclusion is ONE file, not the
  src/shared/tests directory` (see Design Deviations).

**Tests Written:** 7 covering 4 ACs
**Status:** RED — 2 failing drivers, 5 green guards

### The suite, and why it is shaped this way

`npm run lint` already runs `tsc --noEmit`. It cannot be the test, because the AC it would test —
"tsc exits 0" — is satisfiable five ways and four of them are worthless. Every cheap fix and its
catcher:

| cheap way to make 22 errors green | caught by |
|---|---|
| re-exclude the file | `the root tsconfig excludes nothing` |
| narrow `include` instead, or delete the file | `every test file under src/shared/tests is in the tsc program` |
| `@ts-nocheck` / `@ts-ignore` / `@ts-expect-error` | `the WebAudio doubles are not cast or suppressed into place` |
| `as unknown as AudioContext`, `as any`, `: any` | same |
| delete the tests that will not compile | `no test was quietly removed from synth.test.ts` |
| **narrow the PRODUCTION signature to fit the double** | `the production synth seams still demand the REAL WebAudio types` |

| # | Test | AC | State |
|---|------|----|-------|
| 1 | every test file under src/shared/tests is in the tsc program | AC1 | **RED** |
| 2 | tsc --noEmit exits 0 with the shared tests in the program | AC1 | green (pair with #1) |
| 3 | the root tsconfig excludes nothing | AC1/AC3 | **RED** |
| 4 | the WebAudio doubles are not cast or suppressed into place | AC2 | green guard |
| 5 | the suppression scanner flags what it must and ignores what it must not | AC2 | green (scanner self-test) |
| 6 | the production synth seams still demand the REAL WebAudio types | AC2 | green guard |
| 7 | no test was quietly removed from synth.test.ts | AC4 | green guard |

Test 2 is vacuous alone — it passes today, with the file excluded — so it is stated explicitly as
a PAIR with test 1 and the comment says so. Green there plus green here is AC1; green here alone
is not.

### Mutation results — every green guard was proven, not asserted

A guard that cannot go red is scenery. Each was reddened against a `cp` backup (never
`git checkout`), then restored and md5-verified; control run at the end.

| Mutation applied to the tree | Test that reddened | Message |
|---|---|---|
| `new FakeAudioContext() as unknown as AudioContext` | #4 | `cast to AudioContext — the double must satisfy it, not be asserted into it` |
| `// @ts-nocheck` at the top of the file | #4 | `@ts-nocheck suppresses the checker instead of satisfying it` |
| `new FakeAudioContext() as any` | #4 | `` `as any` cast `` |
| `createGain(): any` | #4 | `` `: any` annotation `` |
| `noiseBuffer(context: Pick<AudioContext, 'sampleRate' \| 'createBuffer'>, …)` | #6 | `noiseBuffer must still take a real AudioContext` |
| deleted one `it()` block | #7 | `synth.test.ts declares 50 tests, baseline 51` |

Control after restore: `src/shared/tests/synth.test.ts` md5 `12c4089e2cbc1c12815aa07425dcd3fc`,
`git diff` on it and on `src/shared/synth.ts` both empty.

Test 5 exists because the scanner is code under test: a scanner matching nothing would satisfy #4
forever. It pins both directions — must-flag (7 cases) and must-NOT-flag (6 cases, including the
file's existing legitimate `as unknown as Record<string, unknown>`, a comment describing the rule,
and the pattern inside a string literal).

### I PROVED the contract is satisfiable before banning the alternatives

Banning casts is only fair if the honest fix exists. `AudioContext` requires **38** members,
`AudioBufferSourceNode` 20, `OscillatorNode` 18, `GainNode` 12, `AudioParam` 12, `AudioBuffer` 7 —
~107 in total, which is enough to make "just cast it" look reasonable at hour three.

**It is reachable: ~135 lines, zero casts, `tsc` clean AND constructs/runs without throwing.**
Working probe at
`/private/tmp/claude-501/-Users-slabgorb-Projects-a-2/24879992-7dda-4943-9767-53e54a0eeffe/scratchpad/probe/probe5.ts`
(`node --experimental-strip-types probe5.ts` prints `constructed OK; buffer length = 24000`). Four
findings, and Korben should not have to rediscover two of them:

1. **`extends EventTarget`** on the context and on the node base supplies
   `addEventListener`/`removeEventListener`/`dispatchEvent` honestly — 3 members × 6 classes for
   one word.
2. **`Float32Array` is generic since TS 5.7.** `new Float32Array(n)` infers
   `Float32Array<ArrayBufferLike>`, which does **not** satisfy
   `AudioBuffer.getChannelData(): Float32Array<ArrayBuffer>` — it fails through
   `SharedArrayBuffer`. Declare `Float32Array<ArrayBuffer>` and build it as
   `new Float32Array(new ArrayBuffer(length * 4))`. This was the last error standing and reads
   like a compiler bug if you have not seen it.
3. **Unused members must be lazy getters**, not initialised fields:
   `get listener(): AudioListener { return nope() }`, never
   `readonly listener: AudioListener = nope()`. A field initialiser runs in the constructor, so
   the thrower fires the moment any test builds a context — `tsc` is perfectly happy and every
   test dies at runtime. `destination` IS touched by the tests, so it needs a real working double
   (`FakeDestination extends FakeAudioNode implements AudioDestinationNode`, one extra member:
   `maxChannelCount`).
4. `connect`/`disconnect` need their overload signatures declared ahead of the implementation, and
   `'connect' in target` narrows `AudioNode | AudioParam` **without a cast** — which matters given
   test #4.

The 22 errors are four families, not 22 problems: the `makeHumBuilder` parameter is declared
narrower than `SynthTarget` (10 × TS2345); `FakeAudioParam.setValueAtTime` takes 1 argument where
the real one takes 2 and `getChannelData` takes 0 where the real one takes 1 (5 × TS2554);
`vi.fn(() => …)` at line 910 declares no parameters so `build.mock.calls[0][0]` indexes an empty
tuple (TS2493 + 2 × TS18048); and `FakeAudioContext` is passed where `AudioContext` is required
(4 × TS2345).

### Baselines for AC4 (measured on the pre-fix tree, 2026-07-31)

| | |
|---|---|
| shared vitest project | **501 tests / 26 files, all passing** |
| full cabinet (`npx vitest run`) | **10413 passed + 1 todo / 698 files** |
| `src/shared/tests/synth.test.ts` | 51 `it(` blocks in 11 `describe`s |
| orchestrator suite before this story | 335 tests |
| orchestrator suite now | 341 — 339 pass, 2 fail (both mine, both intended) |

Test 7 pins the source-text census rather than a runner count: it is cheap enough for the
orchestrator suite and it names the file, whereas a suite-wide total would only get smaller and
stay green.

### Rule Coverage

`.pennyfarthing/gates/lang-review/` has no TypeScript checklist in this project, and there is no
`SOUL.md` or `.claude/rules/`. The applicable project rules are CLAUDE.md's, and the ones this
story touches are covered:

| Rule (CLAUDE.md) | Test | Status |
|---|---|---|
| `npm run lint` is the only type check anywhere — it must actually see the code | #1, #2 | RED / paired |
| orchestrator suite owns cabinet-wide wiring invariants, vitest never sees them | all 7 (in `tests/`) | placed |
| CI must not depend on a developer machine's binaries | reused the existing guard; switched to `process.execPath` | green |

**Rules checked:** 3 of 3 applicable
**Self-check:** 0 vacuous tests. Test 2 is the one that would be vacuous alone; it is documented as
a pair rather than left to look self-sufficient. No `let _ =`, no `assert(true)`, every assertion
carries a message naming the failure.

### Notes for Korben

- Run `node --test tests/shared-tests-typechecked.test.mjs` for the fast loop (~4s, dominated by
  the single memoised tsc call). `npm run test:orchestrator` before handing off.
- Deleting the `exclude` line means deleting the **whole comment block above it**
  (`tsconfig.json:23-38`) — it documents a measurement that stops being true, and it cites the dead
  id `uf1-28` twice.
- The four green guards are not obstacles to route around; they are the story's actual content. If
  one of them blocks the only fix you can find, that is a finding worth raising, not a test worth
  weakening. Test #6 in particular encodes a deviation the Reviewer may overturn — see Design
  Deviations.

**Handoff:** To Dev for implementation
## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/shared/tests/synth.test.ts` — the Web Audio doubles now `implements` the real interfaces
  (+251/−60 across both files); three call-site fixes.
- `tsconfig.json` — `"exclude"` removed entirely, along with the comment block explaining it.

**Tests:** GREEN — orchestrator 341/341, shared 501/501, full cabinet 10413 + 1 todo / 698 files
**Branch:** `main` (trunk-based) + `feat/mg1-9-typecheck-shared-tests` pushed, both at `6906b40`

### What the 22 errors actually were

Four families, not 22 problems — which is why the fix is one coherent change rather than 22 patches:

| family | count | cause |
|---|---|---|
| TS2345 | 10 | `makeHumBuilder` declared its parameter narrower than `SynthTarget` |
| TS2554 | 5 | `setValueAtTime` took 1 arg where the real one takes 2; `getChannelData` 0 where it takes 1 |
| TS2493 + TS18048 | 3 | `vi.fn(() => …)` infers a ZERO-arg signature, so `mock.calls[0][0]` indexes an empty tuple |
| TS2345 | 4 | `FakeAudioContext` passed where `AudioContext` was required |

The last family is the story's headline and the other three are its consequences: the doubles were
approximations, and nothing had ever compared them to the thing they approximated.

### AC-by-AC

| AC | How it was met | Evidence |
|---|---|---|
| AC1 — exclusion gone, `tsc --noEmit` exits 0 | `"exclude"` key deleted; 22 → 0 errors | `npx tsc --noEmit` → 0 errors; `every test file under src/shared/tests is in the tsc program` now green |
| AC2 — doubles SATISFY the types, not cast | `implements AudioContext / GainNode / OscillatorNode / AudioBuffer / AudioBufferSourceNode / AudioParam / AudioDestinationNode` | no `as`-to-a-WebAudio-type, no `any`, no `@ts-*`, and no `!` non-null assertions added (grepped the diff) |
| AC3 — no other path excluded | the key is gone, not repointed | `the root tsconfig excludes nothing` green |
| AC4 — pass count unchanged | nothing deleted or skipped | shared **501/501 across 26 files**, full **10413 + 1 todo across 698** — byte-identical to TEA's pre-fix baseline; 51 `it(` in 11 `describe`s |

### The two things that were genuinely hard

Both are recorded in the Dev sidecar, because neither is guessable and each cost real time:

1. **`Float32Array` is generic as of TS 5.7.** `new Float32Array(n)` infers
   `Float32Array<ArrayBufferLike>`, which does not satisfy
   `AudioBuffer.getChannelData(): Float32Array<ArrayBuffer>` — the failure path runs through
   `SharedArrayBuffer` and reads like a compiler bug. Fixed by declaring
   `Float32Array<ArrayBuffer>` and constructing via `new ArrayBuffer(len * BYTES_PER_ELEMENT)`.
   This was the last error standing.
2. **Unused interface members must be lazy getters, not initialised fields.**
   `readonly listener: AudioListener = unused()` typechecks perfectly and throws in the constructor
   of every test. `tsc` cannot see the difference at all — only running the suite can. `listener`
   and `audioWorklet` are getters for exactly this reason; `destination` IS read by the suite, so
   it is a real `FakeDestination extends FakeNode implements AudioDestinationNode`.

### The design call worth reviewing

Once `createGain()` returns a real `GainNode`, a builder typed `(target: SynthTarget)` sees real
node types, so the local `HumController` had to change from the fakes to
`OscillatorNode`/`GainNode`/`AudioContext`. **The recording still works because the registries stay
fake**: `only().gains`, `contexts()[0].oscillators` and `.sources` are typed `FakeGain[]` etc., so
every existing assertion on `.values`, `.connectedTo` and `.frequency` reaches the doubles
unchanged. Factory RETURNS go real, registries stay fake — that split is what kept this a 280-line
diff instead of a rewrite, and it is closer to what a cabinet actually sees at runtime.

### On TEA's deviation

TEA's `the production synth seams still demand the REAL WebAudio types` guard (logged as a
deviation because no AC asks for it) was never in tension with the work: `src/shared/synth.ts` is
**untouched**, `git diff` on it is empty. The honest route TEA proved reachable was in fact
reachable, at roughly the size TEA measured (~135 probe lines → 280 diff lines with the comments
and call sites). I'd keep that guard: the narrowing it forbids would have been the path of least
resistance at the point where four TS2345s were still red.

**Handoff:** To Reviewer for code review

### TypeScript lang-review self-review (`gates/lang-review/typescript`)

**Correction to TEA's Rule Coverage:** it recorded "`.pennyfarthing/gates/lang-review/` has no
TypeScript checklist in this project." There is one — `typescript.md`, 224 lines — and
`resolve-gate` loads it as a gate extension on this phase. It matters because **checklist item 8 is
this story**: *"`as any` in test assertions to make types match — fix the types instead"* and
*"Mock types not matching real implementation signatures."* This change is the canonical remedy for
both, so the checklist and the ACs agree rather than compete.

Diff audited against every applicable section:

| § | Check | Result |
|---|---|---|
| 1 | `as any`, `as unknown as T`, `@ts-ignore`, `@ts-expect-error`, `!` non-null | **none added** — grepped the diff for each, including `!` |
| 2 | `Record<string, any>`, bare `object`, bare `Function`, missing `readonly` | none — `onended` uses the interface's own explicit signature, recording arrays keep `readonly` |
| 3 | enum anti-patterns | N/A — no enums; `AutomationRate`/`OscillatorType`/`AudioContextState` are the DOM's own string unions |
| 4 | `??` vs `\|\|`, `Map.get()` unchecked, optional-chain misuse | none added |
| 5 | `import type` for a runtime value | correct usage — `SynthTarget` is an interface, type-only, erased at compile time (deliberately, so `vi.resetModules()` and the dynamic `import('../synth')` are undisturbed) |
| 6 | React/JSX | N/A |
| 7 | async/Promise | `resume`/`close`/`suspend`/`decodeAudioData` return `Promise<void>` / `Promise<AudioBuffer>` because the real interface declares exactly that — the contract, not a smell |
| 8 | test quality | the defect this story fixes; see above |

**One pre-existing `as unknown as` remains, at `synth.test.ts:982`** —
`(synth as unknown as Record<string, unknown>).onRebuild`. It is untouched, out of scope, and
correct: the test asserts a member is ABSENT, which cannot be read off a type that does not declare
it. §1 calls the double-cast "almost always wrong"; this is the exception it leaves room for.
TEA's AC2 scanner permits it deliberately (its must-NOT-flag fixtures pin that), because banning it
would be scope creep dressed as rigour. Flagged here so the Reviewer sees it was considered, not
missed.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — all four claimed baselines re-measured and matched exactly |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 4, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — I covered this domain myself; see [DOC] findings, all 4 are mine |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 30 rules / 61 instances | N/A |

**All received:** Yes (4 enabled returned, 5 disabled and pre-filled)
**Total findings:** 8 confirmed, 0 dismissed, 0 deferred

test-analyzer's first return was complete but I asked it for a status re-confirmation before
trusting it; the second return matched the first item-for-item. Its two novel findings were
re-verified by me executing the scanner directly, not accepted on report.

## Reviewer Assessment

**Verdict:** REJECTED — rework round 1
**Severity:** no Critical, no High. One Medium and seven Low.

Let me be exact about what is and is not wrong here, because the balance matters.

**The implementation is correct and I am not asking for any change to it.** All 22 errors are
closed the honest way. The doubles genuinely `implements` the real interfaces; there is no cast, no
`any`, no `@ts-` directive and no non-null assertion anywhere in the added lines — rule-checker
verified that mechanically across 30 rules and 61 instances, and I re-grepped it myself.
`src/shared/synth.ts` is untouched, so the production seam was not narrowed to fit the double.
Preflight re-measured every baseline and all four matched exactly: tsc 0 errors, orchestrator
341/341, shared 26 files / 501 tests, full cabinet 698 files / 10413 + 1 todo. Security empirically
diffed `tsc --listFiles` with the `exclude` key absent versus an explicit `[]` and got byte-identical
1226-line programs. test-analyzer traced every read of `.values`, `.connectedTo`, `.frequency`,
`.gains` and `.oscillators` and confirmed no existing test lost assertion power, and that the
closed-context semantics (`resume()` rejecting, the `rejectClose` flag, `assertOpen()`) survived
byte-for-byte. Four ACs, four met.

**What I am rejecting is the guard that enforces AC2, and the prose describing it.** Those are
deliverables of this story too — the whole point of the suite was that "tsc exits 0" is satisfiable
five ways and four are worthless. A guard with a proven bypass is the fifth way.

### MEDIUM — [TEST] The AC2 scanner can be made to miss a real cast. Confirmed by execution.

`tests/shared-tests-typechecked.test.mjs`, `stripToCode` (~line 140). Found by test-analyzer,
independently reproduced by me:

```
const s = "quote" // contains a stray backtick ` here
const c = ctx as unknown as AudioContext
const t = `template`
```
`findSuppressions()` returns `[]`. The identical cast **without** the first line is flagged.

The mechanism is worth stating precisely, because it is the interaction of two deliberate choices,
not a typo. The line-comment strip is `/^[^\n'"`]*?\/\/.*$/gm` — the negated class excludes quote
characters on purpose, so a URL like `'http://x'` cannot have its own contents eaten. Correct. But
it means any line carrying a quote **before** its `//` keeps its comment intact. Then the
backtick-literal strip, `` /`(?:[^`\\]|\\.)*`/g ``, is the only one of the three whose class does
**not** exclude `\n` — so it pairs the surviving stray backtick with the *opening* backtick of a
real template literal further down and swallows everything between. Here is what the scanner
actually believes it is reading, which is the whole finding in one line:

```
const s = "" // contains a stray backtick ``template`
```

Three lines collapsed into one; the cast vanished.

Not contrived: this file's own comments are dense with backtick-quoted inline code. It is one
odd backtick away.

**Required fix, and I checked it is safe before asking:** bound the backtick literal to a single
line — `` /`(?:[^`\\\n]|\\.)*`/g ``. Measured on the current `synth.test.ts`: **0 multi-line
template literals and 0 lines with an odd number of backticks**, so nothing legitimate is affected.
Add the bypass shape to the scanner's own fixture self-test so it stays closed.

### LOW — the remaining seven

- **[TEST] Angle-bracket false positive.** `findSuppressions('const c = identity<AudioContext>(ctx)')`
  → flagged. `<T>\s*[A-Za-z_(]` cannot tell a generic call from a legacy cast. Fails closed, so it
  is a nuisance not a hole. Either require no identifier character before the `<`, or drop the
  check — the `as` form covers the real risk.
- **[TEST] The AC4 census can be gamed by a swap.** Delete one `it(`, add a trivial one, and 51/11
  is unchanged. Inherent to a count proxy. Not asking for a rewrite — asking that the comment stop
  reading as though the count *is* the AC4 check.
- **[TEST] AC4's real numbers are prose only.** "501 tests across 26 files" appears in a comment;
  no test asserts it. Both test-analyzer and preflight confirmed it currently holds. Say
  explicitly that the it/describe census is a stand-in.
- **[DOC] "every file under src/shared/tests is in the tsc program" — wrong in three places**
  (`tsconfig.json:34`, `synth.test.ts:89`, `monorepo-topology.test.mjs:261`). The test filters to
  `*.test.ts`; `helpers/cookie-jar.ts` and `helpers/storage-stub.ts` are not in that assertion. No
  coverage hole — the "excludes nothing" test backstops it — but it is a countable claim that is
  false. Say "every test file".
- **[DOC] `synth.test.ts:55` says the dynamic `import('../synth')` is "above".** It is at line 392,
  below.
- **[DOC] The `@ts-` ban self-flags on its own documentation.** `synth.test.ts:89` survives only
  because it happens to write the glob `@ts-*`. I verified `// never add @ts-nocheck to this file`
  reddens the guard. A future editor documenting the rule accurately gets blocked. Verified fix:
  require the directive to sit immediately after the comment opener —
  `/(?:^|[^\S\n])\/\/\s*@ts-(?:nocheck|ignore|expect-error)\b|\/\*\s*@ts-(?:nocheck|ignore|expect-error)\b/`
  — which I ran against three real directives (all flagged) and two prose mentions (both clean).
- **[DOC] Miscount.** `shared-tests-typechecked.test.mjs:217` says "the three failure messages";
  the session records four mutations for that test (`as unknown as AudioContext`, `@ts-nocheck`,
  `as any`, `: any`). A reader following the pointer finds four.

### On the disabled specialist

`comment_analyzer` is off in `workflow.reviewer_subagents`, and **every [DOC] finding above is
mine**. On jt8-6 that same gap cost three review rounds because the one domain where all the
defects lived had no specialist. This diff is unusually comment-dense — the doubles carry a
three-point explanatory header, the tsconfig a rewritten rationale — so I treated comment accuracy
as my own responsibility rather than claiming coverage I did not have. Four of the eight findings
came from there. Worth reconsidering the toggle for prose-heavy stories.

### Out of scope, noted not actioned

rule-checker observed that the pre-existing `(synth as unknown as Record<string, unknown>).onRebuild`
at `synth.test.ts:982` could be `'onRebuild' in synth` with no cast at all. It is untouched by this
diff and deliberately carved out by the new scanner's own fixtures. Correct call for this story; a
genuinely better line for a future one.

### What rework looks like

Small and entirely inside the new guard file plus four comment edits. No change to the doubles, the
tsconfig, or any production code. Re-run `npm run test:orchestrator` and `npx tsc --noEmit`; the
vitest baselines cannot move because no `.ts` behaviour changes.

### Rule Compliance

Rubric is `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) plus `javascript.md` for the
two `.mjs` files, plus CLAUDE.md's own conventions. `reviewer-rule-checker` enumerated all of it —
**30 rules, 61 instances, 0 violations** — and I spot-verified the two that carry this story.

| # | Rule | Instances | Result |
|---|------|-----------|--------|
| TS-1 | Type safety escapes (`as any`, `as unknown as T`, `@ts-*`, `!`, type predicates) | 5 | PASS — 0 added. I re-grepped the diff for each independently, including `!`, which is only boolean negation in the `.mjs`. |
| TS-2 | Generic/interface pitfalls (`Record<string,any>`, bare `object`/`Function`, missing `readonly`) | 6 | PASS — 0 |
| TS-3 | Enum anti-patterns | 0 | N/A — `AutomationRate`/`OscillatorType`/`AudioContextState` are lib.dom string unions, not enums |
| TS-4 | Null/undefined handling | 0 | N/A |
| TS-5 | Module/declaration (`import type` for a runtime value, `.js` extension) | 2 | PASS — `SynthTarget` is type-only and correctly imported as such; no extension needed under `moduleResolution: bundler` |
| TS-6 | React/JSX | 0 | N/A |
| TS-7 | Async/Promise | 2 | PASS — `Promise<void>`/`Promise<AudioBuffer>` are the real interface's own signatures |
| TS-8 | **Test quality — this story's subject** | 6 | PASS — see below |
| TS-9 | Build/config | 1 | PASS — `strict`, `skipLibCheck`, `paths` untouched; only the `exclude` removed |
| TS-10 | Type-level input validation | 0 | N/A |
| TS-11 | Error handling | 1 | PASS — `unused()` throws a real `Error` with a message |
| TS-12 | Performance/bundle | 0 | N/A |
| TS-13 | Fix-introduced regressions (meta) | 1 | PASS |
| JS-4 | Equality/coercion | 1 | PASS — `node:assert/strict`, no `==` added |
| JS-6 | Node.js specific | 2 | PASS — `spawnSync(process.execPath, [array], …)`, no shell; explicit `'utf8'` |
| JS-7 | Regex safety | 2 | PASS for ReDoS/injection (`WEBAUDIO_TYPES` is a hardcoded array). **But see the MEDIUM finding — the regexes are safe and still WRONG.** |
| JS-8 | Test quality (`.only`/`.skip`, vacuous assertions) | 3 | PASS |
| JS-9 | Module/scope (`var`, mis-used `const`) | 2 | PASS |
| ADD-1 | Two-suite separation — wiring invariants in the orchestrator suite | 2 | PASS — correctly placed in `tests/*.test.mjs` |
| ADD-2 | `npm run lint` is the only type check | 1 | PASS with judgment — the new test spawns the identical `tsc --noEmit` against the same root config as an ORACLE, not a divergent second configuration |
| ADD-4 | Node ≥ 22.18 | 1 | PASS — `import.meta.dirname` needs ≥20.11 |
| ADD-5 | No-semicolon `.ts`, semicolon `.mjs`, per file | 2 | PASS — 0/233 added `.ts` lines carry `;` |

**TS-8 is the one that matters**, since it is the rule this story exists to satisfy: *"`as any` in
test assertions to make types match — fix the types instead"* and *"Mock types not matching real
implementation signatures."* Both are now genuinely satisfied — `HumController` holds the real
`OscillatorNode`/`GainNode`/`AudioContext`, `makeHumBuilder`'s parameter matches
`persistentVoice`'s signature at `src/shared/synth.ts:95` exactly, and `getChannelData()` gained
its required argument rather than a suppression. **The rejection does not touch TS-8.**

**Tag coverage, stated honestly.** The gate expects eight specialist tags. Only four specialists are
enabled on this project, so four tags cannot be earned: [EDGE], [SILENT], [TYPE] and [SIMPLE] have
no dispatch behind them and I will not write them. Confirmed findings carry [TEST] (from
test-analyzer plus my own scanner probes) and [DOC] (mine — `comment_analyzer` is disabled).
[SEC] and [RULE] returned clean, so they tag no finding. Recording the gap rather than papering
over it: a tag I did not earn would be a fabricated coverage claim in the permanent record, which
is the same defect I am rejecting Dev's prose for.

**Handoff:** To Dev for rework round 1
## Dev Assessment — rework round 1

**Implementation Complete:** Yes
**Files Changed:** `tests/shared-tests-typechecked.test.mjs` (the scanner + its fixtures + three
comments), `tsconfig.json`, `src/shared/tests/synth.test.ts`, `tests/monorepo-topology.test.mjs`
(comment corrections only).
**Tests:** GREEN — orchestrator 358/358, shared 501/501 across 26 files, full cabinet 10413 + 1
todo across 698, tsc 0 errors. Every number identical to the pre-rework baseline.
**Branch:** `main`, commit `e6be6c7`

All eight findings addressed. No production code, no doubles and no tsconfig semantics changed —
the rejection was scoped to the guard and its prose, and so is the fix.

### MEDIUM — the scanner bypass is closed, and pinned

The diagnosis was right and the one-character class fix was the right shape. `[^`\\]` →
`` [^`\\\n] `` on the backtick-literal rule: a literal can no longer span lines, so a stray
backtick reaches at most the end of its own line.

Verified by running the exact bypass, and the stripped output is the proof — before, three lines
collapsed into one; now all three survive:

```
1: const s = "" // contains a stray backtick ` here
2: const c = ctx as unknown as AudioContext
3: const t = ``
```
→ `["cast to AudioContext — the double must satisfy it, not be asserted into it"]`

The bypass is now a **fixture row** in `the suppression scanner flags what it must and ignores what
it must not`, with a comment saying that if that row ever goes green again the line-bounding has
been undone. That is the part that makes this stay fixed.

I confirmed the safety measurement independently before applying it rather than taking it on
report: `synth.test.ts` has **0 multi-line template literals and 0 lines with an odd backtick
count**, so no legitimate literal is affected.

### The seven Low findings

| Finding | Fix | Verified by |
|---|---|---|
| Angle-bracket rule flagged generic CALLS | `(?<![A-Za-z0-9_$])` lookbehind — a cast has nothing before the `<`, a call has its callee | `identity<AudioContext>(ctx)` → clean; `<AudioContext>ctx` → still flagged. Both are fixture rows now. |
| `@ts-*` ban self-flagged on its own documentation | directive must sit immediately after the comment opener (`//` or `/*`) | prose (`// never add @ts-nocheck to this file`, and a mid-sentence mention) → clean; `// @ts-nocheck`, indented `// @ts-expect-error`, `/* @ts-ignore */` → all still flagged. Five new fixture rows. |
| "every file under src/shared/tests" wrong in 3 files | → "every TEST file", plus a line in `tsconfig.json` noting the two `helpers/*.ts` are compiled but not enumerated | `grep` for the old phrasing returns nothing |
| "above" for a line 337 lines below | → "in loadSynth() below" | — |
| "the three failure messages" vs four mutations | → four, and it now says round 1 found two shapes the mutations missed | — |
| AC4 census read as if it WERE the AC | rewritten to say plainly it is a PROXY: catches a deletion, not a swap; the suite's real counts live in the session because running vitest here would cross CLAUDE.md's two-runner boundary and cost ~110s | — |
| "vacuous" overstated for the tsc-exit-0 test | → "insufficient alone", with the three-state table (exclusion present / exclusion gone but doubles unfixed / fixed) showing neither half is tautological | — |

The reviewer was right that "vacuous" was the wrong word, and the three-state table is a better
argument than the one I originally wrote — the middle state is exactly where a half-done fix sits,
and only the pair covers it.

### One thing I did not change

`src/shared/tests/synth.test.ts:982`'s pre-existing `(synth as unknown as Record<string, unknown>)
.onRebuild`. rule-checker's suggestion — `'onRebuild' in synth`, same runtime check with no cast —
is better, and it would let a later story tighten the scanner to ban ALL double-casts in this file
rather than only WebAudio-targeted ones. It is untouched by this story and out of its scope; the
reviewer agreed. Recorded as a Delivery Finding, not smuggled into a rework commit.

### Note on the orchestrator count

358, not 341. A sibling checkout merged mg1-4 (the sprint-YAML `repos:` sweep) into `main` while
this story was in review; I rebased onto it and re-ran everything. My own file still contributes
exactly 7 tests — round 1 added fixture ROWS inside existing tests, not new tests.

**Handoff:** To Reviewer for round 2
## Subagent Results — round 2

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (round 1) | clean | none | Round-1 result stands; I re-ran every command myself for round 2 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes (round 1) | findings | 4 | all 4 confirmed and fixed in rework; I re-verified each fix by execution |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — [DOC] domain owned by me both rounds |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes (round 1) | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes (round 1) | clean | 0 / 30 rules | N/A |

**All received:** Yes (4 enabled returned in round 1; round 2's diff is 6 lines of regex and comment
inside the file they already audited, and I verified it by direct execution rather than re-dispatching)
**Total findings:** 1 new (mine, against my own round-1 fix), confirmed and fixed. 0 dismissed, 0 deferred.

## Impact Summary

**Upstream Effects:** 4 findings (1 Gap, 0 Conflict, 0 Question, 3 Improvement)
**Blocking:** None

Written by hand. `pf sprint story finish` emitted no Impact Summary section at all (a known
failure mode of its auto-writer), so this is compiled from the Delivery Findings above rather
than scraped. Note for anyone grepping this archive later: review round 1 REJECTED this story,
and its findings are recorded in full above. **Every one was fixed and independently re-verified
in round 2** — the round-1 text is history, not outstanding work. The final verdict is APPROVED.

- **Gap:** `comment_analyzer` is disabled in `workflow.reviewer_subagents`, and all four
  documentation findings in round 1 were ones the Reviewer had to find unaided. The same gap cost
  jt8-6 three rounds. Affects `.pennyfarthing` settings — consider enabling it for prose-heavy
  stories, or make the Reviewer's ownership of that domain explicit when it is off.
  *Found by Reviewer during review.*
- **Improvement:** `src/shared/tests/synth.test.ts:982`'s pre-existing
  `(synth as unknown as Record<string, unknown>).onRebuild` can be written `'onRebuild' in synth`
  — same runtime check, no cast — which would let a later story tighten the AC2 scanner to ban ALL
  double-casts in this file rather than only WebAudio-targeted ones. Affects
  `src/shared/tests/synth.test.ts`. Deliberately out of scope here.
  *Found by reviewer-rule-checker.*
- **Improvement:** The shipped doubles are a reusable pattern for any suite needing Web Audio
  without a browser — `implements` rather than a cast, `extends EventTarget` for the listener trio,
  lazy getters for untouched members. Affects `plugins/battlezone` and `plugins/red-baron`, which
  carry weaker fakes (battlezone's `close()` is cosmetic, noted at `synth.test.ts:56-59`, so it
  cannot express the closed-context bug this suite exists to pin). *Found by Dev.*
- **Improvement:** `FakeAudioParam.setValueCurveAtTime` and ~20 unused `create*` members are honest
  `unused()` throwers. If a later story needs several at once, that is the signal to extract the
  double into `src/shared/tests/helpers/` rather than grow it in place. Affects
  `src/shared/tests/synth.test.ts`. *Found by Dev.*

### Downstream Effects

None. No production code changed — the diff is one test file's doubles, one new orchestrator test
file, and the removal of a tsconfig `exclude` key. All eight apps build; the shared library's own
source is untouched.

## Reviewer Assessment — round 2

**Verdict:** APPROVED

Round 1's eight findings are all fixed, and I verified each by running it rather than reading the
diff. The one that mattered — the scanner bypass — is closed at the root cause and, more
importantly, **pinned**: the exact three-line bypass shape is now a fixture row that will redden if
anyone un-bounds the backtick rule again.

### One new finding, which was mine

Round 1's fix added a lookbehind so `identity<AudioContext>(ctx)` would stop being misreported as a
cast. That lookbehind got copied onto the `<any>` rule as well, where it was wrong — `<any>` is
unwanted in *every* position, and `Array<any>` / `Promise<any>` silently stopped being flagged.
Caught by probing my own fix for regressions before approving; fixed in `a70e7d6` and pinned with a
fixture row. Final state, all verified by execution:

| input | result |
|---|---|
| `const xs: Array<any> = []` | flagged |
| `const c = <any>ctx` | flagged |
| `const c = <AudioContext>ctx` | flagged |
| `const c = identity<AudioContext>(ctx)` | clean — a generic call, not a cast |

I also checked whether the tightened `@ts-*` rule had opened a hole with `/** @ts-nocheck */`
(JSDoc form). It has not, and the reason is that **TypeScript does not honour that form at all** —
measured, not assumed: a file with `/** @ts-nocheck */` reports the same 2 errors as a file with no
directive, while `// @ts-nocheck` suppresses to 1. Nothing to fix.

### Rule Compliance

Unchanged from round 1's enumeration (rule-checker: 30 rules, 61 instances, 0 violations). Round
2's diff is six lines inside `tests/shared-tests-typechecked.test.mjs` — one regex, one fixture row,
one comment. It adds no type, no cast, no directive and no production code, so no rule's applicability
changed. TS-8 (mock types matching real implementation signatures), the rule this story exists to
satisfy, was never in question in either round.

### Verification

| | |
|---|---|
| `npx tsc --noEmit` | **0 errors** |
| `npm run test:orchestrator` | **358 / 358** |
| `npx vitest run --project shared` | **26 files, 501 tests** |
| `npx vitest run` | **698 files, 10413 passed + 1 todo** |

Identical to the pre-story baseline on every vitest number, which is AC4. The orchestrator is 358
rather than the 341 recorded at RED because a sibling checkout merged mg1-4 into `main` mid-review.

### All four ACs

- **AC1** — exclusion gone, `tsc --noEmit` exits 0 with `synth.test.ts` genuinely in the program (verified behaviourally from `--listFiles`, not from reading the config).
- **AC2** — the doubles `implements` the real interfaces. No cast, no `any`, no `@ts-*`, no non-null assertion anywhere in the added lines; the production seam in `src/shared/synth.ts` is untouched.
- **AC3** — nothing excluded; the key is absent, and security proved that produces a byte-identical 1226-file program to an explicit `[]`.
- **AC4** — pass counts identical, 51 `it(` in 11 `describe`s intact.

### A note on my own process, since it belongs in the record

Round 1's rejection was defensible: a guard with a demonstrated bypass, shipped as the sole
enforcement of an AC, is worth one round. Round 2 I then spent hunting regressions in my own regex
fix — which did find the real `Array<any>` defect, but only after I had also gone off to
empirically test JSDoc comment semantics in the TypeScript compiler. That was past the point of
usefulness for a 3-point story whose production code had been correct and green since the first
GREEN phase. The user called it, and they were right. Recorded so the next Reviewer on a
guard-shipping story knows where the stopping point is: **fix, verify by execution, approve** —
the guard does not need to be provably perfect, it needs to be better than the hole it replaced.

**Handoff:** To SM for the finish ceremony