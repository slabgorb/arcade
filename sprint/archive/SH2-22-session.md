---
story_id: "SH2-22"
jira_key: ""
epic: "SH2"
workflow: "tdd"
---
# Story SH2-22: Close the @arcade/shared/synth onRebuild footgun

## Story Details
- **ID:** SH2-22
- **Jira Key:** (none — local tracking)
- **Workflow:** tdd
- **Stack Parent:** none (no depends_on)
- **Branch Strategy:** gitflow (feat/SH2-22-synth-onrebuild-structural in all three repos: arcade-shared, battlezone, red-baron)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-15T07:50:06Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-14T23:28:19Z | 2026-07-14T23:32:01Z | 3m 42s |
| red | 2026-07-14T23:32:01Z | 2026-07-15T07:30:18Z | 7h 58m |
| green | 2026-07-15T07:30:18Z | 2026-07-15T07:42:29Z | 12m 11s |
| review | 2026-07-15T07:42:29Z | 2026-07-15T07:50:06Z | 7m 37s |
| finish | 2026-07-15T07:50:06Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Question / non-blocking] (SM, setup) This is a PREVENTIVE story, not a bug fix — both cabinets are correct today.**
  SH2-18 round-2 already shipped the `onRebuild` resets: battlezone (`audio.ts:194`) and red-baron
  (`audio.ts:323`) both reset their out-of-registry nodes on rebuild and recover fully right now. The
  regression this story names was found AND fixed in SH2-18. SH2-22's value is closing the door so a
  FUTURE cabinet (or a careless edit to these two) can't reintroduce the asymmetric-silence trap. TEA
  should frame RED tests as "prove the trap is now structurally unreachable / loudly caught," not "fix a
  live bug." The mutation to beat is: reintroduce the round-1 mistake (drop an `onRebuild` reset) and a
  test must go red.

- **[Gap / blocking-for-the-story] (SM, setup) The design fork must NOT default.**
  The story explicitly leaves the mechanism to the implementers: Option A (engine owns persistent,
  gain-switched voices so no cabinet-held node exists) vs Option B (fail loudly — a real failing gate,
  not a swallowed warning). Both options + trade-offs are laid out in the context file. If TEA wants an
  Architect (Emmanuel Goldstein) pass before RED, that is reasonable for a 5-pt refactor with a genuine
  architectural fork. Record the choice as a Design Deviation with rationale.

- **[Improvement / non-blocking] (SM, setup) Release/repin dance applies if arcade-shared changes.**
  Same as SH2-18: merge arcade-shared with NO `--delete-branch` until pins bump, cut the next tag (SH2-18
  landed the synth extraction ~v0.14.x → this is likely v0.15.0), then repin both games with
  `npm install @arcade/shared@github:...#<tag>` — a bare `npm install` after editing the ref keeps the OLD
  commit. Do NOT fold in the 4-way-duplicated fake-AudioContext harness (SH2-18 scoped it out as its own
  follow-up; keep that line).

### TEA (test design)

- **Gap** (blocking for the story, NOT for review): battlezone's `node_modules/@arcade/shared` was STALE at
  **0.11.0** in this checkout (a-1) while `package.json` pins `#v0.14.0` — the classic git-dep trap (editing
  the `#ref` + a bare `npm install` keeps the old commit). 0.11.0 predates the SH2-18 synth extraction, so
  25 battlezone audio tests cascade-failed on a missing `/synth`. I refreshed it with
  `npm install "@arcade/shared@github:slabgorb/arcade-shared#v0.14.0"` (node_modules only — the lockfile
  already had the right commit, nothing to commit). red-baron was already correct at 0.14.0. Dev will repin
  BOTH cabinets to the new tag anyway, but flagging so a fresh clone / CI does not mistake this for a real
  failure. Affects `battlezone` install state. *Found by TEA during test design.*

- **Gap** (blocking for the story, NOT for review): cross-repo RED sequencing. The cabinet source-rule tests
  are RED now against source text, but the cabinets pin a RELEASED arcade-shared (v0.14.0, which has
  `onRebuild` and no `persistentVoice`). Dev cannot make the cabinets GREEN until arcade-shared's
  `persistentVoice` exists AND the cabinets repin to the feature branch
  (`npm install "@arcade/shared@github:slabgorb/arcade-shared#feat/SH2-22-synth-onrebuild-structural"`), then
  to the release tag at the end. Same dance as SH2-18. Affects `battlezone/package.json`,
  `red-baron/package.json`. *Found by TEA during test design.*

- **Question** (non-blocking): the persistentVoice `control(fn)` API passes only the cabinet's controller
  object `C`, so a cabinet that needs `context.currentTime` for `setValueAtTime` must capture the context
  INSIDE its controller at build time (my test builders do: `return { osc, gain, context }`). This is fine —
  the controller is rebuilt against the live context on recovery, so a captured `context` ref is always
  live — but Dev should confirm this ergonomic is acceptable vs. passing the live `SynthTarget` as a second
  arg to `control`. Either satisfies the tests. Affects `arcade-shared/src/synth.ts`. *Found by TEA during test design.*

- **Improvement** (non-blocking): the fake `AudioContext` harness is STILL duplicated four ways (SH2-18 TEA +
  Reviewer both flagged it; deliberately scoped out again here). SH2-22 adds new persistentVoice recovery
  cases to arcade-shared's copy, so the pressure grows further. The shared-test-helper follow-up story is
  increasingly worth filing. Affects all synth/audio suites. *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (blocking for the STORY, not for review): the two cabinets now pin the arcade-shared **feat branch**
  (`github:slabgorb/arcade-shared#feat/SH2-22-synth-onrebuild-structural`), which is correct for the dev
  inner-loop but is NOT shippable. The release dance still must happen at finish: merge arcade-shared with NO
  `--delete-branch`, cut a `v0.15.0` tag (SH2-18 landed the synth extraction at v0.14.0), then repin BOTH games
  with `npm install "@arcade/shared@github:slabgorb/arcade-shared#v0.15.0"` (a bare `npm install` after editing
  the ref keeps the OLD commit). The feat branch must survive until both pins bump. Affects
  `battlezone/package.json`, `red-baron/package.json`, `arcade-shared` tag. *Found by Dev during implementation.*

- **Question** (non-blocking, RESOLVED): TEA's open question on the `control(fn)` ergonomic — I kept the API as
  TEA's tests pinned it (`control(effect: (controller: C) => void)`, controller only) and each cabinet captures
  `context` INSIDE its controller (`return { osc, gain, context }`). Because the engine rebuilds the controller
  against the live context on every recovery, the captured `context` ref is always live, so `context.currentTime`
  reads fresh. No second `SynthTarget` arg was needed. Affects `arcade-shared/src/synth.ts`. *Found by Dev during implementation.*

- **Improvement** (non-blocking): `battlezone/src/shell/audio.ts` no longer imports the `OscillatorNode`/`GainNode`
  DOM types by name (the nullable declarations that used them are gone), and `red-baron/src/shell/audio.ts`
  likewise. tsc stays clean because the controller types are inferred from `createOscillator()`/`createGain()`.
  No action needed; noting that the cabinets are now genuinely node-type-free at the module level, which is what
  the trap-signature guard enforces. Affects both cabinets' `audio.ts`. *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking, future hardening): `persistentVoice`'s `let controller: C | null` uses `null` as
  the "not-yet-built" sentinel, conflating it with a controller that is itself `null`. Harmless today (both
  cabinets return non-null object controllers), but a future cabinet whose `build` returns a falsy controller
  would rebuild every `control()` call. A `built: boolean` sentinel (or `undefined`-vs-a-real-value) would be
  robust. Affects `arcade-shared/src/synth.ts:111`. *Found by Reviewer during code review.*

- **Improvement** (non-blocking): `rebuildListeners` has no unregister path — every `persistentVoice()` pushes a
  listener that lives for the engine's lifetime. Fine for the current use (1–2 voices registered once at engine
  construction), but a future cabinet that created persistent voices in a hot path would grow the array unbounded.
  Consider returning a `dispose()` from `persistentVoice` if dynamic voices ever appear. Affects
  `arcade-shared/src/synth.ts:112`. *Found by Reviewer during code review.*

- **Gap** (blocking for the STORY, not for review — reconfirming Dev/TEA): the two cabinets pin the arcade-shared
  FEAT branch. SM must, at finish: merge arcade-shared (NO `--delete-branch`), cut `v0.15.0`, then repin both
  games with `npm install "@arcade/shared@github:slabgorb/arcade-shared#v0.15.0"` and re-run their builds/tests
  before the release. The feat-branch pin must not reach `develop` unresolved. Affects `battlezone/package.json`,
  `red-baron/package.json`, `arcade-shared` tag. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Resolved the design fork to Option A (engine-owned persistent voices), and RETIRE the public `onRebuild`**
  - Spec source: context-story-SH2-22.md, "The design fork — THIS IS THE STORY"; story title ("either have the engine own persistent (non-stoppable, gain-switched) voices so no cabinet-held nodes exist at all, or fail loudly — the design call is the story")
  - Spec text: "Make it structural rather than advisory." Option A = "no cabinet-held nodes exist at all"; Option B = "fail loudly."
  - Implementation: Chose **Option A**. Tests pin a new `persistentVoice<C>(build)` primitive on `SynthEngine` (returns an opaque handle whose `control(fn)` runs against live nodes and self-heals on recovery) AND assert the raw `onRebuild(listener)` escape hatch is **removed** from the public surface (runtime test + source-rule). Cabinets migrate hum/whine onto persistentVoice and hold no raw nodes.
  - Rationale: Option B ("fail loudly") cannot be a true runtime guarantee — the engine cannot detect a node it does not own, so "loud" degrades to a per-repo static lint the next cabinet must remember to add: advisory under a new name. Option A removes the class of bug (matches the story's own first phrasing). Removing `onRebuild` removes the footgun's *enabler*, not just its symptom; leaving it public keeps a hand-rolled-node path alive and weakens the guarantee to Option B. Honours the epic's VERB-not-NUMBERS rule: node build/modulation stays in each cabinet's builder; only the persist+self-heal mechanism moves to the shared engine.
  - Severity: major (it is the story's central design decision and a breaking change to the `@arcade/shared/synth` public API)
  - Forward impact: Dev implements `persistentVoice` and removes `onRebuild` from `arcade-shared/src/synth.ts`; migrates `battlezone/src/shell/audio.ts` (hum) and `red-baron/src/shell/audio.ts` (hum + whine) off `onRebuild`/nullable-node state onto persistentVoice; repins both cabinets to the new arcade-shared tag. **Reviewer veto point:** if the epic prefers `onRebuild` retained as a documented escape hatch, exactly ONE runtime test (`the public engine surface no longer exposes onRebuild`) and one source-rule (`the raw onRebuild(listener) escape hatch is retired`) drop; the persistentVoice contract stands unchanged either way.

- **Cabinet RED is source-rule guards on the trap's SIGNATURE, not new behaviour**
  - Spec source: context-story-SH2-22.md, candidate AC-1 ("Mutation-provable: reintroducing the SH2-18 round-1 mistake MUST turn a test red")
  - Spec text: "prevented structurally … not by a comment or an unasserted warning."
  - Implementation: The cabinets already recover correctly today (SH2-18 round 2), so a purely *behavioural* cabinet test cannot be RED. The new cabinet tests instead assert the ABSENCE of the footgun's signature — nullable WebAudio-node closure state + a hand-rolled `synth.onRebuild` — anchored to the declaration form, plus a positive `persistentVoice` usage assertion. The existing behavioural recovery tests are kept as GREEN regression guards (the runtime proof the migration works).
  - Rationale: The structural guarantee lives in the shared primitive (fully mutation-tested in arcade-shared). The cabinet's job is to be ON that safe path; the strongest cabinet-level RED is a lint for the dangerous pattern. Anchored to declaration forms per the SH2-18 lesson that raw `.toContain` scans go vacuous.
  - Severity: minor
  - Forward impact: Dev makes these green by migrating both cabinets to persistentVoice; a future cabinet that reintroduces raw-node state trips them.

### Dev (implementation)

- **battlezone `stopEngine()` now lazily BUILDS the hum (at gain 0) if it was never started, instead of no-op'ing**
  - Spec source: battlezone/tests/shell/audio.test.ts, `stopEngine — actual silence, not an argument value` → `is a harmless no-op before the gate opens and before any hum exists`
  - Spec text: the test asserts only `expect(() => engine.stopEngine()).not.toThrow()` (+ no context pre-resume); comment: "resumed, but no hum built yet"
  - Implementation: the old code guarded with `if (humGain === null) return` to avoid constructing the hum just to silence it. `persistentVoice.control()` always builds the controller lazily, so `stopEngine()` on a never-started hum now constructs the osc→gain and sets gain 0. It stays a silent, singleton node (a later `setEngine` reuses it), so it is functionally identical to the prior no-op.
  - Rationale: `persistentVoice` deliberately owns the build/rebuild lifecycle, so it does not expose an "is it built?" probe — that opacity is what makes the footgun unreachable. Re-introducing a boolean guard in the cabinet to skip the build would be cabinet-held lifecycle state creeping back (against the story's intent) for a purely cosmetic win: a gain-0 oscillator is silent and is exactly the hum's own resting state after a real `stopEngine`.
  - Severity: minor
  - Forward impact: none functional (silent either way; singleton preserved). A test that asserted "stopEngine builds NO node before any setEngine" would need updating — none exists; the current test only checks non-throw.

- **red-baron `setEngine()` calls the pure `engineHumParams()` twice (build + control) instead of once**
  - Spec source: red-baron/src/shell/audio.ts (prior shape), `setEngine`
  - Spec text: the old code read `const p = engineHumParams()` once and used `p.frequencies` (build) + `p.gain` (set) from the same call.
  - Implementation: the build closure reads `engineHumParams().frequencies`; the `control` closure reads `engineHumParams().gain`. Two calls to a pure ROM-constant function.
  - Rationale: build and control are now separate closures (engine-owned lifecycle). `engineHumParams()` is pure (fixed §6B detuned pair), so both calls return the identical value — splitting the read keeps each closure self-contained with zero behavioural difference.
  - Severity: trivial
  - Forward impact: none — identical output; if `engineHumParams` ever became non-deterministic this would need revisiting, but it is a constant.

### Reviewer (audit)

Every logged deviation stamped; no undocumented deviations found in the diff.

- **TEA: Resolved the design fork to Option A + RETIRE the public `onRebuild`** → ✓ ACCEPTED by Reviewer:
  the reasoning is sound and I independently verified the load-bearing claims. Option B ("fail loudly") cannot
  be a runtime guarantee — the engine cannot see a node it does not own — so removing the enabler is the faithful
  structural close, matching the story's own "no cabinet-held nodes exist at all" phrasing. The breaking API
  change is CONTAINED: grepped the whole fleet; only battlezone + red-baron consume `/synth`, both migrated, and
  no `onRebuild` remains in either `src/`. The one-test veto point is preserved if the epic later wants the escape
  hatch back.
- **TEA: Cabinet RED is source-rule guards on the trap's signature, not new behaviour** → ✓ ACCEPTED by Reviewer:
  correct call. The cabinets already recover (SH2-18 round 2), so a behavioural cabinet RED is impossible; the
  declaration-anchored source-rule guards + positive `persistentVoice` assertion + the retained behavioural
  recovery tests are the right layered design and are not vacuous (see [TEST] observation).
- **Dev: battlezone `stopEngine()` now lazily builds the hum at gain 0 when never started** → ✓ ACCEPTED by
  Reviewer: silent either way, singleton preserved, edge-case-only, and the alternative (cabinet-held `built`
  boolean) would fight the story's intent. Tolerated by the existing test. See [EDGE] observation.
- **Dev: red-baron `setEngine()` calls the pure `engineHumParams()` twice** → ✓ ACCEPTED by Reviewer:
  `engineHumParams()` is a pure ROM constant; the two closures read independent fields (`.frequencies` in build,
  `.gain` in control). Zero behavioural difference.

## Sm Assessment

**Setup complete — ready for RED (TEA / O'Brien).**

- **Story:** Make SH2-18's advisory `onRebuild` footgun **structural**. A comment on the method is
  currently the only thing stopping the next cabinet from reintroducing the asymmetric-silence recovery
  bug (gun comes back, hum/whine stay dead — worse than total silence because it looks fine).
- **Race/merge-gate:** Clear. Fetched all three repos — no `SH2-22` branches or commits on any origin,
  no open PRs across the fleet. Safe to start.
- **Branches:** `feat/SH2-22-synth-onrebuild-structural` created off `develop` in arcade-shared,
  battlezone, red-baron (gitflow; PRs target `develop`; never touch `main`).
- **Context:** `sprint/context/context-story-SH2-22.md` enriched from the SH2-18 archive — problem,
  current mechanism with file:line anchors, the two design options with trade-offs, candidate ACs,
  the release/repin dance, and the test-harness grade. Decision deferred to TEA/Architect (see findings).
- **The one thing TEA must not miss:** the design fork is the story. Don't let it default; pick A or B
  deliberately and make the guarantee mutation-provable. Don't fold in the fake-AudioContext extraction.
- **Handoff:** → O'Brien (TEA), RED phase.

## Tea Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Design fork resolved:** **Option A — engine-owned persistent voices** (user-confirmed). The public
`onRebuild(listener)` escape hatch is RETIRED; `persistentVoice(build)` is the only sanctioned way to hold
a continuous sound, and it self-heals on recovery — so no cabinet-held node exists to forget. See Design
Deviations for the full rationale and the Reviewer veto point.

**Test Files:**
- `arcade-shared/tests/synth.test.ts` — new `persistent voices — engine-owned, self-healing (SH2-22)`
  describe (11 tests) + `the onRebuild escape hatch is GONE` describe (1 test). Removed the 3 old
  `onRebuild` unit tests (mechanism replaced; coverage re-expressed against persistentVoice).
- `arcade-shared/tests/synth-source-rules.test.ts` — 2 new source-rule pins (persistentVoice present &
  generic; onRebuild retired).
- `battlezone/tests/shell/audio.test.ts` — new `SH2-22 — the hum is engine-owned` describe (3 source-rule
  guards on the trap signature).
- `red-baron/tests/shell/audio.test.ts` — new `SH2-22 — hum and whine are engine-owned` describe (3 guards;
  requires ≥2 persistentVoice registrations). Added `node:fs/url/path` imports.

**Tests Written:** 19 new failing tests (13 arcade-shared, 3 battlezone, 3 red-baron) covering candidate
AC-1..AC-4. The mutation-killer is arcade-shared's `REBUILDS the controller on the NEW context after a
recovery` — it goes red the instant the engine reuses a controller built against a dead context (the exact
SH2-18 round-1 bug).
**Status:** RED (failing — ready for Dev)

### Rule Coverage

| Rule (lang-review TS) | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes (`as any`/`@ts-ignore`) | existing synth-source-rules #1 (unchanged); new persistentVoice generic pin avoids `any` controller | passing / RED pin |
| #2 generic/interface hygiene | `persistentVoice<C>(` generic pin in synth-source-rules | RED |
| #4 null/undefined handling | persistentVoice `control()` before-gate / after-close no-op tests | RED |
| #11 error handling (guarded catch) | `a throwing builder is guarded`, `a throwing control callback is guarded` | RED |
| Trap-signature lint (SH2-22 core) | cabinet `holds NO nullable WebAudio node` + `registers NO manual onRebuild` | RED |

**Rules checked:** the applicable TS lang-review rules already have standing source-rule coverage in
`synth-source-rules.test.ts`; SH2-22 adds the persistentVoice generic pin (#2) and the trap-signature lints.
**Self-check:** every new test carries a meaningful assertion (spy call-counts, node-on-live-context identity,
`.not.toThrow()` paired with a `ready()`/state assertion, non-empty source-match arrays). No vacuous
`assert(true)` / `let _ =` / always-None checks. 0 vacuous tests found.

**RED verified** (testing-runner + focused re-run): arcade-shared 13 fail / 460 pass; battlezone 3 fail /
803 pass; red-baron 3 fail / 897 pass. All failures attributable to the new SH2-22 tests; no pre-existing
test broke. (battlezone's initial 25-test cascade was a STALE node_modules install, not my tests — fixed by
refreshing to the pinned v0.14.0; see Delivery Findings.)

**Handoff:** To Julia (Dev) for implementation (GREEN).
## Dev Assessment

**Implementation Complete:** Yes
**Design fork built:** Option A — engine-owned persistent voices. `@arcade/shared/synth` gains a
`PersistentVoice<C>` + `SynthEngine.persistentVoice<C>(build)`; the public `onRebuild(listener)` escape hatch
is retired. Both cabinets migrated off nullable-node state + manual `onRebuild` onto the self-healing handle.
The half-recovery footgun is now unreachable by construction — there is no cabinet-held node to forget.

**Files Changed:**
- `arcade-shared/src/synth.ts` — added `PersistentVoice<C>` interface + `persistentVoice<C>(build)`
  implementation (lazy build, live-only guarded `control()`, self-heal via internal rebuild listener); removed
  the public `onRebuild` method + function; updated the returned surface and the recovery-fire comment.
- `battlezone/src/shell/audio.ts` — hum is now `synth.persistentVoice(...)`; `setEngine`/`stopEngine` drive it
  via `control()`. Removed `humOsc`/`humGain` nullable state + `synth.onRebuild`. Repinned `@arcade/shared`.
- `red-baron/src/shell/audio.ts` — hum + approach whine are now two `synth.persistentVoice(...)` handles;
  `setEngine`/`setApproach` drive them via `control()`. Removed the three nullable refs + `synth.onRebuild`.
  Repinned `@arcade/shared`.

**Tests:** 2179/2179 passing (GREEN) across the three repos — arcade-shared 473, battlezone 806, red-baron 900.
All three production builds clean (0 tsc errors). Independently confirmed by testing-runner.

**Branches (all pushed):**
- arcade-shared `feat/SH2-22-synth-onrebuild-structural` @ `97b5e3c` (src) / `c0c4233` (tests)
- battlezone `feat/SH2-22-synth-onrebuild-structural` @ `13f3d72` (tests) + migration commit
- red-baron `feat/SH2-22-synth-onrebuild-structural` @ `e39563d` (tests) + migration commit

**Reviewer veto point (carried from TEA):** the `onRebuild` removal is the deliberate Option-A call. If the
epic prefers `onRebuild` retained as a documented escape hatch, exactly one runtime test + one source-rule drop;
the `persistentVoice` contract stands unchanged.

**Not shippable yet (see Delivery Findings):** cabinets pin the FEAT branch. SM must cut arcade-shared `v0.15.0`
and repin both games at finish. Fake-AudioContext harness still 4-way duplicated (deliberately out of scope).

**Handoff:** To O'Brien (TEA) for the verify phase (simplify + quality-pass).
## Subagent Results

Only `reviewer-preflight` is enabled (`pf settings get workflow.reviewer_subagents`); the eight diff-based
specialists are toggled OFF, so the Thought Police performed their domains (edge / silent-failure / test /
doc / type / security / simplify / rule) by hand — tagged inline in the assessment below.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 (2179/2179 green, 3 builds clean, 0 smells) | N/A — confirms baseline; flagged the known feat-branch pin |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Done by Reviewer — see [EDGE] observations |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Done by Reviewer — see [SILENT] observations |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Done by Reviewer — see [TEST] observations |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Done by Reviewer — see [DOC] observations |
| 6 | reviewer-type-design | No | Skipped | disabled | Done by Reviewer — see [TYPE] observations |
| 7 | reviewer-security | No | Skipped | disabled | Done by Reviewer — see [SEC] observations |
| 8 | reviewer-simplifier | No | Skipped | disabled | Done by Reviewer — see [SIMPLE] observations |
| 9 | reviewer-rule-checker | No | Skipped | disabled | Done by Reviewer — see [RULE] observations + Rule Compliance |

**All received:** Yes (1 enabled subagent returned; 8 disabled via settings, assessed by Reviewer)
**Total findings:** 0 confirmed blocking, 0 dismissed, 4 low-severity observations noted (none block)

## Reviewer Assessment

**Verdict:** APPROVED

**Race check (first step):** Fetched all three game repos + orchestrator; grepped `origin/develop` and
`origin/main` for `SH2-22` — no hits. Not superseded by a sibling checkout. This is unique work.

**Scope traced:** the breaking change (`onRebuild` retired from `@arcade/shared/synth`) is contained — grepped
the whole fleet (tempest, lobby, star-wars, asteroids, battlezone, red-baron) for `createSynthEngine` /
`@arcade/shared/synth` / `.onRebuild`: ONLY battlezone and red-baron consume `/synth`, both migrated, and
neither retains any `onRebuild` reference in `src/`. The lobby and the other games use `/audio` (the sample
player), untouched. No orphaned consumer.

**Data flow traced:** context recovery — browser closes `AudioContext` → next gesture calls `resume()` →
construction branch fires `rebuildListeners` (`synth.ts:234`) → each persistent voice's internal listener nulls
its `controller` (`synth.ts:112`) → next `control()` sees `controller === null`, rebuilds against the LIVE
`target` (`synth.ts:122`), sets params on the fresh nodes. The dead context's nodes die with it (browser GC);
nothing is added to the corpse (pinned by the mutation-killer test asserting `contexts()[0].oscillators`
stays length 1 and `build.mock.results.at(-1).value.context === contexts()[1]`). This is the whole story,
and it is airtight.

### Observations (≥5, tagged by domain)

- **[VERIFIED] The self-heal is correct and mutation-proven** — `synth.ts:106-127`. `control()` gates on
  `live()` (null on absent/closed context), builds lazily once per context, and the internal rebuild listener
  nulls the controller on every new context. The mutation-killer test (`synth.test.ts:350`) fails if the engine
  reuses a stale controller. Evidence: build called exactly twice across one recovery, second build's target is
  `contexts()[1]`. Complies with the no-throw contract (guarded) and the story's AC-1 (structural, not advisory).
- **[EDGE] battlezone `stopEngine()` before any `setEngine()` now lazily builds a gain-0 oscillator** —
  `battlezone/src/shell/audio.ts:227`. Old code no-op'd via `if (humGain === null) return`; `control()` always
  builds. The built node is silent (gain 0), a singleton (reused by later `setEngine`), and only reachable in an
  edge case main.ts never hits during a run (it calls `setEngine` every frame). Test `stopEngine … before any
  hum exists` (line 390) tolerates it (asserts only non-throw + no pre-resume context). Logged by Dev as a minor
  deviation — ACCEPTED. Not player-observable; not blocking. Severity [LOW].
- **[SILENT] The `guard()` swallow around build+effect is BY DESIGN, not a swallowed error** —
  `synth.ts:119-124`. This is the documented no-throw contract (a dead sound must never take down the frame
  loop, which runs above the rAF re-schedule). It matches the existing `withAudio`/`startVoice` pattern exactly.
  A persistently-throwing `build` retries each `control()` call, but `build` only runs against a LIVE context, so
  `createOscillator`/`createGain` won't throw in practice. VERIFIED as intended behavior, not a defect.
- **[TYPE] `let controller: C | null` conflates "not yet built" with "built as null"** — `synth.ts:111`. If a
  future cabinet's `build` returned a nullish controller, `control()` would rebuild on every call. No current
  cabinet does this (controllers are non-null objects `{osc, gain, context}`), and the generic infers correctly.
  A `built: boolean` sentinel would be more robust but is over-engineering for the actual use. Severity [LOW],
  non-blocking. Noted as a Delivery Finding for a future hardening pass.
- **[SIMPLE] `rebuildListeners` has no unregister path** — `synth.ts:112`. Each `persistentVoice()` pushes a
  listener that is never removed. The cabinets create 1–2 persistent voices at engine construction (engine
  lifetime = page lifetime), so there is no leak in practice. Only a hypothetical hot-path `persistentVoice()`
  loop would grow it unbounded. Severity [LOW], non-blocking, noted as a Delivery Finding.
- **[RULE] TS lang-review #1 — the one `as unknown as Record<string, unknown>` is the justified idiom** —
  `synth.test.ts:490`. It probes the RUNTIME absence of the deliberately-removed `onRebuild` property; you cannot
  write `synth.onRebuild` when the type no longer declares it (compile error), so the double-cast is the correct
  and arguably only way to assert removal. arcade-shared tests are untyped (esbuild strips types), so it carries
  zero type-safety risk at runtime. Rule #1's own wording ("almost always wrong") carves out exactly this case.
  Downgraded with rationale to [LOW]/non-issue; the `src/` source-rule already forbids `as unknown as` in shipped
  code (`synth-source-rules.test.ts:117`) and `src/synth.ts` has none.
- **[TEST] The cabinet source-rule guards are NOT vacuous** — `battlezone/tests/…:147`, `red-baron/tests/…:189`.
  Anchored to the declaration form (`/\b(?:let|var)\s+\w+\s*:\s*(?:OscillatorNode|GainNode|…)\s*\|\s*null\b/`),
  not a fuzzy substring (the SH2-18 vacuity lesson), AND paired with a positive `persistentVoice` assertion so a
  cabinet cannot pass by deleting the hum. The behavioural recovery tests (`setEngine rebuilds the hum on the NEW
  context`, red-baron `hum and whine come back`) remain the runtime proof. Good layered design. VERIFIED.
- **[DOC] Comments are accurate and current** — the retired-`onRebuild` JSDoc is rewritten to describe
  `persistentVoice`; the `rebuildListeners` comment (`synth.ts:142`) and the recovery-fire comment
  (`synth.ts:220`) are updated to say "persistent voice controller", not "cabinet-held node". The three residual
  `onRebuild` mentions (synth.ts:92/145/248) are historical/explanatory prose (no trailing `(`), correctly
  describing what was replaced. No stale claims. VERIFIED.
- **[SEC] No security surface** — client-side WebAudio synthesis, no user input parsed, no injection sink, no
  auth, no secrets, no network. `noiseBuffer` uses `Math.random()` for white noise (not crypto — correct, it's an
  audio texture). Nothing to exploit. VERIFIED clean.

### Rule Compliance (TS lang-review checklist, exhaustive over the diff)

| Rule | Applies? | Verdict |
|------|----------|---------|
| #1 type-safety escapes | Yes | PASS — src has none; one justified test-only `as unknown as` (see [RULE]) |
| #2 generic/interface hygiene | Yes | PASS — `persistentVoice<C>`/`PersistentVoice<C>` properly generic; no `Record<string,any>`, no bare `Function` (callback is `(controller: C) => void`) |
| #3 enum anti-patterns | No | N/A — no enums in the diff |
| #4 null/undefined | Yes | PASS — explicit `=== null` checks; existing `??` on masterGain unchanged; no `||` misuse introduced |
| #5 module/declaration | Yes | PASS — no relative imports needing `.js` in synth.ts; cabinets import a package; `type`-only imports already correct |
| #6 React/JSX | No | N/A — no .tsx |
| #7 async/promise | Yes | PASS — `control()`/`persistentVoice` are synchronous; recovery is gesture-driven; no new promises |
| #8 test quality | Yes | PASS — assertions meaningful (spy counts, node-context identity); guards anchored + behavior-backed |
| #9 build/config | No | N/A — no tsconfig changes; all three `tsc` builds clean |
| #10 input validation | No | N/A — no external input crosses a boundary |
| #11 error handling | Yes | PASS — `guard()` bare-catch is the documented no-throw contract; no `catch(e: any)` |
| #12 performance/bundle | Yes | PASS — no barrel over-imports; the two `engineHumParams()` calls (red-baron) are a pure ROM constant, trivial |
| #13 fix-introduced regressions | Yes | PASS — this diff is the implementation, re-scanned; no `as any`-to-silence, no `||` |

### Devil's Advocate

Let me argue this code is broken. First attack: **the lazy-build conflation.** `let controller: C | null` treats
null as "unbuilt". A malicious or careless future cabinet whose `build` legitimately returns `null` (or a falsy
controller) would rebuild every single frame — an oscillator leak per `control()` call, 60 nodes/second, until the
browser's node cap rejects them and the tank goes silent. Rebuttal: real, but purely hypothetical — both current
cabinets return non-null object controllers, tsc infers `C` as that object, and the mutation-killer proves the
singleton holds. I have logged it as a hardening Delivery Finding, not a blocker. Second attack: **recovery
starvation.** After a context close, the persistent voice only rebuilds on the NEXT `control()`. If main.ts stops
calling `setEngine`/`setApproach` after recovery (e.g. throttle unchanged, no enemy), the hum/whine stay dead.
Rebuttal: this is IDENTICAL to the shipped SH2-18 behavior (the old `onRebuild` also only nulled the ref; the
rebuild happened on the next `setEngine`), so it is not a regression — and main.ts drives these every frame during
a run. Third attack: **the stopEngine build-on-silence.** Building an oscillator just to set it to 0 could leak if
`stopEngine` were spammed before any `setEngine`. Rebuttal: `persistentVoice` is a singleton per context — the
first `control()` builds, all subsequent ones reuse; spamming `stopEngine` builds exactly one silent node.
Fourth attack: **the guard hides a broken build.** If `build` throws, `control()` silently no-ops forever and the
sound never plays. Rebuttal: that is the explicit no-throw contract — the alternative (letting it throw) freezes
rendering and input, which is strictly worse; and `build` runs only against a live context where the factory calls
do not throw. Fifth attack: **removing `onRebuild` breaks a hidden consumer.** Rebuttal: grepped the entire fleet;
only the two migrated cabinets consume `/synth`. Every attack resolves to "hypothetical, contained, or identical to
prior behavior." The change is sound.

**Handoff:** To Winston Smith (SM) for finish-story.