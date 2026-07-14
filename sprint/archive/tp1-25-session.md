---
story_id: "tp1-25"
jira_key: "tp1-25"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-25: W-023's other half — from wave 17 the fuseball DOES chase, and it chases BACKWARDS

## Story Details
- **ID:** tp1-25
- **Jira Key:** tp1-25
- **Type:** bug
- **Points:** 2
- **Priority:** p2
- **Workflow:** tdd
- **Repos:** tempest
- **Branch:** fix/tp1-25-fuseball-backwards-chase
- **Stack Parent:** none

## Description

Found by Yoda during tp1-5 and left homeless; filed on Jedi's instruction (2026-07-14). tp1-5 closed W-023 for waves 1-16 and that is where the game actually plays: TWFUSC's table (ALWELG.MAC:686-690) has NO record below wave 17, so CONTOUR's end-of-table path yields 0, neither of WFUSCH's chase bits is set, and every fuseball decision falls to LEFRIT — 'RANDOMLY CHOOSE LEFT OR RIGHT' (2171-2178), a `BIT RANDOM` coin with the player as no input at all. That is the fix tp1-5 shipped, and it is right. BUT THE TABLE STARTS AT 17: `TWFUSC: .BYTE TR,17.,32.,0,40 / .BYTE TR,33.,48.,40,0C0 / .BYTE T1,49.,99.,0C0`. From wave 17 the chase bits ramp on, and the ROM then routes through FUCHPL (2168-2170) — which is `JSR JCHPLA` followed by `JSR JCHROT`, i.e. it aims at the player and then REVERSES: the source's own comment is 'FUSE IS BACKWARDS'. MAYBLR adds an 'only if the invader index is even' rule on top. `src/core/enemies/interpreter.ts` (`jfuseup`) now rolls the LEFRIT coin UNCONDITIONALLY at every wave, so deep-wave fuseballs are wrong in the OTHER direction from the bug tp1-5 fixed — we have traded a fuseball that always chased for one that never does. Neither is the arcade. This is the second half of W-023 and nothing implements or tests it.

## Acceptance Criteria

- WFUSCH's two chase bits are read from TWFUSC per wave (ALWELG.MAC:686-690), cited. Below wave 17 the table has no record and the bits are 0 — the LEFRIT coin tp1-5 shipped must NOT regress.
- From wave 17 the fuseball takes FUCHPL: JCHPLA then JCHROT — it aims at the player and then reverses ('FUSE IS BACKWARDS', 2168-2170). Cite the source. Do not 'fix' the reversal; it is the ROM.
- MAYBLR's even-invader-index gate is implemented or explicitly logged as a deviation with its reasoning.
- A test pins BOTH sides against a real wave: a wave-1 fuseball still ignores the player (the same seed walks the same path wherever he stands, WITH a liveness guard — a frozen fuseball must not pass vacuously), and a wave-17+ fuseball demonstrably does not.
- npm test -- citations stays green and `node tools/audit/reanchor-citations.mjs` reports 0 lost.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-14T12:59:54Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-14T11:54:52Z | 2026-07-14T11:57:28Z | 2m 36s |
| red | 2026-07-14T11:57:28Z | 2026-07-14T12:13:40Z | 16m 12s |
| green | 2026-07-14T12:13:40Z | 2026-07-14T12:19:24Z | 5m 44s |
| review | 2026-07-14T12:19:24Z | 2026-07-14T12:36:22Z | 16m 58s |
| red | 2026-07-14T12:36:22Z | 2026-07-14T12:41:09Z | 4m 47s |
| green | 2026-07-14T12:41:09Z | 2026-07-14T12:44:34Z | 3m 25s |
| review | 2026-07-14T12:44:34Z | 2026-07-14T12:57:19Z | 12m 45s |
| green | 2026-07-14T12:57:19Z | - | - |

## Delivery Findings

**F1 — The story's headline is off by one. The fuseball does NOT chase at wave 17.**
`TR` is not a ramp. `CONTOUR`'s type table says `TR=0C;ALTERNATE BETWEEN BYTES 3 & 4`
(ALWELG.MAC:414) and `DOTR` (858-865) is `JSR RANGER / AND I,1 / IFNE / INY` — byte 4 on an ODD
offset into the range, byte 3 on an EVEN one. `RANGER` (848-856) is `TEMP2 - startWave`; `TEMP2`
is the 1-based wave. So wave 17 is offset 0, EVEN, and draws byte 3 = **0**. The first chasing
wave is **18**. The story title ("from wave 17 the fuseball DOES chase") and AC-1's "the chase
bits ramp on" both describe a mechanism the ROM does not have. Tests pin the alternation.
*This one matters:* a test written to the story's wording would have pinned wave 17, found no
chase, and been "fixed" by forcing one — shipping a bug with a green suite.

**F2 — AC-3's premise is inverted. MAYBLR's gate is ODD, not even.**
2157-2160 is `TXA / LSR / BCC LEFRIT / JSR FUCHPL`. `LSR` shifts bit 0 into the carry; `BCC`
branches when the carry is CLEAR — an **even** index — and that branch goes to `LEFRIT`, the coin.
The chase is what falls through, on an **odd** index. The ROM's own comment on 2157 reads
";YES. ONLY IF INDEX IS EVEN" and is simply wrong; AC-3 inherited the comment's word. The comment
records intent, the code records behaviour. Pinned in `tp1-25.source-rules.test.ts` with the
citation, so nobody "corrects" it back to the label.

**F3 — Tempest had no quarry fingerprint. It does now.**
Two copies of Theurer's source sit on this machine and disagree in a STAIRCASE, not a constant
offset: `~/Projects/tempest-source-text` (3569 lines, LF, **citable** — the `TEMPEST_SOURCE_DIR`
default) and `~/Projects/tempest-source` (3559 lines, CRLF, keeps all ten form feeds glued onto
the following line). `TWFUSC` is off by 1 between them; `"FUSE IS BACKWARDS"` is off by 6. Every
citation in this story is void against the wrong copy. Red Baron shipped an entire poisoned
findings doc this way (rb4-2). The new fingerprint is mutation-proven against the *real* sibling,
not a reconstruction of one.

**F4 (Dev) — The AUDIT doc itself carries the "EVEN" error, and it is still there.**
This is not just the story's wording. `docs/audit/findings/pair-1-alwelg-sim-enemies.json`, finding
W-023, states in its `claim`: *"MAYBLR only chases on an EVEN invader index (2157-2159)."* That is
false for the reason in F2 — the even index is the one that branches to the COIN. The audit copied
the ROM's stale comment, the story inherited it from the audit, and AC-3 inherited it from the
story. It has now propagated through three documents.
*Credit where due:* the same claim gets `TR` **right** — *"TR alternates 0/$40 across waves 17-32"*
— so the audit knew the alternation and it was the STORY's description that garbled it into a ramp.
**Not fixed here** (rewriting audit prose is its own story, and rb4-2 is the cautionary tale for
doing it casually), but it cannot propagate silently any more: `tp1-25.source-rules.test.ts` pins
the refutation with the call-site citation. **Recommend SM file a follow-up** to correct the claim.

**F5 (Dev) — The port has no stable per-enemy slot id, and at least one ROM rule needs one.**
`s.enemies` is filtered on death (`sim.ts:372`), so an enemy's array index is not stable across
frames. The ROM's `INVAY` slot is. Any ROM rule keyed on the invader index — `MAYBLR`'s parity
gate is the one in front of us, and it is unlikely to be the last — cannot be ported faithfully
until an enemy carries a slot id assigned at spawn. This is the blocker behind deviation D2.
**Recommend SM file a follow-up** to add the slot id and then implement MAYBLR's gate (ODD, per F2).

**F6 (Reviewer) — tp1-26 IS ABOUT TO WALK INTO THIS EXACT HOLE, and it will hurt more there.**
The fall-off bug was not a fuseball bug. It is a **CONTOUR** bug, and CONTOUR is shared by every wave
table in the ROM. I checked the other per-level lookups in `rules.ts` and today we got lucky —
`wttfraForLevel` (`level >= 33 ? 3 : 2`), `flipperSpeedForLevel` (clamped lerp), `warpAccel`
(`Math.min`) and `flipperCamForWave` (`& 0x0f` wrap) all **saturate**; `wfuschForLevel` was the only
lookup walking a bounded table, hence the only one that could fall off it.

**tp1-26 changes that.** It ports `WPULTIM` and `WPULPOT`, and BOTH tables end at 99:

    WPULPOT (ALWELG.MAC:606-609)   .BYTE T1,1,32.,0A0 / T1,33.,64.,0A0 / T1,65.,99.,0C0
    WPULTIM (ALWELG.MAC:610-613)   .BYTE T1,1,48.,4   / T1,49.,64.,6   / T1,65.,99.,8

Port them with the same naive walk and wave 100 returns **0** for both — and 0 is far nastier there
than it was here. `PULTIM` is the pulse counter's **STEP**: a step of 0 means the pulse counter never
advances and **the pulse freezes forever**. `PULPOT` is the kill gate: 0 puts the potency zone at
depth 0. A player past wave 99 would meet pulsars that never pulse.

**Recommendation:** do not let tp1-26 re-derive the fold. Extract CONTOUR's deep-wave substitution
once — a `contourWave(level)` helper carrying the 415-423 citation — and have every table lookup go
through it. The bug is in the *shape* of the port, not in any one table. **SM: seed this into tp1-26's
context before it starts.**

## Design Deviations

**D1 — The port collapses the ROM's TWO fuseball decision points into one. This is Dev's call
to make and log (AC-3).** The ROM branches twice:

    JFUSEUP direct (2135-2140)   at bottom of range → BIT WFUSCH / IFVS → FUCHPL | LEFRIT
    MAYBLR         (2148-2166)   otherwise          → depth ∧ freq roll ∧ parity → FUCHPL | LEFRIT

Only `MAYBLR` carries the invader-index parity gate. `jfuseup` has a single decision (the
`FUSEBALL_MOVE_PROB` roll on a jitter tick), and my behavioural tests pin it as the **direct**
branch: a lone fuseball riding the tube consults `WFUSCH` bit 6 and chases, with no parity gate
in the way. If you instead gate the port's only decision on parity, a lone fuseball at an even
slot never chases and those tests go red — that is the signal to log the deviation, not to weaken
the tests. The port also has no faithful analogue of the ROM's fixed invader-slot index (`s.enemies`
is a spliced array), which is the substantive argument for deviating.

**D2 (Dev) — AC-3: MAYBLR's parity gate is NOT implemented. Deviating, with reasons.**
AC-3 permits "implemented or explicitly logged as a deviation with its reasoning." I am logging
it, and the reason is not laziness — implementing it on today's data model would introduce a bug
the arcade does not have.

The ROM's gate keys on `X`, the invader's **slot index** in the fixed `INVAY` array. `INIINV`
(345-350) allocates `NINVAD` slots once and walks them with `DEX`; a slot belongs to an invader
for its whole life. The port has no such thing. `s.enemies` is a **spliced** array —
`s.enemies.filter((_, i) => !deadEnemies.has(i))` (sim.ts:372) — so an enemy's index **shifts
whenever an earlier enemy dies**. Key the parity on array position and a fuseball's chase would
switch on and off as *unrelated* enemies are shot, which is not a ROM behaviour at all. That is
strictly worse than omitting the gate: it trades a known, bounded deviation for an invented one.

Doing it faithfully needs a stable per-enemy slot id (a new `EnemyBase` field, threaded through
every spawn site) — real work, no test demands it, and it is out of scope for a 2-point bug.
Recommended as a follow-up (see Delivery Finding F5).

**Observable effect of deviating:** at chasing waves, *every* fuseball chases, where the arcade
chases with roughly half of them (the odd slots). Fuseballs at waves ≥18 are therefore somewhat
more aggressive than the original. Note this only bites from wave 18 up; waves 1-17 — where the
game is actually played — are bit-for-bit the LEFRIT coin tp1-5 shipped.

Also note (F2): the gate is **ODD**, not even. If the follow-up implements it, it must implement
odd — AC-3's wording, and the ROM's own comment, are both wrong.

## Reviewer Assessment — ROUND 3

**Verdict: APPROVED**

Both round-2 findings closed, doc-only, no code or test logic touched (verified: the diff contains
**no non-comment lines**).

**The corrected guard comment is mutation-verified.** I did not take it on trust — I reintroduced the
hoisted `gated = wfusch || FUSE_CHASE_ON_TUBE` call-site fallback and confirmed the comment now
describes exactly what happens: `tp1-25.source-rules.test.ts` stays **green** (15/15), precisely as the
comment now *admits* it must, and `tp1-25.fuseball-chase.test.ts` goes **red** (3 failed), precisely as
the comment now *names* those tests as the real guard. The comment and the code finally agree.

**The citation is correct.** JFUSEUP's `RTS` is at ALWELG.MAC:2145 — I re-opened it. The docblock range
now covers the on-tube branch this story depends on.

**Final state:** 1001/1001 tests, `npm run build` clean, citation gate green, `reanchor-citations.mjs`
reports 0 lost, `src/core` purity intact, no `as any` / non-null assertions.

**Specialist sweep — all clean at close:**
- [TEST] The one surviving finding, and the reason for round 2. Closed and mutation-verified above:
  the guard's comment now matches what the guard actually catches, and names the behavioural tests
  that catch the rest.
- [RULE] Clean. Rule #3 exhaustiveness fixed — `assertNever` on the TWFUSC union, and the rule-checker
  *proved* it bites by adding a `TA` variant and watching `tsc` fail at that exact call site. Rule #5
  `import type` fixed. Rule #4 (`||` on a falsy-but-valid 0) clean — the call site uses a bitwise `&`.
  Citation gate mechanics (reanchor + `remediated_by`) correct.
- [SEC] Clean. No breach of the `src/core` purity boundary — no DOM, no `Math.random`, no `Date.now`,
  no `performance.now`, no shell import. The RNG asymmetry (FUCHPL consumes one fewer draw than
  LEFRIT) is *faithful* — the ROM's FUCHPL never reads RANDOM either — and the branch is selected by
  deterministic state, so replays cannot desync. No secrets, no user input, no injection surface.
- [EDGE] Closed — the wave-100 fall-off was the round-1 blocker; the fold is verified at every
  boundary and the ROM's random band provably collapses to one answer.
- [SILENT] Closed — the same finding; `0` no longer doubles as "no chase" and "off the end of the table".
- [TYPE] Closed — exhaustiveness added; the raw-byte return is the ROM's own representation and stands.
- [SIMPLE] Closed — `FUSE_CHASE_AT_TOP` is now logged as deviation D3 rather than sitting as a silent
  dead export.
- [DOC] Closed — every ROM citation in the diff was independently re-opened and resolves exactly; the
  `jfuseup` docblock no longer claims the fuse rolls "toward the player", and its range now covers the
  branch it depends on.

**What this story actually shipped.** The fuseball now reads WFUSCH per wave out of TWFUSC: the LEFRIT
coin below 18 (tp1-5's half, unregressed), and from 18 up FUCHPL — aim the shortest way to the player,
then reverse, so it sets off the long way round. *"FUSE IS BACKWARDS"* is the ROM and it survived three
separate opportunities to be "corrected". Along the way the story found that its own title was off by
one (TR alternates, so wave 17 does not chase), that its AC-3 had the parity gate inverted (the ROM's
own comment is wrong — the chase is on ODD), that the audit doc carries the same error, that Tempest
had no quarry fingerprint, and that the lookup fell off the end of its own table at wave 100.

Every deviation is logged with reasoning. Every guard has been made to fail on purpose. Approved.

### Deviations audit (final)

| Deviation | Verdict |
|---|---|
| **D1** — port collapses the ROM's two fuseball decision points | **ACCEPTED** (completed by D3) |
| **D2** — MAYBLR's parity gate not implemented (no stable invader slot) | **ACCEPTED** — implementing it on a spliced array would invent a flicker the ROM has not got |
| **D3** — `FUSE_CHASE_AT_TOP` transcribed, not wired (no up/down oscillation to gate) | **ACCEPTED** — all three claims independently verified against the source |

---

## Reviewer Assessment — ROUND 2

**Verdict: REJECTED** (doc-only — the code is correct)

**The blocker is genuinely fixed.** I verified the fold at every boundary myself (98/99/100/150/999 →
`$C0`; waves 1-98 byte-for-byte unchanged), and the edge-hunter independently proved the ROM's random
band 65..96 lies wholly inside the flat `T1` record, so folding to 99 and drawing at random are
*provably the same answer*. The rule-checker proved the new `assertNever` actually bites by adding a
`TA` variant and watching `tsc` fail at exactly that call site. The comment-analyzer re-opened every
new citation — `ALWELG.MAC:415-423`, `2121-2130`, `ALCOMN.MAC:786` — and all resolve. 1001/1001,
build clean, citations green, reanchor 0 lost, `src/core` purity intact.

Three of the four round-1 findings are closed cleanly. The fourth is not, and it is the one this
story of all stories cannot leave open.

### The finding

**[TEST] [DOC] The guard that replaced the fake guard tells the same kind of lie.**

`tp1-25.source-rules.test.ts` — the new `0 survives the lookup as a VALUE` test carries the comment:

> *"So assert the VALUE through the exported function instead of grepping for a shape.
> **No refactor can hide from this**, because it is the property that actually matters: `0` is a real
> answer … and **it must reach the caller intact**."*

It does not check that it reaches the caller. It calls `wfuschForLevel(1..17)` directly and never goes
near `jfuseup`. The test-analyzer mutation-proved it: reintroduce the *exact* call-site fallback the
old fake guard was written to ban, and **this test stays green**. What catches that mutation is three
*pre-existing* behavioural tests in the sibling file — the ones TEA correctly identified in the session
notes, but the in-file comment does not.

So the test is **not vacuous** — it does pin a real invariant (a fallback baked *inside*
`wfuschForLevel` would fail it) — but its comment claims a threat model it does not cover, and names
itself the replacement for the call-site guard it cannot replace. The harm is concrete: a future
reader trusts "no refactor can hide from this", concludes the behavioural `ignoresPlayer` tests are
redundant, and deletes the only thing standing between this repo and the bug.

I am not going to wave this through. **F1, F2 and F4 in this very session all exist because somebody
believed a comment that was not true**, and the fake regex we just tore out was itself a
comment-shaped lie. Approving a *new* overclaiming guard, in the story whose entire subject is
"a stale comment cost us", would make the lesson worthless. It is a five-line correction.

**[DOC] Secondary, cheap, fold it into the same pass:** `jfuseup`'s docblock cites
`ALWELG.MAC:2095-2135`, but JFUSEUP runs to its `RTS` at **2145**. The on-tube branch this story now
depends on (2131-2144) — including the very line `FUSE_CHASE_ON_TUBE` is drawn from — falls *outside*
the cited range. Pre-existing, but the story just made it load-bearing. Widen it to 2095-2145.

### Dismissed, with reasons

- **NaN doesn't fold** (edge-hunter, low): verified — returns `0`, identical to the TE default, and
  unreachable (`s.level` is an integer from 1). Pre-existing, sits on a touched line, no behaviour
  change. Not a finding.
- **`>= 99` vs `>= 100`**: Dev reported this mutation stays green and was right to. Wave 99 is inside
  `T1` either way, so the two spellings are genuinely equivalent. Honest reporting, not a gap.

### My own error, recorded

The six test failures and the `TA` type error I saw mid-review were **mine, not the code's**: I ran my
verification against the same working tree as subagents that were actively mutating it, and my
`reanchor --write` then wrote citation anchors against a mutated `rules.ts`. The rule-checker caught
and reverted the corrupted JSON; I reset and re-verified **serially**, and the tree is byte-identical
to HEAD. No defect in the diff came from this. *Never run verification concurrently with
mutation-testing agents on one working tree.*

### Deviations audit

| Deviation | Verdict |
|---|---|
| **D1** (port collapses the ROM's two decision points) | **ACCEPTED** — now completed by D3, which supplies the AT_TOP half it was missing. |
| **D2** (MAYBLR's parity gate not implemented) | **ACCEPTED** — re-verified: `s.enemies` is filtered on death, so a position-keyed parity gate would invent a flicker the ROM does not have. |
| **D3** (FUSE_CHASE_AT_TOP transcribed, not wired) | **ACCEPTED** — all three claims independently verified: bit 7's question lives on JFUSEUP's "TOO HIGH?" arm (2121-2130); `ALCOMN.MAC:786` names both bits; and our fuseball genuinely has no up/down oscillation (`direction` is set once at spawn and never mutated for a fuseball). Wiring it would mean inventing a movement mode. Correct call, correctly logged. |

**Routing:** doc-only → Dev (green). No test or logic change required.

---

**D3 (Dev, round 1) — `FUSE_CHASE_AT_TOP` (bit 7) is transcribed but NOT wired. Logged, as the
Reviewer required.**
The ROM asks bit 7's question on JFUSEUP's "TOO HIGH?" arm (ALWELG.MAC:2121-2130) — the branch a fuse
takes while riding UP near the rim, in the up/down oscillation the ROM's fuse performs. **Our fuseball
has no such arm.** It climbs on `moveAlong` with its own clamp at the top and never enters that
oscillation (the pre-existing comment at `interpreter.ts` says so: it "never falls into ATOP"). So
there is no live decision point for bit 7 to gate — wiring it would mean inventing a movement mode
the port does not have, which is a bigger change than this 2-point bug and would not be verifiable
against anything.

The constant stays because it is **half of the byte TWFUSC actually stores**: `wfuschForLevel` returns
the real ROM byte, and from wave 33 that byte genuinely carries 0x80. Deleting the name would not
delete the bit; it would just leave it unnamed. `ALCOMN.MAC:786` names both — *"FUSE CHASE PLAYER FLAG
(D7 FOR TOP;D6 FOR TUBE)"*.

**Observable effect:** none today. Bit 7 is inert in the port, and the comment at the export now says
so explicitly and warns against reading the pair as if both were live. **Recommend a follow-up** to
model the fuse's up/down range oscillation, at which point bit 7 acquires a real gate.

## Dev Assessment — REWORK (round 1)

**Status:** GREEN — 1001/1001 tests, build clean (tsc + vite), citation gate green, reanchor 0 lost.

The Reviewer's blocker was real and I had no defence for it: the lookup was simply **wrong outside
the table**, and my own mutation testing missed it because I mutated the *rules I had written* rather
than probing the range I had never considered.

**All four findings closed:**

| # | Finding | Fix |
|---|---|---|
| 1 | **BLOCKER** — `wfuschForLevel` returned 0x00 above wave 99 | Folded, the way the ROM folds |
| 2 | No `assertNever` on the TWFUSC union | Added — `TA`/`TZ`/`TB` now fail at compile time |
| 3 | `FUSE_CHASE_AT_TOP` unlogged | Logged as **D3** + a warning comment at the export |
| 4 | `jfuseup` docblock said "toward the player" | Rewritten — it was false in *both* regimes |

**On the fix itself.** The ROM cannot fall off its own table, and that is the whole insight. CONTOUR
rewrites the wave *before* the walk (415-423): for `CURWAV >= 98` it plays a **random** wave in
**65..96**. That band lies wholly inside the `T1 49-99` record, so the draw is **unobservable in
WFUSCH** — every substituted wave yields the same `0xC0`. We therefore fold to 99 and land on the
identical byte **without touching the RNG**, which keeps `wfuschForLevel` a pure function of `level`.
A fold is needed at all only because the **port reaches a state the ROM cannot**: `s.level` increments
with no cap.

**Mutation-proven, and reported honestly:**
- Remove the fold → **4 tests fail.** The guard bites.
- Fold at `>= 100` instead of `>= 99` → **still green.** That is *not* a gap in the tests: wave 99 sits
  inside the `T1` record either way, so both spellings return `0xC0`. The two are genuinely equivalent.
  I would rather say so than claim coverage I do not have.

**One RED bug fixed in passing (flagged, not smuggled):** TEA's `CONTOUR folds…` test sliced a 10-line
window from `CONTOUR:` (line 398) — but CONTOUR's first *instruction* is at 415, so the window held
nothing but the `;PARAMETER TABLES DATA STRUCTURE` comment block and the type equates, and matched
nothing. Widened to 26 lines. **Every assertion is unchanged**; this was a slicing error, not a
weakened test. It is the kind of thing a Dev could quietly "fix" by deleting the assertion, so it is
recorded here instead.

**Handoff:** Back to Immortan Joe (Reviewer).

## TEA Assessment — REWORK (round 1)

**Status:** RED — 4 failing, 997 passing (1001 total). Failures confined to the story's two suites;
no pre-existing test disturbed.

The Reviewer is right, and the finding is the one I should have caught: **I tested the table and
forgot it has an END.** My deep-wave case stopped at 99 — the last row of the last record — which is
exactly the boundary the bug lives on. Every value I asserted was inside the table, so the walk-off
was invisible to me.

**What I added (RED):**

| Test | Pins |
|---|---|
| `stays $C0 above wave 99` | `wfuschForLevel(100/101/150/999)` — must not fall off the end |
| `from wave 33 the on-tube bit NEVER drops out again` | sweeps 33→200; a single 0 up there means the coin is back |
| `wave 100 — past the end of TWFUSC, and it had better still be hunting` | the BEHAVIOUR, not just the byte |
| `CONTOUR folds every wave >= 99 back INSIDE the table` | the ROM truth that licenses the fix — derived from source, not asserted from prose |

**The ROM's answer, and why it needs no RNG.** CONTOUR intercepts the wave *before* the table walk
(415-423): `CMP I,98. / IFCS / LDA RANDO2 / AND I,1F / ORA I,40 / … / INC TEMP2` → a **random** wave
in **65..96**. That band lies wholly inside record 3 (`T1, 49-99`), so the draw is **unobservable in
WFUSCH** — every substituted wave yields the same byte. `$C0` is therefore the correct, deterministic
answer for every wave >= 99. The source-rules test derives the band from the source rather than
trusting my arithmetic.

**Note the floor is 33, not 18.** I first wrote the sweep as "never 0 above wave 17" and it was a
FALSE test — waves 17-32 alternate, so wave 19 legitimately returns 0. Caught it before it ran. The
on-tube bit is only guaranteed from 33 up.

**On my fake guard — the Reviewer was right and I am not going to defend it.** The `||`/`??` regex
was scenery. Hoisting the fallback onto its own line reintroduces the always-chase bug and the grep
sails through, 14/14. I wrote it as a "rule-enforcement test" and it enforced nothing. Replaced with
a direct assertion on the exported function's contract (waves 1-17 are exactly `0`, and it is a
`number`). The *call site* is guarded where it was always really guarded — the behavioural waves-1/
16/17 tests, which I re-mutated and confirmed **do** go red on it. Two honest guards instead of one
honest and one painted on.

`import type` on `Input`/`GameState`: fixed.

**Still open, and they are Dev's (green):**
- **AC-1 fix:** make the lookup return `$C0` above 99 (clamp the wave, or extend the record — the
  ROM's justification is the CONTOUR band above; a comment should carry it).
- **`assertNever` on the TWFUSC union** — convention in these files, and a `TA` record type already
  exists at `rules.ts:399`.
- **`FUSE_CHASE_AT_TOP`** — wire it or log it as a deviation. The Reviewer will not accept silence.
- **`jfuseup`'s docblock (interpreter.ts:417)** still says the fuseball rolls "toward the player".
  False in both regimes now.

**Handoff:** To The Word Burgers (Dev) for GREEN.

## Subagent Results

| Subagent | Status | Findings |
|---|---|---|
| reviewer-preflight | clean | 997/997, build clean, reanchor 0 lost; flagged AT_TOP unused + W-023 claim text |
| reviewer-edge-hunter | findings | level > 99 falls off the table (HIGH); NaN/fractional (dismissed) |
| reviewer-silent-failure-hunter | findings | level > 99 silent-default (HIGH); open-tube clamp (pre-existing, low) |
| reviewer-test-analyzer | findings | level > 99 untested (HIGH); `\|\|` regex guard bypassable (MED); AT_TOP untested (HIGH) |
| reviewer-comment-analyzer | findings | ALL 11 ROM citations verified exact; AT_TOP comment overclaims (MED) |
| reviewer-type-design | findings | missing assertNever on TWFUSC union (HIGH); raw-byte return (MED, dismissed) |
| reviewer-security | clean | no purity breach; RNG asymmetry is FAITHFUL (FUCHPL never reads RANDOM in the ROM either) |
| reviewer-simplifier | findings | FUSE_CHASE_AT_TOP dead export (MED); TWFUSC table justified (no change) |
| reviewer-rule-checker | findings | `import type` on Input/GameState (LOW); citation gate + purity verified clean |

**All received:** Yes

### Round 2 (re-review of the rework)

| Subagent | Status | Findings |
|---|---|---|
| reviewer-edge-hunter | findings | fold correct at every boundary; band 65..96 provably inside T1; NaN nit (dismissed) |
| reviewer-test-analyzer | findings | **the replacement guard's COMMENT overclaims** (mutation-proven) — the blocker fix's own tests all bite |
| reviewer-rule-checker | clean | assertNever proven to bite (added TA → tsc fails); `import type` fixed; citation gate + purity clean |
| reviewer-comment-analyzer | findings | every new citation re-opened and verified exact; jfuseup docblock range undershoots (2135 → 2145) |
| reviewer-preflight | carried forward | re-verified serially by me: 1001/1001, build clean, reanchor 0 lost |
| reviewer-security | carried forward | no new code paths; purity re-checked clean by rule-checker |
| reviewer-silent-failure-hunter | carried forward | its round-1 blocker is the one that was fixed; re-verified by me at every boundary |
| reviewer-simplifier | carried forward | its AT_TOP finding is now logged as deviation D3 (accepted) |
| reviewer-type-design | carried forward | its assertNever finding is fixed and proven by rule-checker |

**All received:** Yes

## Reviewer Assessment — ROUND 1

**Verdict: REJECTED**

The implementation is, in the main, unusually good work: the transcription is right, the citations
are right, and Dev mutation-tested his own claims instead of trusting a green suite. I re-opened
ALWELG.MAC myself and every one of the eleven cited lines resolves exactly. The deviation reasoning
on AC-3 is genuinely sound. None of that saves it, because the new function is **wrong outside the
range the story tested**, and the tests cannot see it.

### The blocker

**[EDGE] [SILENT] [TEST] `wfuschForLevel(level)` returns 0x00 for every level above 99. The ROM
returns 0xC0.**

Past wave 99 the loop matches no record and falls through to the TE `return 0` — the same value
that means "no chase" below wave 17. So at wave 100 the fuseball drops back to the LEFRIT coin and
**stops chasing altogether**: precisely the behaviour this story exists to remove, reinstated at the
other end of the table.

It is reachable. `advanceLevel` runs `s.level += 1` on every clear with no cap (`sim.ts:627`);
`MAX_SELECT_LEVEL` bounds only the level-SELECT screen (`sim.ts:822`). tp1-26 already states this in
writing — *"nothing caps the level… AND IT IS REACHABLE."*

It is untested. I mutated the last record's `end` from 99 to 999 — a change that flips the
behaviour at every level above 99 — and the full suite stayed at **997/997 green**. The boundary is
unconstrained in either direction.

And the ROM's answer is not ambiguous, nor does it need an RNG. CONTOUR (415-423) intercepts
`CURWAV >= 98` and substitutes a random wave: `LDA RANDO2 / AND I,1F / ORA I,40` → 0x40..0x5F =
64..95, then `INC` → TEMP2 = **65..96**. Every value in that band lies inside TWFUSC's third record
(`T1, 49-99`), so the lookup yields **0xC0 for every wave >= 99, deterministically**. The whole
random band collapses to one answer. The fix is a table/clamp change plus a test at 100 and 150.

This is an AC-1 miss, not a nicety: "WFUSCH's two chase bits are read from TWFUSC **per wave**."
Above 99 they are not.

Four of us reached this independently (edge-hunter, silent-failure-hunter, test-analyzer, and my own
trace), all at high confidence.

### The rest

**[TEST] The `||`/`??` guard is SCENERY.** `tp1-25.source-rules.test.ts:202` greps for a fallback
*textually adjacent* to the call. I reintroduced the exact bug it exists to prevent, hoisted onto
its own line:

    const wfusch = wfuschForLevel(ctx.level)
    const gated = wfusch || FUSE_CHASE_ON_TUBE      // always-chase on waves 1-17, restored

The guard passed **14/14**. The behavioural waves-1/16/17 tests DID catch it (3 red), so the suite
is not holed — but the guard itself is decoration, and this repo has a sidecar entry and a whole
rejected story (rb4-2) about exactly this. A guard that cannot fail is not a guard. Delete it and
lean on the behavioural net, or assert `wfuschForLevel(1..16) === 0` through the exported function.

**[SIMPLE] [TYPE] [DOC] `FUSE_CHASE_AT_TOP` is an unlogged deviation.** It is exported, commented as
one of "the two different questions JFUSEUP asks", value-tested — and read by **nothing** in `src/`.
The ROM branch it gates (bit 7, the "TOO HIGH?" arm at 2121-2130) is not modelled in the port at
all. That may well be the right call, but MAYBLR's omission got D1, D2 *and* a follow-up story while
this one got silence. Either wire it or log it. Do not leave a dead flag that reads as live.

**[RULE] TWFUSC's union has no `assertNever`.** `wfuschForLevel` narrows with
`if (r.type === 'T1') … ; return <TR branch>` — i.e. "anything that isn't T1 is TR". `assertNever` is
the settled convention in these very files (`rules.ts:178`, `rules.ts:442`, `interpreter.ts:178`),
and a third record type is not hypothetical: **TA** already appears in the ROM's sibling tables and
is cited nine lines below, at `rules.ts:399`. Add a `TA` variant one day and it will be silently
read as TR, returning the wrong byte with no compiler error. This matches a stated project rule, so
I may downgrade it but I may not dismiss it.

**[DOC] `jfuseup`'s docblock now lies.** `interpreter.ts:417-418`: *"It rides its lane and rolls
between lanes **toward the player** on a fuzz_move roll."* That is false in **both** regimes — below
18 it rolls at random, and from 18 it rolls deliberately **away**. It is pre-existing text sitting at
the top of the function this story rewrote, and F2 in this very session exists because somebody
believed a stale comment. Fix it while you are in there.

**[RULE] `import type`.** `tp1-25.fuseball-chase.test.ts:48-49` imports the pure interfaces `Input`
and `GameState` as value imports; sibling suites use `import type`. Low, mechanical.

**[SEC] Clean.** No purity breach; no `Math.random`/`Date.now`/DOM in `src/core`. The RNG asymmetry
(FUCHPL consumes one fewer draw than LEFRIT) is *faithful* — the ROM's FUCHPL never reads RANDOM
either — and the branch is selected by deterministic state, so replays cannot desync.

### Dismissed, with reasons

- **NaN / fractional level** (edge-hunter): verified by execution — both return `0`, identical to the
  TE default, and neither is reachable from the sim. No behavioural difference. Not a finding.
- **TWFUSC "over-engineering"** (simplifier): dismissed, and the simplifier agreed. One object per
  `.BYTE` row is this repo's transcription convention and keeps each row diffable against the ROM.
- **`describe.skipIf` on the gitignored quarry** (test-analyzer): established project pattern, same as
  red-baron. Noted, not blocking.
- **"never becomes a chaser"** (comment-analyzer): I checked — genuinely still true; it refers to the
  CHASER rim state, not the lane chase. Wording nit at most.

*Housekeeping:* the comment-analyzer reported a transient uncommitted `|| FUSE_CHASE_ON_TUBE` in the
working tree. That was my own mutation test running concurrently. Not a rogue session; the tree is
clean at `7dc1f99`.

### Deviations audit

| Deviation | Verdict |
|---|---|
| **D1** (TEA — port collapses the ROM's two decision points; tests pin the DIRECT branch) | **ACCEPTED**, but incomplete — it never says that bit 7 / AT_TOP is thereby left dead. Extend it. |
| **D2** (Dev — MAYBLR's parity gate not implemented; no stable invader slot) | **ACCEPTED.** I verified the reasoning: `s.enemies` is filtered on death (`sim.ts:372`), so array indices shift and a parity gate keyed on position would make the chase flicker as *unrelated* enemies die — a behaviour the ROM does not have. Declining to invent it is correct. |

**Routing:** the blocker is a testable logic bug with a missing edge case → back to TEA for RED at
level > 99, then Dev. Everything else is a small, mechanical fix in the same pass.

## Dev Assessment

**Status:** GREEN — 997/997 tests, `npm run build` clean (tsc + vite), citation gate green,
`reanchor-citations.mjs` reports 0 lost.

**Files changed:**
- `src/core/rules.ts` — `FUSE_CHASE_AT_TOP` (0x80), `FUSE_CHASE_ON_TUBE` (0x40), the `TWFUSC`
  record table, and `wfuschForLevel()` — CONTOUR's walk over it.
- `src/core/enemies/interpreter.ts` — `jfuseup` routes on bit 6: set → `FUCHPL` (`jchpla` then
  `jchrot`); clear → the `LEFRIT` coin, untouched.
- `docs/audit/findings/*.json` (3 files) — 10 citations re-anchored, 0 lost.

**Implementation notes:**
- `TWFUSC` is transcribed as **records with a real TR/T1 walker**, not collapsed into an
  if-chain. The table is the citation; a hand-collapsed `level >= 18` reproduces wave 18 and gets
  every other wave wrong (it never alternates, and never lights the AT_TOP bit).
- `jchpla`/`jchrot` already existed — the CHASER uses them. This story is **routing**, not new
  math, which is why it is 2 points.
- `wfuschForLevel` returning `0` is a REAL answer (CONTOUR's TE path, 442), not a missing one. It
  is what makes the coin fire. The `||`-fallback trap is called out in the code comment.

**Mutation-proven, not merely green.** Green is not evidence; I tampered with each claim and
required red:

| Mutation | Result |
|---|---|
| Drop `jchrot` — chase the SHORT way (the "helpful fix" AC-2 forbids) | **1 failed** — the mirror test |
| Read `TR` as a ramp — let wave 17 chase | **3 failed** |
| `\|\| FUSE_CHASE_ON_TUBE` fallback on the 0 that means NO CHASE | **4 failed** — incl. the wave-1/16/17 net |

Restored: 26/26. The guards bite.

**Second, independent confirmation of the bit assignments** (TEA derived them from JFUSEUP's
`IFMI`/`IFVS` reads): W-023's own audit record cites `ALCOMN.MAC:786` — *"FUSE CHASE PLAYER FLAG
(D7 FOR TOP;D6 FOR TUBE)"*. Two sources, same answer.

**Handoff:** To Immortan Joe (Reviewer).

## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a

**Test Files:**
- `tests/core/tp1-25.fuseball-chase.test.ts` — the contour table (`wfuschForLevel`) and the
  behaviour, driven through real waves.
- `tests/core/tp1-25.source-rules.test.ts` — the quarry fingerprint, the ROM truths that must
  never be "corrected" back, and the lang-review guards.

**Tests Written:** 26 tests (11 RED, 15 green guards) covering 5 ACs
**Status:** RED — 11 failing, 986 passing across the full suite. The failures are confined to the
two new files; no pre-existing test was disturbed. `npm test -- citations` green;
`reanchor-citations.mjs` reports **173 already correct, 0 lost**. `tsc` errors are exactly the
three exports Dev is about to create (`wfuschForLevel`, `FUSE_CHASE_AT_TOP`, `FUSE_CHASE_ON_TUBE`).

**The contract Dev implements:**
- `wfuschForLevel(level): number` in `src/core/rules.ts` — reads `TWFUSC` (686-690): `0` below 17;
  alternating `0`/`$40` across 17-32; `$40`/`$C0` across 33-48; constant `$C0` from 49.
- `FUSE_CHASE_AT_TOP = 0x80` (bit 7, `IFMI`, "chase at top") and `FUSE_CHASE_ON_TUBE = 0x40`
  (bit 6, `IFVS`, "chase on tube") — the two bits `JFUSEUP` actually tests.
- `jfuseup` routes on bit 6: set → `FUCHPL` (the existing `jchpla` **then** `jchrot` — aim, then
  reverse); clear → the `LEFRIT` coin exactly as tp1-5 shipped it.

**Do not "fix" the reversal.** `JCHROT` is the ROM (`EOR I,INVROT`, 1722-1726). A fuseball that
takes the SHORT way to the player is the very thing tp1-5 tore out.

### Rule Coverage

| Rule (lang-review/typescript.md) | Test | Status |
|---|---|---|
| #4 `\|\|` where 0 is falsy but valid | `never falls back on the lookup with \`\|\|\` or \`??\`` | green (arms once wired) |
| #4 0 is a real value, not "missing" | `is 0 below wave 17` + the three no-regression waves | failing / green |
| #1 type-safety escapes (`as any`) | `no \`as any\` … in the fuseball path` | green |
| #8 test quality — no vacuous assertions | see below — two of my own were caught and rewritten | fixed |

**Rules checked:** 3 of 12 lang-review rules are applicable to a pure-core, no-async, no-JSX,
no-IO change; all 3 have coverage. The live one is **#4**: `wfuschForLevel` returns `0` for waves
1-17 and `0` is a REAL answer — a `|| FALLBACK` on that lookup would light the chase on every
early wave and silently restore the exact always-chase bug tp1-5 removed. The three
"ignores the player" waves (1, 16, 17) are the behavioural net under it.

**Self-check: 2 vacuous tests found in MY OWN suite and rewritten.** Both PASSED against the
unfixed code, which is the only reason I know they were worthless:
1. *"the same board gives the same answer every time"* — meant to prove the decision isn't a coin.
   Proves nothing: the coin is **seeded**, so it is deterministic too. Deleted.
2. *"player 2 lanes clockwise → fuseball steps counter-clockwise"* — a single direction. The
   seeded coin happened to roll that exact lane, so it passed on the broken code **by luck**. Its
   mirror image failed, which is the only thing that exposed it.

Both are replaced by one test that asserts the direction **MIRRORS** the player — hold the seed,
move the player to the other side, and a chaser must flip while a coin cannot. It now fails with
`expected 7 not to be 7`: the coin returns lane 7 wherever the player stands. That is the finding
itself, failing for exactly the right reason. Logged to the TEA sidecar.

**Handoff:** To The Word Burgers (Dev) for GREEN.

## Sm Assessment

Triage: this one is alive, and it is small. 2 points, no dependency on anything unmerged, and the
quarry is already open — tp1-5 just finished excavating this exact seam, so the source is warm.

**The diagnosis.** This is not a new bug; it is the *other half* of a bug we half-fixed. tp1-5 found
a fuseball that always chased the player, proved that for waves 1-16 the ROM's `TWFUSC` table has no
record at all (`CONTOUR` falls off the end, yields 0, both `WFUSCH` chase bits clear, every decision
drops to the `LEFRIT` coin), and shipped that coin. That fix is RIGHT and must not regress. But the
table *starts at wave 17* — and from there the chase bits ramp on and the ROM routes through `FUCHPL`,
which is `JSR JCHPLA` then `JSR JCHROT`: aim at the player, then reverse. The source says it out loud
— "FUSE IS BACKWARDS". We traded a fuseball that always chased for one that never does. Neither is
the arcade.

**What will kill this story if TEA is careless:**
- The wave-1 test can pass *vacuously*. A fuseball that never moves also "ignores the player." AC-4
  demands a liveness guard for exactly this reason — if the thing is frozen, the test is scenery.
  A guard nobody has tampered with is decoration; mutate it and require red.
- Do not "fix" the reversal. `JCHROT` is not a bug in the ROM, it is the ROM. AC-2 is explicit.
- The wave-17 test must drive a REAL wave, not a hand-seated fixture. tp1-5's own dead-branch
  (W-032) survived a full review cycle precisely because a fixture staged a board the sim cannot
  produce.
- The citations are load-bearing and must survive: `ALWELG.MAC:686-690` (TWFUSC), `2168-2170`
  (FUCHPL/JCHPLA/JCHROT), `2171-2178` (LEFRIT). `npm test -- citations` and
  `node tools/audit/reanchor-citations.mjs` (0 lost) are ACs, not formalities.

`MAYBLR`'s even-invader-index gate (AC-3) is the one genuine design call in here — implement it or
log it as a deviation *with reasoning*. That is TEA's and Dev's call, not mine. I don't fix. I
diagnose. Someone else fixes.

Setup is sound: branch `fix/tp1-25-fuseball-backwards-chase` cut from tempest's `develop` (its
default; PRs target develop), story moved to in_progress, context written with the primary-source
citations intact. Handing the body to Furiosa for RED.