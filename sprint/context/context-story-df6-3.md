# Story df6-3 Context

> ⚠ **DO NOT REGENERATE THIS FILE.** The Technical Approach, Scope, Dependencies and
> Design Notes are Architect-enriched from the df6 epic plan. `pf context create`
> refills Technical Approach/Scope with placeholder text and would overwrite them.

## Title
The samples — synthesise one .wav per SOUNDS entry (informed by MAME's Williams sound-board model, williams.cpp:1540, and the machine-local defend.snd = video_sound_rom_1.ic12, williams.cpp:2002 — the battlezone/jt5 synthesis route, since NO sound-board source is vendored, roadmap sec 2), upload via `just deploy-assets` (extend the recipe to bake defender), and PROVE a live 200 for every manifest URL. DERIVE the cue list from SOUNDS in plugins/defender/src/shell/audio.ts AT THE TIME THIS RUNS — do NOT hardcode a count (the jt5-2 lesson). Flip the README/status line off 'silent'. THE ACCEPTANCE TEST IS THE CURL, NOT THE VITEST (Decision B).

## Metadata
- **Story ID:** df6-3
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Defender sound (df6) — the absent-source audio epic (phase 5): the fleet event-channel seam, every gameplay cue ported from the ROM SOUND TABLE (priority/timer/sound#, cited), synthesised samples proven by a live 200, and the thrust held-loop; the two attract musics deferred to df7

## Problem
The absent-source epic's payload: an ASSET, so its acceptance is a live 200, not a green suite — @shared/audio degrades silently on a 404 exactly as it does on working code, the star-wars sw3-5->sw8-14 gap and the standing Architect gotcha. Synthesise each cue from MAME's board model + the defend.snd bytes (no waveform can be baked from source — the M6808 firmware is not vendored, roadmap sec 2); the manifest's source table records which sound# each stands in for and marks any un-anchored cue invention-pending (do not silently fabricate authenticity). Bake exactly the SOUNDS set at run time (this story is LAST among the core three so the cue set is complete and one upload pass suffices). Upload by hand — CI never touches the assets bucket (named plain `arcade`).

## Technical Approach
The absent-source epic's payload is an **asset**, so its acceptance is a **live 200, not a
green vitest** (Decision B) — `@shared/audio` degrades silently on a 404 exactly as on
working code, which is how a star-wars `.wav` stayed missing from sw3-5 through sw8-14 and
is the standing Architect gotcha.

- **Synthesise, don't emulate.** No waveform can be baked from source — the M6808 firmware
  is not vendored (roadmap sec 2). Synthesise each cue informed by **MAME's Williams sound-
  board model** (`williams.cpp:1540`) and the **machine-local `defend.snd`**
  (`video_sound_rom_1.ic12`, `williams.cpp:2002`) — the battlezone/jt5 route. The tools live
  under `plugins/defender/tools/` (mirror joust's `tools/speech-bake` / the sfx synth).
- **Derive the list from `SOUNDS`, do not hardcode a count (the jt5-2 lesson).** Read the
  manifest in `plugins/defender/src/shell/audio.ts` **at the time this story runs** and bake
  exactly that set — this story is scheduled **after** df6-1/df6-2 so the cue set is complete
  and one upload pass suffices. The manifest's source table records which `sound#` each cue
  stands in for; any un-anchored cue is marked **invention-pending**, never silently
  fabricated as authentic.
- **Upload by hand — CI never touches the assets bucket** (named plain **`arcade`**, not
  `arcade-assets`). Extend **`just deploy-assets`** to bake defender (the recipe currently
  bakes star-wars/joust only) and record the exact bucket + key prefix used.
- **Prove a live 200 for every manifest URL.** `curl -o /dev/null -w "%{http_code}"
  <asset-url>` across the whole `SOUNDS` set; paste the status codes into the session file —
  **that curl is the acceptance test.** Flip the README/status line off "silent".
- **File, don't defer silently.** Any cue that can't be sourced/uploaded in this pass is
  **filed as its own follow-up story** before the epic finishes (a finding is not a backlog
  item), grouped by file surface (the jt9 habit).

## Scope
- **In scope:** one baked `.wav` per `SOUNDS` entry (derived at run time), the synthesis
  tooling under `plugins/defender/tools/`, the `just deploy-assets` extension, the upload,
  the pasted live-200 curl evidence, the manifest source table, the README status flip, and
  filing any outstanding cue as a follow-up story.
- **Out of scope:** the seam/emitters (df6-1) and stateful cues (df6-2) — this story adds
  **no core code**; the audible playtest (df6-4); attract musics (df7). No new cue is
  invented in the core here — this story only *sources* what the manifest already declares.

## Acceptance Criteria
- AC1: one baked .wav exists for every entry in SOUNDS (plugins/defender/src/shell/audio.ts) DERIVED at run time (no hardcoded count — the jt5-2 correction); each is synthesised informed by MAME's Williams sound-board model (williams.cpp:1540) and the machine-local defend.snd (video_sound_rom_1.ic12, williams.cpp:2002), and the manifest's source table names the sound# it stands in for or marks it invention-pending — no cue silently fabricated as authentic.
- AC2: `just deploy-assets` is extended to bake defender and the files are uploaded to the assets bucket (plain `arcade`, the by-hand path — CI never touches it); the story records the exact bucket/key prefix used.
- AC3: a live 200 is proven for EVERY manifest URL — the curl status codes are pasted into the session file as the acceptance evidence (Decision B: the curl is the test, NOT the vitest, because silent-degrade makes a 404 indistinguishable from working code); the README/status line is flipped off "silent".
- AC4: any cue that cannot be sourced or uploaded in this pass is FILED as its own follow-up story BEFORE the epic finishes (a finding is not a backlog item — the standing Architect gotcha), grouped by file surface (the jt9 habit); the story states which cues, if any, remain outstanding.

## Dependencies
- **df6-1 + df6-2** — the complete `SOUNDS` manifest this story bakes (scheduled after both
  so one upload pass covers every cue, including thrust/suck).
- **`just deploy-assets`** — the by-hand upload recipe (extend it; CI never touches the
  `arcade` assets bucket).
- **MAME `williams.cpp` + machine-local `defend.snd`** — the synthesis references.
- **Precedent tooling:** joust's `tools/` sfx synth + the star-wars `tools/speech-bake`
  bake-and-upload pattern.
- **Blocks:** `df6-4` (the playtest needs live assets to prove 200s at runtime).

## Design Notes
- **Decision B is the whole story:** the curl is the test, the vitest is not — a green suite
  is indistinguishable from an empty bucket. This is the star-wars silent-degrade gotcha
  made a first-class acceptance criterion.
- **Do not hardcode a cue count** (the jt5-2 correction); derive from `SOUNDS` at run time.
- No cue silently fabricated as authentic; un-anchored cues marked invention-pending and,
  if unshipped, filed as a follow-up before the epic closes.

---
_Generated by `pf context create story df6-3` from the sprint YAML._
