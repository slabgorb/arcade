# Story sw3-5 Context

## Title
Phase music engine — looping music channel driven off phase edges (space/towers/trench themes + Imperial March); needs music assets sourced

## Metadata
- **Story ID:** sw3-5
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** star-wars
- **Epic:** Star Wars — ROM fidelity pass (post-audit follow-ons)

## Background

The "needs music assets sourced" tag is a red herring — the source EXISTS. The music is authentic ROM POKEY music from the 1983 cabinet's sound board, transcribed the same way tempest's POKEY SFX and star-wars's 23 speech lines were. Documented in star-wars/docs/star-wars-1983-source-findings.md ("## Sound hooks"):
- Sound-board command table `off_7F61`: entries 26–36 = MUSIC (0 silence, 1 SFX, 3–25 speech, 37–58 SFX). Local disasm: reference/disasm/sound/ + SW_Sound.asm (gitignored).
- Phase→music map: space `$24/$25`, towers `$20/$21`, trench `$22`, Death-Star-entry `$1E`(+R2 `$32`), destroyed `$1F`. Imperial March = `$1D`.
- Space-wave loop `sub_6838` (state 31): timer `$28`(40)→Sound_24 OR Sound_1D (Imperial March) when wave>=3 AND odd; `$C8`(200)→Sound_25; `$190`(400)→Sound_1E; `$1A4`(420)→ next state.
- Authentic note/envelope tables: GitHub historicalsource/star-wars (pinned 5355b76), codename "Warp Speed" (WS*.MAC). The findings-doc map covers only the MAIN-board vector files; the SOUND-board .MAC files hold the music note data. CR-terminated non-UTF8 — fetch raw and `tr '\r' '\n'` before grep.

**SHARED AUDIO IS ALREADY BUILT (SH2-16/SH2-17) — DO NOT HAND-ROLL LOOPING PLAYBACK:**
- `@arcade/shared/audio` (star-wars pins github:slabgorb/arcade-shared#v0.12.0 — a stable tag) exposes AudioEngine<N> with `startLoop(name)` / `stopLoop(name)`: a SUSTAINED looping sample on a channel with POKEY-style voice-stealing (only one loop rings per channel). A dedicated `"music"` channel therefore plays exactly one looping track that swaps on the next startLoop. This IS the looping music channel the story needs.
- star-wars/src/shell/audio.ts already constructs the shared engine (SH2-17) but its LOCAL `AudioEngine` interface only re-exposes resume/play/speak/ready. sw3-5 must surface `startLoop`/`stopLoop` (thin wrappers over the shared sfx engine) AND add a MUSIC manifest (logical name -> R2 filename) plus a `music` entry in the channels map. SFX host prefix is https://arcade-assets.slabgorb.com/star-wars/sfx/ ; a star-wars/music/ prefix mirrors the sfx/ and speech/ layout.

**EXACT INTEGRATION POINTS (for TEA/Dev — do not modify these yourself):**
- core/events.ts: GameEvent discriminated union. Add a music-cue variant following the SpeechEvent/SpeechLine template (a string-literal union of track names, exhaustive switch). Model start/stop to match the shared engine (e.g. `{type:'music', track: MusicTrack | null}` where null=stop, or separate start/stop variants — Architect/TEA's call).
- core/sim.ts + core/state.ts: emit the cue on PHASE EDGES only (the enterPhase machinery), NOT every frame. Track per the ROM phase->music map above; Imperial March when wave>=3 && odd (sub_6838). CAUTION — the sw3-4 Reviewer rejection was exactly an edge/reset bug ("second trench run stone silent" because a per-run timer entered already-past-threshold). Edge-detection + reset-on-phase-entry determinism is the core testable behaviour.
- src/main.ts: the event loop is an exhaustive `switch (event.type)` dispatching to audio.*(). Add a `case 'music'` arm calling startLoop/stopLoop. The `default` arm is a `never` exhaustiveness guard, so a new variant without an arm is a compile error.
- Pattern precedent: sw2-5 (phase-edge speech GameEvents) and sw3-4 (trench voice-line timer) — same "core owns WHEN, shell owns HOW" split.

**CLAUDE.md HARD BOUNDARY:** core/ is pure/deterministic — no DOM, no Date.now/Math.random/performance.now/rAF; all randomness via the seeded RNG in GameState. The music DECISION (which track, when) lives in core and is unit-tested; actual playback/looping/asset-loading lives in shell (verified by running, not unit-tested).

## Technical Approach

TEA will define the test structure during the RED phase; this is a deterministic core feature with shell integration.

## Scope
- In scope: looping music channel driven off phase edges, core→shell GameEvent integration, music asset hosting.
- Out of scope: unrelated changes, coin-op urgency mechanics (deliberately descoped per project policy).

## Acceptance Criteria

1. A looping music channel exists (via @arcade/shared/audio startLoop/stopLoop on a dedicated `music` channel) — one track plays at a time and loops until a phase edge swaps it.
2. The music cue is emitted from the deterministic core (core/events.ts GameEvent + core/sim.ts) on PHASE EDGES, not polled in the shell. Phase->track matches ROM: space `$24/$25`, towers `$20/$21`, trench `$22`.
3. Imperial March replaces the space track under the ROM condition (wave>=3 AND odd), matching sub_6838.
4. Deterministic + frame-rate independent: identical input -> identical music-cue event sequence. Cue fires once per edge and resets on phase entry (no run-two-silent regression — cf. sw3-4). core stays pure.
5. Shell surfaces startLoop/stopLoop, adds the MUSIC manifest + `music` channel, and main.ts's event switch dispatches the music cue. Music assets are R2-hosted .wav loops transcribed from ROM POKEY music (historicalsource sound board).

---
_Generated by `pf context create story sw3-5` from the sprint YAML._
