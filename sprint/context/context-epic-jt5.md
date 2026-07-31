# Epic jt5 Context

## Title
Joust audio — the sound subsystem joust shipped without

## Overview
joust has no audio module at all: no src/shell/audio.ts, no core/events.ts event channel, no dispatch, and nothing under an arcade-assets joust prefix. Unlike centipede, joust carries no in-source note deferring it, so this epic is also the record that the gap is known. AMENDED 2026-07-31 AFTER THE MONOREPO MIGRATION: this epic was written when joust was the fleet's outlier for consuming NOTHING from @arcade/shared, and its first story's job was to rule on whether joust adopts the shared engine or stays standalone. The 2026-07-30 collapse ANSWERS that question by dissolving it — there is no package boundary left. src/shared/ is in-tree, reached as @shared/audio through an alias declared in vite.config.ts, vitest.config.ts and tsconfig.json; there is no pin, no git-URL dependency and no version-bump ceremony. Adopting the shared engine is now the default and costs an import line. The house pattern the three sibling games share still stands: a SOUNDS manifest mapping logical name to baked filename, a CHANNELS map giving each cue its own voice-stealing channel, a base URL under arcade-assets.slabgorb.com, a pure core/events.ts union the sim emits as DATA (never callbacks, so the core stays deterministic), and a shell/audio-dispatch.ts switch with a never exhaustiveness guard. Joust is a Williams machine, not an Atari one, so the sound ground truth is a different quarry from the five vector games — establishing what JOUSTRV4.SRC and its sound board actually provide is the first story's job, not an assumption to inherit. THE ACCEPTANCE TEST FOR ANY ASSET STORY IN THIS EPIC IS A LIVE 200, NOT A GREEN VITEST: the shared engine degrades silently at every failure path by design, so a 404 is indistinguishable from working code, and there is no automated upload path for the arcade-assets bucket.

## Metadata
- **Epic ID:** jt5
- **Repo:** arcade

## Background

### ⚠ One correction to the Overview above (measured 2026-07-31 during jt5-1 setup)

The Overview is generated from `sprint/epic-jt5.yaml`. Its post-migration amendment is **current and
correct** — the shared-vs-standalone question really is dissolved, and `@shared/audio` really is one
import line. One factual claim in it is wrong, and it is the one that tells a story which game to copy.

**"the house pattern the three sibling games share" — wrong count, and the trio it implies is wrong.**
Measured across `plugins/*/src/`:

| game | `core/events.ts` | `shell/audio.ts` | `shell/audio-dispatch.ts` |
|------|---|---|---|
| tempest | ✅ | ✅ | ✅ |
| asteroids | ✅ | ✅ | ✅ |
| battlezone | ✅ | ✅ | ✅ |
| red-baron | ✅ | ✅ | ✅ |
| star-wars | ✅ | ✅ | ❌ — dispatches **inline in `main.ts`** |
| centipede | ❌ | ❌ | ❌ — in flight as cp5-1 |
| joust | ❌ | ❌ | ❌ — **this epic** |

**FIVE** games have walked this path and **FOUR** carry the complete three-piece pattern.
star-wars is the one that does not, and `plugins/battlezone/src/shell/audio-dispatch.ts:1-9` names it
as the deliberate anti-pattern in its own header: *"tempest's audio-dispatch extraction, deliberately
NOT star-wars's inline-in-main.ts switch, so the map is unit-testable against a recording fake without
booting a canvas."* **Copy tempest or battlezone. Do not copy star-wars's wiring.**

### Guardrails that carry across every story in this epic

- **A LIVE 200 is the acceptance test for any ASSET story, never a green vitest.** Restated from the
  Overview because it is the epic's most important rule: `@shared/audio` degrades silently at every
  failure path by design — absent WebAudio, blocked autoplay, failed fetch and undecodable sample all
  leave the game quiet and never throw. A 404 is therefore **indistinguishable from working code** in
  the test suite. star-wars music was wired and silently absent in production for months for exactly
  this reason. There is no automated upload path: CI deploys each app's `dist/` only, so samples go up
  by hand with `wrangler r2 object put --remote` (bucket `arcade`, not `arcade-assets`) and must be
  `curl`-verified.
- **jt5-1 is the exception that proves it:** it ships the seam and **no samples at all**, so it is the
  one story in the epic that cannot be blocked on asset production — and equally, a green jt5-1 must
  **not** be read as "joust has sound." joust is still silent when jt5-1 closes.
- **`@shared/audio` needs no work.** `src/shared/audio.ts` already exports `createAudioEngine()` →
  `play` / `startLoop` / `stopLoop` / `resume` / `ready`, and `AudioManifest` with
  `baseUrl` / `masterGain` / `sounds` / `channels`. Sustained cues are a `startLoop`/`stopLoop` pair,
  never repeated one-shots. Post-collapse there is no subpath export, no version pin and no bump
  ceremony.
- **joust's `@shared` count is 0 and this epic changes that.** Measured 2026-07-31: battlezone 13,
  star-wars 11, tempest 10, asteroids 10, red-baron 8, centipede 5, **joust 0**. joust's first shared
  import lands in this epic. No test guards the zero (checked), but
  `plugins/joust/README.md:112-121` asserts both the zero *and* that the adoption ruling is still
  open — that prose goes false and is in scope for whichever story lands the import.
- **Williams, not Atari — and the quarry is present.** `reference/williams-source/joust/` holds
  `JOUSTRV1–4.SRC` plus ~47 further files (`ATT.SRC`, `BUZZARD.SRC`, `CLIFF.SRC`, …). The five vector
  games' POKEY lineage does not carry over and neither does centipede's. joust also runs a live
  citation gate — `plugins/joust/docs/rom-study/claims/` holds 28 claim files and the checker refuses
  to pass over an empty set — so a cue claiming ROM authenticity registers there, and a cue that is an
  invention must say so explicitly rather than be left ambiguous.
- **There is no "step result" in joust.** `plugins/joust/src/core/game.ts:374` is
  `stepGame(game: GameState, inputs?): GameState` — it returns a bare state. Events ride as a **field
  on the returned state** (the asteroids precedent), not as a second member of a returned pair. Story
  descriptions in this epic that say "emitted as data on the step result" mean this; none of them is a
  licence to change `stepGame`'s signature.

---
_Generated by `pf context create epic jt5` from the sprint YAML._
