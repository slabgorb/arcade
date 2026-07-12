---
story_id: "rb2-11"
jira_key: ""
epic: "rb2"
workflow: "tdd"
---
# Story rb2-11: POKEY + analog sound — 5 envelope tables (corrected 8-byte format), engine hum, machine-gun rat-a-tat (D2, INTCNT&8 strobe), explosion ramp, enemy-approach whine, score/bonus/announce jingles

## Story Details
- **ID:** rb2-11
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** none
- **Repo:** red-baron
- **Points:** 5

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-12T10:17:12Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-12T09:27:14Z | 2026-07-12T09:29:16Z | 2m 2s |
| red | 2026-07-12T09:29:16Z | 2026-07-12T09:51:51Z | 22m 35s |
| green | 2026-07-12T09:51:51Z | 2026-07-12T10:00:51Z | 9m |
| review | 2026-07-12T10:00:51Z | 2026-07-12T10:17:12Z | 16m 21s |
| finish | 2026-07-12T10:17:12Z | - | - |

## Technical Approach

### Shared-library reconciliation (LOAD-BEARING — do not refactor onto shared engine)
- A shared audio engine now exists: `@arcade/shared/audio` (SH2-16, arcade-shared commit c299f89, first tag v0.12.0). It is a SAMPLE/`.wav` buffer engine — `createAudioEngine<N>(manifest)` fetches/decodes `.wav` files and plays `AudioBufferSourceNode`s with POKEY-style channel voice-stealing. It serves the SAMPLE cabinets (tempest/star-wars/asteroids) that have ROM register data baked into recorded samples.
- rb2-11 is NOT a sample story. It is authentic runtime POKEY *synthesis* (oscillators + envelope tables + interrupt strobes). The shared sample engine is architecturally incompatible — it cannot host oscillator synthesis — so rb2-11 must NOT depend on `@arcade/shared/audio`.
- PRECEDENT TO MIRROR: `battlezone/src/shell/audio.ts` (story bz1-11) — red-baron's direct Math Box / AVG hardware twin. Battlezone deliberately hand-writes a LOCAL runtime-synthesis engine (`createOscillator`, filtered noise, lazy-context-on-gesture, master GainNode, channel voice-stealing, silent-degrade at every failure path, `setEngine(throttle)` continuous hum) and does NOT import `@arcade/shared/audio` even though it pins a shared version that includes it. rb2-11's red-baron `src/shell/audio.ts` should follow the same shape and conventions (core emits GameEvent DATA and never imports the audio shell; AudioContext built lazily inside `resume()` wired to pointerdown/keydown in main.ts; every method a silent no-op until then; all failure modes leave the game running without sound).
- rb2-11 is the SECOND synthesis cabinet after battlezone. Per CLAUDE.md ("extract a shared library only once a second game proves the duplication is real"), this duplication of the synthesis VERB is the trigger to consider a FUTURE `@arcade/shared` synthesis-engine subpath — but that extraction is OUT OF SCOPE for rb2-11. Note it as a follow-up, do not attempt it here.
- Housekeeping note (non-blocking, do NOT bump in this story): red-baron pins `@arcade/shared#v0.5.0` (stale; latest is v0.12.0). rb2-11's synthesis is fully local and adds no shared dependency, so no pin bump is required. Flag the stale pin for a separate hygiene story.

### Frame-cadence reminder
The sim ticks one step per CALCULATION frame (~10.42 Hz / SIM_TIMESTEP_S), not per display frame. Audio cues are driven from core GameEvent data emitted by the sim, consumed in the shell. Red-baron's flight sim runs inside a requestAnimationFrame loop that measures elapsed time and batches multiple sim.step() calls per rAF tick when the system runs at 60 FPS. Audio synthesis should sample the oscillator/envelope state at SIM_TIMESTEP_S intervals aligned with those core ticks, not rAF frame boundaries.

## Delivery Findings

No upstream findings

### TEA (test design)

- **Gap** (non-blocking): The fidelity spec §6(A) gives byte-exact envelope data for
  ONLY ONE of the five POKEY tables — the score tick `TK` (`RBSOUN.MAC:157-160`:
  AUDF1=$30, AUDC1 $A4 decaying −1 every 7 frames). `TP`/`BN`/`WP`/`TH` are documented
  by CHANNEL + SHAPE (ch1/ch1/ch3/ch2; fading / rising-warble-×6 / descending-×3 /
  6-note melody) but not byte-for-byte, and the raw `RBSOUN.MAC` is NOT in this
  checkout (red-baron has no `reference/` dir). Affects `src/shell/pokey.ts` — Dev
  synthesizes those four to the documented shapes (as battlezone bz1-11 synthesized
  all of its sounds); a later byte-exact transcription needs `RBSOUN.MAC` from the
  Atari quarry. The RED suite pins TK exactly and the other four by shape, so nothing
  fabricated is asserted as a ROM fact.
  *Found by TEA during test design.*

- **Gap** (non-blocking): Two of the five reward cues have NO event producer in rb2's
  sim yet. `wave-incoming`→WP and the 300-pt `TH` jingle DO have live producers
  (`spawnWave`; a drone kill scores the flat `DRONE_SCORE`=300), and `player-hit`→crash
  and any kill→explosion do too (`loseLife`, `shotResult.hits`). But `score-tick`
  (TK/TP) has no score-accumulation tick in the sim (score is added in lumps) and
  `bonus-life` (BN) has no award threshold in `src/core/lives.ts`. Affects `src/main.ts`
  — the TABLES are built and the dispatch WIRES all five, but main.ts emits those two
  event kinds only once their producers land. Mirrors bz1-11's producer-less
  `shell-impact`. Not a blocker: the cues are inert, not broken.
  *Found by TEA during test design.*

- **Improvement** (non-blocking, RESOLVED during this phase): red-baron's INSTALLED
  `@arcade/shared` was stale at **v0.5.0** while `package.json` already pinned
  **v0.12.0** — npm had not re-resolved the changed git ref. This left
  `tests/pause-adoption.test.ts` failing 2 tests (`./pause` and `./esc-overlay` "not
  exported"), a pre-existing red unrelated to rb2-11. Reconciled by forcing
  `npm install @arcade/shared@github:slabgorb/arcade-shared#v0.12.0`; those 2 tests now
  pass and NO committed file changed (the lockfile already referenced v0.12.0 — only
  the physical `node_modules` was stale). Worth noting for other checkouts: a plain
  `npm install` will not re-resolve a git-ref bump.
  *Found by TEA during test design.*

- **Question** (non-blocking): red-baron has no `src/shell/` directory — the shell is
  a single `src/main.ts` at the src root, even though `repos.yaml` describes
  "src/shell holds render/input/loop/audio". The RED suite's contract places the new
  modules at `src/shell/{pokey,audio,audio-dispatch}.ts` (matching repos.yaml intent AND
  the battlezone precedent). Dev creates that directory. Affects `src/main.ts`
  (imports become `./shell/audio`).
  *Found by TEA during test design.*

## Design Deviations

(none recorded at setup)

### TEA (test design)

- **Four of the five POKEY tables pinned by SHAPE, not byte-exact**
  - Spec source: red-baron/docs/red-baron-1980-source-findings.md §6(A) (lines 265-284); story title "5 envelope tables (corrected 8-byte format)"
  - Spec text: "Score tick (small) TK … Score tick (larger) TP … Bonus life BN … Enemy plane announce WP … 300-point jingle TH" — a 5-table inventory, of which only TK's bytes are transcribed ("AUDF1=$30 held; AUDC1 starts $A4 … decays −1 each 7 frames")
  - Implementation: `pokey.test.ts` pins TK byte-exact (start/hold/change + the stepped $A4→$A0 fade) and pins TP/BN/WP/TH only by their documented channel and envelope SHAPE (fading / rising / descending / pitched-melody)
  - Rationale: the raw `RBSOUN.MAC` is not in this checkout, so asserting exact bytes for the other four would pin a FABRICATED spec — the failure mode the star-wars sourcing gotchas warn about. The corrected 8-byte OFFSET format (the story's headline fact) IS pinned for all five.
  - Severity: minor
  - Forward impact: a future story can tighten TP/BN/WP/TH to byte-exact once RBSOUN.MAC is sourced; no test written here would then need to change (shape assertions stay true).

- **The GameEvent union is exercised through the dispatch, not driven through the sim**
  - Spec source: battlezone bz1-11 precedent (`tests/core/events.test.ts`), cited as the pattern to mirror in the rb2-11 Technical Approach
  - Spec text: bz drives `stepGame(state, input, dt)` and asserts the emitted `state.events` — "a fixed seed + input stream yields an identical event stream"
  - Implementation: red-baron has NO unified `stepGame`/`GameState` (state lives across `main.ts` closure vars and the sim steps inline), so there is no seam to drive events through. `core/events.ts` is pinned as a pure DATA union and exercised via `audio-dispatch.test.ts` with hand-constructed event arrays instead.
  - Rationale: writing a sim-driven events test would require first refactoring red-baron's whole loop into a core `stepGame` — a large cross-cutting change well outside a 5-point sound story. The dispatch test still covers every event kind and the full cue map.
  - Severity: minor
  - Forward impact: if red-baron later consolidates its loop into a core `stepGame`, an events.test.ts that drives the sim (bz-style) becomes possible and would strengthen determinism coverage.

- **The machine-gun strobe is tested as a pure seam, not as an audible rat-a-tat**
  - Spec source: red-baron-1980-source-findings.md §6(B); story title "machine-gun rat-a-tat (D2, INTCNT&8 strobe)"
  - Spec text: "D2 machine gun (strobed by INTCNT&8 for the rat-a-tat, gated by shell timer S.VAL)"
  - Implementation: `audio.test.ts` pins the ROM fact as a pure exported predicate `gunStrobe(intcnt) === ((intcnt & 8) !== 0)` (verified toggling every 8 NMIs = the 32 ms half-cycle) plus `setGun(firing)` gating; it does NOT assert the audible amplitude modulation inside the WebAudio graph.
  - Rationale: the strobe RATE is the ROM fact and is exactly testable; the resulting timbre is off-CPU analog (§6B: "the analog timbre … lives on the discrete 036… sound PCB, not in this source — a port must synthesize"), so asserting a synthesized waveform would pin an invented spec.
  - Severity: minor
  - Forward impact: the audible rat-a-tat is an eyeball/ear check at the rb2-12 live playtest pass.

## Sm Assessment

**State on entry:** NEW_WORK_STATE. User selected rb2-11 explicitly with a directive
to "reconcile with shared library work." Merge gate clear — no blocking open PRs in
red-baron.

**Shared-library reconciliation (performed, DECIDED):** Investigated arcade-shared and
found the newly-landed `@arcade/shared/audio` engine (SH2-16, commit c299f89, tags
v0.11.0/v0.12.0). Determined it is a SAMPLE/`.wav` buffer engine and is architecturally
incompatible with rb2-11's authentic POKEY *synthesis* premise (oscillators + envelope
tables + interrupt strobes). Confirmed via the sibling precedent: battlezone (bz1-11) —
red-baron's direct Math Box/AVG hardware twin — deliberately hand-writes a LOCAL
runtime-synthesis engine and does NOT import the shared audio engine even though its pin
includes it. **Decision: rb2-11 builds a local `red-baron/src/shell/audio.ts` mirroring
battlezone bz1-11, NOT `@arcade/shared/audio`.** Full constraint captured in the
Technical Approach above (load-bearing). Two follow-ups flagged there, both out of scope:
(1) a future `@arcade/shared` synthesis subpath now that a second synthesis cabinet
proves the duplication; (2) red-baron's stale `@arcade/shared#v0.5.0` pin (latest
v0.12.0) — not blocking since rb2-11 adds no shared dependency.

**Routing:** TDD (phased) workflow. Setup complete — session, context, and branch
(`feat/rb2-11-pokey-analog-sound` off red-baron/develop) all verified. Handing off to
Han Solo (TEA) for the RED phase: TEA to write failing tests and record the acceptance
criteria (the sprint YAML has none). The core must emit `GameEvent` sound DATA that the
shell audio module consumes — keep core free of Web Audio (the bz1-11 swept AC).

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev)

The sprint YAML carried NO acceptance criteria, so the RED phase DERIVED them from the
story title + the fidelity spec §6 (`red-baron-1980-source-findings.md:258-295`, the
POKEY-driver / analog-board split) + the battlezone bz1-11 precedent. The ACs are now
encoded as executable tests:

| AC | Behaviour | Where pinned |
|----|-----------|--------------|
| AC-1 | 5 POKEY envelope tables (TK/TP/BN/WP/TH) in the **corrected 8-byte OFFSET format** — one slot per POKEY register, `0` = untouched (the stale "6 BYTES PER SOUND" comment is wrong) | `pokey.test.ts` |
| AC-2 | The MODSND envelope stepper: STVAL·FRCNT·CHANGE·NUMBER; TK byte-exact ($30 AUDF1; AUDC1 $A4 −1 per 7 frames → $A0), clamping at its floor | `pokey.test.ts` |
| AC-3 | Channel map — TK/TP/BN→ch1, WP→ch3, TH→ch2; shapes: BN rises, WP descends, TH is pitched | `pokey.test.ts` |
| AC-4 | Engine hum — the detuned `$F8/$F7` oscillator PAIR; off outside a run | `audio.test.ts` |
| AC-5 | Machine-gun rat-a-tat — **D2, `INTCNT & 8`** strobe (toggles every 8 NMIs = 32 ms half-cycle), gated by firing | `audio.test.ts` |
| AC-6 | Explosion ramp — **EXPVAL `$F0`** down to 0 over `EXPL2_FRAMES`, monotonic, clamped ≥ 0 | `audio.test.ts` |
| AC-7 | Enemy-approach whine — ATGVAL, nearer ⇒ louder; bounded; silent on a clear sky | `audio.test.ts` |
| AC-8 | WebAudio gesture gate + silent-degrade — no context until `resume()`, ONE context, every method a no-op pre-gate and when Web Audio is absent | `audio.test.ts` |
| AC-9 | Event→cue map: kill→explosion, 300-pt kill→explosion+TH, life lost→crash, wave→WP, score-tick→TK/TP, bonus→BN; continuous hum/gun/whine re-read state | `audio-dispatch.test.ts` |
| AC-10 | `core/` stays **audio-free** — no Web Audio symbol, no core→shell import (the one-way boundary) | `core-audio-free.test.ts` |

**Test Files (4 new):**
- `red-baron/tests/shell/pokey.test.ts` — the 5 envelope tables + MODSND stepper (RED)
- `red-baron/tests/shell/audio.test.ts` — the synthesis engine + the pure analog seams
  (`gunStrobe`/`explosionLevel`/`approachWhine`/`engineHumParams`) + gate/degrade (RED)
- `red-baron/tests/shell/audio-dispatch.test.ts` — event→cue map + continuous sounds (RED)
- `red-baron/tests/core/core-audio-free.test.ts` — the purity sweep (**green-from-start
  guard** by design, as in bz1-11 — it must stay green while the shell lands)

**GREEN contract (Yoda / DEV) — each test file's header carries the full API spec:**
- `src/core/events.ts` — the pure `GameEvent` DATA union (no Web Audio)
- `src/shell/pokey.ts` — `POKEY_SOUNDS` (5 × 8-slot tables) + `stepEnvelope`
- `src/shell/audio.ts` — `createAudioEngine()` + the four pure ROM seams
- `src/shell/audio-dispatch.ts` — `playEventSounds` + `updateContinuousSounds`
- `src/main.ts` — assemble the per-frame event list from signals the loop ALREADY has
  (`shotResult.hits`, `scoreKill`, `spawnWave`, `loseLife`) and wire `resume()` to the
  existing keydown gesture. **Do NOT depend on `@arcade/shared/audio`** — it is a
  SAMPLE/`.wav` engine and cannot host oscillator synthesis (see Technical Approach).

**Verification (testing-runner, run `rb2-11-tea-red-verify2`):**
- 3 shell test files fail with **module-not-found** — the correct RED signal
- `core-audio-free.test.ts` PASSES (the guard)
- **No other failures**: 28 files pass / 3 fail; 532 tests pass / 21 fail (all intended RED)

### Rule Coverage

Project rules = the TypeScript lang-review checklist (`gates/lang-review/typescript.md`);
red-baron has no `.claude/rules/` or `SOUL.md`.

| Rule | Test(s) | Status |
|------|---------|--------|
| #3 union exhaustiveness (`default: assertNever`) | `audio-dispatch` "EVERY event kind produces at least one cue"; the contract MANDATES a `const _n: never = event` guard so a new kind fails to compile | failing (RED) |
| #4 null/undefined handling | `pokey` "leaves every OTHER channel untouched (a `0` offset is null)"; engine methods no-op on a null context | failing (RED) |
| #2 readonly / no `Record<string,any>` | contract types `registers: readonly (EnvelopeStep\|null)[]` and `events: readonly GameEvent[]` | pinned in contract |
| #11 error handling / silent failure | `audio` "silent-degrade — a browser with no Web Audio stays playable" (never throws) | failing (RED) |
| #1 type-safety escapes | no `as any` / `@ts-ignore` anywhere in the new tests; casts are `as NonNullable<T>` only AFTER an explicit `not.toBeNull()` | self-enforced |
| #8 test quality | see self-check below | done |
| #5 module resolution | N/A — red-baron is a Vite app on bundler resolution (extensionless imports, matching every existing `src/core` import). The `.js`-extension rule applies to the published `@arcade/shared` ESM artifact, which this story does not touch. | n/a |

**Rules checked:** 6 of 6 applicable (React/async/security/build-config rules do not apply
to a pure synthesis module).

**Self-check (vacuous-assertion sweep):** 2 weak assertions found in my own tests and
FIXED before handoff —
1. `setApproach` originally asserted `allGainValues().some(g => g > 0)`, which would have
   passed vacuously off the master gain even if `setApproach` were inert. Now pins the
   SPECIFIC `approachWhine(80).gain` value reaching a gain node.
2. `setEngine(false)` originally just asserted a 0 gain appears. Now stages
   `not.toContain(0)` while the hum runs FIRST, so an inert stop cannot pass.
No `let _ =`, no `assert(true)`, no always-`None` assertions.

**Shared-library reconciliation (the user's explicit directive) — acted on:**
Confirmed the SM decision holds: `@arcade/shared/audio` (now installed, v0.12.0) is a
SAMPLE/`.wav` buffer engine and CANNOT host rb2-11's oscillator synthesis, and the rb2
epic guardrail independently states "the flight sim, enemy AI, collision, and **POKEY
sound stay local**". The suite therefore builds a LOCAL engine mirroring battlezone
bz1-11. Separately, this phase FOUND and FIXED the real reconciliation debt: red-baron's
installed `@arcade/shared` was stale at **v0.5.0** despite `package.json` pinning
**v0.12.0**, which had left `tests/pause-adoption.test.ts` red on 2 tests. Re-resolved to
v0.12.0 — those tests now pass, and no committed file changed (see Delivery Findings).

**Handoff:** To Yoda (Dev) for the GREEN phase.

## Dev Assessment

**Phase:** finish
**Status:** GREEN — 600/600 tests pass, `tsc --noEmit` clean, `vite build` succeeds.

**Files created:**
- `src/core/events.ts` — the pure `GameEvent` DATA union (no Web Audio; the swept
  core-purity AC passes with it in place). Reuses `KillKind` from `scoring.ts` rather
  than redeclaring it.
- `src/shell/pokey.ts` — the RBSOUN.MAC port: `POKEY_SOUNDS` (5 tables × the corrected
  8-slot OFFSET format, `null` = the ROM's `0` = untouched) + the `stepEnvelope` MODSND
  stepper. **TK is ROM-exact** (AUDF1 held $30; AUDC1 $A4, −1 every 7 frames, count 4 →
  fades $A4→$A0 then rests). TP/BN/WP/TH synthesized to their documented channel+shape.
- `src/shell/audio.ts` — the WebAudio synthesis engine + the four PURE ROM seams
  (`gunStrobe` = `(intcnt & 8) !== 0`; `explosionLevel` = $F0 → 0 across `EXPL2_FRAMES`;
  `approachWhine`; `engineHumParams` = the detuned $F8/$F7 divisor pair). Lazy
  gesture gate, one context, silent-degrade on every failure path.
- `src/shell/audio-dispatch.ts` — `playEventSounds` (with the `never` exhaustiveness
  guard) + `updateContinuousSounds`.

**Files modified:**
- `src/main.ts` — creates the engine, wires `resume()` to keydown/pointerdown, assembles
  the per-frame `GameEvent[]` from signals the loop ALREADY computed (`shotResult.hits`
  → `enemy-destroyed` carrying its `points`; the blimp's hit → `player-hit`; `spawnWave`
  → `wave-incoming`), and drives the continuous hum/gun/whine from live state. A paused
  game falls silent.

**Design decisions (minimalist):**
- The hum's oscillators FREE-RUN once started; its GAIN is the on/off switch — cheaper
  than rebuilding the voice, and it makes `setEngine(false)` a real 0 rather than an
  inaudible-but-running voice.
- The explosion's gain walks the AUTHENTIC `explosionLevel` ramp one step per calc-frame
  (`SIM_TIMESTEP_S`), rather than a generic exponential decay — the ROM's shape, audible.
- The rat-a-tat is a square-wave LFO at `MASTER_NMI_HZ / 16` (= the INTCNT&8 gate rate)
  chopping a looping noise burst — the strobe FACT drives the synthesis parameter.
- Used stepped `setValueAtTime` for the explosion envelope, NOT
  `exponentialRampToValueAtTime` — the latter is illegal against a 0 target in real
  WebAudio. The test fake would not have caught that; the live browser check would.

**Live verification (beyond the suite — `main.ts` has no unit coverage):** served this
working tree on a scratch port (5277 was already owned by another checkout) and drove it
in Chrome. The cockpit boots and renders (enemy biplane, tilting horizon, score); the
only console error is a `favicon.ico` 404, unrelated. Pressing fire exercised
`setGun(true)` → build the gun voice → `setGun(false)` → `stop()` against a REAL
`AudioContext` with **no exceptions** — the check that matters, since a real context is
far stricter than the recording fake.

**Handoff:** To Obi-Wan Kenobi (Reviewer) for the review phase.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 4 | confirmed 2, dismissed 2, deferred 0 |
| 2 | reviewer-edge-hunter | Yes | findings | 7 | confirmed 5, dismissed 0, deferred 2 |
| 3 | reviewer-silent-failure-hunter | Yes | findings | 3 | confirmed 3, dismissed 0, deferred 0 |
| 4 | reviewer-test-analyzer | Yes | findings | 8 | confirmed 6, dismissed 0, deferred 2 |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 | confirmed 3, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | Yes | findings | 5 | confirmed 2, dismissed 1, deferred 2 |
| 7 | reviewer-security | No | Skipped | disabled | N/A — disabled via `workflow.reviewer_subagents.security`; no attack surface (pure client-side synthesis: no network, auth, secrets, or untrusted input) |
| 8 | reviewer-simplifier | Yes | findings | 5 | confirmed 1, dismissed 2, deferred 2 |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1, dismissed 0, deferred 0 |

**All received:** Yes (8 returned, 1 skipped-disabled)
**Total findings:** 23 confirmed, 5 dismissed (with rationale), 8 deferred

Note: settings enable only `preflight` + `rule_checker`; the other six were run anyway
for adversarial depth, and between them found the blocking defect. That was worth it.

## Reviewer Assessment

**Verdict: REJECTED (round 1) → rework applied and re-verified → APPROVED**

Tests passing and a clean build meant nothing here: the suite was GREEN over a defect
that could hang the game, and several tests would have stayed green with the feature
gutted. Nine findings were fixed on the branch (commit `9c1d603`); the rest are deferred
with rationale.

### BLOCKING — a dead AudioContext could freeze the whole game

`[EDGE][SILENT]` — found independently by two specialists, then verified directly.
`main.ts:483-484` calls `playEventSounds`/`updateContinuousSounds` inside `frame()`,
**above** the `requestAnimationFrame(frame)` re-schedule at line 495, with no try/catch.
The engine only ever guarded `ctx === null`; it never checked `ctx.state`. A browser can
CLOSE the context out from under the page (iOS reclaiming audio under memory pressure, a
long-backgrounded tab), after which every `createOscillator`/`createGain`/
`createBufferSource` throws `InvalidStateError` **synchronously**. That exception would
escape `frame()` before it re-armed the rAF — freezing rendering, input, *the entire
game* — not merely muting the sound. It directly contradicted the module's own stated
invariant (`audio.ts`: "Every failure path leaves the game RUNNING, without sound") and
the story AC. **Fixed:** a `live()` gate refuses a closed context and every public method
runs inside `guard()`; a regression test closes the context mid-run and asserts silence
without a throw.

### Confirmed and fixed

1. `[OBI-WAN]` **3 of 5 POKEY tones clicked.** BN/WP/TH ended their envelopes at
   non-zero volume (verified: `0xA7`/`0xA2`/`0xA6`) and `pokeyTone` then hard-stopped the
   oscillator — a stop at amplitude pops. Added a release ramp; WP/TH also now fade to
   volume 0. (BN's documented shape is a RISE, so it must end loud and leans on the ramp.)
2. `[EDGE]` **`stepEnvelope` could emit FULL VOLUME instead of silence.** No `[0,255]`
   clamp, and `audcToGain` does `audc & 0x0f` — JS bitwise-AND on a negative uses two's
   complement, so an underflowed `-1` reads back as volume 15. Also `hold < 1` divided by
   zero → NaN. Both guarded and tested.
3. `[EDGE]` **`approachWhine(NaN)` produced the LOUDEST whine.** `NaN > 0` is false, so
   an unknown distance fell into the "on top of you" branch — the exact inverse of intent.
   Now silent.
4. `[TYPE]` **`play()` used if/else over a union.** §6B documents a D1 spiral/dive
   one-shot this story omits; when `OneShot` grows, the `else` would have silently
   rendered it as an explosion. Now an exhaustive `switch` with a `never` guard, matching
   the standard `audio-dispatch.ts` sets one file over.
5. `[SILENT]` **`resume()` orphaned a half-built AudioContext** on failure — and it is
   wired to *every* keydown/pointerdown, so a persistent fault would leak one context per
   keystroke until the browser's cap rejected new ones. Now closed. The `resume()` promise
   rejection is also caught rather than surfacing as an unhandled rejection.
6. `[RULE][DOC]` **`POKEY_CLOCK_HZ = 63_920` was cited "(findings §6A)"** but §6A only
   says "64 kHz" — the precise figure appears nowhere in the spec. This violates the
   project's ROM-fidelity sourcing rule (rule-checker, the gate-enabled specialist — a
   rule-matching finding cannot be dismissed). Relabelled as the hardware value
   (1.79 MHz ÷ 28), explicitly NOT a spec transcription.
7. `[DOC]` **An off-by-one trap for the next transcriber.** `EnvelopeStep.count` was
   documented as the ROM's `NUMBER`, but §6A defines NUMBER as *(# changes − 1)* while the
   field stored the count itself. A future byte-exact pass dropping a raw NUMBER byte in
   would have been short one step. Renamed to `steps`, with the transform documented.
8. `[DOC]` `explosionLevel` claimed the ramp spans `.EXPL1..2` but only spans EXPL2;
   `[PREFLIGHT]` synthesis constants (gains/cutoffs) were unlabelled while the file's own
   convention tags ROM-verified vs inferred. Both corrected.
9. `[TEST]` **Six tests that would have passed over a gutted feature.** Filters were
   never tracked in the fake, so *no* cutoff was assertable; `play('crash')` was never
   exercised post-gesture (crash and explosion could have collapsed into one cue);
   `playTone` asserted only "an oscillator exists" (a 0 Hz tone would pass); `setEngine`
   asserted only "≥2 oscillators" (identical frequencies — destroying the beat that IS the
   hum — would pass); the gun's strobe modulation was never asserted (deleting the wiring
   would pass); and a paused game leaking the enemy whine was unguarded. All now pinned to
   real values (TK's `$30` pitch, the detuned pair, 15.625 Hz strobe, 900/500 Hz cutoffs).
   `[TYPE]` `registers` is now a fixed 8-tuple — "exactly 8 slots" is the load-bearing
   invariant of the format, so a malformed table is now a COMPILE error, not a runtime hope.

### Dismissed

- `[SIMPLE]` The 5× repeated `ctx === null` guard — superseded by the `live()` helper the
  blocking fix introduced; the remaining repetition is the sibling battlezone house
  pattern and TS null-narrowing makes centralising it lossy.
- `[TYPE]` "`points === DRONE_SCORE` is primitive obsession" — **dismissed as correct
  behaviour**: per findings §4 a *dim/far lead* also scores the flat 300 and per §6A the
  TH jingle is precisely the "300-point" cue, so keying on points (not `kind`) is the
  faithful reading, not a coincidence.
- `[PREFLIGHT]` `main.ts` `frame()` length, and `[SIMPLE]` the 2-site noise/filter
  duplication (below the project's own 3+ bar).

### Deferred (follow-ups, not defects in this diff)

- **`@arcade/shared` synth-primitives extraction.** `resolveContextCtor()` and
  `noiseBuffer()` are byte-identical to battlezone's, and the whole engine skeleton is
  structurally identical. Per CLAUDE.md ("extract only once a second game proves the
  duplication is real"), red-baron **is** that second synthesis cabinet — so extraction is
  now genuinely warranted. It is a cross-repo change (publish → bump → repin) and
  correctly out of scope for a 5-point story. **This is the substantive shared-library
  follow-up.**
- `score-tick`/`bonus-life` have no producer yet (already a TEA Delivery Finding).
- `gunStrobe` is exported but not called in production; `GUN_STROBE_HZ` is *derived* from
  it, and that derivation is now made explicit in code. Keeping the predicate as the
  pinned ROM statement is deliberate.
- Recursive `core/` sweep + a negative fixture for the purity guard.

**Quality gates:** 608 tests pass (31 files), `tsc --noEmit` clean, `vite build` clean.
Re-verified in Chrome against a **real** AudioContext (the fake cannot catch WebAudio
misuse): boots, renders, and firing builds/tears down the gun voice with no exceptions.

**Handoff:** To Grand Admiral Thrawn (SM) to finish.