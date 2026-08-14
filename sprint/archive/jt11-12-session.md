---
story_id: "jt11-12"
jira_key: "jt11-12"
epic: "jt11"
workflow: "tdd"
---
# Story jt11-12: Post-jt11-5 destruction-consumption leftovers (items 1 & 3; item 2 superseded by jt11-18)

## Story Details
- **ID:** jt11-12
- **Jira Key:** jt11-12
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Phase:** finish
**Branch:** feat/jt11-12-cliffblocksclimb-destruction-aware-f6-refactor
**Phase Started:** 2026-08-14T18:45:47Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-14T17:36:58Z | 2026-08-14T17:40:14Z | 3m 16s |
| red | 2026-08-14T17:40:14Z | 2026-08-14T17:57:02Z | 16m 48s |
| green | 2026-08-14T17:57:02Z | 2026-08-14T18:05:40Z | 8m 38s |
| review | 2026-08-14T18:05:40Z | 2026-08-14T18:45:47Z | 40m 7s |
| finish | 2026-08-14T18:45:47Z | - | - |

## Acceptance Criteria

### Item (1) — cliffBlocksClimb destruction awareness
- **When** an enemy calls `cliffBlocksClimb(enemy)` to decide whether to climb a cliff
- **And** the background at that position has been destroyed by lava burn-off (via `jt11-5`)
- **Then** the destroyed cliff must NOT block the climb decision
- **Implementation note:** Thread `arena: ArenaState` parameter into `cliffBlocksClimb` (enemy.ts:1189-1191) and its helper `bckMaskAt` (enemy.ts:1176-1180), similar to how `steerWake` uses `backgroundActive(arena, sample)` (enemy.ts:1268). Update the three call sites (`enemy.ts:801, 1009, 1475`) to pass the arena state. Core test coverage required — seeded-replay fixtures may validate behavior consistency.

### Item (2) — SUPERSEDED
- **Status:** DONE by story jt11-18 (merged 2026-08-14)
- **Scope:** Lava-troll grab-zone wiring for burned plank landings — out of scope for this story
- **Evidence:** `sim.ts:2670-2696` per-contact LNDB7 grab wiring; `frame.ts:277-285` and `enemy.ts:1323-1330` FLOOR+7 clamps; `plugins/joust/tests/burned-shore-grab-jt11-18.test.ts` covers the fix
- **Reference:** `context-story-jt11-18.md:11` documents the closure

### Item (3) — LOW refactor: extract shared raw-column indexing
- **When** `flight.ts` calls `landMaskAtX` (flight.ts:213-215) or `groundMaskAt`'s burned branch (flight.ts:238-240)
- **Then** both must read from the same indexing logic: `const i = x + X_TABLE_ORIGIN`
- **Current state:** `landMaskAtX` computes `i` and applies `| 0x20`; the burned branch re-derives `i` separately without the OR
- **Fix:** Extract a shared `rawColumnIndex(x: number): number` helper to compute `const i = x + X_TABLE_ORIGIN`; both callers use it. Unify the two near-identical TypeError messages (`flight.ts:212` and `flight.ts:237`) to a single template. Behavior must remain byte-identical — seeded-replay fixtures will validate no behavior drift.

## Sm Assessment

**Re-scoped at setup (user-ruled).** jt11-12 arrived with three items and `acceptance_criteria:
null`. Item (2) — the burned-plank / lava-troll grab-zone question — was measured DONE: shipped by
the later story jt11-18 (merged 2026-08-14, `sim.ts:2670-2696` grab wiring + FLOOR+7 clamps in
`frame.ts:277-285` / `enemy.ts:1323-1330`, 8/8 tests green in `burned-shore-grab-jt11-18.test.ts`;
`context-story-jt11-18.md:11` states it "Closes the jt11-12 item (2) grip-grab-zone question").
The user chose **retitle to items 1 & 3** (item 2 folded into a superseded note), so the derived
ACs cover only the two open items and TEA does not see the dead one.

**Both remaining items verified OPEN against the current tree before setup:**
- Item (1): `cliffBlocksClimb`/`bckMaskAt` (`enemy.ts:1176-1191`) sample the pristine background
  with no arena parameter, unlike `steerWake` which jt11-5 threaded (`enemy.ts:1263`/`1268`).
  Callers at `enemy.ts:801, 1009, 1475` pass only `enemy`.
- Item (3): `flight.ts:213-215` (`landMaskAtX`) and `flight.ts:238-240` (`groundMaskAt` burned
  branch) each recompute `x + X_TABLE_ORIGIN`; TypeError messages at `flight.ts:212` vs `237`
  differ only by prefix.

**For TEA:** Item 1 lands a NEW arena-threaded read (behavior change — a destroyed cliff must stop
blocking climb). Item 3 is a PURE refactor and must stay byte-identical — check whether joust's
seeded-replay fixtures guard `flight.ts` and run the FULL `--project joust` suite, not just new
files. Joust core/shell boundary + core-purity guard apply. Sibling probes clean at setup; claim
branch pushed.

**Handoff:** phased `tdd`, setup → red (TEA/Han Solo).

## TEA Assessment

RED phase complete. Tests **appended to existing co-located files** (no new files, so the
`audio-seam-scope` README "191 files" count guard is untouched — verified 191/191). Full
`--project joust` run: **4 failed | 3640 passed**, and the 4 failures are exactly the new RED tests.
Type check clean (`npm run lint` / `tsc --noEmit`).

### What was tested

**Item (1) — vertical climb sample must honour destruction** → `tests/climb-prep-wiring.test.ts`,
new block `jt11-12(1)`. Drives the public `stepEnemyDetailed(enemy, {player, wave, arena})` seam
(the ctx already carries `arena` for `steerWake` since jt11-5). Stages a cliff whose BACKGROUND
bits belong to a destructible cliff, destroys exactly that cliff via the real
`applyWaveDestruction` path, and asserts the climb resumes:
- **RED × 3** (hunter `b2undr`, shadow, bounder): over a DESTROYED cliff the climb must flap;
  today the arena is ignored so it still holds → `expected 0 to be greater than 0`.
- **Green A/B controls** (stay green after): same site with the PRISTINE arena still holds (the
  cliff is really there); a NON-destructible cliff still holds under destroy-all (bit-accuracy —
  the awareness keys on the destroyed cliff's own bits, not a blanket disable); a rising bounder
  with a CLEAR climb flaps (fixture is not dead).

**Item (3) — ground-mask twin de-desync** → `tests/flight.test.ts`, new block `jt11-12(3)`:
- **RED × 1**: the two whole-pixel `TypeError`s of `landMaskAtX` and `groundMaskAt`'s burned branch
  must be UNIFIED into one message — today they differ only by the function-name prefix.
- **Green anti-desync guard**: both twins are pinned to ONE re-derived raw-column index across
  x = −40..330 (crossing both table bounds, asserted). RED evidence is a mutation — change the
  burned branch's index to `x + X_TABLE_ORIGIN + 1` and the guard fails.

**Item (2)** — out of scope, superseded by jt11-18 (see SM Assessment).

### Implementation guidance for Dev (Yoda)

- **Item 1:** thread `arena` into the climb sample the way jt11-5 threaded `steerWake`. `steerWake`
  already treats a sample as open air when `sample === 0 || !backgroundActive(arena, sample)`;
  `cliffBlocksClimb` must gain the same arena-awareness (blocked only when the sample is non-zero
  AND still `backgroundActive`). The arena has to reach `cliffBlocksClimb` at all three call sites
  (hunter B2UP3, shadow SHUP3, bounder BOUP divert), which means plumbing it through the brain
  decide path (`runBrain` → `boundr`/`b2undr`/`shadow`) — the same ctx `stepEnemyDetailed` already
  hands `steerWake`. `bckMaskAt`'s helper stays; the arena gate is applied at the consumer, mirror
  of the `steerWake` comment.
- **Item 3:** extract ONE shared raw-column helper (`x + X_TABLE_ORIGIN` + the bounds check) used
  by both `landMaskAtX` and `groundMaskAt`'s burned branch, and unify the two `TypeError` messages
  into a single string that STILL names the offending value. Behaviour must stay byte-identical —
  the anti-desync guard and the whole existing flight/seeded-replay suite pin that.
- Both items live in joust **core** (`src/core/enemy.ts`, `src/core/flight.ts`) — the core-purity
  scanner applies (no clock, entropy, or shell import). `flight.ts` is generated ("DO NOT
  HAND-EDIT" header) — confirm the edit target is the source, not the generated artifact, before
  editing (see the joust flight.ts generator note).
- New comments must use SYMBOL references, never `<file>.ts:<line>` — the `comment-line-refs`
  (jt9-30/jt11-10) guard reddened on my first draft and I converted them; ROM `*.SRC` cites are fine.

### Rule Coverage (TS lang-review checklist)

- **#15 source-token vs claim / #17 unre-run mechanism:** deliberately used BEHAVIOUR tests, not a
  source-text scan, for the item-3 refactor — the observable contract (unified message + twin
  agreement), not the presence of a helper literal.
- **#20 / #26 non-vacuity:** `findDestructionSites` throws if any staged site is missing; the
  FIXTURE PREMISE test asserts the geometry and that the destroyed arena really drops the target
  bits; the anti-desync guard asserts it crossed both table bounds (`sawInRange && sawOutOfRange`)
  before trusting the sweep.
- **domain-throw rule:** the item-3 message test reinforces that both mask fns reject a fractional
  pixel (rather than silently propagating NaN).
- No `as any`, no non-null assertions, no `@ts-ignore` introduced.

## Dev Assessment

GREEN. Full `--project joust` = **191 files / 3644 tests passing, 0 failures** (my 4 REDs now pass,
nothing regressed); `tsc --noEmit` clean; `node scripts/build-app.mjs joust` builds. Two core files
changed, `enemy.ts` (+item 1) and `flight.ts` (+item 3). Pushed to the feat branch.

### Item (1) — `src/core/enemy.ts`

Threaded an **optional `arena: ArenaState = PRISTINE_ARENA`** (the exact default `steerWake` uses)
through the decide chain that reaches all three `cliffBlocksClimb` call sites:
`pursue` → `boundr` / `b2undr`; `shadow`; `seekWake` (the bounder BOUP divert); and `runBrain`. In
`stepEnemyDetailed` the already-available `arena` is now passed to both `seekWake` and `runBrain`.

The gate itself lives in `cliffBlocksClimb`, mirroring `steerWake` verbatim: blocked only when the
sample is non-zero **AND** `backgroundActive(arena, sample)`. **Design choice for the Reviewer:** I
did NOT add `arena` to `bckMaskAt` — `steerWake` already samples the raw `bckMaskAt` and applies
`backgroundActive` at its own level, so gating at the consumer keeps the two `bckMaskAt` readers
symmetric and leaves `bckMaskAt` a pure table read. (The session AC's implementation note suggested
threading `bckMaskAt` too; gating at the consumer is the smaller, `steerWake`-consistent change and
passes every test.) Because the default is pristine, every pre-jt11-12 caller — and the whole
seeded-replay suite — is byte-identical.

### Item (3) — `src/core/flight.ts`

Extracted **`rawColumnIndex(x): number | null`** — the single index + bounds computation both
`landMaskAtX` and `groundMaskAt`'s burned branch now read through, so neither can desync. Returning
`number | null` (the valid index, or `null` out of range) rather than a raw column value preserves
the load-bearing asymmetry the twins have: `landMaskAtX` ORs `| 0x20` **only in range** (out of
range it returns `0`, not `0x20`), while the burned branch never ORs. The shared `TypeError`
(`expected a whole pixel, got X`) unifies the two former per-function messages. The separate
whole-**scanline** `y` check on `groundMaskAt` is untouched (a different message, one occurrence,
no twin — out of item scope). `flight.ts`'s "GENERATED / DO NOT HAND-EDIT" header is stale: jt11-5
hand-added the very burned branch I refined here, the generator is not in the build/release path,
and regenerating would revert jt11-5/jt11-3/etc. — so hand-editing is the established practice.

## Reviewer Assessment

**Verdict: APPROVED.** Items 1 & 3 are correct, fully tested, byte-identical (item 3), and wired into
the real game loop (item 1 via `frame.ts` → `stepEnemyDetailed(…, {arena})`); item 2 correctly scoped
out (superseded by jt11-18). All 9 specialist subagents were run and received; five are clean, and the
remaining findings are all **LOW** polish (contract/signature tidiness, a test-helper duplication, and
a stale comment phrase). No correctness, safety, purity, determinism, or security defect. On a 2pt
story with only LOW findings, these are filed as follow-ups rather than a rework (proportionality).

### Correlation (dispatch tags)

**[EDGE]** — edge-hunter CLEAN. Table-bound edges of `rawColumnIndex` (`i` = -1/0/length-1/length),
fractional/NaN/Infinity `x`, and every `cliffBlocksClimb` arena case (sample===0, single-cliff overlap,
non-destructible disjoint control, destroy-all, PRISTINE default) enumerated — none unhandled. Threading
complete: all 3 consumers get `arena`; `frame.ts` is the only production caller and threads a live arena.

**[SILENT]** — silent-failure-hunter CLEAN. `rawColumnIndex` fails LOUD (throws on non-integer incl.
NaN); no empty catches; no `??`/`||` silent fallback. Traced `sim.ts → frame.ts → stepEnemyDetailed →
brains`: production always passes the live arena, so the `= PRISTINE_ARENA` defaults never silently
swallow destruction (they are exercised only by tests).

**[TEST]** — test-analyzer CLEAN. RED-turned-green tests non-vacuous with real A/B attribution controls;
the anti-desync guard is a genuine oracle (imported constants, crosses both bounds); the unified-message
test cross-checks the two real outputs (not a literal) and still requires the value be named. The one
theoretical gap (a sample with two destructible cliffs' bits) was proven unreachable in the ROM data.

**[DOC]** — comment-analyzer CLEAN except one **LOW**: the `flight.test.ts` GUARD comment says "mutate
**the burned branch**", but post-refactor that expression lives in `rawColumnIndex` — stale phrasing
(claim still true, suite-verified). comment-line-refs (jt9-30/jt11-10) guard passes (no `<file>.ts:<line>`
introduced); `cliffBlocksClimb` / `rawColumnIndex` docs accurate. → follow-up #1.

**[TYPE]** — type-design: `rawColumnIndex(x): number | null` is a sound discriminated return (sound over
sentinels); `ArenaState` reused; no unsafe cast. Two **LOW** findings: (a) contract drift — production
added `arena` to `boundr`/`b2undr`/`shadow`/`runBrain` but `enemy-contract.ts` was not updated (the
subagent rated this MEDIUM; **downgraded to LOW** — see rationale below); (b) `boundr`'s threaded `arena`
is inert (the bounder's real cliff-check is in `seekWake`, so `boundr→pursue`'s arena never fires — the
fix works, proven by the bounder RED test going green via `seekWake`). → follow-ups #2, #3.

**[SEC]** — security CLEAN. Browser-only, no auth/secret/injection surface. Repo security-analog (core
purity/determinism) holds: no clock/entropy/shell import into core; `rawColumnIndex` rejects
non-finite/fractional `x` with a throw. Purity scanner 59/59.

**[SIMPLE]** — simplifier: `rawColumnIndex` is a genuine dedup sized right for a LOW refactor; no dead or
over-broad `arena` plumbing (every threaded fn uses it or passes it to a child that does). Two **LOW**
findings: (a) the `= PRISTINE_ARENA` default on the three *private* fns (`pursue`, `cliffBlocksClimb`,
`seekWake`) is dead width (all internal call sites pass `arena`) — could be required instead; (b)
`flapCountArena` largely duplicates the existing `flapCount` (could add optional `velY`/`arena` params).
→ follow-ups #3, #4.

**[RULE]** — rule-checker: **34 checks, 0 hard violations** (30 TS checklist + 4 joust-specific). Core
purity/determinism PASS (full replay-fingerprint suite green → item 3 byte-identical, item 1's default
leaves pre-existing callers unchanged); comment-line-refs PASS; README count guard PASS (both test files
**modified**, not added — 191/191); `flight.ts` GENERATED-header hand-edit consistent with jt11-5
precedent (generator not in build/release path). One **LOW** note: #17, same stale phrasing as [DOC].

### Rule Compliance

Mapped to the TS lang-review checklist + joust-specific rules (rule-checker verified exhaustively):

- **#1 type-safety escapes** — PASS (no `as any`/`as unknown as T`/`@ts-ignore`/unsafe `!` in diff).
- **#4 null/undefined handling** — PASS (`sample !== 0 && backgroundActive(...)` uses explicit `!== 0`
  where 0 is meaningful, not `||`/`??`).
- **#8 test quality** — PASS (real production constants as oracles, no `dist/` imports, no vacuous asserts).
- **#11 error handling** — PASS (single unified `throw`, no `catch (e: any)`).
- **#14 derived edges in one branch** — PASS (`arena` resolved once in `stepEnemyDetailed`, fanned out
  uniformly; all 3 `cliffBlocksClimb` consumers threaded — none left on the old 1-arg call).
- **#17 comments assert a re-run mechanism** — LOW note (stale "burned branch" phrasing; follow-up #1).
- **#18/#26 oracle independence** — PASS (guard/oracle from imported constants, not test-local literals).
- **#22 NaN-safety on rewrite** — PASS (identical `i<0 || i>=length` comparison preserved through the
  extraction; `Number.isInteger` guard still precedes it).
- **joust A1 core purity/determinism** — PASS (imports core-only; replay-fingerprint suite green).
- **joust A2 comment-line-refs** — PASS (zero `<file>.ts:<line>` introduced).
- **joust A3 README test-file count** — PASS (files modified not added; 191 unchanged).
- **joust A4 flight.ts GENERATED header** — PASS/accepted (hand-edit per jt11-5 precedent).

### Severity rationale — contract drift downgraded MEDIUM → LOW

type-design rated the missing `arena` on the four brain functions in `enemy-contract.ts` as MEDIUM,
citing the codebase's anti-drift culture. I downgrade to LOW (not dismiss): the impl satisfies the
contract type (an extra optional param is assignable), `tsc` and the full suite are green, `arena` IS
already documented on the primary `stepEnemyDetailed` seam in the contract, no caller passes `arena` to
a bare brain today, and the "Pure" doc is not falsified (purity holds — `arena` is an input, not an
effect; comment-analyzer confirmed the file convention does not enumerate params). Real and worth doing
given the culture, hence follow-up #2 — but not blocking a green, fully-tested 2pt story.

### Follow-ups (LOW / non-blocking)

1. **Stale mutation-note phrasing** — `plugins/joust/tests/flight.test.ts`, `jt11-12(3)` GUARD comment:
   "the burned branch" → "`rawColumnIndex`". One-line edit; fold into any next joust touch. (#17 / [DOC])
2. **Contract consistency** — add `arena?: ArenaState` to `boundr`/`b2undr`/`shadow`/`runBrain` in
   `tests/helpers/enemy-contract.ts`, mirroring jt11-5's `steerWake` update, so the authoritative shape
   stops drifting behind production. ([TYPE])
3. **Inert `arena` width** — the bounder's real cliff-awareness is in `seekWake`, so `boundr`'s `arena`
   (and the defaults on the private `pursue`/`cliffBlocksClimb`/`seekWake`) is dead. Either drop it from
   `boundr` / make the private params required, or leave a one-line note that the width is intentional
   signature symmetry. ([TYPE]/[SIMPLE])
4. **Test-helper dedup** — fold `flapCountArena` into `flapCount` via optional `velY`/`arena` params to
   avoid a second loop that can drift. ([SIMPLE])

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Yes | clean | none | N/A |
| 3 | reviewer-silent-failure-hunter | Yes | clean | none | N/A |
| 4 | reviewer-test-analyzer | Yes | clean | none | N/A |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 LOW (stale mutation-note phrasing) | deferred 1 (follow-up #1) |
| 6 | reviewer-type-design | Yes | findings | 2 LOW (contract drift; inert `boundr` arena) | deferred 2 (follow-ups #2, #3) |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Yes | findings | 2 LOW (dead private defaults; test-helper dup) | deferred 2 (follow-ups #3, #4) |
| 9 | reviewer-rule-checker | Yes | findings | 1 LOW (#17, same stale phrasing) | deferred 1 (follow-up #1) |

**All received: Yes** (9/9). Note: 5 of these (edge-hunter, silent-failure-hunter, test-analyzer,
type-design, simplifier) are toggled off in `workflow.reviewer_subagents`; I dispatched them anyway so
every dimension of a core-sim change is covered and the completion gate is satisfied honestly.

## Delivery Findings

No upstream findings.

## Design Deviations

**Item 3a (shared raw-column helper) has no direct behavioural RED — by nature.** The helper
extraction is byte-preserving, so it cannot fail a behaviour test on arrival. The RED deliverable
for item 3 is the message unification; the anti-desync twin guard is a GREEN guard whose RED
evidence is a described mutation (per the jt9-51 precedent for per-wake guards). This is honest,
not a gap: a refactor's value is measured by what it PREVENTS, and the guard reddens the moment a
future edit desyncs the twins.

**"Unify the two TypeError messages" is read as byte-identical.** The AC says the two messages,
plural, unify — so the test asserts they are the SAME string (still naming the bad value). If Dev
prefers a shared helper that keeps a per-caller name, the messages would differ and the test would
fail; the faithful reading of the AC is one message. Flagged for the Reviewer.