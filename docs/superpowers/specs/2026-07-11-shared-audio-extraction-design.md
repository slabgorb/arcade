# Shared audio engine — extraction design (`@arcade/shared/audio`)

Status: accepted (brainstorm 2026-07-11) · Owner: Architect · Consumers: tempest,
star-wars, asteroids, battlezone · Home epic: **SH2** (SH2-16 library, SH2-17 extract)

## 1. Context

Four of the five canvas games ship a near-identical shell-side WebAudio SFX
engine, hand-written four times:

| Game | Audio | Shape |
|------|-------|-------|
| tempest | `shell/audio.ts` (221) + `audio-dispatch.ts` (90) | reference impl — channels/voice-stealing, `startLoop`/`stopLoop` |
| star-wars | `shell/audio.ts` (198) | **superset** — also loads TMS5220 LPC **speech** (`speak()`, 23-line catalogue) |
| asteroids | `shell/audio.ts` (244) + `audio-dispatch.ts` (67) | **variation** — buffers keyed by *file* (`SampleId`), several names → one `.wav` |
| battlezone | `shell/audio.ts` (242) + `audio-dispatch.ts` (102) | mirrors tempest |
| red-baron | none (POKEY sound is unbuilt rb2 work) | — (out of scope) |

The duplicated mechanism is substantial and identical: `getAudioContextCtor()`
(covering the `webkitAudioContext` prefix), the `createAudioEngine()` factory
returning `{ resume, play, startLoop, stopLoop, ready }`, lazy-context-on-gesture,
silent-degrade at every failure, a master `GainNode`, buffer loading/decoding, and
POKEY-style channel/voice-stealing (`stopChannel`/`startSource`/`onended`). This is
the fourth real proof of duplication — the ADR-0001 eligibility bar is met.

### Guiding principle — share the VERB, not the NUMBERS

Per ADR-0003 (established for `glow`/`view`): the shared module carries the
identical *mechanism*; each cabinet keeps its own *constants*. For audio the VERB
is the engine above; the NUMBERS are the `SOUNDS` manifest, `CHANNELS` map,
`baseUrl`, and `masterGain`. The shared primitive is a **superset** that absorbs
each game's divergence rather than flattening it.

## 2. Goals / Non-goals

**Goals**

- One `@arcade/shared/audio` browser subpath every game constructs from a manifest.
- Preserve each game's exact sound set, channel map, and audible behaviour.
- Preserve per-game compile-time `SoundName` typing at the consumer.
- Delete the four hand-written engine bodies; keep per-game manifests + dispatch.

**Non-goals (YAGNI)**

- **Speech stays game-side.** Only star-wars has TMS5220 LPC speech; it is a
  distinct subsystem (larger samples, separate base URL, lazy load, `speak()`).
  The shared module is the SFX engine only. No speculative speech generality.
- **`audio-dispatch.ts` stays game-side.** Mapping `GameEvent`s → `engine.play`
  calls is game-specific wiring, not shared mechanism.
- **No new sounds, no mixing/ducking/spatialization.** Behaviour-preserving only.
- **red-baron is untouched** — it has no audio yet.

## 3. Charter — browser subpath behind the purity guard

`@arcade/shared/audio` touches `AudioContext` (a browser global), so it is a
**browser** subpath like `glow`/`view`/`esc-overlay` — NOT pure core. The source-
regex purity guard (`tests/purity.test.ts`) is extended to recognise `audio` as an
exempt browser subpath; the pure core (`math3d`/`rng`/`highscore`/`loop`/`font`)
must still fail on any DOM reference.

## 4. Module design — `@arcade/shared/audio`

```ts
export interface AudioEngine<N extends string> {
  // Create/resume the AudioContext and begin loading. Safe to re-call (only the
  // first does work). No-op until called, and forever if WebAudio is absent.
  resume(): void
  play(name: N): void       // one-shot; steals its channel
  startLoop(name: N): void  // sustained loop on its channel
  stopLoop(name: N): void   // stop the loop sounding on name's channel
  ready(): boolean          // true once >= 1 sample has decoded
}

export interface AudioManifest<N extends string> {
  baseUrl: string
  masterGain?: number             // default 0.4
  sounds: Record<N, string>       // logical name -> filename   (per-cabinet NUMBERS)
  channels: Record<N, string>     // logical name -> channel     (per-cabinet NUMBERS)
}

export function createAudioEngine<N extends string>(
  manifest: AudioManifest<N>,
): AudioEngine<N>
```

**Generic over `N`.** Each game keeps `const SOUNDS = {...} as const; type SoundName
= keyof typeof SOUNDS` and passes it, so `play()` stays typed. arcade-shared's own
tests are untyped (vitest strips types), so the generic contract is **validated at
the consumer** — which is precisely why SH2-16 re-points tempest: tempest's
`tsc --noEmit` build exercises the generic against a real manifest.

### 4.1 Absorbing the asteroids `SampleId` variation (superset, not a mode)

The engine keys its internal buffer store by **filename**, resolving
`name → file → buffer` at play time. Multiple logical names mapping to one `.wav`
(asteroids' case) therefore fetch/decode once and both resolve — with the same
`sounds: Record<name, filename>` manifest shape tempest uses 1:1. asteroids' bespoke
`SampleId` indirection is deleted; no asteroids-specific branch enters the shared code.

### 4.2 star-wars speech (deferred to SH2-17)

star-wars keeps its speech subsystem (`speak()` + LPC catalogue + lazy loader) in
its own shell. If speech needs to share the gesture-unlocked `AudioContext`, the
engine gains a minimal **read-only** `context(): AudioContext | null` accessor so
the game can piggyback on the same unlocked context rather than spinning a second
one. This accessor is added only if SH2-17 proves it necessary (star-wars proves
the extension point, the way tempest proved glow's gradient superset).

## 5. Testing strategy

- **Engine mechanics — fake `AudioContext`.** A stub context/gain/buffer-source
  asserts: lazy creation only on `resume()`; silent no-op before `resume()` and when
  WebAudio is absent; channel-stealing stops the prior source on retrigger;
  `startLoop` sets `loop`; `stopLoop` stops it; every failure path degrades silently
  (no throw). Node env — no real WebAudio.
- **File-keyed resolution.** A manifest with two names → one file asserts a single
  decode and correct `name → file → buffer` resolution (the asteroids case).
- **Purity guard.** `audio` recognised as browser subpath (exempt); pure core still
  fails on DOM references.
- **Per-game parity.** Manual run per cabinet — SFX, loops, and voice-stealing
  unchanged; star-wars speech still fires.

## 6. Packaging & release mechanics

Standard arcade-shared flow (per the extraction playbook): add the `./audio`
subpath to `package.json` `exports` + the `prepare`/build; push the feat branch so
games can resolve the git-URL dep; games pin a provisional ref during the story,
then a tag+version bump at release. tempest re-points in SH2-16; the other three in
SH2-17.

## 7. Phasing (two stories under SH2)

- **SH2-16 — Library:** stand up `@arcade/shared/audio` + purity-guard extension +
  fake-context tests, then re-point **tempest** (delete engine body, keep manifest +
  `audio-dispatch.ts`). Ships validated by a real consumer.
- **SH2-17 — Extract:** migrate **star-wars, asteroids, battlezone**. asteroids drops
  `SampleId`; star-wars keeps speech (adds `context()` if needed); battlezone mirrors
  tempest. Behaviour-preserving.

## 8. Risks & mitigations

- **Losing typed `SoundName`.** Mitigated by the generic + tempest's build check
  (SH2-16); do not collapse to `Record<string,string>`.
- **star-wars two-context waste / speech regression.** Mitigated by the optional
  `context()` accessor and a speech-still-fires manual check in SH2-17.
- **Silent-degrade regressions.** The whole point of the engine is that every
  failure path is a no-op; the fake-context test pins each path explicitly.
- **arcade-shared untyped tests.** Pin contracts at runtime / via source-regex, never
  compile-only annotations (known arcade-shared constraint).

## 9. Open items to confirm during planning

- Exact `masterGain` per game (tempest 0.4; confirm the others as NUMBERS).
- Whether any game relies on eager-vs-lazy load timing differences worth preserving.
- Final decision on the `context()` accessor — add in SH2-17 only if star-wars needs it.
