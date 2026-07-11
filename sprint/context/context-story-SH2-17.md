# Story SH2-17 Context

## Title
Migrate star-wars, asteroids onto @arcade/shared/audio (consumes SH2-16)
_(battlezone descoped 2026-07-11 — see Scope Amendment)_

## Metadata
- **Story ID:** SH2-17
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** star-wars, asteroids, arcade-shared
- **Epic:** Shared render surface — extract font/glow/view/compositor into @arcade/shared and converge the cabinet on one vector treatment

## Scope Amendment (2026-07-11, user-approved during RED)
**battlezone is DESCOPED from SH2-17.** The design spec's §1 survey labelled
battlezone's audio "mirrors tempest," but the code (`battlezone/src/shell/audio.ts`)
is a **runtime SYNTHESIS engine** — oscillators, filtered noise bursts, LFOs, plus a
continuous `setEngine(throttle)`/`stopEngine()` engine-hum API — with **zero sample
files** (no `.wav`, no `fetch`, no `baseUrl`, no `decodeAudioData`). The shared
`@arcade/shared/audio` engine is strictly a **sample player** (`baseUrl` +
`sounds: Record<N, filename>` → fetch/decode/play buffers). battlezone cannot migrate
onto it behaviour-preservingly: it would need invented `.wav` assets it deliberately
lacks (changing the sound) plus a per-frame throttle→oscillator hum with no analog in
a buffer player. battlezone is left on its synthesis engine, untouched. SM to amend
epic-SH2.yaml SH2-17 (title/repos/AC-4) at finish; see session Delivery Findings.

## Problem
Consumption half of the audio extraction, split from SH2-16 per the cabinet's
publish->consume pattern (SH2-2 created /font; SH2-4/5/6 consumed it). Design:
`docs/superpowers/specs/2026-07-11-shared-audio-extraction-design.md`. Migrate the two
**sample-based** cabinets (star-wars, asteroids) off their hand-rolled SFX engines onto
`createAudioEngine` from `@arcade/shared/audio` (SH2-16, released **v0.12.0**), keeping
each game's SOUNDS/CHANNELS/baseUrl/masterGain as local NUMBERS and its
`audio-dispatch.ts` event wiring untouched.

## The shared contract (SH2-16, @arcade/shared/audio @ v0.12.0)
```ts
createAudioEngine<N extends string>(manifest: {
  baseUrl: string
  masterGain?: number            // default 0.4
  sounds: Record<N, string>      // logical name -> filename (buffers keyed by FILENAME)
  channels: Record<N, string>    // logical name -> channel; a new sound STEALS its channel
}): AudioEngine<N>               // { resume, play, startLoop, stopLoop, ready }
```
Buffers are keyed by filename, so several names → one `.wav` decode once (the asteroids
`explosionShip`/`explosionLarge` → `bangLarge.wav` case falls out for free). Every
failure path degrades silently. tempest is the proven reference consumer
(`tempest/src/shell/audio.ts`): keep the NUMBERS, delete the engine body, construct the
shared engine.

## Technical Approach

### Pin bump (both games)
Games currently pin `@arcade/shared#v0.11.0` (no `/audio`) with a stale `0.10.0`
installed. Bump each to `#v0.12.0` and **reinstall** (`npm install
"@arcade/shared@github:slabgorb/arcade-shared#v0.12.0"` — force past the git-dep lock
staleness). `import('@arcade/shared/audio')` must resolve `createAudioEngine`.

### asteroids
- **Delete** the engine body from `src/shell/audio.ts`: `getAudioContextCtor`, `load()`
  fetch/decode loop, `stopChannel`, `playSample`, `createBufferSource`, the `buffers`
  map. Construct the shared engine from the manifest instead (mirror tempest).
- **AC-2 — drop `SampleId`/`SAMPLE_FILES`.** The shared filename-keyed store handles the
  N:1 case: put `explosionShip` and `explosionLarge` both at `'bangLarge.wav'` in the
  `sounds` map; both fetch/decode once.
- **Keep** `audio-dispatch.ts` untouched (it still calls `play('heartbeat')`,
  `startLoop('thrust')`, etc.) and the dispatcher-facing `SoundName` union unchanged, so
  `tests/audio-dispatch.test.ts` stays green.
- **⚠ heartbeat (one name → two files, stateful).** The lub-DUB currently alternates
  `beat1.wav`/`beat2.wav` inside the engine's `play()` (`beatHigh` toggle). The shared
  `play(name)` plays ONE file per name. Since the dispatch test pins `play('heartbeat')`,
  relocate the alternation into asteroids' **local** `createAudioEngine` wrapper: give the
  shared manifest two entries (e.g. `heartbeatLow: 'beat1.wav'`, `heartbeatHigh:
  'beat2.wav'`) and have the local `play` intercept `'heartbeat'` to alternate between
  them. Keep `'heartbeat'` in the dispatcher-facing `SoundName`. Do NOT push the toggle
  into the shared engine.
- **⚠ steal vs stack.** asteroids' one-shots (fire, bangs, heartbeat) are currently
  fire-and-forget (they **stack/overlap** — see the audio.ts comment). The shared engine
  **steals per channel** on every trigger. Give each one-shot its own distinct channel so
  different sounds never cut each other off; a rapid retrigger of the SAME sound will
  cut-in (POKEY-style) rather than stack — the intended cabinet-wide convergence (as
  tempest's 10-10). Confirm this reads acceptably on the manual run (AC-2 "audibly
  unchanged" is judged there).
- **masterGain:** asteroids used `0.5` locally (shared default is `0.4`) — pass
  `masterGain: 0.5` to preserve level.

### star-wars
- **Delete** the SFX engine body (`load()` SFX loop, SFX `buffers` map, the SFX `play`
  path) and construct the shared engine for SFX. Keep the manifest (`SOUNDS`,
  `DEFAULT_BASE_URL`) and the **speech subsystem game-side** (`speak()`, the 23-line
  `SPEECH` catalogue, lazy speech loader).
- **Preserve the public surface** `createAudioEngine(baseUrl?)` returning
  `{ resume, play, speak, ready }` (compose: shared engine + local `speak`). Keep the
  `SPEECH`, `SoundName`, `SpeechName` exports — `tests/shell/audio.test.ts` imports them.
- **AC-3 — speech context decision.** `speak()` needs a gesture-unlocked `AudioContext`.
  The existing `audio.test.ts` requires that after `engine.resume()`, `engine.speak(...)`
  fetches — so speech must share the unlocked context. Cleanest resolution (design §4.2):
  add a **minimal read-only `context(): AudioContext | null`** accessor to the shared
  `AudioEngine` (in `arcade-shared`, on the `feat/SH2-17` branch → new release, e.g.
  v0.13.0) and have `speak()` read the shared context via it. If Dev finds speech runs
  unchanged on its own context, that is allowed too — **document the choice here**. Note:
  adding `context()` means an arcade-shared release + a second pin bump for star-wars.
- **⚠ steal vs stack (same as asteroids).** star-wars' `play()` currently stacks
  (no channels). Give each SFX its own channel; rapid same-sound retrigger converges to
  cut-in. Judge on the manual run.
- **masterGain:** star-wars used `0.4` (== shared default) — no override needed.

## Acceptance Criteria (amended — battlezone dropped)
1. **star-wars and asteroids** each construct their SFX engine via
   `createAudioEngine(manifest)` from `@arcade/shared/audio` at a pinned ref
   (>= v0.12.0); each game's local engine body (getAudioContextCtor, createBufferSource,
   channel-stealing, load loop) is deleted, leaving its manifest + audio-dispatch.ts
   (star-wars additionally retains its speech subsystem).
2. asteroids' `SampleId`/`SAMPLE_FILES` file-keyed indirection is removed; its
   multiple-names-per-file sounds resolve through the shared filename-keyed buffer store;
   the heartbeat lub-DUB alternation is preserved (relocated to asteroids' local wrapper,
   dispatcher unchanged); asteroids vitest + vite build green with SFX audibly unchanged.
3. star-wars keeps its speech working (`speak()` + LPC catalogue still fires): it either
   shares the shared engine's `AudioContext` via a newly added read-only `context()`
   accessor on `AudioEngine` (documented here) or runs speech on its own context
   unchanged; star-wars vitest + vite build green.
4. **(battlezone descoped — no longer an AC.)** SM amends epic-SH2.yaml SH2-17
   (title/repos/AC-4) at finish; battlezone is left on its synthesis engine, unchanged.
5. A manual run of star-wars and asteroids confirms SFX, loops, and channel
   voice-stealing behave correctly; star-wars speech still fires; no local duplicate of
   the engine boilerplate remains in either game.

---
_Enriched by TEA (O'Brien) during RED, 2026-07-11. Original generated by
`pf context create story SH2-17`._
