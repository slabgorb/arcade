---
story_id: "tp1-27"
jira_key: "tp1-27"
epic: ""
workflow: "tdd"
---
# Story tp1-27: PLAYER_RIM_DEPTH = 0.92 is an invented constant, and tp1-24 just made it load-bearing — derive the grab line from the ROM byte or ratify it

## Story Details
- **ID:** tp1-27
- **Jira Key:** tp1-27
- **Workflow:** tdd
- **Repos:** tempest
- **Branch:** feat/tp1-27-player-rim-depth
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-14T13:44:32Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-14T13:00:03Z | 2026-07-14T13:02:28Z | 2m 25s |
| red | 2026-07-14T13:02:28Z | 2026-07-14T13:25:18Z | 22m 50s |
| green | 2026-07-14T13:25:18Z | 2026-07-14T13:31:33Z | 6m 15s |
| review | 2026-07-14T13:31:33Z | 2026-07-14T13:44:32Z | 12m 59s |
| finish | 2026-07-14T13:44:32Z | - | - |

## SM Assessment

Story tp1-27 is a 2pt ROM-fidelity audit in `tempest`, routed `tdd` (phased).
Setup complete: branch `feat/tp1-27-player-rim-depth` off `develop`, context at
`sprint/context/context-story-tp1-27.md`.

**Why this is a real story and not a comment fix:** `PLAYER_RIM_DEPTH = 0.92` is the
only constant in `rules.ts` that is a round decimal with a bare comment. That is the
exact fingerprint of two constants this epic has already caught and killed
(TANKER_SPLIT_DEPTH = 0.9 in tp1-5, SPLIT_CHILD_DEPTH = 0.85 in tp1-24). Inverting it
gives INVAY = 33.92, which is not a clean ROM byte. It was harmless until tp1-24
removed the child-depth clamp and ratified a difficulty change stated entirely in
terms of this line — so the grab line now sets how lethal the game is, and it has
never been audited.

**Routing:** RED phase to Han Solo. Two things I want the tests to pin, both called
out in the context:
- tp1-24's existing suite asserts children are born above `PLAYER_RIM_DEPTH`. If this
  story moves the constant, those assertions re-derive and go green **vacuously**.
  They must be pinned to literals or they prove nothing.
- The `[0.92, 0.9286)` band — where a bullet-split child is born both lethal and
  flipping — is newly reachable since tp1-24 and has zero coverage today.

The ROM answer drives the code, not the reverse: no edit to `rules.ts:84` before the
byte is quoted from `ALWELG.MAC`.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED — 9 failing, 985 passing, `tsc --noEmit` clean.

### The answer: there is no byte, because there is no threshold

The story asked for "the byte the ROM compares INVAY against" in the kill check. **There isn't one.**
`JKITST` (ALWELG.MAC:1980-1993) tests exactly two things — the invader is not mid-jump, and both its
legs are on both of the cursor's legs. It never reads `INVAY`. The depth gate lives one level up, in
*who is allowed to run it*: the opcode `VKITST` appears in exactly ONE cam program in the whole
cabinet — `TOPPER`, the CHASER cam (2447-2452). Only a chaser can grab. And an invader becomes a
chaser in exactly one place:

    CHASER: LDA CURSY      ;PLACE EXACTLY AT TOP
            STA X,INVAY                             (ALWELG.MAC:1824-1826)

reached from the climb by `CMP CURSY / BEQ ATOP / IFCC` (1744-1747). So the grab line **is the rim** —
the line the cursor itself sits on:

    CURSY = ILINLIY = $10                (ALWELG.MAC:57-58 · ALCOMN.MAC:820)
    depth = (0xF0 - 0x10) / 224 = 1.0    <- exactly the rim

`PLAYER_RIM_DEPTH = 0.92` inverts to INVAY **33.92** — not a byte, exactly as the story predicted.
It is a second, wrong spelling of a line `interpreter.ts` already carries correctly as `RIM_DEPTH = 1`
("the ROM's CURSY, the line the cursor sits on"). The defect it caused: an invader still **climbing**,
eight units short of the rim, grabbed a player the cabinet would never have touched.

**The fix is one line** — `export const PLAYER_RIM_DEPTH = (0xf0 - 0x10) / WARP_ALONG_SPAN`. I proved
it: with that change the FULL suite is **994/994 green, tsc clean**. `src/` is untouched on this branch.

### It inverts the story's own premise

With the grab line at 1.0 it sits **above** the burst line ($20 → 0.9286), so the AC-5 sliver
`[0.92, 0.9286)` is **empty**. No split child is ever born lethal — `ATOP` is tested *before* the
carrier check, so a carrier that actually reaches the rim becomes a chaser instead of bursting.
tp1-24 ratified a difficulty change ("children born above the grab line → the player dies on the
burst frame") that was pure artefact of the invented constant, and shipped a test named *"is
INSTANTLY lethal"* asserting it. That test is inverted and re-seated here; W-030's claim needs the
same correction (blocking Delivery Finding).

**Test Files:**
- `tests/core/tp1-27.player-rim-depth.test.ts` — new. 15 tests: the derivation, the chaser gate,
  the split-child consequences, the enemy-bolt guard, and a provenance suite that re-reads
  Theurer's ALWELG.MAC / ALCOMN.MAC.
- `tests/core/tp1-24.split-child-depth.test.ts` — 2 tests re-seated (see Deviations).
- 8 sibling suites — 19 staging sites re-seated from 0.95 to the true rim (see Deviations).

### Rule Coverage

The lang-review checklist targets `src/`; this is a test-only phase. Applicable rules:

| Rule | Test(s) / evidence | Status |
|------|--------------------|--------|
| #1 type-safety escapes | no `as any` / `@ts-ignore` / double-cast; `!` only after an explicit `toBeDefined()` guard | clean |
| #4 null/undefined | `isJumping(f!)` guarded by a preceding `expect(f).toBeDefined()` | clean |
| strict compile | `npx tsc --noEmit` → exit 0 | passing |
| TEA vacuity self-check | see below | 0 vacuous |

**Self-check (vacuous assertions):** 0 found in what I wrote. Every premise is pinned to a **literal**
(0.92, 0.9286, 1.0), never to the constant under audit — an assertion written as
`expect(depth).toBeLessThan(PLAYER_RIM_DEPTH)` re-derives from the very number being audited and stays
green for *any* value of it. That is precisely how 0.92 survived two stories that leaned on it, and it
is the trap the SM flagged. I also **mutation-proved the suite in both directions**: with the fix
applied, 994/994 green; without it, 9 fail.

**Guards that must stay green (they are green now):**
- `but a flipper that REACHES the rim on the player's lane DOES grab` — a "fix" that makes the grab
  line unreachable fails here.
- `a bolt riding the player's lane still reaches him` — `PLAYER_RIM_DEPTH` also gates
  `resolveEnemyBoltHits`; the ROM agrees (the enemy charge is tested `CMP CURSY / IFCC ;AT TOP?`,
  2562-2565), but moving the constant must not silently disarm enemy fire.
- 3 provenance tests re-read the 1981 source, so nobody can "correct" 0.92 back without going red.

**Handoff:** To Yoda (Dev) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 994/994 passing (GREEN) · `tsc --noEmit` clean · `npm run build` clean · citations 0 lost
**Branch:** `feat/tp1-27-player-rim-depth` (pushed, 0bfe7c3)

**Files Changed:**
- `src/core/rules.ts` — `PLAYER_RIM_DEPTH = (0xf0 - 0x10) / WARP_ALONG_SPAN` (= 1.0), with the
  ROM derivation in the comment: the grab has no threshold byte, so the constant is CURSY.
- `src/core/enemies/interpreter.ts` — `RIM_DEPTH` now derives from `PLAYER_RIM_DEPTH` instead of
  being an independent `1`. The repo was carrying ONE ROM constant under TWO spellings and the grab
  used the wrong one; that drift IS the defect, so I closed it rather than leave the two free to
  diverge again. (TEA's non-blocking Improvement finding.)
- `docs/audit/findings/pair-1-alwelg-sim-enemies.json` — added **W-049** (CONFIRMED,
  `remediated_by: tp1-27`) with both citations; **corrected W-030** (below).
- 6 other findings files — line-number re-anchoring only (`reanchor-citations.mjs --write`).

**AC coverage:**
| AC | Status |
|----|--------|
| 1 — quote the ROM byte | The kill check has none. Quoted the real gate byte-exact: `LDA CURSY ;PLACE EXACTLY AT TOP` (1825), `ILINLIY=010` (ALCOMN.MAC:820). |
| 2 — derive or ratify | **Derived.** `(0xf0 - 0x10) / WARP_ALONG_SPAN`, the same form as `SPLIT_TOO_CLOSE_DEPTH`. Not ratified. |
| 3 — a finding with both citations | W-049. |
| 4 — re-verify tp1-24's suite | Re-verified and **refuted**; TEA re-seated it, and W-030's claim is corrected to match. |
| 5 — cover the sliver | Covered by proving it **empty** — the grab line sits above the burst line. |
| 6 — citations green, 0 lost | ✓ (the gate caught a schema error in my first W-049: `recommendation` is an enum, not prose). |

**Resolution of TEA's blocking finding (W-030):** confirmed and fixed. W-030's claim asserted the
children "are born lethal and a player caught on a flanking lane is grabbed on the burst frame" —
which it measured against the invented 0.92. `ATOP` is tested *before* the carrier check
(ALWELG.MAC:1744-1750), so a carrier that actually reaches the rim becomes a CHASER instead of
bursting: a newborn child is always below the grab line and must climb to the rim first. The claim
and the tp1-24 REMEDIATION note now say so. The half tp1-24 genuinely landed — children born at the
parent's *exact* depth, no clamp — is byte-verified and stands untouched.

**Handoff:** To Obi-Wan (Reviewer).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 994/994, tsc clean, build clean, citations 12/12, reanchor 0 lost, no debug code, tree clean |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Disabled via settings — domain covered by me (see R-5, R-7, R-8, R-9) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Disabled via settings — domain covered by me (no new catch/throw/fallback in diff) |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | Disabled via settings — domain covered by me (see R-4, R-10) |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Disabled via settings — domain covered by me; **this is where both blocking findings came from** (R-1, R-2) |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Disabled via settings — covered by rule-checker TS-1..TS-5 + my cycle/TDZ analysis (R-6) |
| 7 | reviewer-security | Yes | Skipped | disabled | Disabled via settings — N/A: pure sim constant, no input/network/auth surface in diff |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Disabled via settings — covered by me; the 28-line comment block matches house style in rules.ts, not over-engineering |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 29 rules / 47 instances | N/A — confirmed no import cycle, no TDZ, no NaN, citation-gate compliant |

**All received:** Yes (2 ran, 7 pre-filled as disabled and covered directly)
**Total findings:** 2 confirmed (High), 2 confirmed (Low), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict: APPROVED** (findings R-1/R-2/R-3 were raised as REQUEST CHANGES, then fixed in-phase at the Jedi's
direction — they were two comment blocks. Fix committed as `863921b`. Re-verified after: 994/994, tsc clean, build
clean, `reanchor --write` re-run because `sim.ts` is cited (WD-016 moved 634→641), citations 0 lost.)

**Rework applied (R-1, R-2, R-3):** both comment blocks now state the corrected mechanism and explicitly retract
tp1-24's burst-frame claim, with the ROM citation (ATOP precedes the carrier check, 1744-1750). One thing worth
recording: my first draft of the `sim.ts` comment wrote "reaction window." and **`events.test.ts` failed** — its
pure-core guard greps `sim.ts` for `/\bwindow\s*\./`. A prose-only edit was caught by the architectural boundary
test. The guard works, and it is a reminder that in this repo even the comments are load-bearing.

The engineering is right and I could not break it. The ROM reading is correct — I verified all four load-bearing
claims against Theurer's source myself rather than take them from TEA or Dev, and they hold. The constant is
correctly derived, the drift is correctly closed, and the audit trail is correctly filed.

**But the repo now contradicts itself in prose.** Two comment blocks still assert, as ROM ground truth, the exact
claim this story refuted — one of them in the file Dev edited, 220 lines below his new comment saying the opposite.
In a fidelity-audit repo, a false ROM claim in a comment is not cosmetic: it is *precisely* the propagation
mechanism that produced this bug. tp1-24's ratified difficulty change came from reading `SPLIT_CHILD_DEPTH`'s
comment ("Must be < PLAYER_RIM_DEPTH (0.92) so a rim-split is not an instant grab") and believing it. Dev's own
Delivery Finding concedes the citation gate does not check code comments. Leaving these is how 0.92 comes back.

### Findings

**[DOC][HIGH] R-1 — `src/core/rules.ts:305-306` states the refuted claim, in the file this story fixed**
> `// parent's EXACT depth. A carrier that arrives on its own bursts at $20 — 0.9286, ABOVE the`
> `// 0.92 grab line — and a player on a flanking lane is grabbed on the burst frame.`

False on both counts now. `PLAYER_RIM_DEPTH` is 1.0, so 0.9286 is **below** it, and the burst-frame grab is exactly
what W-049 and the corrected W-030 retract. A reader who hits line 112 and then line 305 gets two contradictory
statements of ROM ground truth from the same file. This is the "one constant, two spellings" disease the story
exists to cure — reproduced in prose.

**[DOC][HIGH] R-2 — `src/core/sim.ts:237-239`, the doc block directly above `splitTanker`**
> `//      A carrier that arrives under its own steam bursts at 0.9286, which`
> `//      is ABOVE PLAYER_RIM_DEPTH (0.92), and drops both children there: a player caught`
> `//      on a flanking lane is grabbed on the burst frame, with no counterplay. That is the`
> `//      arcade, and tp1-24 ratified it.`

"That is the arcade" — it is not. `ATOP` is tested *before* the carrier check (ALWELG.MAC:1744-1750), so a carrier
that reaches the rim becomes a CHASER instead of bursting, and a newborn child is always below the grab line. This
comment sits on top of `splitTanker`, the one function whose observable behaviour this story changed, and it tells
the next developer the opposite of what the code now does. `sim.ts` was not touched at all by this story.

> **Trap attached to the fix:** `sim.ts` is a *cited* file — W-010's `ours` quotes `sim.ts:468` and W-030's quotes
> `sim.ts:222`. Editing these comments shifts those anchors, so
> `node tools/audit/reanchor-citations.mjs --write` MUST be re-run afterwards or the citation gate goes red on the
> next story with a confusing "does not match verbatim" (CLAUDE.md, rule 2).

**[DOC][LOW] R-3 — `src/core/rules.ts:300`** quotes the deleted constant's old comment historically
("Must be < PLAYER_RIM_DEPTH (0.92)…"). As *history* that is legitimate and I am not asking for its removal — but
the bare `(0.92)` now reads as a live value. Fold a one-clause note into the R-1 fix.

**[TEST][LOW] R-4 — the provenance suite silently evaporates in CI.**
`describe.skipIf(!sourceAvailable)` (tp1-27.player-rim-depth.test.ts) defaults `TEMPEST_SOURCE_DIR` to an absolute
path on this developer's machine. On a GitHub runner the three ROM-provenance tests **skip**, so the claim "nobody
can put 0.92 back without going red" does not hold in CI. Accepted, not blocking: the *derivation* tests
(`inverts to a WHOLE ROM byte`, `is CURSY = ILINLIY = $10`, `sits ABOVE the carrier burst line`) are pure-constant
and run everywhere, and they fail hard on any revert. The pattern also matches the existing
`tests/audit/alsoun-cue-mapping.test.ts:318`. Worth an epic-level fix (ship the source fingerprint, not the path).

### Verified (with evidence)

- **[VERIFIED] R-5 — the ROM reading is sound. I re-derived it independently, not from the handoff.**
  `grep VKITST ALWELG.MAC` → exactly 2 hits: the opcode definition (`CAMAC JKITST,VKITST,18`, :1624) and ONE use,
  `KICHEK: VKITST` (:2450), inside `TOPPER:` (:2447). `sed -n '1980,1993p' | grep -c INVAY` → **0**: the grab tests
  no depth. `CHASER:` (:1824-1826) = `LDA CURSY / STA X,INVAY ;PLACE EXACTLY AT TOP`. `ALCOMN.MAC:820` =
  `ILINLIY=010`. `:1744-1747` (ATOP) precedes `:1748-1750` (the carrier check). Therefore the grab line is
  (0xF0−0x10)/224 = **1.0**. Confirmed, including against the same 3569-line copy the tests resolve against.
- **[VERIFIED] R-6 — no import cycle, no temporal-dead-zone.** `interpreter.ts → rules.ts` was **already** a value
  import before this change (`WARP_ALONG_SPAN`, interpreter.ts:30), so the new binding adds no edge. `rules.ts`
  imports only `./state` (type-only), `./enemies/cam` (which has **zero** imports), `./assert`, and the shared rng —
  no path back to `interpreter.ts`. `WARP_ALONG_SPAN` is declared at rules.ts:60, `PLAYER_RIM_DEPTH` at :112 — same
  module, top-to-bottom, no TDZ. `madge --circular` reports only the two pre-existing type-only cycles. Rule-checker
  JS-9 reached this independently.
- **[VERIFIED] R-7 — the fuseball kill path did NOT silently die.** This was my main correctness worry:
  `GRABBER_KINDS` contains `fuseball` and `pulsar`, and interpreter.ts:432 says a fuseball "never becomes a chaser",
  so if it could not reach depth 1.0 it would have grabbed at 0.92 before and *never* grab now — a regression a green
  suite would hide. I probed it (throwaway test, since removed; tree clean): a fuseball climbing the player's lane
  reaches the rim and **still kills**. It uses `moveAlong`, whose clamp is `Math.min(RIM_DEPTH, …)` — so it lands
  exactly on the line. The ROM agrees: `JFUSKI` (:1994-2000) kills on `CMP CURSY / IFEQ ;SAME HEIGHT?`, the same
  CURSY. The pulsar killed at depth 0.706 — via the **pulse** (`PULPOT`, W-027), a separate path this change does not
  touch — so it is unaffected too.
- **[VERIFIED] R-8 — float exactness, and the unification is what makes it safe.**
  `(0xf0-0x10)/224 = 224/224 = 1.0` exactly in IEEE-754 (no rounding). An enemy's depth is clamped by
  `Math.min(RIM_DEPTH, …)` where `RIM_DEPTH === PLAYER_RIM_DEPTH` is now the *same binding* — so a clamped enemy sits
  on a value bit-identical to the one `>=` compares against, and the grab cannot be lost to an epsilon. Had Dev
  changed only the value and left `RIM_DEPTH = 1` as a separate literal, this would still work today but would be one
  careless edit away from an off-by-1-ulp silent failure. The unification is correct, not scope creep.
- **[VERIFIED] R-9 — the enemy bolt still lands.** `PLAYER_RIM_DEPTH` also gates `resolveEnemyBoltHits`
  (sim.ts:334), and bolts are culled at `depth > 1` — so if the kill line were unreachable the cull would eat every
  bolt and enemy fire would silently die. `stepPlaying` runs `resolveEnemyBoltHits` **before** `cullEnemyBullets`
  (sim.ts:739 vs :741), and bolt depth is unclamped (`b.depth += speed*dt`), so a bolt always gets exactly one frame
  at `depth >= 1.0` to connect. TEA's guard test covers it and is green. The ROM agrees the two share a line
  (`CMP CURSY / IFCC ;AT TOP?`, :2562-2565).
- **[RULE] R-11 — reviewer-rule-checker: clean, 0 violations across 29 rules / 47 instances.** Nothing to confirm,
  but two of its checks are load-bearing and I am recording them rather than letting a "clean" row stand mute:
  **JS-9** independently reached my no-cycle/no-TDZ conclusion (rules.ts → `./enemies/cam`, which has zero imports;
  no path back to interpreter.ts), and **A2** verified the citation gate's *enforced* semantics by reading
  `check-citations.mjs` itself before judging — confirming W-049's `remediated_by` correctly freezes its `ours`
  quote as history and that all 30+ shifted anchors re-resolve. TS-1 confirmed every `!` in the new suite is
  guarded. No rule-matching finding was dismissed, because none was raised.
- **[VERIFIED] R-10 — the W-030 amendment actually landed.** Dev applied it with a Python `str.replace`, which
  silently no-ops on a miss and would have left a false "corrected" claim in the assessment. Checked the JSON
  directly: `[CORRECTED, tp1-27]` present in `claim`, `[CORRECTION, tp1-27]` present in `reasoning`, and the old
  sentence ("children are born lethal … grabbed on the burst frame") **gone**. W-049 is well-formed
  (`remediated_by: tp1-27`, `ours` frozen on the old 0.92 line as history, per CLAUDE.md rule 1).

### Rule Compliance

| Rule (source) | Instances checked | Result |
|---|---|---|
| **core/ purity** — no shell import, no DOM, no `Date.now`/`Math.random`/`performance.now`/rAF (CLAUDE.md, "the most important rule") | 2 changed core files | **Compliant.** `PLAYER_RIM_DEPTH` is a pure arithmetic derivation of two module constants; `RIM_DEPTH` is an alias. Grepped the whole diff for every banned API — zero matches. Determinism untouched. |
| **Citation gate** — `remediated_by` on fixed findings; reanchor on touched cited files; `ours` names a tracked repo file (CLAUDE.md) | W-049, W-030, 30+ reanchored citations across 7 files | **Compliant.** W-049 carries `remediated_by: tp1-27`; reanchor reports `172 already correct, 0 lost`; gate 12/12. `ours` never names `node_modules`. |
| **Tube space** — `depth ∈ [0=far, 1=near]` (CLAUDE.md) | `PLAYER_RIM_DEPTH = 1.0`; 19 re-seated fixtures | **Compliant.** 1.0 is the near rim by definition — the constant now equals the axis maximum, which is exactly what "the rim" means. No fixture out of range. |
| **TS #1 type-safety escapes** | 4 (`f!` in the new suite) | **Compliant.** Every `!` is guarded by a preceding `expect(...).toBeDefined()`. No `as any`, no `@ts-ignore`. |
| **TS #4 null/undefined (`??` not `||`)** | 2 | **Compliant.** `process.env.TEMPEST_SOURCE_DIR ?? '…'`. Matters here because `0` is a valid depth. |
| **JS #4 equality/coercion** | 6 | **Compliant.** All numeric comparisons explicit; no truthy test on a depth (where `0` = far rim is falsy-but-valid). |
| **JS #8 / TDD policy — no skipped tests** | 10 changed test files | **Compliant with one caveat (R-4).** No `.only`/`.skip`; the one `describe.skipIf` is an environment guard with a documented reason and an established precedent. |
| **JS #9 module scope / circular deps** | 3 | **Compliant.** See R-6. |
| **Tenant isolation** | — | **N/A.** No tenants, no auth, no multi-user surface — a single-player browser sim with no backend. |

### Devil's Advocate

Let me try to break this properly, because a 994/994 suite is exactly the condition under which a reviewer gets lazy.

*The strongest attack is that the whole story is a self-consistent delusion.* TEA read the ROM, wrote tests asserting
what it read, and Dev changed the constant to satisfy them. If the ROM reading were wrong, every artefact — tests,
constant, finding, corrected W-030 — would be wrong *together*, and the suite would still be green. That is a real
failure mode and it is why I re-derived the four claims from the source myself instead of reading the handoff. They
hold. The decisive one is mechanical and hard to fool: `VKITST` occurs **twice** in 3569 lines, and one of those is
its own opcode definition. There is no second cam that can grab. If someone wants to overturn this, that grep is
where they must start.

*Second attack: the fix makes the game measurably easier, and nobody signed off on that.* True — enemies must now
climb ~8 more along-units (≈6 frames at wave 1) before they can grab, and bolts kill ~2 frames later. The player also
gets his reaction window back on a tanker burst, which tp1-24 explicitly took away and called authentic. That is a
real, player-visible difficulty regression relative to what shipped last week. I accept it because the epic's contract
is fidelity, not feel, and the ROM is unambiguous — but it deserves to be *said out loud* rather than buried, because
the previous story ratified the opposite change on the strength of a number nobody had checked. If the Jedi wants the
harder game, that is a design decision to take deliberately, not to inherit from an unaudited constant.

*Third: the silent-death scenarios.* Two constants moved that gate kill paths. If a fuseball, pulsar, or bolt could not
*reach* depth 1.0, the corresponding kill would silently never fire and the suite would stay green because nothing
asserted those paths at the rim. I probed all three rather than reason about them. Fuseball: reaches the rim, kills.
Bolt: hit is resolved before the cull, so it always gets its frame. Pulsar: kills via the pulse, a different constant
entirely. Nothing died.

*Fourth: a confused reader.* This is where the change actually fails, and it is what my two High findings are. The
codebase now says, in `rules.ts` and in `sim.ts`, that a split child is born above the grab line and kills on the burst
frame — while `rules.ts:112` and `docs/audit/findings/` say the opposite. The next fidelity story will read one of
them. Given that this exact bug was *born* from a developer trusting a comment, shipping two false ones is not a
nitpick; it is the bug's reproductive cycle.

**Required before approval:** ~~fix R-1 and R-2 (and fold R-3 in), then re-run
`node tools/audit/reanchor-citations.mjs --write` because `sim.ts` is a cited file.~~ **DONE** — applied in-phase
(`863921b`), reanchor re-run, suite green. R-4 is a note for the epic, not a blocker.

**Handoff:** To Thrawn (SM) for finish.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Conflict** (blocking): W-030's `claim` states that in the arcade "the children are born lethal
  and a player caught on a flanking lane is grabbed on the burst frame". The ROM refutes this — the
  grab is reachable only from the CHASER cam (`VKITST` occurs in `TOPPER` and nowhere else) and
  `ATOP` is tested BEFORE the carrier check (ALWELG.MAC:1744-1750), so a carrier that reaches the rim
  becomes a chaser instead of bursting. No child is ever born lethal. Affects
  `docs/audit/findings/pair-1-alwelg-sim-enemies.json` (W-030's `claim` and `reasoning` must be
  corrected when AC-3's new finding is added — shipping two contradictory findings is worse than
  either one alone). The other half of W-030 — children born at the parent's exact depth — stands.
  *Found by TEA during test design.*

- **Improvement** (non-blocking): `PLAYER_RIM_DEPTH` (rules.ts:84) and `RIM_DEPTH` (interpreter.ts:53)
  are two spellings of ONE ROM line — CURSY. interpreter.ts already documents its copy correctly
  ("the ROM's CURSY, the line the cursor sits on") and has the right value. Consider exporting the
  single derived constant from `rules.ts` and importing it in `interpreter.ts`, so the two cannot
  drift apart again — the drift IS this story. Affects `src/core/rules.ts`, `src/core/enemies/interpreter.ts`.
  *Found by TEA during test design.*

- **Gap** (non-blocking): `rules.ts:102` cites `ALWELG.MAC:2606` for `SCORE_SPIKE_SEGMENT`, but in the
  canonical source (`/Users/slabgorb/Projects/tempest-source-text`, 3569 lines — what the tests use)
  line 2606 is `;REQUEST LINE DESTRUCTION PIC.`; the real `STA TEMP0` / `JSR UPSCORE` is at **2614-2615**.
  The citation resolves only against a SECOND, 3559-line copy of ALWELG.MAC at
  `/Users/slabgorb/Projects/tempest-source` (form-feed staircase; the two disagree by up to 10 lines).
  Code-comment citations are not covered by the citation gate — it only checks
  `docs/audit/findings/*.json` — so they drift silently. Not this story's constant; flagging for the
  epic. Affects `src/core/rules.ts:102`. *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): the citation gate validates `docs/audit/findings/*.json` but NOT the
  ROM citations written in code comments, which is why TEA's `rules.ts:102` drift (above) went unseen —
  and this story's fix adds a large block of new ones to `rules.ts`. Every citation I added is
  test-covered by the provenance suite in `tests/core/tp1-27.player-rim-depth.test.ts`, but that is a
  per-story convention, not a gate. Consider extending `tools/audit/check-citations.mjs` to also verify
  `ALWELG.MAC:NNNN`-style references found in `src/**/*.ts` comments. Affects
  `tools/audit/check-citations.mjs`. *Found by Dev during implementation.*

- **Question** (non-blocking): `GRABBER_KINDS` (sim.ts) includes `fuseball`, and the grab now requires
  depth ≥ 1.0. The ROM gives the fuseball its OWN kill opcode — `JFUSKI` (ALWELG.MAC:1994-2000) tests
  `LDA X,INVAY / CMP CURSY / IFEQ ;SAME HEIGHT?`, i.e. exact equality with CURSY, not the chaser cam —
  so it lands on the same line (depth 1.0) and the suite is green. But it is a *different opcode with
  different reachability*, and nobody has audited whether our fuseball reaches the rim on the same
  frames the cabinet's does. Worth its own finding if the epic wants the fuseball's touch verified
  rather than assumed. Affects `src/core/sim.ts` (GRABBER_KINDS). *Found by Dev during implementation.*

### Reviewer (review)

- **Gap** (non-blocking): the ROM-provenance suites default `TEMPEST_SOURCE_DIR` to an absolute path on one
  developer's machine and `skipIf` themselves out when it is absent — so on CI they silently skip and prove nothing.
  This story's constant-derivation tests still guard the value everywhere, so it is not blocking here, but the epic
  is accumulating "provenance" suites whose guarantee evaporates in CI. Consider committing a *fingerprint* of the
  canonical source (line count + a few anchored lines, as red-baron does) so a wrong or missing quarry fails loudly
  instead of skipping. Affects `tests/core/tp1-27.player-rim-depth.test.ts`,
  `tests/audit/alsoun-cue-mapping.test.ts`, `tests/audit/citations.test.ts`. *Found by Reviewer during review.*

- **Improvement** (non-blocking): I confirmed TEA's `rules.ts:102` citation drift independently — and it is a symptom,
  not a one-off. There are TWO copies of the Tempest source on this machine (3569-line canonical at
  `~/Projects/tempest-source-text`, 3559-line sibling at `~/Projects/tempest-source`) whose line numbers diverge in a
  form-feed staircase, exactly as the red-baron quarry does. Any citation typed from the wrong copy resolves
  plausibly and is off by 1-10 lines. The citation gate only checks `docs/audit/findings/*.json`, so every
  `ALWELG.MAC:NNNN` in a code comment — including the large block this story just added — is unverified. Dev raised
  the tooling half; I am adding the *cause*. Affects `tools/audit/check-citations.mjs`. *Found by Reviewer during review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **AC-5's "lethal AND flipping" sliver is REFUTED, not covered as written**
  - Spec source: context-story-tp1-27.md, AC-5
  - Spec text: "Cover the newly-reachable sliver [PLAYER_RIM_DEPTH, SPLIT_TOO_CLOSE_DEPTH): a tanker
    SHOT in that band drops children that are both lethal (above the grab line) AND flipping (below
    the too-close line)."
  - Implementation: the suite asserts the band is EMPTY and that such a child is NOT lethal
    (`leaves the "lethal AND flipping" sliver EMPTY`, `a tanker SHOT in the old sliver drops children
    that cannot grab either`).
  - Rationale: the AC's "lethal" half is derived from the very constant under audit. With the grab
    line derived from CURSY ($10 → depth 1.0) it sits ABOVE the burst line ($20 → 0.9286), so the
    interval is inverted and empty. The band is covered — by proving it does not exist.
  - Severity: major
  - Forward impact: tp1-24's ratified difficulty change is void; W-030's claim needs correcting
    (see the blocking Delivery Finding).

- **tp1-24's "is INSTANTLY lethal" test inverted and re-seated**
  - Spec source: context-story-tp1-27.md, AC-4
  - Spec text: "Re-verify both against the new line — do not just let them re-derive and go green
    vacuously."
  - Implementation: the test now asserts the player SURVIVES the burst frame and dies once the
    children climb to the rim (both halves, so "survives" cannot pass on an inert board); retitled.
    Its `toBeGreaterThan(PLAYER_RIM_DEPTH)` assertion was replaced with the literal `toBeLessThan(1)`.
  - Rationale: re-verification refuted it. The old assertion was circular — it re-derived from the
    constant being audited and would stay green for any value of it.
  - Severity: major
  - Forward impact: Dev must NOT "fix" this by reverting the constant; the ROM citations are in the
    test header.

- **19 enemy/bolt staging sites re-seated across 8 sibling suites**
  - Spec source: context-story-tp1-27.md, Scope
  - Spec text: "In scope: deriving or ratifying PLAYER_RIM_DEPTH …, and test coverage of the band."
  - Implementation: staging depth `0.95` → `1` in sim.death, sim.enemy-authentic, sim.enemy-bolt,
    sim.events, sim.flipper-flip, sim.level, sim.respawn, sim.warp-death-respawn.
  - Rationale: every one stages an enemy/bolt at 0.95 and calls it "at the rim" — they encode the same
    invented constant. Their intent ("an enemy at the rim grabs") is unchanged and still correct; only
    the staging depth was stale. Re-seated to the literal 1, which is the near rim by definition of the
    tube axis (depth 0 = far, 1 = near), NOT to `PLAYER_RIM_DEPTH` — staging at the constant under audit
    would make them vacuous. Verified green under BOTH the old and the new constant.
  - Severity: minor
  - Forward impact: none — they pass before and after the fix.

### Dev (implementation)

- **Unified `RIM_DEPTH` with `PLAYER_RIM_DEPTH` — beyond the minimum the tests demanded**
  - Spec source: session file, TEA Delivery Finding (Improvement, non-blocking)
  - Spec text: "Consider exporting the single derived constant from `rules.ts` and importing it in
    `interpreter.ts`, so the two cannot drift apart again — the drift IS this story."
  - Implementation: `interpreter.ts`'s `const RIM_DEPTH = 1` is now `const RIM_DEPTH = PLAYER_RIM_DEPTH`.
    No test required this; the suite is green either way.
  - Rationale: minimalist discipline says implement only what the tests demand, and I weighed leaving
    it. But the *defect* in this story is not the number — it is that one ROM line was spelled twice and
    the grab read the wrong copy. Fixing only the value leaves the mechanism that produced the bug fully
    intact, and the next person to touch either constant re-opens it. One line, no behaviour change.
  - Severity: minor
  - Forward impact: `interpreter.ts` now imports `PLAYER_RIM_DEPTH` from `rules.ts` (that direction of
    dependency already existed — it imports `WARP_ALONG_SPAN` and others). No cycle.

- **Corrected an existing finding (W-030) rather than only adding the new one**
  - Spec source: context-story-tp1-27.md, AC-3
  - Spec text: "it is a FINDING in docs/audit/findings/ with both citations, so the grab line stops
    being the one number in rules.ts that nobody has ever checked."
  - Implementation: added W-049 as specified, AND amended W-030's `claim` and `reasoning`, which
    asserted the opposite of what the ROM says.
  - Rationale: TEA raised this as blocking and it is. AC-3 asks for a finding that settles the grab
    line; leaving W-030 next to it still claiming children are "born lethal" would ship two findings
    that contradict each other, which is worse than either alone. The correction is marked inline
    (`[CORRECTED, tp1-27]`) rather than rewriting history, matching how tp1-5/tp1-24 annotated the same
    finding.
  - Severity: minor
  - Forward impact: none — W-030's byte-verified half (children born at the parent's exact depth) is
    unchanged, and its `remediated_by: tp1-24` stamp still stands.