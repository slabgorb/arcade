# Story cp7-6 Context

## Title
Adopt the shared pause — and stop the sustained voices that would ring through it

## Metadata
- **Story ID:** cp7-6
- **Type:** story
- **Points:** 3
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Centipede playtest followups — four shell defects on a byte-correct core, one unwired DIP, and the pause the cabinet never had

## Problem
NOT A PLAYTEST DEFECT AND NOT A FIDELITY STORY. A 1980 coin-op has no player pause: grep for "pause" across the ENTIRE vendored tree (CENTI.MAC, CENIRQ.MAC, CENDEF.MAC, CENPIC.MAC, CENTST.MAC, COIN65.MAC, SYNC.MAC and the .DOC files) returns ZERO hits. This is a house cabinet feature that five of the seven games already have and centipede and joust do not. Nothing in the audit or citation record can be cited for or against it, and no claim is added by this story.

BEWARE THE WORD COLLISION BEFORE YOU GREP. Every "pause" hit inside plugins/centipede/src today is the ROM's DEATH and WAVE-CLEAR delay — DEATH_DELAY = 0x30 (core/sim.ts:78), the delay field (core/sim.ts:197), stepDeathFrame (core/sim.ts:766), core/playfield.ts:159. That is a sim-internal freeze and an entirely different concept. Centipede has NO player pause of any kind: no @shared/pause import, no @shared/esc-overlay import, no @shared/host-helpers import, and no Escape in the keyboard adapter's key sets (src/shell/input.ts:96-105 is arrows/WASD/space/Enter).

THE SHARED API IS SMALL AND ALREADY EXISTS. src/shared/pause.ts is pure and DOM-free with four exports: INITIAL_PAUSED (:16), isPauseKey (:24-26, exact match on 'escape' — the CALLER must lowercase), togglePaused (:29-31), and stepUnlessPaused (:39-41, a thunk gate that on pause returns the SAME REFERENCE and never calls step). src/shared/esc-overlay.ts:66-87 drawEscOverlay renders the dim panel and keybind card. src/shared/host-helpers.ts:143-157 installPauseToggle returns { isPaused, uninstall } and bakes in the two halves that are easy to drop by hand — the !e.repeat edge-not-level test and the e.key.toLowerCase() (:150). Use it rather than hand-rolling a listener; centipede's main.ts currently hand-rolls all of its listeners, which is exactly how those two get missed.

MODELS TO COPY, AND CENTIPEDE NEEDS BOTH HALVES: tempest for the STRUCTURE (fixed-timestep accumulator with isPaused threaded into the loop — plugins/tempest/src/main.ts:63/:68-80/:101-104/:116 with the gate in plugins/tempest/src/shell/loop.ts:47-49 and :96-111) and red-baron for the AUDIO (sustained voices silenced from a playing: !pause.isPaused() flag — plugins/red-baron/src/main.ts:883-886 into plugins/red-baron/src/shell/audio-dispatch.ts:30-31 and :88-91). asteroids (src/main.ts:74/:104-120/:128), star-wars (src/main.ts:18/:20/:113) and battlezone (src/shell/pause.ts, main.ts:127, shell/render.ts:420) are the other three adopters.

THE AUDIO IS THE HARD PART AND IT IS UNIQUE TO THIS CABINET — READ THIS BEFORE ESTIMATING. Centipede is the only game with EDGE-DRIVEN SUSTAINED VOICES: march-start/-stop, spider-, flea- and scorpion- (src/core/events.ts:62-77) dispatched by suffix to startLoop/stopLoop (src/shell/audio-dispatch.ts:38-40, :107-111) onto channels voice-spider, voice-flea and voice-scorpion (src/shell/audio.ts:119-121, :146-151). Because the core emits ONLY EDGES, simply not stepping the sim leaves the march, spider and flea loops RINGING FOREVER THROUGH THE PAUSE. The shared AudioEngine (src/shared/audio.ts:30-57) has NO suspend and NO stopAll — only per-name stopLoop. So this story must either track the live loops in the shell and stop/restart them across the pause boundary, or add a suspend seam to the shared engine. Note also that audio.tick() (src/shared/audio.ts:52-56) is driven once per sim frame and must freeze with the sim. Choose, and write down which and why; a shared-engine change is the wider blast radius and touches six other games.

THE RENDER DIFFERS FROM EVERY EXISTING ADOPTER, WHICH IS THE SECOND TRAP. All five adopters draw into a single ctx. Centipede renders into a 240x256 LOGICAL backbuffer and then integer-scale-blits it (src/main.ts:220 then :222-225). The frozen frame must keep rendering — render() stays OUTSIDE the gate — and drawEscOverlay must be drawn on the VISIBLE ctx AFTER the blit, or the keybind card gets pixel-scaled along with the playfield.

WIRING SITES: the loop is a raw requestAnimationFrame (src/main.ts:178-229, :227, :229), NOT @shared/loop's createLoop. Input is sampled per sim step via sampleStep() (main.ts:164-176) drained inside pumpFrame (main.ts:187). The gate belongs in the pumpFrame step callback (main.ts:187-205) around stepSim + playEventSounds + the high-score save — and the precedent for a whole-callback early return is one line above it, the demo freeze "if (demoKind) return" at main.ts:190.

DECIDE THE PAUSED-TIME POLICY EXPLICITLY. Tempest DISCARDS paused time (shell/loop.ts:94 — "paused time is discarded, not banked, so no burst on resume"); red-baron does accumulator %= SIM_TIMESTEP_S (main.ts:647). Centipede's acc is at main.ts:156 and :187. Without a policy a ten-second pause BANKS a catch-up burst, clamped only by advanceFixedSteps' spiral guard (shell/timebase.ts:29-36) — i.e. the game fast-forwards on resume.

ESCAPE ALREADY MEANS SOMETHING HERE, and the story must state the resolution rather than discover it in play: Escape exits POINTER LOCK (noted at src/shell/input.ts:158-161), and createPointerLock's exit callback already resets input (main.ts:87-95). Pausing on the same key is coherent — the player loses the trackball and gets a pause card — but it is a design decision that has to be made deliberately.

PURITY: pause lives in src/main.ts and src/shell/ ONLY. SimState gains no pause field. tests/purity.test.ts:140-161 sweeps every .ts under src/core/ with the compiler-API scanner and bans window, document, listeners and any import from shell/ — a paused flag in core/sim.ts or a keydown handler in core reddens it. @shared/pause is pure and safe to import from the shell; @shared/esc-overlay is browser-flagged (esc-overlay.ts:10-12) and is shell-only.

TEST PRECEDENTS TO COPY: plugins/red-baron/tests/pause-adoption.test.ts:38-118 is the closest fit — it walks src/, asserts something imports @shared/pause (:86-91) and @shared/esc-overlay (:93-98), then runtime-imports both and asserts the full API plus the frozen-reference and zero-call property (:100-112). Identical files exist for asteroids, tempest and star-wars. For behaviour, plugins/battlezone/tests/shell/pause-gate.test.ts:37-80 covers key recognition INCLUDING the negative set ('e', 'esc', '') plus a mid-play frozen-frame assertion; plugins/battlezone/tests/shell/pause-overlay.test.ts:55/:77 mocks the overlay. For the loop-silencing test, centipede's own tests/audio-wiring.test.ts and tests/voice0-contention.test.ts already drive a SoundSurface double — use it. FINALLY, BE HONEST ABOUT THE SEAM: every adopter declares that the live keydown-to-rAF path has NO unit seam and is verified by a manual run (see red-baron's test header :14-17). Frame it the same way and actually do the manual run.

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
- Escape pauses and resumes centipede in a live run, the sim freezes (no segment, spider or flea motion) and the frozen frame stays visible with the keybind card over it.
- Every sustained voice — march, spider, flea, scorpion — goes SILENT for the duration of the pause and resumes correctly, asserted through the existing SoundSurface double. Because the core emits only edges, a naive gate leaves them ringing; the story states which seam was chosen (shell-side loop tracking vs a suspend seam on the shared engine) and why, and names the blast radius if the shared engine was touched.
- The overlay is drawn on the VISIBLE ctx after the integer-scale blit (src/main.ts:222-225), not into the 240x256 logical backbuffer, so the card is not pixel-scaled — this is the one place centipede differs from all five existing adopters.
- The paused-time policy is chosen explicitly and tested: a long pause does not bank a catch-up burst on resume (tempest discards at shell/loop.ts:94; red-baron takes the modulus at main.ts:647).
- The Escape / pointer-lock collision is resolved deliberately and the behaviour written down — Escape already exits pointer lock (src/shell/input.ts:158-161) and createPointerLock's exit callback resets input (main.ts:87-95).
- Pause lives entirely in src/main.ts and src/shell/; SimState gains no pause field and tests/purity.test.ts:140-161 stays green. @shared/pause is used rather than the logic re-implemented, and the keydown wiring keeps the !e.repeat edge test and the key.toLowerCase() that installPauseToggle bakes in.
- A pause-adoption test in the shape of plugins/red-baron/tests/pause-adoption.test.ts:38-118 exists for centipede, plus a behavioural gate covering the negative key set ('e', 'esc', '').
- The story records that this carries NO fidelity claim — the vendored tree has zero occurrences of 'pause' and the ROM's DELAY is a different concept — and adds no claim JSON.

---
_Generated by `pf context create story cp7-6` from the sprint YAML._
