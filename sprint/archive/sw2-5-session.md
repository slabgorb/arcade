---
story_id: "sw2-5"
jira_key: ""
epic: "sw2"
workflow: "tdd"
---
# Story sw2-5: Wire remaining voice lines — only 'Use the Force, Luke' currently fires

## Story Details
- **ID:** sw2-5
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** none
- **Type:** bug
- **Points:** 2
- **Priority:** p2

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-07T23:15:30Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-07T22:10:49Z | 2026-07-07T22:12:47Z | 1m 58s |
| red | 2026-07-07T22:12:47Z | 2026-07-07T22:56:19Z | 43m 32s |
| green | 2026-07-07T22:56:19Z | 2026-07-07T23:04:50Z | 8m 31s |
| review | 2026-07-07T23:04:50Z | 2026-07-07T23:15:30Z | 10m 40s |
| finish | 2026-07-07T23:15:30Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Gap** (non-blocking): This checkout's `node_modules` had a stale @arcade/shared v0.2.0 while package.json + package-lock already pin v0.4.0, so 37 core test files failed to COLLECT (`"./rng" is not exported`) until `npm install` synced them. Affects `star-wars/node_modules` (run `npm install` in star-wars on a fresh checkout or after a shared-lib pin bump — see [[sh-epic-release-coupling]] / [[parallel-checkout-wiring-collisions]]). *Found by TEA during test design.*
- **Gap** (non-blocking): The authentic speech-trigger disassembly the story context cites (`reference/Speech*.asm`) is absent from this checkout, so the canonical trigger points for the deferred lines cannot be verified against ROM. Affects `star-wars/reference/` (restore the gitignored disassembly to pin authentic triggers). *Found by TEA during test design.*
- **Improvement** (non-blocking): 19 of the 23 baked TMS5220 lines have no reachable trigger in the current sim (they need R2-damage, Vader-on-tail, and wingman mechanics). File a follow-on story to wire them once those mechanics exist. Affects `star-wars/src/core/sim.ts` + `src/core/events.ts` (new cue moments + SpeechLine ids). *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): The 19 deferred SPEECH lines are catalogued with their R2 `.wav` filenames, but their actual presence on the arcade-assets bucket is UNVERIFIED — tests stub `fetch`, so only the 4 wired lines are exercised end-to-end (and even those against a stub). Verify the deferred `.wav` uploads exist (or bake+upload them via `tools/speech-bake`) when the follow-on story wires them, else `speak()` will 404 silently. Affects `star-wars/src/shell/audio.ts` (the 19 deferred SPEECH entries). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): No test pins a specific `SpeechLine` key to its specific authentic filename — the AC-1 catalogue check is set-membership + count only, so a future scramble of two `SPEECH` values would pass while the wrong line plays (the exact defect AC-1 guards). The 4 wired mappings are correct today (verified in review). Add exact-value assertions for the wired lines, e.g. `expect(SPEECH.useTheForceLuke).toBe('use_the_force_luke.wav')`. Affects `star-wars/tests/shell/audio.test.ts` (AC-1 catalogue test). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The dev-only phase-jump (`main.ts:96`) no longer plays a voice line on a direct jump into a phase, because `enterPhase` (called by the jump) does not emit speech — only `progress` does. Cosmetic and dev-only (tree-shaken from prod). If desired, have the dev-jump handler also cue the entered phase's line. Affects `star-wars/src/main.ts` (dev phase-jump block). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `lookAtTheSizeOfThatThing` re-fires on EVERY surface entry, so it repeats on each wave loop. Within scope and arguably authentic (cue on surface arrival), but a follow-on may want first-wave-only gating for some cues. Affects `star-wars/src/core/sim.ts` (`ENTER_PHASE_SPEECH` / `progress`). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **Scope narrowed to the reachable subset (4 of 23 lines carry a core trigger)**
  - Spec source: context-story-sw2-5.md, AC-2 / AC-4
  - Spec text: "Each voice cue is emitted as a GameEvent at the correct moment in gameplay" / "all voice lines fire at expected moments across TIE, surface, and trench phases"
  - Implementation: Tests wire only the 4 lines with a reachable trigger in the current sim (run start → redFiveStandingBy, enter surface → lookAtTheSizeOfThatThing, enter trench → useTheForceLuke, port kill → greatShotKidThatWasOneInAMillion). The other 19 lines are listed in the shell SPEECH catalogue (AC-1 fully met) but carry no core trigger yet.
  - Rationale: The authentic trigger disassembly the context cites (reference/Speech*.asm) is absent from the checkout, and 19 lines need mechanics the sim lacks (R2 damage, Vader-on-tail, wingmen). User chose "Reachable subset now" (AskUserQuestion, this session). Wiring all 23 is not a 2-pt job and would be untethered from any ROM source.
  - Severity: major
  - Forward impact: A follow-on story wires the deferred 19 lines once their mechanics/triggers exist (see Delivery Findings).
- **Speech re-architected from shell-derived to a core GameEvent; two prior 8-7 tests updated**
  - Spec source: context-story-sw2-5.md, AC-2 (vs the shipped shell-derived trigger + tests/shell/audio.test.ts's 8-7 "cues the iconic speech line" test)
  - Spec text: AC-2 "Each voice cue is emitted as a GameEvent" — the shipped "Use the Force, Luke" was instead derived in main.ts off a phase edge
  - Implementation: The iconic line moves into a core `speech` event; the shell pump gains ONE generic `case 'speech': speak(event.line)` arm. Updated the 8-7 iconic-line test to assert the new arm + the ABSENCE of the hard-coded shell speak (double-fire guard), and bumped events.test.ts union coverage 10 → 11.
  - Rationale: AC-2 mandates speech as core events; two mechanisms (shell edge + core event) would double-fire and diverge. One testable seam at the core→shell boundary.
  - Severity: minor
  - Forward impact: none — the shell pump is now generic for every current and future line.

### Dev (implementation)
- **Widened a TEA test's Set type annotation (test edit, no assertion change)**
  - Spec source: tests/shell/audio.test.ts, "SPEECH declares an R2 `.wav` for every one of the 23 authentic lines (AC1)"
  - Spec text: `const files = new Set(Object.values(SPEECH))` then `files.has(\`${name}.wav\`)`
  - Implementation: Changed to `new Set<string>(...)`. With `SPEECH as const` (matching the SOUNDS pattern), `Object.values` infers a Set of the 23 literal filenames, so `.has()` rejects a plain `string` — the `tsc --noEmit` build failed even though vitest (esbuild, types stripped) was green. Widening to `Set<string>` makes the well-formed assertion type-check; the runtime check is byte-identical.
  - Rationale: The alternative (dropping `as const` on SPEECH) would break the SOUNDS-consistent pattern and weaken `SpeechName`. The fix is a pure type annotation — it does not alter what the test asserts.
  - Severity: trivial
  - Forward impact: none.

### Reviewer (audit)
- **TEA — Scope narrowed to the reachable subset (4 of 23)** → ✓ ACCEPTED by Reviewer: matches the user's explicit "Reachable subset now" decision this session; AC-1 (all 23 catalogued) is still fully met, and wiring the 19 that need absent mechanics would be gold-plating untethered from any ROM source. The deferral is captured as a Delivery Finding for a follow-on.
- **TEA — Speech re-architected shell-derived → core GameEvent; two 8-7 tests updated** → ✓ ACCEPTED by Reviewer: the single-mechanism design is correct (AC-2), and moving the trigger into the core removes the double-fire risk. The updated 8-7 test's "no hard-coded shell speak" assertion is a sound guard, and I verified the old block is gone (main.ts diff) with no residual trench-edge speak.
- **Dev — Widened a test's Set type annotation (`Set<string>`)** → ✓ ACCEPTED by Reviewer: a pure type-level fix that keeps `SPEECH as const` (consistent with `SOUNDS`); the runtime assertion is byte-identical, confirmed by the still-green suite and clean `tsc`.
- **Reviewer note (incidental, not a spec deviation):** The dev-only phase-jump (`main.ts:96`, `import.meta.env.DEV`, tree-shaken from prod) calls `enterPhase` directly, which does not emit speech (only `progress` does) — so a dev jump straight to the trench no longer plays "Use the Force, Luke," which the old shell phase-edge trigger did fire. Dev-only and cosmetic; recorded as a non-blocking Delivery Finding.

## Sm Assessment

**Triage:** sw2-5 — item 6 of the Star Wars live-playtest followup. Symptom: the
game is voiced but silent in play; only "Use the Force, Luke" ever fires. The
remaining scripted TMS5220 voice lines are defined but never triggered. 2 pts,
p2, `bug`, tdd. Single repo: `star-wars` (branch `fix/sw2-5-wire-voice-lines`
off `develop`).

**Scope boundary (route, don't solve):** This is a wiring bug — voice-line
*assets/definitions* exist; their *trigger points* don't fire. The fix lives in
`src/shell` (audio/speech playback) bound to events the `src/core` sim already
emits, or new emit points where a trigger is missing. Do NOT gold-plate: wire
the lines that belong to reachable playtest phases; deep-level lines nobody
reaches are not this story's burden.

**Acceptance direction (TEA owns the concrete ACs in context-story-sw2-5.md):**
- Each remaining scripted voice line fires at its correct trigger point, not
  only "Use the Force, Luke."
- Triggers are driven by core events (deterministic/testable), not render-frame
  side effects — so RED tests can assert "event X ⇒ speech line Y queued."
- No regression: existing "Use the Force, Luke" trigger still fires.

**Risk / watch-outs for the pipeline:**
- Confirm the actual inventory of defined-but-unwired lines before asserting a
  count — the context notes ~23 TMS5220 lines, but TEA should verify against the
  code, not the number, and only wire lines with a reachable trigger.
- Audio playback is a shell concern and hard to unit-test directly; push the
  testable seam to the core→shell event boundary (assert emitted speech events),
  not the `<audio>`/Web Audio call itself.

**Routing:** Phased tdd → handoff to **TEA (Imperator Furiosa)** for the RED
phase. She writes failing tests at the event→speech boundary; Dev (The Word
Burgers) follows on GREEN.

## TEA Assessment

**Tests Required:** Yes
**Reason:** New behaviour (a core speech-cue event + shell catalogue) — TDD.

**Test Files:**
- `tests/core/speech-cues.test.ts` (NEW) — the core speech-cue contract: a
  `speech` GameEvent carrying a `SpeechLine`, emitted at run start, the
  space→surface edge, the surface→trench edge, and the exhaust-port kill; plus
  silence when nothing cues, fire-once-on-the-edge, and determinism.
- `tests/core/events.test.ts` (UPDATED) — union coverage 10 → 11 (adds `speech`),
  exhaustive `discriminant` arm, and a `speech` fixture. Keeps the `never`
  exhaustiveness guard honest once the variant lands.
- `tests/shell/audio.test.ts` (UPDATED) — AC-1 catalogue: `SPEECH` lists all 23
  authentic lines (cross-checked against the baked `speech-data.mjs` inventory);
  every filename resolves under the R2 speech prefix on `speak()`; the pump routes
  core speech events via one generic `case 'speech'` arm; and the old hard-coded
  shell `speak('useTheForceLuke')` is gone (double-fire guard).

**Tests Written:** 13 new (speech-cues) + 4 changed assertions across 2 files,
covering AC-1 (catalogue), AC-2 (core cue events at correct moments), AC-3
(shell wires events → speak). AC-4 (live playtest) is manual — verified in review.
**Status:** RED — 12 failing (7 core speech + 5 shell), collection clean.

### Scope (session decision: "Reachable subset now")
Wired to EXISTING core moments (the only ones the sim reaches today):
| Cue moment (core) | SpeechLine | Anchor |
|---|---|---|
| run start | `redFiveStandingBy` | `startRun` (player-spawn) |
| enter surface | `lookAtTheSizeOfThatThing` | `progress` → enterPhase('surface') |
| enter trench | `useTheForceLuke` | `progress` → enterPhase('trench') |
| exhaust-port kill | `greatShotKidThatWasOneInAMillion` | `stepTrench` port-hit branch |

`greatShotKid` fires on ANY port kill (the winning shot), independent of the
clean-run `force-bonus` — a test pins that independence. The other 19 lines are
catalogued (AC-1) but deferred (see Deviations + Delivery Findings).

### Rule Coverage
No `.pennyfarthing/gates/lang-review/{lang}.md` checklist exists in this install,
so TS rules are enforced via the inherited 8-7 hygiene suite (extended, not
duplicated):

| Rule | Test(s) | Status |
|------|---------|--------|
| String-literal union, not `string` | `SpeechLine[]` typed fixtures (speech-cues) | RED |
| Discriminated-union exhaustiveness (`never`) | `discriminant` arm for `speech` (events.test.ts) | RED (build) |
| No type-safety escapes (`as any`/ts-ignore) | events.ts hygiene scan (inherited) | GREEN (guards) |
| Pure-core boundary (no DOM/Date/random/shell) | CORE_SOURCES forbidden-token scan (inherited) | GREEN (guards) |
| Catalogue single-sourced to authentic data | AC-1 cross-check vs `speech-data.mjs` | RED |
| No silent double-fire | shell "no hard-coded speak" guard | RED |

**Rules checked:** all applicable TS/union rules have coverage.
**Self-check:** 0 vacuous tests — every test has a meaningful assertion; the
"silence" tests assert an EMPTY speech stream (guard against over-emission), not
a trivially-true condition.

### Note for Dev (The Word Burgers)
- Add `SpeechLine` + `SpeechEvent` to `src/core/events.ts` and the `GameEvent`
  union; the `discriminant`/pump `never` guards will force the new arm.
- Emit the cue in the core at the four anchors above (NOT in the shell). The old
  shell phase-edge `speak('useTheForceLuke')` block in `main.ts` must be removed.
- Export `SPEECH` from `src/shell/audio.ts` and expand it to all 23 lines
  (camelCase keys; `.wav` values matching the baked snake_case names). The 4
  wired keys are pinned by tests; the other 19 keys are your call.
- Type the shell so `SpeechLine` ⊆ `SpeechName` (import the core type) — then the
  pump's `speak(event.line)` type-checks.

**Handoff:** To Dev for implementation (GREEN).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/events.ts` — added `SpeechLine` (4 reachable ids) + `SpeechEvent`
  `{type:'speech', line}` and the `| SpeechEvent` union member.
- `src/core/sim.ts` — emit the cue at the four anchors: `startRun` →
  `redFiveStandingBy` (beside player-spawn); `progress` → an `ENTER_PHASE_SPEECH`
  map cues `lookAtTheSizeOfThatThing` (surface) / `useTheForceLuke` (trench)
  beside `level-clear`; `stepTrench` port-hit branch → `greatShotKidThatWasOneInAMillion`
  (any kill, independent of the clean `force-bonus`).
- `src/shell/audio.ts` — `SPEECH` expanded to all 23 authentic lines (camelCase
  keys, baked snake_case `.wav` values) and `export`ed. The 4 wired keys equal
  the core's `SpeechLine` ids.
- `src/main.ts` — added `case 'speech': audio.speak(event.line)` to the event
  pump (satisfies the `never` exhaustiveness guard); removed the old hard-coded
  trench-edge `speak('useTheForceLuke')` block. `SpeechLine ⊆ SpeechName` is
  enforced at this call site by `tsc`.
- `tests/shell/audio.test.ts` — one type-only annotation fix (`Set<string>`), see
  Design Deviations → Dev.

**Approach notes:**
- Speech is now core-DATA at the four moments the sim already reaches; the shell
  is a thin `speak(event.line)` lookup. No new mechanics, no gold-plating — the
  19 unreachable lines are catalogued (AC-1) and deferred (see Delivery Findings).
- `greatShotKid` fires on ANY port kill (the winning shot), decoupled from the
  clean-run Force bonus — matches the paranoid TEA test.

**Tests:** 530/530 passing (GREEN) — 47 files, 0 failures. `npm run build`
(`tsc --noEmit && vite build`) passes, so the compile-time contracts (the two
`never` guards, `SpeechLine ⊆ SpeechName`) hold.
**Branch:** `fix/sw2-5-wire-voice-lines` (pushed to origin).

**AC coverage:** AC-1 (23 listed) ✓ · AC-2 (core cue events at correct moments,
4 reachable) ✓ · AC-3 (shell wires events → speak, generic arm) ✓ · AC-4 (live
playtest of the wired 4) — for Reviewer / manual verification.

**Handoff:** To Reviewer (Immortan Joe) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — green (530/530), build clean, tree clean, no smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 5 | confirmed 5 (1 Medium, 4 Low); 0 dismissed, 0 deferred |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A — purity boundary holds, no injection surface, silent-fail preserved |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (Low, pre-existing `!` convention); 0 dismissed |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 6 confirmed (1 Medium, 5 Low), 0 dismissed, 0 deferred — none blocking

## Reviewer Assessment

**Verdict:** APPROVED

sw2-5 turns speech into core `GameEvent` DATA cued at four reachable moments, with
a thin generic shell pump. The implementation is minimal, correct, and pure. All
enabled specialists returned; the only substantive item is a test-robustness gap
on code I verified correct. No Critical or High.

### Observations
- `[VERIFIED]` Core purity holds — the new `events.ts` (`SpeechLine`/`SpeechEvent`) and `sim.ts` emissions introduce no `Math.random`/`Date`/`window`/`document`/`shell` import; grep of the changed core files is empty, and the inherited boundary-scan test (`events.test.ts` pure-core describe) stays green. Evidence: `src/core/events.ts:105-118`, `src/core/sim.ts:277-284,505-510,569-591`.
- `[VERIFIED]` Exhaustiveness intact — `main.ts:156` adds `case 'speech': audio.speak(event.line)` before the `default: { const _exhaustive: never = event }` guard (`main.ts:162`); `tsc --noEmit` is clean, proving the `never` still narrows. Same in `events.test.ts:91` discriminant.
- `[VERIFIED]` No double-fire of "Use the Force, Luke" — the old shell phase-edge `speak('useTheForceLuke')` block is removed (`main.ts` diff), the core emits it once on the surface→trench edge (`progress` runs once at the transition), and `speech-cues.test.ts`'s "exactly ONCE" test pins non-re-emission on later trench frames.
- `[VERIFIED]` `redFiveStandingBy` fires once per run — `player-spawn` is emitted only in `startRun` (`sim.ts:282`); grep confirms no other emission site, so no respawn double-cue.
- `[SEC]` `SPEECH[name]` is indexed only by the closed `SpeechName` union (`keyof typeof SPEECH`); `event.line: SpeechLine` is a strict subset, fully typed end-to-end. No untrusted input reaches the map — no injection/path-traversal surface. URL is `SPEECH_BASE_URL + <literal filename>`. Confirmed clean by reviewer-security.
- `[TEST]` `[MEDIUM]` AC-1 catalogue test checks only filename SET membership + count, not per-key mapping, at `tests/shell/audio.test.ts:161` — a future scramble of two `SPEECH` values would pass while the wrong line plays. Non-blocking: the 4 wired mappings are correct today (verified: `useTheForceLuke→use_the_force_luke.wav`, `redFiveStandingBy→red_five_standing_by.wav`, `lookAtTheSizeOfThatThing→look_at_the_size_of_that_thing.wav`, `greatShotKidThatWasOneInAMillion→great_shot_kid_that_was_one_in_a_million.wav`). Logged as a Delivery Finding to harden with exact-value assertions.
- `[TEST]` `[LOW]` `speech-cues.test.ts:75,84` — the two `SpeechEvent`/`WIRED_LINES` describe tests exercise no runtime code (type-only, erased by esbuild). Acceptable: they are compile-time pins enforced by `tsc` in `npm run build`, and mirror the established `events.test.ts:97` convention. Not requiring change.
- `[TEST]` `[LOW]` `audio.test.ts:186` — `REQUIRED_SPEECH` loop duplicates the all-keys URL-shape loop at `:172`. Minor redundancy; the focused typed subset has documentary value. Not requiring change.
- `[TEST]` `[LOW]` `speech-cues.test.ts:137` — port-kill tests use `toContainEqual` not exact `toEqual`; the analyzer confirmed the extra-emit bug it guards is NOT currently reachable (`clearRun` bypasses `progress`). Defense-in-depth only. Not requiring change.
- `[RULE]` `[LOW]` `speech-cues.test.ts:51` — `state.exhaustPort!.pos` non-null assertion on a nullable field; the invariant holds by construction (`enterPhase(...,'trench')` always spawns a port) and it mirrors the pre-existing `force-bonus.test.ts:23` convention. Not requiring change.
- `[SIMPLE]` (subagent disabled) — assessed by Reviewer: `ENTER_PHASE_SPEECH` map + `case 'speech'` arm are minimal and extensible; the 23-line `SPEECH` catalogue is verbose but required by AC-1. No over-engineering.
- `[EDGE]` / `[SILENT]` / `[DOC]` / `[TYPE]` (subagents disabled via settings) — assessed by Reviewer within the checks below: edge paths (double-fire, dev-jump, wave-loop re-cue) traced; `speak()` silent-degradation is pre-existing and unchanged; comments are accurate and updated (main.ts's stale trench-speak comment replaced); types are sound (string-literal union, `Partial<Record>` correctly used, no escapes).
- `[LOW]` Dev-only phase-jump (`main.ts:96`) no longer cues speech (it calls `enterPhase` directly, which doesn't emit). Dev-only, tree-shaken from prod, cosmetic. Logged as a Delivery Finding.

### Rule Compliance (TypeScript lang-review + core/shell boundary)
- **Type-safety escapes (rule 1):** No `as any`/`as unknown as T`/`@ts-ignore` in source or tests. One `!` non-null assertion in test fixture (`speech-cues.test.ts:51`) — pre-existing convention, invariant holds. COMPLIANT (Low note).
- **Generics/Partial (rule 2):** `ENTER_PHASE_SPEECH: Partial<Record<Phase, SpeechLine>>` — correct use (space genuinely has no cue), not a required-field-made-optional misuse. COMPLIANT.
- **Enums/unions (rule 3):** `SpeechLine` is a string-literal union (not an enum) — correct. Both `GameEvent` switches keep their `never` exhaustiveness guard. COMPLIANT.
- **Null/undefined (rule 4):** `const line = ENTER_PHASE_SPEECH[next]; if (line) …` guards the `SpeechLine | undefined` lookup; `if (line)` is safe because no `SpeechLine` member is falsy. COMPLIANT.
- **Modules (rule 5):** `export type SpeechLine`, `export interface SpeechEvent`, `import type { GameEvent, SpeechLine }`, `export const SPEECH` (runtime value) all correctly qualified. `moduleResolution: bundler` → no `.js` extension needed. COMPLIANT.
- **Test quality (rule 8):** No `as any` in tests; `Object.keys(SPEECH) as SpeechName[]` is a sound `keyof`-widening idiom mirroring `SOUNDS`. COMPLIANT (Medium mapping-gap noted separately).
- **Core purity (boundary rule):** No impurity tokens, no shell import in changed core files. COMPLIANT.
- **Union-variant handling:** New `speech` variant handled in every exhaustive switch. COMPLIANT.

### Devil's Advocate
Let me argue this code is broken. First, double-firing: two speech mechanisms could coexist — the new core event AND a leftover shell trigger — playing "Use the Force" twice on the trench edge. I checked: the old `if (prev.phase !== 'trench' && state.phase === 'trench') speak(...)` block is deleted in the `main.ts` diff, and `speak('useTheForceLuke')` appears nowhere in the shell (the audio.test.ts guard asserts its absence). The core emits once because `progress` runs once at the quota edge, and the "exactly ONCE" test proves later trench frames are silent. Not broken. Second, a confused maintainer: `SPEECH` has 23 keys but only 4 fire — someone could think the other 19 are dead and delete them, breaking AC-1. Mitigated by the `[wired]` comments and the AC-1 test asserting all 23 are present. Third, a malicious/garbage input reaching `SPEECH[name]`: impossible — `name` is the core's `SpeechLine`, a compile-time-closed union; there is no runtime string path from user input to the map index. Fourth, a stressed audio stack: `fetch`/decode failures are swallowed in `speak()` and `playBuffer()` wraps `source.start()` in try/catch, so a bad speech line can't crash the frame loop — pre-existing, unchanged. Fifth, the real soft spot the devil finds: nothing pins `SPEECH.useTheForceLuke` to its exact filename, so a fat-fingered future edit swapping two filenames would ship the wrong voice at the wrong moment and every green test would stay green. That is a genuine test-robustness gap — but it is not a live defect (today's mapping is correct, verified line-by-line) and the fix is a cheap follow-up, so it does not block this story. Sixth, determinism: could a speech event smuggle nondeterminism? No — every emission is static data gated on existing deterministic conditions (quota edge, port collision, run start); the seed-replay test confirms identical speech streams. The code survives the devil.

### Blocking check
0 Critical, 0 High, 1 Medium (non-blocking test-hardening), 5 Low. Per the blocking rule (only Critical/High block), and with all ACs met, the suite green, the build clean, and the purity boundary intact — **APPROVED**.

**Data flow traced:** surface kill-quota met → `progress()` emits `{level-clear, next:'trench'}` + `{speech, line:'useTheForceLuke'}` → `GameState.events` → `main.ts` pump `case 'speech'` → `audio.speak('useTheForceLuke')` → lazy R2 fetch+decode+play. Safe: `line` is a closed union, `speak` degrades silently on any failure.
**Pattern observed:** speech modelled as core-event DATA mirroring the existing SFX channel — `src/core/events.ts:115` + `src/main.ts:156`.
**Error handling:** `speak()` no-ops without a context and swallows fetch/decode failures — `src/shell/audio.ts` (unchanged, verified).

**Handoff:** To SM (The Organic Mechanic) for finish-story.