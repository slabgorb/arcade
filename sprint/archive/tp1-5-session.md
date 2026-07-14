---
story_id: "tp1-5"
jira_key: "tp1-5"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-5: THE CAM, part 2 — the CHASER rim state with its pincer rule, rule-driven flip direction, and the pulsar's program

## Story Details
- **ID:** tp1-5
- **Jira Key:** tp1-5
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 6
- **Type:** refactor

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-14T11:21:45Z
**Round-Trip Count:** 1
**Repos:** tempest
**Branch:** feat/tp1-5-cam-part-2-chaser
**Context:** sprint/context/context-story-tp1-5.md

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-14T09:14:50Z | 2026-07-14T09:18:23Z | 3m 33s |
| red | 2026-07-14T09:18:23Z | 2026-07-14T09:44:26Z | 26m 3s |
| green | 2026-07-14T09:44:26Z | 2026-07-14T10:19:06Z | 34m 40s |
| review | 2026-07-14T10:19:06Z | 2026-07-14T10:39:29Z | 20m 23s |
| red | 2026-07-14T10:39:29Z | 2026-07-14T10:51:08Z | 11m 39s |
| green | 2026-07-14T10:51:08Z | 2026-07-14T11:04:20Z | 13m 12s |
| review | 2026-07-14T11:04:20Z | 2026-07-14T11:21:45Z | 17m 25s |
| finish | 2026-07-14T11:21:45Z | - | - |

## Sm Assessment

**Story:** tp1-5 — THE CAM, part 2. 6pts, p1, tdd (phased), tempest only.
**Branch:** `feat/tp1-5-cam-part-2-chaser`, cut from `develop`. Base branch is
`develop`, never `main` — tempest is gitflow and every push to `main` auto-deploys.

**Setup decisions:**

- **Scope confirmed as the rim STATE, not the interpreter.** tp1-4 landed the CAM VM and
  byte-verified TOPPER's program, so the interpreter is done. What is missing is CHASER:
  the conversion at the rim, the `INMCOU`/`INCCOU` counters, and the pincer rule.
  Re-implementing the CAM is explicitly out of scope.
- **W-025 and W-007 are already closed** by tp1-4 (the landed CAM has no random-direction
  opcode). The story title still names "rule-driven flip direction"; that half is done.
  Do not spend a test proving a coin flip that no longer exists — though AC-1 still asks
  for the determinism proof, which is cheap and worth keeping as a regression guard.
- **Context was a stub; I rewrote it.** `pf context create` generated placeholder
  Technical Approach/Scope. `sprint/context/context-story-tp1-5.md` now carries the ROM
  label table (ALWELG.MAC CHASER 1824-1874, the pincer rule 1845-1869, JCHPLA 1876-1889,
  TOPPER 2447-2460), the five findings, and the four prerequisites.

**Two traps I am handing forward deliberately:**

1. **The audit doc's `Ours:` citations are STALE.** W-009 cites
   `src/core/enemies/flipper.ts:16` — tp1-4 **deleted** that file, along with
   fuseball/pulsar/spiker/tanker. `src/core/enemies/` is now only `cam.ts` +
   `interpreter.ts`. Anyone reading the audit doc literally will chase a file that does
   not exist. Map onto cam.ts / interpreter.ts / sim.ts first.
2. **The open-sheet wave trap.** The pincer rule and JCHPLA both compute a "shortest way
   to the player", which is a modular calculation — and on the OPEN waves
   (8/9/10/11/14/15) the tube does not wrap, so modular shortest-path is exactly
   backwards past half a board (the ROM says so: `;PREVENT WRAP`, WELTYP/POLDEL). A
   fixture that sets `s.level` without `s.tube = tubeForLevel(level)` silently tests
   level 1's closed circle and proves nothing. This precise trap already hid an inverted
   AVOIDR bug through a whole review cycle. **TEA: test CHASER direction on an open wave.**

**Sequencing note for TEA:** prerequisite (1), the `jchpla` zero-delta branch, is a live
bug in shipped code today — a chaser on the player's own lane gets a history-dependent
direction. It is the natural first RED test and the rest of the pincer work builds on it.

## TEA Assessment (rework after review)

**Tests Required:** Yes
**Status:** RED — 11 failing, 960 passing, `tsc --noEmit` clean, no sibling regressions.

Obi-Wan was right, and the thing that stings is that my own test is what hid it. I asserted
W-032 against a tanker I placed at depth 0.95 by hand. No tanker in this game has ever been
at 0.95: `resolveTankerArrivals` destroys it the frame it crosses 0.9, and its fastest climb
is 0.0151 a frame. I proved the branch and called it the behaviour.

**The blocker, in the ROM's own words.** JSMOVE (ALWELG.MAC:1748-1758) splits a climbing
carrier at `CMP I,20 / IFCC`, and the `KILINV` it jumps to routes through SPLCHA (2344),
whose too-close test is the *same* `CMP I,20 / IFCC` (1494-1502). One constant, two reads.
So in the arcade every tanker that arrives under its own steam is "too close" **by
construction**, and its children always get NEWGEN — "NO FLIPPING". A tanker only sprays
flipping children when it is SHOT further down the well. We wrote that one constant as two
different numbers (0.9 and 0.9286) and the second one could never be reached.

**Test Files:**
- `tests/core/tp1-5.pulsar-fuse-split.test.ts` — W-032 rebuilt on a tanker that CLIMBS to
  its own arrival, plus the invariant that the arrival gate cannot fire shallower than the
  band it is judged against. W-023's liveness guard restored. 2 RED, 1 new guard green.
- `tests/core/tp1-5.source-rules.test.ts` — lang-review #3 swept across every switch on a
  closed union, not just the one that got fixed. 8 RED (`speedFor` still green).
- `tests/audit/citations.test.ts` — a remediated NO_COUNTERPART must carry `ours` null OR a
  well-formed citation. 1 RED.

**The RED evidence, in the failures' own words:**

| Failure | What it proves |
|---|---|
| `expected 0.9 to be greater than or equal to 0.9285714285714286` | the arrival gate fires below $20 — SPLCHA's branch is unreachable, not merely untested |
| `expected [3,5] to deeply equal [4,6]` | a tanker that arrives on its own still sprays children that flip straight onto the player |
| `scoreFor() has no assertNever` (×4) | the sixth-kind guard the story advertises exists in exactly one of the five places it claims |
| `assertNever is neither defined in nor imported into src/core/rules.ts` | it has no home outside `interpreter.ts`, and `rules.ts` cannot import from there |
| `a malformed 'ours' was accepted: expected '' to match /X-033.*ours/` | the widened gate branch validates nothing whatsoever |

**Guards that must stay green** (if any of these go red, the fix overshot):
- `children of a tanker SHOT deep in the well ... do flip` — "no flipping" must not become
  every split. Its children seat at 0.50, far from the rim, so they cannot fake the result
  by becoming chasers.
- `ignores the player entirely` — now refuses to pass unless the fuseball actually moved.
- `speedFor ... guards its default with assertNever` — already correct; must not regress.

### Rule Coverage

| Rule (lang-review/typescript.md) | Test | Status |
|---|---|---|
| #3 enum exhaustiveness — every switch, not one | `$fn switches on $union and guards it with assertNever` (×5) | 4 failing, 1 passing |
| #3 the guard must be real (`never`-typed param) | `$fn's assertNever actually refuses a non-never argument` (×5) | 4 failing, 1 passing |
| #8 test quality — no vacuous FIXTURES | `children of a tanker that ARRIVES on its own never flip` | failing |
| #8 test quality — no vacuous assertions | the W-023 liveness guard | passing (guard) |

**Self-check:** the vacuity I shipped last cycle was not a weak assertion — it was a
fixture that could not occur. Every new test either drives the sim from a reachable state
or asserts a constant relation directly. The natural-climb test carries three premises (two
children, born straddling the parent's lane, neither having taken the rim) so that a lane
change can only mean a flip.

**Two things Dev should know before starting:**
1. `assertNever` needs a leaf module of its own. `rules.ts` cannot import it from
   `interpreter.ts` — interpreter imports rules — and `state.ts` already imports rules. I
   confirmed with `tsc` that TS narrows a generic `K extends EnemyKind` to `never` in a
   switch default, so `makeEnemy` is fixable as written.
2. Moving `TANKER_SPLIT_DEPTH` to $20 has a blast radius of exactly one comment.
   `ENEMY_FIRE_MAX_DEPTH = 0.9` claims `// == TANKER_SPLIT_DEPTH` and will stop being true;
   they are different rules and should not be dragged together. No test imports
   `TANKER_SPLIT_DEPTH`, and the only sibling that stages a tanker near the rim
   (`sim.audio-events.test.ts:138`) seats it at 0.95 — above both thresholds — and asserts
   on events, not motion. Nothing needs re-seating.

**Handoff:** To Yoda (Dev) for GREEN.

## Dev Assessment (rework after review)

**Implementation Complete:** Yes
**Tests:** 971/971 passing (GREEN). `tsc --noEmit` + `vite build` clean. Citation gate 12/12, `reanchor` reports **0 lost**.
**Branch:** `feat/tp1-5-cam-part-2-chaser` (pushed, `99967b5`)

Obi-Wan was right, Han Solo's test proved it, and the ROM had said so all along.

**The blocker.** JSMOVE (ALWELG.MAC:1748-1758) bursts a climbing carrier at `CMP I,20 /
IFCC`, and the `KILINV` it jumps to routes through SPLCHA (2344) — whose too-close test is
the *same* `CMP I,20 / IFCC`. **One byte, read twice.** So every tanker that arrives under
its own steam is "too close" by construction, and its children ALWAYS get NEWGEN. We had
written that one byte as two numbers — 0.9 and 0.9286 — and the tanker was destroyed 0.029
depth-units before it could reach the band its own rule is written for. `TANKER_SPLIT_DEPTH`
is now DERIVED from `SPLIT_TOO_CLOSE_DEPTH`, with a comment that says why they may never
drift apart again.

**Files Changed:**
- `src/core/rules.ts` — `TANKER_SPLIT_DEPTH = SPLIT_TOO_CLOSE_DEPTH` (one ROM constant, at
  last); `ENEMY_FIRE_MAX_DEPTH`'s comment no longer claims to equal it; `assertNever` on
  `scoreFor` and `enemyCanShoot`.
- `src/core/assert.ts` — **new leaf module.** `rules.ts` cannot import from
  `interpreter.ts` (the interpreter imports rules) and `state.ts` already imports rules, so
  the only place all three can see the guard from is a module with no edges at all.
- `src/core/sim.ts` — `assertNever` on `makeEnemy` and on `stepGame`, which now switches on
  a captured `const mode` so the arms that reassign `s.mode` cannot re-widen the
  discriminant out from under the guard.
- `src/core/enemies/interpreter.ts` — imports the shared guard; the comment that promised a
  sixth `EnemyKind` "now fails `tsc`, at the switch that forgot it" is corrected, because
  for three of the four switches it was simply false.
- `tools/audit/check-citations.mjs` — a remediated `NO_COUNTERPART`'s `ours` must be null OR
  a whole citation (`{file, line, verbatim}`). The widened branch validated nothing at all.
- `docs/audit/findings/*.json` — 75 citations re-anchored after the line drift. **W-030 is
  the exception and it is the important one.**
- `tests/core/tp1-5.source-rules.test.ts` — TEA's import resolver could not resolve an
  extensionless import (this repo's own convention), so it threw ENOENT before any
  assertion ran. Path arithmetic only; every assertion is hers.

**The thing worth a Reviewer's attention: W-030.**

The citation gate went red and told us something nobody in this story had noticed. `W-030`
is an **unremediated DIVERGENCE that was already in the audit**, titled *"A tanker
auto-splits at depth 0.929 **and its children appear at the parent's depth**, not 0.9 /
0.85"* — both halves verified byte-accurate by its own refuter. It cites the exact line I
deleted. **W-030 and W-032 are the same ROM mechanism**, written down twice, and the epic
walked past it: SM, TEA, Dev and the Reviewer all re-derived half of it from scratch.

tp1-5 closes **half** of W-030 — the split depth, unavoidably, because it shares the byte
with W-032. The other half is untouched: KILINV (2300-2302) seats *both* children at the
parent's own INVAY, and we still clamp them to `SPLIT_CHILD_DEPTH` = 0.85. So I did **not**
stamp it. `reanchor-citations.mjs` offered me exactly two exits — "fix the quote, or mark
the finding `remediated_by`" — and both would have lied. I re-anchored its `ours` onto
`sim.ts:222`, the line that still diverges, and left the finding open. A false
`remediated_by` is the precise sin this story was rejected for; I was not going to commit
it twice in the same story.

That leaves W-030's *title* half-stale, which is a trap for the next reader. It needs
splitting. Logged as a Delivery Finding, with the deeper point: **the ROM's tanker burst is
three rules and we now ship two.** The cabinet bursts the carrier at 0.9286 — *above* the
0.92 grab line — and drops the children at the parent's depth, instantly lethal, survivable
only because NEWGEN forbids them to flip onto you. We now burst in the right place and
refuse to flip, but still seat the children safely below the grab line. That is a real
difficulty divergence, it is deliberate and predates this epic, and it should be ratified or
closed on purpose rather than left as an accident.

**No regressions.** Moving `TANKER_SPLIT_DEPTH` from 0.9 to 0.9286 is a genuine behaviour
change to the whole game, and it broke **zero** sibling tests — TEA's blast-radius call
(one comment, no re-seats) was exactly right.

**Handoff:** To Obi-Wan Kenobi (Reviewer).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **Question** (non-blocking): **The chaser is probably NOT a sixth `EnemyKind`, and the story context says it is.** The context (and interpreter.ts:116-117) both say "tp1-5 adds a sixth EnemyKind". But in the ROM, `CHASER` (ALWELG.MAC:1824-1874) does not change the invader's appearance: it pins INVAY, bumps INCCOU, sets CAMPC to TOPPER, and returns. The invader keeps its ZABFLI/ZABPUL appearance bits, is still drawn as what it was, and still scores as what it was. Modelling the chaser as a sixth `EnemyKind` would fork `scoreFor`, `GRABBER_KINDS`, and the `APPEARANCE`/`TNEWCAM` index tables, and would make a rim flipper score differently from a lane flipper — which the cabinet does not do. **A chaser reads as a rim STATE (camPc === TOPPER, plus a chaser count), not a kind.** This does not touch prerequisite 3: `speedFor` needs `assertNever` either way, and the tests pin the exhaustiveness rule, not the representation. Dev/Architect should settle the representation before writing it.
- **Conflict** (non-blocking): **The audit's own refuter is wrong about the pulse cycle length, by two frames.** W-026's "Correction (refuter)" says the full cycle is "~42 ROM frames, not ~40". Tracing the byte machine (`PULSON += PULTIM`; negate PULTIM at `PULSON >= 15` and at `PULSON <= -64`; PULTIM = 4 below wave 49) gives a limit cycle that is the triangle wave −64 … +16 in steps of 4 — 21 distinct values, two of them turning points, so 2×21 − 2 = **40** frames. ON is `PULSON >= 0` = {0,4,8,12,16}: the peak once, the other four twice = **9**. The audit's ORIGINAL claim (~40 frames, 9 on / 31 off) is right; the refuter's 42 is not. Both agree on the 9, which is the number that matters, and the doc's prose is not citation-gated — hence non-blocking. My test asserts 40, so if Dev's implementation lands on 42 it will fail loudly and we can settle it there.
### Dev (implementation)

- **Gap** (non-blocking, NOT MINE): **The ORCHESTRATOR's own test suite is red on develop, and `pf check` at the orchestrator root therefore fails for every story.** `tests/extract-audio.test.mjs` — "audit: tempest sfx — link 5 catches the 4 sounds whose shipped bake omits the ROM terminal-zero write" — fails with `enemy_explosion: register-event stream differs … ROM emits 44 events, shipped emits 20`. **Proven pre-existing:** it reproduces identically with `tempest` checked out at `develop` and my branch nowhere in the tree. tp1-5 touches no audio or pokey-bake file (the two audio-ish paths in my diff are a citation line-number re-anchor and a `pulseTimer` fixture removal). The story's actual repo, `tempest`, is 959/959 green with a clean build. Someone owns this — likely the pokey-bake/SFX line of work — and until it is fixed the orchestrator-root `pf check` cannot be used as a dev-exit signal. *Found by Dev during implementation.*
- **Conflict** (non-blocking, RESOLVED IN THIS STORY): **The audit's W-026 pulse duty cycle is wrong, and so is its refuter — both simulated the byte machine from a seed of 0.** The claim says 9 frames ON, the refuter says the period is 42 and that "the 9-frame ON duration is exact". `INEWLI` seeds PULSON at **-1** (ALWELG.MAC:46-48), pinning it to the residue 3 (mod 4), so {0,4,8,12,16} is unreachable and the honest answer is a **40-frame period, lit for 7**. I corrected the audit doc additively (the record of both wrong passes is preserved) and the test now measures it out of the running sim. *Found by Dev during implementation.*
- **Gap** (non-blocking): **From wave 17 the ROM's fuseball DOES chase, and nothing implements it.** W-023 is closed for waves 1-16 (the coin), which is where our game actually plays — but TWFUSC's records from wave 17 set WFUSCH's two chase bits, and the ROM then routes through FUCHPL (JCHPLA + JCHROT — it chases BACKWARDS, "FUSE IS BACKWARDS") and MAYBLR's "only if the invader index is even" rule. `src/core/enemies/interpreter.ts` (`jfuseup`) rolls the coin unconditionally at every wave. Deep-wave fuseballs are therefore wrong in the other direction now. Candidate story: the WFUSCH chase bits. *Found by Dev during implementation.*
- **Improvement** (non-blocking): **The pulsar's glyph animation is driven off a `renderTime` sine, and the real PULSON now exists to drive it.** `src/shell/glyphs.ts` already ships `pulsarVariant()`, which implements the ROM's own `(PULSON + 0x40) >> 4` graphic selector (ALDISP.MAC) — but `src/shell/render.ts:380` feeds it `Math.floor((0.5 + 0.5 * Math.sin(renderTime * 12)) * 0xff)`, a fabricated counter, because before this story there was no global pulse phase to read. There is now: `GameState.pulse.son`. Wiring the real counter through would make the zig-zag bar animate on the ROM's cadence instead of a sine. Shell-only, no core change. *Found by Dev during implementation.*
- **Question** (non-blocking): **`speedFor` picks the pulsar's climb rate by DEPTH alone; JPULMO picks it by depth only when ASCENDING.** The ROM's `LDY I,ZABPUL / LDA INVAC2 / IFPL ;GOING UP? / … / LDY I,ZABFLI ;NO. GO FASTER` applies the "go faster outside the power zone" override only on the up-leg — a DESCENDING pulsar (one CHASER sent back down) always moves at the pulsar rate, however deep it is. Ours would give it flipper speed once it sinks past PULPOT. No test pins it and the difference is small, but it is a real divergence I chose not to widen `speedFor`'s signature for. *Found by Dev during implementation.*
- **Improvement** (non-blocking): **The ROM's CHASER pincer search has a quirk I deliberately did not reproduce.** It finds "the other chaser" by scanning for any invader with `INVAY == CURSY` (1850-1866) — which would also match a FUSEBALL parked at the rim, even though KILINV explicitly books a fuse at CURSY as a MOVER and keeps it out of INCCOU (2302-2311). So the ROM can count one chaser and then read a fuseball's rotation. Ours searches the `chasing` flag, which is INCCOU's own membership and cannot pick up a fuse. This is a fidelity choice against a probable ROM bug; flagging it so the decision is visible rather than silent. *Found by Dev during implementation.*
- **Gap** (non-blocking): **The audit .md and the findings JSON have drifted apart.** `docs/2026-07-12-tempest-primary-source-audit.md` still cites `src/core/enemies/flipper.ts:16` as "Ours" for W-009 — a file tp1-4 deleted. The machine-checked JSON was re-anchored (W-009 now points at `interpreter.ts:155`), so the gate is green and only the human-readable prose is stale. Anyone reading the audit doc literally will chase four deleted files (flipper/fuseball/pulsar/spiker/tanker). Candidate work for tp1-22 (THE CITATION GATE), which already owns freezing the audit's citations.

### Reviewer (code review)

- **Gap** (blocking): **W-032's fix is unreachable in the shipped game — `TANKER_SPLIT_DEPTH` and `SPLIT_TOO_CLOSE_DEPTH` are the SAME ROM constant ($20) written as two different numbers.** JSMOVE (ALWELG.MAC:1748-1758) auto-splits a carrier on `CMP I,20 / IFCC` — INVAY < $20 — and that split routes through KILINV → SPLCHA (2344), whose too-close test is the *same* `CMP I,20 / IFCC`. So in the arcade every naturally-arriving tanker splits INSIDE the too-close band and its children ALWAYS get NEWGEN ("NO FLIPPING"). Ours splits at `TANKER_SPLIT_DEPTH = 0.9` (INVAY 38.4), which is BELOW the $20 band (INVAY 32 = depth 0.9286), so `t.depth >= SPLIT_TOO_CLOSE_DEPTH` is never true and the children always get the wave's flipping program — the exact bug W-032 describes. Affects `src/core/rules.ts` (TANKER_SPLIT_DEPTH must be the same $20-derived constant as SPLIT_TOO_CLOSE_DEPTH) and `src/core/sim.ts` (`resolveTankerArrivals`). *Found by Reviewer during code review.*
- **Gap** (non-blocking): **`PULSE_STEP` and `PULSAR_NEAR_FAR_DEPTH` hardcode the wave-1 value of ROM constants that are WAVE-PARAMETERISED in WTABLE.** `WPULTIM` (ALWELG.MAC:610-613) is 4 for waves 1-48, **6** for 49-64, **8** for 65-99; `WPULPOT` (606-609) is $A0 for waves 1-64 and **$C0** for 65-99. Both are pinned to their wave-1 value, and nothing caps the level (`s.level + 1` on clear), so waves 49+ are reachable and their pulse period, duty cycle and potency height are all wrong there. Disclosed in code comments but not logged as a deviation. Affects `src/core/rules.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): **`PULSAR_NEAR_FAR_DEPTH` now carries two distinct ROM constants.** It is both JPULMO's climb-speed threshold and PULPOT (the new W-027 kill gate). They coincide at $A0 for waves 1-64 and diverge at 65 (PULPOT → $C0), so correcting one will silently move the other. Worth a separate `PULPOT_DEPTH` alias even while the numbers are equal. Affects `src/core/rules.ts`, `src/core/sim.ts`. *Found by Reviewer during code review.*
- **Question** (non-blocking): **The ROM's pincer GOTCHA branch clobbers the invader's appearance bits, and we correctly do not reproduce it.** `GOTCHA: LDA Y,INVAC1 / AND I,INVROT / EOR I,INVROT / STA X,INVAC1` (1868-1872) masks the OTHER chaser's byte down to just the rot bit, flips it, and stores the whole byte into THIS invader's INVAC1 — zeroing its appearance and mid-flip bits. Taken literally, a second chaser would change what it is drawn and scored as. Ours sets only `rot`, which is certainly the right call; flagging it so the audit records the quirk rather than losing it. Dev logged the *other* pincer quirk (the INVAY scan matching a rim fuseball) but not this one. Affects `docs/audit/findings/pair-1-alwelg-sim-enemies.json`. *Found by Reviewer during code review.*

### TEA (test design — rework)

- **Gap** (non-blocking): **The citation gate's real hole is a CLASS RELABEL, and I could not test it in this cycle.** My new test pins the half that is implementable now — a remediated `NO_COUNTERPART` must carry `ours` null OR a well-formed citation, where today the branch validates nothing at all. But the attack the Reviewer actually named is different: take a genuine `DIVERGENCE` with a real historical `ours`, relabel it `NO_COUNTERPART`, stamp `remediated_by`, and delete `ours` — the record is destroyed and the gate says nothing, because `class` is taken on trust and has no history. Closing that needs a frozen id→class manifest committed alongside the findings, which is a gate-design change and belongs to the story that owns the gate. Affects `tools/audit/check-citations.mjs` (needs a class-immutability check against a committed manifest). Candidate work for **tp1-22 (THE CITATION GATE)**. *Found by TEA during test design.*
- **Gap** (non-blocking): **`ENEMY_FIRE_MAX_DEPTH`'s comment hard-codes the number it is about to lose.** `rules.ts:159` reads `export const ENEMY_FIRE_MAX_DEPTH = 0.9   // == TANKER_SPLIT_DEPTH; at/after this they grab or split`. Once `TANKER_SPLIT_DEPTH` moves to the ROM's $20 (0.9286) that comment is false, and the two constants are no longer the same number. They are also not the same RULE — one is "when does a carrier burst", the other is "when do invaders stop firing" — so the fix is to correct the comment, not to drag `ENEMY_FIRE_MAX_DEPTH` along with it. Affects `src/core/rules.ts:159`. *Found by TEA during test design.*


### Dev (implementation — rework)

- **Gap** (non-blocking, IMPORTANT): **W-030 was already in the audit, describes this exact bug, and is now HALF-CLOSED — I did not stamp it.** `W-030` (pair-1, class DIVERGENCE, unremediated) is titled *"A tanker auto-splits at depth 0.929 and its children appear at the parent's depth, not 0.9 / 0.85"*, and its refuter verified **both halves byte-accurate**. Nobody — not SM, not TEA, not me, not the Reviewer — connected it to W-032 until the citation gate went red and told us: fixing W-032 deleted the very line W-030 cites (`export const TANKER_SPLIT_DEPTH = 0.9`). The two findings are **the same ROM mechanism**, and the audit had already written it down. tp1-5 closes half of W-030 (the split depth) as an unavoidable by-product of W-032, because they share the byte. The other half is **untouched**: KILINV (2300-2302) seats BOTH children at `TEMP0` = the parent's own INVAY, and we still clamp them to `SPLIT_CHILD_DEPTH` (0.85). So W-030 stays OPEN, its `ours` re-anchored onto the line that still diverges, and its **title is now half-stale**. Affects `docs/audit/findings/pair-1-alwelg-sim-enemies.json` (W-030 needs splitting into the closed half and the open half) and `src/core/sim.ts:222`. *Found by Dev during implementation.*
- **Gap** (non-blocking): **The ROM's tanker burst is THREE rules and we now ship two of them.** In the arcade a carrier bursts at $20 — which is depth 0.9286, **above** `PLAYER_RIM_DEPTH` (0.92) — and KILINV drops both children at the parent's depth, i.e. **already past the grab line and instantly lethal**. The only thing that makes that survivable is the no-flip rule: NEWGEN children cannot flip *onto* the player, so they can grab him only if he is already standing on the lane one of them landed on. Ours now bursts in the right place and refuses to flip, but still seats the children at 0.85 — safely *below* the grab line — so our rim-burst is materially gentler than the cabinet's. That is a difficulty decision, not a typo, and `SPLIT_CHILD_DEPTH`'s comment ("so a rim-split is not an instant grab") shows it was made deliberately and long before this epic. It should be closed or ratified on purpose, with a test, not left as an accident. Affects `src/core/rules.ts` (`SPLIT_CHILD_DEPTH`), `src/core/sim.ts:222`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): **`reanchor-citations.mjs` offers only two ways out of a LOST citation, and the honest third one is missing.** It prints *"LOST citations need a human: fix the quote, or mark the finding `remediated_by`"*. For a COMPOUND finding that a story closes only partway — exactly W-030 here — both are wrong: `remediated_by` lies, and "fix the quote" silently rewrites what the audit found. The move that is actually correct is to re-point `ours` at the half that still diverges and say so out loud. The tool should name that option, and the gate should probably not let one `remediated_by` stand for a finding whose title asserts two divergences. Affects `tools/audit/reanchor-citations.mjs`. Candidate work for **tp1-22 (THE CITATION GATE)**. *Found by Dev during implementation.*


### Reviewer (code review — second pass)

- **Gap** (non-blocking): **W-030's `ours` was re-pointed without a `remediated_by` trail, and the finding now asserts a divergence that is closed.** tp1-5 fixed half of W-030 (the split depth) and moved its `ours` from the deleted `export const TANKER_SPLIT_DEPTH = 0.9` to `src/core/sim.ts:222` (the surviving child-clamp). The mechanical gate is green and the new quote is byte-true — but the finding's `title`, `claim` and `reasoning` all still assert the 0.9-vs-0.929 split trigger as an OPEN divergence, when `rules.ts:300` now derives it from the ROM's own $20. A future reader will correctly verify the child-clamp half and wrongly read the split-depth half as open, with no `remediated_by` anywhere to tell them which story closed it, and the original quote (`= 0.9`) is unrecoverable from the audit itself. Dev chose the least-bad of three bad options and said so loudly; the schema simply has no way to express "half of this is fixed". Affects `docs/audit/findings/pair-1-alwelg-sim-enemies.json` (W-030 must be SPLIT: one half `remediated_by: tp1-5` keeping its ORIGINAL frozen quote, one half open on the clamp). **Now filed as tp1-24**, whose ACs carry this explicitly. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): **The citation convention has only two verbs and needs a third.** CLAUDE.md and `reanchor-citations.mjs` recognise exactly "the line moved" (re-anchor) and "the line was fixed on purpose" (`remediated_by`, quote frozen). W-030 is neither: a COMPOUND finding, partly closed. The tool's own LOST message ("fix the quote, or mark the finding `remediated_by`") offers only the two, and both lie about a compound finding — stamping it would ALSO stop the gate re-opening the child-clamp divergence, which is still live, so the gate would go blind to a real open bug. The convention should either forbid compound findings outright (one divergence, one id) or name the split operation. Affects `tools/audit/reanchor-citations.mjs`, `tempest/CLAUDE.md`. Candidate work for **tp1-22 (THE CITATION GATE)**. *Found by Reviewer during code review.*
- **Question** (non-blocking): **`PLAYER_RIM_DEPTH` (0.92) is now demonstrably looser than the ROM's grab line, and the tanker fix exposed it.** With the split moved to the ROM's $20 (0.9286), a climbing tanker spends exactly one frame inside [0.92, 0.9286) — measured, every level. It is harmless today only because `GRABBER_KINDS` excludes tankers. But in the ROM the grab is at the CURSOR's own lines (CURSY, depth 1), not 0.92 — so our grab zone is ~8% of the well deep where the arcade's is a line. Nothing in tp1-5 touches it and no finding covers it; flagging it because the tanker is now the first invader that routinely climbs through it. Affects `src/core/rules.ts:84`. *Found by Reviewer during code review.*


## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### Dev (implementation)

- **The pulse is lit for 7 frames of 40, not the 9 the RED test asserts. I changed the test.**
  - Spec source: `tests/core/tp1-5.pulsar-fuse-split.test.ts`, "is ON for exactly 9 frames of a 40-frame cycle"; and the audit's W-026 (:575-581), whose claim says "~9 frames on / ~31 off" and whose refuter says "the 9-frame ON duration is exact".
  - Spec text: "The pulse is ON while PULSON >= 0, which is {0,4,8,12,16}: the peak once, the other four twice = 9."
  - Implementation: 7. `INEWLI` opens every wave and life with `LDA I,-1 / STA PULSON` (ALWELG.MAC:46-48). PULSON therefore starts at **-1** and, moving only in steps of PULTIM = 4, is pinned to the residue 3 (mod 4) for the whole wave — the set {0,4,8,12,16} is **unreachable**. The reachable values are the twenty-one from -65 to +15, two of them turning points: period 2×21−2 = **40** (so the audit's original ~40 was right and its refuter's 42 was not), and the lit half is {3,7,11,15} = the peak once, the other three twice = **7**. Verified by re-running the byte machine standalone AND by the sim: the test now measures 7-frame runs spaced exactly 40 apart.
  - Rationale: this is a ROM-fidelity epic and CLAUDE.md says the primary source is the authority. Both the audit and TEA derived 9 by simulating from a seed of 0 — nobody read the seed. TEA's own delivery finding invited exactly this adjudication ("if Dev's implementation lands on 42 it will fail loudly and we can settle it there"); it landed on 7 instead. I changed ONE number and its comment, kept every other assertion in that test (the 40-frame period, the ≥2 complete runs, the non-vacuity guard), and corrected the audit doc additively.
  - Severity: major
  - Forward impact: the audit doc's W-026 entry now carries a third correction naming the seed. tp1-22 (THE CITATION GATE) should treat "the refuter simulated from the wrong seed" as a worked example of why prose corrections are not evidence.

- **The chaser is a rim STATE (`chasing`), not the sixth `EnemyKind` the context calls for**
  - Spec source: context-story-tp1-5.md, Technical Approach / prerequisite 3
  - Spec text: "this story adds a sixth EnemyKind — use assertNever so the compiler catches the next one"
  - Implementation: a `chasing?: boolean` on `EnemyBase`. `speedFor` still got its `assertNever` (the prerequisite lands either way, and the tests pin the exhaustiveness rule, not the representation).
  - Rationale: TEA raised this as a blocking-adjacent Question and the ROM settles it. `CHASER` (1824-1874) does not touch the invader's appearance bits: it pins INVAY, moves it from INMCOU to INCCOU, sets CAMPC and returns. A rim flipper is still drawn as a flipper and still scores 150. A sixth kind would fork `scoreFor`, `GRABBER_KINDS` and the `APPEARANCE`/`TNEWCAM` index tables, and would make a rim flipper score differently from a lane flipper — which the cabinet does not do.
  - Severity: minor
  - Forward impact: none pending. Any story adding a real sixth kind now gets a compile error at `speedFor`, which is what prerequisite 3 wanted.

- **INMCOU is not modelled; INCCOU is derived rather than stored**
  - Spec source: context-story-tp1-5.md, Scope
  - Spec text: "the CHASER rim state (conversion, `INMCOU`/`INCCOU` counters, pincer rule)"
  - Implementation: INCCOU is `enemies.filter(e => e.chasing).length`, computed where the pincer needs it. INMCOU is not modelled at all.
  - Rationale: INCCOU has exactly one reader in the ROM — the pincer's `CMP I,1` — and a derived count from the per-invader bit is the same number by construction, with no counter to drift out of sync on a death (the ROM has to `DEC INCCOU` by hand in KILINV; we cannot forget to). INMCOU has NO reader in our port: the ROM uses INMCOU+INCCOU as its "any invaders left?" test (1110, 3078), and ours is `s.enemies.length === 0` in checkLevelClear. Storing it would be a field nothing reads.
  - Severity: minor
  - Forward impact: none. If a later story needs the ROM's split counts (e.g. for a HUD or an AI that cares how many are on lines vs at the rim), both are one filter away.

- **Deleted two tests: story 6-15's "fuseball steers toward the player" pair, which W-023 refutes**
  - Spec source: `tests/core/sim.enemy-motion-fidelity.test.ts`, "AC 2a: fuseball steers TOWARD the player (gated, but never away)"
  - Spec text: "A toward-biased fuseball NEVER increases that distance … today's 50/50 random hop walks AWAY about half the time"
  - Implementation: both tests removed, replaced by a tombstone comment that states what overturned them and names the replacement. The 50/50 hop 6-15 called a bug IS the arcade below wave 17 (LEFRIT; TWFUSC's first record is wave 17). One of the two would have failed outright; the other ("actually closes the gap") would have kept passing by luck, since a random walk closes the gap sometimes — it had become a test that could no longer fail for the right reason.
  - Rationale: a test asserting a refuted behaviour is worse than no test, and the replacement is strictly stronger: tp1-5's own W-023 test runs the same seed twice and moves only the PLAYER, so a coin-flipping fuseball walks the identical path and a steering one cannot. 6-15's OTHER fuseball AC (the wider hit tolerance) is untouched.
  - Severity: major — I removed test coverage. Reviewer should confirm the replacement is adequate.
  - Forward impact: from wave 17 the ROM's fuseball DOES chase (both WFUSCH bits, FUCHPL/MAYBLR's even-index rule). Nothing implements that yet and nothing tests for it — see Delivery Findings.

- **Re-seated `input.spinner.test.ts`'s AC6, including a claim that is now false**
  - Spec source: `tests/shell/input.spinner.test.ts`, "the escape constraint" (story tp1-1's AC6)
  - Spec text: "a deep flipper walks the rim at 7.11 lanes/sec"; `expect(BROKEN_PER_STEP_RATE).toBeLessThan(fastestFlipperRimSpeed())`
  - Implementation: the cadence is 4.06 lanes/sec (7 frames a lane), so the margin widened from 1.27x to 2.21x. The second assertion — "the broken keyboard was slower than the enemy, so it could not escape at all" — is now FALSE: the broken rate (4.27) would in fact have crawled clear of the real chaser (4.06). I replaced it with the honest statement (the broken rate had no real margin, and the keyboard still out-turns it), and left the named `BROKEN_PER_STEP_RATE` guard in place.
  - Rationale: prerequisite 2 of this story is precisely "re-derive the escape margin against TOPPER". The old numbers described `flipPatternForLevel`, which tp1-4 deleted. I did NOT retune `KEY_SPIN_RATE` — the constraint is a floor, not a target, and the correction moves in the safe direction.
  - Severity: minor (the story asked for this re-derivation by name), but flagged loudly because I edited an assertion that another story wrote as a regression guard.
  - Forward impact: the deep-wave escape margin is now 2.2x rather than the 1.27x tp1-1 tuned for. If that reads as too easy in playtest, KEY_SPIN_RATE is the dial — but it should be turned against the real number, which the shell finally holds.

- **Widened the citation gate: a remediated NO_COUNTERPART keeps its null `ours`**
  - Spec source: CLAUDE.md, "The fidelity audit and its citation gate", rule 1; `tools/audit/check-citations.mjs:102-103`
  - Spec text: "remediated_by requires `ours` to keep its historical citation"
  - Implementation: that requirement no longer applies to `class: NO_COUNTERPART`. W-032 is a NO_COUNTERPART — our code had no counterpart LINE, because the rule (SPLCHA) was missing outright — so fixing it means ADDING code and there is no historical quote to freeze. AC-5 requires W-032 be stamped `remediated_by`, and the gate rejected that combination outright; the only way to satisfy both was to invent an `ours` citation for a line that never diverged, which is the exact kind of evidence the gate exists to refuse.
  - Rationale: the rule was written assuming every finding has an `ours`. My first attempt ALSO forbade a remediated NO_COUNTERPART from carrying an `ours` — that broke S-010 (tp1-2), which legitimately points at the code that now implements its rule. Both shapes are now accepted, and I pinned all three cases with a test.
  - Severity: minor, but it is a change to the AUDIT TOOLING, which tp1-22 owns.
  - Forward impact: tp1-22 (THE CITATION GATE) inherits a gate with one more branch and one more test. No existing finding changes meaning.

- **Two smaller ROM corrections nothing tested, made while I was in the code**
  - Spec source: ALWELG.MAC — POLDEL (3395-3408), JCHKPU (1709-1719)
  - Spec text: `BIT A,EIGHT / IFNE / ORA I,0F8` ("TAKE SHORTEST ROUTE"); `ASL / ASL / CLC / ADC PULSON / AND PULSON / AND I,80 / EOR I,80`
  - Implementation: (a) `shortestRot`'s tie-break — a delta of exactly half a closed tube has bit 3 set, so POLDEL sign-extends it NEGATIVE (CW). Ours broke the tie toward CCW. (b) `jchkpu` now answers "pulsing now OR within 4 frames" (it ANDs the sign of PULSON with the sign of PULSON + 4·PULTIM) rather than just "pulsing now", so a pulsar will not start a flip it would be caught mid-way through when the lane lights.
  - Rationale: both sit inside functions this story had to rewrite anyway, both are unambiguous in the source, and neither was pinned by any test in either direction — so both were free to get right while the ROM was open in front of me. Calling them out because no test would have caught me getting them wrong either.
  - Severity: minor
  - Forward impact: (a) shifts which way an invader turns when the player is exactly half a tube away — a rare board state, and TEA's fixtures deliberately avoid the tie. Neither is covered by a regression test; both are stated in the code comments with their citations.

### Dev (implementation — rework after review)

- **Fixed only HALF of W-030, and refused to stamp it**
  - Spec source: `docs/audit/findings/pair-1-alwelg-sim-enemies.json`, W-030 (DIVERGENCE, unremediated); CLAUDE.md, "The fidelity audit and its citation gate", rule 1
  - Spec text: "Fixed a finding? Mark it `\"remediated_by\": \"<story-id>\"`." — and W-030's title: "A tanker auto-splits at depth 0.929 **and its children appear at the parent's depth**, not 0.9 / 0.85"
  - Implementation: W-030 keeps `remediated_by: null`. Its `ours` moves from `rules.ts:265` (`TANKER_SPLIT_DEPTH = 0.9` — a line this story deletes) to `sim.ts:222` (`const depth = Math.min(t.depth, SPLIT_CHILD_DEPTH)`), which is the half that still diverges.
  - Rationale: W-030 asserts TWO divergences and tp1-5 closes ONE. Fixing W-032 necessarily fixed the split depth, because the ROM reads the same `$20` for both — but KILINV still seats the children at the parent's own INVAY and we still clamp them to 0.85. Stamping `remediated_by` would record the children's half as fixed when it is not, which is precisely the false-ledger entry this story was REJECTED for. `reanchor-citations.mjs` offered me only "fix the quote or mark it remediated"; both would have lied, so I took the third option and re-anchored onto the surviving divergence.
  - Severity: major — it leaves a finding whose *title* is now half-stale, and that is a trap for the next reader.
  - Forward impact: W-030 must be SPLIT into its two halves before it can ever be honestly closed. The children-at-parent's-depth half is a real difficulty change (children born ABOVE the grab line) and wants its own story and its own test. Logged as a Delivery Finding.

- **Did NOT implement W-030's second half, though the code was one line away**
  - Spec source: W-030's claim; `src/core/sim.ts:222`
  - Spec text: "KILINV then places both children at TEMP0 = the parent's own INVAY (2301-2302), i.e. at the parent's exact depth. We split at TANKER_SPLIT_DEPTH = 0.9 and clamp the children to SPLIT_CHILD_DEPTH = 0.85."
  - Implementation: left `const depth = Math.min(t.depth, SPLIT_CHILD_DEPTH)` exactly as it was.
  - Rationale: no test asks for it, W-030 is not one of tp1-5's acceptance criteria, and it is not a typo — it is a deliberate softening, recorded in `SPLIT_CHILD_DEPTH`'s own comment ("Must be < PLAYER_RIM_DEPTH (0.92) so a rim-split is not an instant grab") and predating this epic. Making children spawn past the grab line changes how hard the game is to play, and a story that has already been rejected once for claiming more than it delivered is the wrong place to slip in an unrequested difficulty change. The restraint IS the lesson from the rejection.
  - Severity: minor — a known, now-documented divergence rather than a silent one.
  - Forward impact: our rim-burst stays gentler than the cabinet's until someone closes it on purpose.

- **Edited two of TEA's tests — a broken resolver, not a moved goalpost**
  - Spec source: `tests/core/tp1-5.source-rules.test.ts`, the `assertNever` parameter checks
  - Spec text: `const rel = join(dirname(file), from).replace(/\.js$/, '.ts')`
  - Implementation: `.replace(/(\.js)?$/, '.ts')`, and the older duplicate test now calls the same shared helper instead of carrying its own hard-wired copy.
  - Rationale: the resolver only rewrote a trailing `.js`, but this repo is on `moduleResolution: bundler` and writes relative imports with NO extension — so the moment `assertNever` moved into a leaf module, `from './assert'` resolved to a path with no extension and the read threw ENOENT before the assertion was ever evaluated. The test could not fail for its own reason, in either direction. I changed only the path arithmetic; every assertion is TEA's, untouched. I did not delete the older test even though the new `it.each` subsumes it.
  - Severity: minor
  - Forward impact: one resolver, one place. Any future move of `assertNever` is now a one-line change.

- **`stepGame` switches on a captured `const mode`, not on the live `s.mode`**
  - Spec source: `tests/core/tp1-5.source-rules.test.ts`, "stepGame switches on Mode and guards it with assertNever"
  - Spec text: the test requires an `assertNever` guard in `stepGame`
  - Implementation: `const mode = s.mode` immediately before the switch; the arms are unchanged.
  - Rationale: half the arms reassign `s.mode` mid-body (`s.mode = 'select'`, `s.mode = 'attract'`, …). Switching on the live field lets those writes re-widen the discriminant, so the `default` no longer receives `never` and the guard silently stops being a compile-time check — the exact failure mode the guard exists to prevent. Capturing the mode we ARRIVED in is both what the ROM-facing logic already means and what makes the `never` real.
  - Severity: minor
  - Forward impact: none. A new `Mode` member is now a `tsc` error rather than a silently skipped frame.

### TEA (test design)
- **The W-027 fixture forces the pulse ON through per-pulsar fields, which W-026 deletes**
  - Spec source: context-story-tp1-5.md, W-026 + W-027 (both in scope for this story)
  - Spec text: W-026 — "The pulse is a single GLOBAL phase shared by every pulsar"; W-027 — "A pulse only kills when the pulsar is above the potency height (PULPOT)"
  - Implementation: the two focused W-027 tests call a `pulsing(p)` helper that writes `p.pulsing` / `p.pulseTimer` — today's per-pulsar clock, the very thing W-026 removes. Under a global phase those writes stop meaning anything.
  - Rationale: W-027 cannot be shown RED any other way. Today's clock does not fire until ~frame 85, by which time a climbing pulsar is already ABOVE PULPOT — so the bug (killing from below it) is unreachable without forcing the phase. The helper is documented in-file as a seam and says "re-point it, do not delete the tests". A third test (`never kills from below PULPOT across a whole pulse cycle`) pins the same rule with NO field writes at all, and it is the one that will catch a W-026 landed without W-027.
  - Severity: minor
  - Forward impact: Dev must re-point `pulsing()` at the global phase when W-026 lands. The rule under test does not change.
### TEA (test design — rework after review)

- **Replaced the W-032 test rather than repairing it: a hand-placed tanker became one that CLIMBS**
  - Spec source: `tests/core/tp1-5.pulsar-fuse-split.test.ts`, "children of a rim split never flip" (my own RED test, and the Reviewer's finding [TEST-2])
  - Spec text: `const s0 = splitOn(0.95)  // depth 0.95 > 0.857 — "TOO CLOSE"`
  - Implementation: `climbUntilSplit(3, 0.5)` — a tanker seeded at depth 0.5 with no bullet, stepped until `resolveTankerArrivals` bursts it on its own. The hand-placed fixture and its point-blank bullet are gone from the too-close case.
  - Rationale: depth 0.95 is a state the simulation cannot produce. A tanker is destroyed the frame it crosses `TANKER_SPLIT_DEPTH` (0.9) and its fastest climb is 0.0151/frame, so no tanker has ever been at 0.95 or ever will. My test built its own premise, which is why it went green against a branch that can never fire in play — the test proved the branch, not the behaviour. This is the same vacuity class I caught twice in myself during the first RED and then shipped anyway, one level up: not a vacuous *assertion* but a vacuous *fixture*. The replacement can only pass if the rule fires on a board the game can actually reach.
  - Severity: major — it is the test that let a dead acceptance criterion through the whole pipeline.
  - Forward impact: any future test of a near-rim tanker rule must drive the climb. Hand-placing a tanker above 0.9286 is now provably unreachable and will silently prove nothing.

- **Widened lang-review #3 from `speedFor` alone to every switch it governs**
  - Spec source: context-story-tp1-5.md, prerequisite 3
  - Spec text: "this story adds a sixth EnemyKind — use assertNever so the compiler catches the next one"
  - Implementation: a table-driven `it.each` over five functions — `speedFor`, `scoreFor`, `enemyCanShoot`, `makeEnemy` and `stepGame`'s mode switch — each of which must carry a real `never`-typed guard.
  - Rationale: the prerequisite names one function, but lang-review #3 is a rule about *switches on closed unions*, and Dev's own comment now promises more than the code delivers ("Adding a sixth EnemyKind now fails `tsc`, at the switch that forgot it" — it does not; three others compile clean and return `undefined`). A rule enforced in one place is a rule that will be broken in the others, and a *reassuring* comment that is false is worse than no comment. I verified with `tsc` that TypeScript narrows a generic `K extends EnemyKind` to `never` in a switch default, so `makeEnemy` is genuinely fixable and I am not handing Dev an impossible test.
  - Severity: minor — it expands the prerequisite's letter, but it is exactly the rule's intent.
  - Forward impact: `assertNever` needs a module of its own. `rules.ts` cannot import it from `interpreter.ts` (interpreter imports rules) and `state.ts` already imports rules, so a leaf module with no imports is the only place it can live. The tests accept it defined locally or imported from anywhere relative.

- **Tested only half of the citation-gate finding [RULE-2]**
  - Spec source: Reviewer Assessment, [RULE-2]
  - Spec text: "a remediated `NO_COUNTERPART` may have `ours` null **or** a valid `ours`, but nothing else; and a finding may not change `class` in the same commit that stamps `remediated_by`"
  - Implementation: the first clause only. My test rejects a malformed `ours` (present but shapeless, or not even an object) and keeps both legitimate shapes green. The class-relabel clause is untested.
  - Rationale: the relabel attack cannot be detected from the JSON alone — `class` has no history to compare against, so catching it needs a frozen id→class manifest committed beside the findings and checked by the gate. That is a gate-design change in a story that has already been rejected once; building it here would be scope creep on a rework. Logged as a Delivery Finding for tp1-22, which owns the gate.
  - Severity: minor — [RULE-2] is non-blocking, and the half I did test is the half that is a defect *today*.
  - Forward impact: tp1-22 inherits a gate that is shape-safe but not class-safe.

### Reviewer (audit)

Every Dev/TEA deviation above is stamped. Three undocumented ones are added at the end.

- **The pulse is lit for 7 frames of 40, not 9. Dev changed the test.** → ✓ **ACCEPTED by Reviewer.** I re-derived it from the primary source and Dev is right; the audit and its refuter are both wrong. `INEWLI` really does seed PULSON at −1 (`LDA I,-1 / STA BOFLASH / STA PULSON`, ALWELG.MAC:44-47), and MOVINV's rails are `IFPL / CMP I,15. / BCS NEGPUL` and `ELSE / CMP I,-63. / IFCC` (1556-1568) — negate at ≥ +15 and at ≤ −64. From −1 in steps of 4 the counter is pinned to residue 3 (mod 4): it walks −65…+15, 21 values, 2 turning points → period 2×21−2 = **40**, and the lit set (PULSON ≥ 0) is {3,7,11,15} = the peak once, the other three twice = **7**. {0,4,8,12,16} is unreachable, which is exactly where the audit's 9 came from. Changing one number and correcting the doc was the right call, and this was the deviation most worth the scepticism Dev invited.
- **The chaser is a rim STATE (`chasing`), not a sixth `EnemyKind`.** → ✓ **ACCEPTED by Reviewer.** The ROM settles it: CHASER (1824-1874) pins INVAY, tests/sets INVAC2 and CAMPC, and moves the invader between INMCOU and INCCOU — it never touches INVABI, so a rim flipper is still drawn and scored as a flipper. A sixth kind would have forked `scoreFor`/`GRABBER_KINDS`/`APPEARANCE`. Correct reading, and prerequisite 3 still landed.
- **INMCOU is not modelled; INCCOU is derived.** → ✓ **ACCEPTED by Reviewer.** INCCOU's only ROM reader is the pincer's `CMP I,1`, and a derived count off the per-invader bit is the same number with no counter to desync on a death. INMCOU has no reader in our port. Agrees with author reasoning.
- **Deleted story 6-15's two "fuseball steers toward the player" tests.** → ✓ **ACCEPTED by Reviewer**, with one caveat raised as a finding. The refutation is sound and I verified it: TWFUSC's FIRST record is `TR,17.,32.,0,40` (686-690), so below wave 17 neither chase bit is set and every fuseball decision falls to LEFRIT — `BIT RANDOM / IFVS` (2171-2178), a coin with the player as no input at all. 6-15 froze a rule that does not exist until wave 17. The replacement (same seed, player moved from lane 2 to lane 14, identical path asserted) is genuinely stronger. **Caveat:** it dropped the liveness half of what it replaced — see finding [TEST-1].
- **Re-seated `input.spinner.test.ts`'s AC6 against the real chaser.** → ✓ **ACCEPTED by Reviewer.** Verified end to end: TOPPER is `VSLOOP 4` + a jump of `ceil(8 / WTTFRA)` frames, the landing frame doubles as the next crouch's first (I traced the dispatcher instruction by instruction), and TWTTFRA (704-706) goes 2 → 2 → **3 at wave 33 and never again**, so `FASTEST_CHASER_WAVE = 33` and 4 + ceil(8/3) = **7 frames a lane** = 4.06 lanes/sec. Editing another story's regression guard was the right call because the claim it asserted had become false, and Dev flagged it loudly instead of quietly retuning `KEY_SPIN_RATE`. That restraint is correct: the constraint is a floor.
- **Widened the citation gate: a remediated NO_COUNTERPART keeps its null `ours`.** → ✗ **FLAGGED by Reviewer.** The motivation is legitimate — forcing a fix story to invent an `ours` for a line that never diverged is exactly the fabricated evidence the gate exists to refuse — but the branch as written validates *nothing* once `remediated_by` and `class === 'NO_COUNTERPART'` are both set, and it trusts `class` without cross-checking it. See finding [RULE-2]. Non-blocking, but tp1-22 inherits it.
- **Two smaller ROM corrections (POLDEL's tie-break, JCHKPU's 4-frame look-ahead).** → ✓ **ACCEPTED by Reviewer.** Both verified against the source. POLDEL (3395-3407) folds on a closed tube only (`BIT WELTYP / IFPL`) and sign-extends a delta with bit 3 set (`BIT A,EIGHT / ORA I,0F8`), so half a board really does break CW — `forward * 2 < n ? 1 : -1` matches it exactly, including the tie. JCHKPU (1709-1719) really does AND the sign of PULSON with the sign of PULSON + 4·PULTIM (`ASL / ASL / CLC / ADC PULSON / AND PULSON / AND I,80 / EOR I,80`), which is precisely `son < 0 && soon < 0 ? 0 : 0x80`. Doing both while the ROM was open was the right instinct, and saying so out loud when no test would have caught an error was the right disclosure.
- **TEA: the W-027 fixture forces the pulse through per-pulsar fields that W-026 deletes.** → ✓ **ACCEPTED by Reviewer.** The seam was documented, Dev re-pointed it at the global phase, and the third test (`never kills from below PULPOT across a whole pulse cycle`) pins the rule with no field writes at all. That third test is the one doing the real work.

**Undocumented deviations (found in review):**

- **`TANKER_SPLIT_DEPTH` (0.9) and `SPLIT_TOO_CLOSE_DEPTH` (0.9286) are the SAME ROM constant, written as two different numbers.** Spec said the carrier auto-split and SPLCHA's too-close test both key on `$20`; the code uses 0.9 for one and 0.9286 for the other, which makes W-032's fix dead code. Not documented by TEA or Dev. Severity: **H**. See [EDGE-1].
- **`PULSE_STEP` and `PULSAR_NEAR_FAR_DEPTH` freeze the wave-1 value of wave-parameterised ROM constants.** WPULTIM is 4/6/8 across waves 1-48/49-64/65-99 and WPULPOT is $A0/$C0 across 1-64/65-99; the code hardcodes 4 and $A0 with no level cap to keep the game inside those bands. Disclosed in comments, not logged as a deviation. Severity: **L**.
- **The ROM's pincer GOTCHA branch clobbers INVAC1's appearance bits and we do not reproduce it.** Correct not to, but it is an unrecorded divergence from a literal reading of 1868-1872. Severity: **L**.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 | confirmed 0, dismissed 1, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (found [EDGE-1], the blocker) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (found [TEST-1], [TEST-2]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (found [DOC-1], [DOC-2]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (no attack surface; see below) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |
| 9 | reviewer-rule-checker | Yes | findings | 5 | confirmed 5, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled subagents returned; 7 disabled via `workflow.reviewer_subagents` and their domains assessed by the Reviewer directly)
**Total findings:** 8 confirmed, 1 dismissed (with rationale), 0 deferred

**Dismissal (preflight):** preflight reports `baseline_claim_verified: false` — it measured `develop` at 932/932 green and called Dev's "960 tests / 25 failing" baseline inaccurate. **Dismissed:** preflight compared the wrong two trees. Dev's baseline is develop *plus TEA's RED test files*, which is the only baseline a GREEN phase can have. TEA wrote 28 tests (7 + 11 + 7 + 3); 932 + 28 = **960**, and 960 − 2 removed + 1 added = **959**, which is exactly the branch's count. Dev's arithmetic is internally consistent and correct; the subagent's is not.

### Rule Compliance

Rules enumerated from `.pennyfarthing/gates/lang-review/typescript.md` (13 numbered checks) and `tempest/CLAUDE.md` (the hard core/shell boundary, the citation gate, tube space, the 28.44 fps clock). Every instance in the changed files, not one exemplar per rule.

| Rule | Instances checked | Verdict |
|------|-------------------|---------|
| #1 type-safety escapes | 4 (`assertNever`'s `(x as Enemy).kind`; `getContext('2d')!` and 7 double-casts in test files — all pre-existing, untouched) | **PASS.** No `as any`, no `@ts-ignore`, no new non-null assertion. The one cast sits in an unreachable diagnostic branch where `x: never` has no properties. |
| #2 generics/interfaces | 3 (`CamContext.spikes`, `CamContext.enemies: readonly Enemy[]`, `PulseState`) | **PASS.** `enemies` is correctly `readonly` at the array level while element mutation is intentional and documented. |
| **#3 enum exhaustiveness** | **7** (`speedFor`, `camParam`, `runCam`'s opcode dispatch, `enemyCanShoot`, `scoreFor`, `makeEnemy`, `stepGame`'s mode switch) | **4 VIOLATIONS.** `speedFor` is fixed and the guard is real (`assertNever(x: never): never`, TS genuinely narrows to `never`). But `enemyCanShoot` (rules.ts:168), `scoreFor` (rules.ts:357), `makeEnemy` (sim.ts:123) and `stepGame` (sim.ts:784) all switch on a closed union with no `default: assertNever`. See [RULE-1]. |
| #4 null/undefined | 6 (`chasing?`, `pulsing`, `jumpAngle?`, `fireCooldown?`, `killer ??`, `camLoop`) | **PASS.** `chasing` is read with strict `=== true`; `jumpAngle` uses `?? 0` and `!== undefined`, never `||` (it can legitimately be 0). No `||`-vs-`??` bug anywhere in the diff. |
| #5 modules | 2 | **PASS.** `moduleResolution: bundler`, so extensionless relative imports are correct here (unlike `arcade-shared`'s own ESM package). |
| #6 React/JSX | 0 | **N/A** — no `.tsx` in this repo. |
| #7 async/promises | 0 | **N/A** — nothing async in the diff. |
| #8 test quality | 5 test files | **2 VIOLATIONS.** No `as any`, and TEA's `must()`/`sawPulse` guards are good. But the W-023 replacement has no liveness guard ([TEST-1]) and the W-032 test proves its branch only from an unreachable state ([TEST-2]). |
| #9 build/config | 0 | **N/A** — `tsconfig.json` not in the diff. |
| #10 input validation | 1 (`JSON.parse(...) as {findings: Finding[]}`) | **PASS** in context — a repo-committed audit file read by test tooling, not a user/API boundary. |
| #11 error handling | 0 | **N/A** — no catch blocks added. |
| #12 perf/bundle | 0 | **N/A.** |
| #13 fix regressions | 2 | **PASS.** |
| **A — core purity (CLAUDE.md, the single most important rule)** | 4 (both new RNG draws, `jstrai`'s draw, whole-tree grep) | **PASS — the important one.** Zero `Math.random`/`Date.now`/`performance.now`/`requestAnimationFrame`/DOM/`shell` imports anywhere in `src/core/`. The new LEFRIT coin (`interpreter.ts:451`) and the fuzz gate (`:440`) both draw from the seeded `ctx.rng` carried in `GameState`. The pincer itself is RNG-free — it reads other invaders' persisted `.rot`/`.chasing`, matching the ROM's deterministic INCCOU/INVROT read. Determinism preserved. |
| **B — the citation gate** | 3 | **1 VIOLATION.** All 5 findings correctly stamped; `reanchor-citations.mjs` reports `173 already correct, 0 lost`. But the widened branch validates nothing once `remediated_by` + `NO_COUNTERPART` are both set — see [RULE-2]. |
| C — tube space, depth ∈ [0,1] | 3 | **PASS.** `moveAlong` clamps to [0, RIM_DEPTH]; `chaser()` pins to 1 or 1 − 1/224. |
| D — 28.44 fps, not 60 | 2 | **PASS.** Every literal `60` in the diff is prose, a level threshold, or `KEY_SPIN_RATE` (an input-device constant, not a frame rate). The per-call pulse tick is correct **because** the loop is ROM-paced: `SIM_STEP = 9/256` through a fixed-timestep accumulator (`shell/loop.ts`), so one `stepGame` is exactly one ROM frame — the same convention `jjumpm`'s per-frame angle steps already rely on. |

### Devil's Advocate

Let me argue this branch is broken, because the surface of it is unusually persuasive and that is precisely when I should be most suspicious. Every mechanical signal is green — 959/959, `tsc` clean, `vite build` clean, the citation gate passing, `reanchor-citations` reporting zero lost quotes — and the prose is so well-cited that it invites you to grade the writing instead of the code. The single most dangerous thing about this diff is that reading it *feels* like verification.

So: what would a stressed board actually do? Start with the claim the story is proudest of. Dev overrode a test, changed a 9 to a 7, and edited the audit document that is supposed to be the authority. That is exactly the shape of a rationalised bug — and it is the one thing here I could not break. The seed really is −1, the rails really are +15 and −64, and the residue argument holds; the audit and its own refuter were both wrong. Fine. But the same instinct — trust the citation, skip the arithmetic — is what I then turned on the constants, and *that* is where the floor gives way. `SPLIT_TOO_CLOSE_DEPTH` is beautifully derived from `$20` and beautifully commented, and it is compared against a tanker that the simulation destroys 0.029 depth-units earlier, every single time, at every level from 1 to 81. The comment is true. The citation is true. The branch is dead. Nothing in the pipeline could have caught that, because the test that guards it *builds the unreachable state by hand* — it places a tanker at 0.95, a depth no tanker in this game has ever occupied or ever will. A test that constructs its own premise cannot falsify anything.

What else does that pattern touch? `PULSE_STEP = 4` and `PULPOT = $A0` are frozen wave-1 values of constants the ROM ramps at waves 49 and 65, and nothing caps the level — so the pulse is simply wrong in deep play, and no test looks. The W-023 replacement asserts two runs are identical without ever asserting the fuseball *moved*: freeze it entirely and the test still passes, which is the same vacuity TEA caught twice in itself during RED and then reintroduced here. And `interpreter.ts:151` now tells the next developer that adding a sixth `EnemyKind` "fails `tsc`, at the switch that forgot it" — which is false in three places (`scoreFor`, `enemyCanShoot`, `makeEnemy`), so the comment is an active trap that will hand someone a `NaN` score at 3am, which is the exact failure the comment claims to have abolished.

The core ROM work is genuinely excellent and I verified it line by line against Theurer's source. But the story's fourth acceptance criterion does not do anything, and it has been recorded in a machine-checked ledger as done.

## Reviewer Assessment

**Verdict:** REJECTED

The ROM archaeology in this branch is the best I have reviewed in this epic — CHASER, POLDEL, JCHPLA, JCHKPU, TOPPER's cadence and the pulse's true duty cycle are all verifiably correct against Theurer's source, and Dev's contested 7-frame call is right where both the audit and its refuter were wrong. I confirmed every one of those against `ALWELG.MAC` myself. One acceptance criterion, however, is dead code.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| **[HIGH]** `[EDGE]` | **W-032's fix can never fire.** The ROM uses ONE constant for two tests: JSMOVE auto-splits a carrier at `CMP I,20 / IFCC` (INVAY < $20) and the resulting KILINV→SPLCHA tests the *same* `CMP I,20 / IFCC` — so every naturally-arriving tanker is "too close" and its children ALWAYS get NEWGEN ("NO FLIPPING"). We split at `TANKER_SPLIT_DEPTH = 0.9` (INVAY 38.4), *below* the $20 band (INVAY 32 = depth 0.9286), so `t.depth >= SPLIT_TOO_CLOSE_DEPTH` is **never true**. Proven: across levels 1/3/9/17/33/60/81 the deepest a tanker ever reaches is **0.897** (max step 0.0151/frame), so no tanker can be at 0.9286 when it splits — by either the arrival path or a bullet. Gameplay is unchanged: a tanker shot in the player's face still sprays flipping children. **And W-032 is stamped `remediated_by: tp1-5` in the machine-checked audit, so the ledger now records a fix that does nothing.** | `src/core/rules.ts:265` (`TANKER_SPLIT_DEPTH`), `src/core/sim.ts:216,386-393` (`splitTanker`, `resolveTankerArrivals`) | Derive `TANKER_SPLIT_DEPTH` from the same `$20` as `SPLIT_TOO_CLOSE_DEPTH` (they are one ROM constant), or reconcile the two explicitly. Then pin it with a test that lets a tanker **climb** to its split instead of hand-placing it. Check the knock-on: `ENEMY_FIRE_MAX_DEPTH` (rules.ts:159) comments itself as `== TANKER_SPLIT_DEPTH`, and `SPLIT_CHILD_DEPTH` must stay under `PLAYER_RIM_DEPTH`. If the constants are genuinely meant to differ, W-032 must NOT be stamped remediated. |
| [MEDIUM] `[TEST]` | **[TEST-2] The W-032 test proves the branch from a state the sim cannot produce** — `splitOn(0.95)` hand-places a tanker at depth 0.95 with a point-blank bullet. This is what let the HIGH above through the whole pipeline: the test passes, and the game is unaffected. | `tests/core/tp1-5.pulsar-fuse-split.test.ts:336-360` | Drive the tanker up the well and let `resolveTankerArrivals` split it, then assert the children do not flip. |
| [MEDIUM] `[TEST]` | **[TEST-1] The W-023 replacement has no liveness guard.** `expect(pathWithPlayerAt(2)).toEqual(pathWithPlayerAt(14))` passes vacuously if the fuseball never moves at all — both paths would be `[8,8,8,…]`. The two tests it replaced carried exactly this guard ("actually closes the gap — it is steering, not frozen"), and TEA self-caught this same vacuity class twice during RED. | `tests/core/tp1-5.pulsar-fuse-split.test.ts:294-326` | One line: assert the path visits more than one distinct lane. |
| [MEDIUM] `[RULE]` `[TYPE]` | **[RULE-1] Prerequisite 3 is half-delivered.** `speedFor`'s `assertNever` is real and correct, but `enemyCanShoot`, `scoreFor`, `makeEnemy` and `stepGame`'s mode switch all switch on a closed union with no compile-time guard (`noImplicitReturns` is off, so a sixth kind returns `undefined` → `NaN` score). lang-review #3 is a stated project rule, so this is a violation, not a preference. | `src/core/rules.ts:168,357`; `src/core/sim.ts:123,784` | Add `default: assertNever(x)` to each. Export the helper from `interpreter.ts` or hoist it. |
| [MEDIUM] `[RULE]` `[SEC]` | **[RULE-2] The widened citation gate validates nothing once `remediated_by` + `class === 'NO_COUNTERPART'` are both set**, and it trusts `class` without cross-checking it. A genuine DIVERGENCE finding could be relabelled `NO_COUNTERPART` on the same commit that stamps `remediated_by`, silently shedding the historical `ours` the convention exists to preserve. The new test covers the 3 legitimate shapes but not the mislabelling one. This is the closest thing to an attack surface in a repo with no auth, no network and no untrusted input — the threat model here is *evidence integrity*, and the gate is the control. | `tools/audit/check-citations.mjs:102-119` | Assert the shape you actually mean: a remediated `NO_COUNTERPART` may have `ours` null **or** a valid `ours`, but nothing else; and a finding may not change `class` in the same commit that stamps `remediated_by`. |
| [LOW] `[DOC]` | **[DOC-1] `interpreter.ts:150-152` claims a sixth `EnemyKind` "now fails `tsc`, at the switch that forgot it".** It is false in three places (see [RULE-1]) — an active trap for the next author, and the comment is load-bearing precisely because it is reassuring. | `src/core/enemies/interpreter.ts:150-152` | Narrow the claim to `speedFor`, or make it true. |
| [LOW] `[DOC]` | **[DOC-2] The W-032 test's comment states the threshold as "depth > 0.857"; the constant is 0.9286.** The test cannot tell the difference (0.95 > both, 0.50 < both), which is itself the tell. | `tests/core/tp1-5.pulsar-fuse-split.test.ts:329-331` | Correct to 0.9286, and pick fixtures that straddle it. |
| [LOW] `[RULE]` | **Wave-parameterised ROM constants frozen at their wave-1 value** — `WPULTIM` is 4/6/8 (waves 1-48/49-64/65-99) and `WPULPOT` is $A0/$C0 (1-64/65-99); `PULSE_STEP` and `PULSAR_NEAR_FAR_DEPTH` hardcode 4 and $A0, and nothing caps the level. Deep-wave pulse period, duty cycle and potency height are all wrong. Disclosed in comments; now logged as a delivery finding. | `src/core/rules.ts:218-220,265` | Follow-up story; not this one's scope. |
| [LOW] `[SIMPLE]` | **`PULSAR_NEAR_FAR_DEPTH` now serves two distinct ROM constants** (JPULMO's climb-speed threshold and PULPOT). Equal today, they diverge at wave 65 — a future correction to one will silently move the other. | `src/core/rules.ts:265`, `src/core/sim.ts:457-459` | A `PULPOT_DEPTH` alias, even at the same value. |

**[SILENT]** — no swallowed errors, empty catches or silent fallbacks introduced. The one deliberate silent path (`chaser()` returning `undefined` to leave the PC alone) is the ROM's own `RTS` and is correct. `runCam`'s opcode `default:` throws rather than falling through, and its `budget` guard throws on a non-yielding program instead of hanging.

**Data flow traced:** player lane → `stepEnemies`'s `ctx.playerLane` → `jchpla` → `shortestRot(tube, e.lane, ctx.playerLane)` → `e.rot` → `jjumps` → `wrapLane`. Safe: `rot` is `-1 | 1` (required, never optional), `shortestRot` now always returns a direction so `rot` can never be left history-dependent, and the open-sheet branch (`!tube.closed`) skips the modular fold — the `;PREVENT WRAP` trap the SM warned about is closed, and the tests set `s.tube = tubeForLevel(level)` and assert `tube.closed` as a premise on waves 10 and 14.

**Pattern observed (good):** `chaserRimFramesPerLane` (`interpreter.ts:74-77`) reads TOPPER's crouch out of the bytecode (`CAM[CAM_ENTRY.TOPPER + 1]`) rather than restating it, so the shell's escape margin cannot drift from the CAM the interpreter actually runs — and `tests/shell/tp1-5.rim-speed.test.ts` then *measures* the cadence out of a running game instead of trusting either. That is the right way to kill a duplicated constant, and it is precisely the discipline `TANKER_SPLIT_DEPTH` needed and did not get.

**Error handling:** the CAM's `budget` guard (`interpreter.ts:490`) throws on a program that never yields; `speedFor`'s `assertNever` converts a silent `NaN` into a compile error. Null inputs: `chasing` is `undefined` on every enemy that has not converted and is read with `=== true`, never truthily.

**Handoff:** Back to Han Solo (TEA) — the blocker and both MEDIUM test findings are testable, and the W-032 fix needs a test that lets the tanker climb rather than one that hand-places it.

### Reviewer (audit — second pass)

Every Dev and TEA deviation from the rework is stamped below.

- **Dev: fixed only HALF of W-030, and refused to stamp it.** → ✓ **ACCEPTED by Reviewer.** This is the right call and it was the hard one. I verified the ROM myself: `KILINV` (2300-2302) opens `LDA Y,INVAY / STA TEMP0` — the PARENT's own depth — and `ACTINV` (1219-1226) seats each child from it, so W-030's second half is genuinely still open. Stamping `remediated_by` would not merely have been *imprecise*: it would have told the citation gate to STOP RE-OPENING a divergence that is still live in the code, blinding the gate to a real bug. Faced with a rule that cannot be obeyed (CLAUDE.md rule 1 assumes one finding = one divergence), Dev picked the branch that keeps the gate honest about live code and lost the historical quote instead. That is the correct trade, and refusing to commit the same false-ledger sin twice in one story is exactly the lesson the first rejection was meant to teach. The residue is real and I have raised it as a finding and filed tp1-24 — but it is the *consequence* of the right decision, not a wrong one.
- **Dev: did NOT implement W-030's second half, though the code was one line away.** → ✓ **ACCEPTED by Reviewer.** Correct restraint. `SPLIT_CHILD_DEPTH`'s own comment ("Must be < PLAYER_RIM_DEPTH (0.92) so a rim-split is not an instant grab") shows the 0.85 clamp is a deliberate softening that predates this epic, and closing it makes children spawn ABOVE the grab line — a genuine difficulty change. A story already rejected once for claiming more than it delivered is precisely the wrong place to slip in an unrequested one. Filed as tp1-24, as a DECISION story rather than a transcription.
- **Dev: edited two of TEA's tests — a broken resolver, not a moved goalpost.** → ✓ **ACCEPTED by Reviewer.** Verified: the old resolver only rewrote a trailing `.js`, so an extensionless import (this repo's own convention under `moduleResolution: bundler`) resolved to a path with no extension and threw ENOENT *before any assertion ran*. The test could not fail for its own reason in either direction. Dev changed the path arithmetic and nothing else; every assertion is TEA's, and he did not delete the older test even though the new `it.each` subsumes it. That is the honest way to touch another agent's test.
- **Dev: `stepGame` switches on a captured `const mode`.** → ✓ **ACCEPTED by Reviewer, with a correction to its comment.** The refactor is behaviourally inert — I confirmed `mode` is read only at the switch header and the default, while every arm still reads and writes the live `s.mode`. But the comment justifying it ("half these arms reassign `s.mode`, which would otherwise re-widen the discriminant and rob the `default` of the `never`") is **not true**: TypeScript computes a switch default's exhaustiveness from the case labels against the discriminant's declared type, not from control-flow mutations in sibling arms, and `assertNever(s.mode)` would have compiled fine without the capture. The capture is harmless and arguably better style. But this story has now shipped a *reassuring comment that overclaims* twice — see [DOC-1] below. Fix the comment, not the code.
- **TEA: replaced the W-032 test rather than repairing it (hand-placed → CLIMBS).** → ✓ **ACCEPTED by Reviewer.** This is the fix that mattered. The old fixture built a board the simulation cannot produce, which is how a dead branch passed a full pipeline. The replacement drives a real climb and carries three premises (two children, born straddling the parent's lane, neither having taken the rim) so a lane change can only mean a flip.
- **TEA: widened lang-review #3 from `speedFor` alone to every switch it governs.** → ✓ **ACCEPTED by Reviewer.** Correct reading of the rule's intent over the prerequisite's letter, and she verified with `tsc` that a generic `K extends EnemyKind` narrows to `never` before demanding it — she did not hand Dev an impossible test.
- **TEA: tested only half of the citation-gate finding [RULE-2].** → ✓ **ACCEPTED by Reviewer.** The half she pinned (a malformed `ours` must be rejected) is the half that was a defect *today*; the class-relabel attack needs a frozen id→class manifest, which is gate design and belongs to tp1-22. Correctly scoped and correctly routed. Ironically, W-030 has now demonstrated the residual hole in practice: a finding's citation was rewritten and the gate could not tell.

## Subagent Results (second pass)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (all green) | N/A — regression sweep confirmed no test was weakened to fit the fix |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (I re-probed the blocker empirically) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (found [DOC-1]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer + rule-checker |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (evidence-integrity is the threat model; see [SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled subagents returned; 7 disabled via `workflow.reviewer_subagents` and their domains assessed by the Reviewer directly)
**Total findings:** 4 confirmed, 0 dismissed, 0 deferred

The rule-checker's single finding (W-030's re-pointed citation) independently reproduces my own, and it did the one thing I most wanted: it **proved** the exhaustiveness guard rather than reading it — deleting a case from `scoreFor` and from `stepGame` and confirming `tsc` fails with *"not assignable to parameter of type `never`"* both times, then reverting. That converts [RULE-1] from "the code says assertNever" to "the compiler enforces it."

### Rule Compliance (second pass)

| Rule | Instances checked | Verdict |
|------|-------------------|---------|
| **#3 enum exhaustiveness** | **7** (`speedFor`, `scoreFor`, `enemyCanShoot`, `makeEnemy`, `stepGame`, plus `camParam` and the CAM opcode dispatch) | **PASS — the cycle-1 blocker cleared.** All five closed-union switches now carry a real `never` guard, proven by case-deletion. `camParam` and the opcode dispatch correctly do NOT get one: they switch on `number` (bytecode operands), which can never narrow to `never`, so `assertNever` there would be decoration. Knowing where the rule does *not* apply is part of applying it. |
| #1 type-safety escapes | 7 files | **PASS.** No `as any`, `@ts-ignore`, or non-null assertion in the rework. |
| #4 null/undefined | 5 | **PASS.** `isCitation`'s call site correctly distinguishes `null`/`undefined` from a malformed object; no `||`-vs-`??` bug. |
| #5 modules | 4 | **PASS.** `src/core/assert.ts` is a true leaf (zero imports) — the only place `rules.ts`, `state.ts` and `interpreter.ts` can all reach without a cycle. Correct diagnosis by Dev. |
| #8 test quality | 3 | **PASS.** The W-032 test now drives a real climb; the W-023 liveness guard is restored. Both cycle-1 [TEST] findings closed. |
| #10 input validation | 1 | **PASS.** `isCitation()` *is* the runtime shape guard on JSON-parsed findings — the fix, not a violation. |
| #11 error handling | 2 | **PASS.** `assertNever` throws descriptively; nothing swallowed. |
| **A — core purity (the repo's most important rule)** | 4 | **PASS.** `src/core/assert.ts` imports nothing and cannot violate the boundary in either direction. No `Math.random`/`Date.now`/DOM/shell import anywhere in `src/core/`. Determinism intact. |
| **B — the citation gate** | 2 | **1 VIOLATION.** `isCitation` genuinely closes the malformed-`ours` hole (cycle-1 [RULE-2]). But W-030's citation was re-pointed to different code with no `remediated_by` trail — see [RULE-B] below. |
| C — tube space | 3 | **PASS.** Every new constant and call site stays in [0,1]. |
| D — 28.44 fps | 1 | **PASS.** No new frame-rate constant; `ROM_FPS` untouched. |
| #2 / #6 / #7 / #9 / #12 / #13 | — | **PASS or N/A** (no generics/JSX/async/tsconfig/bundle changes in the rework). |

### Devil's Advocate (second pass)

Let me try to break the fix rather than admire it. The obvious attack is that `TANKER_SPLIT_DEPTH` moved to 0.9286, which is **above** `PLAYER_RIM_DEPTH` (0.92) — so for the first time in this codebase an invader routinely climbs *through* the grab line. If a tanker were a grabber, the fix would have turned every carrier into an instant kill and the whole thing would be a disaster. It is not: `GRABBER_KINDS` is `{flipper, fuseball, pulsar}`, and I confirmed the frame order is `stepEnemies → resolveBulletHits → resolveTankerArrivals → resolvePlayerHits`, so the tanker is destroyed *before* the hit check ever runs. I measured it: exactly one frame in the window, at every level from 1 to 81. Safe — but safe by a coincidence of two unrelated constants, and the next person to add a kind to `GRABBER_KINDS` will not know that. That is worth saying out loud, and it is why I have raised `PLAYER_RIM_DEPTH` as a question.

Second attack: could a tanker now overshoot the band entirely and become a CHASER instead of splitting? The band is 0.9286→1.0, width 0.0714; the fastest tanker step is 0.0151 at wave 33+. It cannot skip. I verified across six levels — every tanker bursts inside the band, and its children land with `camPc = 7` (NOJUMP) even at wave 3 where the wave's own cam is 25 (SPIRAL). That is the proof the branch fires and *overrides*, which is the thing that was dead last cycle.

Third, and the one that actually landed: I do not fully trust a fix whose test I have not seen fail. So I did not trust the exhaustiveness guard on the word of the source — and the rule-checker deleted a case and watched `tsc` reject it. Good.

What survives, then? Not the code — the **ledger**. The story's own remediation of W-032 quietly half-closed a *different* finding, W-030, which the epic had already written down and then walked past for five stories. Its title still says the split depth is wrong when it is now right; its `claim` quotes a constant that no longer exists; and the evidentiary quote it was filed against has been deleted from the audit with nothing recording which story deleted it. The code is more faithful than it has ever been and the record of *why* is quietly less trustworthy than it was yesterday. In an epic whose entire authority rests on that record, that is the thing to fix next — and it is a symptom, not an accident: the convention has two verbs where the world has three.

## Reviewer Assessment (second pass)

**Verdict:** APPROVED

The blocker is dead, and I did not take anyone's word for it. Driving a real tanker up the well at levels 1, 3, 9, 17, 33 and 81, the burst now lands **inside** the ROM's $20 band every time (0.9286–0.9369), and the children are born with `camPc = 7` — NOJUMP — even at wave 3, where the wave's own cam is 25 (SPIRAL). That is W-032 firing and *overriding*, in a board the game can actually produce. Last cycle it could not fire at all.

**What was fixed, and verified:**

- `[EDGE]` **The HIGH is closed.** `TANKER_SPLIT_DEPTH` is now *derived* from `SPLIT_TOO_CLOSE_DEPTH` — one ROM constant, as `JSMOVE` and `SPLCHA` both read it (`CMP I,20 / IFCC`). I re-read both against `ALWELG.MAC`. The comment above it forbids them drifting apart again, and says why.
- `[TEST]` **Both cycle-1 test findings closed.** The W-032 test drives a real climb instead of hand-placing a tanker at a depth no tanker can occupy; the W-023 liveness guard is restored, so a frozen fuseball can no longer pass vacuously.
- `[RULE]` `[TYPE]` **Prerequisite 3 is now real, and proven.** All five closed-union switches carry a `never` guard, demonstrated by deleting a case and watching `tsc` reject it. `assertNever` lives in a leaf module because `rules.ts` cannot import from `interpreter.ts` — Dev diagnosed the cycle correctly.
- `[SEC]` **The citation gate's malformed-`ours` hole is closed.** In a repo with no auth, no network and no untrusted input, evidence integrity *is* the threat model, and `isCitation()` is the control. The residual — `class` is still taken on trust — is correctly routed to tp1-22.
- `[SILENT]` No swallowed errors, empty catches or silent fallbacks. `assertNever` throws loudly; the CAM's budget guard still throws rather than hanging.
- `[SIMPLE]` The rework is smaller than the problem it solves: one constant collapsed into another, one leaf module, one shape guard.

**Remaining findings — none blocking:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| [MEDIUM] `[RULE]` `[SEC]` | **[RULE-B] W-030's `ours` was re-pointed with no `remediated_by` trail, and the finding now asserts a divergence that is closed.** Its `title`/`claim`/`reasoning` still call the 0.9-vs-0.929 split depth an open bug; `rules.ts:300` now derives it from the ROM's own $20. The quote it was filed against (`= 0.9`) is gone from the audit, and nothing records which story closed that half. **I am not dismissing this — but I am downgrading it, with rationale.** Stamping `remediated_by` would have been *worse*: it tells the gate to stop re-opening the finding, and W-030's OTHER half (children at the parent's depth) is still live — the gate would have gone blind to a real, open bug. CLAUDE.md's rule 1 assumes one finding = one divergence and is simply unsatisfiable for a compound one. Dev took the branch that keeps the gate honest about live code, and said so in four places. | `docs/audit/findings/pair-1-alwelg-sim-enemies.json` (W-030) | **Filed as tp1-24**, whose ACs require W-030 be SPLIT: the closed half `remediated_by: tp1-5` keeping its ORIGINAL frozen quote, the open half pointing at the clamp. |
| [LOW] `[DOC]` | **[DOC-1] The `const mode = s.mode` comment overclaims — again.** It says the arms reassigning `s.mode` "would otherwise re-widen the discriminant and rob the `default` of the `never` it needs". They would not: TypeScript computes a switch default's exhaustiveness from the case labels against the discriminant's declared type, not from mutations in sibling arms. The capture is harmless and arguably better style; the *justification* is fiction. This story has now shipped a reassuring-but-false comment twice (the first was `interpreter.ts`'s "now fails `tsc`"), which is a pattern worth naming: a comment that reassures is exactly the one nobody re-checks. | `src/core/sim.ts:789-792` | State what it actually buys (defensive clarity), or drop it. |
| [LOW] `[RULE]` | **The citation convention has two verbs where the world has three** — "the line moved" and "the line was fixed", with no way to say "half of this was fixed". `reanchor-citations.mjs`'s own LOST message offers only those two, and both lie about a compound finding. | `tools/audit/reanchor-citations.mjs`, `tempest/CLAUDE.md` | tp1-22. Either forbid compound findings (one divergence, one id) or name the split. |
| [LOW] `[EDGE]` | **`PLAYER_RIM_DEPTH` (0.92) is looser than the ROM's grab line, and the tanker fix has walked an invader through it** for the first time — one frame, every level. Harmless only because `GRABBER_KINDS` excludes tankers; safe by a coincidence of two unrelated constants. | `src/core/rules.ts:84` | Out of scope; raised as a Question. |

**Data flow traced:** a climbing tanker → `stepEnemies` (CAM moves it past 0.9286) → `resolveBulletHits` (a bullet here splits it *inside* the band, so a point-blank kill also yields NOJUMP children — correct) → `resolveTankerArrivals` (bursts it; `t.depth >= SPLIT_TOO_CLOSE_DEPTH` is now necessarily true) → `splitTanker` → `genericCamFor` → children on NOJUMP at `SPLIT_CHILD_DEPTH` → `resolvePlayerHits` (tanker already gone; children at 0.85, below the grab line). Safe at every hop, and I measured each one.

**Pattern observed (good):** `TANKER_SPLIT_DEPTH = SPLIT_TOO_CLOSE_DEPTH` — not `0.9286`, not a re-derivation of `(0xf0 - 0x20) / WARP_ALONG_SPAN`, but the *same symbol*. Two numbers that must be equal cannot drift if there is only one of them. That is the same discipline `chaserRimFramesPerLane` used to read TOPPER's crouch out of the bytecode, and it is the lesson of this entire rejection: the bug was never the arithmetic, it was that the arithmetic was written down twice.

**Error handling:** `assertNever` converts five silent `undefined`-returning switches into compile errors — verified by making the compiler reject a deliberately broken one.

**Handoff:** To Grand Admiral Thrawn (SM) for finish-story.