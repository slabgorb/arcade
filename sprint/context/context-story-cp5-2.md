# Story cp5-2 Context

## Title
Wire the centipede audio seam into main.ts — the shell actually plays the stream

## Metadata
- **Story ID:** cp5-2
- **Type:** story
- **Points:** 2
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Centipede audio — the sound subsystem centipede shipped without

## Problem

> ⚠ **CORRECTION — read this before the paragraph below (SM, 2026-08-01, at setup).**
> The Problem text that follows is the epic YAML's `description` reproduced verbatim. It is
> **wrong in two places** and it presents an already-settled decision as still open. Every claim
> below was measured against the current tree before this story was set up; the full evidence,
> with line numbers, is in `.session/cp5-2-session.md` → *Background: Story Overview*.
>
> 1. **"All four precedent games" — there are FIVE.** tempest, asteroids, battlezone, red-baron
>    **and joust** (`plugins/joust/src/main.ts:30` import, `:198` call). The description omits
>    joust. star-wars is a *sixth* game with audio in `main.ts` but is **not** a precedent here:
>    it dispatches **inline** and has zero occurrences of `playEventSounds` — the shape cp5-1
>    deliberately did not copy.
> 2. **"tempest 3 sites, asteroids 3, battlezone 2, red-baron 2" — that census is wrong.** All
>    five precedents use the **identical** three-call-site shape: `createAudioEngine()` +
>    `audio.resume()` behind a user gesture + `playEventSounds(audio, <events>)` inside the
>    stepped-frame callback.
> 3. **"Decide explicitly whether the dispatch should throw or degrade" — ALREADY DECIDED.**
>    User ruling, 2026-08-01, taken at setup: **DEGRADE.** Drop the two runtime throws
>    (`shell/audio-dispatch.ts:62` and `:80`); keep a bare `const _exhaustive: never = event`-style
>    default arm. The compile guard (`EVENT_SOUND: Record<GameEventKind, SoundName>`,
>    `shell/audio.ts:113`) plus CI's `npm run lint` stays the real enforcement. A missing cue must
>    cost **silence, never a frozen frame loop**. Evidence: **none of the five precedents throws at
>    runtime** — tempest:111-116, asteroids:57-61, battlezone:74-77, red-baron:68-71, joust:70-75
>    all end in a bare `never` binding with no `throw`. Centipede is the outlier in throwing.
>    Do not re-litigate this; AC3 below is satisfied by the degrade branch.
> 4. **"whether the attract screen … needs any shell-side handling at all" — measured and closed,
>    NOT an open question.** Attract is already silent at the **core**: `core/events.ts:23-26`
>    records that `stepAttractDemo` runs a full playing frame and **clears** the stream before
>    returning, and `sim.ts:1041` returns `events: []` on a death-delay frame. No shell-side guard
>    is needed.
>
> Two claims in the paragraph below **do** hold and are load-bearing: `plugins/centipede/src/main.ts`
> references neither `createAudio` nor `playEventSounds` (0 occurrences, all 185 lines read), and
> `playEventSounds` genuinely throws — at **two** sites, `:62` and `:80`, not the one the
> description mentions.

cp5-1 built the seam and deliberately stopped short of connecting it: createAudio and playEventSounds exist, are unit-tested against a recording fake, and are called by NOTHING — plugins/centipede/src/main.ts does not reference either. That was the right call for cp5-1 (wiring it then would have bought 14 guaranteed 404s, and this epic's rule is that a live 200 is the acceptance test for anything audible), but it means the epic's promise that later stories are 'a matter of naming a cue and baking a file' is not yet true. All four precedent games do reference playEventSounds/audio-dispatch from main.ts (tempest 3 sites, asteroids 3, battlezone 2, red-baron 2); centipede is the outlier. THE LATENT HAZARD, WRITTEN DOWN NOW RATHER THAN DISCOVERED LATER: playEventSounds THROWS on an event kind with no cue, and an uncaught throw inside requestAnimationFrame kills the frame loop and freezes the game. Today that is unreachable because nothing calls it. The moment main.ts calls it, a kind added to core/events.ts without a manifest entry stops being a compile error caught by CI and becomes a runtime freeze — the compile guard (EVENT_SOUND: Record<GameEventKind, SoundName> in shell/audio.ts) does hold, so this is a defence-in-depth question, not an open hole. Decide explicitly whether the dispatch should throw or degrade once it is on the hot path. Also in scope: the gesture gate (the shared engine is a no-op until the player's first interaction) and whether the attract screen — which the core keeps silent by design — needs any shell-side handling at all.

## Technical Approach

_Measured pointers only — TEA and Dev own the design. These are the files and seams the story
touches, established at setup so nobody re-derives them._

**The five precedents to copy the shape from.** All five are identical; `plugins/tempest/src/main.ts`
is the cleanest read (lines 7-8, 40, 45-51, 98).

| Site | tempest | asteroids | battlezone | red-baron | joust |
|---|---|---|---|---|---|
| `createAudioEngine()` | :40 | :53 | :103 | :358 | :170 |
| `audio.resume()` behind a gesture | :47 | :58 | :105 | :359 † | :174 |
| `playEventSounds(audio, …)` in the stepped-frame callback | :98 | :118 | :166 | :878 | :198 |

† red-baron's is a one-line arrow (`const unlockAudio = (): void => audio.resume()`), so a grep for
a bare `audio.resume()` statement misses it.

**Centipede's existing pieces, all built by cp5-1 and all currently unreferenced:**
- `plugins/centipede/src/shell/audio.ts:138` — `createAudio(baseUrl?)`. Note the name: centipede's
  constructor is `createAudio`, **not** the precedents' `createAudioEngine`. AC1 names it correctly.
- `plugins/centipede/src/shell/audio-dispatch.ts:45` — `playEventSounds(audio, events)`.
- `plugins/centipede/src/shell/audio-dispatch.ts:20` — the injectable seam,
  `SoundSurface = Pick<AudioEngine, 'play' | 'startLoop' | 'stopLoop'>`. AC2's fake goes here;
  `plugins/centipede/tests/audio-dispatch.test.ts` already has a recording fake to model on.
- `plugins/centipede/src/core/sim.ts:271` — `readonly events: readonly GameEvent[]` on `SimState`,
  seeded `[]` at :317. AC1's `state.events` is writable as worded.

**Where the call lands.** `plugins/centipede/src/main.ts` steps the sim inside the `pumpFrame`
callback at :151-161 — that is the "once per stepped frame" AC1 asks for, and it is deliberately
*not* once per `requestAnimationFrame` (the cp1-1 reviewer's 120 Hz double-speed bug). main.ts
already has a gesture-bearing listener at :84-86 (`canvas.addEventListener('click', …)`) and a
keydown listener at :92-94.

**The gesture gate is already the shared engine's job** — AC4 is about not defeating it, not about
building it. `src/shared/audio.ts`: `resume()` (:143) lazily constructs the `AudioContext`;
`play`/`startLoop`/`stopLoop` (:223/:227/:231) are documented silent no-ops before it (interface
comments at :31-47).

## Scope

**In scope**
- The three call sites in `plugins/centipede/src/main.ts`, matching the precedent shape.
- Removing the two runtime throws in `shell/audio-dispatch.ts` (`:62`, `:80`) per the degrade
  ruling, and recording that decision in the dispatch's own comment (AC3).
- A test that proves the wiring is LIVE via an injected fake, not a grep (AC2).

**Out of scope**
- Any `.wav` — none is committed and none is uploaded (AC5). The cabinet stays silent after this
  story; the acceptance test for anything audible is a live 200 in a later cp5 story.
- Any change to `plugins/centipede/src/core/` — the core already emits the events and already keeps
  attract silent. This story is shell-only.
- Any new cue, channel or manifest entry. `SOUNDS`, `CHANNELS` and `EVENT_SOUND` are cp5-1's and
  are complete for the 18 kinds in `core/events.ts`.

## Acceptance Criteria
- main.ts constructs the engine via createAudio() and calls playEventSounds(audio, state.events) once per stepped frame, in the render/step loop — not per event and not from the core.
- A test proves the wiring is LIVE, not merely present: a fake engine injected at the seam records a cue for an ordinary played frame. A grep for the import is not the test.
- The throw-vs-degrade decision for an unmapped kind is made explicitly and recorded in the dispatch's own comment, because an uncaught throw inside requestAnimationFrame freezes the game.
- The gesture gate is respected: no AudioContext is constructed before the player's first interaction, and events that land before it are dropped without error.
- Still no .wav is committed and none is uploaded — this story wires the plumbing and the cabinet stays silent until the asset stories land, verified by a live 200.

---
_Generated by `pf context create story cp5-2` from the sprint YAML._
