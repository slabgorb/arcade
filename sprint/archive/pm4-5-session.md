---
story_id: "pm4-5"
jira_key: "pm4-5"
epic: "pm4"
workflow: "tdd"
---
# Story pm4-5: Phase machine (core game.ts)

## Story Details
- **ID:** pm4-5
- **Jira Key:** pm4-5
- **Workflow:** tdd
- **Stack Parent:** none (stack root)
- **Branch:** feat/pm4-5-phase-machine-core-gamephase
- **PR:** https://github.com/slabgorb/arcade/pull/211

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-10T20:14:17Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-10T19:43:57Z | 2026-08-10T19:46:13Z | 2m 16s |
| red | 2026-08-10T19:46:13Z | 2026-08-10T19:58:39Z | 12m 26s |
| green | 2026-08-10T19:58:39Z | 2026-08-10T20:03:27Z | 4m 48s |
| review | 2026-08-10T20:03:27Z | 2026-08-10T20:14:17Z | 10m 50s |
| finish | 2026-08-10T20:14:17Z | - | - |

## Delivery Findings

No upstream findings

### Reviewer (code review)
- **Improvement** (non-blocking): dependent stories pm4-6/7/8/10 that wire this
  machine into `stepGame` must compute the phase EDGE (`newPhase !== oldPhase` →
  reseed/freeze/advanceLevel) at `stepGame`'s single exit, not inside one branch
  of the collision/dot logic (lang-review #14). Affects `plugins/pac-man/src/core/game.ts`
  (the future `stepGame` wiring). *Found by Reviewer during code review.*

## Design Deviations

None — pm4-5 introduces no design deviation. It is the pure mc6-1-faithful phase
machine; the epic's decided deviations (no `pause` phase; `level-clear` freezes
without flashing) belong to the stories that render/wire those phases (pm4-7),
not to this type/dispatch anchor. **Audited: no entries to stamp.**

## Sm Assessment

**Story:** pm4-5 — extend core `GamePhase` (`playing|game-over` → add
`attract|ready|dying|level-clear`) with a pure, seeded, clock-free MAINLINE
dispatch over frame-count timers. Root of epic pm4 — pm4-6/7/8/9/10 all depend
on it, so getting the phase enum + transition contract right unblocks the rest
of the epic.

**Setup verified on disk (not trusting the subagent's report):**
- Session file present with correct `story_id`/`workflow` frontmatter.
- Branch `feat/pm4-5-phase-machine-core-gamephase` created from develop and
  checked out.
- Story flipped `backlog → in_progress` in `sprint/epic-pm4.yaml`; diff scoped
  to the pm4-5 block only, no sibling epic churn.
- Story context written and enriched with the state loop, citation discipline,
  scope fences, and reference pointers. Epic context NOT clobbered.
- Merge gate clear (no open PRs). Clean tree at setup. No Jira (local sprint).

**Handoff → TEA (Leeloo), RED phase.** Load-bearing for RED:
- **Read first:** `docs/superpowers/specs/2026-08-09-pac-man-cabinet-lifecycle-design.md`
  (authoritative approach), the epic context, and the story context I enriched.
- **Citation discipline:** anchor `pacman.asm:0195` / `:0984` / `:269a` / `:318c`
  to the actual vendored source at RED — do NOT fabricate or "correct" a line or
  6502 symbol. Pin at RED if a citation can't be confirmed.
- **Purity is a hard gate:** timers are frame counts + seeded RNG, never a clock;
  `purity.test.ts` / core-boundary scan must stay green.
- **Scope fence:** pm4-5 is the phase enum + dispatch machine + timer constants
  ONLY. START/coin binding (pm4-6), freeze render (pm4-7), attract auto-player
  (pm4-8) are OUT — do not pull them in.
- Tests: `npx vitest run --project pac-man`; type check: `npm run lint`.
## Tea Assessment

**RED written and confirmed.** New failing suite: `plugins/pac-man/tests/core/phase.test.ts`.

### RED evidence (direct `npx vitest run --project pac-man`)
```
Test Files  1 failed | 25 passed (26)
     Tests  307 passed (307)
FAIL tests/core/phase.test.ts — Cannot find module '../../src/core/phase'
```
Only the new suite is red (missing module); the existing 25 suites / 307 tests
stay green. That green half is load-bearing: it proves the pm4-5 boundary —
**the phase machine is a pure module and does NOT rewire `stepGame` runtime.**
(Ran directly, not via testing-runner, which this project's notes flag for
confabulating test names; counts above are the runner's own output.)

### Scope ruling (READ THIS — the pm4-5/pm4-6/pm4-7/pm4-10 boundary)
pm4-5 is the ROOT anchor of epic pm4 and the direct analogue of
missile-command's **mc6-1**, which shipped a *pure `state.ts` skeleton* (Phase
type + dispatch), with the runtime wiring landing in mc6-2..6. I ruled pm4-5 the
same way:

- **pm4-5 owns:** the extended `GamePhase` type + a **pure transition machine**
  (`advancePhase`) whose edges are fed **boolean signals** a caller derives from
  frame-count timers. It is **clock-free and constant-free** — no magic frame
  numbers live in it.
- **pm4-5 does NOT:** change `createGameState`'s start phase, rewire `stepGame`'s
  death/level-clear/game-over runtime, freeze actors, or pin any timer cadence.
  Those belong to the dependents and would collide if pulled in:
  - ready-timer + start-input reseed + "Blinky still during attract/ready" → **pm4-6**
  - dying / level-clear **freeze** + death-anim window + their cited cadences → **pm4-7**
    (and pm4-7 also owns setting `level+1` when it wires `advanceLevel`)
  - attract auto-player → **pm4-8**
  - game-over→attract **timeout constant** + `main.ts` loop-close → **pm4-10**

Because the machine is constant-free, pm4-5 introduces **no new numeric game
constant** (so "every new constant citations-gated" is satisfied trivially) and
its ROM citation is **structural/address**, not a scored value — see below.

### API surface Dev must implement (turns the suite green)
Create `plugins/pac-man/src/core/phase.ts` (a pure core module — the purity
scanner sweeps it automatically) exporting:
- `PHASES: readonly GamePhase[]` — exactly the six phases.
- `interface PhaseSignals` — optional booleans: `startRequested`, `readyExpired`,
  `deathExpired`, `clearExpired`, `overExpired`, `pacDied`, `allDotsEaten`, plus
  `livesRemaining?: number`.
- `advancePhase(phase: GamePhase, signals: PhaseSignals): GamePhase` — pure, no
  mutation of `signals` (a test passes a **frozen** object), edges per the
  suite's loop test. Precedence in `playing`: `pacDied` **before** `allDotsEaten`
  (matches `stepGame` resolving collision before the dot check).

And **extend `GamePhase` in `src/core/game.ts`** to
`'attract' | 'ready' | 'playing' | 'dying' | 'level-clear' | 'game-over'`. This
is **lint-gated, not vitest-gated** (esbuild strips types): `EXPECTED_PHASES:
GamePhase[]` in the test won't compile under `npm run lint` until the union is
widened. Verified safe: **no exhaustive `switch(phase)` exists anywhere** — every
consumer compares `=== 'game-over'`/`'playing'`, so widening breaks no typecheck
and forces **no shell change**.

### ROM citation anchors (verified in the quarry at RED — do NOT fabricate)
The dispatch mirrors master-state byte `#4e00`. All four lines exist in
`reference/source/pacman.asm` (9896 lines). Add these to the dossier
(`docs/rom-study/claims/*.json` + a prose `pacman.asm:<addr>` mention) so the
existing `citations.test.ts` COVERAGE + BYTE teeth stay green. `value` may be a
**string** (line 169 of check-citations.mjs) — use the opcode text; these are
address/structural claims, not scored values, so no ×10 re-derivation applies.

| addr | phys line | verbatim (space-delimited, trimEnd compared) | role |
|------|-----------|-----------------------------------------------|------|
| `0195` | 251  | `0195  3a004e    ld      a,(#4e00)` | master-state **dispatch** (read+branch) |
| `0984` | 1498 | `0984  32004e    ld      (#4e00),a` | STATE **write** (transition) |
| `269a` | 5336 | `269a  32004e    ld      (#4e00),a` | STATE **write** (transition) |
| `318c` | 6961 | `318c  32004e    ld      (#4e00),a` | STATE **write** (transition) |

### Rule Coverage
- **Core purity (core-boundary / `purity.test.ts`):** covered — `phase.ts` is a
  pure module (booleans/enums, no `Date`/`performance`/DOM/`Math.random`). The
  scanner's `it.each` over the core listing picks it up automatically; a `Date`
  or `Math.random` slip reddens it. My unit tests add belt-and-suspenders: a
  frozen-input test (no mutation) and a determinism test (no entropy/clock).
- **Citations gate (`citations.test.ts`):** covered by the existing gate — any
  `pacman.asm:0195/0984/269a/318c` prose Dev adds must carry a byte-matching
  claim or the BYTE/COVERAGE teeth redden. Anchors provided above.
- **Meaningful assertions (no vacuous tests):** every `it` asserts a concrete
  next-phase; no `let _ =`, no `assert(true)`, no always-true predicate. The
  composed-loop test pins the whole cabinet cycle, not just isolated edges.
- **Deterministic/seeded (mc6-1 contract):** covered — the machine takes no seed
  and no clock; determinism test asserts identical inputs → identical output.

### Notes for Reviewer (Zorg)
- "Unwired pure module" is **intentional and mc6-1-faithful**, not dead code —
  pm4-6/7/8/10 (`depend_on: pm4-5`) wire it into play. It is the dependency
  anchor; "observed in play" is satisfied by the dependents, not by pm4-5.
- If the boundary is judged too skeletal (i.e. reviewer wants pm4-5 to also
  rewire `stepGame`'s death/level-clear into the phases), that is a **scope
  conversation**, not a test defect — it would overlap pm4-7's "removes the
  instant advance/respawn." Flagging so it's a decision, not a silent drift.

## Handoff → Dev (Korben Dallas)
GREEN phase: implement `src/core/phase.ts` + extend `GamePhase`, per the API
surface and citation anchors above. Turn `tests/core/phase.test.ts` green while
keeping all 307 existing tests green and `npm run lint` clean. Add the four
dossier claims so `citations.test.ts` stays green.
## Dev Assessment

**GREEN.** All of TEA's `tests/core/phase.test.ts` pass; nothing else regressed.

### Evidence
- `npx vitest run --project pac-man` → **26/26 suites, 328 tests pass** (was 307;
  +20 phase-machine tests, +1 citation `it.each` batch over the 4 new claims).
- `npx vitest run --project pac-man tests/purity.test.ts --reporter=verbose` →
  explicitly lists `src/core/phase.ts stays inside the boundary` ✓ (the new file
  is really scanned — not a silent exclusion).
- `npx vitest run --project pac-man tests/audit/citations.test.ts` → 54 pass
  (the 4 master-state claims are byte-verified against the quarry + cover the new
  glossary prose).
- `npm run lint` (repo-wide `tsc --noEmit`) → clean, exit 0. The widened
  `GamePhase` type-checks everywhere (no exhaustive `switch(phase)` existed).

### What I built (minimal, to the TEA contract)
- `src/core/phase.ts` — `PHASES`, `PhaseSignals`, `advancePhase(phase, signals)`.
  Pure `switch` over the six phases; boolean-fed edges; `pacDied` precedence over
  `allDotsEaten` in `playing`; constant-free (no cadence numbers).
- `src/core/game.ts` — widened `GamePhase` to the six cabinet phases + a comment
  pointing at `./phase.ts` and the pm4-6/7 hand-offs.
- `docs/rom-study/claims/phase.json` — 4 address/structural claims (0195 dispatch;
  0984/269a/318c writes), `value:"4e00"`, byte-verified verbatims (no `bcd-x10-word`
  marker, so not BCD-checked).
- `docs/rom-study/glossary.md` — a `## Cabinet state machine` section citing the
  4 addresses (covered by the claims above).

### Boundary held (no scope bleed into dependents)
`createGameState` still starts at `'playing'`; `stepGame` runtime is **unchanged**
— the machine is unwired by design (mc6-1-faithful). No `main.ts`, no shell, no
freeze, no reseed, no timer constants. pm4-6/7/8/10 wire it in and pin their
cadences. Confirms the TEA ruling; flagged for Reviewer as an intentional
skeleton, not dead code (5 stories `depend_on` it).

### Branch
`feat/pm4-5-phase-machine-core-gamephase` — pushed. No PR (SM opens it at finish).

## Handoff → Reviewer (Zorg)
Review the pure phase machine on `feat/pm4-5-phase-machine-core-gamephase` vs
`origin/develop`. Key scope call to sanity-check: pm4-5 as a pure, unwired
machine (mirrors missile-command mc6-1's `state.ts`), with the runtime wiring +
cited cadences deferred to pm4-6/7/10. Citations 0195/0984/269a/318c are
byte-verified in `docs/rom-study/claims/phase.json`.
## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `advancePhase(phase, signals)` — `signals` is a pure,
frame-derived boolean/number DTO fed by future `stepGame` wiring (unwired today);
output is a `GamePhase`. No external/user/network input reaches it; safe.
**Pattern observed:** pure lookup-table dispatch mirroring the ROM master-state
byte at `plugins/pac-man/src/core/phase.ts:66` — the mc6-1 `state.ts` shape.
**Error handling:** none needed (total switch over a closed 6-member union; every
phase has a defined transition + hold; degenerate `livesRemaining` (undefined /
NaN / negative) routes fail-closed to `game-over`).
**Handoff:** To SM for finish-story.

### Findings (all resolved before approval)

- [RULE] **LOW — `PhaseSignals` fields not `readonly`** (`phase.ts:38`, rule-checker,
  high confidence). The module docstring + the frozen-input test assert
  `advancePhase` mutates nothing, but that was runtime-only. **CONFIRMED and FIXED
  at review** (commit 27395a2a): fields marked `readonly`, making the pure-input
  contract compile-enforced. Re-verified: `npm run lint` clean, 328 pac-man tests
  green. A rule-matching finding — fixed, not dismissed.
- [PRE] preflight — CLEAN/green: 328 pac-man + 457 orchestrator + 54 citation
  tests, lint clean, zero smells (console.log/TODO/skip = 0). No finding.
- [SEC] security — CLEAN: no I/O, no parsing of external input, no secrets/auth/
  tenant surface; static dossier JSON is trusted repo content. No finding.
- [TYPE] (hand-covered, subagent disabled) — return type is `GamePhase` not
  `string`; `readonly` on `PHASES` and now `PhaseSignals`; no `as any`/casts/
  non-null assertions. Verified good.
- [TEST] (hand-covered) — every `it` asserts a concrete next-phase; the composed
  10-hop loop test drives distinct signals; the frozen-input test is a real,
  mutation-verified purity guard (rule-checker reddened it live). NIT: `pacDied`
  with undefined `livesRemaining` (→ game-over) is untested, but fail-closed and
  not story-required. Verified good.
- [EDGE] (hand-covered) — probed: death-precedence-over-clear, cross-phase signal
  isolation (`dying` ignores `readyExpired`), undefined/NaN/negative lives → all
  fail-closed to `game-over`. No unhandled path. Verified good.
- [SILENT] (hand-covered) — pure function, no try/catch, no swallowed errors, no
  silent fallbacks. `??` (not `||`) correctly preserves a legitimate `0`. N/A.
- [DOC] (hand-covered) — the two added comments (game.ts + phase.ts) agree; the
  death-precedence comment matches `stepGame`'s collision-before-dots order
  (game.ts:584-628, re-run by rule-checker); all 4 ROM citations byte-verified
  against the quarry. Verified good.
- [SIMPLE] (hand-covered) — minimal; every `PhaseSignals` field maps to a real
  edge; unwired-by-design is intentional mc6-1 anchor infrastructure (5 stories
  depend on it), not dead code. Verified good.

### Rule Compliance (lang-review/typescript.md, exhaustive)

| Rule | Instance(s) | Verdict |
|------|-------------|---------|
| #1 type-safety escapes | phase.ts / game.ts / test — no `as any`/`@ts-ignore`/`!` | compliant |
| #2 missing `readonly` | `PhaseSignals` fields | was VIOLATION → **fixed** (readonly) |
| #3 switch exhaustiveness | `advancePhase` switch | compliant — declared return type makes extension a hard `TS2366`; matches `targeting.ts` convention (assertNever not required) |
| #4 `??` vs `||` | `(livesRemaining ?? 0) > 0` | compliant — `??` correct for a field where `0` is valid |
| #5 `.js` import extension | `from './game'` | compliant — `moduleResolution: bundler`; matches whole-repo convention |
| #5 `export type` / `import type` | game.ts:143, test imports | compliant |
| #14 state-machine edge in one branch | `advancePhase` | N/A — pure returning fn, no side-effecting edge; carried forward as a watch-item for pm4-6/7/8/10 (see Delivery Findings) |
| #15/#18/#19/#26 test apparatus | phase.test.ts | compliant — real return-value assertions, no token-match/fixture-equals-expectation/filtered-population; loop walks full unfiltered `PHASES` |
| #17 comments assert re-run mechanism | death-precedence + ROM citations | compliant — re-run/byte-verified |
| A1 core purity | phase.ts | compliant — purity sweep enumerates + passes phase.ts (no clock/DOM/RNG) |
| A2 numeric-constant citation | phase.ts | vacuous — module is constant-free by design |
| A3 ROM citations byte-verified | phase.json ×4 | compliant — lines 251/1498/5336/6961 match byte-for-byte |
| #6-13,16,20-25 | — | not applicable (no JSX/async/error-handling/ARIA/perf/config surface in diff) |

### Devil's Advocate

Argue this is broken. First: the module is DEAD — `advancePhase`/`PHASES` are
exported but called nowhere outside the test, so this story ships zero observable
behavior and could be a no-op that merely looks busy. Rebuttal: that is the
mc6-1 pattern by explicit design; five stories `depend_on` pm4-5 precisely
because they need the type + machine to exist first, and the "observed in play"
burden falls on them — but I flag it so a reviewer of pm4-6/7 confirms the wiring
actually lands. Second: the `playing`-case precedence (`pacDied` before
`allDotsEaten`) is asserted to mirror `stepGame`, but `stepGame` isn't wired yet,
so the comment is a promise about code that doesn't call this — if pm4-7 wires it
in the opposite order, the machine and the sim disagree and Pac "dies" on the
frame he clears the board. Rebuttal: the comment is anchored to the CURRENT
game.ts:584-628 ordering (collision loop before the dot check), re-run by the
rule-checker; pm4-7's review must re-confirm, which the #14 delivery finding now
demands. Third: a confused caller passes `pacDied: true` and forgets
`livesRemaining` — the machine silently sends a still-alive Pac to `game-over`.
Rebuttal: real, but fail-closed (a missing life count is treated as "no lives"),
untested, and every intended caller derives `livesRemaining` from sim state; I
recorded it as a NIT rather than block. Fourth: `PhaseSignals` being an all-
optional bag means a typo'd signal key (`readyExpire`) is silently ignored and
the phase never advances — a hang. Rebuttal: excess-property checks catch
object-literal typos at the call site under `strict`, and the dependents' own
tests will drive the real transitions; still worth the pm4-6 reviewer's eye. None
of these rise to Critical/High for a pure, unwired, fully-tested anchor. Approved.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (green: 328/457/54, lint clean) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered [EDGE], no finding |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered [SILENT], no finding |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered [TEST], 1 NIT (untested undefined-lives edge) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered [DOC], no finding |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered [TYPE], no finding |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered [SIMPLE], no finding |
| 9 | reviewer-rule-checker | Yes | findings | 1 (LOW #2 readonly) | confirmed 1, fixed 1, dismissed 0, deferred 0 |

**All received:** Yes (3 enabled returned; 6 disabled hand-covered)
**Total findings:** 1 confirmed & fixed (readonly), 0 dismissed, 0 deferred; 1 watch-item deferred to pm4-6/7/8/10 (#14 wiring)