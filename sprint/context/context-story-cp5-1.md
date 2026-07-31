# Context: cp5-1 — Centipede audio seam

## Story Details
- **Story ID:** cp5-1
- **Epic:** cp5 — Centipede audio — the sound subsystem centipede shipped without
- **Title:** Centipede audio seam — core event channel, shell dispatch and the SOUNDS manifest, no samples yet
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Type:** Feature
- **Repos:** arcade

## Background

Centipede shipped without audio — no `src/core/events.ts`, no `src/shell/audio.ts`, and no `src/shell/audio-dispatch.ts`. The gap is deliberate and already documented: `plugins/centipede/src/core/bonus.ts:30-35` contains a deferral banner naming this epic, marking the bonus-life sound as "DEFERRED to cp5 with the rest of the audio, and deliberately not stubbed — an empty hook would be dead code pretending to be a seam."

This story builds the seam only — no baked samples, no R2 uploads. It is a structural prerequisite: later cp5 stories will be a matter of naming a cue and baking a file.

### Precedents: Five Games, Four Complete

Five games have walked this path. Four are complete and serve as reference; one uses an anti-pattern to avoid.

| Game | core/events.ts | shell/audio.ts | shell/audio-dispatch.ts | Status |
|------|---|---|---|--------|
| tempest | ✓ | ✓ | ✓ | Complete (exemplar) |
| asteroids | ✓ | ✓ | ✓ | Complete (exemplar) |
| battlezone | ✓ | ✓ | ✓ | Complete (exemplar) |
| red-baron | ✓ | ✓ | ✓ | Complete (exemplar) |
| star-wars | ✓ | ✓ | — | Inline dispatch in main.ts (anti-pattern — not unit-testable) |
| centipede | — | — | — | This story |
| joust | — | — | — | Backlog |

**Follow tempest, battlezone, and asteroids.** The battlezone header (shell/audio-dispatch.ts:1-9) explicitly states the design choice: "tempest's audio-dispatch extraction, deliberately NOT star-wars's inline-in-main.ts switch, so the map is unit-testable against a recording fake without booting a canvas."

### Shared Audio Engine

Post-migration (2026-07-30), the shared audio engine is `src/shared/audio.ts` in this repo, imported as `@shared/audio` through an alias in `vite.config.ts`, `vitest.config.ts` and `tsconfig.json`.

The established shape (reference: `plugins/tempest/src/shell/audio.ts:1-24`):
- The game's `shell/audio.ts` holds ONLY that cabinet's numbers: the `SOUNDS` manifest (name→filename), the `CHANNELS` voice map, and `DEFAULT_BASE_URL` (e.g., `https://arcade-assets.slabgorb.com/tempest/sfx/`).
- The engine is constructed via `createAudioEngine()` from `@shared/audio`.
- The engine exports `resume() / play(name) / startLoop(name) / stopLoop(name) / ready()` and `AudioManifest<N>` with `baseUrl / masterGain? / sounds / channels`.

Centipede's base URL is the `centipede/` prefix on the same assets host: `https://arcade-assets.slabgorb.com/centipede/sfx/`.

Centipede already imports four modules from `@shared`: `@shared/rng`, `@shared/highscore`, `@shared/name-entry`, `@shared/loop`. Audio is one more import line — no subpath export, no version pin, no bump ceremony.

> ⚠ **Correction (TEA, red phase 2026-07-31) — the setup phase got this wrong and the epic description was right.**
> An earlier revision of this file said "five modules … including `@shared/font`". It does not. The three
> `@shared/font` hits in centipede are all *negative* references — a comment in `src/shell/layout.ts:134`
> ("NOT @shared/font — score/level are ROM tiles") and two in `tests/render.test.ts` that assert the import
> is absent. Verified with `grep -rhoE "from '@shared/[a-z-]+'" plugins/centipede/src`: rng ×6, highscore ×2,
> name-entry ×1, loop ×1. **Do not add `@shared/font`** — `plugins/centipede/tests/render.test.ts:132`
> actively forbids it by epic ruling (score and level digits are ROM picture tiles).

### Event Carrier: State Field, Not Step Result

There is no "step result" — `plugins/centipede/src/core/sim.ts:811` defines `stepSim(state: SimState, input: InputCounts): SimState`. Events must be carried as a field on the state itself.

The asteroids precedent shows the pattern: `plugins/asteroids/src/core/sim.ts` (line 317) maintains `const events: GameEvent[] = []` during the step and returns it on the new state. The array is cleared per frame (lines 179, 194, 212) with an explicit comment: "no gameplay-audio events in attract; never carry a stale frame's forward." That per-frame clear is load-bearing for AC2's determinism test — a carried-forward stale frame is the failure mode the comment was written against.

## Acceptance Criteria

> ⚠ **Note on AC5 — the line cite is off by one, and the AC below is left as the epic YAML wrote it.**
> Measured 2026-07-31: `plugins/centipede/src/core/bonus.ts:31` is the line that NAMES the cue
> (`// :1994-1995 "LDA I,17. / STA CHAN4 ;BONUS LIFE SOUND" is the bonus-life sound.`). Line **32**
> — the line AC5 cites — is the continuation `// It is DEFERRED to cp5 with the rest of the audio,
> and deliberately not stubbed`. AC5's real target is the whole `─── THE ONE THING THAT IS *NOT*
> HERE ───` deferral banner at **`plugins/centipede/src/core/bonus.ts:30-35`**; satisfy it by
> rewriting that block, and cite the block rather than either line.
>
> The AC text itself is reproduced verbatim from `sprint/epic-cp5.yaml` and has NOT been edited —
> so the epic YAML and this context agree, and this note is the record of which came first.

1. **AC1:** `core/events.ts` defines the event union and the sim emits it as data; the core purity scanner still passes, so no DOM, clock or randomness entered the core.
   - Guard: `plugins/centipede/tests/purity.test.ts` and `purity-scanner.test.ts` both exist and must pass.
   - The new `core/events.ts` lands inside the scan area.

2. **AC2:** A fixed seed and input stream replay an identical event stream — the event channel is deterministic and a test pins that.
   - The seeded replay must prove the event array is cleared per frame and that the same input+seed produces byte-identical GameEvent[]s across runs.

3. **AC3:** `shell/audio-dispatch.ts` maps every event kind to a cue and carries a never exhaustiveness guard, proven by a test or a deliberate compile failure that adding a kind without a cue is caught at build time.
   - The dispatch switch must use a discriminated-union match (e.g., TypeScript's exhaustiveness checking or a fallback that never returns).

4. **AC4:** The SOUNDS manifest and CHANNELS map cover every event kind, with sustained cues (the marching tick, the spider) expressed as start and stop rather than repeated one-shots.
   - The manifest names every event kind defined in the union.
   - Sustained events are paired `startLoop(name) / stopLoop(name)` calls, not repeated `play(name)` one-shots.

5. **AC5:** The bonus-life cue named by core/bonus.ts:32 has a place in the manifest and its comment is updated to point at the seam that now exists rather than at a deferral.
   - See the ⚠ note above: the block to rewrite is `plugins/centipede/src/core/bonus.ts:30-35`.
   - The comment must be rewritten to name the audio channel and file, not the epic id.

6. **AC6:** No .wav is committed to the repo and no R2 upload is claimed by this story — the manifest names files that later stories bake, and the story says so plainly rather than implying the game now has sound.
   - Verify `plugins/centipede/README.md:121-123` is updated: the status note must state the seam exists while no samples ship yet, not that audio is unsupported.
   - ⚠ **TEA (red phase): there are TWO stale places in that README, and 121-123 is the lesser one.**
     The **status block at `README.md:11-20`** is the primary claim — it says centipede is "playable and
     **silent**", that "there is no `src/shell/audio.ts`, no event channel and no dispatch", and cites
     `src/core/bonus.ts:32` for the deferral. Every one of those sentences is falsified by this story.
     Update BOTH; `tests/audio-seam-scope.test.ts` pins both and pins that the game is not claimed to
     have sound.

## Technical Approach

### The Three Pieces to Build

1. **`src/core/events.ts`:** A discriminated union of every gameplay moment the sim already produces. Emitted as a field on the new state, never as callbacks. The core remains pure (no DOM, clock, randomness). The purity scanner must pass.

2. **`src/shell/audio.ts`:** The SOUNDS manifest (event-name → filename) and CHANNELS map (cue → voice index) for the centipede cabinet. Pointed at `https://arcade-assets.slabgorb.com/centipede/sfx/`.

3. **`src/shell/audio-dispatch.ts`:** An event-to-cue switch that maps every event kind to a play or loop call, carrying a never exhaustiveness guard. A future event added without a cue is a **compile error**, not a silent omission.

### Determinism and Event Clearing

Reference the asteroids pattern (see `plugins/asteroids/src/core/sim.ts`):
- Events array is a field on SimState.
- Rebuilt (cleared and repopulated) on every frame.
- The per-frame clear is critical for AC2's seeded replay test — a stale event from a prior frame breaks determinism.

### Five Precedent Files to Read

1. `plugins/tempest/src/shell/audio.ts` — the manifest and channel map shape
2. `plugins/battlezone/src/shell/audio-dispatch.ts` — the dispatch pattern and exhaustiveness guard
3. `plugins/asteroids/src/core/sim.ts` — the event-carrier as a state field, cleared per frame
4. `plugins/red-baron/src/core/events.ts` — a complete event union definition
5. `plugins/star-wars/src/main.ts` — the anti-pattern (inline dispatch, not unit-testable); read to understand what to avoid

### Documentation Update

`plugins/centipede/README.md:121-123` currently states centipede "does **not** consume ... `@shared/audio`". This AC6 must rewrite that section to plainly state: the seam is now present (the manifest, dispatch, and event channel exist), but no audio samples are uploaded or committed by this story. Later stories will name the files.
