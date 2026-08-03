---
story_id: "jt9-5"
jira_key: "jt9-5"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-5: framesFor edge cases: an odd token count is silently dropped, and an invention cue reports the wrong bake error

## Story Details
- **ID:** jt9-5
- **Jira Key:** jt9-5
- **Workflow:** tdd
- **Stack Parent:** none
- **Type:** bug
- **Points:** 2
- **Priority:** p1
- **Branch:** main
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-03T13:36:31Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-03T12:27:23Z | 2026-08-03T12:29:53Z | 2m 30s |
| red | 2026-08-03T12:29:53Z | 2026-08-03T13:01:12Z | 31m 19s |
| green | 2026-08-03T13:01:12Z | 2026-08-03T13:15:33Z | 14m 21s |
| review | 2026-08-03T13:15:33Z | 2026-08-03T13:36:31Z | 20m 58s |
| finish | 2026-08-03T13:36:31Z | - | - |

### Branch and Context
**Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)
**Context File:** sprint/context/context-story-jt9-5.md ✓ (created)

## Background

**Epic:** jt9 — Joust — the remainder, re-ordered: apparatus, gameplay, geometry, brains, dossier

**Story Overview:** Two edge cases in the `framesFor` derivation (`plugins/joust/src/shell/audio-manifest.ts`):

1. **Defect 1: Odd token count silently dropped** — The `framesInRow` function loops `for (let i = 0; i + 1 < pairs.length; i += 2)`, so a row with an ODD number of tokens (a sound code with no duration operand) has its tail silently dropped and the cue window comes out short with no error. Defended indirectly by `tests/audio-rom-citations.test.ts` and `tests/audio-transporter-split.test.ts` which re-open every row byte-exact; a malformed row cannot match the vendored file. But the defence is a different mechanism from the failure — should close it directly.

2. **Defect 2: Invention cue gets wrong error message** — The `framesFor` function returns 0 for any `invention` cue (line 567: `if (source.kind !== 'rom') return 0`), so it gets FRAME_DURATIONS = 0. Then `bake-samples.mjs:335` checks `if (!(frames > 0))` and throws "no FRAME_DURATIONS entry" — but there IS an entry, it's 0 because the cue has no ROM table to size it. All 18 shipped cues are `kind: rom` today, so neither fires in production; but the invention arm exists precisely so a later story can use it, and that story hits a misleading error.

**Loaded Chamber (jt9-4 Reviewer added this):** jt9-4 pinned the error message with `toBe` on the whole string "no FRAME_DURATIONS entry for '<cue>' — the ROM window sizes the file" in `plugins/joust/tools/sample-bake/bake-samples.test.mjs`. One test, "a window of ZERO frames is refused too, not silently baked as an empty file" (lines 500-522), drives this with an entry of exactly 0 — which is case (2), the case this story exists to change. When this story fixes defect (2), that test will go RED. Expect it, budget for it, and re-word the guard and its message together.

**FRAME_DURATIONS assertion count:** 19 mentions in bake-samples.test.mjs (verified via grep).

## Delivery Findings

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Conflict** (non-blocking): the story's `:525` citation for `framesFor` points at
  `framesInRow` — a different real function in the same file. Confirmed. Today `framesFor`
  is at `:566`. Every reference this story produced cites the SYMBOL. Owner: **jt9-30**
  (line refs -> symbol refs), already filed; this is one more instance for it, not a new
  story. *Found by TEA during test design.*
- **Gap** (non-blocking): the dispatch's premise that nothing pins the eighteen windows by
  value is REFUTED. `plugins/joust/tests/audio-priority.test.ts` ("matches the ROM table
  summed across every (code, duration) pair") already asserts all eighteen against a
  transcribed `ROM` table. jt9-32's territory is what the bake PRODUCES (.wav bytes), which
  is genuinely unpinned and untouched here. The AC-5 guard was still written, off the
  exported record rather than through `createAudioEngine()`, and it is the guard N16 reddens.
  *Found by TEA during test design.*
- **Improvement** (non-blocking): `bake-samples.test.mjs`'s recorded mutant **M15** ("`if
  (!(frames > 0))` -> `if (frames === undefined)`") no longer describes a meaningful mutation
  once this story splits that gate — the presence check it substituted becomes a real,
  separate gate one line above. Annotated in place rather than renumbered. jt9-4's M-series
  is otherwise intact. *Found by TEA during test design.*
- **Question** (non-blocking): `audio-transporter-split.test.ts`'s `load()` helper swallows
  import failures and returns `{}`, so a throw raised while `FRAME_DURATIONS` is built at
  module load surfaces there as "jt5-6 not implemented yet: ... must export `framesFor`".
  Not changed by this story (out of scope, and the file is jt5-6's), but it will misreport
  the first time either new throw fires on real data. jt9-5's own file uses a non-swallowing
  loader for exactly this reason. **Needs an owner story if it is to be closed** — naming it
  here so it is not lost. *Found by TEA during test design.*

### Dev (implementation)

- No upstream findings. SM already filed **jt9-33** for the `audio-transporter-split.test.ts`
  `load()`-swallow finding TEA raised above (confirmed by re-reading the story prompt's own
  note); nothing new surfaced during implementation or the independent mutation battery.

### Reviewer (code review)

- **Gap** (non-blocking): the two new `audio-manifest.ts` throws are pinned only as
  SUBSTRINGS — vitest's `toThrowError(string)` is `includes()`, not equality — so text
  appended to either message ships green. Measured: mutants R4 and R5 both SURVIVED a full
  105-file / 2533-test run. The sibling half of the same story pins the bake's two messages
  with `expect(err.message).toBe(...)`, which is exact; two standards of rigour in one story.
  Filed as **jt9-34** (1 pt, p2) with both mutants and the verification recipe.
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): jt9-33 is filed accurately but is understated at p2. Re-ran
  TEA's N27 against the whole joust project: of the 53 test-level failures a real import-time
  throw produces, **zero** carry the manifest's message. All 53 report a "must export" line
  across nine variants (`CUE_SOURCES` 26, `SOUNDS` 10, `bakeSamples` 5, `framesFor` 3,
  `FRAME_DURATIONS` 2, `CHANNELS` 2, `createAudioEngine` 1, `DEFAULT_BASE_URL` 1). The real
  diagnosis survives only in the five suite-level collection errors. Measurement appended to
  jt9-33's description; owner unchanged. *Found by Reviewer during code review.*
- **Gap** (non-blocking): three prose claims in this diff were measurably false and are FIXED
  IN PLACE here rather than rejected (standing rule). (a) `audio-manifest.ts` and the test
  file both said an `Infinity` window "reaches `Buffer.alloc`"; measured, it dies one step
  earlier at `new Float32Array(n)` in the synth spec (`RangeError: Invalid typed array
  length: Infinity`) and `encodeWav` is never reached. (b) `audio-frames-edge-cases.test.ts`
  quoted N27's measured output as "1 operands" — the PRE-reword wording that commit `7d11cf8`
  replaced; the reword updated the three assertions and N3's entry but not this quotation of
  the code's own output (`correction-is-itself-a-transcription`). (c) the same note claimed
  the real message reaches "all 58 failures across 11 files"; measured, 5 of 58.
  *Found by Reviewer during code review.*

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **AC-3 resolved to option (b), not option (a)**
  - Spec source: context-story-jt9-5.md, AC-3
  - Spec text: "An `invention` cue either: (a) Throws in `framesFor` with a message that distinguishes 'no ROM window to derive from' (for invention cues) from 'FRAME_DURATIONS entry missing' (for ROM cues with no entry), OR (b) Requires `invention` cues to carry an explicit frame window in `CueSource` (design change), in which case `framesFor` returns that window and the bake gate remains unchanged."
  - Implementation: tests are written against (b) — the invention arm gains a required `frames: number`, `framesFor` returns it, and throws only when it is not a positive whole number.
  - Rationale: (a) yields an error whose remedy is impossible, since the arm's own doc comment calls it "the honest escape hatch for a later story" and a hatch that throws is not one; refusing a declared 0 under (b) is what stops the fix relocating the defect.
  - Severity: major
  - Forward impact: minor — any later story adding an invention cue must declare a positive `frames` window; jt9-32 (bake output pinning) is unaffected.

- **The bake's missing-entry check becomes `Object.hasOwn`, not a bare presence test**
  - Spec source: context-story-jt9-5.md, Implementation Strategy Phase 2
  - Spec text: "Fix the invention cue path in `framesFor` or `bake-samples.mjs`: throw with appropriate message"
  - Implementation: `bake-samples.mjs`'s single `if (!(frames > 0))` gate is split in two, and the missing half is `!Object.hasOwn(frameDurations, name)`; pinned by "an INHERITED duration is not an entry".
  - Rationale: splitting the gate forced a choice of how "missing" is detected, and `=== undefined` would contradict the `Object.hasOwn(SPECS, name)` line jt9-4 landed directly above it.
  - Severity: minor
  - Forward impact: none

- **A new test file, so joust's derived README test-file count moves 104 to 105**
  - Spec source: context-story-jt9-5.md, Implementation Strategy Phase 1
  - Spec text: "Test for odd token count: construct a verbatim row with odd operand count, pass to `framesInRow`, expect throw"
  - Implementation: the tests live in a new `plugins/joust/tests/audio-frames-edge-cases.test.ts` rather than being added to an existing file, and `plugins/joust/README.md:48` was bumped to 105 by TEA.
  - Rationale: a new file allows literal, non-swallowing imports (audio-transporter-split.test.ts's `load()` returns `{}` on an import failure and would misreport this story's module-load throws), and `audio-seam-scope.test.ts` derives and guards that count so the bump had to happen for the RED to come from the story's own assertions.
  - Severity: minor
  - Forward impact: none

- **The pairing message reads "an odd operand count (N)" rather than "N operands"**
  - Spec source: context-story-jt9-5.md, AC-1
  - Spec text: "A row with an odd number of tokens throws on entry to `framesInRow`, with a message that identifies which row and indicates the malformed operand count."
  - Implementation: the count is stated as "an odd operand count (N)"; the row is quoted verbatim; no pluralisation branch was added.
  - Rationale: mutant N27 produced the real shape "1 operands" on a lost trailing duration, and a pluralisation ternary would add a branch neither test probe reaches — trading a wart for an unguarded path.
  - Severity: minor
  - Forward impact: none

### Dev (implementation)

- No deviations from spec. TEA's diff was applied verbatim (`git diff` confirmed byte-for-byte
  identical to the diff pasted in this session file before committing); nothing to relitigate.

### Reviewer (audit)

Four declared deviations audited; all four **ACCEPTED**. One **UNDOCUMENTED** deviation found.

- **ACCEPTED — AC-3 resolved to option (b).** Re-opened `sprint/context/context-story-jt9-5.md`
  and the AC text is quoted accurately: AC-3 itself offers "(b) Requires `invention` cues to
  carry an explicit frame window in `CueSource` (design change)". The type widening is
  therefore SPEC-SANCTIONED, not scope creep. Independently checked whether the required field
  is decorative: it is not. Mutant R1 (`frames: number` -> `frames?: number`) SURVIVES the
  entire vitest suite (105 files / 2533 passed) and is KILLED by `npm run lint` with
  `TS18048` and `TS2322` on `framesFor`'s own use of the field. The requiredness is real and
  CI-enforced — but by the type checker alone, not by any test.
- **ACCEPTED — the bake's missing check becomes `Object.hasOwn`.** Verified by two mutants:
  R3 (`hasOwn` -> `name in frameDurations`) and R10 (`hasOwn(frameDurations)` ->
  `hasOwn(SPECS)`, the copy-paste shape the neighbouring line invites) are both KILLED.
- **ACCEPTED — new test file, README 104 -> 105.** Mutant R7 (README back to 104) is KILLED by
  `audio-seam-scope.test.ts`'s derived file-count guard, with an anchored regex. The count is
  correct and the guard is live.
- **ACCEPTED — "an odd operand count (N)" rather than "N operands".** The rationale (no
  pluralisation branch, because neither probe would reach it) is sound and matches the
  measured N27 output.
- **UNDOCUMENTED — AC-3(b) says "the bake gate remains unchanged", and the bake gate was
  changed.** Not a defect, and NOT scope creep: the story description's own text names the
  bake's false message as half of defect (2) ("but there IS an entry"), and AC-4 required the
  loaded chamber to go red, which the kind-keyed fix alone does not do. So the split is
  authorised and independently correct. But the declared deviation covers only HOW "missing"
  is detected (`Object.hasOwn` vs `=== undefined`) and never records that an AC clause
  predicting no bake change was overtaken. Stamped here rather than raised as a finding.

## Sm Assessment

**Routing:** tdd (phased) → red → TEA. 2-point p1 bug-fix story, and unlike jt9-3 and
jt9-4 this one CHANGES BEHAVIOUR: two defects get closed, both currently unreachable in
production, both real.

**All four load-bearing facts re-opened by SM, and they hold:**

1. `framesInRow` (audio-manifest.ts:525) really does drop an odd tail:
   `for (let i = 0; i + 1 < pairs.length; i += 2) frames += evaluateOperand(pairs[i + 1]!)`.
   A sound code with no duration operand is silently skipped and the window comes out
   short. No error, no log.
2. `framesFor` (:566-567) really does open `if (source.kind !== 'rom') return 0`, so an
   `invention` cue gets a FRAME_DURATIONS entry of exactly 0 — and the bake's
   `if (!(frames > 0))` then reports `no FRAME_DURATIONS entry`, which is false. There IS
   an entry.
3. THE LOADED CHAMBER IS REAL AND IT IS BETTER THAN THE STORY SAYS. jt9-4's TEA did not
   merely pin the message — it wrote a nine-line comment INSIDE the test naming jt9-5 as
   the owner, explaining why the message becomes a lie, and stating that pinning it here
   is what makes jt9-5's change arrive as a red test rather than as prose nobody
   re-reads. `bake-samples.test.mjs:500-522`, `a window of ZERO frames is refused too,
   not silently baked as an empty file`. Fourteen assertions in that file mention
   FRAME_DURATIONS; two assert the whole message with `toBe` (:496 and :520).
4. The story's own citation has already gone stale in the way jt9-30 exists to fix. It
   cites `:525` for `framesFor`. Today `:525` is `framesInRow` — a DIFFERENT function in
   the same file. The stale ref does not dangle; it points at the wrong real code, which
   is the harder failure to notice.

**THE WRINKLE, AND IT IS THE ONE THING I WANT TEA TO RULE ON FIRST.** The story assumes
the chamber will fire. It fires only under one of the two possible fixes.

The ZERO-frames test drives its zero by INJECTING one onto a shipped ROM cue:
`frameDurations: { ...FRAME_DURATIONS, enemyThud: 0 }`. `enemyThud` is `kind: 'rom'`. So
the test's zero and an invention cue's zero are the SAME VALUE arriving for TWO DIFFERENT
REASONS.

- If the fix keys on the VALUE (0 means "no window, say so differently"), the chamber
  goes RED as designed.
- If the fix keys on the CUE'S KIND (an `invention` cue reports a different error), the
  chamber STAYS GREEN — `enemyThud` is still `rom`, still gets the old message — and
  jt9-4's whole delivery mechanism silently fails to fire.

The second is arguably the more correct fix, because the two zeros genuinely mean
different things: an injected 0 on a rom cue IS a missing window, while an invention
cue's 0 is a cue that never had one. **TEA decides, but must decide EXPLICITLY and say
which.** If the answer is "key on kind", then the chamber did not fire and TEA owes a
guard for the invention case that does — do not let a green chamber be read as "no work
needed here". That is the `guard-tests-name-uncovered-cases` shape: a test named after an
incident need not cover that incident.

**Both defects are unreachable today, so both tests must CONSTRUCT their input.** State
the construction plainly. jt9-4 just built the lever for half of it — `bakeSamples(outDir,
opts)` with `opts.sounds` / `opts.frameDurations` — and the odd-row half needs a synthetic
verbatim row, not a real one. A test that cannot reach the defect is worse than none,
because it also claims coverage.

**The indirect defence is real and it is a DIFFERENT MECHANISM, which is the story's
whole argument.** `tests/audio-rom-citations.test.ts` re-opens every defining row
byte-exact and `tests/audio-transporter-split.test.ts` every continuation row, so a
malformed row cannot match the vendored file. That stops a malformed row ARRIVING; it
does nothing about `framesInRow` MISHANDLING one. Closing the second is the story.

**Watch for jt9-32's territory.** jt9-4 filed jt9-32 because nothing pins WHAT the bake
produces — a synthesis constant can change all eighteen .wav files unnoticed. Defect (1)
changes how a window is COUNTED, so a mistake here moves real durations with no guard to
catch it. Assert the eighteen shipped windows are unchanged, by value, before and after.

**Branch:** none. Trunk-based; work lands on `main`.

## Tea Assessment

**Tests Required:** Yes
**Status:** RED — 10 failing, for the right reasons, verified by name after revert.

**Test Files:**
- `plugins/joust/tests/audio-frames-edge-cases.test.ts` (NEW) — 12 tests: AC-1 odd-token
  refusal (3 + 2 positive controls), AC-3 invention window (4 + 1 control), AC-5 the
  eighteen windows and the shipped-row parity precondition (2).
- `plugins/joust/tools/sample-bake/bake-samples.test.mjs` (EDITED) — jt9-4's chamber
  re-worded, plus 2 new guards (a negative window; an inherited duration).
- `plugins/joust/README.md` — derived test-file count 104 -> 105.

**Tests Written:** 14 new (12 + 2), covering AC-1, AC-3, AC-4, AC-5, AC-6. Suite 2519 -> 2533.

### THE RULING SM ASKED FOR FIRST: key on KIND. The chamber's assertion stays GREEN.

The fix for defect (2) keys on the cue's KIND and lives in `framesFor`, because
`bake-samples.mjs` receives a `Record<string, number>` and cannot see `kind` — it could
never write a truthful message about invention-ness. `enemyThud` is still `kind: 'rom'`, so
jt9-4's chamber is untouched by that fix and does NOT fire on it. Measured, not reasoned:
with the candidate fix applied, the chamber's original assertion passed.

**What I therefore owe, and have discharged:**
1. `an invention cue no longer reports a window of ZERO` machine-checks the premise of
   jt9-4's nine-line comment ("framesFor() returns 0 for any `invention` cue"), which this
   story makes false. That premise was prose; it is now a test.
2. The chamber DOES go red — for a smaller, independently true reason. Its own probe injects
   `{ ...FRAME_DURATIONS, enemyThud: 0 }`, an entry that EXISTS and is zero, and was told
   "no FRAME_DURATIONS entry". That message is a lie about the chamber's own input. The bake
   now distinguishes an absent key from a present non-positive value. This is the second half
   of the story, and it is what makes jt9-4's delivery mechanism fire.

### Mutation battery: 27 mutants, 1 survivor (equivalent)

Applied against the candidate fix, uncommitted, one at a time; every write re-read from disk
and diffed against a pristine snapshot before its run; restored from that snapshot, never
`git checkout --` (the fix under test was uncommitted). `git status --porcelain` clean of
stray files afterwards. Full list, per-mutant reds and per-guard annotations are in
`plugins/joust/tests/audio-frames-edge-cases.test.ts`.

**Survivor:** N8 (`i + 1 < pairs.length` -> `i < pairs.length`). EQUIVALENT, not a gap: the
new pairing guard makes `pairs` always even, so the two bounds admit identical iterations.
No test should be written for it — it would pass vacuously forever.

**Guards no mutant reached, stated rather than left for the Reviewer:**
- `POSITIVE CONTROL: every cue in CUE_SOURCES is kind: rom` — unreachable by construction; it
  pins a fact about DATA, and the only mutation that moves it trips the citation gate and the
  type checker first. Correct as written.
- `EVERY shipped row is even` — no mutant reddens it and **N27 proves none can.** Dropping the
  trailing operand from SNEDIE's shipped row makes the manifest throw at module load, this
  test file's own top-level import fails, and vitest reports `audio-frames-edge-cases.test.ts
  (0 test)`. The guard does not run in the one scenario it is named after
  (`guard-tests-name-uncovered-cases`). Its comment claimed the opposite and has been
  corrected in place; the measured collection error names the row byte-for-byte and beats
  what the guard would have said, which is why it stays rather than being deleted.

**Two mutants added because the first 25 left holes:** N26 (refuse a pair-less row) reddens
the "NO pairs at all" control and nothing else — that control was unexercised. N27 is above.

**Expect the Reviewer to find more.** The thinnest guard is `an invention cue no longer
reports a window of ZERO`: one mutant (N15) reaches it. The bake's three message guards and
the AC-1 trio are the best covered.

### Verification

| Gate | Result |
|---|---|
| `npx vitest run --project joust` (RED, after revert) | 10 failed / 2523 passed (2533), 105 files |
| same, with the candidate fix applied | **105 files / 2533 passed** |
| `npm run lint` | clean |
| `npm run test:orchestrator` | 390 / 390 |

### What remains for Dev — the exact diff, measured green

This diff was applied, run to full green, mutated 27 ways, then REVERTED. Apply it as-is; it
is not a sketch. Traps, each learned from a mutant:

- The pairing check goes **before** the loop (N7 is caught only by "the pairing check runs
  BEFORE any operand is evaluated").
- The condition is `pairs.length % 2 !== 0` and nothing stricter — a priority-only row is
  legal and must return 0 (N26).
- `Number.isInteger` is load-bearing: `Infinity > 0` is true and reaches `Buffer.alloc` (N9).
- `<= 0`, not `< 0` — a declared 0 must throw or the defect merely moves (N11).
- The bake's missing check is `Object.hasOwn`, not `=== undefined` (N18).
- Do **not** change the loop bound. N8 shows it is equivalent; changing it is churn.
- Leave `bake-samples.test.mjs`'s M-series numbering alone; M15's annotation is already updated.

```diff
diff --git a/plugins/joust/src/shell/audio-manifest.ts b/plugins/joust/src/shell/audio-manifest.ts
index a4e625c..8aee2c6 100644
--- a/plugins/joust/src/shell/audio-manifest.ts
+++ b/plugins/joust/src/shell/audio-manifest.ts
@@ -120,7 +120,18 @@ export type CueSource =
       /** Where the game plays it. */
       callSite: Citation
     }
-  | { kind: 'invention'; note: string }
+  | {
+      kind: 'invention'
+      note: string
+      /**
+       * How many frames this invented cue holds the voice. REQUIRED, and that is
+       * the jt9-5 fix: there is no ROM table to derive a window from, so an
+       * invention must state its own. Before jt9-5 this field did not exist,
+       * `framesFor` returned 0 for the whole arm, and the bake then reported
+       * `no FRAME_DURATIONS entry` about an entry that existed and was zero.
+       */
+      frames: number
+    }
 
 const SRC = 'JOUSTRV4.SRC'
 
@@ -528,6 +539,22 @@ function framesInRow(verbatim: string, skipPriority: boolean): number {
     .map((t) => t.trim())
     .filter((t) => t.length > 0)
   const pairs = skipPriority ? tokens.slice(1) : tokens
+  // An ODD count is a sound code with no duration after it. Before jt9-5 the
+  // loop below simply never reached it — `i + 1 < pairs.length` stops one pair
+  // short — so the window came out short with no error and no log, which is the
+  // one failure mode a frame count cannot advertise: a cue that stops holding
+  // the voice early sounds like a cue, not like a bug. The check is BEFORE the
+  // loop on purpose: a row that has lost a token puts every later operand in
+  // the wrong column, so `unparseable ... operand` is the symptom and this is
+  // the cause.
+  if (pairs.length % 2 !== 0) {
+    throw new Error(
+      `sound-table row has an unpaired sound code — an odd operand count ` +
+        `(${pairs.length})` +
+        `${skipPriority ? ' after the priority byte' : ''} cannot form (code, duration) ` +
+        `pairs: '${verbatim}'`,
+    )
+  }
   let frames = 0
   for (let i = 0; i + 1 < pairs.length; i += 2) frames += evaluateOperand(pairs[i + 1]!)
   return frames
@@ -564,7 +591,21 @@ function framesInRow(verbatim: string, skipPriority: boolean): number {
  * BUT EXTENDS TIMER", which is what makes SNPCR1 450 rather than 285.
  */
 export function framesFor(source: CueSource): number {
-  if (source.kind !== 'rom') return 0
+  if (source.kind !== 'rom') {
+    // jt9-5. Not `return 0`: a 0 here becomes a FRAME_DURATIONS entry of 0, and
+    // the bake's `!(frames > 0)` then says the entry is MISSING, which is false.
+    // `Number.isInteger` rather than a bare `> 0` because Infinity passes `> 0`
+    // and `Math.round((Infinity / FRAME_HZ) * RATE)` reaches `Buffer.alloc` in
+    // the bake, where it fails as something unrecognisable.
+    if (!Number.isInteger(source.frames) || source.frames <= 0) {
+      throw new Error(
+        `invented cue '${source.note}' declares a frames window of ${source.frames} — ` +
+          `an invention has no ROM table to size it, so it must declare a positive ` +
+          `whole number of frames`,
+      )
+    }
+    return source.frames
+  }
   let frames = framesInRow(source.source.verbatim, true)
   for (const row of source.continuation) frames += framesInRow(row.verbatim, false)
   return frames
diff --git a/plugins/joust/tools/sample-bake/bake-samples.mjs b/plugins/joust/tools/sample-bake/bake-samples.mjs
index a373af8..49a70c5 100644
--- a/plugins/joust/tools/sample-bake/bake-samples.mjs
+++ b/plugins/joust/tools/sample-bake/bake-samples.mjs
@@ -331,9 +331,20 @@ export async function bakeSamples(outDir, opts = {}) {
         `no synth spec for manifest cue '${name}' — a new cue must arrive with its own sound`,
       )
     }
+    // jt9-5 split what was one gate. `!(frames > 0)` fires on an ABSENT entry
+    // and on a PRESENT-but-zero one alike, and "no FRAME_DURATIONS entry" is
+    // false of the second — the fault jt9-4's own zero-window probe was told
+    // about itself. `Object.hasOwn`, matching the SPECS read above: an
+    // inherited Object.prototype member is an absence, not an entry.
+    if (!Object.hasOwn(frameDurations, name)) {
+      throw new Error(`no FRAME_DURATIONS entry for '${name}' — the ROM window sizes the file`)
+    }
     const frames = frameDurations[name]
     if (!(frames > 0)) {
-      throw new Error(`no FRAME_DURATIONS entry for '${name}' — the ROM window sizes the file`)
+      throw new Error(
+        `FRAME_DURATIONS entry for '${name}' is ${frames}, not a positive frame window — ` +
+          `a zero-length bake writes a header with no audio in it`,
+      )
     }
     const n = Math.round((frames / FRAME_HZ) * RATE)
     const samples = spec(n, mulberry32(seedFrom(name)))
```

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/joust/src/shell/audio-manifest.ts` — `CueSource`'s `invention` arm gains a
  required `frames: number`; `framesInRow` throws before the loop on an odd operand count
  (naming the row and its count); `framesFor`'s `invention` branch returns `source.frames`,
  refusing anything not a positive whole number (`Number.isInteger` guards `Infinity`).
- `plugins/joust/tools/sample-bake/bake-samples.mjs` — the single `!(frames > 0)` gate is
  split: `Object.hasOwn(frameDurations, name)` catches an absent key first (matching the
  `SPECS` hardening one line above), then the value gate reports a present-but-non-positive
  entry with its own message.

Applied TEA's diff verbatim (`git diff` byte-for-byte matches the session-file diff, checked
before committing). No deviation from the measured fix — nothing left to relitigate.

**Independent mutation battery:** 12 of TEA's 27 mutants re-applied one at a time, against
my OWN literal-substitution harness (not TEA's), each verified to have actually changed the
file (`diff` against a pristine snapshot before running, and after restoring — never
`git checkout --`, since the fix was uncommitted at battery time):

| id | site | mutation | result |
|---|---|---|---|
| D1 | `framesInRow` pairing guard | `!== 0` → `=== 0` (inverted) | KILLED — module fails to collect (throws at import; both test files report 0 tests) |
| D2 | `framesInRow` loop bound | `i + 1 < pairs.length` → `i < pairs.length` (**= TEA's N8**) | **SURVIVED** — 33/33 still pass |
| D3 | `framesInRow` pairing guard | deleted entirely (restores the original defect) | KILLED — 3 failed |
| D4 | `framesFor` invention gate | `Number.isInteger(...) \|\| frames <= 0` → `Number.isInteger(...)` only | KILLED — 2 failed |
| D5 | `framesFor` invention gate | same → `frames <= 0` only (drops the integer check) | KILLED — 1 failed |
| D6 | `framesFor` invention gate | `<= 0` narrowed to `< 0` (relocates the defect to a declared 0) | KILLED — 1 failed |
| D7 | `framesFor` invention arm | `return source.frames` → `return 60` (hardcoded) | KILLED — 1 failed |
| D12 | `framesInRow` | `skipPriority ? tokens.slice(1) : tokens` → `tokens` (drops the slice) | KILLED — module fails to collect (breaks a shipped row's parity) |
| D8 | bake missing-entry gate | `Object.hasOwn(...)` → `frameDurations[name] === undefined` | KILLED — 1 failed |
| D9 | bake missing-entry gate | deleted entirely | KILLED — 2 failed |
| D10 | bake zero-window gate | `!(frames > 0)` → `!(frames >= 0)` (lets 0 pass) | KILLED — 1 failed |
| D11 | bake zero-window gate | deleted entirely | KILLED — 2 failed |

**11 killed, 1 survivor (D2).**

**Assessment of TEA's "N8 is equivalent" claim: CONFIRMED, independently.** D2 is the exact
mutation TEA labelled N8, reproduced from a fresh reading of the diff rather than copied from
TEA's file, and run against my own harness. It survives for the reason TEA gave: the pairing
guard added directly above the loop makes `pairs.length` always even by the time the loop
runs, so `i + 1 < len` and `i < len` admit exactly the same set of iterations — the bound
change is unobservable given its own precondition. I looked for a way to make it observable
(a row long enough that `pairs[i+1]` would go out of bounds under some other combination) and
found none: with `pairs` even, the last iteration under either bound has `i = len - 2`, and
`pairs[i+1]` is always the final element. No test should be written for it. The claim holds.

**Trap avoided, the hard way:** my first battery run gave a uniform false "KILLED" for every
mutant, including D2. Cause: `npx vitest run --project joust $TESTFILES` with `$TESTFILES`
an unquoted zsh variable holding two space-separated paths — zsh does not word-split unquoted
variables the way bash does, so vitest received one argument containing a literal space and
reported "No test files found, exiting with code 1". Every mutant looked killed for a reason
that had nothing to do with any guard. Caught by re-reading the FULL vitest output for one
mutant instead of trusting the exit code and a grep that came back empty — the same
"verify what actually happened, not just the exit status" discipline TEA's own note about a
mutation silently failing to apply describes, just on the harness side instead of the file
side. Fixed with a zsh array (`testfiles=(...)`, `"${testfiles[@]}"`) and the whole battery
re-run from a confirmed-pristine file each time.

**The eighteen shipped windows, confirmed unchanged by value:** ran `FRAME_DURATIONS` through
node directly post-fix and diffed against `audio-priority.test.ts`'s `ROM` table (the
transcribed ground truth, not the code under test) — all eighteen entries match exactly
(enemyDeath 20 … enemyThud 31). `audio-priority.test.ts` itself passed in the full green run.

**README:** `plugins/joust/README.md:48` already reads 105 (TEA's edit, delivered with the
RED); confirmed against the actual green run (105 files / 2533 tests) — no drift to fix.

**Tests:** 105/105 files, 2533/2533 passing (GREEN). `npm run lint` clean.
`npm run test:orchestrator` 390/390.

**Branch:** main (trunk-based, pushed not required per repo convention — commit is on `main`
directly). Commit `099e91d`.

**Handoff:** To review phase (Reviewer, dispatched by SM — not invoked here).
## Subagent Results

| # | Subagent | Status | Findings | Severity | Notes |
|---|----------|--------|----------|----------|-------|
| 1 | reviewer-preflight | Received | 0 | N/A | 105 files / 2533 passed; lint clean; orchestrator 390/390; tree clean |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings |

**All received: Yes**

Eight of nine specialists are disabled (`pf settings get workflow.reviewer_subagents`), so per
`reviewer-subagents-disabled-use-mutation` the analysis instrument was a **13-mutant R-series
battery** run by me, not subagent prose. Every mutant was applied by a script that refuses a
non-unique anchor, re-reads the file from disk, and prints a `diff` against a pristine snapshot
BEFORE the run; every run was the FULL `--project joust` (105 files), read in full rather than by
exit code; every restore was verified by `diff -q` plus `git status --porcelain`.

## Reviewer Assessment

**Verdict:** APPROVED

### The two rulings this review was dispatched to make

**1. N8 / D2 ("the loop bound is an equivalent mutant") — CONFIRMED, and now measured rather
than reasoned.** Two agents reached this by the same syllogism; I did not accept it.

- *Structural:* `framesInRow` is module-private. `grep` over the whole repo returns exactly two
  call sites, both inside `framesFor` (`audio-manifest.ts:609` and `:610`), and the parity guard
  is unconditional and lexically first in the body. **There is no path to the loop that bypasses
  the guard** — the requested counter-example cannot be constructed.
- *Exhaustive:* enumerated the iteration sets of `i + 1 < len` and `i < len` for every EVEN
  `len` in 0..40 — the entire reachable domain past the guard. They are identical at every one
  (`[]` differences). They diverge at every ODD `len` in 1..41, all of which the guard makes
  unreachable.
- *Empirical:* mutant **R8** (the exact substitution) SURVIVED at 105 files / 2533 passed, with
  the diff printed to prove it applied.
- *Harness positive control:* **R9** (`i <= pairs.length`, one notch further) was KILLED at
  11 files / 53 tests. A harness that cannot redden is a harness that proves nothing; this one
  reddens.

Equivalent. Do not write a test for it, and do not "tidy" the bound either — the redundancy is
the guard's own precondition, and TEA's note that the old bound was what protected `pairs[i+1]!`
is accurate.

**2. The `frames: number` API widening — NOT scope creep, and NOT decorative.** Two independent
checks. (a) `context-story-jt9-5.md` AC-3 offers option (b) verbatim — "Requires `invention`
cues to carry an explicit frame window in `CueSource` (design change)". The spec asked for it.
(b) The interesting half: is a required field on an arm nobody constructs a real constraint?
Mutant **R1** relaxes it to `frames?: number`. It SURVIVES the whole suite — 2533 green — and is
KILLED by `npm run lint` (`TS18048: 'source.frames' is possibly 'undefined'`, `TS2322`), because
`framesFor` reads the field under strict mode. So the constraint is enforced, by the only gate
that can enforce a type — and CI runs `npm run lint` before every deploy. Worth knowing that
**no test defends it**; the AC-3 probes reach the arm through a locally-declared mirror that
types `frames` optional, so they are blind to the real type by construction.

Does `Number.isInteger` reject anything a legitimate caller would pass? No. It rejects `12.5`,
`NaN` and `Infinity`; a frame window is a count of 60Hz frames and a fractional one is not a
thing the ROM can express. Mutant **R12** (`isInteger` -> `isFinite`, which would admit `12.5`)
is KILLED. Is there a value that produces a WORSE outcome than the old `return 0`? I looked for
one and there is none: every rejected value now throws with its own value interpolated, where
before every one of them silently became `0` and drew a message asserting the entry was missing.

### Mandatory steps

**Data flow traced, end to end.** Vendored ROM row text -> `CUE_SOURCES[x].source.verbatim` ->
`operandsOf` (tab split, column 2, `FCB` asserted) -> `split(',')` / `trim` / drop empties ->
`pairs` (`slice(1)` on a defining row) -> **the new parity guard** -> `evaluateOperand(pairs[i+1]!)`
summed -> `framesFor` -> `FRAME_DURATIONS` (built EAGERLY at module load, `audio-manifest.ts:620-623`)
-> the bake's `frameDurations[name]` -> **the two split gates** -> `Math.round((frames/FRAME_HZ)*RATE)`
-> `spec(n, rng)` -> `new Float32Array(n)` -> `encodeWav` -> `writeFileSync`. Safe because each
new gate bounds the next stage: parity bounds `pairs[i+1]` in range, `Object.hasOwn` + `> 0`
bound `frames` to a present positive number before `Math.round`, and `Number.isInteger` bounds
`n` to finite before `Float32Array`.

**Wiring.** No UI change, but the connection that matters is real and worth stating:
`plugins/joust/src/shell/audio.ts:132-133` imports and re-exports `CUE_SOURCES` and `framesFor`,
so `audio-manifest.ts` is in the GAME's runtime module graph, not only the bake's. Both new
throws therefore fire at game boot, not at bake time. **This is not a regression introduced
here** — `evaluateOperand` (`:506`) has thrown at module load since jt5-6, so the import-time
failure surface pre-dates jt9-5; the change widens which inputs reach it. Verified, not assumed.

**Pattern.** Good: `bake-samples.test.mjs:110` — the `bakeFailure` helper asserts
`toBeInstanceOf(Error)` with the message "the bake RESOLVED — the gate this test exists to pin
never fired". That is a non-vacuity control on a negative test, and it is what caught mutant R3
(it reported the RESOLVE, not a message mismatch). This is the pattern the rest of the epic
should copy.

**Error handling / null inputs.** `framesFor(undefined-ish)`: the mirror probe passes
`frames: undefined` and gets a throw naming `undefined`, measured. The bake handles an absent
key, an inherited key, a present `0`, a present negative and a present `undefined`, each with a
distinguishable message. Huge inputs: `Infinity` is refused before allocation. Timeouts and race
conditions: none — the whole path is synchronous and pure apart from one `writeFileSync`.

**Security.** No user input, no network, no auth, no secrets in the diff. The bake's
`join(outDir, sounds[name])` takes `name` from `Object.keys(sounds)` where `sounds` is injectable
via `opts` — but `opts` is a test-only lever on a dev-time CLI, so this is not a traversal
surface. `Object.hasOwn` on BOTH lookups (`SPECS` and now `frameDurations`) is the correct
prototype-pollution posture and is now consistent between them. No findings.

### The R-series battery — 13 novel mutants past TEA's 27 and Dev's 12

| id | site | mutation | result |
|---|---|---|---|
| R1 | `CueSource.invention` | `frames: number` -> `frames?: number` | **KILLED by lint only** — 2533 tests green, `tsc` TS18048/TS2322 |
| R2 | bake, the two gates | order swapped (value gate first) | KILLED — 1; the missing-entry `toBe` sees it |
| R3 | bake missing gate | `Object.hasOwn(...)` -> `name in frameDurations` | KILLED — 1, via the RESOLVE control |
| R4 | `framesInRow` message | text APPENDED after `pairs: '${verbatim}'` | **SURVIVED** — 105 files / 2533 |
| R5 | `framesFor` message | text APPENDED after `whole number of frames` | **SURVIVED** — 105 files / 2533 |
| R6 | SNEDIE's shipped row | `,20` -> `,21` (parity PRESERVED, so the module still loads) | KILLED — 3, and the AC-5 window guard is one of them |
| R7 | `README.md:48` | `105 files` -> `104 files` | KILLED — 1 |
| R8 | `framesInRow` loop bound | `i + 1 < len` -> `i < len` (= N8 / D2) | **SURVIVED** — equivalent, proven above |
| R9 | `framesInRow` loop bound | `i + 1 < len` -> `i <= len` | KILLED — 53 (harness positive control) |
| R10 | bake missing gate | `hasOwn(frameDurations, name)` -> `hasOwn(SPECS, name)` | KILLED — 2 |
| R11 | `framesInRow` guard | `pairs.length % 2` -> `tokens.length % 2` (wrong array) | KILLED — 53 |
| R12 | `framesFor` invention gate | `Number.isInteger` -> `Number.isFinite` | KILLED — 1 |
| R13 | SNEDIE's shipped row | trailing `,20` DELETED (= N27, re-run for the claims below) | KILLED — 53, 5 suites |

**13 run, 3 survivors: R8 (equivalent, proven), R4 and R5 (one real gap, one mechanism).**

R6 is the mutant the SM's regression worry called for and nobody had built: a shipped window
changed by VALUE with parity preserved, so the module still loads and the change is silent. It
reddens `jt9-5 AC5 > every cue holds the voice for exactly as many frames as it did before`
(`expected 21 to be 20`), plus `audio-priority.test.ts` and the citation gate. The eighteen
windows are genuinely defended, by three independent mechanisms.

### Claims re-measured — every one the dispatch flagged

| Claim | Source | Verdict |
|---|---|---|
| 6 continuation rows, two each for SNPTED / SNPCR1 / SNPCR2 | test header + AC-5 guard | **TRUE** — re-counted off `CUE_SOURCES`: pteroDeath 2, playerMaterialise 2, player2Materialise 2 |
| 18 defining + 6 continuation = 24 rows | AC-5 guard | **TRUE** — measured 24 |
| operand counts are "2 or 4", zero odd | test header | **TRUE** — defining histogram `{2: 13, 4: 5}`, continuations `[4,2,2,2,2,2]` |
| the eighteen windows are unchanged by value | Dev | **TRUE** — recomputed `FRAME_DURATIONS` through node; all 18 match `WINDOWS_AT_HEAD` and `audio-priority.test.ts`'s transcribed ROM table |
| the vendored tree is committed, 49 files (TEA's retraction) | TEA | **TRUE** — `git ls-files reference/williams-source/joust` = 49 |
| vitest reports `audio-frames-edge-cases.test.ts (0 test)` | TEA's N27 correction | **TRUE** — reproduced verbatim; and FIVE files report `(0 test)`, not one |
| the throw's own message IS the collection error | TEA's N27 correction | **TRUE** for the 5 suite errors |
| ...and reaches "all 58 failures across 11 files" | same comment | **FALSE** — 5 of 58. Corrected in place |
| the quoted N27 output "1 operands ..." | same comment | **STALE** — pre-`7d11cf8` wording. Corrected in place |
| an `Infinity` window "reaches `Buffer.alloc`" | manifest comment + test comment | **FALSE** — `RangeError` at `new Float32Array(n)`; `encodeWav` never reached. Both corrected in place |
| `every cue in CUE_SOURCES is kind: rom` is a data-fact pin | TEA | **TRUE and correctly labelled** — "POSITIVE CONTROL" in its own name, unreachability stated in the header |
| the eighteen windows were NOT unpinned before this story | TEA, refuting the dispatch | **TRUE** — `audio-priority.test.ts` already asserted all 18 |

### Findings

| Severity | Issue | Location | Disposition |
|---|---|---|---|
| [MEDIUM] | Both new throw messages are pinned as SUBSTRINGS (`toThrowError(string)` is `includes()`), so appended text ships green — measured, R4 and R5 both survive a 2533-test run. The story's other half uses exact `toBe`. | `plugins/joust/tests/audio-frames-edge-cases.test.ts` (5 assertions) | **Filed as jt9-34** (1 pt, p2), with both mutants and a verification recipe |
| [MEDIUM] | jt9-33 is understated: of 53 test-level failures a real import-time throw produces, ZERO carry the real message; all 53 say "must export ..." across nine variants. | `plugins/joust/tests/audio-transporter-split.test.ts` `load()` | Measurement appended to **jt9-33**; recommend raising above p2 |
| [LOW] | Three false/stale prose claims (Infinity fails at `Float32Array` not `Buffer.alloc`, x2 sites; the "1 operands" quotation is pre-reword; "all 58 failures" is 5 of 58). | `audio-manifest.ts:597`, `audio-frames-edge-cases.test.ts:408,509` | **FIXED IN PLACE** per the standing rule |
| [LOW] | The AC-3 probes reach `framesFor` through a locally-declared mirror typing `frames?: number`, so they are blind to the real `CueSource`. Deliberate (it is what lets the `undefined` probe exist) and the requiredness is caught by lint (R1), but no TEST defends the API shape. | `audio-frames-edge-cases.test.ts:209-213` | Noted; no action — R1 shows lint holds it |
| [LOW] | The AC-5 parity guard calls `operandTokens` "an oracle that does not call the code under test". Literally true, but it is a character-for-character re-implementation of `operandsOf`, so it is a transcription, not an independent oracle. For THIS purpose (does the code's own tokenisation see even rows?) sharing the tokenisation is arguably right. | `audio-frames-edge-cases.test.ts:232-242` | Noted; no action |

No Critical. No High. Nothing blocks.

### Verification

| Gate | Result |
|---|---|
| `npx vitest run --project joust` | **105 files / 2533 passed** |
| `npm run lint` | clean |
| `npm run test:orchestrator` | **390 / 390** |
| `git status --porcelain` after 13 mutants | clean at every restore |
| `sprint/epic-jt9.yaml` parses, 34 stories, jt9-33 + jt9-34 present | yes |

**Handoff:** To SM for finish-story.