---
story_id: "SH4-5"
jira_key: "SH4-5"
epic: "SH4"
workflow: "trivial"
---
# Story SH4-5: Retire the audio-dispatch.ts duplication across all 7 games (asteroids, battlezone, centipede, joust, missile-command, red-baron, tempest)

## Story Details
- **ID:** SH4-5
- **Jira Key:** SH4-5
- **Workflow:** trivial
- **Stack Parent:** none
- **Points:** 3
- **Priority:** p3

## Branch Information
- **Branch Strategy:** gitflow (feat/SH4-5-retire-audio-dispatch-duplication)
- **Branch:** feat/SH4-5-retire-audio-dispatch-duplication
- **Base:** develop

## Workflow Tracking
**Repos:** arcade
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-08-11T13:10:18Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-11T11:41:18Z | 2026-08-11T12:27:54Z | 46m 36s |
| red (aborted — re-routed tdd→trivial: green-on-arrival convention guard, no production RED) | 2026-08-11T12:27:54Z | 2026-08-11T12:27:54Z | 0s |
| implement | 2026-08-11T12:27:54Z | 2026-08-11T12:55:15Z | 27m 21s |
| review | 2026-08-11T12:55:15Z | 2026-08-11T13:03:57Z | 8m 42s |
| implement | 2026-08-11T13:03:57Z | 2026-08-11T13:06:33Z | 2m 36s |
| review | 2026-08-11T13:06:33Z | 2026-08-11T13:10:18Z | 3m 45s |
| finish | 2026-08-11T13:10:18Z | - | - |

## Architect Assessment

**Decision:** Extract NOTHING into `src/shared`. SH4-5 resolves as a convention pin: a new orchestrator guard `tests/audio-dispatch-convention.test.mjs` (TS-AST-based, node:test) + a 5-clause convention paragraph in `src/shared/audio.ts`'s header. Zero changes under `plugins/`, zero new runtime exports from shared. Full decision + derived ACs appended to `sprint/context/context-story-SH4-5.md` (`## Design Gate Decision (Architect — SH4-5)`).

**Rationale:** The extractable mechanism already shipped — `@shared/audio`'s generic `AudioEngine<N>` (play/startLoop/stopLoop/tick) is aliased outright by tempest/joust/centipede and underlies asteroids/star-wars. What the title calls an "identical type" is a `Pick` (a TS builtin) over seven DIFFERENT engine types with five distinct member sets; the skeleton itself diverges (joust cueFor+tick-first no-loops; centipede is already table-driven locally; bz/rb/mc carry continuous/edge companion exports; asteroids nests on `event.source`; tempest has multi-call hand-off bodies). The residue is a ~6-line idiom + per-game ROM cue maps, which the epic's own rule keeps in the games.

**Alternatives Considered:**
- Table-driven/HOF `makeEventDispatcher`: config surface exceeds the code replaced; forces 7 behavior-neutral rewrites of audited cue maps. Rejected.
- Shared `SoundPlayer<N>` Pick alias: serves ≤3 games, decouples dispatch from each game's actual engine, and is a name not a mechanism (below ADR-0001's bar). Rejected.
- One unified type name/member set: refuted by measurement — invents loops for joust, amputates rb/bz/mc verbs. Rejected.
- Shared `unreachable(never)` helper: below the epic's own triviality bar (the deferred `mod` precedent). Rejected.

**Implementation Guidance:**
- TEA: RED = the guard's ACs 1–4 in the context file (set-identity over the 7 files; AST no-bare-`AudioEngine`-param; AST `never`-anchor; inline negative fixtures as restrictive-direction controls). Use the `typescript` package (devDep ^5.4.0) — AST, not regex (mc10-6 ruling).
- Dev: guard file + comment-only edit to `src/shared/audio.ts`. Nothing else. `npm run test:orchestrator` + full vitest stay green; `git diff` must show no `plugins/` changes.

**Handoff:** To Dev (implement) — see SM Re-route note below

## SM Re-route Note (tdd → trivial, 2026-08-11)

TEA's RED-phase measurement confirmed all 7 dispatch files ALREADY comply with every
testable AC (no bare-`AudioEngine` param; each carries a `never`-typed anchor), and the
Architect's design keeps `plugins/**` untouched and the `@shared/audio` comment a Reviewer
checklist item (not a test). The guard is therefore GREEN ON ARRIVAL, which the `tdd`
`tests-fail` gate cannot honestly accept (it requires ≥1 failing test). Per user ruling,
SH4-5 re-routed to the `trivial` workflow (setup → implement → review → finish). Dev builds
the whole deliverable in one implement step; non-vacuity is proven by the guard's own inline
negative-fixture controls (AC-4), not by a production RED.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### Architect (design)
- **Gap** (non-blocking): epic SH4's description frames SH4-5 as an extraction; the design gate resolves it as document-and-pin (extract nothing). Affects `sprint/epic-SH4.yaml` (SM should reflect the resolved scope in the story's finish notes so the epic record matches what shipped). *Found by Architect during design.*
- **Improvement** (non-blocking): pac-man's inline stateful dispatch and star-wars's table/lookup engine are legitimate counter-models and are pinned as deliberate exemptions by the guard's set-identity AC-1 — no story needed; recorded here so the exemption is on the record with an owner (SM). *Found by Architect during design.*

### Dev (implement)
- No upstream findings. All 7 dispatch files complied with AC-2/AC-3 on arrival (as the Architect predicted); the guard is a pin, and its teeth were proven two ways — inline AC-4 controls AND a mutation probe against real asteroids/joust text (bare-param flips AC-2 true; stripped `never` flips AC-3 false).

## Dev Assessment (implement)

**Shipped (exactly the Architect's migration table — no more):**
- `tests/audio-dispatch-convention.test.mjs` — NEW node:test orchestrator guard using the `typescript` compiler API (AST, trivia-blind — mc10-6 ruling). 6 tests: AC-1 set-identity over dispatch-file owners; AC-2 no bare-`AudioEngine` param (AST); AC-3 `never`-typed anchor inside a function body (AST); AC-4a/b/c restrictive-direction controls (bare-param rejected, comment-only `never` rejected, compliant fixture accepted).
- `src/shared/audio.ts` — COMMENT-ONLY: the 5-clause convention paragraph above `AudioEngine<N>`. No runtime export added or changed.

**Verification (all run, all green):**
- `node --test tests/audio-dispatch-convention.test.mjs` → 6/6 pass.
- Mutation non-vacuity proof: asteroids `SoundPlayer`→`AudioEngine` param ⇒ AC-2 predicate returns true (caught); joust `const _exhaustive: never`→untyped ⇒ AC-3 predicate returns false (caught).
- `npm run test:orchestrator` → 463/463 pass (includes the new 6).
- `npm run lint` (tsc --noEmit, repo-wide) → exit 0.
- `git status -- plugins/` → clean (zero game changes, as designed). `git diff src/shared/audio.ts` → comment-only.

**Handoff:** To Reviewer (review)

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No deviations

## Prior Review — Round 1 (REJECTED, SUPERSEDED by the Reviewer Assessment below)

**Verdict: REJECTED — one required fix (a verified-false comment in a permanent shared header). Logic is sound; this is a prose-accuracy block, not a code block.**

### Subagent Results
| Subagent | Status | Outcome |
|----------|--------|---------|
| reviewer-preflight | Received: Yes | All green: guard 6/6, orchestrator 463/463, lint exit 0, ZERO `plugins/` changes, `audio.ts` comment-only. Boundary constraint satisfied. |
| reviewer-test-analyzer | Received: Yes | 4 findings (1 "Critical", 2 High, 1 Medium) — all evaluated NON-BLOCKING (see dispositions). Confirmed AC-1 sound, AC-4 non-vacuous, no zero-assertion tests. |
| reviewer-comment-analyzer | Received: Yes | 1 real finding (star-wars mischaracterization) — CONFIRMED by me against `plugins/star-wars/src/main.ts:148-259`. This is the required fix. |
| reviewer-rule-checker | Received: Yes | 0 violations across all 26 TS-gate checks + 4 project rules; several confirmed by executing the test. |
| reviewer-silent-failure-hunter | Skipped / disabled | `workflow.reviewer_subagents.silent_failure_hunter: false` |
| reviewer-type-design | Skipped / disabled | `workflow.reviewer_subagents.type_design: false` |
| reviewer-security | Skipped / disabled | `workflow.reviewer_subagents.security: false` |
| reviewer-simplifier | Skipped / disabled | `workflow.reviewer_subagents.simplifier: false` |
| reviewer-edge-hunter | Skipped / disabled | `workflow.reviewer_subagents.edge_hunter: false` |

### REQUIRED fix (blocking)
1. **False comment about star-wars's dispatch (comment-analyzer, CONFIRMED).** The claim "star-wars selects cues via lookup tables" is factually wrong. `plugins/star-wars/src/main.ts:148` is a `switch (event.type)` calling `audio.play(...)`, closed by `const _exhaustive: never = event` (:259) — the SAME closed-union-switch + never-guard pattern as the seven, just inlined in `main.ts` (and using the full engine, not a Pick — so it also would not satisfy clause 2). Its lookup tables (`SOUNDS`/`CHANNELS`/… in `shell/audio.ts`) resolve sound-name→file INSIDE the engine — a different step from event→cue selection. The correct exemption reason is: **star-wars has no standalone `src/shell/audio-dispatch.ts` — its dispatch is inlined in `main.ts`** (which is exactly what AC-1's set-identity keys on). Fix in all three places the false phrasing propagated to:
   - `src/shared/audio.ts` (the exemption line in the new convention paragraph)
   - `tests/audio-dispatch-convention.test.mjs:26` (test header)
   - `sprint/context/context-story-SH4-5.md:107` (Architect decision text)

### RECOMMENDED (same pass, non-blocking)
2. **AC-4 header overclaim (test-analyzer Finding 4).** The header at `tests/audio-dispatch-convention.test.mjs` says AC-4 "proves the predicates have teeth." It proves TRIVIA-blindness (a comment can't satisfy them), but not alias/rename immunity. Soften the wording to claim only what the fixtures demonstrate.

### Findings CONSIDERED and DISMISSED with rationale (on the record; not required)
- **test-analyzer Finding 1 ("Critical": AC-3 accepts any never-typed local, not only a switch-default anchor).** DOWNGRADED to informational. (a) The reproduction requires a `const decoy: never = (undefined as unknown) as never` double-cast; in cast-free code `const _x: never = event` only *compiles* when the switch narrowed to `never`, so **`tsc` is the real exhaustiveness gate** and the guard pins the idiom's presence. (b) The suggested "require switch-default" tightening would produce a FALSE POSITIVE on **centipede**, whose legitimate anchor is a `Record` + `const unreachable: never = effect` (not a switch-default). The location-agnostic predicate is CORRECT BY DESIGN — it accommodates both the switch-default and Record forms the Architect's AC-3 explicitly allows.
- **test-analyzer Findings 2 & 3 (High: AC-2 defeated by a local alias / renamed import).** NON-BLOCKING. These are the Architect's deliberately-simplified AC-2 ("no parameter is typed bare `AudioEngine`"); closing them fully needs a type-resolving `tsc` program beyond the AST scope the design chose. No game does it; the coupling of the local `Pick` to the real engine makes aliasing-to-full-engine unnatural; `tsc` still typechecks. Routed as a non-blocking hardening note below rather than expanding scope.

### Independent verification I ran (not rubber-stamping)
- Predicate edge probes: AC-3 correctly REJECTS a module-scope `never` and accepts arrow/method anchors; AC-2 flags even a full generic `AudioEngine<Foo>` param. Mutation probe against real asteroids/joust text: both predicates flip when the file is genuinely broken.
- Confirmed the star-wars finding directly in `main.ts` (did not take the subagent's word).

**Handoff:** To Dev (implement) — fix #1 (required) and #2 (recommended); no logic changes needed.

## Dev Rework (round 2)

Both review items addressed — comment-only, zero logic change:
1. **REQUIRED — star-wars mischaracterization fixed in all 3 files.** Replaced "star-wars selects cues via lookup tables" with the accurate exemption reason: star-wars inlines the same `switch (event.type)` + `const _exhaustive: never` dispatch in `main.ts:148-259` and has NO standalone `audio-dispatch.ts` (which is what AC-1's set-identity keys on); its lookup tables resolve sound-name→file inside the engine, a different step.
   - `src/shared/audio.ts` (convention paragraph exemption line)
   - `tests/audio-dispatch-convention.test.mjs` (AC-1 header note)
   - `sprint/context/context-story-SH4-5.md` (Architect decision, counter-models §4)
2. **RECOMMENDED — AC-4 overclaim softened.** The AC-4 section now states it proves the predicates are not TRIVIA-satisfiable (comment-only `never` and bare-engine param both rejected), and explicitly notes it does NOT claim alias/rename immunity (that gap is the Architect's deliberate simple-form AC-2, backstopped by `tsc` + clause 2 prose).

**Re-verification (all green):** guard 6/6, `npm run test:orchestrator` 463/463, `npm run lint` exit 0, `git status -- plugins/` clean, `src/shared/audio.ts` still comment-only.

**Handoff:** To Reviewer (re-review, round 2)

## Reviewer Assessment

**Verdict: APPROVED** (round 2).

**What was reviewed:** SH4-5 ships a "document-and-pin" design-gate resolution — a new TS-AST orchestrator guard (`tests/audio-dispatch-convention.test.mjs`) that pins the audio-dispatch convention across the seven games, plus a comment-only 5-clause convention paragraph in `src/shared/audio.ts`. Zero `plugins/` changes, zero new shared runtime exports. Round 1 rejected on one verified-false comment (star-wars mischaracterized as "lookup tables"); round 2 confirms that fix landed accurately in all three affected files and softened the AC-4 overclaim, with the suite still green.

**Round-2 verification (independently run, not rubber-stamped):**
- The false "star-wars selects cues via lookup tables" phrasing is GONE from `src/shared/audio.ts`, `tests/audio-dispatch-convention.test.mjs`, and `sprint/context/context-story-SH4-5.md`; each now states the accurate exemption (star-wars inlines the same `switch (event.type)` + `never` guard in `main.ts:148-259`, no standalone `audio-dispatch.ts`). `grep` for the old phrasing → 0 hits.
- Guard 6/6, `npm run test:orchestrator` 463/463, `npm run lint` exit 0, `git status -- plugins/` clean, `src/shared/audio.ts` diff still comment-only.

### Dispatch tags (all 8 specialists accounted for)
- `[TEST]` — test-analyzer: CONFIRMED the guard is non-vacuous (AC-1 real inventory, AC-4 controls exercise the real predicates). Its "Critical" AC-3 finding DISMISSED with rationale: a cast-free `const _:never` only compiles when the switch is exhaustive (`tsc` is the real gate), and the suggested switch-default tightening would FALSE-POSITIVE on centipede's `Record`+`never` form — the location-agnostic predicate is correct by design. AC-2 alias/rename gaps DISMISSED as the Architect's deliberate simple-form AC (backstopped by `tsc` + prose). Its Medium "AC-4 overclaim" finding CONFIRMED and FIXED.
- `[DOC]` — comment-analyzer: CONFIRMED the star-wars mischaracterization (I verified against `main.ts`), drove the round-1 reject; FIXED and re-verified. Other comment claims (7-game count, centipede "Record" form, pac-man stateful driver, "five member sets") checked and accurate.
- `[RULE]` — rule-checker: 0 violations; node:test/.mjs orchestrator convention, core/shell purity, "no new shared export", and the AST-reads-.ts-as-text rule all PASS.
- `[EDGE]` — edge_hunter DISABLED on this project; I covered the boundary myself: AC-1 throws loudly (not silently passes) if `plugins/` is unreadable; predicates handle arrow/method/module-scope cases correctly (probed).
- `[SILENT]` — silent_failure_hunter DISABLED; no error-swallowing surface — the guard is pure fs-read + AST-walk with assertions; no try/catch, no fallbacks.
- `[TYPE]` — type_design DISABLED; N/A — no new types/exports (comment-only shared change); the guard is `.mjs`.
- `[SEC]` — security DISABLED; N/A — no user input, no secrets, no injection surface; "input" is the repo's own committed source read structurally.
- `[SIMPLE]` — simplifier DISABLED; the design is minimal by construction (the Architect rejected the HOF/table alternatives as more config than code); the guard is two small predicates + a sweep + controls.

### Rule Compliance
Enumerated project rules checked (via rule-checker + my own read), all VERIFIED:
1. **Orchestrator suite = `tests/**/*.test.mjs` under `node:test`, not vitest** — VERIFIED: filename + `import { test } from 'node:test'`, no vitest import. Rule-compatible (CLAUDE.md "Commands").
2. **Core/shell purity boundary** — VERIFIED: zero `src/core` files touched; the guard reads `src/shell/*` as TEXT via `ts.createSourceFile`, never executes plugin code. Rule-compatible (CLAUDE.md purity boundary).
3. **"Share the VERB, not the NUMBERS" / no new `src/shared` runtime export** — VERIFIED: `src/shared/audio.ts` change is comment-only above the unchanged `AudioEngine<N>`; no new export. Rule-compatible (CLAUDE.md shared-extraction rule; ADR-0001 bar cited by the Architect).
4. **Node ≥22.18 `.ts` handling** — VERIFIED: the guard reads `.ts` as text, never imports it, so it doesn't depend on type-stripping; `import ts from 'typescript'` is the npm package. Rule-compatible.
5. **Source-text guard must match the CLAIM, not a token (mc10-6 ruling)** — VERIFIED: structural AST predicates, proven trivia-blind by AC-4b and my probe. Rule-compatible.

No VERIFIED contradicts any subagent finding (the one CONFIRMED blocking finding was fixed, not overridden).

### Routed follow-up (non-blocking, filed so it isn't lost)
- **AC-2/AC-3 hardening (test-analyzer Findings 1–3):** the AST predicates are syntactic by the Architect's deliberate design; a future edit could bypass AC-2 via an alias/renamed import, or (with a cast) satisfy AC-3 without exhaustiveness. Closing these needs a type-resolving `tsc` program, out of scope for this pin. **Owner: SM** — file as a low-priority SH4 follow-up ("harden audio-dispatch-convention guard to resolve aliases / require switch-position never") if the convention ever needs stronger enforcement. Not required for merge: `tsc` + the human convention prose already backstop both.

## Subagent Results
**All received:** Yes

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — mechanical baseline all green; boundary satisfied |
| 2 | reviewer-test-analyzer | Yes | findings | 4 (1 "Critical", 2 High, 1 Medium) | DISMISSED ×3 with rationale (see `[TEST]`); CONFIRMED+FIXED the AC-4 overclaim |
| 3 | reviewer-comment-analyzer | Yes | findings | 1 (star-wars mischaracterization) | CONFIRMED → drove round-1 reject → FIXED + re-verified round 2 |
| 4 | reviewer-rule-checker | Yes | clean | 0 violations / 26 TS checks + 4 project rules | N/A — all PASS |
| 5 | reviewer-silent-failure-hunter | Skipped | disabled | n/a | `workflow.reviewer_subagents.silent_failure_hunter: false` |
| 6 | reviewer-type-design | Skipped | disabled | n/a | `workflow.reviewer_subagents.type_design: false` |
| 7 | reviewer-security | Skipped | disabled | n/a | `workflow.reviewer_subagents.security: false` |
| 8 | reviewer-simplifier | Skipped | disabled | n/a | `workflow.reviewer_subagents.simplifier: false` |
| 9 | reviewer-edge-hunter | Skipped | disabled | n/a | `workflow.reviewer_subagents.edge_hunter: false` |

**Handoff:** To SM (finish).