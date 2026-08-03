# Story Context: cp6-4

**Title:** centipede's rogue-manifest guard asserts only the interpolated cue name — rewording the diagnostic wholesale leaves it green
**Epic:** cp6 · **Points:** 2 (raised from 1 at setup, on measurement) · **Priority:** p3
**Workflow:** trivial (setup → implement → review → finish) · **Repos:** arcade
**Branch:** none — trunk-based, lands on `main`. `feat/cp6-4-message-not-name` is an empty
claim beacon at 693a82b.

## Why this story exists

`plugins/centipede/tools/pokey-bake/bake-sfx.mjs` refuses to bake a manifest cue it has no
spec for, rather than emitting a default beep — because at 200 a default beep is
indistinguishable from a correct sound, so the failure has to be loud and it has to happen
at bake time, not in a player's browser. cp6-2 wrote a test to pin that refusal.

The test pins **one** thing: that the cue's name appears somewhere in the thrown message.
It does not pin the diagnosis. Rewording the operator's error message wholesale leaves it
green, so the message can rot without anyone noticing.

## What was measured at setup (2026-08-03, against `main` @ 693a82b)

Applied to a backup copy and restored byte-identically (`cmp` clean, `git status` empty):

| # | mutation | result |
|---|---|---|
| A | reword the diagnostic wholesale, KEEP `${cue}` | **25/25 GREEN** — the gap, reproduced |
| B | drop `${cue}` from the message | 1 red |
| C | `if (!transcribed && !standIn)` → `if (false)` | 1 red |

Mutation C matters because of how this story was filed. jt9-4's TEA originally reported the
guard was **dead** — that `if (false)` left all of centipede green, because a second throw a
few lines down also interpolated the cue name and the regex could not tell them apart. That
measurement was taken before cp6-2's review rounds landed; cp6-2 collapsed the two throws
into one, and the guard now bites. **The dead-guard half is closed. Do not re-file it.**

## The finding is bigger than the filing said

The filing asked whether centipede's `FIXTURE.cues[cue]` / `STAND_IN_SPECS[cue]` bracket
reads carry the prototype shape jt9-4 found in joust, and predicted joust's failure mode —
*the right cue name beside the wrong diagnosis*. Measured: the shape is there, and
**centipede's outcome is worse — no diagnosis at all.**

A manifest cue named `toString`, `constructor` or `valueOf` **bakes completely clean**.
`bakeSfx` returns 15 where the shipped manifest returns 14, and writes a **44-byte
header-only wav** that `just deploy-assets` would upload as a silent cue.

Three guards in a row read as protection and a prototype key walks past all three:

- `known.freqTable !== null` → `undefined !== null` is **true**, so the cue is classified
  *transcribed* and takes the ROM path
- `romEvents`: `!cont && c.contImmediate === null` → `undefined === null` is **false**, so
  the "refusing to invent a control byte" throw never fires
- `romEvents`: `c.lengthFrames !== c.tableLengthBytes` → `undefined !== undefined` is
  **false**, so the length-disagreement throw never fires
- the render loop `i < c.lengthFrames` then runs **zero** iterations and a header is written

`Object.hasOwn` on the two reads at `bake-sfx.mjs:401-402` was applied and verified before
being written into the ACs: all four rogue cues then throw the correct diagnostic. Hardening
the guard alone is sufficient, because `romEvents` and `standInEvents` are only reachable
after it passes.

## Blast radius

Under the fix: **62 files / 1157 tests, zero red** across the whole centipede project.

Read with its direction probe, not alone — a near-zero radius is equally consistent with
"nothing can observe this" and "nothing can observe this going wrong". The direction probe
above settles it. The zero means no existing test observes the behaviour, so **the tests
written in this story are the entire observable deliverable**; the source change is two
lines.

## The precedent to copy

`plugins/joust/tools/sample-bake/bake-samples.test.mjs`, one directory over:

- `expect(err.message).toBe(<whole string>)` at eight sites — never a regex on a name
- a `bakeFailure` helper (`:100-112`) that asserts an `Error` was actually thrown *before*
  the message assertion, so a bake that resolves cannot silently skip the check
- the inherited-property test at `:589-621`, which asserts both preconditions (the value IS
  reachable by a bracket read; it is NOT an own property) so a later reader can see the test
  still separates the two implementations
- a positive control immediately after, proving the injection itself is not what fails

Copy the shape, not the wording — joust's prose describes a wrong-diagnosis outcome and
centipede's outcome is a clean bake.

## Scope

- `plugins/centipede/tools/pokey-bake/bake-sfx.test.mjs` — the `cp6-2 AC3` throw assertion,
  plus the new prototype-cue test and its positive control
- `plugins/centipede/tools/pokey-bake/bake-sfx.mjs` — the two bracket reads at `:401-402`

Out of scope: the `CHANNELS` map, the dossier, the fixture, anything cp6-2 or cp6-3 owns.
No citation re-anchoring is needed — `tests/audio-citations.test.ts` is scoped to
`src/main.ts`, and nothing cites `bake-sfx.mjs` by line (checked, because `jt9-35`
re-anchored centipede's citations one commit before this setup).

## Baselines

- `npx vitest run --project centipede tools/pokey-bake/bake-sfx.test.mjs` → 25 passed (25)
- `npx vitest run --project centipede` → 1157 passed (1157), 62 files

## Acceptance Criteria

1. AC-1 THE ASSERTION PINS THE MESSAGE, NOT THE NAME. The `cp6-2 AC3 > a manifest cue with no bake spec THROWS` test in plugins/centipede/tools/pokey-bake/bake-sfx.test.mjs asserts the ENTIRE diagnostic string with `toBe`, not a regex on the interpolated cue name, and it asserts through a helper that FIRST proves an Error was actually thrown (joust bake-samples.test.mjs:100-112 is the worked shape). Measured at setup: rewording the message wholesale while keeping ${cue} leaves the file 25/25 GREEN; only deleting ${cue} reddens it. Under the new assertion the wholesale reword must redden.

2. AC-2 THE GUARD READS OWN PROPERTIES. The two bracket reads at bake-sfx.mjs:401-402 (`FIXTURE.cues[cue]` and `STAND_IN_SPECS[cue]`) become `Object.hasOwn` checks. This is NOT optional hardening: measured at setup, a manifest cue named `toString`, `constructor` or `valueOf` today bakes COMPLETELY CLEAN with no throw at all — bakeSfx returns 15 instead of 14 and writes a 44-byte header-only wav that just deploy-assets would upload as a silent cue. The mechanism is three undefined-vs-null comparisons that all read false on a prototype object: `known.freqTable !== null` reads the cue as transcribed, then romEvents `c.contImmediate === null` is false and `c.lengthFrames !== c.tableLengthBytes` is false, and the render loop runs zero iterations. Hardening the guard alone suffices because romEvents and standInEvents are only reached after it passes.

3. AC-3 THE PROTOTYPE HOLE HAS ITS OWN TEST, WITH ITS PRECONDITIONS ASSERTED. Follow joust bake-samples.test.mjs:589-621: assert that the value IS reachable by a bracket read and is NOT an own property, so a future reader can see the test still separates the two implementations, then assert the whole message. This story is worse than the joust case its filing predicted — joust got the right cue name beside the wrong diagnosis, centipede gets no diagnosis at all — so say that in the test prose rather than copying joust wording that understates it.

4. AC-4 MUTATION-PROVEN BOTH WAYS, EVERY MUTANT RECORDED VERBATIM. Baselines measured at setup: 25/25 in bake-sfx.test.mjs, 62 files / 1157 tests in the centipede project, and the hasOwn fix has a ZERO-red blast radius across all 1157 — so the tests written here ARE the entire observable deliverable. For each new or changed assertion name the source mutation that reddens it and paste the mutated string. At minimum: the wholesale message reword (green today, must redden) and the hasOwn revert (green today, must redden). A POSITIVE CONTROL must show the shipped 14-cue manifest still bakes clean, or the two tests above prove nothing about the gate.
