---
story_id: "jt9-40"
jira_key: "jt9-40"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-40: The egg wave's TWO pre-mature hatchings — PWHCH shortens two of the twelve eggs' waits by a VRAND draw

## Story Details
- **ID:** jt9-40
- **Jira Key:** jt9-40
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none (stack root)
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch `main`)
- **Branch:** none
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-04T10:28:02Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-04T09:37:16Z | 2026-08-04T09:40:36Z | 3m 20s |
| red | 2026-08-04T09:40:36Z | 2026-08-04T10:06:41Z | 26m 5s |
| green | 2026-08-04T10:06:41Z | 2026-08-04T10:15:19Z | 8m 38s |
| review | 2026-08-04T10:15:19Z | 2026-08-04T10:28:02Z | 12m 43s |
| finish | 2026-08-04T10:28:02Z | - | - |

## Sm Assessment

**Story:** jt9-40 — 3pt, tdd, p3, repo `arcade`. Filed by jt9-38 on 2026-08-03 as that
story's AC-6 descope, so this is a planned continuation, not a new discovery.

**What is being routed.** PWHCH is the third unmodelled piece of the WAVEGG block whose other
two pieces (the twelve-egg density and the NENEMY/WENEMY population gate) shipped in jt9-38.
The ROM loads `LDA #2 / STA PWHCH,U` at JOUSTRV4.SRC:2776-2777 and consumes it inside CREGG at
:2886-2894, shortening the first N eggs' hatch waits by a VRAND draw.

**The one thing TEA must not take on trust: N.** This filing's own history contains BOTH
numbers. SM's first draft asserted THREE "despite the comment saying two"; the correction says
TWO; and the description as committed *still* carries a stale sentence — "With PWHCH the first
three would arrive earlier" — that contradicts the TWO in its own title and body. Whichever
number is right, the story text is internally inconsistent, so transcribing from it cannot be
trusted in either direction. The context file tells TEA to re-run the DEC/BMI trace against
JOUSTRV4.SRC:2888-2894 and derive N. That is the RED phase's first job, before any fixture.

**Prior-story handoff, not just prior-story prose.** `sprint/archive/jt9-38-session.md` measured
the baseline this story exists to break up: all twelve wave-5 eggs mature on the SAME frame,
f=624, at seeds 0x1234/0xbeef/0x2468. That is the before-picture any staggering test asserts
against, and it is already measured — TEA should not re-derive it, only confirm it still holds.

**Determinism is stated as MEASURE, not budget.** The shortening consumes the seeded RNG, so a
re-baseline is plausible and must land as its own commit per this epic's standing rule. But
jt9-38 predicted a re-baseline and had none: natural seeded play reaches only wave 1-2 in 3000
frames while the first egg wave is wave 5. Check whether any fixture reaches an egg wave at all
before assuming the pins move.

**Setup mechanics.** No Jira (repo policy) — claim/move steps correctly skipped. Trunk-based per
`repos.yaml`, so no branch: work commits straight to `main`. Local checkout was 5 commits behind
`origin/main` at activation (sibling checkouts are live on cp7-1 and sw8-27); rebased before
setup and pushed the claim, so the race window is closed as of e7f28ee.

**Unrelated uncommitted change left alone:** `.gitignore` carries a working-tree edit removing
the `/arcade-shared/` rule. That directory no longer exists in this checkout, so the edit is a
legitimate teardown cleanup, but it is not this story's and was deliberately excluded from the
claim commit.

**Routing:** workflow `tdd` (phased) → next phase `red`, owner `tea`.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED — 9 failing, every one inside this story's two new files.

**Test Files:**
- `plugins/joust/tests/demo-jt9-40.test.ts` — the behaviour: the shortening function on synthetic
  (wait, draw) pairs, which two eggs it reaches, that a kill-egg is never one of them, the draw
  swept over 32 seeds, and the pile-up actually breaking up in play.
- `plugins/joust/tests/demo-jt9-40-source.test.ts` — provenance, and the DERIVATION of the count.

**Also changed:** `plugins/joust/README.md` — the `--project joust` file count 110 → 112. It is a
DERIVED number guarded by `audio-seam-scope.test.ts`, adding two test files moved it, and the
guard fired correctly. Re-measured rather than incremented (`find` over the tree and vitest's own
`Test Files (112)` line agree); `npx vitest list --filesOnly | grep -c` said 110 and was wrong.

**Gates:** `--project joust` 9 failed / 2648 passed (2657, 112 files) · `npm run test:orchestrator`
390/390 · `npm run lint` clean.

### THE COUNT — re-derived, not transcribed, and it is TWO

The story's own filing states it both ways (SM's draft said THREE; the correction says TWO; the
committed description still carries "With PWHCH the first three would arrive earlier", which
contradicts its own title). So the count was not taken from the story in either direction.

Walked at the source: `PWHCH` is primed with 2 (JOUSTRV4.SRC:2776-2777) and CREGG runs
`DEC PWHCH,U / BMI 20$` once per egg (JOUSTRV4.SRC:2888-2889). `DEC` sets N from bit 7 of the
RESULT and `BMI` branches only when that is set, so the decrement to 1 shortens, the decrement to 0
shortens, and the decrement to $FF is the first one skipped. **TWO.** The 1982 comment was right and
the re-derivation that overrode it was wrong.

That conclusion is not asserted in the suite, it is EXECUTED: `demo-jt9-40-source.test.ts` parses
the immediate, the read-modify-write mnemonic, the branch mnemonic and the number of CREGG calls
out of the source and simulates the loop, with a control that feeds the same executor a fabricated
immediate (3 → three, 0 → none, 20 → saturates at twelve). A byte-exact pin on `LDA #2` would have
agreed with the "three" reading, because that reading never disputed the immediate.

### WHAT THE MECHANISM IS, beyond the count

`LDB PEGGTM,U` (:2886) is still in B when the `MUL` runs (:2891) — enumerated, nothing between them
defines B — so the reduction is the HIGH byte of `VRAND × PEGGTM`, i.e. `(draw * wait) >> 8`, and
`NEGA / ADDA PJOYT,Y` subtracts it. With the draw capped at 127 that is why the ROM's own comment
says "1/2 OF THE RANGE": **a pre-mature egg is early, never instant, and its wait can never fall to
half.** The 0-127 cap is corroborated twice from code rather than from its own comment — the `ROLA`
at :2795 needed to reach "0 TO 255", and the `#6*2` ledge select at :2782-2784 which would index
past a six-entry table if the draw reached 255.

### MEASURED AT RED

- `advanceTo(5)` + one step, seeds 0x1234/0xbeef/0x2468: twelve eggs, ids 0x500..0x50b in deal
  order, `waitFrames` undefined at spawn, all twelve reading **623** after one step. One value, no
  stagger.
- Stepped on: six hatch together and six defer on jt9-38's quota. The maturity frame is **628**,
  i.e. spawn(4) + the 624-frame EGGWT2 wait — see the Delivery Finding on jt9-38's comment.
- Natural seeded play reaches only wave 1 (wave 2 on 0x2468) in 3000 frames, so **no naturally-
  seeded fixture reaches an egg wave at all**. See the re-baseline note below.
- Egg waves reachable by forced advance: counters 5, 20, 25, 35, 40, 50, 55, 65, 70, 80, 85, 100.

### THE RE-BASELINE, measured rather than budgeted

The story said to check before assuming. Checked: no fixture reaches an egg wave under natural
seeded play, so the RNG this story consumes cannot shift a naturally-seeded pin. What CAN shift is
any fixture that FORCE-advances **through** an egg wave (the `advanceTo` idiom) and then depends on
a later draw — this suite does, and so does `demo-jt9-38.test.ts`. Nothing in the tree reddened at
RED, but Dev should re-run the full project after GREEN and, if anything moves, land the re-baseline
as its own commit per the epic's standing rule.

### The seam I am asking Dev for

`demo.ts` must export `prematureHatchWait(wait, draw)` — pure, `wait - ((draw * wait) >> 8)`. It is
the only way the mechanism can be pinned on fabricated inputs, and no seeded run can separate it
from half a dozen plausible mis-readings (`wait - draw`, a `>> 7`, a constant half). WHERE the draw
is taken is deliberately left open: at the deal (the ROM's own place, inside CREGG) or at the first
lazy resolve in the hatch pass. Both are deterministic and every test reads the wait after one step,
which is observable either way. Taking it at the deal must not re-open the hundredth-wave crash
jt9-38's AC-4 found — `spawnWaveEggs` holds the raw BCD counter and `waveValue` throws on `0x00`,
so store the DRAW there and resolve the multiply where the ordinal is known.

### Rule Coverage

The repo ships no `.pennyfarthing/gates/lang-review/typescript.md` and no `.claude/rules/` or
`SOUL.md`; the enforced rules here are the plugin's own, checked in the source companion.

| Rule | Test | Status |
|------|------|--------|
| core is pure — no clock, no ambient entropy | `demo.ts stays inside the pure core` | passing (guard) |
| no `as any`, no `@ts-ignore` in core | same test | passing (guard) |
| relative imports carry `.js` (checklist rule 5) | `carries the .js extension on every relative import` | passing (guard) |
| new ROM citations ride the dossier gate | `claims cover every cited range` | **failing** |
| README's derived counts stay derived | `the suite FILE count matches what vitest discovers` | passing (fixed in RED) |

**Self-check:** every test carries a value assertion; no `let _ =`, no `assert(true)`, no
`is_none()`-shaped vacuity. Two tests were caught DURING red as bounds a do-nothing implementation
satisfies (`<= 2` is satisfied by 0) and were rewritten to carry a restrictive count over a sweep —
both now red. Four tests are deliberate regression GUARDS that cannot red before the feature exists
(AC-2's control, AC-3's two kill-egg tests, AC-4's per-seed bounds); each is discriminating AFTER
green and names the mutant it kills.

**Handoff:** To Bicycle Repair Man for GREEN.

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 2657/2657 on `--project joust` (GREEN, up from 2648 with 9 red). No test outside this
story's two files changed status.
**Branch:** none — trunk-based, committed straight to `main` (`f9e463f`, sidecar `afcd7df`).

**Files Changed:**
- `plugins/joust/src/core/demo.ts` — `prematureHatchWait`, the `PRE_MATURE_HATCHINGS` count, the
  `prematureHatch` process tag, the mark in `spawnWaveEggs`, the draw in the hatch pass, and the
  rng threaded through to `sim.rng` and the wave-advance spawn.
- `plugins/joust/docs/rom-study/claims/egg-wait.json` — ten `JT940-*` claims.
- `plugins/joust/README.md` — the claim count 949 → 959, at both sites that state it.

### The one design decision, and it is a split the ROM does not make

CREGG picks WHICH egg gets a shortened wait and computes the shortened VALUE at the same
instruction. The port cannot: `spawnWaveEggs` knows the deal order but holds the raw WAVBCD
counter, and resolving a wait from that counter mis-reads the tenth wave and throws outright on
the hundredth — the crash jt9-38's AC-4 found. So the mark (`prematureHatch`, a boolean carrying
no amount) is set at the deal, where the ROM spends the counter, and the draw is taken at the hop
jt9-9 already resolves the wait from, where the decimal ordinal exists. Each half sits where the
fact it needs is available. TEA left this open and named the rollover hazard; this is the reading
that avoids it.

### The draw genuinely consumes the run's stream

`draw()` off the run's own rng, threaded through the hatch pass into `sim.rng`. Not a private
generator: the ROM's `JSR VRAND` moves the shared sequence, so every later draw in the run shifts,
and that consumption is the behaviour rather than an implementation detail. The wave-advance spawn
below now reads the threaded word instead of the pre-hatch one — the two cannot differ today (a
wave is clearable only when no eggs remain, a draw happens only while twelve sit there), which is
said in the comment so the choice reads as made rather than missed.

### The re-baseline the story budgeted for did not happen — measured, not assumed

TEA measured that natural seeded play reaches only wave 1 (wave 2 on one seed) in 3000 frames while
the first egg wave is wave 5, so no naturally-seeded fixture reaches an egg wave and none of this
story's RNG consumption can move one. Confirmed at GREEN: the project went 2648 passing → 2657
passing with nothing re-baselined, no fixture edited, and no separate re-baseline commit. The
epic's standing rule was ready to be honoured and had nothing to honour.

### jt9-38's f=624 comment, corrected in place

The hatch-pass comment read "they all mature on the SAME frame (measured: f=624 on three seeds)".
624 is the EGGWT2 WAIT; under the forced-advance harness, which enters wave 5 at frame 4, the
maturity frame is 628. Rewritten with the harness named and the duration/frame distinction made,
per TEA's Delivery Finding — a frame number with no harness is under-specified either way.

### Gates

| Gate | Result |
|------|--------|
| `npx vitest run --project joust` | **112 files, 2657/2657** |
| `node plugins/joust/tools/audit/check-citations.mjs` | **checked 959 claim(s), all claims verified** |
| `npm run lint` | **RED — 5 errors, all `plugins/centipede/tests/picture-flip-bits.test.ts`, zero in joust** |
| `npm run test:orchestrator` | **389/390 — the one failure is `tsc --noEmit exits 0`, the same five centipede errors** |

Both red gates are a sibling checkout's in-flight RED (`b039b64 test(cp7-1): RED`, story `cp7-1`
`in_progress`), which landed on `main` between this story's setup and its GREEN. Attributed with
`git log --oneline -3 -- <file>`; nothing in this story's diff contributes an error. See the
Delivery Finding.

**Handoff:** To Mr. Praline for verify.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (mechanical data only) | N/A — data confirmed independently |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | N/A | Disabled via settings — domain covered by the mutation battery below |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | N/A | Disabled via settings — assessed by hand (F3, V4) |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | N/A | Disabled via settings — replaced by the 9-mutant battery |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | N/A | Disabled via settings — assessed by hand, and it is where F2 came from |
| 6 | reviewer-type-design | Yes | Skipped | disabled | N/A | Disabled via settings — assessed by hand (V5) |
| 7 | reviewer-security | Yes | Skipped | disabled | N/A | Disabled via settings — no untrusted input in a pure core |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | N/A | Disabled via settings — assessed by hand (V6) |
| 9 | reviewer-rule-checker | Yes | Skipped | disabled | N/A | Disabled via settings — checklist walked by hand, see Rule Compliance |

**All received:** Yes (1 ran, 8 disabled via `workflow.reviewer_subagents`)
**Total findings:** 2 confirmed (both FIXED in this phase), 1 dismissed with measurement, 0 deferred

Eight of nine specialists are disabled in this repo's settings, so a subagent sweep would have
produced almost nothing. **A MUTATION BATTERY was run instead** — nine line-preserving mutants of
`demo.ts`, each a complete replacement unit so the next reader can re-run the string rather than
reconstruct the intent (checklist #23).

### Mutation battery

Baseline before the review's own fixes: 2657 passing.

| # | Mutant (complete replacement unit) | Red | Verdict |
|---|-----------------------------------|-----|---------|
| M1 | `    rng: stepped.rng,` for `    rng,` in the returned `DemoSim` | **0** | **SURVIVED → finding F1** |
| M2 | `const PRE_MATURE_HATCHINGS = 3` | 7 | killed |
| M3 | `const PRE_MATURE_HATCHINGS = 1` | 3 | killed |
| M4 | `  return wait - ((draw * wait) >> 7)` | 5 | killed |
| M5 | `const vrandFrom = (value: number): number => Math.floor(value * 256)` | 2 | killed |
| M6 | `      ...(i >= 12 - PRE_MATURE_HATCHINGS ? { prematureHatch: true } : {}),` | 7 | killed |
| M7 | `    if (false) return base` for the eligibility guard | 23 | killed |
| M8 | `    const arrivals = spawnWaveEnemies(wave, stepped.rng)` | **0** | SURVIVED → dismissed, see D1 |
| M9 | `  return wait - 100` | 5 | killed |

All 23 of M7's reds are BEHAVIOURAL, not apparatus (checklist #23): 9 in this story's suite, 7 in
`demo-jt9-9.test.ts` (kill-egg waits move), and 7 seeded-fingerprint tests in `audio-events`,
`audio-thud`, `audio-transporter-split` and `dumb-wingbeat`. No citation or source-text test is
among them. That last group is worth its own note — see V3.

After F1's fix, **M1 reddens exactly 1 test** (the new guard) and M8 still survives.

## Reviewer Assessment

**Verdict:** APPROVED

Two findings, both confirmed and both FIXED in this phase rather than bounced — they are a missing
guard and a false prose claim, and a REJECT cycle buys nothing a commit here does not.

### Findings

**F1 [MEDIUM] The story's central claim — that PWHCH consumes the run's RNG stream — was
completely unguarded.** `plugins/joust/src/core/demo.ts:1750`. Measured: M1 above, replacing the
threaded `rng` with `stepped.rng` in the returned sim, left **all 2657 tests green**. Under that
mutant both draws still happen and both waits are still shortened correctly — the local advances
either way — but the run's durable word is thrown away, so every later draw in the run sits exactly
where it would have without PWHCH. That is not what `JSR VRAND` (JOUSTRV4.SRC:2890) does, and the
consumption is the *stated reason this story exists separately from jt9-38* ("it draws from VRAND,
so it moves the re-baseline a second time"). Every other test in the file reads a WAIT, and a wait
cannot see the difference.

The naive fix would be vacuous: `stepFrame` advances the rng every frame regardless, so "did the
rng move?" is true of any frame at all. **FIXED** by a twin comparison — the twelve eggs as the
wave dealt them against the same twelve rebuilt through a field whitelist that drops whatever tag
the deal added, stepped one frame, asserting the two runs' `sim.rng` DIFFER, with a uniform-waits
control on the twin and a replay check against nondeterminism. Re-measured: M1 now reddens exactly
that one test.

**F2 [MEDIUM] A false ROM claim shipped in three places, byte-green.** RED and GREEN both asserted
that JOUSTRV4.SRC:160's declaration comment ("IF >0 A PRE-MATURE HATCHING EGG TO BE CREATED") is
LOOSER than the DEC/BMI rule, and offered as evidence "so a cell holding 1 still buys a
shortening". **A cell holding 1 IS >0** — that example is agreement, not looseness, so the
supporting claim contradicted the conclusion it was supporting.

Enumerated over all 256 byte values at review: read as the SIGNED comparison `BMI` actually
performs, `v > 0` is true exactly when `v - 1` is non-negative, so the comment and the code agree
on every value PWHCH reaches (2, 1, 0, $FF, $FE …) and disagree only at $80, which a counter that
decrements from 2 cannot hold. They part company only under an UNSIGNED reading, where $FF is 255
— which is a fact about the reading, not a looseness in Williams's comment.

It shipped green because nothing checked it: the source test PINNED the byte-exact line, and the
"looser" claim lived only in the test's NAME and the file header, where no assertion reaches. A
test whose name claims more than its body checks is the same unguarded-prose failure as a false
comment, wearing a green tick.

Sites, all **FIXED**: `demo.ts`'s `PRE_MATURE_HATCHINGS` docblock; `JT940-001` in
`docs/rom-study/claims/egg-wait.json`; and `demo-jt9-40-source.test.ts`'s header and its
`:160` test — which is now rewritten to EXECUTE the comparison (both readings, over all 256
values, plus the twelve the counter actually walks) instead of asserting it in a title.

And the shape of it is worth recording: this story opened by establishing that a 1982 comment was
right and the modern re-derivation wrong — then impugned a SECOND 1982 comment on an argument that
did not hold. The same failure, one file over, inside the story that diagnosed it.

### Dismissed

**D1 [LOW] M8 survives — the wave-advance spawn's rng argument is untested.** Dismissed: Dev's
comment at `demo.ts:1702-1706` already states this is unobservable and says why (a wave is
clearable only when no eggs remain in it; a draw happens only while twelve are sitting there), and
the battery now measures what that comment argued. Checklist #23's "a survivor is a question about
the MUTANT first" applies exactly — this mutant is equivalent by construction, and no test can
catch it. Not a coverage gap.

### Verified

- **[VERIFIED] The rollover crash is not re-opened.** jt9-38's AC-4 found that any wave lookup
  keyed on the BCD counter throws at `0x00`. Probed directly: a wave egg with an UNSEEDED wait and
  `prematureHatch` set, staged at counter `0x00`, does not throw — and neither does the same
  fixture without the mark, so the baseline is unchanged. Evidence: `demo.ts:1571-1577`,
  `seedEggWait` reaches `eggWaitFrames(row, waveOrdinal)` on exactly the path the pre-jt9-40 line
  did; the draw is added AFTER that call, not before it. This is the hazard TEA named in the
  handoff and Dev's split was designed around.
- **[VERIFIED] A shortened wait can never reach zero or go negative.** `demo.ts:701` returns
  `wait - ((draw * wait) >> 8)` with the draw capped at 127 by `vrandFrom`. Swept every draw
  against the SHORTEST wait the game can produce (`eggWaitFrames('EGGWT2', 99)` = 96): the minimum
  is 49. An egg cannot hatch on the frame it is dealt.
- **[VERIFIED] V3 — the "no re-baseline" claim is corroborated by a guard that would have caught
  one.** `audio-events.test.ts`'s "the sim fingerprint is unchanged by the event channel — rng
  UNMOVED through four re-baselines" pins the rng at seed 0xbeef over 2400 frames. It stayed green
  through this change (because natural play never reaches wave 5) and it REDDENS under M7. So the
  absence of a re-baseline is a measured negative from a live guard, not merely nothing happening.
- **[VERIFIED] V4 — the draw is spent exactly once per egg, and a deferral does not re-draw.**
  `demo.ts:1587` calls `seedEggWait` only through `p.egg.waitFrames ?? …`, and every branch below
  writes a NUMBER back (`remaining` at :1590, `EGG_WAIT_NAP_FRAMES` at :1612), so the nullish
  fallback can never fire twice for one egg. A deferred pre-mature egg keeps its tag and never
  re-enters the draw.
- **[VERIFIED] V5 — the new field does not widen an invariant.** `prematureHatch?: boolean` on
  `DemoProcess` (`demo.ts:166-180`) is optional and read in exactly one place, through a
  `!== true` test, so `undefined` and `false` behave identically and no consumer can be surprised
  by absence. It is deliberately NOT mirrored into `tests/helpers/demo-contract.ts`, which is
  correct under this repo's own history: an unused mirrored field is how that contract drifted
  before (`waitFrames`, jt9-38).
- **[VERIFIED] V6 — no silent failure and no swallowed error on the new path.** `seedEggWait` has
  no try/catch, no `||` fallback and no default that could mask a bad wave (checklist #4, #11);
  an unresolvable wave still throws out of `eggWaitFrames` exactly as it did before this story.
- **[VERIFIED] V7 — the dossier claims are byte-verified AND their prose was read.** The checker
  reports 959 claims, all verified; but it "verifies SOURCE and VERBATIM only — it never reads
  claim prose" (the claims README's own words), so all ten JT940-* claims were read against their
  lines by hand. Nine were sound; the tenth is F2.

### Rule Compliance — `.pennyfarthing/gates/lang-review/typescript.md`

| # | Check | Applies | Result |
|---|-------|---------|--------|
| 1 | Type-safety escapes (`any`, `as`, `@ts-ignore`) | yes | PASS — none added; the source companion asserts their absence in `demo.ts` |
| 2 | Generic/interface pitfalls | no | no generics added |
| 3 | Enum anti-patterns | no | no enums |
| 4 | Null/undefined handling (`\|\|` vs `??`) | yes | PASS — `p.egg.waitFrames ?? seedEggWait(p)` is `??`, correct: a wait of 0 is unreachable but `??` is right regardless; `prematureHatch !== true` handles `undefined` and `false` identically |
| 5 | Module/declaration issues (`.js` on relative imports) | yes | PASS — asserted by the source companion; `draw` added to an existing `./frame.js` import |
| 6 | React/JSX | no | no .tsx |
| 7 | Async/Promise | no | all pure sync |
| 8 | Test quality | yes | PASS after F1 — every new assertion carries a value; the two bound-only tests TEA caught in RED were already rewritten with restrictive counts |
| 9 | Build/config | no | untouched |
| 10 | Type-level input validation | no | pure core, no external input |
| 11 | Error handling | yes | PASS — V6 |
| 12 | Performance/bundle | yes | PASS — two extra draws per egg wave; the `{ ...stepped, rng }` spread copies references only |
| 13 | Fix-introduced regressions | yes | PASS — the F1 and F2 fixes were re-measured, full suite green, M1 re-run |
| 14 | Derived edges inside one branch | yes | PASS — `seedEggWait` is called on one path and every branch below writes a number back (V4) |
| 15 | Source-text assertions matching a TOKEN not the CLAIM | yes | **This is F2.** The `:160` test matched a byte-exact line while its NAME asserted something the body never checked. Fixed by executing the claim |
| 16 | Accessible names | no | no UI |
| 17 | Comments asserting a mechanism nobody re-ran | yes | **This is F2 again**, from the comment side — and it caught jt9-38's `f=624` too, which Dev corrected |
| 18 | Test apparatus that fails by PASSING | yes | PASS — the new F1 guard carries a uniform-waits control on its twin, so it cannot pass by the twin being broken |
| 19 | Population filtered by a neighbouring field | yes | PASS — AC-4's sweep asserts the TEN are identical per seed, so the population under test cannot silently empty |
| 20 | A quantity measured from an artifact the SAME diff changes | yes | **CAUGHT ONE** — the README's `~2657 tests` was taken before this review added a test. Re-measured last and corrected to 2658; the file count (112) and claim count (959) were re-run at the same moment |
| 21 | Degenerate-but-not-nullish numeric input | yes | PASS — a draw of 0 is the degenerate case and is explicitly the first synthetic pin; the sweep tests are built to survive it |
| 22 | REJECT-style rewrite inverting NaN safety | no | no predicate inverted |
| 23 | A recorded MUTANT that cannot be re-run | yes | PASS — battery published as complete, line-preserving replacement units; behavioural vs apparatus red separated; M8's survival diagnosed as equivalent-by-construction |
| 24 | A retirement applied only where the AC named it | no | nothing retired |
| 25 | Source-text guard scoped to the whole file | yes | PASS — the `20$` label search is bounded to CREGG's own line span (:2863-2905), not the file |
| 26 | An assertion whose terms are ALL local to the test | yes | PASS — AC-1's expectations are literals, not a re-implementation of the formula; the source derivation reads its operands out of the vendored file |

### Devil's Advocate

Suppose this code is broken. Where would it hide?

The strongest case against it is that the whole feature is invisible in ordinary play and therefore
untested where it matters. Natural seeded play reaches wave 1-2 in 3000 frames; the first egg wave
is wave 5. Every behavioural test in this story reaches wave 5 through a FORCED advance that strips
the arena each frame — an artificial path no player takes. So the entire mechanism is validated
only under a harness, and a defect that appears only when a real player is present (a knight
standing on a pad collecting a pre-mature egg before its draw resolves; a remount bird from an
early hatch jousting somebody 300 frames before the bulk) is outside every fixture. I probed the
first of those — the draw resolves on the very frame after the deal, before any player can reach an
egg, so collection cannot race it — but the second is genuinely unexercised. It is also
pre-existing: jt9-38's twelve-egg wave already had that property and this story only staggers it.

The second case is the one F1 became. A reviewer who accepted "the tests are green, the waits are
right" would have shipped a version that computed the draw and dropped it, and the story's own
descope rationale would have been false in the tree. That is exactly the failure mode that survives
a wait-shaped test suite, and only a mutant found it.

A confused reader is the third risk, and F2 is the evidence that it is real: this diff shipped a
sentence telling future readers that a correct 1982 comment was wrong. Someone acting on it would
"fix" the ROM's declaration in a later transcription. Prose in this repo is load-bearing and
unguarded, and the fix was to make the claim executable rather than to reword it.

What about a hostile input? There is none — `demo.ts` is pure core with no I/O, no user string and
no deserialisation, so injection, auth and tenancy do not apply. The nearest thing to hostile input
is a wave counter the difficulty engine cannot resolve, and that path is unchanged and probed.

What I could not close: `prematureHatchWait` is exported and unguarded against absurd arguments —
`prematureHatchWait(2 ** 30, 127)` overflows the `>> 8` into int32 nonsense. No caller can produce
that (waits top out at 1128) and adding a clamp the ROM does not have would be worse, so it stays.
Recorded rather than fixed.

### Deviation Audit

TEA logged 4 deviations, Dev logged 4. All 8 reviewed:

- **TEA: requires a named new export `prematureHatchWait`** → ✓ ACCEPTED. It is what made M4, M5
  and M9 killable; without a callable function the arithmetic is unreachable from a test.
- **TEA: requires dossier claims the ACs never mention** → ✓ ACCEPTED, and it earned its keep —
  reading those ten claims against their lines is what surfaced F2.
- **TEA: three assertions are sweep aggregates, not per-seed expectations** → ✓ ACCEPTED. The zero
  draw is real (checklist #21) and the expected rate is stated in each comment rather than tuned.
- **TEA: edited `plugins/joust/README.md`, outside the named touch points** → ✓ ACCEPTED, forced by
  a derived-count guard. Note it needed doing a second time this phase (checklist #20).
- **Dev: split the pre-mature MARK from the pre-mature DRAW across two hops** → ✓ ACCEPTED, and it
  is the right call rather than a concession: probed at the rolled counter, the alternative
  re-opens jt9-38's AC-4 crash. The forward impact (the draw lands one frame later than the machine
  takes it) is correctly stated.
- **Dev: added `prematureHatch?: boolean` to `DemoProcess`** → ✓ ACCEPTED, see V5.
- **Dev: changed the wave-advance spawn's rng argument with no test requiring it** → ✓ ACCEPTED,
  and now measured: M8 confirms it is unobservable, which is what the deviation claimed.
- **Dev: corrected a comment from a previous story (jt9-38's `f=624`)** → ✓ ACCEPTED. Correct under
  the repo's fix-prose-in-place rule, and independently confirmed: the wait is 624, the maturity
  frame is 628 under the forced-advance harness.

No undocumented deviations found.

### Gates at review

| Gate | Result |
|------|--------|
| `npx vitest run --project joust` | **112 files, 2658/2658** |
| `node plugins/joust/tools/audit/check-citations.mjs` | **checked 959 claim(s), all claims verified** |
| `npm run lint` | 5 errors, all `plugins/centipede/tests/picture-flip-bits.test.ts` |
| `npm run test:orchestrator` | 389/390, the one failure being that same tsc check |

Both red gates are `cp7-1`'s in-flight RED (`b039b64`), independently attributed by preflight with
`git log --oneline -3 -- <file>` — zero errors in any jt9-40 file. That story is `in_progress` and
owns the fix; jt9-40 does not block on it, but **nothing in this repo can be RELEASED until it
lands**, since CI runs `npm run lint` before every deploy. Recorded as a Delivery Finding by Dev.

**Handoff:** To The Announcer for finish.

## Impact Summary

Five Delivery Findings, all non-blocking. Two were resolved inside the story, two are recorded with
no forward action, and one belongs to a different story that already owns it. **Nothing is left
unowned.**

| # | Author | Type | Finding | Disposition at finish |
|---|--------|------|---------|----------------------|
| 1 | Dev | Conflict | Repo-wide `tsc` is red — 5 errors in `plugins/centipede/tests/picture-flip-bits.test.ts` — so `npm run lint` and `npm run test:orchestrator` fail for every checkout, and since CI runs lint before every deploy, **no app can be released until it clears** | **OPEN, owned by `cp7-1`** (status `in_progress`, sibling checkout). Introduced by its RED commit `b039b64`; its GREEN closes it. No new story filed because an active one already owns it — verified at finish that `cp7-1` is still `in_progress` |
| 2 | Dev | Improvement | `frame.ts` keeps `rngNext` module-private, so a caller holding only the durable word rebuilds a whole `GameState` to advance one number (`draw({ ...stepped, rng })`) | **CLOSED as decided, not deferred.** Dev considered and declined it in the same breath: it widens `frame.ts`'s public surface for a single caller and no test asks for it. The current form is correct, tested and mutation-checked (M1). There is no pending work here — if a second caller ever appears, that story can revisit it |
| 3 | TEA | Conflict | The story's own committed description said "the first three would arrive earlier", contradicting the TWO in its own title and body | **RESOLVED** in `e32866a`. Corrected to TWO with the reversal annotated inline rather than silently re-numbered |
| 4 | TEA | Improvement | jt9-38's live comment called the twelve-egg maturity "f=624"; 624 is the WAIT, and under the forced-advance harness the maturity frame is 628 | **RESOLVED** at GREEN. Dev corrected the comment in place and named the harness, per the repo's fix-prose-in-place rule |
| 5 | TEA | Question | `VRAND` is a 3-byte RAM cell (`RAMDEF.SRC:52`) — a JMP vector — so the generator's SEQUENCE is not in the vendored tree at all. Its 0-127 range is established from the code that CONSUMES it, not from the generator | **CLOSED as recorded.** Sufficient for this story, which needs only the range, and that range is now pinned two independent ways. Filed here so a future story wanting VRAND's sequence knows it will not find it in this tree |


## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- **Conflict** (non-blocking): the repo-wide `tsc` gate is currently RED on `main` from a sibling
  checkout's in-flight RED phase — five TS2305/TS2339 errors, all in
  `plugins/centipede/tests/picture-flip-bits.test.ts`, from `b039b64 test(cp7-1): RED`. Because
  `npm run lint` and `shared-tests-typechecked.test.mjs` both run tsc over the WHOLE monorepo, one
  checkout's RED makes both gates red for every other checkout, and since CI runs `npm run lint`
  before any deploy it also means **no app can be released while that RED sits on main**. Owner:
  `cp7-1`, which is `in_progress` and whose GREEN closes it — no new story needed. Worth noting
  that joust's own TEA convention already avoids this (a not-yet-written export is loaded through a
  runtime `await import` with a specifier assembled at run time, so the type checker never sees the
  missing name); a static import of a future export is the form that reddens the cabinet. Affects
  `plugins/centipede/tests/picture-flip-bits.test.ts` (cp7-1's GREEN, or the runtime-loader idiom
  if that story stays red for long). *Found by Dev during implementation.*
- **Improvement** (non-blocking): `frame.ts` exports `draw(state: GameState)` but keeps `rngNext`
  private, so a caller that holds only the durable word — which is what the hatch pass has — must
  rebuild a whole `GameState` around it (`draw({ ...stepped, rng })`) to advance one number. It
  works and is cheap, but it reads as more than it is. A `rngNext(word)` export would be the honest
  seam. Deliberately NOT taken here: it widens `frame.ts`'s public surface for one caller, and no
  test asked for it. Affects `plugins/joust/src/core/frame.ts` (:192, currently module-private).
  *Found by Dev during implementation.*

### TEA (test design)

- **Conflict** (non-blocking): this story's own committed description contradicts its own title on
  the count — it says TWO in the title and body and then "With PWHCH the first three would arrive
  earlier" in the paragraph on what the port looks like today. The derivation says TWO, so the
  stale word is "three". Affects `sprint/epic-jt9.yaml`, `jt9-40`'s `description` (one sentence;
  SM owns sprint YAML and the correction is a single word). *Found by TEA during test design.*
- **Improvement** (non-blocking): jt9-38's live comment in production reads "they all mature on the
  SAME frame (measured: f=624 on three seeds)". 624 is the EGGWT2 WAIT; under the `advanceTo(5)`
  harness the maturity FRAME is 628, because the forced advance enters wave 5 at frame 4. Either
  the number is a duration labelled as a frame, or it came from a harness that entered wave 5 at
  frame 0 and the comment does not say which — and a frame number with no harness is
  under-specified either way. Affects `plugins/joust/src/core/demo.ts` (the comment above the hatch
  pass, ~:1477-1478 — re-open it rather than trusting that line number, this story shifts nothing
  there but jt9-30 records 14 of 16 refs already stale). Cheap for Dev to correct in place during
  GREEN. *Found by TEA during test design.*
- **Question** (non-blocking): `VRAND` is a 3-byte RAM cell (`RAMDEF.SRC:52`, `VRAND RMB 3`) — a
  JMP vector, not a routine in `JOUSTRV4.SRC` — so the generator's actual algorithm is not in the
  vendored tree and its 0-127 range is established from the CODE THAT CONSUMES IT (the `ROLA` to
  reach 0-255, the six-entry ledge select) rather than from the generator. That is enough for this
  story, which needs only the range, but any future story wanting VRAND's SEQUENCE will not find it
  here. Affects nothing today; recorded so it is not rediscovered. *Found by TEA during test
  design.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Reviewer (audit)
- No undocumented deviations found. All 8 entries below (4 TEA, 4 Dev) were audited and ACCEPTED —
  see the Deviation Audit in the Reviewer Assessment for the per-entry rationale, including the two
  that were re-measured rather than taken on the author's word (Dev's rng-argument change, probed
  as M8; Dev's mark/draw split, probed at the rolled counter).

### Dev (implementation)

- **The pre-mature MARK and the pre-mature DRAW were split across two hops**
  - Spec source: context-story-jt9-40.md, Problem (the CREGG transcription)
  - Spec text: "each created egg first takes the wave's PEGGTM … and then the first TWO eggs
    created have that wait SHORTENED by a random amount" — one site, at creation.
  - Implementation: `spawnWaveEggs` sets a boolean `prematureHatch` carrying no amount; the draw
    and the arithmetic happen at the hatch pass's first wait resolve.
  - Rationale: resolving a wait needs the DECIMAL wave ordinal and `spawnWaveEggs` holds the raw
    WAVBCD counter, which mis-reads the tenth wave and throws on the hundredth — the crash
    jt9-38's AC-4 pinned. Doing it all at the deal re-opens that. The mark still encodes the ROM's
    own choice of eggs (deal order, ledge loop before scatter), so nothing about WHICH eggs is
    deferred; only the arithmetic moves to where its units exist. TEA left the placement open and
    named this hazard explicitly.
  - Severity: minor
  - Forward impact: the RNG is consumed one frame later than the machine consumes it (at the first
    wait resolve rather than at the deal). Relative order between the two eggs is preserved. Any
    future story that needs draw-exact stream parity with the machine at wave setup must move this,
    and must solve the ordinal problem first — td1-12 owns that.

- **A new optional field was added to `DemoProcess`**
  - Spec source: the tests TEA wrote (`demo-jt9-40.test.ts`)
  - Spec text: no test reads a tag; every assertion reads the resolved wait.
  - Implementation: `prematureHatch?: boolean` on `DemoProcess`, beside `waveEgg`.
  - Rationale: the eggs are indistinguishable once they are in the process list, so eligibility has
    to be carried somewhere. Mirrors the existing `waveEgg` tag exactly. Not mirrored into
    `tests/helpers/demo-contract.ts`, because no test stages it — mirroring an unused field is how
    that contract drifted before (the `waitFrames` drift jt9-38 hit).
  - Severity: minor
  - Forward impact: a future test that needs to STAGE a pre-mature egg must widen the contract
    mirror first, or use the local-widening idiom (`demo-jt9-38.test.ts`'s `BaiterProc`).

- **The wave-advance spawn's RNG argument was changed although no test required it**
  - Spec source: minimalist discipline (implement what the tests demand)
  - Spec text: no test distinguishes `spawnWaveEnemies(wave, stepped.rng)` from
    `spawnWaveEnemies(wave, rng)`, and none can — the two paths cannot co-occur.
  - Implementation: changed to the post-draw word anyway.
  - Rationale: leaving the pre-draw word would fork the stream the moment some later story makes a
    wave clearable in a frame where a draw happened. It is a one-token change with a comment saying
    why it is currently unobservable, which is cheaper than the latent bug.
  - Severity: trivial
  - Forward impact: none today; removes a trap later.

- **A comment from a previous story was corrected**
  - Spec source: context-story-jt9-40.md, Touch points
  - Spec text: names the hatch pass as a place to READ, not to correct.
  - Implementation: rewrote jt9-38's "measured: f=624 on three seeds" to distinguish the 624-frame
    wait from the f=628 maturity frame and to name the harness.
  - Rationale: TEA filed it as a Delivery Finding and it is a false claim in production prose —
    the repo's standing position is that a stale comment is fixed in place, not routed. One
    sentence, in a comment this story was already editing.
  - Severity: trivial
  - Forward impact: none.

### TEA (test design)

- **The suite requires a named new export the story does not ask for**
  - Spec source: context-story-jt9-40.md, ACCEPTANCE bullet 1
  - Spec text: "Model the shortened wait for the first N eggs an egg wave deals (N derived from the
    DEC/BMI, not from the ROM's comment), drawn from the run's seeded RNG so it stays deterministic."
  - Implementation: AC-1 requires `demo.ts` to export `prematureHatchWait(wait, draw)` as a pure
    function, which constrains the shape of the fix beyond "model the shortened wait".
  - Rationale: the arithmetic is `wait - ((draw * wait) >> 8)` and NO seeded run can separate that
    from `wait - draw`, a `>> 7`, or a constant half — every real draw lands somewhere all of them
    agree. Only fabricated (wait, draw) pairs discriminate, and they need a function to call. Same
    ruling jt9-38 made for `wenemyFor`. WHERE the draw is taken is left open, so this pins the law
    and not the mechanism.
  - Severity: minor
  - Forward impact: `prematureHatchWait` becomes a public surface of demo.ts; a later refactor that
    inlines it must move AC-1 rather than delete it.

- **The suite requires dossier claims the story's acceptance criteria never mention**
  - Spec source: context-story-jt9-40.md, ACCEPTANCE (three bullets, none about the dossier)
  - Spec text: the ACs cover the model, the re-baseline and jt9-38's gate — nothing about
    `docs/rom-study/claims/`.
  - Implementation: the source companion fails until five `JT940-*` claim entries cover
    JOUSTRV4.SRC:160, :2886-2887, :2888-2889, :2890-2891 and :2892-2894. (:2776-2777 is already
    covered by an existing claim.)
  - Rationale: this story puts six new ROM citations into production comments, and a citation that
    lives only in a comment is prose — the unguarded surface. The dossier gate re-opens each claim's
    `verbatim` against the vendored line on every run, so riding it makes them byte-checked. It is
    the idiom jt9-9 used for the sibling egg-wait citations; jt9-38 did not, which is why its
    f=624 comment could go imprecise unnoticed (see Delivery Findings).
  - Severity: minor
  - Forward impact: ~5 JSON entries of Dev work; no production behaviour.

- **Three assertions are aggregates over a seed sweep, not per-seed expectations**
  - Spec source: context-story-jt9-40.md, ACCEPTANCE bullet 1 ("drawn from the run's seeded RNG so
    it stays deterministic")
  - Spec text: determinism implies an exactly-predictable per-seed outcome, which would normally be
    pinned as one.
  - Implementation: "it really shortens" is asserted as 60-of-64 draws over 32 seeds, 14-of-16 at
    the second egg wave, and 14-of-16 early arrivals — floors, not equalities.
  - Rationale: VRAND legitimately yields 0, and a zero draw shortens by nothing, making that egg
    indistinguishable from the ten the mechanism never touched. A named-seed assertion demanding a
    visible effect is one draw in 128 away from a false red that the next author "fixes" by changing
    the seed. The expected zero rate is stated in each comment so the floors are reasoned rather
    than tuned. Per-seed behaviour IS still pinned exactly — by bounds and by identity, both of
    which hold at draw 0 — and replay determinism is asserted directly.
  - Severity: minor
  - Forward impact: if a future RNG change makes zero draws common the floors red, which is the
    correct outcome rather than a false alarm.

- **A file outside the story's named touch points was edited**
  - Spec source: context-story-jt9-40.md, Touch points
  - Spec text: names `plugins/joust/src/core/demo.ts` and `plugins/joust/tests/demo-jt9-38.test.ts`.
  - Implementation: `plugins/joust/README.md`'s `--project joust` file count 110 → 112.
  - Rationale: not a choice — `audio-seam-scope.test.ts` derives that count by walking the tree and
    reddens when the README disagrees. Adding two test files moved it, and leaving it red would
    have handed Dev a failure that has nothing to do with the feature. Fixed in RED, from a fresh
    measurement rather than by adding 2.
  - Severity: trivial
  - Forward impact: none.