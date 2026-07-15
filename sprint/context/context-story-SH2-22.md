# Story SH2-22 Context

## Title
Close the @arcade/shared/synth `onRebuild` footgun — make the "cabinet-held WebAudio
node dies permanently after context recovery" trap **structural, not advisory**.

## Metadata
- **Story ID:** SH2-22
- **Type:** refactor
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd (phased: setup → red → green → review → finish)
- **Repos:** arcade-shared, battlezone, red-baron
- **Epic:** SH2 — shared render/audio surface for the cabinets
- **Branch (all three, gitflow off `develop`):** `feat/SH2-22-synth-onrebuild-structural`
- **Depends-on / origin:** SH2-18 (extracted `@arcade/shared/synth`). Read
  `sprint/archive/SH2-18-session.md` → "Reviewer (code review, round 2)". This story
  IS that round-2 finding promoted to its own work.

## Problem
`@arcade/shared/synth` recovers from an externally-closed `AudioContext` by building a
new one and firing `rebuildListeners`. Registry voices (`startVoice`/`stopVoice`) recover
automatically. But a cabinet that holds a WebAudio node **outside** the registry — a
free-running hum oscillator, an approach whine — behind an `if (node === null)` build gate
keeps a reference to the **dead** context after recovery. The gate never re-fires, so that
sound is silent for the rest of the session **while the registry voices come back**.

That **half** recovery is worse than none: it looks like it worked. This shipped as a real
regression in SH2-18 round 1 (the gun returned, the hum did not) into BOTH cabinets, and only
the reviewer's #13 fix-introduced-regression sweep caught it. The current mitigation is
`onRebuild()` plus **a comment on the method** telling future cabinets to use it. A comment is
the only thing standing between the next cabinet and the same trap.

## Current mechanism (what SH2-18 shipped — the baseline this story hardens)
- **`arcade-shared/src/synth.ts`**
  - `onRebuild(listener)` — pushes to `rebuildListeners`, fired on every NEW context (first
    build + each post-recovery rebuild). Advisory JSDoc at **synth.ts:66-80**.
  - Registry voices: `startVoice` / `stopVoice` / `isVoiceActive` over a `voices` Map — these
    already survive recovery correctly.
- **`battlezone/src/shell/audio.ts`** — engine hum held OUTSIDE the registry: `humOsc`/`humGain`
  (declared ~**L185-186**), built behind `if (humOsc === null || humGain === null)` (**~L227**),
  reset via `synth.onRebuild(() => { humOsc = null; humGain = null })` (**~L194**).
- **`red-baron/src/shell/audio.ts`** — hum + enemy-approach whine held outside the registry:
  `humGain` / `whineOsc` / `whineGain` (**~L312-314**), reset via `synth.onRebuild(...)` (**~L323**).
  The whine is the only warning that a plane is closing — losing it silently is a gameplay bug,
  not just an audio one.

**Both cabinets are correct TODAY.** SH2-22 is not a bug fix — it is closing the door so a
FUTURE cabinet (or a careless edit to these two) cannot reintroduce the asymmetric-silence trap.

## The design fork — THIS IS THE STORY (TEA/Architect to decide in RED)
The story explicitly leaves the mechanism to the implementers. Do NOT let it default. The two
named options, with the trade-off each carries:

**Option A — Engine owns persistent voices (make the footgun unreachable).**
Give the engine a first-class "persistent voice" abstraction: a non-stoppable, gain-switched
voice the engine builds and REBUILDS itself on recovery, so no cabinet ever holds a raw node
behind a `=== null` gate. The cabinets' hum/whine migrate onto it; the `onRebuild` reset
boilerplate disappears from both `audio.ts` files.
- *Pro:* the trap becomes structurally impossible — there is no cabinet-held node to forget.
- *Con:* larger surface; must express "gain is the on/off switch, oscillator free-runs" in the
  shared API without dragging cabinet-specific envelope shapes into the library (see SH2-18's
  held VERB/NUMBERS line — the envelope is NOT shared).

**Option B — Fail loudly (keep cabinet-held nodes, but make forgetting impossible to miss).**
Keep the current shape but detect the footgun: e.g. the engine refuses to rebuild / throws /
loudly warns when a rebuild happens and a cabinet-held node was not reset, or a lint/source-rule
gate that fails CI if a `=== null` audio-node gate exists without a paired `onRebuild`.
- *Pro:* minimal runtime change; preserves each cabinet's local envelope authorship.
- *Con:* "loud" must be real — a swallowed warning is just a fancier comment. Detection has to be
  mechanically enforced (a failing test / gate), or it is advisory again under a new name.

**SM does not choose.** If TEA wants an Architect (Emmanuel Goldstein) design pass before writing
RED tests, that is a reasonable route for a 5-pt refactor with a genuine architectural fork.
Record the choice as a Design Deviation with rationale either way.

## Candidate Acceptance Criteria (TEA to finalize in RED)
1. The "cabinet-held node survives a rebuild pointing at the dead context" trap is prevented
   **structurally** — a failing test/gate, or an API shape that makes it unreachable — not by a
   comment or an unasserted warning. Mutation-provable: reintroducing the SH2-18 round-1 mistake
   MUST turn a test red.
2. Both existing cabinets (battlezone hum; red-baron hum + approach whine) still recover fully
   after an externally-closed context + gesture: gun/effects AND hum AND whine all return. No
   asymmetric silence.
3. No regression to the SH2-18 no-throw contract: a closed context is treated as absent, nothing
   escapes `withAudio`/voice calls into the frame loop.
4. `arcade-shared` API change (if Option A) is covered by `tests/synth.test.ts`; the advisory
   JSDoc at synth.ts:66-80 is updated to describe the new structural guarantee (or removed if the
   footgun no longer exists).
5. Release/repin dance completed if `arcade-shared` changes: merge arcade-shared (NO
   `--delete-branch` until pins bump), cut the next tag (SH2-18 landed ~v0.14.0 → likely v0.15.0),
   repin battlezone + red-baron with `npm install @arcade/shared@github:...#<tag>` (a bare
   `npm install` after editing the ref keeps the OLD commit).

## Scope
- **In:** the structural guarantee in `@arcade/shared/synth`; migrating/hardening the two cabinets'
  out-of-registry nodes; tests that fail if the footgun returns; JSDoc/contract update; repin+release.
- **Out:** extracting the fake `AudioContext` harness (now duplicated 4 ways — TEA & Reviewer both
  flagged it in SH2-18 as a separate follow-up story; do NOT fold it in here). Any audio-envelope
  or ROM-tuning changes.

## Test harness note (from SH2-18)
The fake `AudioContext` used to prove the closed→recover path lives in each cabinet's
`tests/shell/audio.test.ts` and in `arcade-shared/tests/synth.test.ts`. Red-baron's fake is the
upgraded grade: `close()` sets `state='closed'`, `assertOpen()` throws `InvalidStateError`
synchronously from every factory method, `resume()` rejects when closed. Reuse that grade to
express recovery; the closed-context assertions are what make these tests non-vacuous (SH2-18
review mutation-proved that source-text scans here are vacuous — assert on runtime behavior).

---
_Enriched by SM (Winston Smith) from the SH2-22 sprint YAML + the SH2-18 archive round-2 findings.
Original stub generated by `pf context create story SH2-22`._
