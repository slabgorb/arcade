# Shared synthesis host — extraction design (`@arcade/shared/synth`)

**Story:** SH2-18 · **Epic:** SH2 (shared render/audio surface) · **Author:** Architect · **Date:** 2026-07-12
**Sibling design:** [`2026-07-11-shared-audio-extraction-design.md`](./2026-07-11-shared-audio-extraction-design.md) (`/audio`, the SAMPLE player)

---

## 1. Context

Two cabinets synthesise their sound at runtime instead of playing `.wav` samples:

- **battlezone** (`bz1-11`) — POKEY voices mixed with DISCRETE analog circuits (engine rumble,
  cannon report, explosion). No ROM register data to bake; every sound is oscillators + filtered noise.
- **red-baron** (`rb2-11`) — a POKEY envelope-table driver (ROM-verified data in `pokey.ts`) PLUS a
  discrete analog board (gun, explosion, hum, approach whine) whose timbre is not in the source at all.

`SH2-17` already established these cannot migrate onto `@arcade/shared/audio`: that engine is a
sample/`.wav` buffer player and **cannot host oscillator synthesis**. Battlezone was formally DESCOPED
from SH2-17 for exactly this reason. The two are **siblings, not replacements**.

So both games hand-wrote the WebAudio *substrate* — context bootstrap, gesture gate, silent-degrade,
noise buffers, voice bookkeeping. A second synthesis cabinet now proves the duplication is real, which
is the bar CLAUDE.md sets for extraction.

### The finding: it is not two copies, it is THREE — at three different levels of hardening

Auditing the substrate rather than trusting the story title turned up something worse than duplication.
The same ~40 lines exist three times, and **the bug fixes never propagated between them**:

| | close half-built ctx on failure | closed-context guard | no-throw contract |
|---|---|---|---|
| **red-baron** `src/shell/audio.ts` | ✅ (review round 1) | ✅ `live()` | ✅ `guard()` |
| **shared `/audio`** `src/audio.ts` (SH2-16) | ❌ orphans a live `AudioContext` | ❌ | partial (`try` in `resume` only) |
| **battlezone** `src/shell/audio.ts` | ❌ no `try`/`catch` at all | ❌ | ❌ |

Verified mechanically, not by eye:

- `resolveContextCtor()` — **byte-identical**, battlezone `audio.ts:61-65` vs red-baron `audio.ts:165-169`.
- `noiseBuffer()` — **byte-identical**, battlezone `audio.ts:86-92` vs red-baron `audio.ts:214-220`.
- `grep -E "closed|guard|try|catch" battlezone/src/shell/audio.ts` → **no matches.**
- Master gain is `0.8` in both.

### Why battlezone's gap is a latent FREEZE, not merely silence

`battlezone/src/main.ts:153-154` pumps `playEventSounds` / `updateContinuousSounds` from inside
`stepFrame`, which `createLoop` invokes at `arcade-shared/src/loop.ts:73` — **above** the
`raf = requestAnimationFrame(frame)` re-schedule on line 76, which is not wrapped in `try`/`catch`.

Battlezone's `play()` / `setEngine()` call `createOscillator()` / `createGain()` / `createBufferSource()`
with no guard. Those throw `InvalidStateError` **synchronously** on a CLOSED context — and a browser
will close one out from under you (iOS reclaiming audio under memory pressure, a long-backgrounded tab).

The exception escapes `stepFrame` → escapes `frame()` → line 76 never runs → **the rAF chain dies.**
The game does not go quiet. It *freezes*: render, input, everything. Red-baron's `audio.ts:24-35` header
documents this failure exactly, because its review round 1 caught it. Battlezone never received the fix.

**This reframes SH2-18.** It is not a tidy-up that removes duplicate lines. It is *the propagation of a
hardening fix that got stranded in one repo*, which happens to also remove duplicate lines. The
duplication is not the disease — it is the symptom. The disease is that there is no single place for
this class of fix to live.

### Guiding principle — share the VERB, not the NUMBERS

House rule, carried from `/font`, `/glow`, `/audio`:

> Ship the **verb** — context bootstrap, gesture gate, silent-degrade, closed-context guard, noise,
> voice bookkeeping. Keep the **numbers** — every oscillator, filter, cutoff, envelope and ROM seam —
> **local to each cabinet.**

Battlezone's `engineParams` (40→120 Hz rumble) and red-baron's `engineHumParams` (ROM divisors `$F8`/`$F7`,
detuned so the voices beat) are *the games*. They must never migrate into shared code. Neither must
red-baron's POKEY tables or battlezone's saucer warble. What migrates is only the plumbing that keeps a
browser from killing the frame loop.

---

## 2. Goals / Non-goals

**Goals**

- **G1.** One hardened WebAudio synthesis substrate, published as `@arcade/shared/synth`.
- **G2.** battlezone + red-baron both adopt it; each cabinet's hand-rolled context lifecycle is **deleted**.
- **G3.** Battlezone inherits the no-throw contract, the closed-context guard, and the half-built-context
  close — i.e. **the latent freeze above is fixed** as a consequence of adopting.
- **G4.** Every sound stays **audibly identical** in both games. No timbre, pitch, gain or envelope moves.

**Non-goals**

- **N1.** Merging `/synth` with `/audio`. Sample playback and oscillator synthesis are different engines.
  They remain siblings. (They *may* later share an internal context bootstrap — see §9.)
- **N2.** A modular-synth config DSL. We are not inventing a declarative language for oscillator graphs;
  see §4 for why a manifest-driven engine is the wrong shape here.
- **N3.** Porting either game's sounds to samples, or changing any tuned parameter.
- **N4.** tempest / star-wars / asteroids. They are sample players on `/audio` and are untouched.
- **N5.** red-baron behaviour change of any kind — it already has every fix; for it this is pure dedup.

---

## 3. Charter — a BROWSER subpath, behind the purity guard

`/synth` touches `AudioContext`, a browser global. Per **ADR-0003** it is a **browser subpath**:

- Added to `BROWSER_SUBPATHS` in `arcade-shared/tests/purity.test.ts:46` — joining `esc-overlay`, `glow`,
  `view`, `audio`.
- It **must never** be added to `PURE_SUBPATHS`. The guard's own comment (`purity.test.ts:45`) already
  names `AudioContext` as the reason `/audio` is browser-flagged; `/synth` is the same case.

---

## 4. Module design — `@arcade/shared/synth`

### 4.1 Why a HOST, not an engine

`/audio` is manifest-driven: `createAudioEngine({ sounds, channels, baseUrl })`. That works because every
sample player does *the same verb* — fetch a file, play it on a channel.

Synthesis is not like that. The two cabinets' public interfaces genuinely differ:

- battlezone: `play(SoundName)`, `startLoop(LoopName)`, `stopLoop(LoopName)`, `setEngine(throttle: number)`, `stopEngine()`
- red-baron: `play(OneShot)`, `playTone(ToneName)`, `setEngine(on: boolean)`, `setGun(firing: boolean)`, `setApproach(distance: number)`

These are not the same verb set, and `setEngine` does not even take the same *type*. Forcing them into one
manifest would mean either a lowest-common-denominator API that fits neither, or a config language for
oscillator graphs — inventing a modular synth. That is precisely the over-engineering the reuse-first
mandate forbids.

**The duplication is in the SUBSTRATE, not in the sound design.** So we ship the substrate and let each
game keep its own `createAudioEngine()` and its own public interface. The game stops hand-rolling the
context lifecycle; it does not stop being itself.

### 4.2 The surface

```ts
// @arcade/shared/synth — browser subpath (ADR-0003)

/** A live audio graph to build into. */
export interface SynthTarget {
  readonly context: AudioContext
  /** The master gain — connect every voice here, never to destination directly. */
  readonly out: GainNode
}

/** A running sustained voice: everything to tear down when it is silenced. */
export interface Voice {
  readonly stop: () => void
}

export interface SynthHost<N extends string = string> {
  /** Build (once) and unlock the context. Idempotent — wire it to any gesture. */
  resume(): void

  /**
   * THE core verb — every public method of a game's engine runs its graph-building
   * inside this. A Web Audio effect against a live context, where:
   *   - no context yet (pre-gesture) -> no-op
   *   - context CLOSED (iOS reclaim) -> no-op
   *   - the effect THROWS            -> swallowed
   * Sound may die; the frame loop never does.
   */
  withAudio(effect: (t: SynthTarget) => void): void

  /** Sustained named voices. `start` is idempotent (a repeat start while running is
   *  a no-op); `stop` is harmless when the voice was never started or is pre-gate. */
  start(name: N, build: (t: SynthTarget) => Voice): void
  stop(name: N): void

  /**
   * Persistent, re-parameterised voices — the hum, the approach whine. Built ONCE on
   * first use after the gate opens, then handed back so the caller can retune it every
   * frame. Returns null pre-gate, on a closed context, or if `build` throws.
   */
  ensure<T>(name: N, build: (t: SynthTarget) => T): T | null
}

/** Master gain defaults to 0.8 — the value BOTH cabinets independently chose. */
export function createSynthHost<N extends string = string>(
  opts?: { masterGain?: number },
): SynthHost<N>

/** White noise — the raw material of every analog one-shot. Byte-identical in both games today. */
export function noiseBuffer(context: AudioContext, seconds: number): AudioBuffer
```

**Six exports. Every one has two proven consumers** — no speculative surface:

| Export | battlezone | red-baron |
|---|---|---|
| `resume()` (gate + bootstrap + leak fix) | ✅ (gains the hardening) | ✅ |
| `withAudio()` (closed-ctx + no-throw) | ✅ **(the freeze fix)** | ✅ (has it as `live`+`guard`) |
| `start` / `stop` | ✅ saucer, track loops | ✅ gun |
| `ensure` | ✅ engine hum | ✅ engine hum, approach whine |
| `noiseBuffer` | ✅ byte-identical | ✅ byte-identical |
| `masterGain: 0.8` default | ✅ | ✅ |

Deliberately **omitted** as YAGNI, since no consumer needs them today: `isRunning()` (both games' liveness
checks collapse into `start`'s idempotency), `stopAll()`, and a `context()` accessor. `/audio` grew a
`context()` for star-wars' speech under SH2-17; `/synth` adds one only when a consumer proves it.

### 4.3 The hardened `resume()` — the fix being propagated

The bootstrap ships red-baron's version verbatim, because it is the only one that is correct:

1. Resolve the constructor (`AudioContext`, else Safari's `webkitAudioContext`); **no WebAudio → stay silent**, never throw.
2. Construct into a **local** `building` variable — *not* into `ctx`.
3. On any failure while wiring the master gain, **`close()` the half-built context** before discarding it.
   This is load-bearing: `resume()` is wired to **every** gesture, so a persistent fault would otherwise
   leak one live `AudioContext` per keystroke until the browser's cap starts rejecting new ones.
   Battlezone cannot leak (it has no `try` at all — it just dies); `/audio` **does** leak (`audio.ts:103-111`
   assigns `ctx = new Ctor()` and, on a `createGain()` throw, nulls the field while orphaning the context).
4. `void ctx.resume().catch(() => {})` — `resume()` **rejects** on a closed context; swallow it rather than
   surfacing an unhandled rejection.

### 4.4 What each cabinet DELETES vs KEEPS

**Deleted from both** (this is the dedup): `resolveContextCtor`, `noiseBuffer`, the `ctx` / `master` fields,
the `resume()` body, red-baron's `live()` + `guard()`, battlezone's `loops` Map, red-baron's `gun` /
`humGain` / `whineOsc` / `whineGain` nullable fields.

**Kept local — the numbers, untouched:**

- **battlezone:** `SoundName`, `LoopName`, its `AudioEngine` interface, `engineParams` (the 40→120 Hz
  throttle curve), `noiseBurst`, `saucerVoice`, `trackVoice`, and every cutoff/peak (`0.18`/`2200`/`0.9`;
  `0.9`/`700`/`1.0`).
- **red-baron:** `OneShot`, `ToneName`, its `AudioEngine` interface, `pokey.ts` **in full**, `gunStrobe`,
  `explosionLevel`, `approachWhine`, `engineHumParams`, `audfToHz`, `audcToGain`, `POKEY_CLOCK_HZ`,
  `pokeyTone`, `explosionBurst`, `gunVoice`, and every tuning constant.

Every ROM-verified fact stays in the cabinet that owns the ROM. Nothing in `/synth` asserts a ROM fact.

---

## 5. The behaviour change — stated plainly

SH2-17 was "behaviour-preserving throughout." **SH2-18 is not, for battlezone, and that is the point.**

- **What you HEAR: identical.** Same oscillators, same filters, same params, same `0.8` master. No sound
  changes in either game. This is the AC that must be manually verified in a playtest.
- **What happens when the browser pulls the rug: strictly better.** Battlezone gains the no-throw contract,
  the closed-context guard, and the half-built-context close. The latent frame-loop freeze in §1 is fixed.

**red-baron is pure dedup** — it already has every one of these fixes; nothing about its behaviour moves.

This asymmetry must be recorded as a **deviation** in the story's session file (Dev, implementation): the
epic's house rule is behaviour-preservation, and this story deliberately departs from it in one direction
(hardening) for one consumer (battlezone).

---

## 6. Testing strategy

**Shared package** (`arcade-shared/tests/synth.test.ts`, node + a fake `AudioContext` — reuse the existing
`tests/audio.test.ts` mock pattern):

1. **Gesture gate** — `createSynthHost()` constructs NO `AudioContext` at creation; `withAudio` is a silent
   no-op before `resume()`.
2. **Silent-degrade** — with no `AudioContext` global at all, `resume()` + every method no-op, never throw.
3. **Closed-context guard** *(the regression that matters)* — with `ctx.state === 'closed'`, `withAudio`
   no-ops and **does not throw**, even though the effect would call `createOscillator()`.
4. **No-throw contract** — an effect that throws is swallowed; the caller continues.
5. **Half-built close (leak)** — when `createGain()` throws during bootstrap, the half-built context's
   `close()` **is called**, and a second `resume()` does not retain the dead context.
6. **`resume()` rejection** — a rejecting `ctx.resume()` produces no unhandled rejection.
7. **Voice bookkeeping** — `start` is idempotent (second start does not build a second voice); `stop` on an
   unstarted name is harmless; `ensure` builds exactly once across repeated calls and returns the same handle.
8. **`noiseBuffer`** — mono, `sampleRate * seconds` frames, `length >= 1` for a zero/tiny duration.

**Both games:** existing `tests/shell/audio.test.ts` + `audio-dispatch.test.ts` stay green **unchanged** —
that is the audible-behaviour-preservation proof.

**Battlezone — the RED test that opens TDD:** a test asserting that `play()` / `setEngine()` against a
**closed** context do not throw. It must **FAIL on today's battlezone** (that is the bug), and pass after
adoption. This is the story's headline test; write it first.

**Purity guard:** `'synth'` added to `BROWSER_SUBPATHS`; the guard's assertion that pure subpaths carry no
DOM globals must still pass.

---

## 7. Packaging & release mechanics

Standard SH-epic publish→consume dance (see the `sh-epic-release-coupling` and
`npm-git-dep-repin-stale-lockfile` traps):

1. `arcade-shared`: add `src/synth.ts`, an `"./synth"` entry in the `exports` map (`types` + `import`), the
   build entry, and `'synth'` in `BROWSER_SUBPATHS`. Currently at **v0.12.0** → this ships **v0.13.0**.
2. Both cabinets pin the **feature branch** during the dev inner loop. When re-pinning a git dep, a plain
   `npm install` keeps the OLD commit — force re-resolution:
   `npm install @arcade/shared@github:slabgorb/arcade-shared#<ref>`.
3. Merge the shared branch with **NO `--delete-branch`**; do not delete it until `v0.13.0` is tagged and
   both cabinets' pins are bumped to the tag.

---

## 8. Phasing

The epic's house pattern splits publish from consume (SH2-2 → SH2-4/5/6; SH2-16 → SH2-17). With only **two**
consumers and a small surface, **SH2-18 stays one story (5 pts)**, ordered internally:

1. **RED** — battlezone's closed-context freeze test (fails today).
2. Publish `/synth` + its unit tests; purity guard; v0.13.0.
3. Adopt in **red-baron** first — it is the *source* of the hardened code, so its adoption is the pure
   behaviour-preserving move and proves the surface fits without confounding it with a bug fix.
4. Adopt in **battlezone** — the RED test goes green.
5. Playtest both cabinets: every sound audibly unchanged.

Split into publish/consume only if step 2 runs hot.

---

## 9. Follow-on — the third copy (`/audio`)

**Out of scope here, but it must not be lost:** `arcade-shared/src/audio.ts:57` carries its own
`getAudioContextCtor()` and its own bootstrap, **including the half-built-context leak** (`audio.ts:103-111`).
So after SH2-18 the cabinet still has *two* context bootstraps — one hardened (`/synth`), one leaky
(`/audio`) — inside the same package.

Filed as **SH2-20: `/audio` adopts the shared synth context bootstrap** (3 pts, `depends_on: SH2-18`) — an
internal refactor with no public API change, killing the third copy and its leak. Held out of SH2-18 because
`/audio` is consumed by two *shipped* games (star-wars, asteroids) and that regression risk should not ride
along with a synthesis story.

---

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Fake-`AudioContext` mock does not model `state: 'closed'` throwing | Extend the existing `/audio` mock so factory methods throw `InvalidStateError` when closed — otherwise test 3 is **vacuous** and proves nothing. |
| Adoption silently changes a sound | Every tuned constant stays in the game file, moved by no one; existing game audio tests stay green unchanged; manual playtest is an AC. |
| `ensure`'s generic handle is loosely typed internally | Store persistent handles in their own map, separate from `Voice`s; document that a name belongs to one kind or the other. |
| Stale git-dep pin silently keeps the old shared commit | `npm install @arcade/shared@github:…#<ref>` (never a bare `npm install`); verify the resolved commit in the lockfile. |

---

## 11. Proposed acceptance criteria (for the sprint YAML)

1. `@arcade/shared/synth` exports `createSynthHost`, `SynthHost`, `SynthTarget`, `Voice`, and `noiseBuffer`;
   it is registered as a **browser** subpath in the purity guard and is **never** added to `PURE_SUBPATHS`.
2. The shared host's node tests cover: gesture gate, silent-degrade with no `AudioContext`, **closed-context
   no-op that does not throw**, swallowed throwing effect, half-built-context `close()` on bootstrap failure,
   swallowed `resume()` rejection, idempotent `start` / harmless `stop` / build-once `ensure`, and `noiseBuffer`
   shape. The closed-context mock must actually throw from its factory methods (no vacuous assertion).
3. battlezone and red-baron each build their engine on `createSynthHost()`; `resolveContextCtor`, `noiseBuffer`,
   the `ctx`/`master` fields, the `resume()` body, red-baron's `live()`+`guard()`, and both games' nullable
   voice fields / loop Map are **deleted** from the game repos. Every oscillator, filter, cutoff, envelope and
   ROM seam (incl. red-baron's `pokey.ts`) stays **local and unchanged**.
4. A battlezone test proves `play()` / `setEngine()` against a **closed** context do not throw — failing before
   adoption, passing after. (The latent frame-loop freeze: `main.ts:153-154` runs above `loop.ts:76`'s rAF
   re-schedule.) The behaviour change is logged as a deviation in the session file.
5. Both cabinets' existing `audio.test.ts` + `audio-dispatch.test.ts` pass **unchanged**; vitest + `vite build`
   green in both; a manual playtest confirms every sound is audibly identical in both games.
6. `arcade-shared` ships **v0.13.0**; both cabinets pin the tag (re-resolved, not a stale lockfile); the shared
   feature branch survives until both pins are bumped.
