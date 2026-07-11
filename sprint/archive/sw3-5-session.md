---
story_id: "sw3-5"
jira_key: ""
epic: "sw3"
workflow: "tdd"
---
# Story sw3-5: Phase music engine — looping music channel driven off phase edges (space/towers/trench themes + Imperial March); needs music assets sourced

## Story Details
- **ID:** sw3-5
- **Jira Key:** (not tracked)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-11T17:54:07Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-11T16:36:13.059295+00:00 | 2026-07-11T16:40:03Z | 3m 49s |
| red | 2026-07-11T16:40:03Z | 2026-07-11T16:58:26Z | 18m 23s |
| green | 2026-07-11T16:58:26Z | 2026-07-11T17:10:56Z | 12m 30s |
| review | 2026-07-11T17:10:56Z | 2026-07-11T17:24:01Z | 13m 5s |
| green | 2026-07-11T17:24:01Z | 2026-07-11T17:38:56Z | 14m 55s |
| review | 2026-07-11T17:38:56Z | 2026-07-11T17:54:07Z | 15m 11s |
| finish | 2026-07-11T17:54:07Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): this checkout's `node_modules` carried a stale `@arcade/shared` **0.11.0** (no `./audio` subpath) while `package.json` + the committed lockfile pin **v0.12.0**; I ran `npm ci` to sync it (0.12.0, `dist/audio.js` present). The drift had silently red-ed every shell/audio suite. Affects the dev/CI environment (not source) — GREEN needs @arcade/shared v0.12.0 installed; `npm ci` / `just install-all` recovers a drifted checkout. *Found by TEA during test design.*
- **Gap** (non-blocking): music does not stop/duck on the playing→gameover or gameover→attract MODE edges, and attract mode has no music (ROM `off_6759` random-picker). sw3-5's ACs scope to the three phase themes + Imperial March only. Affects `star-wars/src/core/sim.ts` (mode transitions) + `star-wars/src/shell/audio.ts` (a `stopLoop` cue) — a follow-on should own mode-edge music. *Found by TEA during test design.*
- **Gap** (non-blocking): the looping `.wav` assets (space/towers/trench/imperialMarch) do not exist yet — they must be transcribed from ROM POKEY music (historicalsource sound board) and hosted on R2. The engine degrades silently (startLoop no-ops on an unloaded track), so the GREEN wiring is inaudible until assets are produced+uploaded. Affects `star-wars/src/shell/audio.ts` (MUSIC manifest R2 prefix/filenames) + an asset-production task outside the core TDD loop. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): concretizes TEA Finding #3 — the GREEN `MUSIC` manifest pins the exact expected files at `https://arcade-assets.slabgorb.com/star-wars/music/`: `space_theme.wav`, `towers_theme.wav`, `trench_theme.wav`, `imperial_march.wav`. These four POKEY-music loops must be transcribed (historicalsource sound board) and uploaded to R2 before any music is audible; until then `startLoop` silently no-ops. Affects an asset-production/R2-upload task + (if filenames differ) `star-wars/src/shell/audio.ts` MUSIC. *Found by Dev during implementation.*
- No new upstream findings during the round-2 review rework. The one remaining Reviewer [LOW] (main.ts wiring-regex co-location) is pre-existing/systemic and already captured as the Reviewer's own Delivery Finding — deferred to a codebase-wide follow-up, not owned by sw3-5. *Found by Dev during rework.*

### Reviewer (code review)
- **Improvement** (non-blocking): the `main.ts` event→handler wiring is verified in `tests/shell/*.ts` by raw-text regex over `main.ts?raw` that matches `case '<type>'` and the handler call INDEPENDENTLY — they need not be co-located, so an empty `case` with the handler text in a comment would still pass. Mutation-proven for `case 'music'`; the identical weakness pre-dates sw3-5 (the `case 'speech'` check has it too). A codebase-wide tightening (single regex spanning the case block, e.g. `/case\s+['"]music['"]:[\s\S]{0,200}?\.startLoop\(\s*\w+\.track\s*\)/`) would harden every event arm at once. Affects `star-wars/tests/shell/audio.test.ts` + `music-channel.test.ts` (the `mainSrc` regex pattern). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `MUSIC_CHANNELS` was newly `export`ed (round-2 rework, for AC1 testability) as a mutable `Record<MusicName, string>`, without the `as const`/`Readonly<>` its sibling exported manifests (`MUSIC`, `SPEECH`) both carry. `@arcade/shared/audio`'s `createAudioEngine` holds `manifest.channels` by reference and reads `channels[name]` live on every `startLoop`/`stopLoop`, so first-party code could in principle reassign a value at runtime and silently retarget the single-channel voice-steal AC1 depends on. Latent, not exploited (both new tests only read it via `Object.values`/`Object.keys`), and low-risk in a client-only, single-author game. Recommend `export const MUSIC_CHANNELS: Readonly<Record<MusicName, string>> = {…}` (keeps the exhaustiveness the explicit `Record` gives while matching the `as const` sibling convention) on the next touch of `star-wars/src/shell/audio.ts`. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

2 deviations

- **Music cue names a track on every edge — no "stop"/null variant**
  - Rationale: the ACs enumerate exactly three phase themes + Imperial March, all swaps — no in-scope moment stops music. Non-null also sidesteps the `??`/`||` nullable-falsy trap (lang-review #4). Stopping/ducking on the gameover/attract MODE edges is out of scope (Delivery Finding #2).
  - Severity: minor
  - Forward impact: a future gameover/attract-music story adds the stop signal (widen `track` to `| null` or add a `music-stop` variant); the shell already exposes `stopLoop` for it.
- **Extended two pre-existing test files for the new event + eager music load**
  - Rationale: a new `GameEvent` variant MUST be covered by the union's compile-time exhaustiveness test; eager music load (matching the SFX pattern, not lazy like speech) keeps the first phase theme gap-free. Both edits keep the existing contracts honest, not weakened (events.test.ts still pins every variant; audio.test.ts still verifies sfx resolves from its base, and now the music base too).
  - Severity: minor
  - Forward impact: none — the extended tests fully cover their original contracts.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Music cue names a track on every edge — no "stop"/null variant**
  - Spec source: context-story-sw3-5.md, AC1/AC2 + the events.ts integration note
  - Spec text: "Model start/stop to match the shared engine (e.g. `{type:'music', track: MusicTrack | null}` where null=stop, or separate start/stop variants — Architect/TEA's call)."
  - Implementation: `MusicEvent = { type: 'music'; track: MusicTrack }` (non-null); the cue only ever SWAPS the loop on a phase edge, never explicitly stops it. `stopLoop` is still surfaced on the shell engine (AC1) but no core cue emits a stop.
  - Rationale: the ACs enumerate exactly three phase themes + Imperial March, all swaps — no in-scope moment stops music. Non-null also sidesteps the `??`/`||` nullable-falsy trap (lang-review #4). Stopping/ducking on the gameover/attract MODE edges is out of scope (Delivery Finding #2).
  - Severity: minor
  - Forward impact: a future gameover/attract-music story adds the stop signal (widen `track` to `| null` or add a `music-stop` variant); the shell already exposes `stopLoop` for it.

### Dev (implementation)
- **Extended two pre-existing test files for the new event + eager music load**
  - Spec source: TEA RED suites + context-story-sw3-5.md (events.ts integration note, AC5)
  - Spec text: "core/events.ts: ... Add a music-cue variant ... exhaustive switch" / "main.ts ... a `case 'music'` arm ... the `default` arm is a `never` exhaustiveness guard"
  - Implementation: (a) `tests/core/events.test.ts` — adding `MusicEvent` to the union made the `never` default in `discriminant()` a compile error, so I added the `case 'music'` arm, the `ALL_EVENTS` fixture entry, and bumped the "distinct types" count 14→15; (b) `tests/shell/audio.test.ts` — `resume()` now eager-loads the `MUSIC` manifest (so the run-start space theme is decoded before the first phase edge, not silent), which adds music-prefix URLs to `resume()`'s fetches; its two "every fetched URL is under the sfx base" assertions were re-scoped to partition sfx vs the new music R2 prefix.
  - Rationale: a new `GameEvent` variant MUST be covered by the union's compile-time exhaustiveness test; eager music load (matching the SFX pattern, not lazy like speech) keeps the first phase theme gap-free. Both edits keep the existing contracts honest, not weakened (events.test.ts still pins every variant; audio.test.ts still verifies sfx resolves from its base, and now the music base too).
  - Severity: minor
  - Forward impact: none — the extended tests fully cover their original contracts.
- **Review rework (round 2) — no new spec deviations.** All three implemented guards fall inside the Reviewer's explicitly-offered options: [HIGH] chose the structural `Set(Object.values(MUSIC_CHANNELS)).size === 1` pin over the offered behavioral alternative (targeted, mutation-verified, node-friendly); [MEDIUM] implemented exactly as specified; [LOW] chose "fold into a behavioral test" over the offered "drop the two `it()` blocks" (keeps the compile-time union pin). The sole production change is a single `export` of `MUSIC_CHANNELS` — no behavior changed. No divergence from a higher-authority spec source.

### Reviewer (audit)
- **TEA: Music cue names a track on every edge — no "stop"/null variant** → ✓ ACCEPTED by Reviewer: the context explicitly delegated the shape to TEA; every in-scope phase edge is a swap, so no stop cue is reachable, and non-null sidesteps the `??`/`||` trap. The gameover/attract stop-music gap is captured as a non-blocking Delivery Finding (a real follow-on, not a defect here).
- **Dev: Extended two pre-existing test files for the new event + eager music load** → ✓ ACCEPTED by Reviewer: (1) `events.test.ts` 14→15 is mandatory — the `never` exhaustiveness guard is a compile error otherwise; the added `case 'music'` and `ALL_EVENTS` entry are honest, not weakened. (2) `audio.test.ts` sfx/music fetch partition is an honest adaptation — the sfx assertions are preserved (`sfx.length >= REQUIRED_SOUNDS.length`; each sfx still resolves against its base); eager music load (vs lazy) is the correct choice so the run-start theme is decoded before the first edge. NOTE: the partition also created the test GAP the rework must close (music base decoupling is not itself pinned — see [TEST] finding H2).
- **Undocumented deviation (Reviewer-spotted): eager music load on `resume()`.** Not called out as its own deviation entry, but Dev folded it into the audio.test.ts deviation with clear rationale — accepted as documented-enough. No other undocumented spec divergence found: the music-base non-parameterization (sfx base is overridable, music base is fixed) is not a spec requirement, so it is a design choice, not a deviation. Severity: none.

#### Round 2 (rework audit)
- **Dev: Review rework (round 2) — no new spec deviations** → ✓ ACCEPTED by Reviewer: all three guards land inside the options I explicitly offered in the round-1 rejection. [HIGH] the structural `Set(Object.values(MUSIC_CHANNELS)).size === 1` pin is exactly the first option I named (and I independently mutation-verified it catches `imperialMarch:'music-imperial'`); [MEDIUM] implemented as specified; [LOW] the "fold into a behavioral test" I offered, keeping the `MusicTrack[]` compile pin. The single `export` is a legitimate testability change (no behavior change). No divergence from a higher-authority source.
- **Undocumented (Reviewer-spotted, round 2): `MUSIC_CHANNELS` exported as a mutable `Record<MusicName, string>`.** The `export` is a design choice for testability, not a spec deviation — but it diverges from the file's own convention: its sibling manifests `MUSIC`/`SPEECH` are `as const`, and the shared engine reads `channels` by live reference. Not logged by Dev because it wasn't a spec divergence. Captured as a non-blocking [LOW] Delivery Finding (hardening recommendation), NOT a blocker. Severity: low.

## Sm Assessment

**Setup complete — routing to TEA (Imperator Furiosa) for the RED phase.**

sw3-5 is a well-supported TDD story despite its "needs music assets sourced" tag,
which is a red herring: the source exists and the looping plumbing is already built.
Full research is in `sprint/context/context-story-sw3-5.md` (Background + 5 ACs).

**What's already built — do NOT reinvent:**
- `@arcade/shared/audio` (SH2-16/17, star-wars pins `#v0.12.0`) exposes
  `startLoop(name)`/`stopLoop(name)` — a looping sample per channel with voice-stealing.
  A dedicated `"music"` channel = one looping track that swaps on demand. That IS the
  music channel.
- `src/shell/audio.ts` already constructs the shared engine but only re-exposes
  resume/play/speak/ready. Story surfaces startLoop/stopLoop + adds a MUSIC manifest +
  `music` channel; `src/main.ts` adds a `case 'music'` arm to the exhaustive event switch.

**What the story adds (the TDD-able core — TEA's RED focus):**
- A music-cue `GameEvent` in `core/events.ts` (follow the `SpeechEvent`/`SpeechLine`
  string-literal-union template; exhaustive switch guarded by the `never` default).
- Emitted from `core/sim.ts` on **phase edges only** (the enterPhase machinery), track per
  ROM map (space `$24/$25`, towers `$20/$21`, trench `$22`), Imperial March when
  wave>=3 && odd (`sub_6838`).
- Determinism: identical input → identical cue sequence; cue fires once per edge and
  **resets on phase entry**. This is the exact class of bug the sw3-4 Reviewer rejected
  ("run two goes silent") — pin it with a test.

**Sourcing (not a blocker):** music is ROM POKEY (sound-board `off_7F61` 26–36); authentic
note tables in `historicalsource/star-wars` (pinned 5355b76, sound-board WS*.MAC,
CR-terminated → `tr '\r' '\n'`). Assets are R2-hosted `.wav` loops (shell concern,
verified by running — not unit-tested). See docs/star-wars-1983-source-findings.md.

**Risks:** (1) the phase-edge reset trap above — highest-value test. (2) Asset production
(transcribe POKEY → .wav → host on R2) is real shell/ops work outside the pure-core TDD
loop; the core work can land and be tested against a stub while assets follow.

**Checklist:** session ✓ · context ✓ (schema-validated) · branch `feat/sw3-5-phase-music-engine`
off develop ✓ · sprint in_progress ✓ · Jira n/a (local tracking). No blocking PRs.

## TEA Assessment

**Tests Required:** Yes
**Reason:** deterministic core feature (a phase-edge `music` GameEvent) + shell integration — TDD applies.

**Test Files:**
- `star-wars/tests/core/music-cue.test.ts` — the `music` GameEvent cued on phase edges: space/towers/trench themes + the Imperial March replacing the space theme at wave≥3 odd (`sub_6838`); fires once per edge (never per-frame — a 60/sec restart would stutter the loop to silence); Imperial March replaces ONLY the space theme; no run-two-silent; determinism.
- `star-wars/tests/shell/music-channel.test.ts` — the `startLoop`/`stopLoop` looping-channel surfaced on the local engine, the `MUSIC` manifest (track→`.wav`), and the `main.ts` `case 'music'` dispatch (`startLoop(event.track)`).

**Tests Written:** 29 tests covering all 5 ACs (21 core + 8 shell)
**Status:** RED — 24 failing, ready for Dev. The 5 core tests that pass are compile-time union pins (`MusicTrack` members, distinctness); every behavioural assertion fails because the `music` event, `startLoop`/`stopLoop`, and `MUSIC` don't exist yet. Verified via `testing-runner` (run `sw3-5-tea-red-2`): 24 failed / 651 passed, failures confined to the two new files, no other suite regressed.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #3 string-literal union over enum + exhaustive switch | core: "is a discriminated `music` variant" / "names four DISTINCT tracks"; shell: "handles the `music` event type" (main.ts `never` default forces the arm) | failing |
| #4 null/undefined (`??` not `||`) | design: non-null `MusicTrack` (no `\| null` field) removes the nullable-falsy trap | n/a by design |
| #8 test quality (no vacuous / no `as any`) | self-check: every test asserts a concrete value; `.not.toContain` cases paired with positive assertions | pass (self) |
| #1 type-safety escapes | no `as any` / `@ts-ignore` in either suite | pass (self) |

**Rules checked:** 4 of the applicable TypeScript lang-review checks (#1/#3/#4/#8); #6/#7/#9–#12 don't apply to a pure-core string-union GameEvent + a data manifest.
**Self-check:** 0 vacuous tests found.

**Environment fix:** synced a drifted `@arcade/shared` install (0.11.0 → the lockfile's v0.12.0) via `npm ci` so the shell suite resolves `./audio` — this had been silently red-ing the pre-existing audio suites (Delivery Finding #1). Lockfile unchanged; node_modules is gitignored.

**Handoff:** To Dev (The Word Burgers) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes — **round 2 (review rework)**. The Reviewer REJECTED round 1 not for a code defect (production code was correct/pure/secure/rule-clean) but because a TDD story's headline invariants were UNPINNED. This pass adds the mutation-proven guards; **production behavior is unchanged** (the one source edit is a single `export`).

**Files Changed (this rework):**
- `star-wars/src/shell/audio.ts` — **[HIGH]** exported `MUSIC_CHANNELS` (was module-private) so the single-channel invariant can be pinned by a test. Value/behavior unchanged.
- `star-wars/tests/shell/music-channel.test.ts` — **[HIGH]** new `describe` "the music channel is single (AC1)": asserts `new Set(Object.values(MUSIC_CHANNELS)).size === 1` (all four tracks on ONE channel = the voice-steal that guarantees one loop) + a channel-coverage pin.
- `star-wars/tests/shell/audio.test.ts` — **[MEDIUM]** new test: music always loads from the FIXED music R2 base even when a custom SFX base is passed to `createAudioEngine` (music fetches identified by manifest filename, then asserted under `MUSIC_R2`, not the custom base).
- `star-wars/tests/core/music-cue.test.ts` — **[LOW]** folded the two tautological `it()` blocks (which inspected only the local `MUSIC_TRACKS` fixture) into one behavioral test — "every MusicTrack the union declares is emitted by a real phase edge"; the `MusicTrack[]` compile-time union pin is retained; dropped the now-unused `GameEvent` import.

*(Round-1 production files — `core/events.ts`, `core/sim.ts`, `src/main.ts`, and the wiring in `audio.ts` — are unchanged this pass; see the round-1 file list in git history / the original assessment for the full feature implementation.)*

**Mutation-verified (the guards are real, not vacuous — the exact regressions the Reviewer proved):**
- `MUSIC_CHANNELS.imperialMarch: 'music' → 'music-imperial'` ⇒ single-channel test FAILS (`expected 2 to be 1`). Reverted.
- music engine `baseUrl: DEFAULT_MUSIC_BASE_URL → baseUrl` (custom SFX param) ⇒ music-base test FAILS (`startsWith(MUSIC_R2)` false). Reverted.

**Tests:** 677/677 passing (GREEN, +2 net vs round-1's 675). Build `tsc --noEmit && vite build` clean (no unused-import errors). Verified via `testing-runner` runs `sw3-5-dev-green-rework` and `sw3-5-dev-green-final` — 63 files, 0 failures.

**Reviewer findings addressed:** [HIGH] AC1 single-channel invariant ✓ pinned + mutation-verified · [MEDIUM] music-base decoupling ✓ pinned + mutation-verified · [LOW] tautological music-cue tests ✓ folded into a behavioral test · [LOW] main.ts regex co-location — **deferred** per the Reviewer (pre-existing/systemic; captured as the Reviewer's Delivery Finding, NOT required for this rework).

**ACs:** AC1 looping channel + single-channel invariant NOW PINNED ✓ · AC2 phase-edge cues (space/towers/trench) ✓ · AC3 Imperial March at wave>=3 odd (`sub_6838`) ✓ · AC4 deterministic + edge-once ✓ · AC5 shell MUSIC manifest + `main.ts` dispatch ✓.

**Branch:** `feat/sw3-5-phase-music-engine` (pushed to origin, commit `672a683`).

**Handoff:** To review (Immortan Joe).

## Subagent Results

> **Round 2 (re-review of the rework delta `672a683`).** The round-1 table is preserved in git history; this reflects the specialists dispatched against the rework.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (677 green, tsc+vite clean, 0 smells; GameEvent-import removal confirmed clean) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | clean | none — all 3 round-1 gaps mutation-verified CLOSED (single-channel, music-base, folded-behavioral) | confirmed 3 round-1 findings CLOSED; 1 minor redundant-test note (non-blocking) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 (rule #2/#13: `MUSIC_CHANNELS` newly exported without `as const`/`Readonly<>`, unlike sibling `MUSIC`/`SPEECH`) | confirmed 1 → downgraded to [LOW] non-blocking (latent, unexploited, client-only) |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 1 confirmed [LOW] non-blocking (mutable exported map); 3 round-1 blocking findings mutation-verified CLOSED; 0 dismissed

## Reviewer Assessment

**Verdict:** APPROVED

**Round 2 — the round-1 rejection is fully addressed.** I rejected round 1 because this TDD story's headline invariant (AC1: exactly one looping track at a time) and the music-base decoupling were unpinned — both survived one-line mutations with the whole suite green. The rework adds the guards, and I independently **mutation-verified** that each one now fails under exactly the regression it must catch. The production code is unchanged except a single `export` keyword; behavior is identical. 677/677 green, `tsc --noEmit` + `vite build` clean.

**Round-1 findings — disposition:**

| Round-1 severity | Finding | Status | Evidence |
|----------|---------|--------|----------|
| [HIGH] | AC1 single-channel invariant unpinned (`MUSIC_CHANNELS`) | ✅ CLOSED | Exported `MUSIC_CHANNELS`; new test asserts `new Set(Object.values(MUSIC_CHANNELS)).size === 1`. Mutation `imperialMarch:'music'→'music-imperial'` ⇒ `music-channel.test.ts:66` FAILS (`expected 2 to be 1`). Reverted. |
| [MEDIUM] | Music base decoupling unpinned | ✅ CLOSED | New test in `audio.test.ts` identifies music fetches by manifest filename and asserts each resolves under the fixed `MUSIC_R2`. Mutation coupling music `baseUrl` to the custom SFX param ⇒ `audio.test.ts:139` FAILS. Reverted. |
| [LOW] | Two tautological `music-cue` `it()` blocks | ✅ CLOSED | Folded into one behavioral "emits every MusicTrack across real phase edges" test; `MusicTrack[]` compile pin retained. Independently verified: disabling the Imperial-March gate in `sim.ts` ⇒ the folded test FAILS (`Set` missing `imperialMarch`). No coverage lost. |
| [LOW] | `main.ts` wiring regex co-location | ⏸ DEFERRED (unchanged) | Pre-existing/systemic; never required for this rework. Still captured as the Reviewer Delivery Finding for a codebase-wide follow-up. |

**New finding this round (non-blocking):**

| Severity | Issue | Location | Recommendation |
|----------|-------|----------|----------------|
| [LOW] | `MUSIC_CHANNELS` was newly `export`ed as a **mutable** `Record<MusicName, string>` (no `as const`/`Readonly<>`), unlike its `as const` siblings `MUSIC`/`SPEECH`. The shared engine reads `channels` by live reference, so first-party runtime reassignment could silently retarget the single-channel voice-steal AC1 relies on. Latent, unexploited (tests only read it), client-only game. | `star-wars/src/shell/audio.ts:79` | `export const MUSIC_CHANNELS: Readonly<Record<MusicName, string>> = {…}` on the next touch. Captured as a Delivery Finding. Not blocking (Low; type/hardening, not a live defect). |

**Why APPROVE and not a third rejection:** the two BLOCKING round-1 findings are mutation-proven closed; the story's core promise is now impossible to break silently by a source edit — exactly the TDD bar I rejected for. The one new finding is LOW: a defensive-typing/consistency nit on a static string map, latent and unexploited, no untrusted code in a client-only game, fixable in one token on the next touch. Per the severity table, Low/Medium do not block; recycling the whole TEA→Dev→review loop for a one-token `Readonly<>` would be disproportionate. I record it, I do not dismiss it.

### Subagent dispatch (all specialists)
- [TEST] — test-analyzer (ENABLED): **clean.** Independently mutation-verified all three round-1 gaps are CLOSED (single-channel `expected 2 to be 1`; music-base `startsWith(MUSIC_R2)` false; folded test loses `imperialMarch` when the gate is disabled). Left the tree clean. One minor note: the second new `music-channel` test ("declares a channel for exactly the four core tracks") overlaps TS's own `Record<MusicName,…>` exhaustiveness — redundant but not vacuous (reads production), low marginal value, not worth a change.
- [RULE] — rule-checker (ENABLED): **1 finding** → the mutable exported `MUSIC_CHANNELS` (rule #2 missing-readonly + #13 fix-regression). Confirmed real, downgraded to [LOW] non-blocking (see above). All other 12 checks clean across 15 instances: no type escapes, `import type { MusicTrack }` correctly type-only after `GameEvent` dropped (no dangling import — `tsc` clean), `?? ''` correct nullish usage, the three new tests read production not fixtures.
- [SEC] — security (ENABLED): **clean.** Exporting a static string map widens no attack surface; `MusicTrack ⊆ MusicName` remain closed unions (no arbitrary string reaches `fetch`); new tests only touch `vi.stubGlobal('fetch')` mocks; the `core/` test imports only `src/core/*` + vitest (purity intact).
- [EDGE] — edge-hunter: N/A (disabled). I checked the delta's boundaries myself: the folded test's four edges reach all four tracks; the music-base test's filename filter is base-independent (not fooled by a URL-prefix coincidence).
- [SILENT] — silent-failure-hunter: N/A (disabled). No new error paths in the delta; the `?? ''` fallback feeds a `Set.has` lookup and cannot mask a failure.
- [DOC] — comment-analyzer: N/A (disabled). The added comments accurately describe the guards (the "mutation-proven" rationale matches the verified behavior); the `export` comment states the AC1-testability reason.
- [TYPE] — type-design: N/A (disabled). The one type-relevant point (mutable exported record) was caught by rule-checker and is the [LOW] above; `MusicTrack`/`MusicName` remain idiomatic closed unions.
- [SIMPLE] — simplifier: N/A (disabled). The fold REMOVED complexity (2 tautologies → 1 behavioral test); no dead code introduced.

### Rule Compliance (TypeScript lang-review checklist)
Rule-checker enumerated all 13 checks across 15 instances in the delta; I cross-checked the load-bearing ones:
- #1 type-safety escapes: no `as any`/`@ts-ignore`/unsafe `!` introduced. Compliant.
- #2 generic/interface: the ONE finding — exported `MUSIC_CHANNELS: Record<MusicName, string>` lacks `readonly`/`as const` (its siblings have it). Confirmed [LOW], non-blocking. `Record<MusicName, string>` (not `Record<string, any>`) is otherwise a proper keyed record.
- #4 null/undefined: `u.split('/').pop() ?? ''` — correct `??` (not `||`); `.pop()` is `string | undefined`, `''` is a safe `Set.has` argument. Compliant.
- #5 module/declaration: `import type { MusicTrack }` is type-only-correct; `GameEvent` cleanly removed (0 remaining type references — `tsc` clean, no unused import). `MUSIC`/`MUSIC_CHANNELS` imported as runtime values (used via `Object.values`). Compliant.
- #8 test quality: the three new/folded tests all read PRODUCTION values (`MUSIC_CHANNELS`, `MUSIC`, real `stepGame` edges), not local fixtures — the exact tautology class I rejected round 1 for. Mutation-verified non-vacuous. Compliant.
- #13 fix-regression meta-check: the fix added no `as any`, no `||`-for-`??`, no dangling import, lost no coverage — except it introduced the mutable-export ([LOW] above).

### Observations (≥5)
- [VERIFIED] AC1 single-channel invariant now PINNED — evidence: `music-channel.test.ts:64-66` reads `Object.values(MUSIC_CHANNELS)` from the production export and asserts `Set size === 1`; mutation to a second channel value fails it (`expected 2 to be 1`). Precisely the round-1 [HIGH] hole, now closed. Meets the TDD "core promise unbreakable-silently" bar.
- [VERIFIED] Music-base decoupling PINNED — evidence: `audio.test.ts:134-141` filters `fetched` by manifest filename (base-independent) and asserts each music URL `startsWith(MUSIC_R2)` and NOT the custom base; coupling `baseUrl` to the custom param fails it. Round-1 [MEDIUM] closed.
- [VERIFIED] Folded music-cue test is behavioral — evidence: `music-cue.test.ts:83-106` drives `stepGame` through four real edges and asserts the emitted `music`-event set equals the `MusicTrack` union; disabling the March gate in `sim.ts` fails it. The removed blocks were tautological (inspected only the local `MUSIC_TRACKS` fixture); the compile pin survives. Round-1 [LOW] closed, no coverage lost.
- [LOW][RULE] Exported `MUSIC_CHANNELS` is a mutable `Record` — `src/shell/audio.ts:79`. Latent mutability of the AC1-critical channel map; recommend `Readonly<>`. Non-blocking.
- [LOW][TEST] `music-channel.test.ts` "declares a channel for exactly the four core tracks" is redundant with TS `Record` exhaustiveness — reads production so not vacuous; low marginal value, keep.
- [VERIFIED] No production behavior change — evidence: the only `src/` edit is `const MUSIC_CHANNELS` → `export const MUSIC_CHANNELS`; `git show HEAD` confirms every other change is under `tests/`. The round-1 production audit (core purity, wave gate, exhaustiveness, edge-only emission, determinism — all VERIFIED) therefore still stands unaltered.
- [VERIFIED] Working tree clean after concurrent subagent mutations — evidence: `git status --short` empty, `git diff` empty, `HEAD = 672a683`. Two specialists mutated the same files in parallel; both reverted cleanly with no race residue.

### Data flow traced
Unchanged from round 1 and re-confirmed: `musicTrackFor(phase, wave)` (pure core, closed `MusicTrack`) → `events.push({type:'music', track})` → `main.ts` `case 'music'` → `audio.startLoop(event.track)` → shared music engine → voice-steal on the single `'music'` channel (`MUSIC_CHANNELS`) → `fetch(DEFAULT_MUSIC_BASE_URL + MUSIC[track])`. The value is a compile-time-bounded union; both URLs are hardcoded literals. The round-1 coverage weakness on this path (the single-channel voice-steal was untested) is now closed by the new `music-channel.test.ts` guard. The only residual note is the [LOW] that the channel map, now public, is runtime-mutable — a defense-in-depth gap, not a live hole.

### Devil's Advocate
Assume this rework is a rubber-stamp. What could still be wrong? First, the guards could be theatre — tests that assert something trivially true. I did not take that on faith: I re-ran each mutation the round-1 rejection named and watched the corresponding new test go red (`expected 2 to be 1` for the channel map; `startsWith(MUSIC_R2)` false for the base; a missing `imperialMarch` for the fold), then confirmed the tree was restored. These are real guards. Second, the fold could have quietly DELETED coverage while looking like a refactor — the classic "tidy the tests, lose the safety." But the two removed blocks only ever inspected a local `MUSIC_TRACKS` array (asserting a value equals what was just built from it), the `MusicTrack[]` compile pin is retained, and "four distinct .wav files" is still pinned in `music-channel.test.ts` — so the fold strictly ADDED behavioral coverage. Third — the sharpest one — the very act of exporting `MUSIC_CHANNELS` to prove AC1 made AC1 runtime-mutable: the shared engine reads the map by reference, so `MUSIC_CHANNELS.trench = 'music-trench'` at runtime would give the trench theme its own channel and two loops could ring, and the static `Set size === 1` test would never notice because it inspects the frozen-at-import definition, not the live object. That is a genuine gap — but a shallow one: no code mutates it, nothing untrusted runs in this client-only cabinet, and the fix is a one-token `Readonly<>`. It is a LOW hardening item, not the LIVE hole I rejected round 1 for (where any source edit sailed through green). Fourth, a confused contributor could read the redundant channel-keys test as load-bearing and fear deleting it — mild, harmless. Fifth, the feature stays inaudible until the four `.wav` assets are transcribed and uploaded — but that was always scoped out (TEA/Dev Delivery Findings), and no test claims otherwise. None of these rise to blocking. The story now does what a TDD story must: its headline promise fails loudly the instant someone breaks it.

**Handoff:** To SM (The Organic Mechanic) for finish-story. The [LOW] mutable-export and the deferred regex co-location are non-blocking Delivery Findings for a future `audio.ts`/tests touch, not rework for sw3-5.