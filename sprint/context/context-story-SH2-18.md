# Story SH2-18 Context

## Title
Extract @arcade/shared/synth — the WebAudio SYNTHESIS engine skeleton (lazy gesture gate, no-throw contract, resolveContextCtor, noiseBuffer, voice bookkeeping) now that a SECOND synthesis cabinet proves the duplication: battlezone bz1-11 and red-baron rb2-11 hand-write byte-identical copies. DISTINCT from /audio (SH2-16), which is a SAMPLE/.wav buffer player and cannot host oscillator synthesis — the two are siblings, not replacements. Ship the VERB (context bootstrap + silent-degrade + closed-context guard), keep the NUMBERS (each cabinet's oscillators/filters/ROM seams) local. Adopt in battlezone + red-baron via the publish→release→repin dance.

## Metadata
- **Story ID:** SH2-18
- **Type:** refactor
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade-shared,battlezone,red-baron
- **Epic:** Shared render surface — extract font/glow/view/compositor into @arcade/shared and converge the cabinet on one vector treatment

## Background

### Key Distinction
`/synth` is DISTINCT from `/audio` (SH2-16), which is a SAMPLE/.wav buffer player and cannot host oscillator synthesis. They are SIBLINGS, not replacements. Do not merge or replace one with the other.

### Scope Rule
Ship the VERB (context bootstrap + silent-degrade + closed-context guard), keep the NUMBERS (each cabinet's oscillators/filters/ROM seams) LOCAL to each game.

### Cross-Repo Release Coupling (Critical)
- Consumers pin the arcade-shared FEATURE branch during the dev inner-loop (github:#ref pin), so the branch must live until a vX.Y.Z tag is cut and pins are bumped.
- Merge the arcade-shared PR with NO --delete-branch. Do not delete the feature branch.
- Changing a `github:...#ref` pin plus a plain `npm install` KEEPS THE OLD COMMIT. Must run `npm install <pkg>@#<ref>` to force re-resolve, or the lockfile silently stays stale.

### Repo Branching Notes
- arcade-shared, battlezone, and red-baron all default to `develop`; PRs target `develop`.
- Never touch a game's `main` (that is production, auto-deploys to R2).

## Problem

Two synthesis cabinets now hand-write the same WebAudio engine *architecture*:
`battlezone/src/shell/audio.ts` (242 lines, bz1-11) and `red-baron/src/shell/audio.ts`
(461 lines, rb2-11). A third would be pure waste, so the skeleton gets extracted now.

**Correct the story title's premise before you start.** It claims the two are
"byte-identical copies." They are not — verified by diff: 572 diff lines, no shared
contiguous region larger than 7 lines. Only ~13 lines are literally identical
(`resolveContextCtor`, the `noiseBuffer` body). This is a **same-architecture,
different-flesh** convergence, not a copy-paste dedupe. See Delivery Findings in the
session file.

**The two engines are not equals.** Red Baron's went through a review round battlezone
never had, and is strictly more evolved. Battlezone is missing the entire no-throw
contract:

| Mechanism | red-baron | battlezone |
|---|---|---|
| `live()` — a **closed** context counts as absent | ✅ rb L194-198 | ❌ absent |
| `guard()` — try/catch around every WebAudio effect | ✅ rb L205-211 | ❌ absent |
| try/catch on `new Ctor()`, `close()` the half-built ctx | ✅ rb L338-360 | ❌ bare (bz L184-191) |
| `.catch()` on `ctx.resume()` (a closed ctx **rejects**) | ✅ rb L365-367 | ❌ bare `void ctx.resume()` |

So **red-baron is the donor** and this is a **behavior change for battlezone, not a
refactor**: adopting the shared VERB hands battlezone a no-throw contract it lacks today.
That is the point, not a side effect. It matters at runtime — red-baron's suite documents
that `updateContinuousSounds()` runs inside `frame()` *above* the
`requestAnimationFrame(frame)` re-schedule, so an escaping audio exception freezes
rendering and input, not merely sound.

## Technical Approach

Mirror the `@arcade/shared/audio` (SH2-16) sibling exactly — it is the template, and its
header already states this story's doctrine ("share the VERB, not the NUMBERS").

1. **New subpath `@arcade/shared/synth`** — flat layout, one file per subpath:
   `arcade-shared/src/synth.ts` + `arcade-shared/tests/synth.test.ts` +
   `arcade-shared/tests/synth-source-rules.test.ts`. `tsconfig.build.json` already
   globs `src`, so a new file is picked up with no build change. Add the `exports`
   entry to `package.json` and bump the version.
2. **Port red-baron's implementation as the donor**, generalised. Battlezone's
   `Map<LoopName, LoopVoice>` voice bookkeeping is the more general form; red-baron's
   discrete nullable fields are a degenerate one-slot case. Generic over the game's
   sound-name union, config injected — same shape as `createAudioEngine<N extends string>`.
3. **Adopt in both games** via the publish→release→repin dance, then delete the
   duplicated skeleton from each `src/shell/audio.ts`, leaving the NUMBERS behind.

**VERB — extract (shared):** `resolveContextCtor()` (byte-identical, free win);
`noiseBuffer(context, seconds)` (byte-identical body, free win); the lazy
gesture-gated context bootstrap; `live()`; `guard()`; the `Voice { readonly stop: () => void }`
interface; voice bookkeeping (idempotent start/stop, no double-voice); the master
`GainNode` (`MASTER_GAIN = 0.8` — same number in both games; make it a config knob).

**NUMBERS — stay local (per game):**
- *battlezone:* `SoundName`/`LoopName` unions, `engineParams(throttle)`, `saucerVoice()`,
  `trackVoice()`, the cannon/explosion tuning tuples, `stopEngine()`, its `AudioEngine` interface.
- *red-baron:* the ROM-fact seams (`gunStrobe`, `explosionLevel`, `approachWhine`,
  `engineHumParams`), all POKEY math (`POKEY_CLOCK_HZ`, `audfToHz`, `audcToGain`), the
  tuning consts, its voice builders, all of `src/shell/pokey.ts`, its `AudioEngine` interface.

**Judgement call left to TEA/Dev (not pre-decided here):** bz's `noiseBurst` and rb's
`explosionBurst`/`gunVoice` build the *same* chain (noise → lowpass → gain envelope → master)
and differ only in envelope shape. A parameterised `noiseBurst(ctx, out, {seconds, cutoffHz, peak, envelope})`
is a defensible *fifth* VERB primitive, but the story's stated VERB list stops at `noiseBuffer`.
Decide explicitly and record it as a Design Deviation if you take it.

## Scope

**In scope**
- New `@arcade/shared/synth` subpath: source, tests, `exports` entry, version bump.
- Adoption in battlezone and red-baron; duplicated skeleton deleted from both.
- Repinning both consumers off the new ref (they are currently skewed: bz `#v0.13.1`,
  rb `#v0.12.0`, HEAD `0.13.2`).
- Upgrading battlezone's test fake to the rb-grade one so the new closed-context
  contract is actually provable there.

**Out of scope**
- Replacing or merging `@arcade/shared/audio` (SH2-16). `/synth` is its **sibling**, not
  its successor: `/audio` is a sample/.wav buffer player and *cannot* host oscillator
  synthesis. Neither game imports `/audio` today, and red-baron's header (L16-19) explains
  precisely why. Do not touch it.
- Retuning any cabinet's sound (no NUMBERS may change — this must be audibly identical).
- Extracting the ~90%-duplicated fake-AudioContext *test harness* into a shared helper.
  Real duplication, genuinely tempting, but a separate story — note it, don't do it.

## Acceptance Criteria

1. `@arcade/shared/synth` exists as a subpath export, mirroring `/audio`'s wiring:
   `package.json` `exports` entry (`{types: ./dist/synth.d.ts, import: ./dist/synth.js}`)
   and a version bump past the current `0.13.2`.
2. `/synth` is registered in `tests/purity.test.ts` under **`BROWSER_SUBPATHS`, never
   `PURE_SUBPATHS`** — it touches `AudioContext`. The purity guard text-greps built
   `dist/*.js` transitively through the import closure.
3. A `synth-source-rules.test.ts` pins the generic contract by regex-scanning
   `src/synth.ts` as text (arcade-shared's tests are untyped — esbuild strips types, so
   runtime assertions and source regex are the only enforcement available). It bans
   `as any`, `as unknown as`, `@ts-ignore`, `: Function`, and requires the **`.js`
   extension on every relative import** (native-ESM survival).
4. The shared engine honours the **no-throw contract**, proven against a fake
   `AudioContext` on `globalThis`:
   - No WebAudio at all (both `AudioContext` and `webkitAudioContext` `undefined`) → the
     game runs silent forever, no throw, no context constructed.
   - `webkitAudioContext` fallback resolves when `AudioContext` is `undefined`.
   - A **closed** context degrades to silence and never throws — every method may be
     hammered after `close()`.
   - A throwing `new Ctor()` is caught and the half-built context closed.
   - `ctx.resume()` rejecting (closed ctx) is caught — no unhandled rejection.
5. The **gesture gate** holds: importing the module constructs 0 contexts; calling the
   factory constructs 0 contexts; the first `resume()` constructs exactly 1; further
   `resume()` calls are no-ops that still call through to `ctx.resume()`.
6. **Voice bookkeeping** is idempotent: a double `startLoop` builds no second voice; the
   continuous/hum oscillator stays a singleton across repeated `setEngine` (no node leak).
7. **battlezone** consumes `@arcade/shared/synth`, its duplicated skeleton is gone, and its
   suite now proves the closed-context contract using the rb-grade fake (`close()` sets
   `state = 'closed'`; `assertOpen()` throws `InvalidStateError` synchronously from every
   factory method; `resume()` rejects when closed).
8. **red-baron** consumes `@arcade/shared/synth` and its duplicated skeleton is gone.
9. Every cabinet's NUMBERS are unchanged — all existing battlezone and red-baron audio
   tests (ROM-fact seams, POKEY math, dispatch maps, `core-audio-free` boundary greps)
   still pass untouched. Both games build green.
10. The arcade-shared feature branch is merged with **NO `--delete-branch`** and survives
    until a `vX.Y.Z` tag is cut and both consumers' pins are bumped. Repinning uses
    `npm install @arcade/shared@github:...#<ref>` — editing the `#ref` and running a bare
    `npm install` silently keeps the old commit.

---
_Generated by `pf context create story SH2-18` from the sprint YAML._
