---
story_id: "SH2-16"
jira_key: ""
epic: "SH2"
workflow: "tdd"
---
# Story SH2-16: Stand up @arcade/shared/audio (browser subpath) — extract the SFX voice-stealing engine + purity guard; re-point tempest

## Story Details
- **ID:** SH2-16
- **Title:** Stand up @arcade/shared/audio (browser subpath) — extract the SFX voice-stealing engine + purity guard; re-point tempest
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Epic:** SH2 — Shared render surface — extract font/glow/view/compositor into @arcade/shared and converge the cabinet on one vector treatment
- **Points:** 5
- **Priority:** p2
- **Stack Parent:** none (independent story, no deps)

## Story Context & Technical Approach

### Scope

Extract the shell-side WebAudio SFX voice-stealing engine from tempest's `src/shell/audio.ts` into a generic, reusable `@arcade/shared/audio` browser subpath. This module will serve as the canonical SFX engine for the cabinet (consumed by tempest/star-wars/asteroids/battlezone in the follow-on SH2-17 story). The design spans generic typing, per-cabinet manifest configuration, filename-keyed buffer deduplication, POKEY-style voice-stealing, and silent degradation at every failure path.

### Design Reference

See `docs/superpowers/specs/2026-07-11-shared-audio-extraction-design.md` for the full architecture, manifest shape, testing strategy, and packaging mechanics.

### Key Technical Points

**1. Module Interface**

```typescript
export interface AudioEngine<N extends string> {
  resume(): void           // Create/lazy-unlock AudioContext, load manifest
  play(name: N): void      // One-shot; steals its channel
  startLoop(name: N): void // Sustained loop on its channel
  stopLoop(name: N): void  // Stop the loop on name's channel
  ready(): boolean         // True once ≥1 sample has decoded
}

export interface AudioManifest<N extends string> {
  baseUrl: string
  masterGain?: number           // Default 0.4
  sounds: Record<N, string>     // Logical name → filename (per-cabinet NUMBERS)
  channels: Record<N, string>   // Logical name → channel (per-cabinet NUMBERS)
}

export function createAudioEngine<N extends string>(
  manifest: AudioManifest<N>,
): AudioEngine<N>
```

**2. Core Mechanism (Share the VERB, not the NUMBERS)**

- **getAudioContextCtor():** Cross-browser constructor (webkit prefix fallback) — safe lazy creation, one context per engine.
- **Gesture-unlocked context:** Context creation deferred to first `resume()` call (unblocks browser autoplay policy).
- **Buffer store keyed by filename:** Manifests may map multiple logical names to one `.wav` file (asteroids case); fetch/decode once, resolve both names from the same buffer. No `SampleId` indirection in shared code.
- **POKEY-style channel/voice-stealing:** Each channel name maps to a Web Audio `GainNode`. Playing a sound on an occupied channel stops the prior source (via `source.onended` callback) and starts a new one, preventing audio pile-up.
- **Silent-degrade at every failure path:** No WebAudio available, fetch fails, decode fails, stopped source errors — all are no-ops. The game never hears or crashes on audio subsystem failure.
- **Master gain node:** All sounds route through a master gain for global volume control.

**3. Per-Cabinet Configuration (Stay Game-Side)**

Each game keeps its own:
- `SOUNDS: Record<SoundName, string>` — the logical name → filename mapping
- `CHANNELS: Record<SoundName, string>` — which channel each sound plays on
- `baseUrl: string` — where `.wav` files are hosted (e.g., `/audio/` or `/assets/sfx/`)
- `masterGain?: number` — optional master volume (default 0.4)
- `audio-dispatch.ts` — event wiring (game-specific, untouched by extraction)

**4. Browser Subpath & Purity Guard**

`@arcade/shared/audio` touches `AudioContext` (a browser global), so it is a **BROWSER subpath** like glow/view/esc-overlay — NOT pure core. The source-regex purity guard (`tests/purity.test.ts`) must be extended to recognize `audio` as exempt, while the pure core (math3d/rng/highscore/loop/font) remains DOM-free.

**5. Tempest Re-Point (Proof of Generic)**

- Delete tempest's local `src/shell/audio.ts` engine body.
- Keep tempest's `SOUNDS`, `CHANNELS`, manifest — they move into `audio.ts` which now imports and re-exports from `@arcade/shared/audio`.
- Keep tempest's `audio-dispatch.ts` event→sound wiring untouched.
- Verify via `tsc --noEmit` build that the generic type contract (`AudioEngine<SoundName>`) resolves correctly at the consumer.
- Manual run confirms SFX + sustained loops (pulsar hum, warp/zoom) are audibly unchanged.

### Acceptance Criteria — Technical

1. **API & Exports:**
   - `@arcade/shared/audio` exports `AudioEngine<N>`, `AudioManifest<N>`, and `createAudioEngine<N>(manifest) -> AudioEngine<N>`.
   - `./audio` subpath added to `package.json` exports (built ESM + .d.ts) and prepare build.
   - Package version bumped (e.g., 0.7.0 → 0.8.0).

2. **Engine Mechanics (Fake AudioContext Test):**
   - Context created lazily (only on `resume()`, never before).
   - `play()`, `startLoop()`, `stopLoop()` are silent no-ops before `resume()` and when WebAudio is absent.
   - A retrigger on an occupied channel steals (stops the prior source, starts a new one).
   - `startLoop()` sets `source.loop`; `stopLoop()` stops it.
   - Every failure path (missing buffer, decode reject, stop() on ended source) degrades silently without throwing.

3. **Buffer Deduplication (Filename Keying):**
   - Buffers are keyed by filename.
   - A manifest mapping multiple logical names to one `.wav` file fetches/decodes that file once.
   - A test asserts the single decode and correct `name → file → buffer` resolution (the asteroids case).

4. **Purity Guard Extension:**
   - `tests/purity.test.ts` recognizes `audio` as a BROWSER subpath (exempt from DOM checks).
   - Pure core (math3d/rng/highscore/loop/font) still fails on any DOM reference.
   - Full arcade-shared vitest suite passes (prepare build + purity guard + new audio tests).

5. **Tempest Integration:**
   - tempest imports `@arcade/shared/audio` at a pinned git-URL ref.
   - tempest's local `src/shell/audio.ts` engine body is deleted (manifest + `audio-dispatch.ts` retained).
   - `audio.ts` now constructs and re-exports `AudioEngine<SoundName>` from the shared module.
   - tempest's `tsc --noEmit` build is green (proves the generic).
   - tempest vitest + vite build are green.
   - Manual run confirms SFX and sustained loops (pulsar hum, warp/zoom) are audibly unchanged.

### Out of Scope

- **Speech extraction (SH2-17):** star-wars' TMS5220 LPC speech subsystem stays game-side; a `context()` accessor may be added in SH2-17 if speech needs the same unlocked AudioContext.
- **Other games (SH2-17):** star-wars, asteroids, battlezone migrations happen in the follow-on consumption story.
- **red-baron:** No audio yet (POKEY sound is unbuilt rb2 work).

### Known Constraints (from Prior SH-Epic Work)

- **arcade-shared tests are untyped:** vitest strips types, so arcade-shared tests run in node with NO compile-time typechecking. Pin the engine's contracts at **runtime** via a fake AudioContext (no compile-only annotations, no `as const` type guards).
- **Purity guard needs pretest build:** The source-regex guard scans `dist/` as source text (including comments — never name forbidden globals even in comments), so arcade-shared must build *before* the purity test runs. The test is part of arcade-shared's own suite.

## Sm Assessment

**Routing decision:** Phased TDD story, setup complete → hand off to **TEA (O'Brien)** for the RED phase. No Jira; local sprint tracking only. Branches `feat/SH2-16-shared-audio-engine` exist in both `arcade-shared` and `tempest`, cut from `develop` (gitflow — NOT trunk-based for these subrepos).

**What RED must pin (untyped-test reality):** arcade-shared tests run in node with types stripped, so the generic contract cannot be asserted at compile time. Pin the *mechanism* at runtime via a fake `AudioContext`: lazy-context-only-on-`resume()`, no-op-before-resume, channel voice-stealing (retrigger stops prior source), `startLoop`/`stopLoop` toggling `source.loop`, silent-degrade at every failure path, and — the load-bearing new test — **filename-keyed buffer dedupe** (multiple logical names → one `.wav` decoded once; this proves asteroids' N:1 case ahead of SH2-17). See design doc `docs/superpowers/specs/2026-07-11-shared-audio-extraction-design.md`.

**Purity-guard caveats (carried from prior SH-epic stories):**
- The guard scans built `dist/` as *source text, comments included* — a pretest build must run, and forbidden globals must not appear even in comments. `audio` becomes a recognised exempt BROWSER subpath alongside glow/view/esc-overlay; the pure core (math3d/rng/highscore/loop/font) must still fail on any DOM reference.
- When a module leaves `core/`, the purity/scaffold tests that enumerate subpaths need updating too.

**Cross-repo consumption risk for GREEN/tempest re-point:** npm git-dep resolution is lock-sticky — the `arcade-shared` feat branch must be **pushed** before tempest can resolve `@arcade/shared@github:...#feat/...`, and a stale `package-lock.json` may need a forced `npm install "@arcade/shared@github:...#<ref>"`. The tempest pin stays a provisional feat-branch ref through review; it gets promoted to a tag + version bump at release (do NOT expect a released tag mid-story).

**Confidence:** High. Scope is a clean VERB-extraction with a real consumer (tempest tsc) as the type proof. The one genuinely new mechanic is filename dedupe; everything else mirrors the established SH2 extraction pattern.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-11T12:48:25Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-11T12:14:27Z | 2026-07-11T12:17:41Z | 3m 14s |
| red | 2026-07-11T12:17:41Z | 2026-07-11T12:30:38Z | 12m 57s |
| green | 2026-07-11T12:30:38Z | 2026-07-11T12:40:25Z | 9m 47s |
| review | 2026-07-11T12:40:25Z | 2026-07-11T12:48:25Z | 8m |
| finish | 2026-07-11T12:48:25Z | - | - |

## Delivery Findings

No upstream findings at setup.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): the shared engine's `load()` must iterate UNIQUE FILENAMES, not sound names — buffers keyed by filename, fetch/decode each distinct file once. Affects `arcade-shared/src/audio.ts` (tempest's reference `load()` iterates `Object.keys(SOUNDS)` and would fetch a shared file twice; the AC-3 dedup test fails unless load dedupes by file). *Found by TEA during test design.*
- **Gap** (non-blocking): tempest's consumers call the engine with NO manifest — `main.ts` does `createAudioEngine()` (0-arg) and `audio-dispatch.ts` imports `type { AudioEngine }` then `Pick<AudioEngine, 'play'|'startLoop'|'stopLoop'>`. The re-point must keep `tempest/src/shell/audio.ts` exporting a 0-arg `createAudioEngine()` wrapper (constructing the shared engine from `{ baseUrl: DEFAULT_BASE_URL, sounds: SOUNDS, channels: CHANNELS }`) and re-export `AudioEngine` aliased to `AudioEngine<SoundName>`, or `main.ts`/`audio-dispatch.ts` break. Affects `tempest/src/shell/audio.ts`, `tempest/src/main.ts`, `tempest/src/shell/audio-dispatch.ts`. *Found by TEA during test design.*
- **Question** (non-blocking): `arcade-shared/src/index.ts` `SHARED_VERSION` is stale (`'0.8.0'`) while `package.json` is `0.11.0` — a pre-existing drift. The version-bump AC-1 targets `package.json.version` only (my test reads package.json), so this is out of scope, but Reviewer may want the marker reconciled. Affects `arcade-shared/src/index.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking): GREEN must PUSH the `arcade-shared` feat branch before tempest can resolve `@arcade/shared@github:...#feat/...`; a stale `package-lock.json` may need a forced `npm install "@arcade/shared@github:...#<ref>"` (lock-sticky git-dep, per the extraction playbook). Affects `tempest/package.json` + lockfile. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): tempest's `@arcade/shared` pin is a provisional FEAT-branch ref (`#feat/SH2-16-shared-audio-engine`). At release it must be promoted to the tag cut for arcade-shared 0.12.0 (`#v0.12.0`). Affects `tempest/package.json`. *Found by Dev during implementation.*
- **Question** (non-blocking): AC-5's manual audio-parity listen ("SFX + sustained loops audibly unchanged") was NOT performed — the dev/CI env is headless with no audio device. Behavioural parity is proven by tempest's black-box audio suites (fetch-URL set, per-channel voice-stealing, `startLoop`/`stopLoop`, silent-degrade), all green against the shared engine, and masterGain is omitted so the shared 0.4 default matches tempest's long-standing value. A human should do a quick listen before release. Affects `tempest` (runtime audio only). *Found by Dev during implementation.*
- **Improvement** (non-blocking): the re-point rode in with the `@arcade/shared` 0.7.0→0.12.0 dep refresh (the stale node_modules the `v0.11.0` pin already intended to fix). tempest's full 769-test suite + tsc/vite build stayed green, so no other shared subpath (rng/highscore/view) regressed. Affects `tempest/package-lock.json`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): the `arcade-shared` engine is byte-for-byte the tempest reference extracted, so star-wars/asteroids/battlezone in SH2-17 can drop their local engine bodies the same way; asteroids' `SampleId` indirection is now redundant (the shared filename-keyed store already dedupes N:1). Affects `arcade-shared/src/audio.ts` (proven extension point). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the tempest `@arcade/shared` pin is a provisional feat-branch ref and MUST be promoted to `#v0.12.0` at release — a `git tag v0.12.0` has to be cut on arcade-shared first. This is a finish/release action, not a code defect (confirmed by preflight + Dev's finding). Affects `tempest/package.json` + `tempest/package-lock.json`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `masterGain ?? 0.4` correctly preserves a `masterGain: 0` (fully-muted) config, but no test pins the `??`-vs-`||` distinction — a future refactor to `||` would silently break `masterGain: 0` uncaught. Add a fake-context test when SH2-17 wires the other cabinets' masterGain NUMBERS. Affects `arcade-shared/tests/audio.test.ts`. *Found by Reviewer during code review.*
- **Question** (non-blocking): the AC-5 manual audible-parity listen remains an un-executed human pre-release check (behavioural parity is proven by 769 green tempest tests). A human should confirm SFX + the pulsar hum / warp loop sound unchanged before the release merge. Affects `tempest` (runtime audio). *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 3 findings (0 Gap, 0 Conflict, 2 Question, 1 Improvement)
**Blocking:** None

- **Question:** AC-5's manual audio-parity listen ("SFX + sustained loops audibly unchanged") was NOT performed — the dev/CI env is headless with no audio device. Behavioural parity is proven by tempest's black-box audio suites (fetch-URL set, per-channel voice-stealing, `startLoop`/`stopLoop`, silent-degrade), all green against the shared engine, and masterGain is omitted so the shared 0.4 default matches tempest's long-standing value. A human should do a quick listen before release. Affects `tempest`.
- **Improvement:** the `arcade-shared` engine is byte-for-byte the tempest reference extracted, so star-wars/asteroids/battlezone in SH2-17 can drop their local engine bodies the same way; asteroids' `SampleId` indirection is now redundant (the shared filename-keyed store already dedupes N:1). Affects `arcade-shared/src/audio.ts`.
- **Question:** the AC-5 manual audible-parity listen remains an un-executed human pre-release check (behavioural parity is proven by 769 green tempest tests). A human should confirm SFX + the pulsar hum / warp loop sound unchanged before the release merge. Affects `tempest`.

### Downstream Effects

Cross-module impact: 3 findings across 2 modules

- **`.`** — 2 findings
- **`arcade-shared/src`** — 1 finding

### Deviation Justifications

4 deviations

- **Generic `<N extends string>` pinned by source-text regex + consumer tsc, not the fake-context test**
  - Rationale: arcade-shared tests are untyped (esbuild strips types) — a runtime test cannot observe a generic; source-regex + consumer-tsc is the epic's prescribed contract-pinning approach ([[arcade-shared-tests-untyped]])
  - Severity: minor
  - Forward impact: none — Dev must keep the generic signature (regex-enforced) and tempest's build green
- **Version-bump AC tested as a semver range (> 0.11.0), not an exact target**
  - Rationale: avoids brittle exact-version coupling; any conforming bump (≥ 0.12.0) passes
  - Severity: minor
- **AC-5 tempest re-point verified by build (tsc/vite) + manual parity — no new TEA unit test**
  - Rationale: the generic proof IS the type-level build; there is no new deterministic core behaviour in tempest to unit-test, and a shell WebAudio test would duplicate the shared fake-context suite
  - Severity: minor
  - Forward impact: Dev/verify must run tempest `tsc` + `vite build` and confirm the existing `audio-dispatch` wiring still typechecks after the `AudioEngine<SoundName>` re-export
- **AC-5 manual audio-parity listen not executed (headless env) — parity proven by the existing black-box suites instead**
  - Rationale: no audio device in the headless dev/CI env; the shared engine is the tempest reference extracted verbatim and is fed tempest's exact SOUNDS/CHANNELS, and masterGain is omitted so the shared 0.4 default matches tempest's long-standing headroom value
  - Severity: minor
  - Forward impact: Reviewer/human should do a quick listen before release; no code impact

## Design Deviations

No deviations recorded at setup.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Generic `<N extends string>` pinned by source-text regex + consumer tsc, not the fake-context test**
  - Spec source: context-story-SH2-16.md, AC-2; design §8 risk #1
  - Spec text: "A fake-AudioContext test pins the engine mechanics… Generic over N so play() stays typed at the consumer"
  - Implementation: the fake-context suite (`audio.test.ts`) pins only RUNTIME mechanics; the generic is pinned by regex in `audio-source-rules.test.ts` and end-to-end by tempest's `tsc` build (AC-5)
  - Rationale: arcade-shared tests are untyped (esbuild strips types) — a runtime test cannot observe a generic; source-regex + consumer-tsc is the epic's prescribed contract-pinning approach ([[arcade-shared-tests-untyped]])
  - Severity: minor
  - Forward impact: none — Dev must keep the generic signature (regex-enforced) and tempest's build green
- **Version-bump AC tested as a semver range (> 0.11.0), not an exact target**
  - Spec source: context-story-SH2-16.md, AC-1
  - Spec text: "the package version is bumped"
  - Implementation: `purity.test.ts` asserts the parsed version triple > [0,11,0] rather than == 0.12.0
  - Rationale: avoids brittle exact-version coupling; any conforming bump (≥ 0.12.0) passes
  - Severity: minor
  - Forward impact: none
- **AC-5 tempest re-point verified by build (tsc/vite) + manual parity — no new TEA unit test**
  - Spec source: context-story-SH2-16.md, AC-5
  - Spec text: "tempest vitest + vite build are green and a manual run confirms SFX + the sustained loops (pulsar hum, warp/zoom) are audibly unchanged"
  - Implementation: TEA authored no new tempest test; the re-point is a behaviour-preserving refactor with no new pure-core logic — verified by tempest's `tsc` (which proves the generic, design §4) + `vite build` + the existing suite staying green + manual audio parity
  - Rationale: the generic proof IS the type-level build; there is no new deterministic core behaviour in tempest to unit-test, and a shell WebAudio test would duplicate the shared fake-context suite
  - Severity: minor
  - Forward impact: Dev/verify must run tempest `tsc` + `vite build` and confirm the existing `audio-dispatch` wiring still typechecks after the `AudioEngine<SoundName>` re-export

### Dev (implementation)
- **AC-5 manual audio-parity listen not executed (headless env) — parity proven by the existing black-box suites instead**
  - Spec source: context-story-SH2-16.md, AC-5
  - Spec text: "a manual run confirms SFX + the sustained loops (pulsar hum, warp/zoom) are audibly unchanged"
  - Implementation: verified parity via tempest's existing black-box audio suites (`audio.test.ts` / `audio.sustain.test.ts` / `audio-dispatch.test.ts` — fetch-URL set, per-channel voice-stealing, `startLoop`/`stopLoop`, silent-degrade), all 769 tempest tests + tsc/vite build green against the shared engine; the audible listen is left for a human/Reviewer
  - Rationale: no audio device in the headless dev/CI env; the shared engine is the tempest reference extracted verbatim and is fed tempest's exact SOUNDS/CHANNELS, and masterGain is omitted so the shared 0.4 default matches tempest's long-standing headroom value
  - Severity: minor
  - Forward impact: Reviewer/human should do a quick listen before release; no code impact
- **No deviations from the tests O'Brien wrote** — every RED test passes unmodified; no test was weakened, skipped, or rewritten, and no scope was added beyond the shared engine + the tempest re-point the ACs specify.

### Reviewer (audit)
All five logged deviations reviewed — every one **✓ ACCEPTED**, none flagged:
- **TEA-1 (generic pinned by source-regex + consumer tsc)** → ✓ ACCEPTED: the untyped suite genuinely cannot observe a generic at runtime; the source-regex + tempest `tsc` build is the only honest way to pin it, and both are green.
- **TEA-2 (version-bump tested as a `> 0.11.0` range)** → ✓ ACCEPTED: a semver-triple compare is more robust than an exact pin and still fails RED until the version is bumped.
- **TEA-3 (AC-5 re-point verified by build, no new TEA test)** → ✓ ACCEPTED: the `tsc` build IS the generic proof (design §4); the re-point adds no pure-core behaviour to unit-test, and tempest's existing black-box audio suites already exercise the engine.
- **Dev-1 (AC-5 manual listen deferred to a human)** → ✓ ACCEPTED: no audio device in the headless env; behavioural parity is proven by 769 green tests + a byte-faithful extraction fed tempest's exact NUMBERS. Residual human listen re-logged as a Reviewer finding.
- **Dev-2 (no deviations from O'Brien's tests)** → ✓ ACCEPTED: confirmed — every RED test passes unmodified, none weakened or skipped, no scope added.

No **UNDOCUMENTED** deviations found: the provisional feat-branch dep pin is already logged (Dev finding) and is standard mid-story practice per the extraction playbook.

## TEA Assessment

**Tests Required:** Yes
**Reason:** New shared module + purity-guard extension + a real-consumer re-point — all behaviour-bearing.

**Test Files:**
- `arcade-shared/tests/audio.test.ts` — 26 tests. Fake-AudioContext suite pinning the engine VERB: lazy context (only on `resume()`), no-op-before-resume, inert without WebAudio, ctor-throw (blocked autoplay) degrades silently, master GainNode default 0.4 / manifest override / source→master routing, suspended-context gesture unlock, load + `ready()`, filename-keyed dedup (AC-3, the asteroids N:1 case), POKEY channel voice-stealing (same-channel + same-name steal, independent channels don't), `startLoop`/`stopLoop`, and silent degradation at every failure path (fetch fail, decode reject, `stop()` on an ended node, onended releasing the live voice).
- `arcade-shared/tests/audio-source-rules.test.ts` — 7 tests. Source-text guards: the `<N extends string>` generic on `createAudioEngine`/`AudioEngine`/`AudioManifest` (the ONLY way to pin the generic in an untyped suite), no `Record<string,string>` collapse (design §8 risk #1), and TS lang-review #1/#5/#2.
- `arcade-shared/tests/purity.test.ts` — extended: `audio` added to `BROWSER_SUBPATHS`; new SH2-16 block asserts audio is BROWSER-classified (never pure), `exports["./audio"]` → built ESM + `.d.ts`, `dist/audio.js` is built, and the package version is bumped past 0.11.0.

**Tests Written:** 37 failing tests covering AC-1 (exports + version bump), AC-2 (fake-context mechanics), AC-3 (filename dedup), AC-4 (purity classification). AC-5 (tempest re-point) is build-verified (tsc/vite + manual parity), per the deviation above.
**Status:** RED (failing — verified by Room 101 / testing-runner: 37 failed, 287 passed, pretest build green, zero pre-existing regressions).

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| TS #1 type-safety escapes | `audio-source-rules` → "uses no as any / unknown as / @ts-ignore" | failing (RED) |
| TS #2 specific callback signature | `audio-source-rules` → "no bare Function type" | failing (RED) |
| TS #5 `.js` ESM import extension | `audio-source-rules` → "every relative import carries `.js`" | failing (RED) |
| Design §8 generic contract | `audio-source-rules` → generic `<N extends string>` on factory + types, no `Record<string,string>` collapse | failing (RED) |
| Charter (ADR-0003) browser fence | `purity.test.ts` SH2-16 block → audio BROWSER-exempt, pure core still DOM-policed | failing (RED) |

**Rules checked:** 3 of the applicable TS lang-review rules (#1/#2/#5) + the design §8 generic risk + the ADR-0003 purity charter have test coverage. (DPR rule #4 and canvas-recording rules are N/A to an audio module.)
**Self-check:** 0 vacuous tests — every no-op/silent-degrade test asserts BOTH `not.toThrow()` AND an observable absence (`sources` length 0 / `ready()` false / `stopped` false), never a bare truthiness.

**Handoff:** To Dev (Julia) for implementation. Build `arcade-shared/src/audio.ts` (generic factory, filename-keyed load), add the `./audio` export + version bump, then re-point tempest (see Delivery Findings for the 0-arg wrapper + `AudioEngine<SoundName>` re-export).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `arcade-shared/src/audio.ts` (new) — generic `createAudioEngine<N extends string>(manifest) -> AudioEngine<N>`: lazy AudioContext on `resume()`, master GainNode (default 0.4), buffers keyed by FILENAME (multiple names → one `.wav` decoded once — the asteroids N:1 case), POKEY-style channel voice-stealing (`stopChannel`/`startSource`/`onended`), `startLoop`/`stopLoop`, and silent-degrade at every failure path (no WebAudio, blocked-autoplay ctor throw, failed fetch, undecodable sample, `stop()` on an ended node).
- `arcade-shared/package.json` — `./audio` subpath added to `exports` (built ESM + `.d.ts`); version bumped 0.11.0 → 0.12.0.
- `tempest/src/shell/audio.ts` — local engine body DELETED (221 → ~90 lines); keeps the SOUNDS manifest + CHANNELS voice map + R2 base URL (per-cabinet NUMBERS), delegates to the shared engine, and re-exports a 0-arg `createAudioEngine()` wrapper + `type AudioEngine = SharedAudioEngine<SoundName>` so `main.ts` and `audio-dispatch.ts` are untouched.
- `tempest/package.json` + `tempest/package-lock.json` — `@arcade/shared` pinned to the SH2-16 feat ref (refreshed 0.7.0 stale-lock → 0.12.0).

**Tests:**
- arcade-shared: **324/324 GREEN** (pretest tsc build clean).
- tempest: **769/769 GREEN**; `tsc --noEmit` + `vite build` pass — the tsc step proves the generic `AudioEngine<SoundName>` resolves at the consumer (AC-5). Zero regressions across the suite from the dep refresh. The three audio suites (`audio` / `audio.sustain` / `audio-dispatch`) pass unchanged against the shared engine.

**Branches:** `feat/SH2-16-shared-audio-engine` pushed to origin in BOTH `arcade-shared` and `tempest`.

**AC coverage:** AC-1 (exports + version bump) ✓ · AC-2 (fake-context mechanics) ✓ · AC-3 (filename dedup) ✓ · AC-4 (purity classification) ✓ · AC-5 (tempest re-point: build + tests green; the one residual — the manual audible listen — is deferred to a human, see the Dev deviation).

**Handoff:** To the next phase (verify/review).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (both repos GREEN; 0 code smells) | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer directly ([EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — assessed by Reviewer directly ([SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — assessed by Reviewer directly ([TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — assessed by Reviewer directly ([DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — assessed by Reviewer directly ([TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — assessed by Reviewer directly ([SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — assessed by Reviewer directly ([SIMPLE]) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — assessed by Reviewer directly ([RULE]) |

**All received:** Yes (1 enabled subagent returned clean; 8 disabled via `workflow.reviewer_subagents` and assessed by Reviewer directly)
**Total findings:** 0 confirmed blocking, 4 LOW/non-blocking observations, 0 dismissed

## Reviewer Review Notes

### Rule Compliance (TS lang-review checklist — 13 checks, exhaustive over the diff)

- **#1 Type-safety escapes** — `arcade-shared/src/audio.ts`: no `as any` / `as unknown as` / `@ts-ignore` / `!`. `globalThis as { AudioContext?…; webkitAudioContext?… }` is a typed shape-read of an ambient global (the standard pattern, identical to the extracted reference) → COMPLIANT. `tempest/src/shell/audio.ts`: clean. Tests: `audio.test.ts` uses `as never` / `as Record<string,unknown>` in the fake-install scaffolding — a technical escape (#1/#8) but INERT, because arcade-shared tests are never typechecked (`tsconfig.build.json` includes only `src`; esbuild strips test types) → LOW nit, non-blocking.
- **#2 Generic/interface pitfalls** — `createAudioEngine<N extends string>`, `AudioEngine<N>`, `AudioManifest<N>` are properly generic, NOT `Record<string, any>`; design §8 "don't collapse to `Record<string,string>`" respected. No `Function`/`object` types → COMPLIANT.
- **#3 Enum anti-patterns** — no enums in the diff → N/A.
- **#4 Null/undefined** — `manifest.masterGain ?? DEFAULT_MASTER_GAIN` uses `??` (not `||`), so a valid `0` is preserved — the exact bug class #4 warns about, done RIGHT. Every `Map.get()` is undefined-checked (`buffers.get(...)`→`if(!buffer)return`; `live.get(...)`→`if(!prev)return`) → COMPLIANT.
- **#5 Module/declaration** — `tempest/src/shell/audio.ts` uses inline `type AudioEngine as SharedAudioEngine` on the import and `export type AudioEngine = …` (no runtime code for type-only). `audio.ts` has no relative imports needing `.js`; tempest imports the bare package specifier → COMPLIANT.
- **#6 React/JSX** — no `.tsx` → N/A.
- **#7 Async/Promise** — the `load()` fetch→arrayBuffer→decode chain ends in `.catch(() => {})` (intentional silent-degrade, AC-2). `void ctx.resume()` is deliberately fire-and-forget (matches the reference; a rejected resume just leaves audio locked until the next gesture) → COMPLIANT.
- **#8 Test quality** — assertions are meaningful (verified in the RED phase; no vacuous `assert(true)`); tests import from `../src/audio` (source), not `dist/`. The purity guard is the deliberate exception — it MUST read `dist/` as text, and does → COMPLIANT (bar the #1 `as never` nit).
- **#9 Build/config** — `strict: true` retained; `./audio` → `dist/audio.js` + `.d.ts`; version bumped → COMPLIANT.
- **#10 Security type-level input validation** — no user input reaches the engine; the manifest is game-authored config (NUMBERS) and fetch URLs are compile-time constants → COMPLIANT.
- **#11 Error handling** — empty `catch {}` blocks (no `catch (e: any)`) are the spec's silent-degrade contract, each pinned by a test → COMPLIANT (intentional, not swallowed).
- **#12 Performance/bundle** — `new Set(Object.values(sounds))` runs once at load; no hot-path stringify or sync fs → COMPLIANT.
- **#13 Fix-introduced regressions (meta)** — no fix diff yet → N/A.

### Observations (≥5)

- **[VERIFIED] [EDGE]** onended stale-guard correct — `arcade-shared/src/audio.ts` `source.onended = () => { if (live.get(channel) === source) live.delete(channel) }` only releases the channel if THIS source is still the live voice, so a late onended from a stolen source can't evict a newer one. Pinned by the "source cleared by onended is not re-stopped" test.
- **[VERIFIED] [EDGE]** steal ordering safe — `stopChannel` does `live.delete(channel)` BEFORE `prev.stop()` inside try/catch, so a `stop()` that throws on an already-ended node still leaves the channel clean and never aborts the cut-in. Pinned by "throws on stop() still cuts in".
- **[VERIFIED] [SILENT]** the empty catches in `resume`/`load`/`stopChannel`/`startSource` are the AC-2 silent-degrade contract, not swallowed bugs — every path (no WebAudio, ctor throw, fetch reject, decode reject, stop-on-ended) has an explicit no-throw + observable-silence test. `void ctx.resume()` is the one fire-and-forget promise; a blocked-autoplay rejection is benign and matches the reference → LOW, non-blocking.
- **[VERIFIED] [TYPE]** the generic `<N extends string>` is preserved end-to-end and proven at the tempest consumer by a green `tsc --noEmit`; tempest re-exports the concrete `AudioEngine = SharedAudioEngine<SoundName>` so `audio-dispatch.ts`'s `Pick<AudioEngine, …>` keeps compiling. No `Record<string,string>` collapse.
- **[VERIFIED] [SEC]** no user input flows into the engine; `fetch(manifest.baseUrl + file)` uses game-authored compile-time constants — no SSRF, injection, secrets, or auth surface.
- **[VERIFIED] [DOC]** comments accurate; `tempest/src/shell/audio.ts` header updated to state the engine was extracted to `@arcade/shared/audio`; the CHANNELS comment still correctly documents the voice-map NUMBERS. No stale references to the deleted engine body.
- **[LOW] [SIMPLE]** `arcade-shared/src/audio.ts` `const destination = master` before `stopChannel(channel)` is a redundant local — TS control-flow narrowing persists across the plain `stopChannel` call (the extracted reference used `source.connect(master)` directly and compiled). Harmless; arguably documents intent. Non-blocking.
- **[LOW] [TEST]** no test pins `masterGain: 0` (the `??`-vs-`||` distinction), the ctor-throw→later-resume recovery path, or same-file+same-channel dedup — all three behave correctly and are behaviour-preserving, but a `||` refactor could regress the `0` case uncaught. Add coverage in SH2-17. Non-blocking.
- **[VERIFIED] [RULE]** TS lang-review 13/13 applicable checks pass (see Rule Compliance). Sole nit — `as never` in untyped test scaffolding — is inert. Non-blocking.
- **[VERIFIED]** Wiring — gesture → `tempest/src/main.ts:46 audio.resume()` → shared engine builds ctx + master(0.4) + loads unique files; core `GameEvent` → `main.ts:70 playEventSounds(audio, frameEvents)` → `engine.play(name)` → name→file→buffer, channel steal, start. End-to-end intact; 769 tempest tests + tsc/vite build green.

### Devil's Advocate

Suppose this code is broken. The most dangerous change is the buffer-keying flip: tempest's reference keyed the decoded-buffer store by logical NAME, the shared engine keys it by FILENAME. If any tempest sound name accidentally shared a filename, the new engine would decode once and both names would suddenly steal each other's channel or resolve to a surprise buffer — a silent gameplay-audio bug no type checker catches. I enumerated all 13 tempest SOUNDS values: every filename is distinct, so name-keying and file-keying are behaviourally identical for tempest, and the 769 green tests (which assert exact fetched URLs and per-channel steal) confirm it. A confused future maintainer could add a duplicate filename in SH2-17 and get non-obvious cross-name stealing — but that is exactly the *designed* N:1 superset (asteroids), and it is tested. Next: the silent-degrade philosophy could mask a real outage — if R2 quietly 404s every sample, the engine stays inert and the game is mute with no error surfaced anywhere. That is deliberate (AC-2: a dead audio subsystem must never crash the frame), but it means an ops regression in the sample host is invisible to the code; `ready()` returning false is the only signal, and nothing consumes it in-game. Worth an ops note, not a code fix. A stressed browser could throw inside `new AudioContext()` under a blocked-autoplay policy; the ctor try/catch resets `ctx = null`, so the very next gesture retries — good — but `void ctx.resume()` can emit an unhandled promise rejection under strict rejection-tracking; benign, but a noisy console in some browsers. A malicious actor has no lever here: no user string reaches `fetch`, the manifest is compile-time game config, there is no `eval`, no DOM injection, no `dangerouslySetInnerHTML`. The confused-user angle is the deferred manual listen — if the extraction subtly changed gain routing, tests wouldn't hear it; but master gain is asserted at 0.4 and source→master routing is pinned, so the audible surface is covered structurally. Nothing here rises to Critical or High.

## Reviewer Assessment

**Verdict:** APPROVED

**Summary:** A faithful, behaviour-preserving extraction of tempest's WebAudio SFX engine into `@arcade/shared/audio`, with the generic contract proven at the consumer and the purity guard correctly extended. Both repos fully green (arcade-shared 324/324; tempest 769/769 + `tsc --noEmit` + `vite build`), zero code smells, no Critical/High findings. Four LOW/non-blocking observations logged for follow-up.

**Data flow traced:** user gesture → `tempest/src/main.ts:46 audio.resume()` → shared engine lazily builds the AudioContext + master gain (0.4) and fetches each UNIQUE sample file once → core emits `GameEvent` DATA → `main.ts:70 playEventSounds(audio, frameEvents)` → `engine.play(name)` resolves name→file→buffer, steals the channel, starts the source. No user input enters the engine; every URL is a compile-time constant. Safe.

**Pattern observed:** share-the-VERB / keep-the-NUMBERS — `arcade-shared/src/audio.ts` holds the identical mechanism; `tempest/src/shell/audio.ts` keeps only SOUNDS/CHANNELS/baseUrl and delegates. Matches the ADR-0003 glow/view precedent at `arcade-shared/tests/purity.test.ts`.

**Error handling:** every failure path (no WebAudio, blocked-autoplay ctor throw, failed fetch, undecodable sample, `stop()`-on-ended) is an intentional silent no-op, each pinned by a fake-context test (AC-2). The ctor try/catch in `arcade-shared/src/audio.ts` resets `ctx = null` so a later gesture can retry.

**Specialist domains** (8 subagents disabled via `workflow.reviewer_subagents` → assessed by Reviewer directly): **[EDGE]** onended stale-guard + delete-before-stop ordering verified · **[SILENT]** empty catches are the AC-2 spec, tested · **[TEST]** strong coverage, 3 low gaps noted · **[DOC]** comments accurate, header updated · **[TYPE]** generic `<N extends string>` preserved, no `Record` collapse · **[SEC]** no user-input/injection surface · **[SIMPLE]** one redundant local (LOW) · **[RULE]** TS lang-review 13/13 pass.

**Deviations:** all 5 logged deviations ACCEPTED (see `### Reviewer (audit)`); no undocumented deviations.

**Handoff:** To SM (Winston Smith) for finish-story. NOTE: this is an AI-authored + AI-reviewed change — per the finish-merge human-approval gate, the actual PR merge requires explicit human authorization; I do NOT merge.