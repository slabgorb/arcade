---
story_id: mc8-2
jira_key: mc8-2
epic: mc8
workflow: tdd
---
# Story mc8-2: Audio shell: the POKEY driver and the core-event -> sound mapping

## Story Details
- **ID:** mc8-2
- **Jira Key:** mc8-2
- **Epic:** mc8 (Missile Command — authentic audio)
- **Workflow:** tdd
- **Stack Parent:** mc8-1 (done)
- **Repos:** arcade
- **Branch:** feat/mc8-2-audio-shell-pokey-driver
- **PR:** https://github.com/slabgorb/arcade/pull/87
- **Points:** 5

## Technical Approach

This story implements the spike design (docs/superpowers/specs/2026-08-07-missile-command-mc8-audio-driver-spike.md) by wiring a runtime POKEY driver and the core-event → sound mapping.

**Decision:** Runtime synthesis via the vendored `pokey.js` as an `AudioWorkletProcessor`, driven by per-frame envelope stepping. Reuse `@shared/audio` + `@shared/synth` contracts and degrade silently on failure (contract 5).

### Architecture

1. **Core (pure, purity.test.ts protected):**
   - Sound tables (8 one-shots) transcribed verbatim from W3SOUN (§3 of spike doc), hex, with per-entry W3SOUN line cites
   - Per-frame events list (`GameState.soundEvents: SoundEvent[]`) — plain data, no callbacks
   - `MODSND` stepper as deterministic function: `(tables, frameIndex, rngReader) → registerUpdates[]`
   - Events: `{launched, detonated, icbmKilled, structureDestroyed, ammoEmpty, bonusTick}` (§5 event map)

2. **Shell (src/shell/audio.ts, new):**
   - Stand up `pokey.js` as `AudioWorkletNode`
   - Read `GameState.soundEvents` each frame
   - Drive the stepper, write register sequences to POKEY node
   - Fallback: if worklet integration stalls, switch to `@shared/synth` (battlezone pattern) without changing core
   - Wire into main loop via `main.ts` frame tick

3. **Edge-driven voices (gotcha from spike §5):**
   - Sustained/looping voices (cruise-missile and Sputnik drones) must STOP at pause/game-over edge, not ring through
   - Implement via boot-shell seam: test-mockable audio interface with pause/game-over trigger
   - Proves edge-silence via dedicated test

### Acceptance Criteria

1. `src/shell/audio.ts` drives POKEY from lifted sound commands (§3 tables) and is wired into main.ts; core surfaces any needed events as pure data on GameState; purity.test.ts stays green
2. Each mapped game event (launch, ABM detonation, ICBM kill, city/base destroyed, out-of-ammo, wave-bonus count-up) triggers its sound via the shell; mapping verified by test with mockable audio seam (not real AudioContext)
3. Sustained voices (drone, klaxon) silent at pause/game-over edge; boot-shell test proves edge-silence
4. purity.test.ts, citations.test.ts, and `npx vitest run --project missile-command` all pass

### Key References

- **Spike output:** docs/superpowers/specs/2026-08-07-missile-command-mc8-audio-driver-spike.md
  - §3: full sound tables (EX, LA, TK, BN, WP, LO, XX, NS) with W3SOUN line cites
  - §2.2: sequence data format (STVAL, FRCNT, CHANGE, NUMBER — 4 bytes per step)
  - §5: game-event → sound map (launch, explosion, bonus-tick, etc.)
  - §2.4: parametric drones (cruise/Sputnik descending, gated by CRMONS threat counter)
  - §10: AUDCTL fixed at 0x20; per-register channel binding from OFFSET macro (W3SOUN:87-95, 117-125)
- **ROM quarry:** plugins/missile-command/reference/source/A35820.1C.bin (W3SOUN, CR-terminated CRLF; use `tr -d '\r\000'` to normalize)
- **Pokey.js vendor:** plugins/star-wars/tools/pokey-bake/vendor/pokey.js (AudioWorkletProcessor, poly counters Poly4/5/9/17)
- **Reuse surface:** @shared/audio (sample playback), @shared/synth (runtime oscillator/noise, battlezone precedent)
- **Fidelity finding:** No incoming-ICBM sound in ROM (only cruise/Sputnik drones). Do not invent one.

### Frame Clock
- Game sim runs at ~61.0076 Hz (docs/rom-study/timebase.md)
- Stepper steps at sim clock, not audio thread rate
- Worklet renders samples; sim drives register changes

### Edge Gotcha
The spike calls out "sustained voices" (incoming-missile drone, klaxon). The game has:
- Cruise-missile drone: `CMSNON` sets bit7, `CMSNOF` clears bit7 on-screen; MODSND sweeps AUDF1+6 pitch while bit7 set
- Sputnik drone: `STSNON` sets bit6, `STSNOF` clears bit6; similar sweep
- Klaxon (`SLAMSN`): "out-of-ammo" flags a low-ammo warning that should stop at pause

The test must prove: pause/game-over fire an edge-trigger that silences these voices, not a simple stop command that leaves ringing.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-07T23:46:04Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-07T22:58:11Z | 2026-08-07T23:00:12Z | 2m 1s |
| red | 2026-08-07T23:00:12Z | 2026-08-07T23:14:20Z | 14m 8s |
| green | 2026-08-07T23:14:20Z | 2026-08-07T23:39:41Z | 25m 21s |
| review | 2026-08-07T23:39:41Z | 2026-08-07T23:46:04Z | 6m 23s |
| finish | 2026-08-07T23:46:04Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **(TEA, Question, non-blocking) `icbmKilled` is mapped SILENT — needs an owner/Reviewer ruling.** The AC prose says "each mapped game event ... triggers its sound," but the spike (§5, the authoritative dependency) fires the explosion cue (EX) at the ABM **detonation** ("BANG ON", W3MAIN:2121) = my `detonated` event. An ICBM caught by that already-detonated fireball is a scored consequence with **no ROM cue** — voicing a second 'explosion' per catch would double every kill (fidelity regression). So `audio-dispatch.test.ts` pins `icbmKilled → []` (silent). One-line flip to `['play:explosion']` if overruled. Flagged deliberately.
- **(TEA, Gap, non-blocking) `bonusTick` has no sim producer yet.** `wave.ts` is not wired into `stepGame` and carries no wave-bonus count-up (W3MAIN:4277, `EXPFRA`=5-frame cadence). RED pins only the **dispatch map** for `bonusTick` (from a hand-built event); the **emitter** is unbuilt. Dev either wires a minimal bonus-tick emitter or we file it forward (candidate mc8-3 or a wave story). Left as a filed follow-up per the descoped-findings rule.
- **(TEA, Gap, non-blocking) the sustained DRONE's parametric pitch sweep is mc8-3.** mc8-2 stands up only the drone's start/stop **lifecycle** (`startLoop`/`stopLoop('drone')`) so AC3 edge-silence is provable now; the per-frame `PMRBIL` descent (§2.4) and its `CRMONS` gating land in mc8-3. No drone-present emitter exists yet either — the edge-silence test starts the loop on the fake directly.
- **(TEA, Improvement, non-blocking) main.ts wiring is proven by SOURCE-TEXT only.** vitest runs under node with no `AudioContext`/`AudioWorklet`, so the live POKEY-worklet path is unreachable in tests (project memory: "node env cannot guard DOM branches"). `audio-engine.test.ts` verifies reachability via regex on `main.ts` source (the tempest `render.ts?raw` idiom) — a deliberately weak proof (a comment could satisfy it, checklist #15). The real render proof is a human/browser smoke test at `/missile-command/` after GREEN.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **icbmKilled maps to SILENCE, not a sound**
  - Spec source: context-story-mc8-2.md, AC-2
  - Spec text: "each mapped game event (launch, ABM detonation, ICBM kill, city/base destroyed, out-of-ammo, wave-bonus count-up) triggers its sound command through the shell"
  - Implementation: audio-dispatch.playEventSounds handles `icbmKilled` with an empty case (no `audio.play`); the kill's blast already sounded EX at `detonated`.
  - Rationale: the mc8-1 spike (§5, the authoritative dependency) fires EX at the ABM detonation ("BANG ON", W3MAIN:2121); an ICBM caught by that already-open fireball has no ROM cue, so voicing one would double every kill — a fidelity regression.
  - Severity: minor
  - Forward impact: none — the event still exists as data for non-audio consumers; overruling is a one-line dispatch change.
- **bonusTick: dispatch map wired, sim emitter deferred**
  - Spec source: context-story-mc8-2.md, AC-2
  - Spec text: "wave-bonus count-up ... triggers its sound command through the shell"
  - Implementation: playEventSounds maps `bonusTick → play('bonus-tick')` (TK), tested via a hand-built event, but no producer emits it — wave.ts is not wired into stepGame and has no bonus count-up (W3MAIN:4277, EXPFRA cadence).
  - Rationale: the wave-bonus scoring subsystem does not exist yet in the sim; building it is out of this story's scope (it belongs with a wave/bonus story or mc8-3).
  - Severity: minor
  - Forward impact: minor — mc8-3 (or a wave-bonus story) must emit `bonusTick` from the count-up; the cue and its citation (TK, W3SOUN:178/180) are ready.
- **Sustained drone: lifecycle only, parametric sweep deferred to mc8-3**
  - Spec source: context-story-mc8-2.md, AC-3
  - Spec text: "sustained voices are silenced at the pause/game-over edge (no drone or klaxon rings through a stop)"
  - Implementation: audio.startLoop/stopLoop('drone') track lifecycle and updateSustainedSounds stops it at the 'over' edge (proven by test); the drone's per-frame PMRBIL pitch sweep (its actual sound) is NOT implemented, and no producer starts it yet.
  - Rationale: the spike scopes the parametric cruise/Sputnik drone (§2.4) and its CRMONS gating to mc8-3; mc8-2 only needs the lifecycle for the edge-silence AC. (The story's "klaxon" is illustrative — the ROM's LO/NS are one-shots, not a sustained voice.)
  - Severity: minor
  - Forward impact: minor — mc8-3 adds the drone's sweep + its present/gone emitter on the seam that already exists.
- **MODSND envelope frame-count not ROM-exact-by-test**
  - Spec source: context-story-mc8-2.md, AC-1
  - Spec text: "src/shell/audio.ts drives the POKEY core from the lifted sound commands"
  - Implementation: modsnd.expandSound emits NUMBER+1 values per record, FRCNT frames apart (the W3SOUN:81 example reading); the exact per-frame HOLD/pre-emption timing (the NUMBER vs NUMBER+1 question battlezone bz4-4 litigated) is not asserted by any test.
  - Rationale: TEA deliberately left it unpinned (audible-only, trap-prone); the transcribed BYTES are citation-locked and the timing is tunable by ear in mc8-3.
  - Severity: minor
  - Forward impact: minor — mc8-3 may refine the stepper's timing against the ROM; the byte tables and register bindings are fixed.

## Sm Assessment

Setup for mc8-2 (Audio shell: POKEY driver + core-event→sound mapping, 5pt, tdd). Dependency mc8-1 (audio spike) is **done**; the driver-path decision (runtime POKEY synth, not baked assets) and the eight W3SOUN one-shot tables are locked in the spike doc. Branch `feat/mc8-2-audio-shell-pokey-driver` cut from fresh `origin/develop`; merge gate clear (no open PRs); no sibling-checkout race on the id.

**RED-phase steer for TEA:**
- Core stays pure: a per-frame events list on GameState in `src/core` must keep `purity.test.ts` / core-boundary green — voicing lives only in the shell.
- The load-bearing risk is the **edge-driven-voices** gotcha: sustained/looping voices (cruise/Sputnik drone, low-ammo klaxon) must be silenced at the pause/game-over EDGE, not left to ring through a naive stop. This is the case a naive down-count/seam test will miss — pin the silence-at-edge MOMENT through a boot-shell seam, not just "a stop was called."
- Fidelity bar: ROM has no incoming-ICBM sound; do not let a test assert one into existence.

Routing to **tea** for RED. No blocking findings.

## Tea Assessment

RED landed in commit `b00e5d5f` — three suites, 20 failing tests, mirroring the battlezone `audio-dispatch` precedent (the house pattern: `core/events.ts` data channel → `GameState` list → `shell/audio-dispatch.ts` pure map, seam-tested with a recording fake). **RED verified:** `npx vitest run --project missile-command` → both new shell modules `Cannot find module`, all 14 `sound-events` tests fail on the absent `soundEvents` field; the existing 541 tests stay green.

**What each suite pins (→ the API contract GREEN must build):**
- `tests/sound-events.test.ts` (core, AC1) — `GameState.soundEvents: readonly SoundEvent[]` from a new pure `src/core/sound-events.ts` (discriminated union, zero numeric literals so it stays citation-free). Every emitter is driven through the **real sim to the frame it fires** — the "seam suites cannot see emitters" blind spot: `detonated` (ABM arrival), `icbmKilled` (standing blast), `structureDestroyed` (arrived ICBM at a city) via `stepGame`; `launched`/`ammoEmpty` via `fireFromKey`. Plus reset-per-frame, seed-determinism, game-over freeze, and the §5 no-incoming-sound fidelity guard (spawn frame is silent).
- `tests/audio-dispatch.test.ts` (shell, AC2/AC3) — `playEventSounds(audio, events)` and `updateSustainedSounds(audio, state)` in a new `src/shell/audio-dispatch.ts`. Full §5 map (`launch`/`explosion`/`no-fire`/`bonus-tick`, `icbmKilled` silent), core-order, exhaustiveness. Edge-silence: a running `drone` is stopped at the game-over edge **even with no drone-gone event** (checklist #14, the load-bearing gotcha), with an explicit anti-vacuous guard (the drone must be started first, so the stop is a real emitted call).
- `tests/audio-engine.test.ts` (shell, AC1) — `createAudioEngine()` in a new `src/shell/audio.ts`: the `resume/play/startLoop/stopLoop` surface + the **no-throw** contract under node (degrade silently, contract 5), and `main.ts` reachability by source-text.

**Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`):**
- #3 enum/exhaustiveness → `playEventSounds` "handles every kind without throwing" + Dev must add `default: assertNever(event)`.
- #8 test quality (non-vacuous) → self-checked; the edge-silence "real stop call, not merely never-started" test explicitly defends against a vacuous pass.
- #14 derived EDGES in a state machine → the AC3 game-over-edge drone silence is the whole point of `updateSustainedSounds`.
- #15 source-text token-vs-claim → acknowledged weak for the `main.ts` regex (node can't boot WebAudio); flagged as a finding, real proof is a browser smoke test.

**GREEN scope (big-story heads-up):** beyond the three new modules + wiring `main.ts` and `fireFromKey`/`stepGame` to append events, the bulk is **transcribing the §3 W3SOUN tables into `src/core/` with per-line claims** — the existing `citations.test.ts`/`citations-source.test.ts` gate will redden on every hex byte until each is cited + byte-verified against `A35820.1C.bin` (that is AC4's "citations stay green"). The MODSND envelope frame-count (NUMBER vs NUMBER+1) is deliberately **not** pinned in RED — recover it from W3SOUN's `MODSND`, not from prose (see battlezone's bz4-4 review history).

Three non-blocking findings filed above (`icbmKilled`-silent ruling, `bonusTick` emitter gap, drone-sweep deferral). Routing to **dev** for GREEN.
## Dev Assessment

GREEN complete in commit `69b4a5e9` (pushed to `feat/mc8-2-audio-shell-pokey-driver`). Built the owner-chosen ambitious path — **live pokey.js AudioWorklet** + **full §3 tables with citations**.

**All 20 RED tests now pass; nothing else regressed.** Verification (evidence, not assertion):
- `npx vitest run --project missile-command` → **583/583** (was 555 pre-RED + 28 new incl. citations).
- `npm run lint` (tsc --noEmit, repo-wide) → **clean**.
- `node scripts/build-app.mjs missile-command` → **built**; Vite bundled the cross-plugin worklet as `dist/missile-command/assets/pokey-*.js` (24.5 kB), so the `new URL(...pokey.js)` reference resolves in the build.
- `npm run test:orchestrator` → **408/408**.
- `node tools/audit/check-citations.mjs` → **141 claims, all verified** (27 new sound claims byte-matched to `A35820.1C.bin`).

**What shipped:**
- Core (pure — purity + citations green): `sound-events.ts` (the `SoundEvent` union, literal-free), `sound-tables.ts` (all 8 W3SOUN one-shots verbatim, channel-keyed by label suffix, every byte cited), `modsnd.ts` (pure envelope → frame-tagged register writes, `&0xFF` wrap so 0FE = −2), and `game.ts` emitting detonated/icbmKilled/structureDestroyed per frame (rebuilt fresh; empty on fresh + frozen 'over').
- Shell: `audio.ts` (createAudioEngine stands up pokey.js as a live `AudioWorkletNode`, schedules a cue's writes at sim-frame times into the worklet port; full no-throw), `audio-dispatch.ts` (event→cue map + edge-silence), `input.ts` (fireFromKey appends launched/ammoEmpty), `main.ts` (gesture-gated resume + per-frame drain).
- `docs/rom-study/claims/sound.json` (27 claims) and `citations-source.test.ts` extended (sound sequences → DERIVED + a value-consistency block, the mc4-1 pattern).

**Citation-gate note for Reviewer:** the un-cited-literal scanner is **line-based** and does NOT strip multi-line `/** */` JSDoc — a line number inside a doc block leaks as a literal (as `abm.ts:61` warns). All comments in the new core files are therefore `//` lines. Verified by the gate.

**The one thing CI cannot prove:** the live POKEY worklet actually making sound is browser-only (node has no AudioContext; the tests pin the no-throw command surface + source-text wiring). **Requires a human smoke test at `/missile-command/` (`just serve`)** — fire (Z/X/C) should launch/klaxon, ABM detonations and lost cities should bang. The MODSND envelope timing (NUMBER+1) is a first cut, tunable by ear in mc8-3 (logged as a deviation).

Four deviations logged above (icbmKilled-silent, bonusTick emitter deferred, drone-sweep→mc8-3, MODSND timing). Routing to **reviewer**.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (all gates GREEN) | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings |

**All received:** Yes (1 enabled returned clean; 8 disabled via settings)
**Total findings:** 4 confirmed (all remediated in review), 0 dismissed, 0 deferred

Because 8 of 9 specialists are disabled, the substantive review was an ADVERSARIAL MUTATION BATTERY against the diff (self-re-reading finds nothing — project memory). Battery validated by a known-good control (dispatch cue swap → 3 tests failed), so a survivor is a real gap, not a dead test.

## Reviewer Assessment

**Verdict: APPROVE** — 0 Critical, 0 High. Four Medium test-coverage gaps were found by mutation and REMEDIATED in-review (commit 5e1950ec); all now caught. Production code was correct throughout — the findings were missing guards, not defects.

### Mutation findings (all [TEST], confirmed by surviving mutants, now remediated)
- **[MEDIUM][TEST] `modsnd.expandSound` had ZERO coverage** — `Number(key)-1 → Number(key)` (register binding) and dropping `& 0xff` (byte wrap) BOTH survived the full 583-test suite. The core "drives POKEY from lifted commands" logic was unpinned. → new `tests/modsnd.test.ts` pins register mapping + mod-256 wrap with synthetic inputs; both mutants now fail (2 and 1 tests). The ambiguous NUMBER-vs-NUMBER+1 frame count stays intentionally unpinned.
- **[MEDIUM][TEST] `game.ts` structureDestroyed rising-edge guard unprotected** — dropping `state.cities[i].alive &&` survived; it would re-emit the explosion cue every frame for every already-dead structure (audio machine-gun). → new sound-events case pins a pre-dead structure does not re-fire; mutant now fails.
- **[MEDIUM][TEST] `updateSustainedSounds` edge-conditionality unpinned** — an unconditional `stopLoop('drone')` (ignoring phase) survived; it would silence mc8-3's drone the instant it starts mid-run. → new play-phase control asserts a live-play frame leaves a running drone alone; mutant now fails.
- **[MEDIUM][TEST] (control) dispatch cue swaps ARE caught** — `launched→explosion` failed 3 tests, confirming the battery has teeth.

### Observations (VERIFIED + notes)
- **[VERIFIED] no-throw contract holds** — audio.ts:143 `if (!node || !ctx) return` gates every scheduling path; worklet load is `.then/.catch/.finally` (audio.ts:120-140); `feed()` wraps postMessage in try/catch (audio.ts:99). Under node (no AudioContext) `audioContextCtor()` returns null (audio.ts:88) so `resume()` no-ops — the audio-engine no-throw suite exercises exactly this. Complies with contract-5 (degrade silently).
- **[VERIFIED] core/shell boundary intact** — purity.test.ts green; the new core files (sound-events, sound-tables, modsnd) carry no browser surface; audio.ts (WebAudio) is shell-only. sound-tables/modsnd use `//` comments so no JSDoc line-number leaks the citation scanner (the abm.ts:61 gotcha) — citations green (121 vitest + 141 CLI).
- **[VERIFIED] drain order correct** — main.ts steps → voices `game.soundEvents` → `updateSustainedSounds` → clears the channel (main.ts:56-59); the between-frames fire path (main.ts:48-51) voices then clears too, so no event is double-voiced and stepGame's fresh-per-frame rebuild is not clobbered.
- **[VERIFIED] exhaustiveness guard** — audio-dispatch.ts:64 `const _exhaustive: never = event` makes any new SoundEvent kind a compile error (checklist #3).
- **[VERIFIED] citations are real, not decorative** — 27 sound claims byte-verified against A35820.1C.bin by the CLI; the un-cited-literal guard (citations.test.ts §4) forces every core byte to a claim; the mc8-2 consistency block ties each claim value to a real `.BYTE` entry.
- **[LOW] main.ts reachability is source-text only** — audio-engine.test.ts matches `playEventSounds(` etc. by regex; a comment could satisfy it (checklist #15). Accepted: node cannot boot WebAudio, so this is the best available proof; the real proof is the browser smoke test (flagged in Dev Assessment).

### Rule Compliance (.pennyfarthing/gates/lang-review/typescript.md)
- **#1 type-safety escapes** — audio.ts:83 `globalThis as unknown as {...}` is a scoped feature-detection cast (no `any` leak); COMPLIANT.
- **#3 enum/exhaustiveness** — dispatch `default: never` guard; COMPLIANT.
- **#4 null/undefined** — every `node`/`ctx` deref guarded; `??` chain in `audioContextCtor`; COMPLIANT.
- **#7 async/promise** — worklet promise has `.catch` + `.finally`; deliberate `void`; no floating rejection; COMPLIANT.
- **#8 test quality** — no vacuous assertions; anti-vacuous guard on edge test; synthetic inputs on the stepper (memory rule); COMPLIANT.
- **#11 error handling** — no-throw everywhere in the IO layer; COMPLIANT.
- **#14 derived EDGES in a state machine** — the two rising-edge cases (drone-at-over, structureDestroyed) are now guarded by tests; COMPLIANT.
- **#17 comments assert a re-run mechanism** — every W3SOUN line cite verified against source by the citation gate; COMPLIANT.

### Deviation Audit
- **icbmKilled → SILENCE** → ✓ ACCEPTED: faithful to the spike (§5); the detonation carries EX, a per-catch cue would double kills. Owner may still overrule (one-line change) — surfaced as a Delivery Finding.
- **bonusTick emitter deferred** → ✓ ACCEPTED: no wave-bonus subsystem exists; cue+citation are ready; forward-impact filed for mc8-3/wave story.
- **Drone lifecycle-only, sweep → mc8-3** → ✓ ACCEPTED: matches spike scope; the edge-silence seam exists and is now test-guarded on both sides (over stops, play does not).
- **MODSND frame-count not ROM-exact** → ✓ ACCEPTED: the ambiguous NUMBER+1 timing is audible-only and browser-tunable; the register binding and byte wrap (the unambiguous parts) are now pinned.

### Devil's Advocate
Argue this is broken. First, the most damning: **almost none of the audio actually runs in CI.** Under node the AudioContext is absent, so every `play`/`resume`/`startLoop` returns at the first guard — the entire scheduling body (expandSound → feed → postMessage) is dead in tests. A reviewer could reasonably say "you shipped an audio feature and never heard it," and that is TRUE: no automated test proves a single sample is emitted. The mutation battery mitigates this by unit-testing the pure `expandSound` mechanism, but the worklet handshake (addModule('POKEY'), the port triple protocol, AUDCTL priming) is proven only by the build bundling the file — not by it working. If pokey.js's `feed` expects a different triple order, or the worklet name is wrong, or the browser blocks a cross-origin worklet module, the game is silent and NOTHING here catches it. This is why the browser smoke test is not optional — it is the only real proof, and it MUST run before release. Second, a confused user: the drone never sounds at all in mc8-2 (lifecycle-only), so a tester expecting the "descending threat" audio will report a bug that is actually deferred scope — the Dev Assessment must make that unmistakable (it does). Third, the envelope timing: `expandSound` emits NUMBER+1 values, but the ROM's MODSND may pre-empt the last (the bz4-4 debate) — so every one-shot may play one FRCNT-frame too long. Audible, unpinned, tunable — acceptable for mc8-2, but it IS a known inexactness shipping to prod. Fourth, main.ts clears `soundEvents` after voicing, but if a keydown fires between `stepGame` and the clear within the same frame... it cannot (JS is single-threaded, the handlers are separate turns), so the double-voice risk is structurally absent — verified. None of these rise to Critical/High: the failure mode is "silent or slightly-long audio," never a crash (the no-throw contract holds) and never wrong game state (audio is a pure sink). The one genuine risk — the worklet never actually sounding — is a release-gate concern (smoke test), correctly flagged, not a code defect.

## Reviewer Verdict
**APPROVE.** 0 Critical, 0 High, 4 Medium (all remediated in-review, mutants now caught). 589/589 mc tests, lint clean, build bundles the worklet, orchestrator 408, citations 141 verified. Two standing owner-visible items carried forward, NOT blocking: (1) the browser smoke test at /missile-command/ is the only proof of live audio and must run before release; (2) the `icbmKilled`-silent fidelity call is open to owner override. Routing to SM for finish.