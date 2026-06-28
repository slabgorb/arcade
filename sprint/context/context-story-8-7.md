# Story 8-7 Context

## Title
Wave 5 — audio: POKEY SFX + TMS5220 speech ('Use the Force, Luke')

## Metadata
- **Story ID:** 8-7
- **Type:** story
- **Points:** 3
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** star-wars
- **Epic:** Star Wars: vector cockpit shooter (Waves 0-5)

## Overview
Implement WebAudio-driven SFX engine and TMS5220 speech synthesis for star-wars Wave 5. Port POKEY sound-effect register sequences from the original arcade disassembly (via reference/disasm/sound/) to WAV assets. Emit audio events from the deterministic core (via GameState.events) and consume them in the shell's audio module, mirroring tempest's proven pattern.

## Technical Approach

### 1. **Emit Audio Events from Core**
Extend `src/core/state.ts` and `src/core/events.ts` to define audio-bearing GameEvents:
- `type: 'fire'` — player laser fired
- `type: 'enemy-fire'` — enemy fireball launched (adapt tempest pattern for star-wars)
- `type: 'enemy-death'` — TIE destroyed or turret destroyed
- `type: 'player-death'` — ship destroyed (cause: 'enemy'|'turret'|'terrain')
- `type: 'level-clear'` — phase complete, wave advances
- `type: 'player-spawn'` — ship respawned
- `type: 'terrain-crash'` — grazed/scraped surface during skim (Wave 2+)

Audio-bearing events carry spatial data (position in world space) for future stereo panning or particle placement, but remain DATA (no callbacks).

### 2. **Build Audio Asset Pipeline**
Follow tempest's `tools/pokey-bake/` pattern:
- Create `star-wars/tools/pokey-bake/` with:
  - `bake-sfx.mjs` — Node script driving web-pokey to render POKEY register sequences to `.wav`
  - `sfx-data.mjs` — manifest of SFX with their POKEY register writes (derived from `reference/disasm/sound/FX_Tables.asm`, etc.)
  - `vendor/pokey.js` — web-pokey emulator core (vendored, same as tempest)
  - `.gitignore` — ignore `out/` directory (`.wav` files not committed)

Extract sound-effect register sequences from:
- `reference/disasm/sound/FX_Functions.asm`, `FX_Tables.asm` — POKEY SFX
- `reference/disasm/sound/SW_Sound.asm` — sound CPU main program (timing, dispatch)

Define authentic SFX for: laser fire, enemy fire, explosion (TIE + turret), terrain scrape, phase complete.

### 3. **Build shell/audio.ts Module**
Mirror `tempest/src/shell/audio.ts` structure:
- **SOUNDS manifest** — logical name (fire, enemyDeath, etc.) → `.wav` filename
- **createAudioEngine()** factory — returns:
  - `resume()` — initialize AudioContext lazily (on first user gesture)
  - `play(name: SoundName)` — play a loaded sample once
  - `ready(): boolean` — true once at least one sample has decoded
- **Fetch + decode samples** — load from `arcade-assets.slabgorb.com/star-wars/sfx/` (R2 hosted)
- **Graceful degradation** — all failures (no WebAudio, blocked autoplay, failed fetch, undecodable sample) degrade silently; game runs without sound.

**Constraint:** audio module is SHELL (IO) only; must NOT import from core or touch game logic.

### 4. **Wire Events → Audio in shell/loop.ts**
In the main game loop (after each `stepGame` call):
- Drain `state.events` and dispatch to audio engine
- Clear events after dispatch for next frame

### 5. **Speech Synthesis (TMS5220) — Scoped Decision**
**Open decision per epic-8:** synthesize LPC directly from `Speech*.asm` vs. bake to audio assets.

**Recommended approach for v1:** Bake speech to WAV asset (like SFX). LPC data in `reference/disasm/sound/Speech1.asm` … `Speech23.asm` encodes voice lines ("Use the Force, Luke," "Red 5 standing by," etc.). Extract LPC coefficients and feed to WebAudio-compatible decoder, or use pre-baked `.wav` from online references (nmikstas/star-wars-arcade-audio repo).

**For now:** Plan the LPC decode step; if baked `.wav` exists online, import it; otherwise defer live LPC synthesis to future story. Document decision and discovery in session file Findings.

### 6. **Storage Strategy**
- **Star-wars SFX assets:** hosted on `arcade-assets.slabgorb.com/star-wars/sfx/` (R2)
- **Build-time artifacts:** `star-wars/tools/pokey-bake/out/` — gitignored (not committed)
- **Source of truth:** `sfx-data.mjs` (register sequences) — IS committed

### 7. **Testing Strategy**
- **Unit tests (core):** Verify audio-event emission. Use fixed RNG seed so event stream is deterministic. Test fire, collisions, phase transitions emit expected events.
- **Integration test (shell):** Verify audio engine initializes, loads samples, plays without throwing. Manual: run dev server, trigger gameplay, hear SFX.

## Acceptance Criteria

1. **Core emits audio events** — GameState.events includes fire/enemy-fire/enemy-death/player-death/level-clear/player-spawn for Wave-1 gameplay moments. Unit tests verify with fixed RNG seed.

2. **Pokey-bake tooling ported** — `star-wars/tools/pokey-bake/` with bake-sfx.mjs, sfx-data.mjs, vendor/pokey.js, .gitignore. Running `node tools/pokey-bake/bake-sfx.mjs` renders ≥3 SFX to `.wav` without errors.

3. **shell/audio.ts module created** — Implements createAudioEngine() with resume(), play(name), ready(). Loads SOUNDS manifest. Handles R2 fetch failures gracefully. Supports lazy AudioContext init. No errors when WebAudio unavailable.

4. **Events wired to audio in shell/loop.ts** — Loop drains state.events each frame and calls audioEngine.play() for each audio-bearing event. state.events cleared after dispatch.

5. **Dev server runs without audio errors** — `npm run dev` boots; clicking/key-pressing triggers gameplay; audio plays (or degrades silently if WebAudio unavailable or assets unfetched). No console errors from audio module.

6. **Speech/TMS5220 decision logged** — If LPC synthesis deferred, session file documents chosen approach (bake vs. synthesize) and online source reference (nmikstas/star-wars-arcade-audio, MAME driver, etc.).

7. **Branch clean, tests pass** — No debug code, no console.log() clutter. `npm test` passes. Core tests verify audio-event emission.

## Scope

- **In scope:** audio event emission from core, POKEY bake tooling, shell audio module, event wiring, speech/TMS5220 scoping.
- **Out of scope:** live LPC synthesis (deferred if no baked asset), music sequencer, multi-channel stereo panning (future enhancement).

---

_Context prepared by sm-setup. Based on epic-8.md, tempest/src/shell/audio.ts pattern, and reference/disasm/sound/ materials._
