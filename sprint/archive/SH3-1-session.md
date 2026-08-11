---
story_id: "SH3-1"
jira_key: "SH3-1"
epic: "SH3"
workflow: "tdd"
---
# Story SH3-1: joust — retire the inlined mulberry32

## Story Details
- **ID:** SH3-1
- **Jira Key:** SH3-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** gitflow (feat/SH3-1-joust-shared-rng)
- **Branch:** feat/SH3-1-joust-shared-rng
- **PR:** 236

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-11T12:51:46Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-11T11:49:10Z | 2026-08-11T11:50:48Z | 1m 38s |
| red | 2026-08-11T11:50:48Z | 2026-08-11T12:35:33Z | 44m 45s |
| green | 2026-08-11T12:35:33Z | 2026-08-11T12:40:31Z | 4m 58s |
| review | 2026-08-11T12:40:31Z | 2026-08-11T12:51:46Z | 11m 15s |
| finish | 2026-08-11T12:51:46Z | - | - |

## Sm Assessment

Setup complete. SH3-1 is a 2pt determinism swap in `plugins/joust`: two byte-for-byte
`mulberry32` copies (`src/core/frame.ts:200`, `src/core/transporter.ts:255` — `rngNext`)
sit behind a stale git-URL comment; retire them and import `@shared/rng` instead.

**Why tdd, not trivial:** the risk is silent replay/demo drift. The float sequence must be
proven identical for any seed before and after the swap. That is a regression-lock test that
must exist and go RED against the current inlined code path, not a mechanical chore.

**TEA (RED) focus:**
- Pin a test asserting `@shared/rng`'s float sequence is byte-identical to the current
  inlined `mulberry32` output for representative seeds (0, and a few non-trivial values).
- Respect the core/shell boundary — the joust purity test scans `src/core/` source text;
  the import must not introduce a clock/side-effect that trips it.
- Both call sites (`frame.ts`, `transporter.ts`) share one implementation now; verify the
  shared module reproduces the same `rngNext` semantics both rely on.

No branch collision (probed — no prior SH3-1 branches). No Jira (local sprint tracking).

## Tea Assessment

RED committed on `feat/SH3-1-joust-shared-rng` (commit 40ecfdde). New file:
`plugins/joust/tests/rng-shared-adoption.test.ts`. State: **3 failed / 3357 passed**
project-wide — the 3 reds are exactly the retirement guard; nothing else is red.

### The three RED assertions (what GREEN must satisfy)
1. `src/core/frame.ts` carries no live `0x6d2b79f5` numeric literal.
2. `src/core/transporter.ts` carries no live `0x6d2b79f5` numeric literal.
3. At least one `src/core/` module imports `@shared/rng`.

The magic-constant sweep is AST-based (`ts.isNumericLiteral`), so **commenting the old
copy out does NOT satisfy it** — the body must actually leave. It sweeps the whole
`src/core/` tree, so the Dev is free to either import `@shared/rng` directly in both
files OR extract one small `core/rng.ts` adapter both import — either design goes green.

### The determinism lock (green now — must STAY green through GREEN)
- Golden float array for seed 0, absolute values (locks `@shared/rng`'s own numbers).
- `frame.draw` stream === `@shared/rng` `nextFloat` stream for 7 seeds incl. edges
  (0, 0x7fffffff, 0xffffffff).
- `transporter.enterViaPads` pad selection reconstructed off the same shared stream.
If any of these red during GREEN, the swap changed the observable sequence → replays drift.

### Dev guidance (adapter shape)
`@shared/rng` is the MUTABLE API (`createRng(seed) -> {seed}`, `nextFloat(rng)` mutates).
joust's inlined form is IMMUTABLE (`rngNext(word) -> {value, next}`). They are byte-identical:
`nextFloat(createRng(w))` returns `rngNext(w).value` and leaves `rng.seed === rngNext(w).next`.
A thin `rngNext` wrapper over `createRng`/`nextFloat` is the reuse-first move — keep joust's
call sites (`draw`, `enterViaPads`, `frame.ts:509 rng: rngNext(state.rng).next`) working.

### Rule Coverage
- **Core/shell purity** (the fleet's #1 rule; `tests/purity.test.ts`): covered. Part 3
  asserts an `@shared/rng` import is boundary-legal (not a `shell/` import) via the live
  `violations()` scanner — importing shared must not trip the purity sweep, and it does not.
- **No new randomness source in core**: the swap keeps the single seeded-Rng-in-state
  contract; `@shared/rng` mints no ambient entropy. The existing purity sweep still guards it.
- **Test-quality self-check**: no vacuous assertions — the golden array is asserted
  non-trivial (all-distinct, in [0,1)); every determinism case compares full sequences.

## Dev Assessment

GREEN. Commit `583dc8f9` on `feat/SH3-1-joust-shared-rng` (pushed). Full joust
project **170 files / 3362 tests green**; `tsc --noEmit` clean.

### What changed
- **New `plugins/joust/src/core/rng.ts`** — one adapter, `rngNext(word) -> {value, next}`,
  built on `@shared/rng` (`createRng`/`nextFloat`). This is the reuse-first choice TEA
  flagged: rather than copy a thin wrapper into both files (a smaller duplication, exactly
  what the SH3 epic exists to kill), the immutable form lives ONCE and both call sites import it.
- **`frame.ts`** — removed the inlined mulberry32 body + its stale comment; `import { rngNext } from './rng.js'`. Call sites (`draw`, `frame.ts:509`) unchanged.
- **`transporter.ts`** — same: removed the inlined copy; imports `rngNext`. `enterViaPads` and the ptero-edge draw unchanged.
- **`scaffold.test.ts`** — refreshed the TEA-flagged stale comment that claimed joust adds no `@shared` import.

### Why the determinism lock stayed green
`nextFloat(createRng(w))` returns exactly the old inlined `rngNext(w).value` and leaves
`rng.seed === next` — byte-for-byte identical, so the observable stream (`frame.draw`,
`transporter.enterViaPads`) did not move. The golden-array + cross-stream assertions all pass.

### Verification
- Magic constant `0x6d2b79f5` / `1831565813`: **absent from all of `plugins/joust/src/core/`**.
- `rngNext`: defined once (`core/rng.ts`), imported by `frame.ts` + `transporter.ts`.
- Core purity sweep re-scanned the new `core/rng.ts` — `@shared/rng` import is boundary-legal, green.
- Scope held: no behavior change, no touched call-site logic, no new API surface.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (all green: joust 3362, orchestrator 457, tsc 0, 0 smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings (Reviewer scrutinized tests directly — see Rule Compliance) |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 1 (README stale, non-blocking follow-up), deferred 1 (scheduler-contract terminology, pre-existing/out-of-scope) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A (adapter mutation confined to ephemeral local Rng; no entropy/clock in core) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 28 checks | N/A (1 out-of-scope note: bake-samples.mjs:66 third mulberry32 copy) |

**All received:** Yes (4 enabled returned; 5 disabled via settings)
**Total findings:** 1 confirmed (non-blocking), 0 dismissed, 2 deferred

## Reviewer Assessment

**Verdict:** APPROVED

The code deliverable is complete and correct. Both inlined mulberry32 copies are retired
into one `src/core/rng.ts` adapter over `@shared/rng`; the determinism lock proves the
observable float stream is byte-for-byte unchanged for any seed; the core-purity boundary
holds. All four enabled subagents plus my own pass found zero code defects. The single
confirmed finding is Medium documentation staleness (a README sentence this diff falsifies)
— per the blocking rule (Critical/High only) and project proportionality it is a follow-up,
not a rework blocker, so it is captured below for the finish sweep.

**Data flow traced:** seed word (`GameState.rng`, minted by `createState(seed)` as `seed >>> 0`)
→ `rngNext(word)` (`core/rng.ts`) → `createRng(word)`/`nextFloat` (`@shared/rng`) → float + next
word → threaded back into state by the reducer (`frame.draw`, `frame.ts:498`, `enterViaPads`).
Safe: no ambient entropy, no clock, no mutation escaping the ephemeral local `Rng`.

### Rule Compliance (TS lang-review + CLAUDE.md conventions)
- **#1 Type-safety escapes** — VERIFIED clean: no `as any`/`as unknown`/`@ts-ignore`/`!` in the
  diff (`rng.ts`, `frame.ts`, `transporter.ts`, both test files). `rngNext` return type matches
  the retired inlined signature exactly — no contract regression.
- **#5 / ESM `.js` extension** — VERIFIED: `frame.ts:22` and `transporter.ts:29` import
  `./rng.js` with the extension; the 4 relative imports in the test carry `.js`; `@shared/rng`
  alias correctly omits it (matches every other consumer).
- **Core/shell purity (CLAUDE.md #1 rule)** — VERIFIED: `core/rng.ts` imports only `@shared/rng`
  (a pure module, not `shell/`), mints no entropy; the existing `tests/purity.test.ts` sweep
  re-scans the new file and passes. The new test even pins that an `@shared/rng` core import is
  boundary-legal while a `shell/` import still trips the scanner. Evidence: purity suite green.
- **#8/#18 Test quality (I checked directly — analyzer disabled)** — VERIFIED not vacuous: the
  determinism cases compare joust's output against an INDEPENDENT `@shared/rng` reference stream
  (not a self-referential literal); the golden array is explicitly asserted non-trivial
  (all-distinct, in [0,1)); the AST guards are self-tested (Part 3) to flag live literals but
  not comment/string mentions. `rng-shared-adoption.test.ts`.
- **#24 Retirement scoped as named** — VERIFIED: `0x6d2b79f5` is gone from all of
  `plugins/joust/src/core/`; the two AC-named copies (frame.ts, transporter.ts) are retired.

### Devil's Advocate
Let me argue this is broken. First attack: the swap silently changed the sequence. The old
`frame.ts` copy computed `(word + 0x6d2b79f5) >>> 0` WITHOUT normalizing `word` first, whereas
the new adapter routes through `createRng(word)`, which does `word >>> 0` before the add. If any
call site ever passed a non-uint32 `word` — a negative, a float, a value ≥ 2^32 — the two would
diverge and every replay recorded under the old code would drift. Second attack: the determinism
test is now tautological — post-swap, joust's `rngNext` IS `@shared/rng`, so "joust stream ===
@shared stream" compares the shared generator against itself and would pass even if the shared
generator were silently wrong. Third attack: the golden array covers only seed 0, so a
seed-dependent regression in `@shared/rng` could slip through. Fourth: a future edit could
re-inline a DIFFERENT PRNG and the magic-constant guard (keyed to `0x6d2b79f5`) would not fire.

Rebuttals. Attack one is real in theory but dead in practice: every call site feeds a normalized
uint32 — `createState` sets `rng: seed >>> 0` (frame.ts:210), `enterViaPads` does `let word =
seed >>> 0` (transporter.ts), and every advance is `rngNext(...).next` which is `>>> 0` out of
`nextFloat`. So the extra normalization is a proven no-op at all four sites; I traced each. The
determinism test also exercises `0xffffffff` and `0x7fffffff` and passes. Attack two is blunted
by the GOLDEN array: it pins ABSOLUTE float values independent of joust, so a wrong shared
generator reds `@shared/rng reproduces the frozen golden sequence` regardless of the
cross-check's tautology — the two assertions cover different failure modes. Attack three: for a
hash-style PRNG an algorithm change alters seed 0's output too, so golden@seed0 is a sufficient
tripwire; broadening it is a nicety, not a gap. Attack four is a genuine limitation but out of
scope — the behavioral determinism lock (not the constant guard) is the real defense against a
different generator, and it would red on any stream change. None of the four attacks survive.
The one thing the devil's advocate confirms worth recording: a THIRD mulberry32 copy exists in
`tools/sample-bake/bake-samples.mjs:66` (rule-checker's note) — untouched, out of scope, tracked
below as a follow-up.

### Subagent findings incorporated
- `[SEC]` reviewer-security — clean, no findings: the `rngNext` adapter's `nextFloat` mutation
  is confined to an ephemeral local `Rng` and never escapes; no ambient entropy/clock enters
  core; the new `core/rng.ts` is auto-covered by the purity sweep. VERIFIED, no action.
- `[DOC]` reviewer-comment-analyzer — 1 confirmed (README:155-157 mulberry32 sentence falsified
  by this diff, in-scope, Medium → non-blocking follow-up, captured in Delivery Findings) + 1
  deferred (scheduler-contract.ts:24 pre-collapse `@arcade/shared/rng` terminology, out of scope).
  In-diff comments (rng.ts/frame.ts/transporter.ts/scaffold.test.ts) VERIFIED accurate.
- `[RULE]` reviewer-rule-checker — 0 violations across 28 checks; 1 out-of-scope note
  (bake-samples.mjs:66 third mulberry32 copy, tooling `.mjs`, captured as a follow-up).

**Handoff:** To SM for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Improvement / non-blocking → Dev]** `plugins/joust/tests/scaffold.test.ts:117-119`
  carries a comment asserting in prose that "joust never pinned `@arcade/shared` ... no
  `@shared` import is added." That sentence becomes STALE the moment GREEN lands. It is a
  passive comment (not an assertion), so no test reds on it — but update it when retiring
  the copies so the scaffold note stops contradicting reality. Same for the descriptive
  comments at `frame.ts:190-197` and `transporter.ts:253-254`, which Dev removes/rewrites
  as part of the swap itself.

### Reviewer (code review)

- **[DOC] Improvement** (non-blocking — recommend sweeping at finish): `plugins/joust/README.md:155-157`
  still states joust's "mulberry32 is **still lifted byte-for-byte** into `src/core/frame.ts`
  rather than imported" — a claim this very diff falsifies (`src/core/rng.ts` now imports and
  calls `@shared/rng`). It is in SH3-1's own scope ("retire … behind a stale comment") and the PR
  already edits this file (the 169→170 count bump). Affects `plugins/joust/README.md` (correct the
  mulberry32 sentence to note joust now consumes `@shared/rng` via `src/core/rng.ts`). *Found by
  Reviewer during code review; verified — joust consumes 7 `@shared` subpaths at HEAD incl. `@shared/rng`.*
- **[DOC] Improvement** (non-blocking, pre-existing/out-of-scope): the SAME README paragraph's
  "consumes exactly one `@shared` subpath" and the 145-147 "No `@shared/highscore`" claims were
  ALREADY stale before this PR (joust imports both `@shared/highscore` and 5 others). Affects
  `plugins/joust/README.md` (broader doc-rot sweep — not this story's fault). *Found by Reviewer.*
- **[DOC] Improvement** (non-blocking, out-of-scope): `plugins/joust/tests/helpers/scheduler-contract.ts:24`
  names the retired pre-collapse package path `@arcade/shared/rng` instead of the in-tree
  `@shared/rng` alias. Low priority terminology drift. *Found by reviewer-comment-analyzer.*
- **[RULE] Improvement** (non-blocking, out-of-scope): a THIRD inlined mulberry32 (`0x6d2b79f5`)
  survives in `plugins/joust/tools/sample-bake/bake-samples.mjs:66` — a build-tooling `.mjs`, not
  `.ts`, not `src/core/`, outside SH3-1's named scope (frame.ts/transporter.ts). Worth a follow-up
  story if the "retire duplicated mulberry32" effort widens to tooling. *Found by reviewer-rule-checker.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

No design deviations

### Reviewer (audit)
- No spec deviations logged by TEA/Dev, and none found in audit. The implementation follows
  the story scope exactly: retire the two named inlined copies, adopt `@shared/rng`, pin the
  determinism sequence. The adapter-module choice (`core/rng.ts` vs a wrapper duplicated per
  file) is a sound reuse-first call that avoids reintroducing the very duplication SH3 exists
  to kill — ✓ ACCEPTED.