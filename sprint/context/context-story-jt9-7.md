# Story jt9-7 Context

## Title
CHANNELS is vestigial for arbitrated cues — three stories have now fed a map that routes nothing

## Metadata
- **Story ID:** jt9-7
- **Type:** story
- **Points:** 2
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust — the remainder, re-ordered: apparatus, gameplay, geometry, brains, dossier

## Problem
joust CHANNELS maps every cue to a `prio-N` string, but since jt5-5 the shared engine arbitrates ALL of joust's cues on ONE voice by priority, so the channel decides nothing for them. THREE stories have now had to feed it: jt5-5's Dev and TEA both raised it, and jt5-6 added an eighteenth entry (player2Materialise: prio-70) that routes nothing, purely to satisfy the test `CHANNELS gives every SOUNDS entry a voice` in tests/audio-manifest.test.ts. It is kept because the shared engine still routes every UNARBITRATED name by channel and because a channel-per-priority is an honest description of which cues share a voice — but a reader takes it for live routing. Decide: delete joust's map and let the engine default, or keep it and make the test assert what it actually guarantees. Affects plugins/joust/src/shell/audio.ts (CHANNELS, and the header comment at :86-97 which still describes the fence in the present tense) and tests/audio-manifest.test.ts. NOTE the constraint before deleting: src/shared/audio.ts routes by channel for every name NOT in `priorities`, so removing the map is only safe while all 18 joust cues carry a priority.

## SM Setup Corrections (2026-08-03, jt9-7 setup, checked against `main` at
commit `5cc5bc2`)

The story text above is preserved as filed, but its framing of "delete the
map" vs "keep the map" as two comparable options is NOT accurate as measured
today, and downstream agents must not inherit that framing uncorrected.

**MEASURED FACT — the two branches of this decision are not the same size.**
`src/shared/audio.ts:69` declares the manifest field as
`channels: Record<N, string>` — REQUIRED, with no `?` and no default. Compare
`priorities?: Partial<Record<N, number>>` (:82) and
`frameDurations?: Partial<Record<N, number>>` (:87), both genuinely optional.
So:

- **Keep the map** — a joust-only change: `plugins/joust/src/shell/audio.ts`
  (the `CHANNELS` const and its surrounding prose) plus
  `tests/audio-manifest.test.ts`.
- **Delete the map** — is **not type-legal today**. It requires first making
  `channels` optional in `src/shared/audio.ts` (a change to code all seven
  games import — tempest, star-wars, asteroids, battlezone, red-baron,
  centipede, joust) and designing that field's default/degrade semantics from
  scratch. That is a materially larger, cross-cabinet change, not a
  same-effort alternative.

Per this repo's standing rule (`CLAUDE.md`, "Important Notes"): shared code
changes only once a second consumer proves the duplication/need is real.
Nothing here proves a second game needs an optional `channels` — joust is
still the only cabinet passing `priorities` at all (see the jt9-6 citation
below). That tilts the decision toward **keep the map, fix the test's
assertion** as the lower-risk branch, but this is SM's reading for TEA/Dev to
weigh, not a ruling — the story explicitly asks the workflow to decide.

**MEASURED — cue count is 18, not "seventeen."** The story's own body notes
jt5-6 added an 18th entry (`player2Materialise: prio-70`) "purely to satisfy
the test." Counted fresh against `plugins/joust/src/shell/audio.ts` +
`audio-manifest.ts` today: `CHANNELS` has **18** keys, `SOUNDS` has **18**
keys, and `CUE_SOURCES` has **18** keys, every one `kind: 'rom'` (i.e. every
cue carries a ROM-derived `priority` — `audio-manifest.ts`'s own comment says
"all eighteen have one"). So the story's safety precondition for deleting the
map ("only safe while all 18 joust cues carry a priority") is currently
satisfied on the priority-coverage axis — the blocker is the type-legality
issue above, not priority coverage.

Despite that, `plugins/joust/src/shell/audio.ts:51` (inside the file's
top-of-file header, the "ONE VOICE BY PRIORITY (jt5-5 …)" section) still
reads **"the fence no longer decides anything for these seventeen cues"** —
a stale off-by-one, live prose, cheap to fix in the same commit (this repo's
working rule is to fix a prose defect in place rather than open a cycle for
it).

**RE-ANCHORED — the citation at ":86-97" is NOT drifted, but its
characterization needs re-checking.** The story's own text says this block
"still describes the fence in the present tense." Read fresh today, lines
86-97 are exactly the JSDoc directly above `CHANNELS` and they do **not**
read present-tense — they already say "The channel no longer decides which
cue wins. Until jt5-5 it did…". TEA should re-verify which prose (if any)
in this file still needs a tense fix before assuming the filing's
characterization is current; the miscounted "seventeen" at `:51` (above) is
the live, measurable prose defect SM actually found.

**CONSTRAINT ROUTED HERE BY jt9-6's REVIEWER** (already measured — cite it,
do not re-derive): `sprint/archive/jt9-6-session.md:651` (Findings table,
[INFO] row) — "`voiceChannel` can hold `undefined` at runtime despite its
`string \| null` type" (`src/shared/audio.ts:128`, `:289`) — "Measured
harmless; routed to **jt9-7** (which must not delete joust's `CHANNELS`
without it)." The underlying proof, `:537-543` of that same archive: a cue
absent from a game's `channels` map makes `channel === undefined`, so
`voiceChannel` becomes `undefined`, not `null`; this is safe because
`voiceChannel === null` **implies** a fully-released voice (only ever `null`
initially or straight out of `releaseVoice()`), so it "behaves as a coherent
phantom channel key throughout" and "cannot match spuriously." This is a
claim measured by another agent on another story — re-verify it, do not
assume it, before relying on it to justify deleting (or not deleting)
anything here.

**Scope fence — do NOT touch, regardless of which branch is chosen:**
- `cp6-3` (centipede) and `sw8-27` (star-wars) are both `in_progress` in
  SIBLING checkouts right now. Do not edit any centipede or star-wars file,
  `sprint/epic-cp6.yaml`, or `sprint/epic-sw8.yaml`.
- `jt9-35` (p2, backlog, filed by jt9-6's Reviewer — pinning jt9-6's new
  guard condition) is a separate story. Do not absorb it into this one.

## Technical Approach

This is a **decide-then-do** story. Two legal paths, given the type-legality
finding above:

1. **Keep `CHANNELS`, fix the test.** Rewrite
   `tests/audio-manifest.test.ts`'s `CHANNELS gives every SOUNDS entry a
   voice` (or whatever it is renamed to) so it asserts what the map actually
   guarantees post-jt5-5 — a channel per distinct ROM priority, which the
   header prose already claims but nothing pins — rather than implying live
   arbitration. Also fix the `:51` "seventeen" miscount while in the file.
   Blast radius: joust-only.
2. **Delete `CHANNELS`, make `channels` optional in `src/shared/audio.ts`.**
   Requires designing what "no channel map" means for the six other games
   that still route by channel with no priorities (their behavior must not
   change), updating `AudioManifest<N>`'s type, `createAudioEngine`'s
   defaulting logic, and every consumer/test that constructs a manifest.
   Blast radius: shared code, all seven games — full suite required.

TEA/Dev must pick one and say why, weighing the asymmetry above explicitly
rather than inheriting the story's "decide" framing as if the two options
cost the same.

## Scope
- In scope: `plugins/joust/src/shell/audio.ts` (`CHANNELS` and its
  surrounding header/JSDoc prose) and `tests/audio-manifest.test.ts`. If (and
  only if) the "delete the map" branch is chosen: `src/shared/audio.ts`
  (`AudioManifest<N>`, `createAudioEngine`) and its own tests, plus a full
  regression sweep of the other six games' audio suites.
- Out of scope: any centipede or star-wars file, `sprint/epic-cp6.yaml`,
  `sprint/epic-sw8.yaml`, and `jt9-35` — file findings against these rather
  than editing them.

## Acceptance Criteria
_No acceptance criteria recorded in the sprint YAML — TEA to define during
the RED phase. At minimum, regardless of branch chosen: (1) the decision
itself and its reasoning recorded (Design Deviations or Delivery Findings);
(2) `tests/audio-manifest.test.ts`'s coverage of `CHANNELS`/`channels`
asserts a claim that is actually true post-jt5-5 (not "routes this cue's
arbitration," which is false for all 18); (3) the `:51` "seventeen cues"
miscount corrected to eighteen; (4) if the map is deleted, a positive-control
regression proving the other six games' per-channel stealing behavior is
byte-identical to before the `channels` field became optional._

## Verification Baselines (measured fresh at setup, 2026-08-03, commit
`5cc5bc2` — HEAD unchanged since the story's own filing measurement)

Re-verify these; do not trust stale numbers carried forward from an earlier
story.

- `npx vitest run --project joust`: **105 files passed, 2533 tests passed**
  (matches the story's stated baseline).
- `npm run lint` (`tsc --noEmit`, repo-wide): clean, zero errors.
- `npm run test:orchestrator`: **390/390** passed.
- `npx vitest run` (FULL suite): **2 files failed | 755 passed (757)**,
  **10 tests failed | 11670 passed | 1 todo (11681)** — reproduced exactly.
  The 2 failing files are `plugins/star-wars/tests/audit/sw8-27-remediation.test.ts`
  and `plugins/star-wars/tests/core/gun-visibility-and-shape.test.ts`: a
  SIBLING checkout's `sw8-27` mid-RED on `main`. This is EXPECTED, NOT ours,
  and must not be "fixed" or attributed to this story. If this story stays
  joust-only, `--project joust` + lint + orchestrator suffices as the gate;
  the FULL run is only required if `src/shared/audio.ts` is touched.

## Harness Traps (apply to every phase of this story)

A broken harness reads exactly like a clean result:

- Verify a mutation actually changed the file (diff it) before believing any
  KILLED/SURVIVED outcome.
- Quote every shell variable — an unquoted zsh var has previously made vitest
  see one bad arg and print "No test files found," a uniform false KILL.
- Never restore a mutated file with `git checkout --` while an uncommitted
  production fix is in the tree — snapshot and restore from the snapshot
  instead.
- Run test runners strictly sequentially, never two at once against the same
  working tree.
- Mutation DIRECTION must be restrictive — a permissive mutant cannot fail a
  `.toBe(true)`-style assertion, so its survival proves nothing.

---
_Generated by `pf context create story jt9-7` from the sprint YAML, then
enriched by SM at setup with measured findings (see "SM Setup Corrections"
above)._
