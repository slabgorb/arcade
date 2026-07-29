---
story_id: "uf1-3"
jira_key: "uf1-3"
epic: "uf1"
workflow: "tdd"
---
# Story uf1-3: star-wars Status.C_AH is always false — squadmates never react to a nearby kill

## Story Details
- **ID:** uf1-3
- **Jira Key:** uf1-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** star-wars
- **Branch:** feat/uf1-3-c-ah-nearby-kill (base: origin/develop @ 9c6f19c)
- **Context:** sprint/context/context-story-uf1-3.md

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-29T11:32:41Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-29T10:30:42.251198Z | 2026-07-29T10:33:55Z | 3m 12s |
| red | 2026-07-29T10:33:55Z | 2026-07-29T10:52:41Z | 18m 46s |
| green | 2026-07-29T10:52:41Z | 2026-07-29T11:01:19Z | 8m 38s |
| review (round 1) | 2026-07-29T11:01:19Z | 2026-07-29T11:14:00Z | 12m 41s |
| green (rework 1) | 2026-07-29T11:14:00Z | 2026-07-29T11:20:00Z | 6m |
| review (round 2) | 2026-07-29T11:20:00Z | 2026-07-29T11:34:00Z | 14m |
| green (rework 2) | 2026-07-29T11:22:00Z | 2026-07-29T11:28:42Z | 6m 42s |
| review | 2026-07-29T11:28:42Z | 2026-07-29T11:32:41Z | 3m 59s |
| finish | 2026-07-29T11:32:41Z | - | - |

<!-- The rework-2 start time above is corrected. My hand-edit stamped it
     11:34:00Z, which was ahead of the real clock, so `complete-phase` computed a
     NEGATIVE duration (-318s) against the true end of 11:28:42Z. Cosmetic only —
     no gate reads these durations — but this file is about to be archived, and a
     negative phase duration in the permanent record would be a puzzle for
     whoever greps it later. -->


> **Phase hand-edited back to `green` after a REJECTED round-1 review.**
> `pf handoff resolve-gate` returned the happy path (`next_agent: sm`,
> `next_phase: finish`) despite the REJECTED verdict — nothing machine-reads
> `**Verdict:**`, and there is no `pf handoff rework` command. The gate's own
> `recovery_config.reviewer-verdict` names the correct route
> (`action: rework, target_phase: green, max_attempts: 3`), which is what this
> edit performs by hand. Done twice — after round 1 and after round 2 — so this
> story used **2 of the 3** permitted rework attempts.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): `C_PS` is the SAME defect as this story's `C_AH` and the fleet sweep missed it — the assembled choreography gates on it in four places inside `TCH1DZ` (the loiter loop every D-group fighter ends up in), but `computeStatus` never derives it, so it reads permanently false and the `TCH1DZ_20` branch is unreachable dead code. Unlike its neighbours it is a real gap, not a faithful omission: the ROM genuinely sets it (`WSMAIN.MAC:3930 CHSET C$PS`). Affects `src/core/tie-status.ts` (derive the bit) and `src/core/tie-vm.ts:341-342` (the four gate sites). **Filed as uf1-12** (3pts, p2, tdd, star-wars) with full description and 5 ACs — not left as a note. *Found by TEA during test design.*
- **Conflict** (non-blocking): the story's AC-1 and AC-3, and the epic uf1 description that quotes them, assert a ROM behaviour that does not exist — C_AH as a proximity signal to squadmates. The ROM sets it on the alien that was hit, with no radius anywhere (see Design Deviations for the full citation trail). The tests are written to the ROM. Affects `sprint/epic-uf1.yaml` (uf1-3's `description` and acceptance_criteria still carry the wrong reading, and will outlive this story unless corrected). **Owned by uf1-3's own finish ceremony (SM)** — the story text must be reconciled with the delivered behaviour when the story is archived, or the next reader inherits the same wrong premise the sweep did. *Found by TEA during test design.*
- **Improvement** (non-blocking): `C_AD`, `C_AV` and `C_PM` are defined in `Status` and derived by nothing — but that is CORRECT and should be recorded as such rather than re-reported by a future sweep. The ROM never sets `C_AD` either (`WSCPU.MAC:28` annotates it `/PLEASE DELETE/`, zero setters tree-wide) and the assembled program gates on none of the three. Affects `src/core/tie-status.ts` (the header's out-of-scope list). Covered by uf1-12's AC-5 rather than filed separately, since it is the same comment line. *Found by TEA during test design.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **C_AH is SELF-damage on the alien that was hit — not a proximity signal to squadmates. Tests are written to the ROM, not to AC-1/AC-3's wording.**
  - Spec source: context-story-uf1-3.md, AC-1 and AC-3 (and the story description)
  - Spec text: AC-1 — "A TIE **destroyed** this step sets the **nearby-alien** signal that computeStatus reads"; AC-3 — "a test drives a kill **beside a live TIE** and asserts the **squadmate's** VM takes the C_AH arm"
  - Implementation: tests assert that the fighter **that was hit** carries the signal, on the step it takes **damage** (not necessarily death), with **no radius and no squadmate involved**. AC-3's reachability test drives a laser hit **on Darth** and asserts **Darth's own** VM cuts its jink short.
  - Rationale: the entire source tree has exactly **one** `CHSET C$AH` (WSCPU.MAC:357), inside `CPHTSA` ("SPACE LAZAR HIT ALIEN SHIP"). It loads `CL.AP` — the alien the laser hit — and writes that alien's own `A$CHST`, commented `;STATUS: THIS ALIEN DAMAGED`. There is no loop over other aliens and no distance test anywhere. The equate's English ("NEARBY ALIEN HAS BEEN HIT", WSCPU.MAC:27) is abandoned design language: its sibling `C$AD` ("NEARBY ALIEN HAS DIED") is annotated **`/PLEASE DELETE/`** in both WSCPU.MAC:28 and WSMAIN.MAC:28 and has **zero setters** in the tree. Implementing AC-1/AC-3 as written would invent a radius the cabinet never had and attach the bit to the wrong ship — in a repo whose stated purpose is faithful cloning. AC-2 explicitly authorises this path ("the absence of one in WSCPU.MAC is recorded as a logged deviation with the chosen rule and its rationale"); this is that record.
  - Severity: major
  - Forward impact: the story gets **smaller and needs no new constant** — no radius to tune, no playtest TODO. The delivered behaviour is genuinely observable and it lands on Darth: `TRTH1D` seats Darth (`RTH`) with choreography **`1D3`** (tie-waves.ts:60), and `TCH1D3` holds the **only** `.CUNTIL C$AH` in the ROM (WSCPU.MAC:1590). Because plain TIEs die in one hit and Darth is the one alien kept alive (`LDA #05 / STA A$HTA(X) ;KEEP DARTH ALIVE`), Darth is the only fighter that can ever live to observe his own C_AH — the ROM's design is self-consistent. Net cabinet behaviour restored: **shoot Vader mid-weave and he breaks off the weave to come at you.**

- **The bit is NOT set when the hit lands inside Darth's no-double-jeopardy glow window.**
  - Spec source: context-story-uf1-3.md, AC-1
  - Spec text: "A TIE destroyed this step sets the nearby-alien signal that computeStatus reads"
  - Implementation: a test asserts that a hit landing while `glow > 0` sets **nothing** — no score and no C_AH signal.
  - Rationale: `CPHTSA` returns before it reaches line 357 when the alien is already glowing (`LDA A$GLW(X) / IFNE / 5$: RTS ;LEAVE ALONE FOR A WHILE`). The port already gates *scoring* on `glow <= 0` (sim.ts:530); the new signal must sit behind the **same** gate or it would report damage the ROM never processed.
  - Severity: minor
  - Forward impact: pins the signal to the existing sw7-13 glow gate rather than to raw beam contact, so a held trigger cannot machine-gun the VM out of its script every frame.

- **AC-6 is narrowed to its "rewritten" branch — the C_AH comment must SURVIVE, not be deleted.**
  - Spec source: context-story-uf1-3.md, AC-6
  - Spec text: "The tie-status.ts:107 TODO comment is **removed or** rewritten to describe what now happens"
  - Implementation: one test drives the removal of the stale TODO (fails today, as required), but a second test asserts the block still names `C_AH` and still cites the ROM setter — which forecloses the "removed entirely" option the AC also allows. That second test PASSES today; it is a regression guard on the rewrite, not a RED driver.
  - Rationale: every other bit in `computeStatus` carries a citation comment, so deleting C_AH's outright would leave the one newly-wired bit as the only undocumented one in the function — and the implementation has to edit that exact spot anyway to add the `status |= Status.C_AH` line. Keeping the citation is also what stops the next fleet sweep re-reporting the bit, which is AC-6's stated purpose.
  - Severity: minor
  - Forward impact: Dev cannot satisfy AC-6 by deleting the block; the comment must be rewritten in place. Reviewer should treat a deletion as a deliberate override of this deviation, not a silent pass.

### Dev (implementation)
- No deviations from spec. TEA's three deviations above already reconciled the story text with the ROM before implementation began; I implemented to those tests exactly and added nothing they did not demand. The one discretionary call TEA explicitly delegated (whether to set the flag on a plain TIE's fatal hit) I declined — see "Not done, deliberately" in the Dev Assessment.

### TEA (test design) — continued

- **The unobservable intermediate — a plain TIE's own C_AH on its death step — is deliberately left untested.**
  - Spec source: context-story-uf1-3.md, AC-1
  - Spec text: "A TIE destroyed this step sets the nearby-alien signal"
  - Implementation: no test asserts that a fatally-hit plain TIE carries the flag before it is filtered out of `enemies`.
  - Rationale: the ROM does set C$AH before the lethality check, but a killed TIE is dropped from `enemies` in the same step and its VM never ticks again, so the value is unobservable through any public seam. Asserting it would require reaching into the resolver's internals and would couple the suite to one particular implementation shape.
  - Severity: minor
  - Forward impact: Dev is free to set the flag before or after the kill filter; only survivors are pinned.

## Sm Assessment

**Story:** uf1-3 — star-wars `Status.C_AH` is always false, so squadmates never
react to a nearby kill. 3pts, p2, tdd, repo `star-wars`.

**Race check (clean):** fetched `star-wars` before setup — no `uf1-3` branch on
origin, no open PRs, local `develop` identical to `origin/develop` @ 9c6f19c
(`rev-list --left-right --count` → `0 0`). No sibling checkout is running this
story. Merge gate clear.

**Setup verified:**
- `.session/uf1-3-session.md` exists (this file), fields set.
- `sprint/context/context-story-uf1-3.md` exists, carries the full description,
  all 6 ACs verbatim, and an enriched Technical Approach.
- Branch `feat/uf1-3-c-ah-nearby-kill` created off `origin/develop` and checked
  out in `star-wars`.
- Jira: skipped — this project has no Jira; `jira_key` is the story id.

**Pointer correction handed to TEA:** the story description's line numbers are
stale against 9c6f19c. Verified: the C_AH TODO is `tie-status.ts:106` (not 107),
the VM imports `sim.ts:132-134` (not 131), the per-frame
`computeStatus`→`tickChoreo` step `sim.ts:397-398` (not 388), the `choreoPc`
seating `sim.ts:2110-2115` (not 2082). The C_AG mirror to follow is
`tie-status.ts:100-104` with the write-back at `sim.ts:417`. Corrections are in
the context file so RED does not chase ghosts.

**What TEA should decide first (not mine to answer):** AC-2 hinges on whether
`WSCPU.MAC` defines a proximity rule at all for `CHSET C$AH`. If it does not,
the chosen rule is a **logged deviation with rationale** in Design Deviations
above — not an invented radius passed off as ported. Quarry is at
`/Users/slabgorb/Projects/star-wars-1983-source-text`.

**Risk flagged:** the hit resolver is the sw7-17 hitscan model, whose own story
touched 29 suites / 125 tests and exposed 11 vacuous tests. Fixture churn is
expected. AC-5 makes the mutation proof mandatory — pinning the new signal back
to false must redden the C_AH branch test. Green alone is not evidence here.

**Routing:** phased workflow, setup complete → **red**, owner **tea**
(Mr. Praline).

---

## TEA Assessment

**Tests Required:** Yes

**Test Files:**
- `star-wars/tests/core/tie-hit-status.test.ts` — 24 tests across 7 describe blocks, one per AC plus two regression groups. Commit `5df8daf`.

**Tests Written:** 24 tests covering 5 of 6 ACs directly (AC-5 is a mutation
procedure, specified below rather than encoded as a test).
**Status:** RED — 8 failing / 16 passing. Full suite 1995/2004, and the **only**
failing file is the new one: no collateral.

### The finding that drove the design

The story is wrong about the ROM, and the tests are written to the ROM. C_AH is
**self-damage on the alien that was hit**, not a proximity signal to squadmates:
the entire 1983 tree holds exactly one `CHSET C$AH` (WSCPU.MAC:357, inside
`CPHTSA`), and it writes the bit back to the same alien it opened on
(`LDX CL.AP` … `STD A$CHST(X)`, `;STATUS: THIS ALIEN DAMAGED`). No radius exists
anywhere. The equate's "NEARBY" is abandoned design language — its sibling
`C$AD` is annotated `/PLEASE DELETE/` and has zero setters. AC-2 explicitly
authorised this path; the full citation trail is in Design Deviations above.

This makes the story **smaller and constant-free** — no radius to invent, no
playtest TODO — and it still delivers real cabinet behaviour, because the ROM's
design closes on itself: plain TIEs die in one hit, Darth is the one alien kept
alive (`KEEP DARTH ALIVE`), Darth is seated with choreography `1D3`
(tie-waves.ts:60), and `TCH1D3` holds the ROM's only `.CUNTIL C$AH`. **Shoot
Vader mid-weave and he breaks off into the attack arm.**

### The contract Dev implements

1. `Enemy` gains `damaged?: boolean` — optional, per-frame, named for the ROM's
   own `;STATUS: THIS ALIEN DAMAGED`.
2. The hit resolver sets it on the fighter whose hit it **processed** — behind
   the existing `glow <= 0` gate, because `CPHTSA` returns before the `CHSET`
   when the alien is already glowing.
3. `computeStatus` merely reports it: `if (e.damaged ?? false) status |= Status.C_AH`.
4. The decision tick **clears** it after reading — including on a fighter with no
   seated VM. Copying the C_AG write-back verbatim
   (`return e.vm ? { ...e, vm, firedGun } : e`) **will fail**: a VM-less enemy is
   passed through untouched and the flag latches forever. There is a test for it.

Ordering already works in the port's favour: the decision tick runs **before**
hit resolution inside `stepGame`, so a hit on step N is seen on step N+1 — the
cabinet's own order (CPHTSA sets, next CPUAL's CHOPDO tests, then the rebuild
clears).

### AC-5 — the mutation procedure (for Dev to run at GREEN, Reviewer to verify)

Each mutation must redden a **named** test. If one stays green, that test is
decorative and should be fixed, not accepted.

| Mutation | Must redden |
|---|---|
| Delete the `status \|= Status.C_AH` line in `computeStatus` (pin the bit false) | AC-1 "sets C_AH…", AC-1 "reads the flag off the ENTITY…", AC-1 "does not disturb the other status bits…", E2E "the next decision tick feeds it to Darth's VM…" |
| Never set `damaged` in the hit resolver | E2E "a processed laser hit on Darth sets his damage signal", AC-4 "is false again after the decision tick…", AC-4 "clears on a fighter with NO seated VM too…" |
| Set `damaged` without clearing it (latch it) | AC-4 "is false again after the decision tick…", AC-4 "stays clear for the rest of the wave…", AC-4 "clears on a fighter with NO seated VM too…" |
| Set `damaged` ignoring the glow gate | AC-4 "a hit inside the no-double-jeopardy glow window sets NOTHING" |

### Rule Coverage

`.pennyfarthing/gates/lang-review/typescript.md`. No `.claude/rules/` or
`SOUL.md` exist in this repo — the lang-review checklist is the whole rubric.

| Rule | Test(s) | Status |
|------|---------|--------|
| #4 null/undefined — optional field read with `??`, `undefined` ≠ `false` | `clears on a fighter with NO seated VM too` (the latch hazard is exactly an `undefined` that never becomes `false`) | failing |
| #4 null/undefined — optional chaining on a possibly-absent VM | `the next decision tick feeds it to Darth's VM` (`enemies[0].vm?.untilMask`) | failing |
| #1 type-safety escapes — no `as any` to force the new field | whole file: zero casts, zero `@ts-ignore`; the missing `damaged` field is a REAL `tsc` error until Dev adds it (tests are in `tsconfig.include`) | n/a — self-checked |
| #8 test quality — no vacuous assertions, no `let _ =` | `fireUntilDarthHit` THROWS rather than returning an un-hit fixture, so no E2E assertion can pass vacuously | passing |
| #8 test quality — negative case beside every positive | `clears C_AH when the fighter was not hit`, `only C_AH opens that arm`, `an UNSHOT Darth never leaves the weave` | passing |
| #3 enum patterns — `Status` is a const object, not a TS enum; bit-OR not exhaustive-switch | `does not disturb the other status bits it shares the word with` (asserts `hit === plain \| C_AH` exactly) | failing |

**Rules checked:** 4 of 13 lang-review rules are applicable to this diff (it adds
one test file and, at GREEN, one optional boolean field). #6 React/JSX, #7/#11
async & error handling, #9 build config, #10 input validation, #12 bundle and #5
module declarations have no surface here.
**Self-check:** 0 vacuous tests found. Two assertions use `damaged ?? false`,
which would tolerate an absent field — deliberate (absent means "not hit") and
paired in the same describe with an assertion that it becomes literally `true`,
so the pair cannot both pass on a no-op implementation.

### Notes for Dev

- `npm run lint` / `npm run build` (`tsc --noEmit`) **fail right now** and that is
  correct: `tests` is in `tsconfig.include`, so the missing `Enemy.damaged` is a
  compile error until step 1 above lands. Do not silence it with a cast.
- `tie-status.ts` is **not** in `docs/audit/findings/`, so rewriting its comment
  cannot break the citation gate — but run `npm test -- citations` anyway, since
  the resolver edit touches `sim.ts`, which is cited.
- The ROM-pinning block (AC-2) is `describe.skipIf(!sourceAvailable)` and will
  SKIP in CI, which has no 1983 source tree. That is the repo's existing idiom
  (`tests/audit/citations.test.ts:219`), not an oversight.

**Handoff:** To Dev (Bicycle Repair Man) for implementation.

---

## Dev Assessment

**Status:** GREEN — full suite **2004/2004**, `npm run build` (tsc + vite) clean.
**Branch:** `feat/uf1-3-c-ah-nearby-kill` pushed. Commit `f449a9d`.

### What changed — four edits, no new constant

| File | Change |
|---|---|
| `src/core/state.ts` | `Enemy` gains `damaged?: boolean` (optional, per-frame), documented against WSCPU.MAC:357 |
| `src/core/tie-status.ts` | `if (e.damaged ?? false) status \|= Status.C_AH` + the AC-6 comment rewrite |
| `src/core/sim.ts` (resolver) | raises the flag on the existing `darthScored` set |
| `src/core/sim.ts` (decision tick) | clears the flag on **every** fighter after `computeStatus` reads it |

I took TEA's ROM reading as given — it is fully cited and I re-read
WSCPU.MAC:344-358 myself before writing the setter. No radius was invented, so
this story ships **zero new tunable constants**, which is the outcome AC-2 was
angling for.

Two implementation choices worth the Reviewer's eye:

1. **The flag rides `darthScored`, not raw beam contact.** That set is already
   gated on `glow <= 0`, which is exactly the ROM's `LDA A$GLW(X) / IFNE / RTS`
   guard that returns *before* the `CHSET` — so "a hit CPHTSA processed" and
   "score SCRDARTH" are the same event, and reusing the set keeps them from
   drifting apart. Mutation 4 below proves the gate is load-bearing.
2. **The clear is deliberately outside the `e.vm ?` ternary.** Copying the C_AG
   write-back verbatim would have latched the flag forever on a VM-less fighter.
   TEA predicted this precisely and wrote the test for it; I wrote the clear as
   `const cleared = e.damaged ? { ...e, damaged: false } : e` so untouched
   fighters keep object identity and no meaningless `damaged: false` is sprayed
   onto every enemy in the game.

### AC-5 — mutation battery (run, not assumed)

Every mutation was applied to the real source on a committed tree, run, and
reverted. All four killed the tests TEA named:

| Mutation | Predicted victims | Actual |
|---|---|---|
| Pin the bit false in `computeStatus` | 4 named | **4 failed** — exactly those 4 |
| Never set the flag in the resolver | 3 named | **4 failed** — the 3 named, plus the E2E VM test |
| Latch it (never clear) | 3 named | **3 failed** — exactly those 3 |
| Bypass the glow gate | 1 named | **4 failed** — the named glow test, plus 3 "stays clear" tests, because a held trigger then re-raises the flag every frame |

No mutation left the suite green. The guards are real.

### Collateral: the citation gate, and how it was closed

My comment lines shifted line numbers in `sim.ts`/`state.ts`, which broke
`tests/audit/citations.test.ts` (8 findings pointing at moved rows). Fixed with
the repo's own `node tools/audit/reanchor-citations.mjs --write`:
**35 re-anchored, 0 lost** — "lost" being the category that matters, since it
would mean a cited line's TEXT changed and the finding needed a `remediated_by`
decision instead. The resulting diff is 35 insertions / 35 deletions touching
**only** `"line":` fields; I verified no other JSON key moved, and spot-checked
the one ambiguous re-anchor (S-016, two `damage++` matches) against
`sim.ts:606` — verbatim match, and its +11 shift is consistent with every other
`sim.ts` citation.

### Not done, deliberately

- A plain TIE's own C_AH on its death step is still not set. TEA logged this as
  an untested unobservable and explicitly left it to my discretion; setting it
  would add a branch no test can reach and no player can see.
- `uf1-12` (C_PS) is untouched — it is TEA's filed follow-up, not this story.

**Handoff:** To Reviewer (The Argument Professional).

---

## Subagent Results

| # | Subagent | Status | Findings | Severity | Notes |
|---|----------|--------|----------|----------|-------|
| 1 | reviewer-preflight | Received | 0 | — | 2004/2004, tsc+vite clean, 0 smells; independently confirmed the 9 audit JSONs changed `"line"` only |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings |

**All received: Yes**

Eight of nine specialists are disabled in settings, so their domains were worked
directly by me — by re-running the TypeScript lang-review checklist against the
diff myself, and by a **9-mutation battery** (4 that TEA pre-specified and Dev
ran, plus 5 adversarial ones nobody predicted). Under pf relay the same session
wrote and reviewed this code, so re-reading it proves nothing; mutation is the
only honest instrument.

## Reviewer Assessment

**Verdict:** REJECTED — 1 Medium, 1 Low. No Critical, no High.

The implementation is correct and I could not break it. Every acceptance
criterion is met, the ROM reading is sound, and all nine mutations were caught.
I am rejecting on a **coverage** defect, not a behaviour defect — and on this
epic specifically, that distinction is the whole point.

### What I verified myself

**The ROM claim (AC-2).** I re-read `WSCPU.MAC:344-358` rather than trusting the
deviation. It holds: `CPHTSA` opens `LDX CL.AP`, and the lone `CHSET C$AH` at
:357 is bracketed by `LDD A$CHST(X)` / `STD A$CHST(X)` — the same alien. No
proximity loop exists. `C$AD` is `/PLEASE DELETE/` with zero setters. The
"squadmate" framing in the story is not in the cabinet, and refusing to invent a
radius was the right call.

**Mutation battery — 9 applied to real source on a committed tree, all reverted:**

| # | Mutation | Result |
|---|---|---|
| 1-4 | TEA's predicted set (pin false / never set / latch / bypass glow) | all caught (Dev's run, re-confirmed) |
| 5 | Set `damaged` on **every** enemy unconditionally | caught — 6 failed |
| 6 | Wrong bit: `Status.C_AD` instead of `C_AH` | caught — 4 failed |
| 7 | `e.damaged ?? true` instead of `?? false` | caught — 3 failed |
| 8 | **Read-after-clear** — flag cleared before `computeStatus` sees it | caught — but by exactly **one** test |
| 9 | Decouple the gates: set ungated by glow while scoring stays gated | caught — 4 failed |

No mutation survived. Mutation 8 is the thinnest guard in the suite: the
read/clear ordering invariant rests on a single test.

### Rule Compliance

`.pennyfarthing/gates/lang-review/typescript.md`, run manually against the diff
because `reviewer-rule-checker` is disabled in settings. No `.claude/rules/` or
`SOUL.md` exist in this repo, so this checklist is the whole rubric.

| # | Rule | Verdict |
|---|------|---------|
| 1 | Type-safety escapes (`as any`, `as unknown as`, `@ts-ignore`, `!`) | PASS — zero in the diff; independently confirmed by preflight |
| 2 | Generic/interface pitfalls (`Record<string,any>`, `object`, `Function`) | PASS — no new generics; `damaged?: boolean` is a primitive optional |
| 3 | Enum anti-patterns | N/A — `Status` is a const object, not a TS enum; no switch added |
| 4 | Null/undefined handling (`??` vs `\|\|`) | PASS — `e.damaged ?? false`, never `\|\|`. The `e.damaged ? … : e` ternary is sound: `false` and `undefined` denote the same state, so collapsing them is intended, not a bug |
| 5 | Module/declaration issues | N/A — no imports added or changed |
| 6 | React/JSX | N/A — no `.tsx` in the diff |
| 7 | Async/Promise patterns | N/A — the core is synchronous |
| 8 | Test quality (`as any` in tests, vacuous assertions) | PASS — no casts; `fireUntilDarthHit` throws rather than returning an un-hit fixture, so no E2E assertion can pass vacuously. **But see M-1** — the suite's cadence choice leaves a real invariant unguarded |
| 9 | Build/config concerns | N/A — `tsconfig`/`vite.config` untouched |
| 10 | Type-level input validation | N/A — no external input crosses this diff |
| 11 | Error handling | N/A — no throw/catch added in `src/` |
| 12 | Performance/bundle | PASS — `e.damaged ? { …e } : e` deliberately skips allocation for untouched fighters |
| 13 | Fix-introduced regressions | PASS — the only other change is data (35 audit `"line"` re-anchors, 0 lost) |

### M-1 (Medium) — the suite cannot catch C_AH silently dying at the shipped frame rate

`tests/core/tie-hit-status.test.ts` — the E2E consume-step uses
`TICK_DT = 1.05 / TICK_HZ`, which guarantees a decision tick on the very next
step. The game does not run that way. `TICK_HZ` is ~20.5 Hz against a 60 Hz
render, so **roughly two of every three steps run no decision tick at all** — and
on those steps the enemy list is rebuilt three separate times before the flag is
ever read: `applyManeuver` (`sim.ts:442`), the play-cube clamp (`:449`), and the
glow decay (`:451`).

So the signal's survival depends on all three rebuilds **spreading** rather than
reconstructing the fighter. That invariant is load-bearing and completely
unpinned. I probed it directly: the behaviour is correct today — the flag carries
for exactly one 60 fps step (`[true,false,false,false,false]`) and Darth's VM
does reach the C_AS arm at `dt = 1/60`. But change `applyManeuver`'s
`return { ...e, orient, pos }` to an explicit object literal — an entirely
plausible "cleanup" — and C_AH stops working in the shipped game **while all 2004
tests stay green**.

This epic exists because ported code silently failed to reach production. Merging
a fix whose regression test cannot observe the shipped cadence reproduces that
exact failure mode one layer down.

**Required:** a test that lands a hit and then steps at `dt = 1/60` across the
no-tick gap, asserting the VM takes the C_AH arm. I wrote and ran one while
reviewing; it passes against the current implementation and fails if any of the
three rebuilds stops spreading.

### L-1 (Low) — the comment that guards M-1 no longer names the field at risk

`src/core/sim.ts:447`: "Spread the fighter rather than rebuilding it so optional
fields (glow, vm, firedGun) survive." `damaged` is now a fourth optional field
and, per M-1, the only one whose survival across that map is both load-bearing
and untested. This comment is the sole in-code warning against the refactor that
would break C_AH, and it omits the field that would break.

**Required:** add `damaged` to that list.

### Considered and dismissed

- `spawnTie` sets `firedGun: false` explicitly but not `damaged: false`. Not a
  defect — both are read through `??`, and omitting it avoids stamping a
  meaningless field on every spawn. Consistency nit only; no change wanted.
- The 35 audit re-anchors: I checked the diff shape myself and preflight
  confirmed independently that only `"line"` keys moved, with `0 lost`. Correct
  handling — a `lost` entry would have needed a `remediated_by` ruling instead.
- AC-6's narrowing (TEA's deviation) — the comment was rewritten in place and
  now states the ROM mechanism. I accept the narrowing; deleting the block would
  have been worse.

**Handoff:** back to Dev (Bicycle Repair Man) for two small fixes, then re-review.

---

## Dev Assessment — round 2 (rework)

**Status:** GREEN — **2006/2006** (2004 + the 2 new cadence tests), build clean.
Commit `7fc60a8`, pushed.

Both round-1 findings fixed. Neither was argued with: M-1 named a real invariant
with no guard, and L-1 was the comment that should have been that guard.

**M-1 — the 60fps cadence gap.** Added
`describe('uf1-3 — the signal survives the 60fps no-tick gap')` with two tests
that step **only** at `dt = 1/60`, never `TICK_DT`:
1. a hit lands, the run coasts at render cadence, and Darth's VM is asserted to
   reach the C_AS arm — proving the flag crossed the tick-less steps' rebuilds;
2. the carry profile is pinned exactly: `[true, false, false, false, false]` —
   one step of carry, then clear. If a rebuild drops the flag the first entry
   goes false; if the clear stops firing at this cadence the later ones go true.

**Mutation-verified, which is the only reason to believe the tests are worth
anything.** I applied the exact refactor the finding predicted — turning
`applyManeuver`'s `return { ...e, orient, pos }` into an explicit object literal
— and ran the **whole repo**:

> `Test Files 2 failed | 185 passed (187)` · `Tests 4 failed | 2002 passed (2006)`

Of those 4: the **2 new tests** are the only ones in 2006 that catch the
regression. (The other 2 were `tests/audit/citations.test.ts`, and they were my
own collateral — the L-1 comment had shifted `sim.ts` line numbers and I had not
yet re-anchored. Not an independent guard on the invariant.) Before this change,
that refactor was caught by **nothing**.

**L-1 — the stale comment.** `sim.ts:447` now lists `damaged` alongside
`glow, vm, firedGun`, and says plainly why it is the one that bites: written at
the end of a step, read by the next tick, so at 60fps it must survive ~2
tick-less steps through this map, the clamp and the glow decay. It points at the
test that pins it.

**Citation re-anchor, round 2.** The L-1 comment shifted `sim.ts` again:
`21 re-anchored, 0 lost`, diff confined to `"line"` keys (verified). This is the
second time a comment-only edit moved pinned citations in this story — worth
remembering that the gate must be re-run after *any* edit to a cited file, not
only after code changes.

**Handoff:** back to Reviewer (The Argument Professional) for round 2.

---

## Subagent Results — round 2

| # | Subagent | Status | Findings | Severity | Notes |
|---|----------|--------|----------|----------|-------|
| 1 | reviewer-preflight | Received | 0 | — | 2006/2006 · `tsc`+`vite` clean · 3 commits · 0 smells (`as any`/`@ts-ignore`/`!`/`console.log`/`.only`/`.skip`/new TODO all zero) · all 9 findings JSONs verified `"line"`-key-only · tree clean |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — its domain is exactly where round 2's finding landed, and I worked it directly |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings |

**All received: Yes**

## Reviewer Assessment — round 2

**Verdict:** REJECTED — 1 Low. Round 1's two findings are both properly closed.

### Round 1 findings — verified closed

**M-1 (Medium) — CLOSED, and the fix is proven.** The two new tests step only at
`dt = 1/60`. I re-ran Dev's mutation myself rather than taking the claim: with
`applyManeuver` rebuilding instead of spreading, those two tests are the only
ones in 2006 that fail. The invariant now has a guard where it previously had
none. Dev's report was also honest about the 2 extra citation failures in that
run being his own un-re-anchored collateral rather than an independent guard —
that distinction was correct and I confirmed it.

**L-1 (Low) — CLOSED.** `sim.ts:447` now names `damaged` in the optional-field
list and explains why it is the one that bites.

### R2-A (Low) — the carry-profile test fails on behaviour that is CORRECT

`tests/core/tie-hit-status.test.ts`, "carries for exactly one 60fps step":

```ts
expect(carried).toEqual([true, false, false, false, false])
```

This does not assert the invariant; it asserts a **tick-phase alignment**. The
profile arises from two incidental facts — the beam lands on step 1 (so
`frameAcc` is 1/60 when the flag is set) and the next decision tick therefore
falls on step 3. Neither is part of the contract.

I probed it: inserting **one** idle step before the hit flips the result to
`[false, false, false, false, false]` and the test fails. But that outcome is
*correct behaviour* — the tick simply landed on the step immediately after the
hit and consumed the flag right away, which is exactly what a per-step event
should do. So the test currently treats a correct execution as a failure. That
is not brittleness in the cosmetic sense; it encodes a false specification, and
it will fire as a spurious red on any unrelated change that shifts `frameAcc` by
a single step — a spawn-timer tweak, a laser-sweep change, a different
`initialState`.

The sibling test ("reaches Darth's VM at real render cadence") already carries
the load-bearing half of M-1 robustly — it loops until the arm changes, so it is
phase-independent. Only this second test over-specifies.

**Required (small):** assert the invariant instead of the phase — the flag is
never true on two consecutive steps, and once cleared it never returns true.
Something of the shape:

```ts
expect(carried.filter(Boolean).length).toBeLessThanOrEqual(1)   // at most one carried step
expect(carried.indexOf(true)).toBeLessThanOrEqual(0)            // if carried at all, only the first
expect(carried.slice(1).some(Boolean)).toBe(false)              // never re-asserts
```

That still fails under the rebuild mutation (the flag would be dropped and the
VM test reddens alongside it) and still fails if the clear stops running, but it
does not encode which step the tick happens to land on.

I own this one: my round-1 M-1 demanded a cadence test and did not specify its
shape, and the shape chosen over-fits.

### Nothing else

Round-2 diff adds only the test block, the comment line, and 21 citation
re-anchors. Rule Compliance from round 1 is unchanged and still holds — the new
code is test-only, with no casts, no `!`, no `.only`/`.skip`.

**Handoff:** back to Dev for one small test change, then round 3.

---

## Dev Assessment — round 3 (rework 2)

**Status:** GREEN — **2006/2006**, build clean. Commit `8f4ce46`, pushed.

R2-A fixed, and the first attempt at fixing it was wrong in an instructive way
that is worth recording rather than hiding.

**Attempt 1 (rejected by my own verification).** I took the reviewer's suggested
shape literally — "at most one carried step, never re-asserts":

```ts
const firstClear = carried.indexOf(false)
expect(firstClear).toBeGreaterThanOrEqual(0)
expect(carried.slice(firstClear).some(Boolean)).toBe(false)
```

It passed, and it was phase-independent. It was also **blind**: with the flag
dropped entirely, `[false, false, …]` satisfies every one of those assertions.
Re-running the rebuild mutation proved it — only **1** of the 2 cadence tests
failed, down from 2. I had traded an over-fitted test for a weaker one and would
have shipped a guard with a hole in it. The reviewer's proposed shape was the
wrong fix; the finding was still right.

**Attempt 2 (shipped).** Pin the phase instead of guessing or ignoring it. Reset
`frameAcc` to 0 immediately after the hit, which turns the tick schedule into
arithmetic rather than an observation:

| after step | `frameAcc` | vs `tickPeriod` ≈ 0.048762 | flag |
|---|---|---|---|
| 1 | 0.01667 | below | must SURVIVE |
| 2 | 0.03333 | below | must SURVIVE |
| 3 | 0.05 | **at/above → TICK** | read, then CLEARED |

giving `[true, true, false, false, false, false]` — every entry derived from
`TICK_HZ` and `DT`, none of it incidental. The two surviving steps catch a drop;
the clear on step 3 catches a latch.

**Verified on three axes** (all three matter; the earlier versions each failed
one):

| Property | Round-2 original | Attempt 1 | Shipped |
|---|---|---|---|
| Passes | yes | yes | **yes** |
| Unchanged by an extra idle step before the hit | **NO** — false red | yes | **yes** |
| Reddens under the rebuild/drop mutation | yes | **NO** — blind | **yes** (2 tests) |
| Reddens under the latch mutation | yes | yes | **yes** (4 tests) |

Test-file edit only this round — no source change, so no citation drift and
nothing to re-anchor.

**Handoff:** back to Reviewer (The Argument Professional) for round 3.

---

## Subagent Results — round 3

| # | Subagent | Status | Findings | Severity | Notes |
|---|----------|--------|----------|----------|-------|
| 1 | reviewer-preflight | Received | 0 | — | 2006/2006 · build clean · tree clean (no mutation residue) · round-3 delta confirmed scoped to the one test file · 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — worked directly; rounds 2 and 3 both landed in its domain |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings |

**All received: Yes**

## Reviewer Assessment — round 3

**Verdict:** APPROVED.

Round-3 delta is one test file. R2-A is closed, and closed correctly on the
second attempt after the first attempt failed for a reason Dev caught and
reported rather than shipped.

### R2-A — verified closed, on all three axes

I did not take the Dev Assessment's table on trust; I re-derived and re-ran it.

**The arithmetic is real.** The test now resets `frameAcc` to 0 after the hit and
claims a schedule. Computed independently from `TICK_HZ = 246.094/12` and
`DT = 1/60`:

| step | ticks | `frameAcc` after |
|---|---|---|
| 1 | 0 | 0.01667 |
| 2 | 0 | 0.03333 |
| 3 | **1** | 0.00124 |

`tickPeriod = 0.048762`. So `[true, true, false, false, false, false]` is derived
from stated constants, not observed and back-filled. That is the difference
between this and the round-2 version.

**It is phase-independent.** The probe that broke the old assertion — one extra
idle step before the hit — leaves this one passing.

**It still kills the mutation.** Under the `applyManeuver`-rebuild mutation,
**both** cadence tests fail again (2 failed / 24 passed). That restores the
strength Dev's first attempt lost, which is the whole point: attempt 1 was
phase-independent but blind, because `[false, false, …]` satisfied
"cleared and never re-asserts" just as well as a correct run did.

**Credit where due:** the shape I proposed in R2-A was the wrong fix. Dev
implemented it, tested it against the mutation, found it went blind, said so
explicitly in the assessment, and replaced it with something better. That is the
behaviour this pipeline is supposed to produce, and it is worth more than the
finding was.

### Story-level verification

All six ACs met, with the AC-1/AC-3 wording reconciled to the ROM under TEA's
logged deviation (which I re-checked against `WSCPU.MAC:344-358` in round 1 and
accept):

| AC | Status |
|---|---|
| 1 — per-fighter signal, threaded like `firedGun`, not module state | met; the "two fighters in one pass disagree" test forbids a module latch |
| 2 — cited ROM rule or logged deviation | met by deviation, with the source pinned in-suite so it cannot be re-litigated |
| 3 — a C_AH-gated branch observably reachable | met; Darth's `TCH1D3` weave cuts short into the C_AS arm, proven at real cadence |
| 4 — per-step event, never latched | met; and the VM-less latch hazard is explicitly tested |
| 5 — mutation-proven | met, and then some: **11 mutations** across three rounds, every one killed |
| 6 — the TODO retired | met; rewritten in place per the logged narrowing |

Final state: **2006/2006**, `tsc` + `vite` clean, tree clean, 13 files
(4 real + 9 citation re-anchors verified `"line"`-key-only), zero smells.

**No Critical, High, Medium or Low findings remain.**

**Handoff:** to SM (The Announcer) for the finish ceremony. Two carry-forwards
are already recorded in Delivery Findings and must not be lost at archive:
**uf1-12** (filed, the C_PS twin of this defect) and the **epic-YAML correction**
for uf1-3's own wrong premise, which is owned by this story's finish.