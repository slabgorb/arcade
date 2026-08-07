---
story_id: "mc3-2"
jira_key: "mc3-2"
epic: "mc3"
workflow: "tdd"
---
# Story mc3-2: Damage detection: a blast destroys incoming ICBMs; an arrived ICBM destroys a city/base

## Story Details
- **ID:** mc3-2
- **Jira Key:** mc3-2
- **Workflow:** tdd
- **Stack Parent:** mc3-1
- **PR:** 53
- **Branch:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Repos:** arcade
**Phase Started:** 2026-08-07T13:36:48Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-07T13:12:25Z | 2026-08-07T13:15:43Z | 3m 18s |
| red | 2026-08-07T13:15:43Z | 2026-08-07T13:22:30Z | 6m 47s |
| green | 2026-08-07T13:22:30Z | 2026-08-07T13:27:34Z | 5m 4s |
| review | 2026-08-07T13:27:34Z | 2026-08-07T13:36:48Z | 9m 14s |
| finish | 2026-08-07T13:36:48Z | - | - |

## Story Description

Plan task 4 (docs/superpowers/plans/2026-08-07-missile-command-mc3-core-loop.md). The core mechanic, as two PURE functions in src/core/damage.ts. (a) killIcbmsInBlasts(icbms,explosions): {survivors,killed} — an ICBM is destroyed when its head lies within blastRadius(exp) of any live blast (point-in-circle vs mc1's explosion.ts). (b) resolveGroundImpacts(icbms,cities,bases): {cities,bases,icbms} — an ARRIVED ICBM kills the city/base at its target and is removed from the returned list. Cite MISSILE DAMAGE DETECTION & PROCESS and DESTROY A CITY OR BASE (W3MAIN). Only trivial literals — no new claim. Depends on mc3-1 (Icbm, City, Base).

## Acceptance Criteria

1. killIcbmsInBlasts destroys an ICBM whose head sits inside a blast's current radius, spares one outside it, counts the kills, and returns the untouched survivors; a finished (zero-radius) blast kills nothing.
2. resolveGroundImpacts: an arrived ICBM at a city/base target sets that structure alive=false and removes the ICBM from the returned list; other structures are untouched; an in-flight (not arrived) ICBM damages nothing and stays in the list.
3. damage.ts is a pure module (no clock/entropy/shell import) citing MISSILE DAMAGE DETECTION and DESTROY A CITY OR BASE; damage.test.ts passes and purity.test.ts + citations.test.ts stay green (no non-trivial literal introduced).

## Sm Assessment

Setup for mc3-2 (3pt, tdd, missile-command). The story's premises were verified against the
current tree BEFORE setup — all hold, so the epic description is copied forward as current fact
(no correction block needed):

- Dependency mc3-1 is `done`; its types exist — `Icbm` (core/icbm.ts:23), `City` (core/field.ts:69),
  `Base` (core/field.ts:75).
- The new file `plugins/missile-command/src/core/damage.ts` does not yet exist — this story creates it.
- mc1's `explosion.ts` and `blastRadius(exp)` (core/explosion.ts:60) are present — the point-in-circle
  test AC1 references.
- Cited claims MISSILE DAMAGE DETECTION & PROCESS and DESTROY A CITY OR BASE (W3MAIN) already exist;
  description states "only trivial literals — no new claim," so `citations.test.ts` must stay green
  with no new claim id.

No either/or ambiguity, no parked banner, no stale falsifiable claim — no user ruling required.
ACs were confirmed copied VERBATIM from `sprint/epic-mc3.yaml` (word-for-word diff clean).

Sibling probes clean at setup: no `origin` branch matched `mc3-2`, no live sibling `.session/`.
Claim pushed on `feat/mc3-2-…` (commit 51cad654) so the story is visible to other checkouts.

Two `sm-setup` gotchas handled: it omitted `**Repos:**` from the session (added by hand → `arcade`);
it DID stamp `in_progress` this time (verified, not assumed).

Note for TEA (Han Solo): this is a `plugins/<id>/src/core/` module — the core-boundary/purity guard
applies. Keep `damage.ts` pure and deterministic (no clock/entropy/render/audio/shell import). The two
functions are pure and total: `killIcbmsInBlasts(icbms, explosions)` → `{survivors, killed}`,
`resolveGroundImpacts(icbms, cities, bases)` → `{cities, bases, icbms}`.

## TEA Assessment

RED phase complete (Han Solo). One new test file: `plugins/missile-command/tests/damage.test.ts`
(18 cases). Verified RED via `npx vitest run --project missile-command`: **411 passed, 18 failed**;
all 18 failures are in `damage.test.ts` (15 the self-describing "damage core module not built yet …"
loader error, 3 the AC3 source-scan ENOENT on the absent `src/core/damage.ts`). No sibling test
regressed — clean, feature-shaped RED. `npm run lint` (tsc --noEmit) is GREEN with the module absent,
via the `/* @vite-ignore */` variable-specifier idiom (fleet convention).

### The contract Dev (Yoda) must satisfy — two PURE reducers in `src/core/damage.ts`
- `killIcbmsInBlasts(icbms, explosions) → { survivors, killed }` — an ICBM is killed when its HEAD
  (`icbm.pos`) lies within `blastRadius(exp)` of ANY blast (point-in-circle against `explosion.ts`).
  A zero-radius / finished blast kills **nothing** (even a head exactly at the centre — this is the
  discriminating guard test, so a naive `dist <= radius` with radius 0 will FAIL). Survivors keep
  input order and are returned untouched; `killed.length` is the kill count. Total on empty inputs.
- `resolveGroundImpacts(icbms, cities, bases) → { cities, bases, icbms }` — an ARRIVED ICBM whose
  `target` matches a structure `pos` (h/v equality) flips that structure `alive=false` and is dropped
  from the returned `icbms`; a destroyed base keeps its `ammo` (only `alive` changes); unhit
  structures and in-flight ICBMs are untouched; in-flight ICBMs stay in the list.
- Fixtures are built from REAL sibling modules (`explosion.ts`, `icbm.ts`, `field.ts`), so the
  reducers are exercised against the actual `Icbm`/`City`/`Base`/`Explosion` types, not look-alikes.

### AC coverage
- **AC1** (killIcbmsInBlasts): centre-kill, outside-spare, mixed-list split + count + order,
  zero-radius-fresh-spare, collapsed-blast-spare, killed-by-ANY-of-multiple-blasts, no-mutation,
  no-explosions-all-survive, no-icbms-empty-result.
- **AC2** (resolveGroundImpacts): arrived→city dead + removed + others alive, arrived→base dead +
  ammo preserved + cities alive, in-flight untouched + retained, mixed volley, input no-mutation,
  empty-icbms no-op.
- **AC3** (citations): source-text scan asserts `damage.ts` names `MISSILE DAMAGE DETECTION`,
  `DESTROY A CITY OR BASE`, and `W3MAIN`. Purity and the no-un-cited-literal rule are NOT re-asserted
  here — they are swept automatically by `purity.test.ts` and `citations.test.ts` (§4) the moment the
  file lands; this file enforces only the enforceable routine-name half of AC3.

### Rule Coverage (project rules → tests)
- **core/shell boundary (purity)** — `purity.test.ts` auto-sweeps every `src/core/*.ts`, so
  `damage.ts` is guarded the instant it lands (no clock/entropy/browser/shell import). Dev must keep
  the module pure; not re-asserted in this file by design (matches `icbm.test.ts`).
- **no un-cited game-constant literal** — `citations.test.ts` §4 auto-scans `damage.ts`. AC3 requires
  **no new claimed literal**: the radius comes from `explosion.ts`'s already-cited `MAX_BLAST_RADIUS`
  and the reducers use only trivial literals (0/1). Dev must introduce NO magic numeric constant, or
  that sweep reddens — flagged prominently for Dev.
- **cite the source of truth** — enforced by the AC3 source-text scan above.
- **meaningful assertions / no vacuous tests** — every case asserts a concrete value or membership;
  no `expect(true)`, no `is*()` on always-constant values. Zero-radius cases assert
  `blastRadius(...) === 0` as an explicit precondition so the guard cannot pass vacuously.

### Note for Dev (Yoda)
The zero-radius guard is the one place a plausible implementation breaks: `blastRadius` returns 0 for
a fresh (t≤0) or collapsed (t≥LIFETIME) blast, and a head can sit exactly at the centre — the test
demands that be a SURVIVOR. Guard with `radius > 0` (or a strict `dist < radius`). Match ground
impacts by position equality (`target.h === pos.h && target.v === pos.v`), not object identity.

## Dev Delivery (Yoda, GREEN)

Implemented `plugins/missile-command/src/core/damage.ts` — the two pure reducers TEA specified, no
more. Verified GREEN fleet-wide: `npx vitest run` = **13,027 passed / 0 failed** (damage.test.ts
18/18), `npm run test:orchestrator` = **408 passed / 0 failed**, `npm run lint` (tsc --noEmit) clean.

Design notes:
- `killIcbmsInBlasts` — a single `insideBlast(p, exp)` helper: `blastRadius(exp)`; if `r <= 0` return
  false (the zero-radius/finished-blast guard the discriminating test demands), else `Math.hypot ≤ r`
  (inclusive; no boundary case is pinned by the tests). A straight partition loop preserves survivor
  order; `killed.length` is the count.
- `resolveGroundImpacts` — copies the structure arrays (`[...cities]`), then for each ARRIVED ICBM
  maps the hit structure to `{ ...s, alive: false }` (spread keeps a base's `ammo`); in-flight ICBMs
  are pushed to survivors, arrived ones dropped. Matching is positional (`samePos` = h/v equality),
  not identity. Inputs never mutated (new arrays, new objects only for the hit structure).
- No new numeric game-constant: the only literal is `0` (trivial). The blast radius is sourced from
  `explosion.ts`'s already-cited `MAX_BLAST_RADIUS`, so `citations.test.ts` §4 stays green and no new
  claim was authored — satisfying AC3's "no non-trivial literal introduced."

## Delivery Findings

No upstream findings

<!-- Reviewer appends below this marker -->
### Reviewer (code review)
- **Improvement** (non-blocking): the `src/core/damage.ts` header comment says "both reducers use
  only trivial 0/1 arithmetic," but the reducers' own bodies contain no numeric literal and the sole
  `0` lives in the private `insideBlast` helper — a minor prose imprecision. Affects
  `plugins/missile-command/src/core/damage.ts:11` (reword to e.g. "the only literal is `insideBlast`'s
  `r <= 0` guard; both reducers contain none"). Cosmetic; safe to fold into a future touch of this
  file, not worth a rework round. *Found by Reviewer during code review.*

## Design Deviations

No design deviations — implemented exactly to the RED contract.

### Reviewer (audit)
- No spec deviations to stamp — Dev implemented the RED contract exactly (both reducers' signatures,
  return shapes, zero-radius guard, positional matching, ammo-preservation and no-mutation all match
  the TEA contract and the ACs). Nothing undocumented diverged. Audit complete.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (all suites green, no smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings (Reviewer audited tests directly) |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 (LOW) | confirmed 1, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 rule-nums / 1 root (LOW) | confirmed 1 (downgraded), dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 2 confirmed (both LOW, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

Story mc3-2 adds one pure core module (`plugins/missile-command/src/core/damage.ts`, 77 lines) and
its test (`tests/damage.test.ts`, 18 cases). Four enabled subagents ran (preflight, comment-analyzer,
security, rule-checker); the other five are disabled via `workflow.reviewer_subagents`, so I audited
their domains (tests, edges, types, simplification) directly. No Critical or High findings; two LOW,
neither blocking.

**Data flow traced:** the two reducers take only in-memory game entities — `Icbm`/`City`/`Base`/
`Explosion`, plain numeric records built by the sibling core modules. `killIcbmsInBlasts` reads
`icbm.pos` and `blastRadius(exp)`; `resolveGroundImpacts` reads `icbm.arrived`/`icbm.target` vs
structure `pos`. There is no external, user, network, or filesystem input reaching this code — it is a
deterministic transform of core state into core state. `blastRadius` is guaranteed finite by
`explosion.ts` (`Math.min` of two non-negative integers), so no NaN/Infinity can reach the comparison.

### Observations
- `[VERIFIED]` **Zero-radius guard has teeth.** `damage.ts:31` `if (r <= 0) return false` — evidence:
  `blastRadius` returns 0 for a fresh (t≤0) or collapsed (t≥LIFETIME) blast (`explosion.ts:60-64`); the
  tests place a head at the exact centre of such a blast and require a SURVIVOR (`damage.test.ts:186-200`).
  Rule-checker independently mutation-checked `r <= 0`→`r < 0` reddens these. Complies with AC1.
- `[VERIFIED]` **No input mutation.** `resolveGroundImpacts` (`damage.ts:66-72`) copies arrays
  (`[...cities]`) and `.map`s only the hit structure to `{ ...s, alive: false }`; unhit structures
  return the same reference. Evidence: the no-mutation tests (`damage.test.ts` city/base snapshots) are
  green, and `killIcbmsInBlasts` pushes originals into fresh survivor/killed arrays. Complies with the
  core purity/immutability convention.
- `[VERIFIED]` **Base ammo preserved on destruction** — `damage.ts:70` spreads `{ ...b, alive: false }`,
  changing only `alive`; the base-hit test pins `ammo` unchanged (`damage.test.ts`). AC2 satisfied.
- `[VERIFIED]` **Positional match is drift-free** — `samePos` (`damage.ts:56`) is exact `===` on integer
  coordinates; `icbm.target` is stored verbatim by `launchIcbm` and `pos` snaps to `icbm.target`
  exactly on arrival (`icbm.ts:45`), so an arrived ICBM's target is byte-identical to the structure it
  was launched at. No float epsilon needed.
- `[VERIFIED]` **ESM + readonly hygiene** — all three sibling imports carry `.js` (`damage.ts:23-25`),
  type-only imports use inline `type`, and both exported reducers take `readonly` array params. `tsc
  --noEmit` (strict) is clean. (checklist #2, #5)
- `[SEC]` Security subagent: **no findings** — pure deterministic reducer, no eval/dynamic-import from
  untrusted input, no clock/RNG, no prototype-pollution vector, no injection surface. Confirmed against
  my own read: the only numeric literal in code is `0`.
- `[DOC]` **[LOW]** Comment-analyzer confirmed: `damage.ts:11` "both reducers use only trivial 0/1
  arithmetic" is imprecise (no `1` literal; the `0` is in the private helper, not the reducers). Real
  but cosmetic — recorded as a non-blocking Improvement, not a rework trigger.
- `[RULE]` **[LOW, downgraded from HIGH-confidence pattern-match]** Rule-checker flagged the three AC3
  citation `toMatch(/…/)` scans (`damage.test.ts:353,358,363`) under checklist #15/#25 (whole-file
  bare-keyword source scan). **Downgraded, not dismissed** (it matches a stated rule): a source-of-truth
  *citation* is inherently a comment — there is no "declaration that does the work" to anchor to, since
  the citation's presence IS the mechanism; the guard is mutation-tested by construction (deleting the
  phrase reddens the test — #15's ultimate requirement); the substantive halves of AC3 (purity, no
  un-cited literal) are enforced by the auto-swept `purity.test.ts` / `citations.test.ts` §4, both green
  over `damage.ts`; the file is 77 lines with each phrase double-anchored at the JSDoc it documents and
  no decoy occurrence; and this is the established fleet idiom (`icbm.test.ts` AC2 is identical). Residual
  risk is negligible and no blocking.
- `[EDGE]` (self-audited, subagent disabled): empty `icbms`/`explosions`, multiple blasts (killed by
  ANY), and in-flight-vs-arrived boundaries are all covered and discriminating. `[TYPE]` (self-audited):
  reducers reuse `icbm.ts`/`field.ts` types, no stringly-typed API, no unsafe cast in source.
  `[SIMPLE]` (self-audited): no dead code; the per-arrived-ICBM re-`map` of the structure arrays is a
  micro-inefficiency on 6/3-element arrays, not worth a change. `[SILENT]` (self-audited): no swallowed
  errors — reducers are total and throw nothing; the test loader's `catch` re-throws with rich context.
  `[TEST]` (self-audited, analyzer disabled): 18 cases, all assert derived behaviour built from real
  modules (not fixture-echoed literals, #18), zero-radius cases assert `blastRadius(...) === 0` as a
  non-vacuity precondition, and the population loops check the hit index separately so 6/6 and 3/3 are
  covered (#19). Rule-checker corroborated teeth via two independent mutations.

### Rule Compliance (TypeScript lang-review + project rules)
- **#1 type-safety escapes** — COMPLIANT: no `as any`, no non-null `!`; the two `as Partial<…>`/`as
  DamageModule` casts (test file) are each guarded by a `typeof` runtime check — the fleet RED-loader idiom.
- **#2 readonly params** — COMPLIANT: both reducers take `readonly` arrays; no param is mutated.
- **#5 ESM/module** — COMPLIANT: `.js` on all relative imports; inline `type` on type-only imports.
- **#8/#15/#18/#19 test quality** — COMPLIANT with one LOW note (#15/#25 citation scans, downgraded
  above). Fixtures build real objects; assertions are discriminating; no vacuous/fixture-echoed cases.
- **#17/#20 comment/quantity claims** — one LOW imprecision (#17, the "0/1" wording); the "18 cases"
  count and the MAX_BLAST_RADIUS lineage claim verified TRUE.
- **Project purity (CLAUDE.md / purity.test.ts)** — COMPLIANT: no clock/entropy/browser/shell import;
  the live `src/core/damage.ts` purity sweep is green.
- **Project no-un-cited-literal (citations.test.ts §4)** — COMPLIANT: only literal is `0` (trivial set);
  radius sourced from the already-cited `MAX_BLAST_RADIUS`; no new claim — satisfies AC3.
- **#3/#4/#6/#7/#9-14/#16/#21-26** — N/A or clean (no enums, no null-coalescing, no JSX, no async data
  path, no state-machine edges, no a11y, no external-input geometry, no NaN-inverting refactor).

### Devil's Advocate
Assume this code is broken. Where would it fail? First suspicion: the zero-radius guard. If a Dev had
written the obvious `Math.hypot(...) <= blastRadius(exp)` without the `r <= 0` short-circuit, a
just-detonated or fully-collapsed blast (radius 0) sitting exactly on an ICBM head would compute
`0 <= 0 = true` and wrongly destroy a warhead the moment a blast winks out or before it opens — a
subtle, frame-specific fidelity bug. But the guard is present (`damage.ts:31`) and two tests plant a
head at the exact centre of both a fresh and a collapsed blast and demand survival, and the rule-checker
mutated the operator and watched them redden. Closed. Second suspicion: `some()` vs a naive
first-explosion check — a warhead overlapping the *second* of two blasts could survive if the code only
tested `explosions[0]`. The "killed by ANY blast" test (far + near) reddens exactly that mutant. Closed.
Third: positional matching by `===` on floats — if `target` were ever recomputed in flight, drift would
make `samePos` miss and an arrived warhead would pass through a city harmlessly. But `icbm.ts` stores
`target` verbatim and snaps `pos` to it by reference on arrival, so the coordinates are bit-identical;
no epsilon needed. Fourth: an arrived ICBM whose target matches no live structure — it is silently
dropped and kills nothing; is that a leak? No: in the real spawn path every ICBM targets a real
structure position, and even a already-dead city keeps its coordinates, so `samePos` still matches and
the warhead is consumed rather than accumulating. Fifth: mutation aliasing — could a caller's array be
corrupted across ticks? The no-mutation tests snapshot inputs and pass. Sixth: what about a confused
maintainer trusting the "0/1 arithmetic" comment and adding a literal `1`? That is the one real (LOW)
imprecision, recorded. Nothing here rises to High: the module is small, total, deterministic, and its
guards are individually mutation-verified. The adversarial pass surfaces only the cosmetic comment nit.

**Pattern observed:** clean pure-reducer pair mirroring `icbm.ts`, with two focused private helpers
(`insideBlast`, `samePos`) — `damage.ts:27-77`.
**Error handling:** reducers are total (no throw path); zero-radius, empty-input, and no-match cases
all return well-formed results — evidence `damage.ts:31`, `damage.test.ts` empty-input cases green.
**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

Confirmed dispatch tags present: [EDGE] [SILENT] [TEST] [DOC] [TYPE] [SEC] [SIMPLE] [RULE].

## Impact Summary

**Blocking issues:** 0 · **Warnings:** 2 LOW (non-blocking) · **Review rounds:** 1 (APPROVED)

Story mc3-2 adds one pure core module (`plugins/missile-command/src/core/damage.ts`, 77 lines)
implementing the core damage-detection mechanic as two reducers: `killIcbmsInBlasts` (blast→ICBM
destruction via point-in-circle test) and `resolveGroundImpacts` (arrived ICBM→city/base destruction).
Four subagents ran (preflight, comment-analyzer, security, rule-checker); no Critical or High findings.

- **LOW (comment, cosmetic):** `damage.ts:11` "both reducers use only trivial 0/1 arithmetic" — the
  sole `0` literal lives in the private `insideBlast` helper, not the reducer bodies. Recorded as a
  non-blocking Improvement; safe to fold into a future touch of the file.
- **LOW (rule pattern, downgraded — NOT dismissed):** the three AC3 citation `toMatch(/…/)` scans are
  whole-file bare-keyword source scans (checklist #15/#25). Downgraded because a source-of-truth
  citation is inherently a comment, the guard is mutation-tested by construction (delete the phrase →
  test reddens), the substantive halves (purity, no un-cited literal) are enforced by the auto-swept
  `purity.test.ts` / `citations.test.ts`, and this is the established fleet idiom (`icbm.test.ts` AC2).
  Residual risk negligible.

Verification at finish: `damage.test.ts` 18/18; full fleet `npx vitest run` 13,027 passed; orchestrator
408 passed; `tsc --noEmit` clean. Trial-merged `origin/develop` (5 commits ahead, all pac-man/pm2,
disjoint) — merged tree green (431/431 missile-command, orchestrator 0 fail, lint clean).