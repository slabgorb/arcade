# Epic cp5 Context

## Title
Centipede audio — the sound subsystem centipede shipped without

## Overview
centipede has no audio module at all: no src/shell/audio.ts, no core/events.ts event channel, no dispatch, and nothing under the arcade-assets centipede prefix. The game has been playable and silent since it shipped. The gap is deliberate and already named in the source — src/core/bonus.ts:32 records that CENTI4.MAC:1994-1995 (LDA I,17. / STA CHAN4, 'BONUS LIFE SOUND') is 'DEFERRED to cp5 with the rest of the audio, and deliberately not stubbed — an empty hook would be dead code pretending to be a seam', which is why this epic carries the id cp5. Three sibling games have already walked this path and are the reference, not a re-derivation: tempest, star-wars and asteroids each define a SOUNDS manifest (logical name to baked filename), a CHANNELS map giving each cue its own POKEY-style voice-stealing channel, a DEFAULT_BASE_URL under arcade-assets.slabgorb.com, a pure core/events.ts union the sim emits as DATA, and a shell/audio-dispatch.ts switch with a never exhaustiveness guard so adding an event kind without a cue is a compile error. All three consume the shared audio engine. POST-MIGRATION (2026-07-30): that engine is no longer a package — it is src/shared/audio.ts in this repo, imported as @shared/audio through an alias declared in vite.config.ts, vitest.config.ts and tsconfig.json. There is no subpath export to add, no pin to bump and no dist/ to build; centipede already imports @shared/rng, @shared/highscore, @shared/loop and @shared/name-entry the same way. THE ACCEPTANCE TEST FOR ANY ASSET STORY IN THIS EPIC IS A LIVE 200, NOT A GREEN VITEST. The shared engine degrades silently at every failure path by design — no WebAudio, blocked autoplay, failed fetch, undecodable sample all leave the game quiet and never throw — so a 404 is indistinguishable from working code. star-wars music was wired and silently absent in production for months for exactly this reason. There is no automated upload path for the arcade-assets bucket: CI deploys each app's dist only, so samples are placed by hand with wrangler r2 object put --remote and must be curl-verified.

## Metadata
- **Epic ID:** cp5
- **Repo:** arcade

## Background

### ⚠ Two corrections to the Overview above (measured 2026-07-31 during cp5-1 setup)

The Overview is generated from `sprint/epic-cp5.yaml` and is stale in two places. Both propagate
into every story description in this epic, so read them before citing the Overview.

**1. "Three sibling games … tempest, star-wars and asteroids" — wrong trio, wrong count.**
Measured across `plugins/*/src/`:

| game | `core/events.ts` | `shell/audio.ts` | `shell/audio-dispatch.ts` |
|------|---|---|---|
| tempest | ✅ | ✅ | ✅ |
| asteroids | ✅ | ✅ | ✅ |
| battlezone | ✅ | ✅ | ✅ |
| red-baron | ✅ | ✅ | ✅ |
| star-wars | ✅ | ✅ | ❌ — dispatches **inline in `main.ts`** |

**FIVE** games have walked this path and **FOUR** carry the complete three-piece pattern the epic
describes. star-wars is in the Overview's list of references but is the one that does **not** have
the dispatch module — and `plugins/battlezone/src/shell/audio-dispatch.ts:1-9` names it as the
deliberate anti-pattern in its own header: *"tempest's audio-dispatch extraction, deliberately NOT
star-wars's inline-in-main.ts switch, so the map is unit-testable against a recording fake without
booting a canvas."* **Copy tempest or battlezone. Do not copy star-wars's wiring.**

**2. `src/core/bonus.ts:32` is off by one.** The line that NAMES the cue is
`plugins/centipede/src/core/bonus.ts:31`; `:32` is the continuation *"It is DEFERRED to cp5 with the
rest of the audio, and deliberately not stubbed"*. The block any story should cite and rewrite is the
`─── THE ONE THING THAT IS *NOT* HERE ───` deferral banner at **`bonus.ts:30-35`**. (The Overview's
quotation of the ROM line itself is accurate.)

~~Minor: centipede imports **five** `@shared` modules, not the four listed — `rng`, `highscore`,
`name-entry`, `loop` and also `font`.~~
**RETRACTED (TEA, 2026-07-31) — the Overview was right and this "correction" was wrong.** Centipede
imports **four**: `rng`, `highscore`, `name-entry`, `loop`. The `@shared/font` hits that produced the
claim are all *negative* references (`src/shell/layout.ts:134` "NOT @shared/font", plus two assertions
in `tests/render.test.ts` that the import is absent). Measured with
`grep -rhoE "from '@shared/[a-z-]+'" plugins/centipede/src`. **`@shared/font` must not be added** —
`tests/render.test.ts:132` forbids it by epic ruling (score/level digits are ROM picture tiles).

### Guardrails that carry across every story in this epic

- **A LIVE 200 is the acceptance test for any ASSET story, never a green vitest.** Restated from the
  Overview because it is the epic's most important rule: `@shared/audio` degrades silently at every
  failure path by design — absent WebAudio, blocked autoplay, failed fetch and undecodable sample all
  leave the game quiet and never throw. A 404 is therefore **indistinguishable from working code** in
  the test suite. star-wars music was wired and silently absent in production for months for exactly
  this reason. There is no automated upload path: CI deploys each app's `dist/` only, so samples go up
  by hand with `wrangler r2 object put --remote` and must be `curl`-verified.
- **cp5-1 is the exception that proves it:** it ships the seam and **no samples at all**, so it is the
  one story in the epic that cannot be blocked on asset production — and equally, a green cp5-1 must
  not be read as "centipede has sound."
- **`@shared/audio` needs no work.** `src/shared/audio.ts:30-56` already exports `AudioEngine` with
  `play` / `startLoop` / `stopLoop` / `resume` / `ready` and `AudioManifest` with
  `baseUrl` / `masterGain` / `sounds` / `channels`. Sustained cues (the marching tick, the spider) are
  a `startLoop`/`stopLoop` pair, not repeated one-shots. Post-collapse there is no subpath export, no
  version pin and no bump ceremony — it is one import line.

---
_Generated by `pf context create epic cp5` from the sprint YAML._
