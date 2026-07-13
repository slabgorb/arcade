---
story_id: "SH2-18"
jira_key: ""
epic: "SH2"
workflow: "tdd"
---
# Story SH2-18: Extract @arcade/shared/synth

## Story Details
- **ID:** SH2-18
- **Jira Key:** (none — local tracking)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-13T11:57:35Z
**Round-Trip Count:** 1
**Repos:** arcade-shared, battlezone, red-baron
**Branch Name:** feat/SH2-18-shared-synth (same branch name in all three repos)
**Branch Strategy:** gitflow — all three repos branch off `develop`; PRs target `develop`. Never touch a game's `main` (production; auto-deploys to R2).

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-13T10:51:48.637629+00:00 | 2026-07-13T10:58:53Z | 7m 4s |
| red | 2026-07-13T10:58:53Z | 2026-07-13T11:09:09Z | 10m 16s |
| green | 2026-07-13T11:09:09Z | 2026-07-13T11:18:25Z | 9m 16s |
| review | 2026-07-13T11:18:25Z | 2026-07-13T11:34:18Z | 15m 53s |
| red | 2026-07-13T11:34:18Z | 2026-07-13T11:42:40Z | 8m 22s |
| green | 2026-07-13T11:42:40Z | 2026-07-13T11:42:41Z | 1s |
| review | 2026-07-13T11:42:41Z | 2026-07-13T11:57:35Z | 14m 54s |
| finish | 2026-07-13T11:57:35Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Conflict / non-blocking] (SM, setup) The story's "byte-identical copies" premise is false.**
  Verified by diff: `battlezone/src/shell/audio.ts` (242 lines) vs `red-baron/src/shell/audio.ts` (461 lines) —
  572 diff lines, no shared contiguous region larger than 7 lines. Only **~13 lines are literally identical**:
  `resolveContextCtor()` (bz L60-65 / rb L164-169, identical down to the JSDoc) and the `noiseBuffer()` body
  (bz L86-92 / rb L214-220). The `Voice`/`LoopVoice` interface matches in shape but differs in name.
  The story is still worth doing — the *architecture* is duplicated even though the bytes are not — but it is
  a **same-architecture, different-flesh** convergence, not a copy-paste dedupe. Estimate remains 5 pts.

- **[Gap / non-blocking] (SM, setup) The extraction is a BEHAVIOR CHANGE for battlezone, not a refactor.**
  Red Baron is the more evolved implementation (it went through a review round battlezone never had) and is the
  correct **donor**. Battlezone is missing, entirely: `live()` (treat a *closed* context as absent),
  `guard()` (try/catch around every WebAudio effect), try/catch around `new Ctor()` with `close()` of the
  half-built context, and `.catch()` on `ctx.resume()` (a closed context *rejects* — bz's bare `void ctx.resume()`
  is an unhandled rejection). Adopting the shared VERB **gives battlezone the no-throw contract it lacks today.**
  This matters at runtime: red-baron's suite documents that `updateContinuousSounds()` runs inside `frame()`
  *above* the `requestAnimationFrame(frame)` re-schedule, so an escaping audio exception freezes rendering and
  input — not just sound. TEA must treat this as new behavior to be covered, not as a regression risk to avoid.

- **[Gap / non-blocking] (SM, setup) Battlezone's test fake cannot express the bug being fixed.**
  `battlezone/tests/shell/audio.test.ts`'s `FakeAudioContext.close()` does not set `state = 'closed'` and there is
  no `assertOpen()`, so bz currently has **zero coverage of the closed-context path**. Red Baron's fake is the
  upgraded one (`close()` sets state; `assertOpen()` throws `InvalidStateError` synchronously from every factory
  method; `resume()` rejects when closed). Battlezone's harness needs the rb-grade fake to prove the new contract.

- **[Improvement / non-blocking] (SM, setup) Version-pin skew across the two consumers.**
  battlezone pins `@arcade/shared` at `#v0.13.1`, red-baron at `#v0.12.0`, arcade-shared HEAD is `0.13.2`.
  Both need repinning to the new tag. Per the release-coupling note, editing the `#ref` and running a bare
  `npm install` **keeps the old commit** — `npm install @arcade/shared@github:...#<ref>` is required to re-resolve.

### TEA (test design)

- **Gap** (non-blocking): SM's "battlezone lacks the no-throw contract" finding is now REPRODUCED, not merely
  asserted. With the fake upgraded to red-baron's grade, three tests fail against battlezone's current engine:
  an `InvalidStateError` **escapes** `play`/`startLoop`/`setEngine` (the frame-loop freeze — it runs above the
  `requestAnimationFrame` re-schedule), nodes are still built into a **closed** context, and the bare
  `void ctx.resume()` leaks **two** unhandled rejections. Affects `battlezone/src/shell/audio.ts` (adopt the
  shared skeleton to fix). *Found by TEA during test design.*

- **Improvement** (non-blocking): The fake `AudioContext` harness is now duplicated **three** ways —
  `battlezone/tests/shell/audio.test.ts`, `red-baron/tests/shell/audio.test.ts`, and now
  `arcade-shared/tests/synth.test.ts` (arcade-shared's `tests/audio.test.ts` builds a fourth, different one for
  the sample player). This story deliberately does NOT extract it (scoped out — a third concern in an
  already three-repo story), and I have kept that line. But the duplication is real and grew on my watch.
  Worth a follow-up story: a shared test helper (`@arcade/shared/testing/fake-audio-context`) or a
  `tests/helpers/` export. Affects all three suites. *Found by TEA during test design.*

- **Question** (non-blocking): `MASTER_GAIN = 0.8` is identical in both cabinets, so I made it a `SynthConfig`
  knob defaulting to 0.8 rather than a hardcoded constant — and pinned `masterGain: 0` as a real, honoured
  value (a muted cabinet), which is what makes `??` vs `||` load-bearing here. If the epic would rather the
  master gain be a fixed shared constant with no override, say so in review; the test is one line either way.
  Affects `arcade-shared/src/synth.ts`. *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (blocking for the story, NOT for review): the consumers currently pin the arcade-shared **feature
  branch** (`github:slabgorb/arcade-shared#feat/SH2-18-shared-synth`), which is correct for the dev inner-loop
  but is NOT a shippable state. AC-10 is only half-satisfied: the release dance still has to happen —
  merge arcade-shared **with NO `--delete-branch`**, cut a `v0.14.0` tag, then repin both games to `#v0.14.0`
  with `npm install @arcade/shared@github:...#v0.14.0` (a bare `npm install` after editing the ref keeps the
  OLD commit). The branch must survive until both pins are bumped. Affects `battlezone/package.json`,
  `red-baron/package.json`. *Found by Dev during implementation.*

- **Improvement** (non-blocking): battlezone's audio suite has a lang-review scan that does a raw
  `.toContain('as any')` substring check on the source text. My header comment "no other cabinet **has any**
  use for them" tripped it — the substring `as any` appears inside "h-as any-…". I reworded the prose, but the
  check will keep false-positiving on innocent English ("was any", "has anyone"). Worth tightening to a word
  boundary regex (`/\bas any\b/`, as the arcade-shared source-rules tests already use). Affects
  `battlezone/tests/shell/audio.test.ts`. *Found by Dev during implementation.*

- **Question** (non-blocking): red-baron passes `{ masterGain: MASTER_GAIN }` explicitly rather than leaning on
  the shared 0.8 default, so its named constant and its "[inferred]" tuning comment stay where a reader of that
  cabinet expects them. Battlezone takes the default. Both end up at 0.8, so this is cosmetic — but it means the
  two cabinets express the same value two different ways. Reviewer may prefer one spelling. Affects
  `red-baron/src/shell/audio.ts`. *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (blocking): The story's headline contract — "a CLOSED context is treated as ABSENT, not as
  live-and-throwing" — is **untested for the voice registry**. Mutation-proven: bypassing the closed-context
  refusal inside `startVoice` so it builds into a dead context leaves **all 33 tests passing**. The distinction
  between *refusing* a dead context and merely *catching* its throw is the entire point of this story, and half
  the API doesn't guard it. Affects `arcade-shared/tests/synth.test.ts` (add a spy-based closed-context test for
  `startVoice`/`isVoiceActive`; wrap or delete the unasserted `isVoiceActive` call at line 389).
  *Found by Reviewer during code review.*

- **Gap** (blocking): The adoption tests — the only mechanical enforcement of AC-7/AC-8 — are **vacuous**.
  Mutation-proven: renaming battlezone's returned `stopEngine` key (a real runtime `TypeError`) left all 6
  adoption tests passing; only `tsc` caught it. They scan source TEXT and match the *interface declaration* and
  even *comments*, not the implementation. Affects `battlezone/tests/shell/audio-adoption.test.ts` and
  `red-baron/tests/shell/audio-adoption.test.ts` (assert on the runtime object, or anchor to declaration forms as
  red-baron's ROM-seam check at line 61 already does). *Found by Reviewer during code review.*

- **Gap** (non-blocking): `void building.close()` discards a promise with no `.catch()`, three lines above a
  `.catch()` that exists precisely because discarding a rejecting promise is a bug. Same function, same mistake,
  unfixed — and now shipping inside the shared library both cabinets depend on. Affects
  `arcade-shared/src/synth.ts:155`. *Found by Reviewer during code review.*

- **Question** (non-blocking): The engine can never recover from an externally-closed context (proven: zero new
  contexts after `close()` + 3 gestures), and the voice registry goes stale with it (`isVoiceActive()` returns
  `true` for oscillators that no longer exist). Nobody has *decided* this — it falls out of `if (ctx === null)`.
  Given `resume()` is already wired to every gesture, recovery is nearly free, but it must also clear `voices` or
  no voice will ever restart. The epic should rule on whether "permanently silent after any close" is the intended
  contract. Affects `arcade-shared/src/synth.ts`. *Found by Reviewer during code review.*

- **Improvement** (non-blocking): I confirm Dev's finding — battlezone's lang-review scan uses a raw
  `.toContain('as any')` substring check, which false-positives on ordinary English ("has any", "was any").
  It cost Dev a real cycle. Tighten to `/\bas any\b/`. Affects `battlezone/tests/shell/audio.test.ts`.
  *Found by Reviewer during code review.* → **FIXED in rework.**

### Reviewer (code review, round 2)

- **Gap** (blocking → FIXED): The round-1 recovery fix introduced its own regression. Recovery cleared the
  shared voice registry but not the nodes each cabinet holds *outside* it (battlezone's hum; red-baron's hum
  and approach whine), which sit behind `if (node === null)` build gates. After a recovery those refs still
  pointed at the DEAD context, so the gates never re-fired: the gun came back and the hum did not.
  Reproduced (`setEngine` built **zero** oscillators on the new context). **Asymmetric silence is worse than
  total silence — it looks like the recovery worked.** Fixed via `onRebuild`; mutation-tested.
  Affects `arcade-shared/src/synth.ts`, `battlezone/src/shell/audio.ts`, `red-baron/src/shell/audio.ts`.
  *Found by Reviewer during code review.*

- **Improvement** (non-blocking, for the EPIC): **Any future cabinet that holds a WebAudio node outside the
  shared voice registry must register an `onRebuild` reset**, or that sound dies permanently on the first
  context recovery. This is documented on the method itself, but it is a real footgun in shared
  infrastructure and worth stating in the epic's guidance. Affects `arcade-shared/src/synth.ts`.
  *Found by Reviewer during code review.*

- **Improvement** (non-blocking): The fake `AudioContext` harness is now duplicated **four** ways. TEA
  flagged it at three and deliberately scoped it out; the rework added recovery tests to two more suites, so
  the pressure has grown. A shared test helper is now clearly worth a follow-up story. Affects all suites.
  *Found by Reviewer during code review.*

- **Question** (non-blocking, process): The round-1 fix was itself reviewed and mutation-tested, and STILL
  shipped a regression — because every mutation targeted the shared engine and none crossed the repo boundary
  into how the cabinets hold state. The lang-review **#13 fix-introduced-regression** sweep is what caught it.
  Worth remembering: in a cross-repo extraction, the interesting bugs live at the seam, and a fix is a diff
  like any other. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Fused `live()` + `guard()` into a single `withAudio(effect)` primitive**
  - Spec source: context-story-SH2-18.md, Technical Approach ("VERB — extract (shared)")
  - Spec text: "the lazy gesture-gated context bootstrap; `live()`; `guard()`; the `Voice` interface; voice bookkeeping"
  - Implementation: The shared engine exposes `withAudio(effect: (t: SynthTarget) => void)` instead of exporting `live()` and `guard()` as two separate members.
  - Rationale: Every single method in BOTH cabinets is written as the same three lines — `const l = live(); if (l === null) return; guard(() => …)`. Exposing the two halves separately invites a caller to use one without the other, and using `guard()` without `live()` is precisely battlezone's current bug (it catches the throw but still builds into a dead context). Fusing them makes the correct usage the only usage. Both halves are still fully specified and tested; they are just not independently reachable.
  - Severity: minor
  - Forward impact: Dev implements `withAudio`; the games' methods become `synth.withAudio(({context, out}) => …)`. Pinned by `tests/synth.test.ts`.

- **Named the factory `createSynthEngine`, not `createAudioEngine`**
  - Spec source: context-story-SH2-18.md, Technical Approach (step 2)
  - Spec text: "Generic over the game's sound-name union, config injected — same shape as `createAudioEngine<N extends string>`"
  - Implementation: `createSynthEngine<N extends string>(config?: SynthConfig)`. Same *shape*, different *name*.
  - Rationale: `@arcade/shared/audio` already exports `createAudioEngine`. Reusing the name in `/synth` would collide the moment a game imports both — and the story's own guardrail is that these are siblings that can coexist, so that import is legitimate, not hypothetical. The shape (generic over a string-constrained name param, config injected) is preserved exactly.
  - Severity: minor
  - Forward impact: none beyond the name; `tests/synth-source-rules.test.ts` pins the generic on `createSynthEngine`.

- **Declined the optional fifth VERB primitive (a parameterised `noiseBurst`)**
  - Spec source: context-story-SH2-18.md, Technical Approach ("Judgement call left to TEA/Dev")
  - Spec text: "A parameterised `noiseBurst(ctx, out, {seconds, cutoffHz, peak, envelope})` is a defensible *fifth* VERB primitive, but the story's stated VERB list stops at `noiseBuffer`. Decide explicitly and record it as a Design Deviation if you take it."
  - Implementation: NOT taken. The shared skeleton exports `noiseBuffer` only; bz's `noiseBurst` and rb's `explosionBurst`/`gunVoice` stay local.
  - Rationale: The chain is shared but the ENVELOPE is not — bz ramps exponentially, rb walks the ROM's EXPVAL table per calculation frame. Parameterising over "envelope" means passing in a function that does the only part that actually differs, which buys nothing and drags a cabinet's shape into the shared package. This is the story's own VERB/NUMBERS line, held. Recorded here because the spec asked for an explicit decision either way.
  - Severity: minor
  - Forward impact: none — this is the spec's default. Revisit only if a THIRD cabinet wants the same envelope.

### Dev (implementation)

- **Rewrote red-baron's `scaffold.test.ts` pin assertion (a test this story did not own)**
  - Spec source: context-story-SH2-18.md, AC-10 + Scope ("Repinning both consumers off the new ref")
  - Spec text: "Repinning both consumers off the new ref (they are currently skewed: bz `#v0.13.1`, rb `#v0.12.0`, HEAD `0.13.2`)"
  - Implementation: `red-baron/tests/scaffold.test.ts` asserted the pin string **exactly** — `github:slabgorb/arcade-shared#v0.12.0`. Repinning necessarily broke it. Rather than swap in the new literal, I changed it to pin the git-URL **shape** (`#<some-ref>`, never a floating range — the invariant rb1-1 actually cared about) and added a second test proving the **resolved** package is new enough to carry `/synth` (reads `node_modules/@arcade/shared/package.json`, asserts ≥ 0.14.0, and imports the subpath).
  - Rationale: An exact-tag match is a tripwire, not a guard — SH2-14 already had to rewrite this line once, and a *shared extraction* would have to edit it **twice** (the feature branch during the dev inner-loop, then the tag at release). The replacement is strictly stronger: it catches the stale-lockfile git-dep trap (editing the `#ref` + a bare `npm install` keeps the OLD commit), which a package.json string match cannot see at all.
  - Severity: minor
  - Forward impact: `red-baron/tests/scaffold.test.ts` no longer needs editing on future pin bumps. Reviewer should confirm the weakened string match is acceptable given the stronger resolved-version check that replaces it.

### Reviewer (audit)

All four original deviations are stamped below, plus two taken during rework. No undocumented
deviations found.

- **Rework: the shared engine now RECOVERS from a closed context** → ✓ **ACCEPTED (new behaviour, beyond the original ACs).**
  - Spec source: context-story-SH2-18.md, AC-4 (the no-throw contract)
  - Spec text: "A **closed** context degrades to silence and never throws"
  - Implementation: it degrades *and then heals* — `resume()` discards a closed context and the next gesture builds a fresh one, clearing the voice registry with it.
  - Rationale: AC-4 is satisfied either way, so this is a deliberate step past the spec. Taken because the alternative — which the code shipped — was that any iOS audio reclaim silenced the cabinet for the rest of the session, and this engine is now the shared foundation every future game inherits. `resume()` was already wired to every gesture, so the fix is small and lands where the browser already permits context construction.
  - Severity: minor (additive; no existing behaviour removed)
  - Forward impact: every consumer gains recovery for free. Pinned by 4 tests including the autoplay guard ("no context is built without a gesture").

- **Rework: `onRebuild` added to the SynthEngine surface** → ✓ **ACCEPTED (forced by the above).**
  - Spec source: review round 2 finding (lang-review #13, fix-introduced regression)
  - Spec text: n/a — this is a consequence of the recovery deviation, not of the original spec
  - Implementation: `onRebuild(listener)` fires when a NEW context is built (first and every replacement). Both cabinets use it to null the nodes they hold outside the voice registry.
  - Rationale: recovery without it is a HALF recovery — registry voices return, the cabinets' free-running hum/whine do not — which is worse than no recovery because it looks like it works. The alternative (moving hum/whine into the registry) would force them into a `stop()`-shaped contract they don't fit: their oscillators free-run by design and the gain is the switch.
  - Severity: minor
  - Forward impact: **any future cabinet holding a node outside the registry MUST register an `onRebuild` reset.** This is stated in the method's own doc comment, which is the first place a new consumer will look.

- **TEA: Fused `live()` + `guard()` into `withAudio()`** → ✓ **ACCEPTED by Reviewer.** Not merely acceptable —
  *vindicated*. I mutation-tested it: bypassing the closed-context check while keeping the try/catch (i.e. `guard()`
  without `live()`) reproduces battlezone's original bug exactly. Fusing them makes that mistake unrepresentable in
  the API. Correct call.

- **TEA: Named the factory `createSynthEngine`, not `createAudioEngine`** → ✓ **ACCEPTED by Reviewer.** `/audio`
  already exports `createAudioEngine`, and the story's own guardrail is that the two subpaths coexist, so the
  collision was real rather than hypothetical. Shape (`<N extends string>`, config injected) is preserved.

- **TEA: Declined the optional fifth VERB primitive (parameterised `noiseBurst`)** → ✓ **ACCEPTED by Reviewer.**
  Verified the two bursts differ precisely in the envelope (battlezone ramps exponentially; red-baron walks the ROM
  EXPVAL table per frame). Parameterising over "the only part that differs" would have moved cabinet shape into the
  shared package for no gain. The spec asked for an explicit decision and got one.

- **Dev: Rewrote red-baron's `scaffold.test.ts` pin assertion** → ✗ **FLAGGED by Reviewer** (partial).
  The *substance* is right and I accept it: the new resolved-version + `await import('@arcade/shared/synth')` check
  is materially stronger than the old exact-tag string match, and it catches the stale-lockfile git-dep trap that a
  `package.json` string match cannot see at all. **But the comment lies about what the regex enforces.** It claims
  the pin is "never a floating range", while the regex `#[^"]+` accepts *any* ref — including `#main`, `#develop`,
  or the floating feature branch pinned right now. A comment that overstates a guard is worse than no comment,
  because the next reader trusts it. Fix the comment (or tighten the regex). See finding [DOC-2].

## Sm Assessment

Setup complete. Story is sound and worth doing, but **its premise needed correcting before TEA
touches it** — the title's "byte-identical copies" claim is false (verified by diff: ~13 identical
lines, not two identical files). I have rewritten the story context to say so; the sprint YAML title
is left alone (cosmetic, not worth a rewrite mid-sprint).

The reframing that matters for the next phase: **red-baron is the donor, and this is a behavior
change for battlezone, not a pure refactor.** Battlezone lacks the whole no-throw contract
(`live()`, `guard()`, ctor try/catch, `resume().catch()`). Adopting the shared VERB fixes a real
latent freeze — an escaping audio exception in bz would kill rendering and input, because
`updateContinuousSounds()` runs above the `requestAnimationFrame` re-schedule. TEA should write the
closed-context tests as **new behavior to prove**, not as regression risk to dodge; and bz's fake
`AudioContext` must be upgraded to the rb-grade one (its current `close()` doesn't even set
`state = 'closed'`, so it cannot express the bug).

Guardrails carried into the context and worth restating: `/synth` is the **sibling** of `/audio`
(SH2-16), never its replacement — `/audio` is a sample player and cannot host oscillator synthesis;
ship the VERB, keep the NUMBERS local (no cabinet may change audibly); merge arcade-shared with
**NO `--delete-branch`**; and repin consumers with `npm install @arcade/shared@github:...#<ref>`,
because editing the `#ref` plus a bare `npm install` silently keeps the old commit.

Scoped out deliberately: extracting the ~90%-duplicated fake-AudioContext test harness. It is real
duplication and genuinely tempting, but it is a third concern in an already three-repo story. Noted,
not done.

Estimate holds at 5 pts. No Jira (this project tracks locally in `sprint/` YAML). No blocking PRs
open in any of the three repos — merge gate clear.

Handing off to Imperator Furiosa for the RED phase.
## Dev Assessment

**Implementation Complete:** Yes
**Tests:** GREEN in all three repos — **1,920 passing, 0 failing**, builds clean.

| Repo | Tests | Build | Branch (pushed) |
|------|-------|-------|-----------------|
| arcade-shared | 453/453 (was 25 pass / 49 fail) | `tsc` clean | `feat/SH2-18-shared-synth` @ `80b74c9` |
| battlezone | 798/798 (was 792 pass / 6 fail) | clean | `feat/SH2-18-shared-synth` @ `af58825` |
| red-baron | 669/669 (was 665 pass / 3 fail) | clean | `feat/SH2-18-shared-synth` @ `8ea9fad` |

**Files Changed:**
- `arcade-shared/src/synth.ts` (new, 209 lines) — the VERB: lazy gesture gate, `resolveContextCtor` webkit fallback, `noiseBuffer`, voice registry, and `withAudio()` (the fused live-gate + no-throw guard).
- `arcade-shared/package.json` — `./synth` exports entry; 0.13.2 → **0.14.0**.
- `battlezone/src/shell/audio.ts` — rebuilt on the skeleton. Engine gone, NUMBERS kept.
- `red-baron/src/shell/audio.ts` — rebuilt on the skeleton. Engine gone, ROM seams + POKEY math kept.
- `red-baron/tests/scaffold.test.ts` — pin assertion un-hardcoded (see Design Deviations).
- both games' `package.json` / `package-lock.json` — repinned (feature branch, for now).

**THE BUG IS FIXED.** TEA reproduced battlezone's latent freeze; adopting the shared VERB closes it. Battlezone now treats a CLOSED context as absent, runs every Web Audio effect inside a guard, closes a half-built context instead of orphaning one per keystroke, and catches the rejection from `ctx.resume()` on a closed context. Those three RED tests are green — and they were green in red-baron all along, which is why red-baron was the donor.

**The fence held, verified by grep, not by vibes:**
- Local skeleton left in either cabinet: **none** (`resolveContextCtor` / `noiseBuffer` / `guard` / `live` / `new AudioContext` — zero hits in both).
- NUMBERS leaked into the shared skeleton: **zero** (`POKEY` / `AUDF` / `AUDC` / ROM-seam names — zero hits in `src/synth.ts`).
- NUMBERS still home: red-baron keeps all 4 ROM seams + POKEY math (22 refs); battlezone keeps `engineParams` / `saucerVoice` / `trackVoice`.
- `./audio` still exported alongside `./synth` — siblings, as required. Neither game imports `/audio`; both import `/synth`.

**Not audibly changed:** no cabinet NUMBER moved, and every pre-existing sound test in both games still passes untouched.

**⚠️ THE STORY IS NOT SHIPPABLE YET — the release dance remains (AC-10).** Both games currently pin the arcade-shared **feature branch**, which is right for the dev inner-loop and wrong for `develop`. Before this can merge:
1. Merge the arcade-shared PR **with NO `--delete-branch`** — the games' pins still resolve through that branch.
2. Cut `v0.14.0` on arcade-shared.
3. Repin both games with `npm install @arcade/shared@github:slabgorb/arcade-shared#v0.14.0` — **a bare `npm install` after editing the ref silently keeps the old commit.**
4. Only then delete the feature branch.

**Handoff:** To Immortan Joe (Reviewer).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1,920 tests green across 3 repos, tsc clean, 0 debug leftovers |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Disabled via settings — **domain assessed by Reviewer directly** (found the closed-context recovery gap) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Disabled via settings — **domain assessed by Reviewer directly** (cross-checked `guard()`/`withAudio()` swallow scope) |
| 4 | reviewer-test-analyzer | Yes | findings | 7 | confirmed 4, downgraded 2, deferred 1 |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Disabled via settings — **domain assessed by Reviewer directly** (found the stale red-baron header) |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Disabled via settings — domain covered by rule-checker #1/#2 + `tsc --noEmit` in all 3 repos |
| 7 | reviewer-security | Yes | clean | none | N/A — no exploitable surface (no backend/auth/tenants); verified lockfiles pin an exact SHA and CI uses `npm ci`, so the mutable branch ref cannot reach production |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Disabled via settings — **domain assessed by Reviewer directly** (found the test-only API surface) |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (lang-review #7 — `void building.close()` with no `.catch()`) |

**All received:** Yes (4 ran, 5 disabled — every disabled specialist's domain was assessed by me directly, and three of them yielded findings)
**Total findings:** 6 confirmed, 2 downgraded (with rationale), 1 deferred

**Independently re-verified by mutation before rejecting on them** — I did not take the test-analyzer's word:
- Renamed battlezone's returned `stopEngine` key (a genuine `TypeError: not a function` bug): **all 6 adoption tests still passed.** Only `tsc --noEmit` caught it.
- Bypassed the closed-context refusal inside `startVoice` so it builds into a dead context: **all 33 shared tests still passed.**
- Both mutations reverted; all three working trees clean.

## Reviewer Assessment

**Verdict:** REJECTED

The production code is, as far as I can tell, **correct** — and it does fix a real bug. That is not what I am rejecting on. I am rejecting because **the safety net for this story's central claim does not hold**, and I proved that with mutations rather than inferring it.

This story's headline is "a CLOSED context is treated as ABSENT, not as live-and-throwing." That distinction is the whole point — it is exactly what separates the fix from battlezone's old bug. Yet I can delete that refusal from `startVoice` and the suite stays green. The contract is asserted in prose and in one code path, and left unguarded in another.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [TEST] The headline contract is untested for the voice registry. Mutating `startVoice` to build into a **closed** context leaves all 33 tests passing. The "hammered on a closed context" test only asserts `.not.toThrow()` and passes builders that never touch the context, so it cannot see the difference between *refusing* a dead context and *catching* the throw from one — which is precisely the distinction the story exists to draw. Line 389's `synth.isVoiceActive('gun')` is called with **no `expect()` around it** — a dead assertion. Violates lang-review #8 ("assertions that would pass even if the behavior were wrong"). | `arcade-shared/tests/synth.test.ts:378-392` | Add a real closed-context test for the registry: after `close()`, assert a `vi.fn()` builder is **not called** and `isVoiceActive` is `false`. Wrap line 389's call in an assertion or delete it. |
| [HIGH] [TEST] Two adoption tests are vacuous — mutation-proven. I renamed the returned `stopEngine` key (real runtime `TypeError`, interface left intact) and **all 6 adoption tests passed**; only `tsc` caught it. `expect(src).toMatch(/saucerVoice/)` likewise matches the string in a *comment*. These scan the interface declaration and comments, not the implementation, so they cannot fail when the cabinet surface actually breaks. They are the only teeth AC-7/AC-8 have. Violates lang-review #8. | `battlezone/tests/shell/audio-adoption.test.ts:74,80`; `red-baron/tests/shell/audio-adoption.test.ts:68,75` | Assert against the **runtime object** (`typeof createAudioEngine().stopEngine === 'function'`), or anchor to a declaration form as red-baron's ROM-seam check at line 61 already correctly does. |
| [MEDIUM] [RULE] `void building.close()` discards a `Promise<void>` with **no `.catch()`**. The wrapping `try/catch` only catches a *synchronous* throw. This is the identical bug class the file fixes for `ctx.resume()` **three lines below** — the file applies its own no-throw contract inconsistently. Carried over from red-baron, but it now ships in the shared library both cabinets depend on. Untested: no fake models a rejecting `close()`. Violates lang-review #7. | `arcade-shared/src/synth.ts:155` | Add `.catch(() => {})` to `building.close()`, and make a fake `close()` reject in one test. |
| [MEDIUM] [EDGE] The engine can **never recover** from an externally-closed context. `resume()` guards on `if (ctx === null)`, but a closed context is not null — so it never rebuilds, and `ctx.resume()` rejects forever. Proven: after `close()`, three further gestures construct **zero** new contexts. A player whose tab is backgrounded (iOS reclaiming audio — the story's own motivating scenario) loses sound for the rest of the session. Compounding it, the voice registry is never cleared, so `isVoiceActive()` returns **true** on a dead context — meaning the naive one-line fix would silently fail to restart any voice. Not a regression, but now baked into shared code every future cabinet inherits, and the suite does not pin the intended behaviour in *either* direction. | `arcade-shared/src/synth.ts:167-201` | Decide the contract and pin it with a test: either recover (null out `ctx` + **clear `voices`** when `state === 'closed'`, then rebuild) or document "permanently silent after any close" as deliberate. Recovery is the better answer — `resume()` is already wired to every gesture. |
| [LOW] [DOC-1] Stale comment, directly contradicted by the paragraph beneath it: red-baron's header still claims "Battlezone (bz1-11) … **hand-writes the same local synthesis engine**." This diff is what makes that false. There is also a leftover `// ─── the engine ───` section banner sitting above code that is no longer the engine. | `red-baron/src/shell/audio.ts:18-19`, and the orphaned banner | Update the sentence; delete the dead banner. |
| [LOW] [DOC-2] The comment claims the pin regex enforces "an explicit ref, **never a floating range**", but `#[^"]+` accepts any ref — including `#main` or the floating feature branch pinned right now. A comment that overstates a guard is worse than none. (The *substance* of Dev's change is accepted — see Deviation Audit.) | `red-baron/tests/scaffold.test.ts:168-170` | Correct the comment, or tighten the regex to the shape it claims. |

**Verified good (evidence, not vibes):**
- [VERIFIED] **The VERB/NUMBERS fence holds, in both directions.** Zero cabinet symbols (`POKEY`/`AUDF`/`AUDC`/`gunStrobe`/`explosionLevel`/`approachWhine`/`engineHumParams`/`engineParams`/`saucerVoice`/`trackVoice`/`EXPL2_FRAMES`) appear anywhere in `arcade-shared/src/synth.ts` — grep-confirmed, and independently confirmed by rule-checker. Both cabinets retain all of theirs. The skeleton (`resolveContextCtor`/`noiseBuffer`/`guard`/`live`/`new AudioContext`) is **entirely gone** from both games — zero hits.
- [VERIFIED] **The real bug is genuinely fixed.** Battlezone's three previously-failing closed-context tests now pass: an `InvalidStateError` no longer escapes into the frame loop, no nodes are built into a dead context, and the two unhandled rejections from the bare `void ctx.resume()` are gone.
- [VERIFIED] `masterGain` defaults with `??`, not `||` — `arcade-shared/src/synth.ts:115`. A deliberate `masterGain: 0` (a muted cabinet) survives instead of being silently rewritten to 0.8. Guarded twice: behaviourally and at the source. Complies with lang-review #4.
- [VERIFIED] **Purity fence correct.** `synth` is in `BROWSER_SUBPATHS`, never `PURE_SUBPATHS` (`tests/purity.test.ts:72`) — right, since it touches `AudioContext`. `./audio` still ships beside `./synth`; the two are siblings, and a test now fails if `./audio` is ever deleted in favour of `./synth`.
- [SEC] **Security: clean — no exploitable surface, and none invented.** These are backend-less browser games: no auth, no tenants, no server, no untrusted input reaching the engine (voice names are compile-time literal unions owned by each cabinet). The areas that *could* have bitten were traced and are sound: no AudioContext leak on repeated gestures (the half-built context is closed, not orphaned), no unbounded growth in the voice registry, no prototype-pollution surface in the `globalThis` webkit lookup (a read-only feature detect), and `guard()`'s blanket swallow hides no security-relevant decision because there is none behind it.
- [SEC] [VERIFIED] **Supply chain is safe despite the mutable branch ref.** Both lockfiles pin the exact commit SHA `80b74c9`, and the R2 deploy workflow runs `npm ci`, which installs from the lockfile and ignores the `package.json` branch label. The floating ref cannot reach production.
- [VERIFIED] **The fakes are faithful** on the behaviours that matter: `close()` flips `state` synchronously, factories throw `InvalidStateError` synchronously once closed, and `resume()` rejects on a closed context — all correct per the Web Audio spec, and battlezone's upgraded fake matches arcade-shared's exactly.
- [VERIFIED] Type discipline clean across all three repos: no `as any`, no `as unknown as`, no `@ts-ignore`, no `catch (e: any)`, no bare `Function` type; `tsc --noEmit` passes under `strict: true` everywhere.
- [SIMPLE] [LOW, deferred] `isVoiceActive()` and `ready()` are called by **neither** game — test-only API surface. Defensible (`/audio` also exposes `ready()`, and `isVoiceActive` is how idempotency is asserted), so I am not blocking on it, but note it before a third cabinet arrives.

### Devil's Advocate

Let me argue this code is broken, because on the two things I care most about, it nearly is.

Start with what the tests *claim*. TEA wrote a beautiful header describing a no-throw contract with two halves — refuse the dead context, and swallow what it throws anyway — and correctly identified that catching without refusing is the bug. Then TEA tested the refusal for `withAudio` and **forgot it for the entire voice registry**. I removed the refusal from `startVoice` and the suite did not blink. So a future contributor "simplifying" `startVoice` to a null-check — the most natural refactor in the world, since `ctx !== null` *looks* like it means "we have a context" — reintroduces battlezone's exact bug into shared code used by every cabinet, and every test stays green. The suite would bless the regression it was written to prevent. That is not a hypothetical; it is a two-line diff away.

Now the adoption tests. They are the *only* mechanical enforcement that AC-7 and AC-8 happened. I renamed a method on the returned object — a bug that makes `engine.stopEngine()` throw at runtime the first time a tank stops moving — and all six passed, because they grep the source text and the *interface declaration* is still sitting there, untouched, a few lines up. A test that reads the type and calls it proof of the implementation is theatre. It survives only because `tsc` happens to catch this particular class of break; lean on the test for anything `tsc` can't see and it will wave the break straight through.

What would a stressed browser do? Close the context. Then the player keeps hammering keys, `resume()` fires on every one of them, and *nothing happens, forever* — no rebuild, and a voice registry still cheerfully reporting `isVoiceActive() === true` for oscillators that no longer exist. The engine survives; the sound does not, permanently. The suite has no opinion on whether that is intended, which means nobody decided it — it is an accident of `if (ctx === null)`.

And `void building.close()` sits three lines above a `.catch()` that exists *specifically because* discarding a rejecting promise is a bug. Same file, same function, same mistake, unfixed.

None of these breaks the game today. All of them are cheap to fix, and each one is a trap laid for the next person.

**What I am NOT rejecting on:** the extraction itself is well done. The VERB/NUMBERS split is clean and verified, `withAudio` is a genuinely better primitive than the two-part API the spec described, and battlezone materially gained a contract it never had. This is a good story with a soft safety net — fix the net, not the design.

**Handoff:** Back to TEA/Dev for rework. The fix list is small and entirely mechanical.
## Rework Round 1 — every finding fixed

All six review findings addressed. The two HIGH findings were test-quality failures, so the fix is
verified the same way the rejection was earned: **by re-running the mutations.**

| # | Finding | Fix | Proof |
|---|---------|-----|-------|
| HIGH [TEST] | Headline contract untested — `startVoice` could build into a dead context with all 33 tests green | Spy-based closed-context test: the builder must not be *invoked*, not merely not throw. Split the weak "hammered" test so it no longer calls `resume()` (which now recovers) and therefore genuinely hammers a corpse. Wrapped the unasserted `isVoiceActive` call. | Mutation (bypass the refusal) now **fails 1 test** — previously passed |
| HIGH [TEST] | Adoption tests vacuous — renaming the returned `stopEngine` key (runtime `TypeError`) passed all 6 | Surface asserted on the object `createAudioEngine()` **returns**; every method driven pre-gate to prove it is really wired; NUMBERS asserted by **behaviour** (engineParams endpoints/monotonicity/clamping; gunStrobe/explosionLevel/approachWhine/engineHumParams ROM facts); remaining source checks anchored to `function foo(` declaration forms | Mutation (rename returned key) now **fails 2 tests**; mutation (rename `saucerVoice`, leave it in a comment) now **fails 1** — both previously passed |
| MEDIUM [RULE] | `void building.close()` discarded a rejecting promise (lang-review #7) | `.catch()` added; fake `close()` can now reject | Mutation (drop the `.catch()`) now **fails 1 test** |
| MEDIUM [EDGE] | Engine could never recover from a closed context; voice registry went stale | **Contract decided: it recovers.** `resume()` discards a closed context and the next gesture builds a fresh one — and **clears `voices`**, or a stale entry would make `startVoice` a permanent no-op (the gun would never fire again). `isVoiceActive()` no longer lies on a dead context. | Mutation (remove recovery) now **fails 3 tests**; 4 new tests pin the contract in both directions (including "no context is built without a gesture" — autoplay policy) |
| LOW [DOC-1] | red-baron header claimed battlezone "hand-writes the same local synthesis engine" — false as of this diff | Corrected; orphaned `// ─── the engine ───` banner removed | — |
| LOW [DOC-2] | scaffold comment claimed the pin regex enforces "never a floating range" — it accepts `#main` | Comment now states exactly what it proves, and points at the resolved-version check that carries the real weight | — |
| (bonus) | bz lang-review `toContain('as any')` false-positives on English ("has any") — cost Dev a cycle | Word-boundary regex, matching arcade-shared's convention | — |

**Mutation scoreboard — every mutation that survived round 1 is now caught:**

| Mutation (a real bug, injected) | Round 1 | Now |
|---|---|---|
| `startVoice` builds into a dead context | survived | **caught** |
| Closed-context recovery removed | n/a (didn't exist) | **caught** (3 tests) |
| `.catch()` dropped from `building.close()` | survived | **caught** |
| Returned `stopEngine` key renamed (runtime `TypeError`) | survived | **caught** (2 tests) |
| `saucerVoice` renamed, name left in a comment | survived | **caught** |

**Suites (all green, all sources restored after mutation, all trees clean):**

| Repo | Tests | Build | Pushed |
|------|-------|-------|--------|
| arcade-shared | **460/460** (was 453) | tsc clean | `1ea1678` |
| battlezone | **800/800** (was 798) | clean | `4910f6e` |
| red-baron | **670/670** (was 669) | clean | `7b68ec9` |

Both games were re-resolved onto the fixed shared build with
`npm install @arcade/shared@github:...#<ref>` (a bare `npm install` keeps the old commit) and verified
to actually contain the recovery code — not merely re-pinned on paper.

**Behaviour change worth flagging to the epic:** the shared engine now **recovers** from a closed
context rather than staying silent for the session. That is new behaviour beyond the original ACs,
taken deliberately in review: `resume()` was already wired to every gesture, the fix is small, and
leaving it meant every future cabinet inherits "iOS reclaims audio → no sound until reload."
## Rework Round 2 — the recovery fix had a hole, and it was the dangerous kind

The round-2 rule-checker's **fix-introduced-regression** pass (lang-review #13) caught a real defect
**created by round 1's own recovery fix**. I reproduced it before acting on it.

**The hole.** Recovery cleared the shared engine's voice registry, so the voices the registry owns
(`gun`, `saucer`, `track`) came back after a context close. But each cabinet ALSO holds free-running
nodes *outside* that registry — battlezone's engine hum, red-baron's hum and enemy-approach whine.
Their oscillators free-run and the GAIN is the on/off switch, so they sit in local `humOsc`/`whineOsc`
slots built once behind an `if (node === null)` gate. Those refs survived a recovery still pointing at
the **dead** context, so the gate never re-fired.

Reproduced: after `close()` + `resume()`, `setEngine` built **zero** oscillators on the new context.

**Why this was worse than the bug it came from.** The gun came back and the hum did not. Uniform
silence is obvious; *asymmetric* silence looks like the recovery worked. And in red-baron the casualty
is the approach whine — the only warning that an enemy plane is on you.

**The fix.** The shared engine now ANNOUNCES a rebuild (`onRebuild`) and each cabinet drops its stale
references. Fired only inside the construction branch — a repeat gesture on a live context is not a
rebuild, and firing on every keypress would have cabinets tearing down their hum continuously. The
listeners run inside `guard()`, because they are cabinet callbacks executing inside `resume()` — the
one function this file exists to keep throw-proof.

**Mutation scoreboard — all seven now caught:**

| Mutation (a real bug, injected) | R1 | R2 | Now |
|---|---|---|---|
| `startVoice` builds into a dead context | survived | caught | **caught** |
| Closed-context recovery removed | n/a | caught (3) | **caught** |
| `.catch()` dropped from `building.close()` | survived | caught | **caught** |
| Returned `stopEngine` key renamed (runtime `TypeError`) | survived | caught (2) | **caught** |
| `saucerVoice` renamed, name left in a comment | survived | caught | **caught** |
| Cabinet forgets its `onRebuild` reset (the R2 regression) | — | — | **caught (2)** |
| Engine fires `onRebuild` on every resume, not just a rebuild | — | — | **caught** |

**Suites (all green, trees clean, all pushed):**

| Repo | Tests | Build | Head |
|------|-------|-------|------|
| arcade-shared | **463/463** | tsc clean | `733f180` |
| battlezone | **803/803** | clean | `0a76c85` |
| red-baron | **673/673** | clean | `6a40e21` |

Both games re-resolved onto the new shared build and verified to actually contain `onRebuild` — not
merely re-pinned on paper.

**Lesson worth keeping:** the round-1 recovery fix was reviewed, mutation-tested, and *still* shipped a
regression, because the mutations all targeted the shared engine and none crossed the repo boundary
into how the cabinets hold state. The `#13` fix-regression sweep is what caught it. A fix is a diff like
any other and deserves the same adversarial pass as the code it repairs.

## Subagent Results (round 2)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1,933 green at the time; trees clean, pushed; zero mutation residue; both games' lockfiles verified pinning arcade-shared HEAD (not a stale git-dep) |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Domain assessed by Reviewer — probed recovery for context leaks (20 close/resume cycles → exactly 1 open context) and for false rebuilds on a merely *suspended* context |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Domain assessed by Reviewer — `onRebuild` listeners run inside `guard()`; verified one throwing listener neither takes down `resume()` nor starves the others |
| 4 | reviewer-test-analyzer | Yes | Skipped | not re-run | Round-1 findings all fixed and **re-verified by re-running its mutations** (see scoreboard) |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Domain assessed by Reviewer — both stale/overclaiming comments from round 1 corrected |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Covered by rule-checker #1/#2 + `tsc --noEmit` clean in all three repos |
| 7 | reviewer-security | Yes | clean | none | Round 1: no exploitable surface; nothing in the rework changes that (no new input, no new I/O) |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Domain assessed by Reviewer — `onRebuild` is the minimal viable signal; the alternative (forcing hum/whine into the registry) fits them worse |
| 9 | reviewer-rule-checker | Yes | findings | 1 | **confirmed 1 — and it was the round-2 regression.** Fixed, re-verified by mutation. |

**All received:** Yes (3 ran, 6 assessed directly — the disabled specialists' domains were covered by me, and the rule-checker's #13 sweep is what caught the regression)
**Total findings:** 1 confirmed (fixed), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

The round-1 findings are all fixed, and — the part that matters — the rework's **own** regression was
caught and fixed too. The rule-checker's fix-introduced-regression sweep found that my recovery fix had
brought back the gun but not the hum; I reproduced it (`setEngine` built zero oscillators on the new
context), fixed it with `onRebuild`, and mutation-tested the fix.

**Every mutation now bites.** This is the evidence the approval rests on — not the green suite, which
was green in round 1 too while three real bugs walked through it:

| Mutation (a real bug, injected) | Round 1 | Now |
|---|---|---|
| `startVoice` builds into a dead context | survived | **caught** |
| Closed-context recovery removed | n/a | **caught** (3 tests) |
| `.catch()` dropped from `building.close()` | survived | **caught** |
| Returned `stopEngine` key renamed (runtime `TypeError`) | survived | **caught** (2 tests) |
| `saucerVoice` renamed, name left in a comment | survived | **caught** |
| Cabinet forgets its `onRebuild` reset | — | **caught** (2 tests) |
| Engine fires `onRebuild` on every resume, not just a rebuild | — | **caught** |

**Data flow traced:** a user gesture → `resume()` → (a closed context is discarded, the registry cleared,
listeners fired) → a fresh `AudioContext` + master `GainNode` → `withAudio` hands each cabinet a live
`{context, out}` → the cabinet builds its own nodes from its own NUMBERS → master → destination. Safe
because every step past the gate is refused on a dead context and swallowed on a throw, and nothing is
constructed before a gesture.

**Pattern observed:** `withAudio` fusing the live-gate and the no-throw guard (`arcade-shared/src/synth.ts`)
is the load-bearing design idea here. Round 1 proved it by mutation: `guard()` without `live()` *is*
battlezone's original bug, and the fused primitive makes that mistake unrepresentable. Good API design is
the kind that makes the bug unspellable.

**Error handling:** `guard()` swallows deliberately and the scope is correctly argued in the header — sound
may die, the game never does. `building.close().catch()` and `ctx.resume().catch()` now handle rejections
consistently (`synth.ts`), which round 1 did not.

**Remaining non-blocking notes, carried to Delivery Findings (do not block merge):**
- The fake `AudioContext` harness is now duplicated four ways. Real duplication; a follow-up story, and
  deliberately out of scope here.
- `isVoiceActive()`/`ready()` are still called by neither game — test-only surface. Defensible, noted.
- **AC-10 is not yet satisfied and this is NOT shippable to `develop` as-is:** both games still pin the
  arcade-shared **feature branch**. The release dance must happen — merge arcade-shared with **NO
  `--delete-branch`**, cut `v0.14.0`, then repin both games with
  `npm install @arcade/shared@github:...#v0.14.0` (a bare `npm install` keeps the old commit). SM owns this
  in the finish phase.

**Handoff:** To SM for finish-story.