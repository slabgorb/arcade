# Story jt9-32 Context

## Title
Two bake assertions weaker than their names: nothing pins WHAT the joust bake produces, and the manifest throws are pinned only as SUBSTRINGS

## Metadata
- **Story ID:** jt9-32
- **Type:** chore
- **Points:** 2
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust — the remainder, re-ordered: apparatus, gameplay, geometry, brains, dossier

## Problem
Filed by jt9-4's Reviewer, 2026-08-03, from a surviving mutant. `plugins/joust/tools/sample-bake/bake-samples.mjs` synthesises the eighteen .wav files that `just deploy-assets` uploads to the assets bucket, and NO test can see a change to their contents.

MEASURED, not argued. Mutant R12 — `const RATE = 22050` changed to `24000` — leaves all 101 tests in the four files that touch the bake green (bake-samples.test.mjs, deploy-assets.test.mjs, audio-transporter-split.test.ts, audio-seam-scope.test.ts), and the full joust project green with it. Every one of the eighteen shipped files is different audio afterwards. The same hole swallows any edit to FRAME_HZ, to a SPECS entry's envelope or frequencies, or to encodeWav's header.

WHY THE EXISTING TESTS CANNOT SEE IT. jt5-2's suite pins shape, not content: decodable RIFF/WAVE, format in {1,3}, sample rate within [8000,96000], duration within [0.05,10] seconds, a data chunk that is not silence, all eighteen pairwise distinct, and two runs byte-identical. That last one is the near miss — it compares two runs of the SAME code, so a constant change moves both sides together and the assertion holds. Determinism is pinned; the value it is deterministic ABOUT is not.

WHY IT MATTERS RATHER THAN BEING TIDINESS. The three failure surfaces compound. `@shared/audio` degrades SILENTLY on a bad fetch, so nobody hears a regression at runtime. The deploy-assets recipe's own comment promises "re-running it re-uploads byte-identical files" — an idempotency claim about content that nothing verifies. And CI never diffs the bucket against the bake. A one-character edit to a synthesis constant therefore ships changed audio to production with a green pipeline and no observer at any layer.

THIS IS PRE-EXISTING (jt5-2), NOT jt9-4's REGRESSION. jt9-4 moved the write path from `SOUNDS[name]` to `sounds[name]`, so the Reviewer proved byte-identity out of band rather than trusting the suite: the pre-refactor module and the shipped one were each run into a temp directory and produced the same eighteen filenames with combined sha256 4499a28b47e95eb778d2f33d92c50a6de0a6ff43a70fbb172d686992992c9962. That is the number a golden pin would record. The point of this story is that the Reviewer had to compute it by hand because no test could.

THE FIX. Pin the content — a committed table of the eighteen filenames and their sha256, asserted after a default bake. Prefer per-file hashes over one combined digest so a failure names the cue that moved. Deliberately cheap to re-baseline: a real change to a sound SHOULD red this and be re-recorded in the same commit, with the reason in the message. That is the feature, not the cost.

ACCEPTANCE IS A MUTATION, BOTH WAYS. The new pin must go RED under `RATE 22050 -> 24000` and stay GREEN unmutated. Re-run the Reviewer's R12 verbatim as the acceptance mutant. Note jt9-5 is expected to change the invention arm of framesFor and NOT the eighteen shipped windows (all 18 cues are kind:rom today), so the baseline should be stable across it; if it is not, that is worth knowing and is exactly what the pin is for.

SCOPE: `plugins/joust/tools/sample-bake/bake-samples.test.mjs`. Centipede's and star-wars' bakes have the same shape and the same gap; do NOT widen this story to them — measure and file separately if wanted.

=== MERGED 2026-08-03: jt9-34 FOLDED IN (Architect grooming pass) ===

Both were filed by the reviewers of the two bake stories jt9-4 and jt9-5, both are "the assertion is weaker than its name" on the SAME bake-and-manifest surface, and both are accepted by re-running one named verbatim mutant. Points 1 + 1 -> 2.

FOLDED IN FROM jt9-34 - THE TWO NEW THROWS ARE PINNED ONLY AS SUBSTRINGS. `expect(fn).toThrowError("some string")` in vitest asserts that the thrown message CONTAINS the string; it is not an equality check. plugins/joust/tests/audio-frames-edge-cases.test.ts pins both of jt9-5 new messages that way - the AC-1 pairing throw in three tests and the AC-3 invention throw in two - while the sibling half of the same story pins the bake two messages with expect(err.message).toBe(...), which IS exact. Same story, same kind of deliverable, two different standards of rigour.

MEASURED, both survivors, full project run each time with the mutation diffed against a pristine snapshot before running. R4: `pairs: '${verbatim}'` became `pairs: '${verbatim}' - AND THE WINDOW WAS SILENTLY HALVED` and SURVIVED, 105 files / 2533 passed. R5: `whole number of frames` became `whole number of frames - jt9-5 APPENDED THIS AND NOTHING NOTICED` and SURVIVED, 105 files / 2533 passed. The interpolated CONTENT is well pinned - TEA decoys N3/N4/N5/N6/N13/N14 all change an interpolation and all redden, because changing a substring breaks containment. Only the APPEND direction, and equally a prepend, is unguarded. THE FIX is small: toThrowError(new Error(msg)) compares the message for equality, or an anchored /^...$/ regex does. Five assertions in one file. Do NOT hand-write the expected strings a second time - read them off the current source, or the fix becomes its own transcription.

VERIFY BY MUTATION, and re-run the named mutants VERBATIM rather than reconstructing intent: R12 (RATE 22050 -> 24000) must redden the new content pin and the pin must stay green unmutated; R4 and R5 above must both now redden; and re-run one interpolation decoy (N3, `an odd operand count (${pairs.length})` -> `... (5)`) to confirm it still reddens, because a fix that traded one blind spot for another would look identical from the exit code. Assert the suite SHAPE (105 files, 2533 collected) alongside the red list.

SCOPE FENCE, unchanged by the merge: centipede and star-wars bakes have the same shape and the same gap; do NOT widen to them - measure and file separately if wanted.

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
_No acceptance criteria recorded in the sprint YAML — TEA to define during the RED phase._

---
_Generated by `pf context create story jt9-32` from the sprint YAML._
