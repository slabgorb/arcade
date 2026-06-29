---
story_id: "6-12"
jira_key: ""
epic: "6"
workflow: "tdd"
---
# Story 6-12: Audio test & POKEY bake-tool hardening (6-6 review follow-ups)

## Story Details
- **ID:** 6-12
- **Jira Key:** None (local sprint tracking)
- **Workflow:** tdd (phased)
- **Type:** chore
- **Points:** 1
- **Repo:** tempest
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-29T07:34:32Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T07:04:30Z | 2026-06-29T07:06:50Z | 2m 20s |
| red | 2026-06-29T07:06:50Z | 2026-06-29T07:18:55Z | 12m 5s |
| green | 2026-06-29T07:18:55Z | 2026-06-29T07:23:10Z | 4m 15s |
| review | 2026-06-29T07:23:10Z | 2026-06-29T07:34:32Z | 11m 22s |
| finish | 2026-06-29T07:34:32Z | - | - |

## Technical Context

### Acceptance Criteria
1. **expandAlsoun export & test:** Export `expandAlsoun` from `tools/pokey-bake/bake-sfx.mjs` and unit-test that the merged pokey1 stream is non-decreasing in timestamp. The merge-sort SILENT invariant is currently only guarded by the integration bake test, which would still pass for future single-event (count=1) data even if the sort were removed.

2. **Event→sound dispatch extraction:** Extract the shell event→sound dispatch loop from `src/main.ts` into a pure importable function so enemy-fire (and other) wiring can be unit-tested behaviorally instead of via the current brittle `?raw` regex text-match on main.ts.

3. **Audibility threshold:** Derive a meaningful audibility threshold for the bake test (peak>200 of 32767 is analytically weak) or assert the bake script's own reported peak.

4. **node:vm documentation:** Document that `node:vm` in `bake-sfx.mjs` is NOT a security sandbox (acceptable for the committed/trusted vendor file).

### Technical Approach
- **AC#1:** Unit-test the `expandAlsoun` function with deterministic test data to verify timestamp monotonicity across merge boundaries.
- **AC#2:** Extract `playSound(event)` or similar dispatch logic to a separate testable module; write behavioral tests against it rather than regex-matching main.ts.
- **AC#3:** Analyze the WAV peak output from `bake-sfx.mjs` and establish a justified threshold (e.g., peak > threshold indicates audible synthesis, not silent data).
- **AC#4:** Add a comment block in `tools/pokey-bake/bake-sfx.mjs` explaining that `node:vm` is used to sandbox the bake script execution but provides NO security guarantee for untrusted code.

## SM Assessment

Setup is clean and the story is well-scoped for a 1-point chore. These are four
non-blocking follow-ups captured from the 6-6 code review, all confined to the
tempest audio shell + POKEY bake tool — no cross-repo blast radius, no Jira (local
sprint tracking).

**Routing rationale:** Workflow is `tdd` (phased) → next agent is TEA for the RED
phase. This story is genuinely test-shaped: AC#1 (timestamp-monotonicity invariant)
and AC#2 (behavioral dispatch test replacing the brittle `?raw` regex match) are
both "write the failing test first" by nature, which is exactly why tdd over trivial
despite the 1-point size. AC#3 (audibility threshold) and AC#4 (node:vm doc comment)
are lighter — AC#4 is pure documentation and won't carry a test, which TEA should
note rather than force a vacuous assertion around.

**Watch-outs for TEA:** Don't let the test for AC#1 pass on count=1 data (that's the
exact gap the story is closing). For AC#2, the extracted dispatch function must be
imported and exercised behaviorally — a test that still text-matches main.ts defeats
the purpose.

**Pre-handoff checklist:**
- [x] Session file exists with all fields (Phase, Workflow, Repos, Slug, Jira)
- [x] Story context written with technical approach + ACs
- [x] Feature branch `chore/6-12-audio-test-pokey-bake-hardening` created off `develop`
- [x] Jira: N/A (local tracking) — explicitly skipped
- [x] No blocking PRs (merge gate clear; state was NEW_WORK_STATE)

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Status:** RED confirmed — 14 failing (all in `audio-dispatch.test.ts`, "Cannot find
module '../../src/shell/audio-dispatch'"). 518 other tests pass, no collateral damage.
Run: `6-12-tea-red` (vitest, 53 files pass / 1 fail).

**Test Files:**
- `tests/shell/audio-dispatch.test.ts` (NEW) — AC#2 RED driver. Behavioural test of the
  extracted dispatcher: every GameEvent type → its SoundName via a typed recording fake,
  multi-event-frame ordering, repeats, empty list. Fails until Dev creates the module.
- `tools/pokey-bake/bake-sfx.test.mjs` (MODIFIED) — AC#1: new "expandAlsoun merge-sort
  timestamp invariant" describe block (non-decreasing merged feed for every ALSOUN record,
  plus a NON-VACUITY guard proving the un-sorted concat is non-monotonic for enemy_fire —
  so a removed `.sort()` fails here even on count>1 data). AC#3: replaced the weak
  `peak>200` floor with the bake script's own reported peak (parse `peak=`, cross-check
  vs the measured PCM peak, justified 0.02 audibility floor). Both green-on-arrival.
- `tests/shell/audio.test.ts` (MODIFIED) — AC#2: removed the three brittle `?raw`
  regex wiring matches + the `main.ts?raw` import; sample-loading assertions retained.

**Tests Written:** 15 in audio-dispatch.test.ts (14 behavioural + 1 table sanity) + 4 in
bake-sfx.test.mjs (1 export + 1 all-records invariant + 1 non-vacuity + hardened audibility),
covering 4 ACs (AC#4 is doc-only — see Design Deviations).

### Rule Coverage

| Rule (lang-review) | Test(s) | Status |
|--------------------|---------|--------|
| TS #3 switch exhaustiveness on discriminated union | audio-dispatch: per-type cases (10) + "wires every GameEvent discriminant exactly once" | failing (table test passes) |
| TS #8 / JS #8 test quality — meaningful, non-vacuous assertions, typed mocks (no `as any`) | all tests use exact `toEqual([...])`; `recordingAudio` typed `{play(name: SoundName)}`; AC#1 non-vacuity test explicitly defeats the count=1 vacuous case the 6-6 review flagged | enforced |
| TS #1 type-safety escapes (no `as any` / casts) | deliberately dropped a synthetic-invalid-event test that would need a cast, to avoid both `as any` and over-constraining the dispatcher's default branch | enforced |

**Rules checked:** 3 of the applicable TS/JS lang-review rules have test coverage (the
rest — React/JSX, async, input-validation, build-config — are N/A to a sync, DOM-free
dispatcher + node bake tooling).
**Self-check:** 0 vacuous tests. No `let _ =`, no `assert(true)`, no always-None assertions.

### Guidance for Dev (GREEN)

1. **AC#2 — create `src/shell/audio-dispatch.ts`:**
   ```ts
   import type { GameEvent } from '../core/events'
   import type { SoundName } from './audio'
   export function playEventSounds(
     audio: { play(name: SoundName): void },
     events: readonly GameEvent[],
   ): void { for (const event of events) switch (event.type) { /* the main.ts cases */ } }
   ```
   Move the switch verbatim from `src/main.ts:70-103`. RECOMMENDED: add
   `default: { const _x: never = event; void _x; break }` (or an `assertNever` helper) so a
   future event type added to the union is a COMPILE error (TS rule #3, compile-time half).
   Then refactor `main.ts` to replace the inline `for…switch` with `playEventSounds(audio, frameEvents)`.
2. **AC#4 — doc the node:vm limitation** in `tools/pokey-bake/bake-sfx.mjs` (at `import vm` /
   `loadPokeyClass`): a comment that node:vm is NOT a security sandbox — it only supplies the
   AudioWorklet globals for the trusted, committed vendor file; never run untrusted code through it.
   No test (doc-only, see Design Deviations).
3. **AC#1 & AC#3 are already green** — the bake tests pass against existing code. Don't change
   `expandAlsoun`'s sort or the bake's peak reporting, or those guards will flip to RED.

**Handoff:** To Walter (Dev) for implementation.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/shell/audio-dispatch.ts` (NEW) — pure, importable `playEventSounds(audio, events)`;
  the event→sound switch lifted verbatim from main.ts, plus a `default: never`
  exhaustiveness guard so an unwired GameEvent type becomes a compile error. Audio param
  narrowed to `Pick<AudioEngine, 'play'>` so tests pass a fake and the module stays
  decoupled from resume()/ready(). (AC#2)
- `src/main.ts` — replaced the inline `for…switch` event pump (lines 70-103) with a single
  `playEventSounds(audio, frameEvents)` call; added the import. Net −22 lines. (AC#2)
- `tools/pokey-bake/bake-sfx.mjs` — added a SECURITY NOTE above `loadPokeyClass` documenting
  that node:vm is NOT a security sandbox (used only to supply AudioWorklet globals for the
  trusted, committed vendor file; never run untrusted code through it). (AC#4)
- AC#1 & AC#3 required NO production change — they were test-hardening TEA delivered; the
  existing `expandAlsoun` sort and the bake's reported peak already satisfy them.

**Tests:** 532/532 passing (GREEN) — run `6-12-dev-green`. The 14 previously-failing
audio-dispatch tests now pass (incl. the exhaustiveness/table guard). `tsc --noEmit` exits
clean (the `default: never` guard and main.ts import both typecheck).

**Self-Review:**
- [x] Wired to the front end — main.ts calls the extracted dispatcher in the render callback
- [x] Follows project patterns — module in `src/shell/`, `import type`, pure (no DOM/state)
- [x] All ACs met (AC#1 invariant test, AC#2 extraction + behavioural test, AC#3 reported-peak
      audibility, AC#4 node:vm doc)
- [x] Error handling — pre-unlock `play()` is a silent no-op (audio engine); unknown event
      types are a compile error via the exhaustiveness guard

**Branch:** `chore/6-12-audio-test-pokey-bake-hardening` (pushed to origin)

**Handoff:** To The Big Lebowski (Reviewer) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (tests 532/532 green, tsc clean, no lint config, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 2 (1 medium, 1 low) | confirmed 2 (both downgraded to LOW, non-blocking), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (27 rules / 67 instances / 0 violations) | N/A |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 2 confirmed (both LOW, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

A clean, well-scoped 1-point hardening story that does exactly what the four ACs ask
and nothing more. All four enabled specialists plus my own read agree: no Critical or
High issues. The two confirmed findings are LOW polish items on the *tests* (fittingly,
for a test-quality story), neither blocking.

**Data flow traced:** `GameState.events` (emitted by the pure deterministic core's
`stepGame`) → `frameEvents` in the main.ts render callback → `playEventSounds(audio,
frameEvents)` → `switch (event.type)` → `audio.play(<literal SoundName>)` → AudioEngine
plays the loaded sample (silent no-op until a user gesture unlocks it). **Safe because**
`event.type` is a closed 10-member discriminated union and every `play()` argument is a
compile-checked string literal from the `SoundName` (`keyof typeof SOUNDS`) set — no
user/attacker-controlled string can reach `play()` ([SEC] confirmed).

**Pattern observed:** Clean extraction-to-pure-function. `src/shell/audio-dispatch.ts`
lifts the inline switch verbatim and the dispatcher stays DOM/state-free, importing
type-only from `core/events` — the allowed shell→core direction ([RULE] ARCH-1).
main.ts:104 wires it in the render loop (`playEventSounds(audio, frameEvents)`).

**Error handling:** Pre-unlock `play()` is a deliberate silent no-op (audio engine);
an unhandled event type is impossible at runtime — the `default: { const _exhaustive:
never = event }` guard (audio-dispatch.ts:56-64) makes any future unwired discriminant
a compile error; empty event list dispatches nothing (asserted).

### Observations (subagent findings tagged by source)

- `[VERIFIED]` Faithful extraction — all 10 event→sound mappings in audio-dispatch.ts:26-55 match the original main.ts:70-103 verbatim. No behaviour change. Checked against TS rules #1/#3 — compliant.
- `[VERIFIED]` Exhaustiveness guard correct — audio-dispatch.ts:56-64 `const _exhaustive: never = event`; a new `GameEvent` member without a case is a compile error. Complies with TS #3.
- `[VERIFIED]` Architectural boundary intact — audio-dispatch.ts is in `shell/`, imports type-only from `core/events` (allowed direction), zero DOM/Date.now/Math.random. Complies with CLAUDE.md hard boundary.
- `[RULE]` reviewer-rule-checker: 27 rules (13 TS + 13 JS + arch) across 67 instances, **0 violations**. `.js`-extension rule correctly ruled N/A (Vite `moduleResolution: bundler`, extensionless project convention).
- `[SEC]` reviewer-security: **clean**. node:vm AC#4 comment is accurate (node:vm is genuinely not a sandbox) and complete; vm input is a hardcoded, git-tracked `vendor/pokey.js` (not argv/network); no new untrusted path; dispatcher has no injection sink.
- `[TEST]` reviewer-test-analyzer (LOW, non-blocking, downgraded from medium): `tests/shell/audio-dispatch.test.ts` — the `expect(types.length).toBe(10)` sub-assertion is tautological (mirrors a hardcoded in-file list; would not fail if an 11th GameEvent were added without a row). **Downgraded to LOW** because: the real exhaustiveness protection is the compile-time `never` guard (verified correct); the sibling `new Set(types).size === types.length` de-dup check is genuinely non-tautological; and TEA's comment honestly calls the table a "prompt," not a "guard." Cosmetic false-confidence, not a correctness gap. Captured as a non-blocking delivery finding for optional follow-up.
- `[TEST]` reviewer-test-analyzer (LOW, non-blocking): `tools/pokey-bake/bake-sfx.test.mjs` — the AC#3 reported-peak regex is not anchored to line boundaries; latent fragility *only if* a future SFX name becomes a suffix of another (no collision exists today). Tolerance math (`0.001*32767`) and the 0.02 audibility floor are both verified sound/justified.
- `[TEST]` `[VERIFIED]` Coverage migration complete — the three removed `?raw` regex matches (enemy-fire, segment-cross, player-death) are now covered behaviourally by `it.each(EVENT_SOUND)` with exact `toEqual([sound])` — strictly stronger than the text-match originals (analyzer-confirmed).
- `[TEST]` `[VERIFIED]` AC#1 non-vacuity guard is valid — the "un-sorted concat is non-monotonic for enemy_fire" assertion correctly proves a removed `.sort()` in `expandAlsoun` would break the per-record invariant test (analyzer-confirmed; both voices count=9 over overlapping [0,0.096s]).
- `[DOC]` `[VERIFIED]` enemy-fire comment corrected ("silent no-op until 6-6 bakes the asset" → "authentic bake wired in 6-6") — now accurate; no stale comment introduced. (comment-analyzer disabled; checked by hand.)
- `[EDGE]` `[SILENT]` `[TYPE]` `[SIMPLE]` — subagents disabled via settings; spot-checked the relevant domains myself during the read (boundary: empty/repeat/multi-event frames all tested; no swallowed errors — the only try/finally is cleanup-only; types are minimal-surface `Pick`/`readonly`; no over-engineering — the dispatcher is the simplest faithful extraction). No findings.

### Rule Compliance (mapped to lang-review checklists)

reviewer-rule-checker enumerated every applicable rule exhaustively; I confirm its conclusions:
- **TS #1 (type-safety escapes):** no new `as any`/`@ts-ignore`/non-null assertions. Pass.
- **TS #2 (generics/interfaces):** `Pick<AudioEngine,'play'>`, `readonly GameEvent[]` — minimal, no `Record<string,any>`/`Function`. Pass.
- **TS #3 (switch exhaustiveness):** `default: never` guard, all 10 discriminants handled. Pass.
- **TS #5 (modules):** `import type` correct for all type-only imports; `.js`-extension rule N/A (bundler resolution). Pass.
- **TS #8 / JS #8 (test quality):** exact `toEqual`/`toBe` assertions, typed fake, no `as any`, no `.only`/`.skip`. Pass (the two LOW findings are polish, not vacuity).
- **JS #6/#7 (Node/regex):** `execFileSync` array-arg form; the peak regex escapes `name` and has no ReDoS. Pass.
- **ARCH-1 (core purity):** shell→core type-only import, no DOM/time/random. Pass.

### Devil's Advocate

Assume this is broken. The most credible attack is on the extraction itself: an extraction
is a silent-mutation risk — one transposed case (`enemy-fire → enemyDeath`) would ship a
wrong sound that no type checker catches, since every branch still typechecks. I checked
all ten mappings line-by-line against the original main.ts:70-103; they are identical, and
the behavioural `it.each` asserts each exact pairing — so a transposition fails the suite.
Refuted. Next: the residual gap surfaced by finding #1. The `default: never` guard forces a
*case to exist* for any future event, but it does NOT force that case to play the *right*
sound (any valid `SoundName` typechecks), and the tautological `length === 10` test gives
false comfort that "all discriminants are covered." So a future 11th event could be wired to
the wrong existing sound and only a human would catch it. This is real — but it bites a
*future* story, not this one: all ten *current* mappings are fully asserted. Low, non-blocking,
captured as a delivery finding. Next: could AC#3 mask a silent bake regression? The cross-check
only proves the WAV PCM matches the script's *self-reported* peak — if the renderer produced
consistent garbage, both could agree. But audibility is still triple-guarded (0.02 floor +
no-SILENT-warning + the merge-sort invariant test), so a silent/garbled bake still fails
elsewhere. Acceptable. Next: flakiness — the bake test spawns real `node` with a 60s timeout;
on a slow CI it could time out. Pre-existing, not introduced here; the AC#3 stdout-parse adds
no new I/O. Finally, a confused reader might over-read "pure" in the dispatcher's header — but
the very next sentence says "its only effect is calling play()", so it's honest. Nothing in
this list rises above LOW. Verdict stands.

**Handoff:** To SM (The Dude) for finish-story.

## Delivery Findings

### TEA (test design)
- No upstream findings during test design. The four ACs are self-contained 6-6
  follow-ups; the existing code (`expandAlsoun` export + sort, the bake script's
  reported peak, the main.ts switch) was already present and correct — this story
  only hardens its test coverage and extracts one importable function.

### Dev (implementation)
- No upstream findings during implementation. The extraction was mechanical and the
  bake hardening needed no production change; nothing surfaced that affects sibling
  stories or upstream specs.

### Reviewer (code review)
- **Improvement** (non-blocking): The `expect(types.length).toBe(10)` assertion in `tests/shell/audio-dispatch.test.ts` is tautological — it mirrors a hardcoded in-file table and would not fail if an 11th `GameEvent` discriminant were added without a wiring row, giving false "all covered" confidence. Affects `tests/shell/audio-dispatch.test.ts` (drop the `=== 10` count and keep the genuine `Set` de-dup check, or structurally tie the table to the union via an exported discriminant list). The compile-time `default: never` guard already prevents an *unhandled* event, so this is polish, not a correctness gap. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The AC#3 reported-peak regex in `tools/pokey-bake/bake-sfx.test.mjs` is not anchored to line boundaries; if a future SFX name ever becomes a suffix of another (none today), the wrong line's `peak=` could be captured. Affects `tools/pokey-bake/bake-sfx.test.mjs` (add a `(?<![a-z_])` / line-start anchor before `name`, or split stdout on newlines first). *Found by Reviewer during code review.*

## Design Deviations

### TEA (test design)
- **AC#4 (node:vm doc) carries no automated test**
  - Spec source: context-story-6-12.md, AC — "node:vm sandbox limitation documented in tools/pokey-bake (README or inline comment)."
  - Spec text: "Document that node:vm in bake-sfx.mjs is NOT a security sandbox (acceptable for the committed/trusted vendor file)."
  - Implementation: No test written for AC#4. It is a documentation-only deliverable (a prose comment); asserting on a comment's presence would be a brittle `?raw`/source text-match — the exact anti-pattern this very story is removing in AC#2. Coverage is by Reviewer reading the diff.
  - Rationale: A meaningful test requires an observable behaviour; a doc comment has none. Forcing one would be a vacuous/brittle assertion, contrary to the lang-review test-quality rule and AC#2's intent.
  - Severity: minor
  - Forward impact: none — Reviewer verifies the comment exists and is substantive during code review.
  - → ✓ ACCEPTED by Reviewer: Sound. AC#4 is a documentation deliverable with no observable behaviour to assert; a presence-test would be the exact brittle `?raw` text-match anti-pattern AC#2 removes. The reviewer-security subagent independently verified the node:vm comment is accurate (node:vm is genuinely not a sandbox) and complete, and that the vm input is a hardcoded, git-tracked vendor file. Coverage-by-review is the correct call.

### Dev (implementation)
- No deviations from spec. Built exactly what TEA's tests and the ACs specified:
  extracted `playEventSounds` (moving the main.ts switch verbatim), wired main.ts to
  it, added the node:vm doc comment, and left `expandAlsoun`/the bake peak untouched.
  The `default: never` exhaustiveness guard and narrowing the audio param to
  `Pick<AudioEngine, 'play'>` were both explicitly recommended/anticipated by TEA's
  guidance — not deviations.
  - → ✓ ACCEPTED by Reviewer: Confirmed. The reviewer-rule-checker found 0 violations across 27 rules / 67 instances; the extracted switch matches the original main.ts:70-103 verbatim (all 10 mappings); the `never` guard is the canonical exhaustiveness pattern (correct & complete); and `Pick<AudioEngine,'play'>` is the minimal-surface narrowing TEA's fake relies on. No spec divergence.

### Reviewer (audit)
- No undocumented deviations found. The only non-logged change is the enemy-fire
  inline comment ("silent no-op until 6-6 bakes the asset" → "authentic bake wired
  in 6-6"), which is a comment-accuracy correction made during the verbatim
  extraction — not a spec or behaviour deviation. Every spec divergence is now
  explicitly accepted above.