---
story_id: "sw8-10"
jira_key: "sw8-10"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-10: Past-plan TIE supply loops the set's LAST group (TWV2Z), not a bare 1A1 mook

## Story Details
- **ID:** sw8-10
- **Jira Key:** sw8-10
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-01T11:13:45Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-01T22:30:00Z | 2026-08-01T10:34:27Z | -42933s |
| red | 2026-08-01T10:34:27Z | 2026-08-01T10:44:41Z | 10m 14s |
| green | 2026-08-01T10:44:41Z | 2026-08-01T10:53:26Z | 8m 45s |
| review | 2026-08-01T10:53:26Z | 2026-08-01T11:06:07Z | 12m 41s |
| green | 2026-08-01T11:06:07Z | 2026-08-01T11:09:49Z | 3m 42s |
| review | 2026-08-01T11:09:49Z | 2026-08-01T11:13:45Z | 3m 56s |
| finish | 2026-08-01T11:13:45Z | - | - |

## Acceptance Criteria (DERIVED by sm-setup)

The core deliverable: past the plan's end, the spawn supply must loop the selected set's LAST group (TWV2Z for SET A1) — entry-by-entry in order, restarting at the group's start — instead of inventing a bare '1A1'.

- **AC1:** When `spawnIndex` exceeds the length of `waveSpawnPlan(spaceWave)`, the code selects the set's LAST group (TWV2Z for SET A1) and loops through its entries in order, restarting at the group's beginning on each wrap, instead of inventing a '1A1' fallback entry.

- **AC2:** The looping respects the group's full entry list (18 entries for TWV2Z, including all ±2048 D-corner beginLocs 1D1/1D2/1D3) and cycles deterministically through them without truncation or modification.

- **AC3:** Test coverage verifies that spawns beyond the plan's end sample the group's entries in cyclic order (e.g., spawnIndex 27, 28, 29... for SET A1 fetch TWV2Z[0], TWV2Z[1], TWV2Z[2]...) and that the choreography and shape reflect the entry's fields, not a synthetic '1A1'.

- **AC4:** The implementation aligns with the ROM's ADASHP behaviour (WSCPU.MAC:1058-1090): when the plan ends, the code clamps to the set's LAST group and restarts that group's loop pointer, ensuring the endless tail recycles the full group mix.

## Sm Assessment

**Setup complete; route to TEA (Han Solo) for RED.** tdd workflow, phased; the phase
pointer read `setup` on arrival and is correct.

**Sibling probes (both run before sm-setup):** no remote branch matched sw8-10 after
`git fetch --prune`; the only live session across `/Users/slabgorb/Projects/a-*` is
a-2 on cp5-1 (centipede) — no file-neighbourhood contention with star-wars TIE
supply. `origin/main` had moved (jt5-3 finish); fast-forwarded before any setup.

**Premise measurement (all description claims verified TRUE against main @ 447ef2f):**
the `'1A1'` fallback exists at `plugins/star-wars/src/core/sim.ts:2129-2145`; wave-1
plan is 27 entries and TWV2Z is 18 entries incl. the ±2048 corners
(`tie-waves.ts:65-88`); ADASHP's clamp-to-last-group + loop-pointer-restart read
directly from `reference/atari-source/star-wars-1983/WSCPU.MAC` (~:1058-1090). The
"≤9 spawns under the 6-kill quota" latency figure is the one unmeasured claim — TEA
to measure in RED. No corrections to the story were needed.

**ACs:** sprint YAML has `acceptance_criteria: null`; the four ACs above were DERIVED
by sm-setup from the description + SM's measured facts (jt8-6 precedent). This
session file is the authoritative AC copy; the context mirrors it verbatim and adds
a note that AC1's "(TWV2Z for SET A1)" is an example, not a SET-A1-only restriction.

**Context:** sm-setup's generated context was a stub ("No description in the sprint
YAML… TEA to define") despite its "validated" claim — SM replaced it wholesale with
the measured-evidence version before committing. Do not regenerate it.

**Claim visibility:** status stamped `in_progress` (sm-setup left it at backlog,
fifth consecutive confirmation); stamp + context pushed on `main` @ cd50069; claim
branch `feat/sw8-10-past-plan-twv2z-loop` pushed at zero commits ahead.

## TEA Assessment

**Tests Required:** Yes

**Test Files:**
- `plugins/star-wars/tests/core/tie-waves-past-plan.test.ts` — the past-plan supply
  contract: boundary pair (26/27), the full 18-entry TWV2Z walk incl. the nine
  ±2048 D-corner rows, wrap-at-start, deep-cycle stability, set-relative clamp
  (SET A2 + both NWNSHP-recycled sets), shape-from-entry, and the Darth-never-
  respawns-from-the-tail guard.

**Tests Written:** 13 tests covering 4 ACs — 7 RED (the divergent contract) + 6
green-on-arrival (premises + wrong-fix guards, each with a comment justifying why
green is non-vacuous).
**Status:** RED (failing — ready for Dev). Committed `1762e61`, pushed to
`feat/sw8-10-past-plan-twv2z-loop`.

**RED verification (testing-runner, full project):** `Test Files 1 failed | 190
passed (191)`, `Tests 7 failed | 2052 passed (2059)` — all 7 failures in the new
file, zero collateral. Totals are full-run shaped (not scope-narrowed). `npm run
lint` (tsc, the only type check in CI) is clean — vitest's transform does not
typecheck, so this was checked separately.

**Seam:** `spawnTie(rng, spawnIndex, spaceWave)` — the wired supply (sim.ts:479).
A spawned fighter's `vm.pc` is its observable choreography (`initVm(choreoPc(…))`)
and `kind` its shape. Tests do not prescribe the resolver's shape; any fix that
makes the wired seam produce ADASHP's supply passes.

**Test-design notes for Dev (Yoda):**
- The suite deliberately kills the tempting wrong fixes: `plan[i % plan.length]`
  dies twice (SET A1's `27 % 27` = plan[0] = '1A1' — the exact defect at the exact
  boundary — and the SETA6 tail-never-darth guard), `plan[min(i, len-1)]` dies on
  the 26/27 boundary pair needing DIFFERENT rows. The right rule is set-relative:
  past the plan, loop the SELECTED set's last group from its start
  (`TWV2Z[(i - plan.length) % 18]` semantics, WSCPU.MAC:1083-1090).
- The 6 green-on-arrival tests must STAY green through GREEN.
- ⚠ Citation gate: `spawnTie` (sim.ts:2129-2145) sits in audit-cited territory —
  if cited lines shift, run `plugins/star-wars/tools/audit/reanchor-citations.mjs`
  (line-number drift only; never touch `verbatim` quotes).

### Rule Coverage

| Rule (TS lang-review) | Test(s) / evidence | Status |
|------|---------|--------|
| #1 type-safety escapes | no `as any` / `!` / suppressions in the new file; `vm?.pc` + `toBe` fails loudly on undefined | clean (tsc-verified) |
| #4 null/undefined | optional chaining on `Enemy.vm?`; no `\|\|`-on-nullable anywhere in the diff | clean |
| #8 test quality | discriminability guard test (`choreoPc('1A1')` ≠ every TWV2Z pc, measured 1 vs 12…) makes every "not the mook" assertion non-vacuous; no mock/cast assertions | failing-as-designed / guard green |
| #2,3,5,6,7,9–13 | not applicable — pure-core, test-only diff (no enums, JSX, async, config, or runtime input) | n/a |

**Rules checked:** 3 of 3 applicable lang-review rules have coverage; 10 n/a for a
test-only core diff.
**Self-check:** 0 vacuous tests found (every test asserts computed `toBe` values;
green-on-arrival tests each carry their non-vacuity rationale in a comment).

**Handoff:** To Dev (Yoda) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/star-wars/src/core/tie-waves.ts` — added `supplyEntry(spaceWave,
  spawnIndex)`: the TOTAL spawn supply. In-plan indices return the plan entry
  verbatim; past the plan it loops the SELECTED set's last group from its start —
  `tail[(spawnIndex - plan.length) % tail.length]` — the ADASHP clamp+restart
  (WSCPU.MAC:1083-1085, :1090). Pure APPEND after `choreoPc`, so no cited line in
  this file shifted.
- `plugins/star-wars/src/core/sim.ts` — `spawnTie` consumes `supplyEntry`; both
  invented fallbacks (`?? 'TIE'`, `?? '1A1'`) are deleted and `entry` is total.
  Import swapped `waveSpawnPlan` → `supplyEntry` (choreoPc retained). Comments
  updated to the sw8-10 rule; phrasing avoids the purity guard's `window.` prose
  trap.
- `plugins/star-wars/docs/audit/findings/pair-tie-ai.json` — A-008's `ours` cite
  re-anchored sim.ts:2145→2144 via `tools/audit/reanchor-citations.mjs --write`
  (95 already correct, 1 re-anchored, 0 lost) — line-number drift only, verbatim
  untouched.

**Tests:** 2059/2059 passing across 191 files (full star-wars project,
testing-runner RUN_ID sw8-10-dev-green) — including the story suite 13/13 and the
audit citation gate 12/12. `npm run lint` (tsc) clean. TEA's 6 green-on-arrival
guards stayed green: the tail is the last GROUP, not the whole plan (Darth cannot
re-enter), and the 26/27 boundary yields different rows.

**Branch:** `feat/sw8-10-past-plan-twv2z-loop` (pushed: RED `1762e61`, GREEN
`1d67cfc`, sidecars `1bc1081`).

**Handoff:** To Reviewer (Obi-Wan Kenobi) for review.

### Rework round 1 (post-review fixes) — commit `bb8e064`

All three round-1 findings addressed, nothing else touched; sim.ts deliberately
untouched (the guard in `supplyEntry` makes spawnTie's dereference safe, and
avoids re-anchoring citations a second time):
1. **[MEDIUM] type honesty:** `supplyEntry` now throws on a negative or
   fractional `spawnIndex` (tie-vm CHERR convention, per the Reviewer's
   prescription — NOT an invention fallback), with a docstring paragraph stating
   the precondition. Probed via a scratch vitest file (throw on −1, throw on 1.5,
   index 27 still '2A1') which was deleted before commit — `git show
   --stat bb8e064` confirms two files only.
2. **[MEDIUM] clamp cite:** test header now cites `:1082-1087` for the full
   six-instruction quote.
3. **[LOW] restart cite:** `:1089-1090` in both the `supplyEntry` docstring and
   the test header.

**Rework verification:** full star-wars suite 2059/2059 (191 files) green after
the guard; `npm run lint` clean; citation gate untouched (no cited line moved —
`supplyEntry` sits at EOF past every cited line, sim.ts untouched).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — all gates green (star-wars 2059/2059, tsc clean, orchestrator 358/358, no smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 6 violation rows (3 distinct issues) | confirmed 3, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled returned; 7 disabled via settings)
**Total findings:** 3 confirmed, 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED (round 2 — round 1's three findings all FIXED in `bb8e064`
and independently re-verified; the round-1 record below is preserved with
outcomes)

**Independent verification performed (same-session hazard acknowledged — this
session authored the tests and the code, so the leverage below is re-derivation
and mutation, not re-reading):**
- [VERIFIED] ADASHP re-derived from the ROM directly: entry-by-entry walk (`LDD
  0(U)/2(U)/4(U)`, `LEAU 6(U) / STU WV.LP`, 6-byte `.WV` entries), zero-byte group
  terminator (`LDA 0(U) / BEQ`), clamp-to-last-group on set overflow ("KEEP IT
  WITHIN RANGE"), restart at the group's first entry — the endless tail is the last
  group looped from its start. `supplyEntry`'s `(spawnIndex − plan.length) %
  tail.length` is semantically equivalent given sequential consumption, which
  sim.ts:474-487 provides (one spawn per step, counter += 1). WSCPU.MAC:1058-1091
  read in full.
- [VERIFIED] Wave-boundary reset: `clearRun` re-zeroes `spawnCount` (sim.ts:1906,
  sw7-13 comment) — a carried-over counter would have skipped Darth in waves 2+;
  it cannot. The per-wave plan indexes from 0 each wave.
- [VERIFIED] Mutation check A — `plan[spawnIndex % plan.length]` (loop the whole
  plan): 8/13 tests redden, including the SETA6 Darth-tail guard. Restored, suite
  13/13 green.
- [VERIFIED] Mutation check B — `plan[plan.length − 1]` (freeze on last row):
  7/13 redden, including the 26/27 boundary pair. Restored, 13/13 green.
- [VERIFIED] Consumer sweep: `waveSpawnPlan` is consumed only by `supplyEntry` and
  tests; `supplyEntry` only by `spawnTie` (sim.ts:2137) and tests — no other code
  holds a finite-plan assumption this change disturbs.
- [VERIFIED] Modulo domain: the tail expression is reached only when `spawnIndex ≥
  plan.length`, so both `%` operands are non-negative on every reachable path
  (rule-checker hard-ask #3 concurs).
- [VERIFIED] Purity: no DOM/clock/random in the diff; the comment prose avoids the
  events.test.ts `window.`-in-prose trap; core-purity suite green ([RULE] #14).
- [VERIFIED] Audit citations: A-008 re-anchored 2145→2144, verbatim untouched, gate
  12/12 green; reanchor reported 95 correct / 1 moved / 0 lost.

**Findings (all [RULE], reviewer-rule-checker, adjudicated by me):**

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] | Type-honesty regression (checklist #4 + #13): `plan[spawnIndex]` returns `undefined`-typed-as-`WaveEntry` for a negative index (tsconfig lacks `noUncheckedIndexedAccess`), and the diff REMOVED spawnTie's `entry?.shape ?? 'TIE'` / `?? '1A1'` net, so `entry.shape` would TypeError. Unreachable today — `spawnCount` is 0-initialized, monotonic (sim.ts:480), wave-reset (sim.ts:1906); no fixture passes a negative — but a rule-matched latent landmine. | `tie-waves.ts:157`, `sim.ts:2138,2143` | Make the precondition explicit WITHOUT reintroducing an invention fallback: guard-throw on `spawnIndex < 0 \|\| !Number.isInteger(spawnIndex)` (precedent: tie-vm.ts:105 CHERR throw on unassigned opcode), or widen the return type and handle explicitly at the call site. A `?? '1A1'`-style fallback is NOT acceptable — that is the story's defect. |
| [MEDIUM] | Cite-extent error (jt8-6 class — a narrow cite under a wider quote manufactures corroboration): the test header quotes `LDB WV.LVL / CMPB 0(X)+ / IFHI / LDB -1(X) / ENDIF / STB WV.LVL`, which spans WSCPU.MAC:1082-1087, but cites `:1083-1085`. | `tests/core/tie-waves-past-plan.test.ts` header (~line 8) | Widen the cite to `:1082-1087` or trim the quote to the three instructions inside `:1083-1085`. |
| [LOW] | Restart cite `:1090` omits `LDD B(X)` at `:1089` — the quoted pair spans `:1089-1090`. Present in the `supplyEntry` docstring and mirrored in the test header. | `tie-waves.ts` docstring (~:150), test header (~line 9-10) | Cite `:1089-1090` in both places. |

**Round-1 rationale (historical — verdict then was REJECTED):** rejecting on
MEDIUM is allowed (the blocking rule is a floor). In this repo the line-cite IS
the product — jt8-6 burned three rounds on exactly this claim-extent class — and
all three fixes were mechanical minutes. One green rework now was cheaper than
shipping wrong extents into permanently-cited core comments.

**Round-2 verification (commit `bb8e064`, all three findings FIXED):**
- [RULE] Finding 1 FIXED — `supplyEntry` now throws on a negative or fractional
  index (a guard, not an invention fallback, exactly as prescribed). Probed
  directly by me via a scratch vitest file (deleted, never committed): −1, 0.5
  and −100 all throw `/caller bug/`; indices 26/27 still serve '2D3'/'2A1' and
  the recycled SETA6 wrap (7, 52) serves '2A2'. The new docstring paragraph
  makes only defensible claims and cites no line numbers.
- [RULE] Finding 2 FIXED — test-header clamp cite now `:1082-1087`; verified
  against numbered ROM text: LDB WV.LVL=1082 … STB WV.LVL=1087, exactly the
  six quoted instructions.
- [RULE] Finding 3 FIXED — restart cite now `:1089-1090` in both files; verified:
  LDD B(X)=1089, STD WV.LP=1090.
- Independent re-verification of the whole tree at `bb8e064`: star-wars
  2059/2059 (191 files), `npm run lint` clean, orchestrator 358/358. The rework
  touched no cited line (supplyEntry sits at EOF; sim.ts untouched), so the
  citation gate needed no re-anchor — confirmed green in the full run.

**Proportionality note:** per the sw7-16 lesson I weighed filing these as
follow-ups instead; the deciding factors were (a) the type finding is
rule-matched in CODE, not prose, and (b) the cite errors sit in comments whose
whole purpose is auditability against WSCPU.MAC.

**Data flow traced:** `state.spawnCount` (0-init state.ts:1307, += 1 per spawn
sim.ts:480, wave-reset sim.ts:1906) → `spawnTie(rng, spawnCount, state.wave − 1)`
(sim.ts:479) → `supplyEntry` → entry → `kind` / `initVm(choreoPc(...))` → Enemy
into `movedEnemies` — safe on every reachable value; the sole unreachable hole is
Finding 1.
**Pattern observed:** good — data-table port with the rule stated set-relative and
the mechanism cited instruction-by-instruction, matching tie-waves.ts house style;
tests kill named wrong fixes, not just the defect (tie-waves-past-plan.test.ts).
**Error handling:** pure functions, no I/O; failure surface is Finding 1's
unguarded dereference on an impossible-by-invariant input.
**Security:** no external input, no DOM, no storage in the diff; tenant isolation
n/a for a pure-core data rule ([SEC] specialist disabled; assessed by me: nothing
to assess beyond purity, which is green).
**Wiring:** `supplyEntry` is consumed by the live spawn path (sim.ts:479→2137) —
not an unwired module; proven by mutation A reddening the spawnTie-seam tests.

### Rule Compliance

Per `.pennyfarthing/gates/lang-review/typescript.md` over the three changed .ts
files (rule-checker exhaustive sweep + my spot verification):
- #1 type-safety escapes: no `as any`/`!`/suppressions anywhere in the diff;
  VIOLATION on `supplyEntry`'s dishonest return type (Finding 1).
- #2 generics/interfaces: compliant (primitive params; `readonly` data untouched).
- #3 enums: compliant — `'TIE' | 'RTH'` union fully covered by the ternary
  (sim.ts:2138).
- #4 null/undefined: 3 violation rows, all Finding 1's single root cause; the
  modulo line itself is compliant (guard-proven non-negative).
- #5 modules: compliant — import swap complete (`waveSpawnPlan` zero uses left in
  sim.ts), all test imports used, `.js` extensions n/a under bundler resolution.
- #6 React, #7 async, #9 build, #10 input validation, #11 error types, #12
  perf/bundle: no instances in diff — n/a.
- #8 test quality: compliant — no mocks, no casts, discriminability guard
  empirically true, every expect discriminates.
- #13 fix-regressions: VIOLATION — the fix removed the null-safety net without an
  explicit replacement contract (Finding 1's other face).
- Purity (project rule): compliant, suite-verified.

### Devil's Advocate

Assume this is broken; how? First, the port's central equivalence: ADASHP walks a
pointer, we index. If any consumer ever spawns non-sequentially — two constructs
in one frame, or an index reused after a death — the pointer and the index
diverge. I checked: one spawn per step (`movedEnemies.length < WAVE_SIZE` gates a
single push, sim.ts:474-487), deaths never rewind `spawnCount`, and the wave
boundary re-zeroes it (sim.ts:1906). The ROM's own WV.LP likewise persists through
a player death within a wave — equivalent. Second, the recycled-set path: past
wave 6 `selectWaveSet` recycles SETA5/SETA6; if either ended in a non-TWV2Z group
the "TWV2Z forever" story would silently change meaning — the premise test pins
every set's last group, so a data reorder re-scopes loudly. Third, what if
`TWV2Z`'s transcription itself is wrong? This suite deliberately trusts the
sw7-12 transcription gate (tie-waves-rom.test.ts) rather than re-pinning bytes —
a wrong transcription would fool both suites identically, but that gate cites
WSCPU.MAC:1299-1320 line-by-line and predates this story. Fourth, huge indices: %
keeps everything in [0,18) for any index a session could reach; float drift can't
arrive because `spawnCount` is integer arithmetic only. Fifth, a stressed
fixture could hand `spawnTie` a negative or fractional index directly — and there
the new code crashes where the old code invented a mook: that is Finding 1, real,
and it is the reason this round routes back. Sixth, the citation gate: could the
reanchor have laundered a stale claim? No — verbatim text unchanged, only the
line integer moved, and the gate re-verifies the pair against the working tree.
The devil keeps Finding 1 and the cite extents; nothing else survives.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

## Delivery Findings

### TEA (test design)
- **Gap** (non-blocking): the story's reachability framing is stale — "latent today
  … under the 6-kill quota" describes a retired mechanism. The space phase is now
  TIME-boxed (`phaseCleared` reads `s.phaseTime >= SPACE_PHASE_END_S`, sim.ts:1620;
  `SPACE_PHASE_END_S = 21`, state.ts:929 — landed by sw8-11/12), and a killed TIE
  frees a slot that refills on the very next step (sw8-7, sim.ts:474-487), so
  spawnCount = 3 + kills and ~25 kills inside 21 s walks spawnIndex past SET A1's
  27 entries in a legitimately played game. The divergence is *reachable*, not
  latent — the story's own "bites if … the phase becomes time-boxed" condition has
  already happened. No scope change (the fix contract is identical); urgency is
  understated in the backlog.
  Affects `sprint/epic-sw8.yaml` (sw8-10 description's latency clause — stale as
  archived; this session records the correction).
  *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings during implementation. (The one drift the change caused —
  audit finding A-008's `ours` cite moving sim.ts:2145→2144 — was re-anchored in
  the same commit via `tools/audit/reanchor-citations.mjs --write`: 95 already
  correct, 1 re-anchored, 0 lost.)

### Reviewer (code review)
- **Improvement** (non-blocking): `tsconfig.json` lacks `noUncheckedIndexedAccess`,
  which is why tsc could not catch Finding 1's `undefined`-typed-as-`WaveEntry`
  indexed access — the same blind spot exists across every game's table lookups.
  Affects `tsconfig.json` (evaluate enabling the flag repo-wide; expect a large
  one-time re-annotation cost across the cabinet, so this is an epic-sized
  decision, not a story rider). *Found by Reviewer during code review.*

## Impact Summary

**Round 1 (REJECTED):** three rule-matched findings; all independently re-verified
FIXED in commit `bb8e064` (round 2):

| Finding | Severity | Status | Evidence |
|---------|----------|--------|----------|
| supplyEntry precondition guard (type honesty) | MEDIUM | FIXED ✓ | throws on negative/fractional index (guard, not invention fallback); Reviewer probe: −1, 0.5, −100 throw; supply intact (27→'2A1') |
| Clamp cite extent | MEDIUM | FIXED ✓ | test header cites :1082-1087, matching its six-instruction quote (verified against numbered ROM text) |
| Restart cite extent | LOW | FIXED ✓ | both files cite :1089-1090 (LDD B(X)=1089, STD WV.LP=1090, verified) |

**Round 2 (APPROVED):** star-wars 2059/2059 (191 files), tsc clean, orchestrator
358/358, citation gate green (A-008 re-anchored 2145→2144, verbatim untouched).
Core logic verified by ADASHP re-derivation (WSCPU.MAC:1058-1091) and two mutation
checks (modulo-whole-plan: 8 reds; clamp-to-last-entry: 7 reds).

**Non-blocking Delivery Findings:** (1) TEA Gap — the story description's "latent
under the 6-kill quota" framing was stale; the space phase is time-boxed
(sw8-11/12) and kills refill next-step (sw8-7), so the divergence was reachable in
~25 kills / 21 s of play; fix contract identical, urgency was understated. (2)
Reviewer Improvement — evaluate `noUncheckedIndexedAccess` repo-wide (filed as a
follow-up story at finish).

**Design Deviations:** both ACCEPTED (TEA's wired-pure-seam test strategy; Dev's
resolver-in-tie-waves choice).

**Shipped:** `supplyEntry` — the total ADASHP supply rule (in-plan verbatim; past
the plan, the selected set's last group looped from its start) consumed by
`spawnTie`; 13 contract tests incl. wrong-fix killers; branch
`feat/sw8-10-past-plan-twv2z-loop` (RED `1762e61`, GREEN `1d67cfc`, sidecars
`1bc1081`, rework `bb8e064`), landed on `main` by rebase + fast-forward (trunk-based,
no PR).

## Design Deviations

### TEA (test design)
- **Contract pinned at the wired pure seam (`spawnTie`), not via a full-sim
  27-kill integration run**
  - Spec source: context-story-sw8-10.md, AC3
  - Spec text: "Test coverage verifies that spawns beyond the plan's end sample the
    group's entries in cyclic order"
  - Implementation: tests call `spawnTie(rng, spawnIndex, spaceWave)` directly with
    past-plan indices and assert the seated `vm.pc` / `kind`; no stepGame harness
    forces 27+ kills to raise `spawnCount` organically
  - Rationale: `spawnTie` IS the wired supply — sim.ts:479 passes `spawnCount` and
    `state.wave - 1` verbatim, and that plumbing is pre-existing, pinned by the
    sw4-1/sw8-7 suites. A 27-kill stepGame harness would re-prove the plumbing at
    high fixture cost while asserting the same seam.
  - Severity: minor
  - Forward impact: if a later story changes what sim.ts passes for spawnIndex
    (e.g. per-slot instead of cumulative), these tests stay green while the shipped
    tail changes — that story must re-anchor the index semantics.
  - → ✓ ACCEPTED by Reviewer: spawnTie IS the wired seam (sim.ts:479 verified by
    me), the spawnCount plumbing is pre-existing and its wave-reset is
    independently verified (sim.ts:1906), and mutation A proved the seam tests
    bite the shipped path. A 27-kill stepGame harness would add fixture cost, not
    coverage.

### Dev (implementation)
- No deviations from spec. (The context offered "extend `waveSpawnPlan` or add a
  past-plan resolver"; the resolver was chosen — `supplyEntry(spaceWave, spawnIndex)`
  appended to `tie-waves.ts`, a pure append so no cited line in that file shifted.
  `spawnTie` consumes it and both `?? ` fallbacks are gone. This is a choice within
  the spec's own alternatives, not a deviation.)
  - → ✓ ACCEPTED by Reviewer: the resolver choice is within the context's stated
    alternatives; the fallback deletion is the story's own deliverable. (The
    resulting unguarded dereference is handled as review Finding 1, not as an
    undocumented deviation — the spec itself demanded the fallback's removal.)