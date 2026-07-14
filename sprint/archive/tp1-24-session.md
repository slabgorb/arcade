---
story_id: "tp1-24"
jira_key: "tp1-24"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-24: W-030's open half — the tanker's burst is THREE rules and we ship two: the children must be born at the PARENT's depth, above the grab line

## Story Details
- **ID:** tp1-24
- **Jira Key:** tp1-24
- **Workflow:** tdd
- **Repos:** tempest
- **Branch:** feat/tp1-24-split-child-depth
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-14T12:22:27Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-14T11:47:51Z | 2026-07-14T11:49:39Z | 1m 48s |
| red | 2026-07-14T11:49:39Z | 2026-07-14T12:04:59Z | 15m 20s |
| green | 2026-07-14T12:04:59Z | 2026-07-14T12:11:51Z | 6m 52s |
| review | 2026-07-14T12:11:51Z | 2026-07-14T12:22:27Z | 10m 36s |
| finish | 2026-07-14T12:22:27Z | - | - |

## SM Assessment

**The shape of this story is a ruling, not a repair.** Two thirds of one ROM
mechanism are already on `develop`; the third is a constant that was chosen — on
purpose, before this epic — to be gentler than the cabinet. Whoever picks this up
must not read `SPLIT_CHILD_DEPTH = 0.85` as a typo. It is a decision, and this
story exists to overturn it or to confirm it in writing.

**Scope — three deliverables, all required:**

1. **The clamp** (`tempest/src/core/sim.ts:222`,
   `const depth = Math.min(t.depth, SPLIT_CHILD_DEPTH)`). The ROM seats both
   children at the parent's exact depth: KILINV (ALWELG.MAC:2300-2302) saves the
   parent's `Y,INVAY` into `TEMP0`, and ACTINV (1219-1226) writes that same
   `TEMP0` back out to each child. There is no clamp in the cabinet. If we adopt
   the ROM, `SPLIT_CHILD_DEPTH` does not get a new number — it stops existing.
2. **The test.** A rim-burst at 0.9286 with both children born above the 0.92 grab
   line is a difficulty change; it must be pinned by a test that would fail if the
   clamp came back. Pair it with a test that the no-flip rule (W-032 / NEWGEN) is
   what keeps it survivable — the two are one mechanism and should fail together.
3. **The ledger.** W-030's title, `claim`, and `reasoning` still assert both
   halves and still quote the dead `TANKER_SPLIT_DEPTH = 0.9`. tp1-5 deliberately
   did not stamp a `remediated_by` that would have been a lie. Split or amend the
   finding so it asserts only the divergence that is actually open.

**The trap, and it has already bitten this epic once.** tp1-5's post-mortem is
explicit: writing one ROM byte as two separate numbers is what made W-032's
no-flip rule dead code for an entire review cycle. Burst depth, child depth, and
no-flip are the *same* rule read three times. Do not land any one of them in
isolation, and do not let a test assert a hardcoded 0.85/0.9/0.92 triple that
quietly re-forks them.

**Also on the record — the fixture trap.** A tempest fixture that sets `s.level`
without `s.tube = tubeForLevel(level)` silently tests level 1's closed circle.
Any split test must state which tube it is on, because a rim-burst on an open
sheet (waves 8/9/10/11/14/15) clamps rather than wraps, and that changes which
lanes the children can even reach.

**Handoff:** Han Solo (TEA) takes RED. The test must fail against today's
`develop` for the right reason — the clamp — not because a fixture forgot its
tube.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (5 failing — ready for Dev)

**THE RULING (asked and answered by the Jedi, 2026-07-14): option (a) — adopt the ROM.**
The children are born at the parent's depth. `SPLIT_CHILD_DEPTH` is deleted, not renumbered.

### What I measured before writing a line

Baseline on `develop` is **971/971 green**. I then temporarily patched `sim.ts:222` to
`const depth = t.depth`, ran the full suite, and reverted — so the blast radius below is
measured, not predicted. (`git diff src/` is empty; I changed no source.)

| Wave 3, tanker on lane 5, children on 4 and 6 | value |
|---|---|
| Parent's depth when it bursts on its own | **0.92857** (wave 1: 0.92969) |
| `PLAYER_RIM_DEPTH` (the grab line) | 0.92 — so the children are born **above** it |
| Children today | clamped to **0.85**, safely below |
| Children get the NOJUMP cam already? | **yes** — W-032 landed in tp1-5 |

**Survivability, which is the AC that decides (a) vs (b):**

| Player stands on | ROM (no-flip) | if no-flip were broken |
|---|---|---|
| lane 4 or 6 — a landing lane | **dies frame 0** | dies frame 0 |
| lane 5 — the tanker's own lane, which the ROM **vacates** | dies frame 18 | dies frame 9 |
| lane 12 — far away | dies frame 58 | survives 60 |

So the burst **is** survivable, and option (a) wins on the story's own terms: the player who
tracked the tanker and stood on its lane to shoot it is *not* instantly grabbed, and the no-flip
rule doubles his reaction window (18 frames vs 9). Only a player caught on a flanking lane dies
with no counterplay — and that is the cabinet.

**Test Files:**
- `tests/core/tp1-24.split-child-depth.test.ts` — new, 9 tests (5 RED, 4 green guards)
- `tests/core/tp1-5.pulsar-fuse-split.test.ts` — re-seated (see Deviations)
- `tests/core/sim.enemy-authentic.test.ts` — re-seated (see Deviations)

### The 5 RED tests — the contract Dev must satisfy

| # | Test | Fails today with |
|---|------|------------------|
| 1 | `splitTanker` seats both children at the parent's EXACT depth | `expected 0.85 to be 0.93` |
| 2 | a self-arriving tanker's children are born at/past the arrival gate, above `PLAYER_RIM_DEPTH` | `expected 0.85 >= 0.92857` |
| 3 | the burst is INSTANTLY lethal on a child's landing lane | `expected true to be false` (player still alive) |
| 4 | `rules.ts` carries no `SPLIT_CHILD_DEPTH` in live code | the `export const` is still there |
| 5 | `sim.ts` carries no `SPLIT_CHILD_DEPTH` in live code | the import is still there |

### The 4 GREEN tests — guards against overcorrecting. Do not let these go red.

- **a parent BELOW the old clamp is unchanged** — a tanker shot at 0.5 still drops its children at
  0.5. Stops "born at the parent's depth" being satisfied by seating everything at the arrival gate.
- **the burst SPARES the player on the tanker's own vacated lane** — the fairness that makes the
  cruelty shippable. If Dev's change kills him here, the implementation is wrong.
- **no child changes lane below the rim** — W-032 stays alive. Burst depth, child depth and no-flip
  are one mechanism; this is the thread tying them.
- **`TANKER_SPLIT_DEPTH === SPLIT_TOO_CLOSE_DEPTH`** — the `$20` band stays ONE constant. Splitting
  it in two is what made W-032 dead code for a whole review cycle.

### Rule Coverage

| Rule / project convention | Test | Status |
|---|---|---|
| Fixture trap: never seat a tanker above the arrival gate | every near-rim test drives a REAL climb (`climbUntilBurst`) | enforced |
| Fixture trap: `s.level` without `s.tube = tubeForLevel(level)` | `base()` sets both; `tube.closed` asserted as a premise | enforced |
| No vacuous assertions | both frame-loop tests carry an `observed > 0` / `sawBelowRim > 0` guard | enforced |
| `core/` purity (no DOM, no wall-clock) | tests drive `stepGame` with a fixed `SIM_STEP` only | enforced |
| Citation gate must stay green | existing `tests/audit/citations.test.ts` (AC-7) — see blocking Delivery Finding | Dev owns |

**Self-check:** no vacuous assertions in what I wrote — and I removed one I found in
`sim.enemy-authentic.test.ts` (`depth <= SPLIT_CHILD_DEPTH` against a parent at 0.5, which could
never fail). The source-rule tests run in the `node` environment (vitest is `environment: 'node'`
project-wide), so reading `src/` off disk is safe.

### Handoff to Yoda (Dev)

The fix is one line — `sim.ts:222` becomes `const depth = t.depth` — plus three chores that are
NOT optional:

1. **Delete `SPLIT_CHILD_DEPTH`** from `rules.ts` and its import in `sim.ts` (tests 4 and 5). The
   comments at `sim.ts:218-220` and `sim.ts:227-235` both still describe the clamp — `:235` says the
   children "are seated at SPLIT_CHILD_DEPTH, below the threshold they are being judged against",
   which becomes false and, worse, misleading: after the fix they are judged at the depth they are
   born at. Rewrite both.
2. **Stamp `remediated_by: "tp1-24"`** on W-030 and re-anchor. This is BLOCKING and measured — the
   citation gate loses 2 tests the moment the clamp line disappears, because W-030's `ours` quotes it
   verbatim. Then `node tools/audit/reanchor-citations.mjs --write` and commit the JSON (CLAUDE.md).
3. **Amend W-030's stale half** — its title, its `claim` AND its `source` anchor all still describe the
   divergence tp1-5 closed. See the second Delivery Finding for exactly what is stale.

**Do not** re-clamp to a different number to make test 3 gentler. The instant grab on a flanking lane
is the finding, it is ratified, and test 3 is what pins it.

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 980/980 passing (GREEN) · `tsc --noEmit` clean · `npm run build` clean
**Branch:** `feat/tp1-24-split-child-depth` (pushed)

TEA handed me a one-line fix and three non-optional chores. All four landed, and TEA's
blocking finding was real — the citation gate went red the moment the clamp line vanished,
exactly as measured.

**Files Changed:**
- `src/core/sim.ts` — `splitTanker` seats both children at `t.depth`; the clamp is gone, as is
  the `SPLIT_CHILD_DEPTH` import. The comment above it now states all THREE rules of the burst
  as one mechanism (where the children land · how deep · what program they run), because
  writing them apart is precisely what made W-032 dead code for a review cycle. The old comment
  at the no-flip branch claimed the children "are seated at SPLIT_CHILD_DEPTH, below the
  threshold they are being judged against" — after this change that is not merely stale but
  inverted, so it is rewritten: they are now judged at the depth they are born at.
- `src/core/rules.ts` — `SPLIT_CHILD_DEPTH` **deleted**, not renumbered, and replaced with a
  tombstone comment saying why: the children's depth is not a constant at all, it is the
  parent's. It also warns the next reader off reintroducing it to soften the burst, and points
  at where the fairness actually lives (the vacated lane + the no-flip rule).
- `docs/audit/findings/pair-1-alwelg-sim-enemies.json` — W-030 rescoped and remediated (below).
- Five other `pair-*.json` — line numbers only, from the re-anchor. Verified: every hunk is a
  `"line":` field, no content touched.

### The ledger — what I actually did to W-030, and why not a split

The AC allowed "split the finding **or** amend it". I amended, deliberately. Splitting would
have meant minting a second finding for the closed half whose `ours` quote (`TANKER_SPLIT_DEPTH
= 0.9`) no longer exists anywhere in the tree and was never audited in that form — that is
manufacturing evidence, and the audit's whole authority rests on quotes you can re-open. So:

- **`title` / `claim`** — rescoped to the one divergence that was still open (child depth). They
  no longer assert the burst-depth half that tp1-5 closed.
- **`source` re-anchored**, which TEA caught and which the AC did not ask for: it pointed at
  `ALWELG.MAC:1750` (`IFCC ;TOO CLOSE TO TOP FOR CARRIER?`) — the JSMOVE burst **gate**, i.e. the
  *closed* half. A finding about where the children land was citing the line that decides *when*
  the parent dies. It now cites `ACTINV:1226` (`STA Y,INVAY ;Y`) — the instruction that actually
  seats the child from the parent's saved `TEMP0`.
- **`ours` left alone** at `sim.ts:222`, frozen as history by `remediated_by: "tp1-24"`, per the
  CLAUDE.md convention.
- **`reasoning`** keeps the original refuter's ROM-side verification verbatim (that is the durable
  authority — the 1981 source does not change) and gains a `[SCOPE]` preamble explaining the
  tp1-5 split and a `[REMEDIATION]` tail recording this as a ratified difficulty change with the
  measured numbers.

`node tools/audit/reanchor-citations.mjs --write` → **30 re-anchored, 0 lost.** AC-7 satisfied.

### What a reviewer should press on

The behaviour change is real and user-facing: **a player standing on a flanking lane when a
tanker bursts at the rim now dies on the burst frame, with no counterplay.** That is the finding,
it was ratified by the Jedi, and `tp1-24.split-child-depth.test.ts` test 3 pins it. It is not a
bug. Do not "fix" it by reintroducing a clamp — the four green guard tests in that file exist to
catch exactly that, and one of them (the player on the vacated lane is SPARED) is the load-bearing
proof that the burst is survivable at all.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 980/980 green, build exit 0, citation gate 0 lost, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by me (see O2, O6) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by me (no error paths in diff) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by me (see O3, O7, O10) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by me (see O8) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — rule-checker covered types (rules 1-5) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — no attack surface (pure sim, no I/O, no user input) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain covered by me (see O9) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 17 rules / 34 instances | N/A — verified citation gate byte-exact independently |

**All received:** Yes (2 enabled returned, 7 disabled via `workflow.reviewer_subagents`)
**Total findings:** 3 confirmed (all non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

No Critical or High findings. The implementation is faithful, the tests genuinely bite (I proved it
by mutation, not by reading), and the citation gate is byte-exact. Three non-blocking observations
are recorded below; one of them is worth a follow-up story.

### Observations

**[VERIFIED] O1 — Core purity holds.** `splitTanker` (`src/core/sim.ts:245-262`) is now
`const depth = t.depth` plus two `makeEnemy` calls: a pure function of its parameters. No DOM, no
`Date.now`, no `Math.random`, no `shell/` import. Complies with CLAUDE.md's hard architectural
boundary. The `rules.ts` change is comment-only. Corroborated by rule-checker rule #14.

**[VERIFIED] O2 — A child can never be born past the rim, which is the ceiling the deleted clamp
was silently providing.** This was my main worry: `Math.min(t.depth, 0.85)` guaranteed an upper
bound on child depth, and removing it means children inherit whatever the parent had. Two facts
close it. First, `enemies/interpreter.ts:232` clamps every invader to
`Math.max(0, Math.min(RIM_DEPTH, ...))` with `RIM_DEPTH = 1`, so `t.depth` is bounded by 1 by
construction. Second, the fastest a tanker can climb is `FLIPPER_ALONG_PER_FRAME_L33 = 3.375`
along-units/frame ÷ `WARP_ALONG_SPAN` (224) = **0.0151 depth/frame** at L33+, while the arrival
band `[0.9286, 1.0]` is **0.0714** wide — nearly five frames deep. A tanker therefore cannot
overshoot the band, and auto-arrival children are always born in `[0.9286, ~0.944]`: above the
0.92 grab line, below the rim. No unbounded inheritance, no degenerate depth-1 birth.

**[VERIFIED] O3 — The tests bite. I mutated the code to prove it rather than trusting the green
run.** I disabled the no-flip rule (deleted the `t.depth >= SPLIT_TOO_CLOSE_DEPTH` block in
`splitTanker`) and re-ran: **3 tests failed** — tp1-24's "SPARES the player on the tanker's own
lane", tp1-24's "neither child changes lane while below the rim", and, critically, tp1-5's
re-seated "children of a tanker that ARRIVES on its own never flip". That last one settles the
question the re-seat raised: TEA loosened the assertion from a fixed 16-frame window to a
below-the-rim invariant, and it **kept its teeth**. Reverted, tree clean, 9/9 green. This is the
check that matters most on this story, because a re-seat that quietly stopped discriminating would
have handed us W-032-as-dead-code a second time — the exact failure this epic already suffered.

**[VERIFIED] O4 — The ledger is sound.** W-030's new `source` (`ALWELG.MAC:1226`) re-opens
byte-exact against `/Users/slabgorb/Projects/tempest-source-text/ALWELG.MAC`, tabs included
(`\tSTA Y,INVAY\t\t;Y`). `ours` is correctly frozen as history at the pre-fix line, per CLAUDE.md
rule 1. The field is `remediated_by`, not the banned `fixed_in` (zero `fixed_in` hits repo-wide).
No other finding carries a dangling `ours` citation to the deleted constant. `reanchor-citations`
reports **0 lost**, and the five other touched JSONs are line-number-only — I diffed them and every
hunk is a `"line":` field. Independently confirmed by rule-checker rule #15.

**[VERIFIED] O5 — Dev's re-anchor was necessary, not incidental.** Adding comment lines to
`rules.ts`/`sim.ts` shifted 30 citations. Skipping the re-anchor would have left the gate red on the
*next* story with a confusing "does not match verbatim" — exactly the trap CLAUDE.md warns about.
Handled correctly.

**[RULE] O5b — rule-checker returned CLEAN: 17 rules, 34 instances, 0 violations.** No finding to
confirm or dismiss, so this is recorded as a clean sweep rather than a dismissal. It checked all 13
numbered checks in `.pennyfarthing/gates/lang-review/typescript.md` plus the four CLAUDE.md project
rules I passed it (core purity, citation gate, no baked frame rate, tube-space positions). Two items
it surfaced as "compliant-with-detail" rather than violations, both of which I independently agree
with: the three non-null assertions in `tp1-24.split-child-depth.test.ts:175,185,186` are inert
because `noUncheckedIndexedAccess` is not set in `tsconfig.json` and the array lengths are asserted
immediately above them; and the unguarded `Map.get()` reads at `tp1-24.split-child-depth.test.ts:264`
and `tp1-5.pulsar-fuse-split.test.ts:441` are protected by the `length !== 2 → break` loop invariant
(this is my O10, reached independently). It also did the citation-gate verification the hard way —
`awk` + `cat -tv` byte comparison of `ALWELG.MAC:1226` against the new `source.verbatim`, plus a
repo-wide grep proving no other finding carries a dangling `ours` citation to the deleted constant
and that `fixed_in` appears nowhere. That corroborates my O4 from an independent path.

**[MEDIUM] O6 — `PLAYER_RIM_DEPTH = 0.92` is itself an invented constant, and this story just made
it load-bearing.** `src/core/rules.ts:84` reads `export const PLAYER_RIM_DEPTH = 0.92` with a bare
comment and no ROM derivation. Inverting it: `INVAY = 0xf0 − 0.92 × 224 = 33.92` — **not a clean
byte**. Every neighbouring constant in this file is derived (`(0xf0 - 0x20) / WARP_ALONG_SPAN`,
`PULSAR_ALONG_PER_FRAME * ROM_FPS / …`); this one is a round decimal, which is the exact
fingerprint of the two constants this epic has already caught and killed (`TANKER_SPLIT_DEPTH = 0.9`
in tp1-5, `SPLIT_CHILD_DEPTH = 0.85` here). **No finding tracks it** — it appears only inside *other*
findings' prose (W-010's `ours`, W-030's claim, WD-016). It was low-stakes while children were
clamped to 0.85 and could never reach it. It is not low-stakes now: this story's entire ratified
difficulty change is expressed as "children are born ABOVE `PLAYER_RIM_DEPTH`", so if 0.92 is wrong,
the lethality window is wrong. **Not blocking** — the change is directionally correct against the
ROM whatever the grab line's exact value, and pinning it is a separate audit question. Filed as a
Delivery Finding.

**[LOW] O7 — A newly reachable sliver, authentic in shape but untested.** The grab line (0.92) and
the no-flip line (0.9286) are different numbers, so there is a band `[0.92, 0.9286)` in which a
child is born **lethal** (above the grab line) yet still runs the **wave's cam** (below the too-close
line) — it can grab you *and* flip onto you. Under the old clamp this band was unreachable; a bullet
split in it now lands there. The ROM has the same two-threshold structure ($22-ish vs $20), so the
shape is authentic — but its *width* is governed by the invented 0.92 from O6, and no test covers it
(the suite tests `splitTanker` at 0.93 and 0.5, and the auto-arrival at 0.9286+). Low, and arguably
out of scope, but it is the natural next test if O6 is ever pinned.

**[LOW] O8 — Comment accuracy: fixed, and this was a real risk.** The pre-existing comment claimed
the children "are seated at SPLIT_CHILD_DEPTH, below the threshold they are being judged against."
After this change that is not stale but *inverted* — they are now judged at the depth they are born
at. Dev rewrote it (`sim.ts:254-258`) and restructured the whole block to state all three rules of
the burst as one mechanism. Given that describing these rules apart is precisely what cost this epic
a review cycle, this was the right call and not scope creep. `rules.ts:270-284` leaves a tombstone
explaining why the constant is gone and warning against reintroducing it — good defensive
documentation.

**[LOW] O9 — `const depth = t.depth` is a now-redundant local.** A simplifier would flag it; it is
assigned once and read twice, and `t.depth` could be inlined. I am **not** asking for a change: the
local names the ROM's `TEMP0` — the single saved value both children read — which is the whole point
of the finding. Inlining it would erase the correspondence the comment above it spends ten lines
establishing. Acceptable as written.

**[LOW] O10 — Test bookkeeping: index-paired child tracking.** Both frame-loops
(`tp1-24.split-child-depth.test.ts:264`, `tp1-5.pulsar-fuse-split.test.ts:441`) track children by
array index across frames (`prev.get(i)`). If the enemy array were ever reordered mid-loop, this
would compare child 0's lane against child 1's previous lane. It is safe today — `runCam` maps in
place and both loops guard with `if (kids.length !== 2) break` — and a broken invariant would surface
as a loud `toBe(undefined)`, not a silent pass. Noted, not required.

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` (13 numbered checks) + CLAUDE.md project
rules. Rule-checker enumerated 34 instances across 17 rules; I spot-verified the load-bearing ones.

| Rule | Instances judged | Verdict |
|---|---|---|
| #1 type-safety escapes (`as any`, `ts-ignore`, `!`) | 4 (three `!` in tests) | Compliant — `noUncheckedIndexedAccess` is off, so the `!` are inert; lengths asserted first |
| #2 generic/interface pitfalls | 1 (`splitTanker` signature) | Compliant — signature unchanged, no `Record<string,any>` |
| #3 enum anti-patterns | 0 | N/A — no enums touched |
| #4 null/undefined handling | 3 | Compliant — `Map.get()` reads guarded by loop invariant (see O10) |
| #5 module/declaration issues | 3 | Compliant — `moduleResolution: bundler`; matches the 14 existing `src/core` imports |
| #6 React/JSX | 0 | N/A |
| #7 async/Promise | 0 | N/A — no async introduced |
| #8 test quality | 5 | Compliant — all suites import from `src/`, never `dist/`; no `as any` |
| #9 build/config | 0 | N/A — no config touched; `tsc --noEmit` clean, strict intact |
| #10 security / input validation | 0 | N/A — pure sim, no I/O, no user input, no parsing |
| #11 error handling | 1 (`throw` in `climbUntilBurst`) | Compliant — fail-loud fixture guard, not a swallow |
| #12 performance/bundle | 2 (`readFileSync` in a test) | Compliant — test-body fs, matches existing source-rule tests |
| #13 fix-introduced regressions | full diff re-scan | Compliant — no new escapes |
| **CLAUDE.md: core purity** | `splitTanker`, `rules.ts` | **Compliant** — pure, deterministic; O1 |
| **CLAUDE.md: citation gate** | W-030 + 5 re-anchored JSONs | **Compliant** — byte-exact source, `remediated_by`, 0 lost; O4 |
| **CLAUDE.md: no baked frame rate** | whole diff | **Compliant** — no `60`, no hidden `×60`; depth math uses ROM-derived constants only |
| **CLAUDE.md: tube-space `{lane, depth}`** | `splitTanker`, tests | **Compliant** — far=0/near=1 convention held |

### Devil's Advocate

Let me argue this is broken. The strongest case: **this story deletes a safety rail and calls the
resulting deaths "authentic."** `SPLIT_CHILD_DEPTH`'s comment was not decoration — it said "so a
rim-split is not an instant grab," which means someone once decided that instant grabs were bad. We
have now made them possible on the say-so of a ROM reading, and the player will experience it as the
game cheating: you shoot nothing, you stand still, a tanker you never touched bursts and you are
dead with no frame in which you could have reacted. If the ROM reading is wrong, we have shipped a
cruelty with a citation stapled to it, and the citation is the thing that will stop anyone
questioning it.

So is the reading wrong? The chain is `KILINV:2301-2302` (`LDA Y,INVAY / STA TEMP0` — save the
parent's depth) → `ACTINV:1225-1226` (`LDA TEMP0 / STA Y,INVAY` — write it into the child). I
re-opened all four lines in the original source myself; they say what the finding says, and W-030's
own refuter reached the same conclusion independently. There is no clamp anywhere in that path. The
reading holds.

Then the sharper attack: **is it survivable?** Here the honest answer is "only because of two other
rules," and that is a fragile kind of correct. If a future story ever touches the lane-vacation
(rule 1) or the no-flip cam (rule 3) without knowing they are load-bearing for rule 2, the burst
becomes unfair and nothing obviously breaks — the tests for rules 1 and 3 would still pass in
isolation. This is exactly how W-032 became dead code. The mitigation is that TEA's guard tests now
*couple* them: "SPARES the player on the vacated lane" fails if either the vacation or the no-flip
rule is removed — I proved that by mutation (O3). The mechanism now defends itself. That is the
single most valuable thing in this diff, and it is why I am approving rather than flagging.

The residual risk is O6: the lethality is defined against `PLAYER_RIM_DEPTH = 0.92`, a number nobody
has ever audited, sitting in a file where every other constant is derived from a ROM byte. We have
made an invented constant load-bearing for a ratified difficulty change. That does not make this
story wrong — children born at the parent's depth is correct at any grab line — but it means the
*exact* window of death is, right now, a guess. It should be pinned. It is a follow-up, not a
blocker.

**Handoff:** To SM (Thrawn) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (blocking): Deleting the clamp turns the citation gate RED — W-030's `ours`
  cites `src/core/sim.ts:222` verbatim as `  const depth = Math.min(t.depth, SPLIT_CHILD_DEPTH)`,
  the exact line the fix removes. Measured: `tests/audit/citations.test.ts` drops 2 tests
  with `W-030: ours src/core/sim.ts:222 does not match verbatim`.
  Affects `docs/audit/findings/pair-1-alwelg-sim-enemies.json` (stamp `remediated_by: tp1-24`
  on the open half and run `node tools/audit/reanchor-citations.mjs --write`, per CLAUDE.md).
  *Found by TEA during test design.*
- **Gap** (non-blocking): W-030 is half-stale in three places, not one. Its **title**
  ("...not 0.9 / 0.85") and its **claim** ("We split at TANKER_SPLIT_DEPTH = 0.9") both still
  assert the divergence tp1-5 already closed, and its **`source`** anchors ALWELG.MAC:1750
  (`IFCC ;TOO CLOSE TO TOP FOR CARRIER?`) — which is the JSMOVE burst gate, i.e. the CLOSED
  half. The open half's source is KILINV 2300-2302 / ACTINV 1219-1226 (`LDA TEMP0 / STA Y,INVAY`),
  which the finding cites only in prose. Amending the finding means re-anchoring `source` too,
  not just the title.
  Affects `docs/audit/findings/pair-1-alwelg-sim-enemies.json`.
  *Found by TEA during test design.*
- **Improvement** (non-blocking): the no-flip rule is not a pure safety gain, and nobody has
  said so out loud. Measured on wave 3 with children on lanes 4/6: a player on the vacated
  lane 5 dies on frame 18 under NOJUMP but frame 9 under SPIRAL (no-flip HELPS him), while a
  player far away on lane 12 dies on frame 58 under NOJUMP but SURVIVES 60 frames under SPIRAL
  (no-flip HURTS him — non-flipping children take the rim faster and walk it straight to him).
  Not a defect, and not in scope here; worth knowing before anyone tunes chaser speed.
  *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): W-031 sits at `src/core/sim.ts:225` — one of the two `makeEnemy` lines
  inside `splitTanker` — and is about the FLANKING-lane geometry (rule 1 of the three). It survived
  this change untouched and re-anchored cleanly, but it means `splitTanker` now carries two separate
  unremediated-or-remediated findings against adjacent lines of one 6-line function. Anyone touching
  that function again should read W-030 and W-031 together, not one at a time — the three rules of the
  burst are one mechanism and the ledger still files them apart.
  Affects `docs/audit/findings/pair-1-alwelg-sim-enemies.json`.
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): `reanchor-citations.mjs` reported "2 matches, took nearest" for W-037
  and WD-015. That heuristic is silent in the success path and could in principle re-anchor a citation
  onto the wrong duplicate line without anyone noticing — the gate would stay green because the verbatim
  still matches. Both look correct here (I spot-checked the resulting line numbers), but a citation that
  can silently rebind to a different occurrence is a weak link in a gate the epic leans on this hard.
  Affects `tools/audit/reanchor-citations.mjs` (consider failing loudly, or requiring a disambiguating
  hint, when a quote matches more than once).
  *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (non-blocking): `PLAYER_RIM_DEPTH = 0.92` (`src/core/rules.ts:84`) is an INVENTED constant and
  no finding tracks it. Inverted, it is `INVAY = 0xf0 − 0.92 × 224 = 33.92` — not a clean ROM byte, in a
  file where every neighbour is derived (`(0xf0 - 0x20) / WARP_ALONG_SPAN`, `PULSAR_ALONG_PER_FRAME *
  ROM_FPS / …`). A round decimal with a bare comment is the exact fingerprint of the two constants this
  epic has already killed — `TANKER_SPLIT_DEPTH = 0.9` (tp1-5) and `SPLIT_CHILD_DEPTH = 0.85` (this
  story). It appears only inside OTHER findings' prose (W-010's `ours`, W-030's claim, WD-016), never as
  a finding of its own. It was harmless while children were clamped to 0.85 and could never reach it;
  tp1-24 makes it load-bearing, because the whole ratified difficulty change is expressed as "the
  children are born ABOVE `PLAYER_RIM_DEPTH`". If 0.92 is wrong, the lethality window is wrong.
  Affects `src/core/rules.ts:84` (derive the grab line from the ROM byte, or record it as a deliberate
  divergence) — worth a story in the tp1 epic.
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the band `[PLAYER_RIM_DEPTH, SPLIT_TOO_CLOSE_DEPTH)` = `[0.92, 0.9286)`
  is newly reachable and untested. A tanker SHOT in that band now drops children that are both LETHAL
  (above the grab line) and FLIPPING (below the too-close line, so they get the wave's cam and can jump
  onto the player). The two-threshold structure is authentic — the ROM's grab and no-flip tests are
  genuinely different bytes — but the sliver's WIDTH is set by the invented 0.92 above, and no test
  covers it. Under the old clamp it was unreachable.
  Affects `tests/core/tp1-24.split-child-depth.test.ts` (add a bullet-split-in-the-sliver case once the
  grab line is pinned).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the three rules of the burst are load-bearing for each other but are
  filed as SEPARATE findings (W-030 child depth, W-032 no-flip, and the lane-vacation from story 6-9 which
  has no finding at all). A future story could remove the lane-vacation or the no-flip cam, keep every
  test for its own rule green, and silently make the rim-burst unfair — which is precisely how W-032
  became dead code for a review cycle. TEA's guard tests now couple them at the TEST level (verified by
  mutation), but the LEDGER still files them apart.
  Affects `docs/audit/findings/pair-1-alwelg-sim-enemies.json` (cross-reference W-030/W-031/W-032 so the
  next reader cannot take one without the others).
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Re-seated tp1-5's no-flip test off a fixed frame window**
  - Spec source: context-story-tp1-24.md, AC-3 / AC-4 (the no-flip rule must survive the change)
  - Spec text: "a test proves the burst is survivable — the no-flip rule (W-032) means a player
    NOT standing on a child's landing lane lives"
  - Implementation: `tp1-5.pulsar-fuse-split.test.ts` → "children of a tanker that ARRIVES on its
    own never flip" stepped a fixed 16 frames and asserted the children were still on lanes 4/6,
    carrying `chasing === false` as an unstated premise. That only held because they were seated
    at 0.85. Born at the parent's 0.9286 they reach the rim on frame 10 and WALK it as chasers —
    a lane change that is authentic and is not a flip, so the old spelling goes RED on a *correct*
    implementation. Restated window-free: a child must not change lane while still BELOW the rim.
  - Rationale: TEA owns test maintenance; Dev makes tests pass and cannot move goalposts. Verified
    the re-seat is GREEN both on today's `develop` and under a temporary patch of the fix, and that
    it still bites — a SPIRAL child changes lane below the rim on frame 9.
  - Severity: minor
  - Forward impact: none — the rule it pins is unchanged, only the window is gone.
- **Re-seated sim.enemy-authentic's child-depth assertion**
  - Spec source: context-story-tp1-24.md, AC-2
  - Spec text: "SPLIT_CHILD_DEPTH is deleted, not left orphaned."
  - Implementation: that suite asserted `kids.every(k => k.depth <= SPLIT_CHILD_DEPTH)` and imported
    the constant. It passes today only because its parent is seated at 0.5, far under the 0.85 clamp —
    the assertion never tested anything. Deleting the constant would break the import at `tsc`, not at
    runtime. Replaced with the actual ROM contract: `k.depth === tanker.depth`.
  - Rationale: a vacuous assertion that also blocks the deletion is worse than no assertion; the
    replacement pins the real rule and is green before and after.
  - Severity: minor
  - Forward impact: none.
- **The survivability test asserts "not INSTANTLY grabbed", not "lives indefinitely"**
  - Spec source: context-story-tp1-24.md, AC-4
  - Spec text: "a test proves the burst is survivable — ... a player NOT standing on a child's
    landing lane lives. If that test cannot be made to pass, that is the finding, and option (b) wins."
  - Implementation: the test asserts the player on the vacated lane survives the burst frame and every
    frame while the children are still BELOW the rim. It does not assert he lives forever — measured, he
    dies on frame 18 once they take the rim and chase him.
  - Rationale: the literal reading ("lives") is false under the ROM and would have forced option (b) on a
    technicality. Chasers walking the rim to the player is authentic Tempest and is the player's problem
    to shoot; the thing W-032 actually guarantees is that they cannot flip ONTO him, which is exactly what
    the bounded form pins. The AC's decision procedure is satisfied — the burst IS survivable.
  - Severity: major (it is the AC that decides (a) vs (b))
  - Forward impact: Reviewer should confirm this reading. If the Jedi meant "survives indefinitely", the
    ruling flips to (b) — but that would also mean rejecting authentic chaser behaviour.

### Dev (implementation)
- **Amended W-030 in place rather than splitting it into two findings**
  - Spec source: context-story-tp1-24.md, AC-6
  - Spec text: "W-030 stops being half-stale: split it into the closed half (split depth, remediated_by
    tp1-5, keeping its historical `ours`) and the open half, or amend its title/claim so it no longer
    asserts a divergence that is already fixed."
  - Implementation: took the AC's second branch — amended `title`, `claim`, `reasoning` and `source`,
    stamped `remediated_by: "tp1-24"`, and left `ours` frozen as history. Did NOT mint a second finding
    for the closed half.
  - Rationale: the AC explicitly permits either. Splitting would have required a new finding whose `ours`
    quote (`TANKER_SPLIT_DEPTH = 0.9`) exists nowhere in the tree and was never audited in that form —
    the audit's authority rests entirely on quotes that can be re-opened, so fabricating one to fill a
    schema field would corrode the thing the gate protects. tp1-5's closure is recorded in the `[SCOPE]`
    preamble of the reasoning instead, where it is true.
  - Severity: minor
  - Forward impact: none — W-030 now names exactly one divergence and it is closed.
- **Re-anchored W-030's `source`, which no AC asked for**
  - Spec source: context-story-tp1-24.md, AC-6 (housekeeping scope)
  - Spec text: the AC names only the stale `title` and `claim`/`reasoning`.
  - Implementation: also moved `source` from `ALWELG.MAC:1750` (`IFCC ;TOO CLOSE TO TOP FOR CARRIER?`)
    to `ALWELG.MAC:1226` (`STA Y,INVAY ;Y`).
  - Rationale: TEA found it and it is the same staleness the AC is about. Line 1750 is the JSMOVE burst
    GATE — the half tp1-5 closed. A finding rescoped to "where the children land" cannot keep citing the
    line that decides when the parent dies; it would be a rescoped finding still pointing at the old
    scope's evidence. 1226 is the instruction that seats the child from the parent's `TEMP0`.
  - Severity: minor
  - Forward impact: none — the ROM side of the gate re-opens and matches byte-for-byte.
- **Rewrote the surviving no-flip comment, beyond deleting the clamp**
  - Spec source: the tests TEA wrote (`tp1-24.split-child-depth.test.ts`); AC-2
  - Spec text: AC-2 requires only that `SPLIT_CHILD_DEPTH` be "deleted, not left orphaned".
  - Implementation: also rewrote the prose above `splitTanker` and the tail of the W-032 comment inside it.
  - Rationale: not scope creep — the old comment asserted the children "are seated at SPLIT_CHILD_DEPTH,
    below the threshold they are being judged against". After this change that is not just stale, it is
    exactly backwards: they are now judged at the depth they are born at. A comment that lies about the
    invariant the next reader is trying to preserve is worse than no comment, and this epic has already
    lost a review cycle to the three rules being described apart.
  - Severity: minor
  - Forward impact: none.
### Reviewer (audit)

All six logged deviations audited. **Six ACCEPTED, zero FLAGGED, one UNDOCUMENTED deviation found.**

- **TEA — Re-seated tp1-5's no-flip test off a fixed frame window** → ✓ **ACCEPTED.** This was the
  deviation with the most room to go wrong: loosening an assertion during a behaviour change is exactly
  how a test quietly stops discriminating. I did not take TEA's word for it — I disabled the no-flip rule
  in `splitTanker` and re-ran. The re-seated test **failed**, along with both tp1-24 guards. The re-seat
  kept its teeth. Reverted; tree clean.
- **TEA — Re-seated sim.enemy-authentic's child-depth assertion** → ✓ **ACCEPTED**, with a caveat worth
  recording: at that fixture's parent depth (0.5) the new assertion `k.depth === tanker.depth` cannot
  discriminate against a re-added clamp either, since `Math.min(0.5, 0.85)` is also 0.5. It is a true
  statement and it unblocks the constant's deletion at `tsc`, which was its job — but the load-bearing
  assertion is tp1-24's test 1 (parent at 0.93), not this one. Accepted as a compile-level re-seat, not
  as coverage.
- **TEA — The survivability test asserts "not INSTANTLY grabbed", not "lives indefinitely"** → ✓
  **ACCEPTED.** The literal AC reading is false under the ROM and would have forced option (b) on a
  technicality. Chasers walking the rim to the player is authentic Tempest and is the player's problem to
  shoot; what W-032 actually guarantees is that they cannot flip ONTO him, which is what the bounded form
  pins. TEA flagged this as major and asked for confirmation — confirmed, and it is the right call.
- **Dev — Amended W-030 in place rather than splitting it into two findings** → ✓ **ACCEPTED.** The AC
  permitted either. Splitting would have required minting a finding whose `ours` quote
  (`TANKER_SPLIT_DEPTH = 0.9`) exists nowhere in the tree and was never audited in that form. The audit's
  authority rests entirely on quotes that can be re-opened; fabricating one to satisfy a schema field
  would corrode the gate itself. Right instinct.
- **Dev — Re-anchored W-030's `source`, which no AC asked for** → ✓ **ACCEPTED.** Verified byte-exact
  against `ALWELG.MAC:1226`, tabs included. A finding rescoped to "where the children land" cannot keep
  citing line 1750, which decides *when the parent dies* — the half tp1-5 closed. Going beyond the AC was
  correct here.
- **Dev — Rewrote the surviving no-flip comment, beyond deleting the clamp** → ✓ **ACCEPTED.** Not scope
  creep. The old comment ("they are seated at SPLIT_CHILD_DEPTH, below the threshold they are being judged
  against") was not merely stale after this change — it was inverted. Leaving it would have re-armed the
  precise trap that cost this epic a review cycle.

**UNDOCUMENTED — spotted by me, not logged by TEA or Dev:**
- **The ratified difficulty change is defined against an unaudited constant.** Nobody logged that
  `PLAYER_RIM_DEPTH = 0.92` is itself invented (`INVAY 33.92` — not a ROM byte) and that this story
  promotes it from a quiet threshold to the definition of the new lethality window. Neither TEA nor Dev
  is at fault — it is outside the story's ACs — but it is a genuine spec gap: we ratified "children are
  born ABOVE `PLAYER_RIM_DEPTH`" without ever asking whether `PLAYER_RIM_DEPTH` is right.
  Severity: **M**. Filed as a Delivery Finding; does not block this story, because children-at-the-
  parent's-depth is correct at any grab line.