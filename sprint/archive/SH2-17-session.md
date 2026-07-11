---
story_id: "SH2-17"
jira_key: ""
epic: "SH2"
workflow: "tdd"
---
# Story SH2-17: Migrate star-wars, asteroids onto @arcade/shared/audio (consumes SH2-16) [battlezone descoped]

## Story Details
- **ID:** SH2-17
- **Title:** Migrate star-wars, asteroids onto @arcade/shared/audio (consumes SH2-16) [battlezone descoped]
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Epic:** SH2 — Shared render surface — extract font/glow/view/compositor into @arcade/shared and converge the cabinet on one vector treatment
- **Points:** 5
- **Priority:** p2
- **Stack Parent:** SH2-16 (shared audio engine extraction — completed)
- **Branch:** feat/SH2-17-shared-audio-migration (active in star-wars, asteroids, arcade-shared; battlezone branch created but UNUSED — descoped)

## Story Context & Technical Approach

### Scope

Migrate the three remaining canvas games (star-wars, asteroids, battlezone) from their hand-rolled WebAudio SFX engines onto the shared `createAudioEngine` from `@arcade/shared/audio` (delivered by SH2-16). This completes the cabinet-wide SFX engine convergence.

Design reference: `docs/superpowers/specs/2026-07-11-shared-audio-extraction-design.md`.

### Per-Game Migration Strategy

#### asteroids
- **Current:** `src/shell/audio.ts` (244 lines) with `SampleId` / file-keyed buffer indirection
- **Delete:** Local engine body (getAudioContextCtor, createBufferSource, channel-stealing logic)
- **Keep:** Manifest constants (SOUNDS, CHANNELS, baseUrl, masterGain) and audio-dispatch.ts
- **Change:** Remove the `SampleId` indirection — the shared engine's filename-keyed buffer store handles multiple names → one file natively
- **Test:** vitest + vite build green; manual run confirms SFX/loops audibly unchanged
- **Outcome:** No asteroids-specific branching in shared code

#### battlezone — DESCOPED (2026-07-11, user-approved during RED)
- **Not migrated.** `src/shell/audio.ts` is a runtime SYNTHESIS engine (oscillators,
  filtered noise bursts, LFOs) with a continuous `setEngine(throttle)`/`stopEngine()`
  hum API and **zero sample files** — NOT the sample player the design survey assumed
  ("mirrors tempest" was a line-count guess). The shared engine is sample-only, so
  battlezone cannot migrate behaviour-preservingly. Left untouched on its synthesis
  engine. SM amends epic-SH2.yaml SH2-17 (title/repos/AC-4) at finish. See Delivery
  Findings + Design Deviations.

#### star-wars
- **Current:** `src/shell/audio.ts` (198 lines) + TMS5220 LPC speech subsystem (`speak()` + 23-line catalogue + lazy loader)
- **Delete:** Local SFX engine body only (buffer loading, channel-stealing, resume/play/loop methods)
- **Keep:** Speech subsystem (speak() + LPC catalogue + lazy loader) at game-side
- **Decision Point:** If speech needs the gesture-unlocked AudioContext, add a read-only `context(): AudioContext | null` accessor to AudioEngine (proves the extension point, the way tempest proved glow's gradient superset)
- **Test:** vitest + vite build green; manual run confirms SFX AND speech both fire

### Key Technical Points

**1. Filename-Keyed Buffer Resolution**

The shared engine keys buffers by filename, resolving `name → file → buffer` at play time. asteroids' multiple names mapping to one `.wav` simply list all names in the manifest:

```typescript
// Before (asteroids-specific indirection):
type SampleId = /* N:1 indirection */
play(name: SoundName) => { const file = SAMPLE_TO_FILE[name]; /* fetch SAMPLE_TO_FILE[name] once */ }

// After (shared filename-keyed store):
const SOUNDS = { /* name → filename, N:1 list naturally */ }
createAudioEngine({ sounds: SOUNDS, channels: CHANNELS })
```

No asteroids-specific branch enters shared code.

**2. Star-Wars Speech Context (Deferred Decision)**

star-wars' LPC speech loader may need the gesture-unlocked `AudioContext` to avoid spinning a second one. The decision is made during RED/GREEN based on empirical need:
- If speech works unchanged on its own context: no change to AudioEngine.
- If speech needs to piggyback on the engine's context: add `context(): AudioContext | null` to the AudioEngine interface (optional addition, validated at consumer).

Document the choice in the RED phase findings.

**3. Per-Cabinet NUMBERS Stay Game-Side**

Each game keeps:
- SOUNDS: Record<SoundName, string> — logical name → filename
- CHANNELS: Record<SoundName, string> — sound → channel
- baseUrl: string — where .wav files live
- masterGain?: number — optional master volume
- audio-dispatch.ts — event→sound wiring

### Acceptance Criteria

1. **SFX Engine Migration:**
   - star-wars, asteroids, and battlezone each construct their SFX engine via `createAudioEngine(manifest)` at a pinned `@arcade/shared/audio` ref (bumped from SH2-16's provisional to a released tag once SH2-16 finishes).
   - Each game's local engine body (getAudioContextCtor, createBufferSource, channel-stealing, load loop) is deleted.
   - Manifest + audio-dispatch.ts remain untouched in each game.

2. **asteroids Variation:**
   - asteroids' `SampleId` / file-keyed indirection is removed.
   - Multiple-names-per-file sounds resolve through the shared filename-keyed buffer store without asteroids-specific branching in shared code.
   - asteroids vitest + vite build are green; SFX audibly unchanged.

3. **Star-Wars Speech:**
   - star-wars keeps its speech working (`speak()` + LPC catalogue still fires).
   - If speech needs the shared engine's AudioContext, a read-only `context(): AudioContext | null` accessor is added to AudioEngine (documented in story context).
   - star-wars vitest + vite build are green; speech audibly unchanged.

4. **Battlezone — DESCOPED.** Not an AC anymore. battlezone's audio is runtime
   synthesis (no samples), incompatible with the sample-based shared engine; it is left
   unchanged. SM amends epic-SH2.yaml SH2-17 (title/repos/AC-4) at finish.

5. **Manual Verification:**
   - Each of the three games plays SFX, sustained loops, and channel voice-stealing correctly on a manual run.
   - Arcade lobby high-score display (no audio change) still works.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-11T15:04:06Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-11T14:02:51Z | 2026-07-11T14:06:07Z | 3m 16s |
| red | 2026-07-11T14:06:07Z | 2026-07-11T14:46:47Z | 40m 40s |
| green | 2026-07-11T14:46:47Z | 2026-07-11T14:57:33Z | 10m 46s |
| review | 2026-07-11T14:57:33Z | 2026-07-11T15:04:06Z | 6m 33s |
| finish | 2026-07-11T15:04:06Z | - | - |

## Sm Assessment

**Decision:** Route to TEA (O'Brien) for the RED phase. Setup complete and gate-clean.

**Rationale:**
- **Dependency satisfied.** SH2-17 `depends_on: SH2-16`, which is `done` (completed 2026-07-11). The shared `@arcade/shared/audio` subpath exists and is consumable; no publish→consume block remains.
- **Merge gate clear.** 0 in-progress, 0 in-review stories, no blocking open PRs.
- **Multi-repo scope confirmed.** star-wars, asteroids, battlezone each migrate off their hand-rolled SFX engine; arcade-shared may gain a minimal read-only `context()` accessor on `AudioEngine` ONLY if star-wars speech empirically needs the shared gesture-unlocked `AudioContext` (star-wars proves the extension point — mirror how tempest proved glow's gradient superset). Branch `feat/SH2-17-shared-audio-migration` created in all four repos (game repos target `develop`, gitflow).
- **Workflow:** tdd (phased) → red → green → review → finish. Next owner: TEA.

**Coordination notes for TEA (O'Brien):**
- Behaviour-preserving throughout — same sounds, same channels, same POKEY voice-stealing. Tests should pin per-game parity, not re-test the shared engine (SH2-16 already validated `createAudioEngine` against a fake AudioContext; reuse those as reference).
- asteroids DROPS its bespoke `SampleId`/file-keyed indirection — the shared filename-keyed buffer store already handles its several-names→one-file case. Assert no asteroids-specific branch leaks into shared code.
- star-wars KEEPS its TMS5220 LPC speech subsystem game-side. The `context()` accessor is a conditional, evidence-driven extension — only add it if speech actually needs the shared context; otherwise speech runs unchanged.
- Pin/ref: games consume `@arcade/shared/audio` at a pinned git-URL ref. Provisional feat-branch pin is acceptable during the story; it gets tagged/bumped at release (per the cabinet's established publish→consume pattern). Fetch + diff each feat branch against `origin/develop` — local develop refs go stale.

**Gate:** session exists ✓ · fields set ✓ · context written (technical approach + ACs) ✓ · branches created ✓ · Jira explicitly skipped (local tracking) ✓.

## TEA Assessment

**Phase:** finish (test design)
**Tests Required:** Yes
**Status:** RED — failing, ready for Dev (Julia)

**Scope note:** battlezone DESCOPED during RED (user-approved) — synthesis engine, not a
sample-engine consumer. RED covers the two migratable games only.

**Test Files:**
- `star-wars/tests/shell/audio-migration.test.ts` — 6 tests (3 RED drivers + 3 guardrails)
- `asteroids/tests/audio-migration.test.ts` — 6 tests (4 RED drivers + 2 guardrails)

**Tests Written:** 12 tests covering AC-1 (adopt shared engine, delete local body),
AC-2 (asteroids drop SampleId), AC-3 (star-wars keeps speech — guardrail). Contract
altitude, mirroring the SH2-8 glow-adoption idiom: assert the migration HAPPENED, not
HOW. Behavioural parity is guaranteed by each game's EXISTING behavioural net, which
stays green through the migration (star-wars `audio.test.ts` 20✓; asteroids
`audio-dispatch.test.ts` 19✓).

**RED verification (testing-runner, RUN_ID SH2-17-tea-red2):**
- star-wars migration file: `3 failed | 3 passed` — FAIL: adoption (no `@arcade/shared/audio`
  import), resolution (`./audio` not exported at the current pin), body-deletion
  (`Map<SoundName, AudioBuffer>` SFX store still present). PASS: SOUNDS+R2 base guardrail,
  SPEECH+speak guardrail, git-URL pin guardrail.
- asteroids migration file: `4 failed | 2 passed` — FAIL: adoption, resolution, SampleId
  removal (`SampleId`/`SAMPLE_FILES` still present), body-deletion (getAudioContextCtor/
  createBufferSource/decodeAudioData still present). PASS: SoundName+R2 base guardrail,
  git-URL pin guardrail.
- Each driver fails on its own merit (the resolution import is `/* @vite-ignore */` +
  a variable specifier so the missing subpath does not blank the whole file at collection).

**Turning RED → GREEN (for Julia):**
1. Bump each game's `@arcade/shared` pin `#v0.11.0` → `#v0.12.0` and REINSTALL (force past
   the git-dep lock staleness — installed is a stale 0.10.0). tempest is the working
   reference consumer (`tempest/src/shell/audio.ts`).
2. star-wars & asteroids: delete the engine body, construct `createAudioEngine(manifest)`,
   keep the NUMBERS. asteroids: drop `SampleId`/`SAMPLE_FILES`; relocate the heartbeat
   lub-DUB alternation into the local wrapper (keep `play('heartbeat')` in the dispatcher).
   star-wars: keep the speech subsystem; resolve the `context()` decision (see Findings).
3. Give each one-shot a distinct channel (steal-vs-stack convergence — see Findings).
4. Manual run each game (SFX, loops, voice-stealing; star-wars speech) — AC-5.

### Rule Coverage

| Rule (typescript.md) | Covered by | Status |
|---|---|---|
| #8 test-quality (meaningful asserts, no `as any`, reads `src` not `dist`) | all 12 new tests (regex + typeof, messaged) | enforced |
| project: share the VERB, keep the NUMBERS local | NUMBERS guardrails (SOUNDS/SFX_BASE/SoundName stay) | enforced |
| project: pin contracts via source-regex/runtime, never compile-only (arcade-shared untyped) | all drivers are `node:fs` text or runtime `import()` | enforced |
| #5 `.js` ext / ESM dist resolution | NOT in RED — Dev/Reviewer watch-item (SH2-12 precedent: extensionless intra-pkg import broke Node ESM). Applies IF arcade-shared gains `context()`. | flagged |
| #1–#4, #7, #11 (type-safety, null, async, errors) | target Dev's forthcoming impl; enforced at Dev self-review + Reviewer + each game's existing behavioural net | deferred |

**Rules checked:** the applicable structural + project rules have coverage; runtime-logic
rules are deferred to Dev self-review / Reviewer (no new logic exists to test in RED —
this is an adoption migration guarded by the games' existing behavioural suites).
**Self-check:** 0 vacuous tests (every `it` has a messaged assertion; no `let _ =`,
no `assert(true)`, no always-null checks).

**Handoff:** To Dev (Julia) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes (star-wars + asteroids; battlezone descoped in RED)
**Status:** GREEN

**Files Changed:**
- `asteroids/src/shell/audio.ts` — construct the shared engine from the manifest; delete
  the hand-rolled engine body; drop the `SampleId`/`SAMPLE_FILES` file-keyed indirection;
  relocate the heartbeat lub-DUB alternation into a local `play()` wrapper (dispatcher
  keeps `play('heartbeat')`); each one-shot on its own channel. `SoundName` +
  `audio-dispatch.ts` unchanged.
- `asteroids/package.json` (+ lock) — `@arcade/shared` pin `#v0.11.0` → `#v0.12.0`.
- `star-wars/src/shell/audio.ts` — SFX via the shared engine (SFX buffer store deleted);
  TMS5220 LPC speech kept game-side on its own gesture-unlocked context (AC-3 option B);
  each SFX on its own channel. `SOUNDS`/`SPEECH`/`SoundName`/`SpeechName` +
  `createAudioEngine` surface unchanged.
- `star-wars/package.json` (+ lock) — `@arcade/shared` pin `#v0.11.0` → `#v0.12.0`.
- NO arcade-shared change (option B); the setup feat branch there is unused.

**Tests (testing-runner, RUN_ID SH2-17-dev-green + reruns):**
- asteroids: `vitest` 822/822 passed (incl. `audio-migration.test.ts` 6/6 and the existing
  `audio-dispatch.test.ts` 19/19); `npm run build` (tsc + vite) green.
- star-wars: `vitest` 624/624 passed (incl. `audio-migration.test.ts` and the existing
  `audio.test.ts` speech/SFX suite 20/20); `npm run build` green.

**Branches (pushed):**
- asteroids `feat/SH2-17-shared-audio-migration`
- star-wars `feat/SH2-17-shared-audio-migration`

**AC status:** AC-1 ✓ (both adopt shared engine, local body deleted) · AC-2 ✓ (SampleId
gone, heartbeat preserved via wrapper) · AC-3 ✓ (speech works, own-context path
documented) · AC-4 n/a (battlezone descoped) · AC-5 pending a human audible run (see
Delivery Findings — not automatable here).

**Handoff:** To Reviewer (The Thought Police) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (star-wars 624/624 + build✓; asteroids 822/822 + build✓; 0 smells, no dead code) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — reviewer self-assessed (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — reviewer self-assessed (see [SILENT]) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — reviewer self-assessed (see [TEST]) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — reviewer self-assessed (see [DOC]) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — reviewer self-assessed (see [TYPE]) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — reviewer self-assessed (see [SEC]) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — reviewer self-assessed (see [SIMPLE]) |
| 9 | reviewer-rule-checker | No | Skipped | disabled | Disabled via settings — reviewer self-assessed (see [RULE] + Rule Compliance) |

**All received:** Yes (1 enabled subagent returned; 8 disabled via `workflow.reviewer_subagents` and self-assessed)
**Total findings:** 0 confirmed blocking, 0 dismissed, 2 non-blocking observations (steal-vs-stack MEDIUM; play('thrust') loosening LOW)

## Reviewer Assessment

**Verdict:** APPROVED

Behaviour-preserving migration of star-wars + asteroids onto `@arcade/shared/audio`
(v0.12.0). Both suites green (624 + 822), both builds green, no dead code, no debug, no
Critical/High. battlezone correctly descoped in RED. I traced every path against the
pre-migration engines; the only behaviour changes are the intended, documented ones.

**Data flow traced:** a core `GameEvent` → `audio-dispatch.ts` (untouched) →
`engine.play/startLoop/stopLoop(SoundName)` → (asteroids) local wrapper resolves
`'heartbeat'`→`heartbeatLow/High` and delegates the rest → shared `createAudioEngine`
resolves `name → CHANNELS[name]` + `SOUNDS[name]` → fetch/decode (once per filename) →
`AudioBufferSourceNode` on a per-sound channel. Safe: all inputs are compile-time
`SoundName`s; every failure path is a silent no-op.

**Observations (7):**
- `[VERIFIED]` asteroids loop channel-sharing preserved — `saucerSiren`+`saucerSirenSmall`
  both map to channel `'saucer-siren'` (audio.ts CHANNELS), so only one siren rings;
  `stopLoop('saucerSirenSmall')` stops that shared channel. Matches the old
  `stopChannel('saucerSiren')` behaviour. audio-dispatch.test.ts 19/19 green.
- `[VERIFIED]` heartbeat alternation identical — new `beatHigh?heartbeatHigh:heartbeatLow`
  with `heartbeatLow='beat1.wav'` starts at beat1 and toggles, exactly as old
  `beatHigh?'beat2':'beat1'`. `beatHigh` also advances when unloaded, matching the old
  no-op-then-toggle. asteroids/src/shell/audio.ts play() wrapper.
- `[VERIFIED]` same 9 distinct files fetched — `new Set(Object.values(SOUNDS))` dedupes
  `bangLarge.wav` (explosionShip+explosionLarge), yielding the identical 9-file set the
  old `SAMPLE_FILES` fetched. No new/dropped assets.
- `[VERIFIED]` star-wars speech preserved — `speak()` keeps its own gesture-unlocked
  `AudioContext` with its own `0.4` master gain (audio.ts resume/playSpeech); lazy load +
  in-flight coalescing (`speechLoading`) intact. audio.test.ts speech suite 20/20 green.
- `[MEDIUM]` steal-vs-stack convergence — one-shots now cut in on rapid SAME-sound
  retrigger (each on its own channel) instead of stacking (old fire-and-forget). This is
  the epic's shared VERB (as tempest 10-10), a logged deviation. NOT a code defect;
  requires the AC-5 human ear check to bless per cabinet. Non-blocking.
- `[LOW]` asteroids `play('thrust'|'saucerSiren'|'saucerSirenSmall')` would now one-shot
  the loop sample (old play() no-op'd them). Unreachable — the dispatcher only ever
  `startLoop`s those names (audio-dispatch.ts) — so latent, not live. Non-blocking.
- `[VERIFIED]` no dead code / debug — old `ctx/master/buffers/load/playSample/stopChannel`
  fully removed in asteroids; `getAudioContextCtor` retained ONLY for the still-needed
  speech context in star-wars. Preflight grep: 0 console/debugger/TODO/skip.

**Subagent-domain self-assessment (8 disabled specialists):**
- `[EDGE]` (self): pre-`resume()` play/speak → no-op (ctx null); double-`resume()` idempotent
  (shared engine guards + `if (!speechCtx)`); play before load → silent no-op with correct
  beatHigh advance. No unhandled boundary.
- `[SILENT]` (self): the empty `catch {}` in `playSpeech` and the shared engine are the
  INTENTIONAL silent-degrade design principle ("audio never crashes the frame"), commented
  and matching the pre-migration engine + all sibling cabinets. Not a swallowed error.
- `[TEST]` (self): the two migration tests are meaningful structural guards (adoption /
  resolution / body-deletion / SampleId / guardrails), all messaged assertions, no `as any`,
  read `src` not `dist`; behavioural parity is held by the existing suites (624 + 822 green).
- `[DOC]` (self): comments updated and accurate — SOUNDS N:1 + heartbeat notes correct;
  interface docstrings match; no stale references to the removed engine internals.
- `[TYPE]` (self): proper generics (`SharedAudioEngine<SoundName|SampleName>`), no `as any`
  / no `!` / no double-cast; exhaustiveness protection preserved via the type system (a new
  `SoundName` absent from `SOUNDS` fails to compile at `engine.play(name)`).
- `[SEC]` (self): client-only WebAudio, no user input, no injection surface, no secrets; the
  R2 base URLs are static constants unchanged from before. Nothing to exploit.
- `[SIMPLE]` (self): minimal wrappers only where required (heartbeat fan-out, loop guards);
  no over-engineering; the migration is a net simplification (hand-rolled engine deleted).
- `[RULE]` (self): see Rule Compliance — typescript.md #1–#12 pass for the changed files.

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md`)
- **#1 Type-safety escapes:** PASS — no new `as any`/`@ts-ignore`/non-null `!`. The
  `globalThis as {…}` shape in star-wars is pre-existing and justified (AudioContext ambient).
- **#2 Generic/interface:** PASS — `Record<SoundName,string>` / `Record<SampleName,string>`,
  `SharedAudioEngine<N>`; no `Record<string,any>`/`Function`/`object`.
- **#3 Enum/exhaustiveness:** PASS — no enums; asteroids' removed `never` switch is replaced
  by type-level exhaustiveness (SampleName) at `engine.play(name)`.
- **#4 Null/undefined:** PASS — `if (!speechCtx)` / `if (cached)` guards; shared engine uses
  `?? DEFAULT_MASTER_GAIN`; no `||` on falsy-valid values.
- **#5 Module/ESM:** PASS — imports the `@arcade/shared/audio` package subpath (no relative
  `.js` extension concern; the SH2-12 precedent was intra-package relative imports).
- **#7 Async:** PASS — speak's fetch chain has a `.catch` (no unhandled rejection);
  fire-and-forget is intentional (lazy load).
- **#8 Test quality:** PASS — meaningful assertions, no `as any`, `src` not `dist`.
- **#11 Error handling:** PASS — `catch {}` is deliberate silent-degrade, documented.
- **#6 (React/JSX), #10 (input validation), #12 (bundle):** N/A — no JSX, no user input,
  no new heavy imports.

### Devil's Advocate
Assume this is broken. Where does it bite? First, the two-context split in star-wars: I now
spin a SECOND `AudioContext` for speech alongside the shared SFX context. A malicious or
merely unlucky user who mashes the unlock gesture, or a browser that caps concurrent
contexts, could leave speech silent while SFX plays — but the code degrades silently and the
cap (~6 in old Chrome, since raised) is far above two, and both unlock on the same gesture,
so the worst case is "speech silent," never a crash. Second, the steal-vs-stack change: a
player who holds fire, or a frame that destroys two same-size rocks at once, will now hear a
single cut-in where they used to hear an overlapping layer. A confused user could read that
as "a sound dropped." This is the epic's deliberate POKEY convergence, but it is the one
thing a human MUST confirm by ear (AC-5) — I cannot bless the mix from a node test that stubs
`AudioContext`. Third, the asteroids `play()` wrapper toggles `beatHigh` even when the buffer
is unloaded; a stressed network that delays decode past the first few heartbeats would
advance the lub/DUB phase with nothing audible — but the OLD engine did exactly this, so it
is not a regression, and once decoded the alternation simply continues. Fourth, `play()` now
accepts loop names and would one-shot them; if some FUTURE code calls `play('thrust')` it
would fire a non-looping thrust blip — latent, currently unreachable, worth a comment but not
a defect. Fifth, could the pin bump serve a stale `dist`? No — both `node_modules/@arcade/shared`
resolve `0.12.0` with `./audio` exported, and both builds compile the generic against the real
manifest. None of these rise to Critical/High; the first two are covered by the logged
deviations and the AC-5 manual gate.

**Handoff:** To SM (Winston Smith) for finish-story. **AC-5 (manual audible run of both
games) remains a human gate** — the code is correct and faithful, but a person must confirm
the mix (esp. the steal-vs-stack convergence) before/at finish.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Conflict** (blocking → resolved by descope): battlezone's audio is a runtime
  synthesis engine (oscillators/noise/LFOs + `setEngine`/`stopEngine` hum, zero samples),
  NOT the sample player the design spec §1 survey assumed. It cannot migrate onto the
  sample-only `@arcade/shared/audio` behaviour-preservingly. Affects
  `sprint/epic-SH2.yaml` (SH2-17 `title`, `repos`, AC-4 must drop battlezone) and
  `battlezone/src/shell/audio.ts` (left unchanged). *User approved descope 2026-07-11.
  SM to amend the epic YAML at finish.* *Found by TEA during test design.*
- **Improvement** (non-blocking): asteroids' `heartbeat` alternates two files
  (`beat1`/`beat2`) via an in-engine `beatHigh` toggle — not expressible in the shared
  `sounds: Record<N, filename>` (one name → one file). Affects
  `asteroids/src/shell/audio.ts` (relocate the toggle to the local `createAudioEngine`
  wrapper; keep `play('heartbeat')` in the dispatcher so `tests/audio-dispatch.test.ts`
  stays green). *Found by TEA during test design.*
- **Question** (non-blocking): star-wars & asteroids one-shots currently STACK
  (fire-and-forget, no channels); the shared engine STEALS per channel. Migrating
  converges them to POKEY-style cut-in on rapid same-sound retrigger (as tempest 10-10).
  Affects both games' channel maps + the AC "audibly unchanged" (judged on the manual
  run). Give each one-shot a distinct channel so different sounds never cut each other.
  *Found by TEA during test design.*
- **Question** (non-blocking): star-wars `speak()` needs the gesture-unlocked context;
  the existing `audio.test.ts` requires `speak()` to fetch after `resume()`. Likely needs
  the read-only `context()` accessor on the shared `AudioEngine` (arcade-shared change →
  new release + second pin bump), unless Dev proves speech runs unchanged on its own
  context. Affects `arcade-shared/src/audio.ts` + `star-wars/src/shell/audio.ts`. *Found
  by TEA during test design.*

### Dev (implementation)
- **Question** (non-blocking): the two TEA "context()" / "heartbeat" open items are
  RESOLVED — heartbeat alternation lives in asteroids' local `play()` wrapper (dispatcher
  unchanged); star-wars speech runs on its own context, so NO `context()` accessor was
  added to `@arcade/shared/audio`. The arcade-shared feat branch
  `feat/SH2-17-shared-audio-migration` is UNUSED and can be deleted at finish (like
  battlezone's). *Found by Dev during implementation.*
- **Question** (non-blocking): AC-5 (manual audible run of star-wars + asteroids — SFX,
  loops, voice-stealing, star-wars speech) is a HUMAN step not automatable here (keydown +
  WebAudio has no unit seam; tests stub AudioContext). The behavioural suites cover the
  logic (star-wars 624✓, asteroids 822✓). Reviewer/Comrade should do the ear check,
  paying attention to the intended steal-vs-stack convergence on rapid same-sound
  retriggers. *Found by Dev during implementation.*

### Reviewer (code review)
- **Question** (blocking on the story, NOT on the code): AC-5 — the manual audible run of
  star-wars + asteroids (SFX, loops, voice-stealing, star-wars speech) is a HUMAN gate not
  performed here. The code is correct and faithful; a person must confirm the mix — chiefly
  the steal-vs-stack convergence on rapid same-sound one-shots — before/at finish. Affects
  the finish step (Comrade to run each game). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): asteroids' `play()` now accepts the loop names
  (`thrust`/`saucerSiren`/`saucerSirenSmall`) and would fire them as one-shots; the old
  `play()` explicitly no-op'd them. Currently unreachable (the dispatcher only `startLoop`s
  those), so latent. Affects `asteroids/src/shell/audio.ts` (a one-line guard or comment
  could harden it if ever called directly). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **battlezone descoped from SH2-17**
  - Spec source: session scope / context-story-SH2-17.md / epic-SH2.yaml SH2-17 (title, repos, AC-4)
  - Spec text: "Migrate star-wars, asteroids, battlezone onto @arcade/shared/audio … battlezone mirrors tempest (behaviour-identical) … same sounds/channels/loops"
  - Implementation: RED tests cover star-wars + asteroids only; no battlezone migration test is written; battlezone/src/shell/audio.ts is left unchanged.
  - Rationale: battlezone's audio is runtime synthesis (oscillators/noise/LFOs, `setEngine`/`stopEngine` hum, zero `.wav` samples); the shared engine is a sample player. Migration is impossible without inventing samples (changing the sound) — violates the epic's behaviour-preserving rule. User approved descope 2026-07-11.
  - Severity: major
  - Forward impact: SM amends epic-SH2.yaml SH2-17 (title/repos/AC-4) at finish; a future story may separately evaluate a battlezone audio path (non-behaviour-preserving).

### Dev (implementation)
- **star-wars speech: own AudioContext (option B), no `context()` accessor added to the shared engine**
  - Spec source: context-story-SH2-17.md AC-3 / design spec §4.2
  - Spec text: "either it shares the shared engine's AudioContext via a newly added read-only context() accessor on AudioEngine … or its speech runs on its own context unchanged" (AC-3 permits both; the context wording calls option A the "cleanest")
  - Implementation: star-wars keeps its speech subsystem on its OWN gesture-unlocked AudioContext (its own 0.4 master gain), constructed in `resume()` alongside the shared SFX engine. No `context()` accessor was added to `@arcade/shared/audio`; both games pin the released v0.12.0 (the arcade-shared feat branch created at setup is unused).
  - Rationale: minimal, self-contained change — avoids modifying the shared engine's public API used by 5 games, avoids a new arcade-shared release + a second (mixed) pin bump. Behaviour is preserved (speech loads lazily and plays at the same 0.4 headroom); the existing `star-wars/tests/shell/audio.test.ts` speech suite stays green. The only trade-off is two AudioContexts (SFX + speech), both unlocked on the same gesture — the "two-context waste" the design flags as acceptable.
  - Severity: minor
  - Forward impact: the `context()` extension point remains unproven/unbuilt; a future consumer that truly needs to share the SFX context would add it then. No cross-repo release needed for SH2-17.
- **star-wars & asteroids one-shots: POKEY voice-stealing (cut-in) replaces stacking**
  - Spec source: context-story-SH2-17.md AC-2/AC-3 ("SFX audibly unchanged") vs epic SH2 "share the VERB" (the shared VERB includes channel voice-stealing)
  - Spec text: "asteroids vitest + vite build are green with SFX audibly unchanged" / "star-wars … speech audibly unchanged"
  - Implementation: both games now give each one-shot its OWN channel (distinct sounds never cut each other), so only a rapid retrigger of the SAME sound cuts in (POKEY-style) instead of stacking. Previously both games' one-shots were fire-and-forget (they stacked/overlapped).
  - Rationale: the shared engine always steals per channel — the cabinet-wide convergence onto the shared VERB (as tempest's 10-10, which deliberately fixed the held-fire pile-up). Distinct per-sound channels minimise the change to same-sound rapid retriggers only.
  - Severity: minor
  - Forward impact: needs a human ear on the manual run (AC-5) to bless that rapid same-sound retriggers reading as cut-in (not stacked) is acceptable per cabinet.

### Reviewer (audit)
- **TEA — battlezone descoped from SH2-17** → ✓ ACCEPTED by Reviewer: verified against
  `battlezone/src/shell/audio.ts` — it is a synthesis engine (oscillators/noise/LFOs +
  `setEngine`/`stopEngine`, zero `.wav`) and the shared engine is a sample player; migration
  is genuinely impossible behaviour-preservingly. User approved. Sound descope.
- **Dev — star-wars speech: own AudioContext (option B), no `context()` accessor** →
  ✓ ACCEPTED by Reviewer: AC-3 explicitly permits "speech runs on its own context
  unchanged"; behaviour is preserved (own 0.4 master, lazy load, coalescing — audio.test.ts
  20/20 green); avoids modifying a 5-consumer shared API + a release. The two-context
  trade-off is real but bounded and silent-degrading. Correct minimalist call.
- **Dev — one-shots: POKEY voice-stealing (cut-in) replaces stacking** → ✓ ACCEPTED by
  Reviewer: this IS the epic SH2 shared VERB (as tempest 10-10), and distinct per-sound
  channels correctly limit stealing to same-sound retriggers. The literal AC "audibly
  unchanged" is superseded by the higher-authority epic convergence rule; the remaining
  judgment ("does it read acceptably?") is the AC-5 human ear check, flagged as a delivery
  finding. Accepted, gated on the manual run.
- No UNDOCUMENTED deviations found — I traced both diffs against the pre-migration engines
  and every behaviour change is one of the three logged above.