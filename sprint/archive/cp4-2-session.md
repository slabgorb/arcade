---
story_id: "cp4-2"
jira_key: "cp4-2"
epic: "cp4"
workflow: "tdd"
---
# Story cp4-2: Fragmented train — CENTIN connected segments plus loose extra heads from RNGEN

## Story Details
- **ID:** cp4-2
- **Jira Key:** cp4-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** gitflow (feat/cp4-2-fragmented-train)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-20T20:02:14Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T19:21:45Z | 2026-07-20T19:24:23Z | 2m 38s |
| red | 2026-07-20T19:24:23Z | 2026-07-20T19:44:08Z | 19m 45s |
| green | 2026-07-20T19:44:08Z | 2026-07-20T19:55:25Z | 11m 17s |
| review | 2026-07-20T19:55:25Z | 2026-07-20T20:02:14Z | 6m 49s |
| finish | 2026-07-20T20:02:14Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Improvement** (non-blocking): The new `createCentipede` signature must APPEND its params, not prepend `rng`, or cp4-1's ~20 existing zero-/two-arg call sites all break. The RED suite drives `createCentipede(centis = CENTIS_INIT, frame = 0, centin = NCENT, rng?: Rng)` — `centin` defaults to `NCENT` (today's full connected train, zero draws) and `rng` is last/optional, consumed only when `centin < NCENT`. Affects `src/core/centipede.ts` (the signature) and the three `sim.ts` lay sites (boot :139, death respawn :396, wave-clear :439 — each appends `centin` + `state.rng`/`cadence.centin`). *Found by TEA during test design.*
- **Improvement** (non-blocking): The loose-head `dv=2` is a DISTINCT ROM constant (`CENTI4.MAC:533 "LDA I,2"`) from NEWHD's `dv=2` (`:1671`, CT-82) — same value, different routine and citation. Dev should introduce a new `LOOSE_HEAD_DV = 2` with a CT-98 claim citing `:533`, not reuse `NEWHD_SPAWN_DV`. The loose-head `pic=0x00` MAY reuse `NEWHD_HEAD_PIC` (CT-80, `:1664`) or cite it as corroboration for a new claim on `:531`. Affects `src/core/centipede.ts` + `docs/rom-study/claims/09-centipede-train.json`. *Found by TEA during test design.*
- **Improvement** (non-blocking, THE ordering hazard): once `createCentipede` draws entropy, the death-respawn object literal in `sim.ts` (`:389-418`) must move `segs: createCentipede(...)` BELOW `spider:` and `flea:`, matching the ROM's spider(:641/732 BUGOFF) → flea(:733 ANTPC) → CENTPC(:396) draw order. Leaving `segs:` first steals the spider's/flea's RNGEN bytes on any wave-2+ death. The `fragmented-train.test.ts` ordering test catches a wrong order (its spider/flea reconstruction diverges); a wave-1 death cannot. The wave-clear re-lay (`:448`) has no other rng consumer, so ordering there is a non-issue. Affects `src/core/sim.ts:389-418`. *Found by TEA during test design.*
- **Gap** (non-blocking): The RED suite does NOT pin the `centin < NCENT && rng === undefined` misuse path (a caller bug — all three real sim sites pass `state.rng`). Dev may add a defensive `throw` or make rng required-when-needed; either is fine, neither is tested here. Affects `src/core/centipede.ts`. *Found by TEA during test design.*

### Dev (implementation)

- No new upstream findings during implementation. All four TEA findings were realised as written: the appended-optional-param signature `createCentipede(centis, frame, centin = NCENT, rng?)`; the new `LOOSE_HEAD_DV` (CT-98, `:533`) distinct from NEWHD's `NEWHD_SPAWN_DV` (`:1671`); the `segs`-below-`spider`/`flea` reorder at the death-respawn literal (the ordering regression test now passes GREEN, confirming spider→flea→CENTPC draw order); and both stale scope comments struck (`:20-32` SCOPE and the `stepWaveCadence` SCOPE FENCE). The boot lay site was left `createCentipede(CENTIS_INIT, 0)` unchanged — `centin` defaults to `NCENT` there, a full connected train drawing zero entropy. Added CT-99/CT-100/CT-101 alongside CT-98 for the sign bit (`:538`), HPOS mask (`:543`) and loose-head pic (`:531`). *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): `createCentipede` places NO explicit lower-bound guard on `centin`. `centin` is bounded `[1, NCENT]` in practice (`stepWaveCadence` reloads a `0` decrement to `CENTIN_RELOAD=0x0C`, and `CENTIN_INIT===NCENT`), so it is not a live defect — but a hypothetical `centin===0` would lay `1 + NCENT = 13` segments (head always laid, then a full loose fill). Affects `src/core/centipede.ts` (`createCentipede`) — a future story touching the cadence should keep the `[1,NCENT]` invariant or add a clamp. *Found by Reviewer during code review.*
- **Question** (non-blocking): A loose head's picture is `0x00` and a connected head's is `0x03`; whether the sprite atlas renders them identically is a shell/render question the context explicitly deferred. Affects `src/shell` render path (out of scope for cp4-2) — worth a glance when the attract/render fidelity is revisited. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **createCentipede signature: appended optional params, not the context's suggested rng-first order**
  - Spec source: context-story-cp4-2.md, "RNG plumbing" section
  - Spec text: "Suggested signature: `createCentipede(rng: Rng, centis = CENTIS_INIT, frame = 0, centin = NCENT)`"
  - Implementation: pinned `createCentipede(centis = CENTIS_INIT, frame = 0, centin = NCENT, rng?: Rng)` — `rng` optional and LAST
  - Rationale: rng-first makes `rng` required, breaking cp4-1's ~20 existing zero-/two-arg call sites and blowing AC-4 ("full suite green from baseline"). Appending optional params is the exact convention cp4-1 established and is honest that `rng` is consumed only when `centin < NCENT`. The context itself deferred the exact order to "TEA/Dev during RED design."
  - Severity: minor
  - Forward impact: Dev implements this order; the 3 sim.ts sites append `centin`+`rng`. NOTE FOR REVIEWER: this diverges from the `createSpider`/`createFlea` rng-first factory idiom — a deliberate trade of cross-function consistency for a tight, baseline-green diff. Flagged for the Thought Police to weigh.
- **Edited cp4-1's centis-speed.test.ts (a cross-story test edit)**
  - Spec source: cp4-1's shipped tests — centis-speed.test.ts, the two AC-3 `for (const seg of live)` loops
  - Spec text: cp4-1 asserted every LIVE wave-2 segment marches at CENTIS
  - Implementation: narrowed both loops to the connected block `s.segs.slice(0, s.centin)`; the loose head's own `dv=2` is pinned separately in fragmented-train.test.ts
  - Rationale: cp4-2 changes the wave-2 train shape (adds a loose head at `dv=2`), which breaks cp4-1's blanket "all live @ CENTIS" assertion the moment Dev implements. Narrowing keeps cp4-1 green in BOTH RED (verified) and GREEN, so Dev never has to touch a test. Necessary re-seating (behaviour genuinely changed), not gratuitous.
  - Severity: minor
  - Forward impact: none beyond the two edited assertions; cp4-1's intent (the connected train marches at the cadence CENTIS) is preserved.

### Dev (implementation)

- **Added a defensive throw when the loose-head fill is reached with `rng` undefined**
  - Spec source: context-story-cp4-2.md (Scope) + TEA Delivery Finding (Gap, non-blocking)
  - Spec text: "Dev may add a defensive `throw` or make rng required-when-needed; either is fine, neither is tested here."
  - Implementation: `createCentipede` throws `Error('…a fragmented train (centin < NCENT) needs a seeded rng…')` when `centin < NCENT && rng === undefined`.
  - Rationale: `rng` is optional (to keep cp4-1's ~20 existing call sites arg-compatible), so TypeScript cannot prove it defined at the `rngByte(rng)` call. A throw is the minimal type-narrowing that ALSO fails loudly on caller misuse — preferable to `rng!` (trips lint check #1, non-null assertion on a nullable) or silently laying a short train. All three real sim lay sites pass `state.rng`, so it never fires in practice.
  - Severity: trivial
  - Forward impact: none — a guard on a misuse path only; no test asserts it.

### Reviewer (audit)

- **TEA: appended optional params, not rng-first** → ✓ ACCEPTED by Reviewer: the rng-first idiom (`createSpider`/`createFlea`) would make `rng` required and break ~20 existing zero-/two-arg call sites, violating AC-4 ("full suite green from baseline"). Appending is cp4-1's own established convention on this exact function and is honest that entropy is drawn only when `centin < NCENT`. The cross-function idiom divergence is a reasonable, documented trade — logged below as a LOW observation, not a blocker.
- **TEA: edited cp4-1's centis-speed.test.ts** → ✓ ACCEPTED by Reviewer: verified NOT a loosening. The two loops were narrowed from "every live seg marches at CENTIS" to "the connected block `slice(0, centin)` marches at CENTIS," and the loose head's own `dv=2` is pinned SEPARATELY (and more strictly) in fragmented-train.test.ts. Net coverage increased. Preflight's re-baseline flag is resolved: the connected-train assertion is preserved, not weakened.
- **Dev: defensive throw on `centin < NCENT && rng === undefined`** → ✓ ACCEPTED by Reviewer: the minimal type-narrowing that satisfies TS (`rng` is optional) while failing LOUD on misuse — strictly better than `rng!` (which trips lint check #1) or a silent short train. Unreachable via the three real sim lay sites, which all pass `state.rng`.

## Sm Assessment

**Setup complete. Routing to O'Brien (TEA) for the RED phase.**

**What this story is:** The real difficulty curve, and the harder
(rng-sensitive) half of the scope fence cp4-1 left open. CENTPC
(`CENTI4.MAC:456-554`) always re-lays all 12 motion-object slots on every
call, but only `CENTIN` of them are a connected train (head + bodies,
`:477-524`) — the rest (`CENTIN..NCENT-1`) are LOOSE INDEPENDENT HEADS placed
by two seeded RNGEN reads each (`:527-546`: direction sign via `BIT
RNGEN/BPL/COMP`, then HPOS via `RNGEN AND 0F8`). `DEAD=NCENT` unconditionally
(`:549-551`), so a "short" train still puts 12 objects on screen — wave 2 is
11 connected segments plus one free-roaming head, not a shorter train.
`createCentipede()` currently hardcodes a full 12-segment connected train;
this story makes it read `centin` and place the loose heads.

**Readiness:**
- Session file, story context (`sprint/context/context-story-cp4-2.md`,
  heavily enriched with ASM decoding beyond the auto-generated template —
  see below), and epic context (`context-epic-cp4.md`, already present from
  cp4-1) all in place.
- Branch `feat/cp4-2-fragmented-train` cut off `origin/develop` (centipede is
  gitflow; PR targets `develop`). `origin/develop` already carries cp4-1
  (merged as centipede#26), so this branch starts from the CENTIS-live march.
- Merge gate clear — no open PRs in centipede (`gh pr list` empty).
- No Jira integration on this project (`is_jira_enabled()` is false;
  `jira_key` in frontmatter is just the story id per repo convention).

**Key pointers for TEA (fully detailed in the context file, condensed here):**
- ROM ground truth: `CENTPC` in
  `reference/atari-source/centipede/revision.v4/CENTI4.MAC:456-554` (repo
  root, VENDORED tree only — the `~/Projects/centipede-source` copy is
  off-by-one from line 44). New claims start at **CT-98** in
  `docs/rom-study/claims/09-centipede-train.json` (97 entries already).
- **The loose head's picture byte is `0x00`, NOT `CENT_HEAD_PIC` (0x03)** —
  the exact same idiom already named `NEWHD_HEAD_PIC` (CT-80,
  `centipede.ts:501`, "plain head, not CENTPC's 0x03"). Reuse it; don't
  invent a second constant for the same value.
- **`createCentipede` stops being pure/seed-free** the moment it can place
  loose heads — it needs an `Rng` param, same contract as `createSpider`/
  `createFlea`. This is a bigger contract change than the story description's
  one-line "make it read centin" suggests.
- **Ordering hazard (the big one):** at the death-respawn lay site
  (`sim.ts:387-418`), `segs: createCentipede(...)` is listed BEFORE `spider:`/
  `flea:` in the returned object literal. That's harmless today because
  `createCentipede` draws nothing, but per the ROM's own flow (spider re-park,
  then flea re-park, then CENTPC) the loose-head RNGEN reads must happen
  AFTER spider/flea's draws once threaded — `sim.ts`'s file-header comment
  already warns "adding or reordering a draw shifts every later one." A death
  on wave 1 (`centin===NCENT`, zero RNGEN reads) cannot catch a mistake here;
  the RED suite needs a death forced after at least one wave clear to exercise
  it. Boot and the wave-clear re-lay are NOT at risk (boot draws zero entropy
  because `CENTIN_INIT===NCENT`; wave-clear has no other rng consumer in that
  branch).
- **Two stale comments to strike/update**, not just the one the story names:
  `centipede.ts:162-168` (the story's cited fence) AND `centipede.ts:20-32`
  (an earlier "SCOPE" note that explicitly calls `createCentipede`
  "pure, seed-free" — false after this story).
- `.RADIX 16` — `0F8`/`0x80` are hex; every transcribed constant needs a
  radix-cited comment + a claims entry; `npm test -- citations` stays green.
  The purity guard scans source text including comments — don't name
  `Date.now`/`Math.random` even in a comment.

**Scope fence:** cp4-2 is the FRAGMENTATION half only (both connected-length
AND loose-head placement). Colour walk is cp4-3, cocktail mode (`CKFE`
branch) is explicitly out of scope — transcribe the non-cocktail default (2)
and comment the branch. This story NEEDS cp4-1 landed (it is — `origin/develop`
already has it) so loose heads march at the right CENTIS.

**Watch-out:** the connected-body loop has a `centin===1` edge case
(`:496-497 BEQ 60$`, no body segments at all, straight to the loose-head
fill) that's easy to under-test if the RED suite only exercises the wave-2
`centin===11` case from AC-3.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 3pt fidelity feature — new pure-sim behaviour (loose-head placement), determinism contract, and a rng-cursor ordering hazard. All demand behavioural pins.

**Test Files:**
- `centipede/tests/fragmented-train.test.ts` — NEW. The cp4-2 RED suite (9 `it` blocks across 6 `describe`s): AC-1 fragmentation contract (connected + loose split, pic/dv/dh, the two-RNGEN-read recompute, the 0x80-not-0x04 sign-bit discriminator, `dv=2`≠`centis`), the two CENTPC skip branches (`centin===NCENT` draws zero entropy — pinned on the cursor directly; `centin===1` skips the body loop), AC-2 determinism (same seed identical, different seed differs but replays), AC-3 real wave-clear to `centin=11`, and the death-respawn rng-cursor ordering regression.
- `centipede/tests/centis-speed.test.ts` — EDITED (cp4-1, forward-compat). Two AC-3 loops narrowed to the connected block so the new loose head doesn't break cp4-1's "all live @ CENTIS" pin. Stays green in RED and GREEN.

**Tests Written:** 9 new failing tests covering all 4 ACs (+ ordering hazard). RED verified via `testing-runner` (RUN_ID `cp4-2-tea-red`): 9 failures, ALL genuine assertion mismatches (no import/syntax/ReferenceError); cp4-1's 7 tests green; the other 36 files (678 passing) unchanged from baseline.
**Status:** RED (failing — ready for Dev)

### Rule Coverage

The lang-review `typescript.md` checklist is a Dev self-review list; for a pure deterministic sim function most checks are structurally N/A. Applicable coverage:

| Rule (typescript.md) | Test / disposition | Status |
|------|---------|--------|
| #4 null/undefined (optional `rng?`) | `centin===NCENT` path exercises the no-rng branch and pins the cursor untouched; loose-head paths pass a real rng | failing (feature) |
| #8 test quality (meaningful asserts, no `as any`) | Self-checked: every `it` asserts expected/received; recompute is hand-derived from `nextInt` (self-checking, not an echo); the only casts are legit `as SimState`/`: Rng` narrowings | pass (self-check) |
| Determinism / purity (project's #1 rule) | AC-2 determinism tests + existing `tests/purity.test.ts` (comment-stripping guard) sweeping centipede.ts/sim.ts | covered |
| ROM-fidelity claims / radix / citations | Existing `tests/audit/citations.test.ts` re-runs at GREEN; Dev adds CT-98 (`LOOSE_HEAD_DV`, `:533`) | Dev-owned |
| rng-cursor ordering (replay contract) | The death-respawn ordering regression test (spider→flea→loose-heads) | failing (feature) |
| #1/#2/#3/#5/#6/#7/#9-#13 (as any, generics, enums, modules, JSX, async, security-input, build, error-handling) | N/A — no user input, async, JSX, enums, error paths, or module changes in a pure src/core factory | n/a |

**Rules checked:** 3 of 3 applicable checks have test coverage (plus the two project-critical guards, determinism/purity and rng-ordering).
**Self-check:** 0 vacuous tests — reviewed all 9 blocks; each has a meaningful expected/received assertion, none `assert(true)`/`let _ =`/always-None.

**Handoff:** To Julia (Dev) for GREEN. Implement the appended-optional-param signature, the `LOOSE_HEAD_DV` (CT-98) constant, the loose-head fill (two RNGEN reads in ROM order), thread `centin`+`rng` at all three sim lay sites, and MOVE `segs:` below `spider:`/`flea:` at the death-respawn site. Strike/update both stale scope-fence comments (`:20-32` and `:158-168`).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/centipede.ts` — `createCentipede(centis = CENTIS_INIT, frame = 0, centin = NCENT, rng?: Rng)`: the connected loop now runs to `centin` (head + `centin-1` bodies; `centin===1` skips it), then a loose-head fill lays slots `centin..NCENT-1` with `pic=NEWHD_HEAD_PIC` (0x00), `v=CENT_ENTER_V`, `dv=LOOSE_HEAD_DV` (2), and `dh=±2` — direction from bit 7 of read #1 (`:538`), column from `read #2 & 0xF8` (`:543`), two seeded `rngByte(rng)` draws per head in ROM order. Added `LOOSE_HEAD_DV`/`LOOSE_HEAD_SIGN_BIT`/`LOOSE_HEAD_H_MASK` + the module-local `rngByte`. Struck both stale "pure/seed-free" scope comments. A defensive throw guards the `centin<NCENT && rng===undefined` misuse (see deviation).
- `src/core/sim.ts` — death-respawn re-lay: `segs:` moved BELOW `spider:`/`flea:` and threaded `state.centin`+`state.rng` (ROM order BUGOFF→ANTPC→CENTPC; the ordering test pins it). Wave-clear re-lay: threaded `cadence.centin`+`state.rng` (no reorder — sole rng consumer in that branch). Boot unchanged (`centin` defaults to `NCENT`, zero draws).
- `docs/rom-study/claims/09-centipede-train.json` — CT-98 (`:533` LOOSE_HEAD_DV), CT-99 (`:538` sign bit), CT-100 (`:543` HPOS mask), CT-101 (`:531` loose-head pic). Byte-verified against the vendored tree.
- `tests/fragmented-train.test.ts` — removed an unused `CENT_ENTER_H` import (build/lint cleanliness; no assertion changed).

**Tests:** 687/687 passing (GREEN — was 678 + 9 red). `fragmented-train.test.ts` 11/11, `centis-speed.test.ts` 7/7, `purity.test.ts` 20/20, `citations.test.ts` 26/26. `npm run build` clean, `npm run lint` clean.

**Branch:** feat/cp4-2-fragmented-train (pushed)

**Handoff:** To the Thought Police (Reviewer). Two things worth their eye: (1) the signature diverges from the `createSpider`/`createFlea` rng-first idiom (deliberate — see TEA deviation, chosen for baseline-green over cross-function consistency); (2) the death-respawn object-literal ordering is load-bearing for replay fidelity (`segs` MUST stay below `spider`/`flea`).

## Subagent Results

Only `reviewer-preflight` is enabled (`pf settings get workflow.reviewer_subagents`); the other 8 specialists are disabled via settings. Per the disabled-subagent protocol I assessed each domain DIRECTLY and ran a MUTATION BATTERY (8 mutations) to prove the tests are not vacuous.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells; 687 tests, build/lint/citations all green | N/A — confirmed green; flagged the centis-speed edit for re-baseline check (resolved) |
| 2 | reviewer-edge-hunter | Skipped | disabled | assessed directly | 1 non-blocking (centin=0 unreachable → 13 segs) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | assessed directly | clean — the rng guard is a LOUD throw, no swallowed errors |
| 4 | reviewer-test-analyzer | Skipped | disabled | assessed directly | clean — mutation battery: 8/8 mutations caught; centis-speed edit tightens, not loosens |
| 5 | reviewer-comment-analyzer | Skipped | disabled | assessed directly | clean — ROM citations accurate, both stale scope comments struck |
| 6 | reviewer-type-design | Skipped | disabled | assessed directly | 1 LOW (rng-optional-last idiom divergence, accepted) |
| 7 | reviewer-security | Skipped | disabled | assessed directly | N/A — pure sim, seeded rng, no input/auth/secrets |
| 8 | reviewer-simplifier | Skipped | disabled | assessed directly | clean — 3 cited constants + rngByte mirror siblings; no dead code |
| 9 | reviewer-rule-checker | Skipped | disabled | assessed directly | clean — core/shell boundary + purity + radix/citation all honoured |

**All received:** Yes (1 enabled returned; 8 disabled, each domain assessed directly)
**Total findings:** 0 confirmed blocking, 2 LOW/non-blocking (idiom divergence; centin=0 latent), 2 non-blocking Delivery Findings (centin guard; render pic 0x00 vs 0x03)

## Reviewer Assessment

**Verdict:** APPROVED

**Mutation battery (the decisive check for a relay self-review — 8/8 caught):**
| Mutation | Expected guard | Result |
|----------|----------------|--------|
| sign bit `0x80`→`0x04` (spider's bit) | sign-bit + recompute tests | 2 failed ✓ |
| loose `dv` → `centis` | dv-fixed + integration | 3 failed ✓ |
| HPOS mask `0xf8`→`0xff` | multiple-of-8 + recompute | 2 failed ✓ |
| loose `pic` `0x00`→`0x03` | pic tests | 5 failed ✓ |
| swap the two RNGEN reads | ROM-order recompute | 2 failed ✓ |
| connected bound `centin`→`NCENT` | fragmentation length | 9 failed ✓ |
| **sim.ts: `segs` above `spider`/`flea`** | ordering regression | **1 failed ✓** |
| boot guard `<`→`<=` | centin===NCENT zero-entropy | 2 failed ✓ |

No test survived its mutation — the suite genuinely pins every load-bearing decision, including the subtle rng-cursor ordering hazard.

**Observations (≥5):**
1. [VERIFIED] [EDGE] Loose-head placement is ROM-faithful: sign from bit 7 (`:538`), HPOS `& 0xF8` (`:543`), two reads in order, `dv=2`/`pic=0x00`/`v=0xF8` — `centipede.ts:238-260`. Mutations M1/M3/M5 confirm each is pinned.
2. [VERIFIED] [EDGE] The rng-cursor ordering hazard is closed: death-respawn evaluates `spider`→`flea`→`segs` (`sim.ts:407-416`); M-ORDER (segs-first) reddens the ordering test. The wave-clear branch (`sim.ts:441`) has no other rng consumer, so its ordering is genuinely a non-issue.
3. [VERIFIED] [EDGE] Boot draws zero entropy: the `centin < NCENT` guard (`centipede.ts:243`) skips the fill when `centin===NCENT`; M-GUARD reddens the cursor-unchanged test.
4. [VERIFIED] [TEST] `centis-speed.test.ts` re-baseline is TIGHTER, not looser: the "all live @ CENTIS" loops narrowed to `slice(0, s.centin)` (connected block), and the loose head's `dv=2` is pinned separately and more strictly. Resolves preflight's re-baseline flag.
5. [VERIFIED] [RULE] Core/shell boundary + determinism held: all logic in `src/core`, entropy drawn ONLY from `@arcade/shared/rng` (`rngByte` = `nextInt(rng, 0x100)`), no `Date.now`/`Math.random`; `purity.test.ts` 20/20 green.
6. [VERIFIED] [RULE] Radix/citation discipline: CT-98..CT-101 byte-verify against the vendored tree (`citations.test.ts` 26/26); every transcribed constant carries a radix-cited comment (`0x80`/`0xf8` hex).
7. [VERIFIED] [DOC] Both stale "pure/seed-free" scope comments struck (`:20-32`, the `stepWaveCadence` fence); the death-respawn comment documents the load-bearing ordering. No stale comments remain.
8. [VERIFIED] [SIMPLE] MOTION correctly steps loose heads AS heads: `pic=0x00` has `BODY_BIT` clear → `isHead` → `stepHead` (edge/OBSTAC/dive); no false leader-follow, since every slot `≥ centin` is itself a head. No over-engineering; the `throw`/constants/helper are all minimal and mirror `spider.ts`/`flea.ts`.
9. [LOW] [TYPE] `rng?: Rng` optional-last diverges from the `createSpider`/`createFlea` rng-first idiom — `centipede.ts:196-201`. Accepted trade for baseline-green (AC-4); documented deviation.
10. [LOW] [EDGE] `centin===0` (unreachable — `stepWaveCadence` reloads `0`→`0x0C`) would lay 13 segments. Latent, not a live defect. `centipede.ts:213/243`.
11. [N/A] [SEC] No security surface: pure deterministic sim, seeded (non-crypto) rng, no user input, auth, secrets, or I/O.
12. [VERIFIED] [SILENT] No swallowed errors — the single `throw` on `centin<NCENT && rng===undefined` is a loud, explicit guard.

### Rule Compliance

lang-review `typescript.md` (no `.claude/rules`/`SOUL.md` in centipede; CLAUDE.md core/shell boundary applies):
- **#4 null/undefined**: `rng?` optional is narrowed by an explicit `throw` before use — compliant, no `||`/`??` footgun.
- **#8 test quality**: mutation-proven non-vacuous; no `as any` in tests; casts are legit `as SimState`/`: Rng` narrowings.
- **#1 type-safety escapes**: no `as any`, no `@ts-ignore`, no `!` non-null assertions (the `throw` was chosen precisely to avoid `rng!`).
- **Core/shell boundary (CLAUDE.md)**: all changes in `src/core`; purity guard green.
- **Radix/citation (epic rule)**: CT-98..CT-101 byte-verified; radix-cited comments present.
- **#3/#5/#6/#7/#10/#11/#12 (enums/modules/JSX/async/security-input/error-handling/perf)**: N/A — no such constructs in a pure factory.

### Devil's Advocate

Assume this is broken. The strongest attack is the rng-cursor aliasing: the death and wave-clear re-lays call `createCentipede(..., state.rng)`, which MUTATES the caller's `state.rng` object in place (the returned state's `rng` is the same reference). A caller that retains the pre-step state and replays it WITHOUT `cloneState` would see a corrupted, over-advanced cursor and silently diverge. But this is not new: `createSpider(state.rng, …)`/`createFlea(state.rng, …)` at the very same death-respawn site already mutate `state.rng` identically, and `cloneState` (which copies the seed word into a distinct object) is the established replay contract that the whole sim depends on. cp4-2 adds a fourth consumer to a pattern three consumers already followed — no regression. Second attack: `centin===0` yields 13 segments (the head is unconditionally laid, then a full 12-slot loose fill). Real, but `stepWaveCadence` reloads a zero decrement to `0x0C` and `CENTIN_INIT===NCENT`, so `centin` is provably `[1,12]` at all three call sites; unreachable, logged as a Delivery Finding. Third: does MOTION mishandle a fragmented train — a loose head mistaken for a body's leader, or a "gap" between connected and loose blocks? No: loose heads carry `pic=0x00` (`BODY_BIT` clear → `isHead` → `stepHead`), and every slot at index `≥ centin` is itself a head, so `stepBody`'s `segs[i-1]` leader lookup never targets a loose head as a follower's leader. Fourth: a confused reader might think the loose head inherits `centis`; the code and the `dv-fixed` test (mutation M2) both forbid it. Fifth: could the ordering "fix" be a no-op that the test can't detect? M-ORDER proves otherwise — physically moving `segs` above `spider`/`flea` reddens exactly one test. Nothing survives. The only residue is stylistic (rng-last idiom) and an unreachable degenerate input — both LOW, neither blocking.

**Data flow traced:** seeded `state.rng` (shell-seeded) → `createCentipede(…, state.rng)` at the wave-clear/death re-lay → `rngByte` two draws per loose head → `Segment[]` → `stepCentipede`/render. Safe because the sole entropy source is the seeded rng and `cloneState` isolates replays.

**Pattern observed:** module-local `rngByte` + cited magnitude constants, mirroring `spider.ts:161`/`flea.ts:145` — `centipede.ts:186-192`.
**Error handling:** loud `throw` on the misuse path (`centipede.ts:244`); no silent fallbacks.

[EDGE] [SILENT] [TEST] [DOC] [TYPE] [SEC] [SIMPLE] [RULE] — all domains assessed (subagents disabled; direct + mutation battery).

**Handoff:** To Winston Smith (SM) for finish-story.