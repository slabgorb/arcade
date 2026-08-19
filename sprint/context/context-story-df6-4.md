# Story df6-4 Context

> ⚠ **DO NOT REGENERATE THIS FILE.** The Technical Approach, Scope, Dependencies and
> Design Notes are Architect-enriched from the df6 epic plan. `pf context create`
> refills Technical Approach/Scope with placeholder text and would overwrite them.

## Title
AUDIBLE playtest — a whole game loop that SOUNDS right: at http://127.0.0.1:5270/defender/ (DIFFER-from-nonsense-control per the canonical-serve lesson) confirm the laser/hit/explosion cues fire on their moments, the THRUST loops while held and stops on release (df6-2), the smart-bomb PLAYS while its VISUAL stays the ADR-0005 freeze/fade (Decision D — audio is not muted), and NO cue is silently missing (the manifest .wav fetches return 200 in the network log, not a silent-degrade 404). Carry the df7 hand-forward note (the two attract musics PHANTOM/TOCCATA + the hall-of-fame/attract cues, Decision A).

## Metadata
- **Story ID:** df6-4
- **Type:** story
- **Points:** 2
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Defender sound (df6) — the absent-source audio epic (phase 5): the fleet event-channel seam, every gameplay cue ported from the ROM SOUND TABLE (priority/timer/sound#, cited), synthesised samples proven by a live 200, and the thrust held-loop; the two attract musics deferred to df7

## Problem
The ears for df6, mirroring df5-7/df4-6's eyes. Audio can't be "seen" in a screenshot, so the playtest reads the NETWORK log (Playwright): every SOUNDS .wav fetch returns 200 when its event fires — proving the seam is live and not silent-degrading on a 404 (Decision B's runtime counterpart). Confirm the thrust loop starts/stops with the key, and that the smart-bomb's audio plays even though its visual is the accessibility-safe variant (Decision D). An all-200 path sweep proves nothing (SPA fallback) — DIFFER from a nonsense control.

## Technical Approach
The **ears** for df6, mirroring df5-7/df4-6's eyes. Audio can't be "seen" in a screenshot,
so the playtest reads the **network log** — the runtime counterpart of df6-3's Decision B.

- **Drive the game via the arcade Playwright harness** (claude-in-chrome is NOT connected —
  the controller drives Playwright MCP headless on its own port; see the standing memory
  note). Serve the checkout with `just serve` (or `npx vite --port 5290 --strictPort` to
  prove it's YOUR tree — the 5270 pin gotcha), and confirm **`/defender/` DIFFERS from a
  nonsense control path** (the canonical-serve lesson — an all-200 sweep proves nothing
  because the SPA fallback answers 200 to everything).
- **Prove the seam is live, not silent-degrading.** Trigger a laser, an enemy hit, and an
  explosion; assert the network log shows each cue's `.wav` **fetched with a 200** when its
  event fires — a 404 there is exactly the silent-degrade failure Decision B guards, invisible
  in-game.
- **Confirm the two stateful cues (df6-2).** The thrust `.wav` loop **starts on thrust-held
  and stops on release**; observe the loop start/stop in the audio graph / network activity.
- **Confirm Decision D.** The smart-bomb cue **plays** even though its visual is the
  ADR-0005 freeze/fade — audio is not muted by the photosensitivity exception; note that no
  cue 404'd during the session.
- **Record + hand forward.** Note which cues were heard and which (if any) were absent; file
  any missing/wrong cue **by file surface** (the jt9 habit), not merged by theme. Carry the
  df7 hand-forward note.

## Scope
- **In scope:** the audible/network playtest at `http://127.0.0.1:5270/defender/`
  (DIFFER-from-control); the per-cue 200-on-fire network assertions; the thrust loop
  start/stop confirmation; the smart-bomb-audio-plays-under-ADR-0005 confirmation; the
  heard/absent record; filing discrepancies by file surface; the df7 hand-forward note.
- **Out of scope:** any core/shell code change (the three prior stories own the code — this
  is the eyes-and-ears pass); attract musics + hall-of-fame cues (df7); fixing a cue found
  wrong (file it, don't fix it here).

## Acceptance Criteria
- AC1: at http://127.0.0.1:5270/defender/ (confirmed to DIFFER from a nonsense control path, not merely return 200 — the canonical-serve lesson) the network log shows the SOUNDS .wav for the laser, an enemy hit, and an explosion each FETCHED (200) when its event fires — proving the live seam, not a silent-degrade 404.
- AC2: the THRUST loop is confirmed to start on thrust-held and stop on release (df6-2), and the SMART-BOMB cue is confirmed to PLAY while its visual remains the ADR-0005 freeze/fade (Decision D — audio is not muted by the photosensitivity exception); a note confirms no cue 404'd during the session.
- AC3: any missing/wrong cue is filed by FILE SURFACE (the jt9 grooming habit), not merged by theme; the session records which cues were heard and which (if any) were absent.
- AC4: the df7 hand-forward note is recorded — the two attract musics (TODAYS SOUND $FE "PHANTOM" defender/AMODE1.SRC:148; HIGH SCORE $FD "TOCCATA" :152) and any hall-of-fame/attract cue wire in df7 with the attract phase machine (Decision A), citations preserved.

## Dependencies
- **df6-1 + df6-2** — the live seam, dispatch, and stateful cues the playtest exercises.
- **df6-3** — the uploaded assets (the playtest proves they 200 at runtime, closing the
  loop on Decision B).
- **The Playwright harness** — claude-in-chrome is not connected; the controller drives
  Playwright MCP headless (standing memory note).
- **Blocks:** nothing in df6; hands forward to **df7** (attract musics + attract phase
  machine + HUD).

## Design Notes
- **Decision B, at runtime:** df6-3 proved the assets exist with a build-time curl; this
  story proves they're actually **fetched when the events fire** — the two together close
  the silent-degrade gap in both directions.
- **Decision A hand-forward:** the two attract musics — TODAYS SOUND `$FE` "PHANTOM"
  (`defender/AMODE1.SRC:148`) and HIGH SCORE `$FD` "TOCCATA" (`:152`) — plus any hall-of-fame
  cue wire in df7 with the attract phase machine; citations preserved.
- The 5270-pin gotcha (prove whose server answers) and the canonical-serve DIFFER-from-
  control rule both bind here — an all-200 sweep proves nothing.

---
_Generated by `pf context create story df6-4` from the sprint YAML._
