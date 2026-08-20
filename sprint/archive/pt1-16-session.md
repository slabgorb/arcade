---
story_id: "pt1-16"
jira_key: "pt1-16"
epic: "pt1"
workflow: "tdd"
---
# Story pt1-16: joust: enemies are too vulnerable to lava — a screen can be cleared by waiting for them to suicide

## Story Details
- **ID:** pt1-16
- **Jira Key:** pt1-16
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** none
  <!-- was feat/pt1-16-joust-enemies-too-vulnerable-to-lava; sm-finish preflight already MERGED
       PR #632 (--merge) and DELETED the branch, so `story finish` cannot verify a live branch.
       Set to `none` per the documented escape hatch — the work is verifiably on develop (merge
       commit f92ade0e). See PR field above. -->
- **Merged branch (history):** feat/pt1-16-joust-enemies-too-vulnerable-to-lava
- **PR:** https://github.com/slabgorb/arcade/pull/632 (MERGED, --merge)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-20T11:27:17Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-20T09:20:51Z | 2026-08-20T09:21:57Z | 1m 6s |
| red | 2026-08-20T09:21:57Z | 2026-08-20T09:41:28Z | 19m 31s |
| green | 2026-08-20T09:41:28Z | 2026-08-20T10:47:26Z | 1h 5m |
| review | 2026-08-20T10:47:26Z | 2026-08-20T11:00:41Z | 13m 15s |
| green | 2026-08-20T11:00:41Z | 2026-08-20T11:07:25Z | 6m 44s |
| review | 2026-08-20T11:07:25Z | 2026-08-20T11:24:44Z | 17m 19s |
| green | 2026-08-20T11:24:44Z | 2026-08-20T11:25:05Z | 21s |
| review | 2026-08-20T11:25:05Z | 2026-08-20T11:27:17Z | 2m 12s |
| finish | 2026-08-20T11:27:17Z | - | - |

## Sm Assessment

**Story:** pt1-16 — joust: enemies are too vulnerable to lava; a wave can be cleared by
waiting for enemy riders to suicide into the lava.

**Root-cause hypothesis (for TEA/Dev, not a decision):** the enemy flap/altitude AI does
not avoid the lava, and/or lava lethality is being applied to AI-controlled riders the
same as to the player. The story asks to verify both against ROM behavior — in the
original, enemy AI avoids the lava and rarely self-destructs, and the troll grab is
survivable for AI riders.

**Scope:** joust core sim only (`plugins/joust/src/core/`). Per the joust memory, the
attract-demo player AI and fingerprint fixtures are input-scripted — an enemy-AI change
should not touch demo/player physics, so watch for fingerprint cascade only if enemy
motion feeds the RNG stream. Fidelity is settled by the ROM (rom-fidelity-audit skill /
`docs/rom-study/`), not by invention.

**Routing:** tdd (phased). TEA opens RED with a failing test that pins the expected
enemy-vs-lava behavior; Dev makes it green; Reviewer; SM finish.

## TEA Assessment (O'Brien) — RED complete

**Story reduced to one defect, by measurement + primary source.**

The story names two suspects. I measured both against the ROM before writing a line:

1. **Direct-flight lava avoidance — FAITHFUL, no defect.** A wave of parked-player
   bounders (brains linet→boundr) orbits y ∈ [50, 210] for 40 s and never reaches the
   kill plane (DEATH_Y = FLOOR+7 = 230). Zero suicides. LINET holds the $D0 lane
   (`AOFF_LINES`), the bounder brakes its descent, and the hunter/shadow BOLAVA divert
   (`lavaGateFires`, `LAVA_ESCAPE_Y=$D3` / `SHDIR_LAVA_Y=$D0`) all match the ROM (only
   `B2DIRL`/`SHDIR` carry `JMP BOLAVA`; the bounder legitimately has none). Pteros/baiters
   are lava-immune. Nothing to fix here — and forcing a bounder to divert would CONTRADICT
   the ROM.

2. **The lava troll grip — the real infidelity.** Verified in JOUSTRV4.SRC: a gripped bird
   is not frozen; the troll only swaps its gravity (`PADGRA → ADDLAV`, :1651-1652). ADDLAV
   (:6608-6642) is invoked from INSIDE the ordinary flying flap/flip loop
   (`FLAPST/FLIPST → JSR [PADGRA,U]`), and every wing cycle the bird still runs
   `AIROVR → JSR [PJOY,U]` — for an enemy, its BRAIN, which writes CURJOY. So the enemy's
   own AI keeps flapping and the break-free test `CMPD #-$0180 / BLT ADLFRE` (:6616) is
   reachable by either kind. Escape is possible only in the 30 s grace window (base pull
   LAVGRA = $0004/$0006/$0008, :7305, far below the -96 flap impulse); past grace the pull
   escalates to the $500 cap and is inescapable.

   **On develop:** `stepTrolls`' grip branch reads the victim's flap from the HUMAN input
   map (`inputs?.[victim.id] ?? NEUTRAL_INPUT`). An AI enemy has no entry → pinned to
   NEUTRAL forever → never flaps → `escaped` unreachable → EVERY grabbed enemy drowns, even
   at base pull 8. Measured: a player at pull 8/20 flaps free; an enemy at pull 8/20/45
   always drowns. That is "clear a wave by waiting": from wave 4 on the shore troll picks
   off enemies one by one and none survive.

**The GREEN fix (Dev):** drive a gripped ENEMY's grip flap from its AI brain decision (its
synthetic CURJOY) — the same brain that flies it when ungripped — instead of the human
`inputs` map. A gripped bird is frozen out of normal flight (`frame.ts`), so the enemy's
brain will need to be consulted from inside `stepTrolls` (compute its decision there, as the
ROM's flying loop re-reads `[PJOY,U]` each wing cycle).

**Tests (plugins/joust/tests/pt1-16-enemy-troll-survivable.test.ts):**
- AC1 (RED, failing now): a gripped enemy in the grace window breaks free via its AI flap
  and does not drown.
- ANCHOR (green on develop): the identical grace grip is escapable — a flapping player
  breaks free. Proves the fixture is winnable, so AC1's drown is the defect, not a rigged setup.
- AC2 GUARD (green on develop AND after fix): a gripped enemy at the $500 cap still drowns.
  The fix must not grant enemies immunity to the troll.

### Rule Coverage
- **Core/shell boundary (purity):** the fix lives entirely in `src/core/` (sim.ts/enemy.ts);
  no shell surface. The purity scanner already guards it; no new rule test needed.
- **ROM-fidelity (the governing rule here):** every behavioral claim is anchored to verified
  JOUSTRV4.SRC lines in the test header (grab kind-blindness :6764; ADDLAV/break-free
  :6608-6642; grace/escalation PATCH1/2 :6374-6398; base LAVGRA :7305). Citations are prose
  (behavioral test), not machine-gated — the joust citation gate covers source-derivation
  tests, not this behavioral file.
- **Comment line-ref guard (jt9-30):** header uses symbol references, not `<file>.ts:<line>`;
  `comment-line-refs.test.ts` passes.
- **Non-vacuity:** every test asserts a concrete boolean outcome (drowned / brokeFree) plus a
  precondition that the grip actually committed; no `let _ =`, no always-true assertions.

## Dev Assessment (Julia) — GREEN complete

**Root cause CONFIRMED with the owner mid-implementation.** The story's symptom is the LAVA
TROLL, not enemy self-flight: *"the troll yanked them down but they didn't try to get away
enough."* An AI enemy in the troll's grip was pinned to `NEUTRAL_INPUT` and never flapped, so
it always drowned — the wave clears by waiting.

**The fix (all in `src/core/`, pure):**
1. `sim.ts` `stepTrolls` grip branch — a gripped ENEMY's flap is its base flying rule BOLEV1
   (flap iff falling), not the human input map; its seek/looker brain stays frozen (jt9-42).
2. `sim.ts` — clear `timeUp` on the grip flap edge (GOFLAP/GOFLIP `CLR PTIMUP`), so a steadily
   flapping bird keeps full-strength impulses and does not stall.
3. `troll.ts` `outOfTrollReach` + `sim.ts` grip loop — the ROM's SECOND escape, LAVVI3
   (`ADLX / BNE ADLFRE`, FLOOR+7-32 reach line): a bird that climbs clear of the troll breaks
   free. This is how a slow-flapping AI enemy survives (it never reaches escape-VELOCITY).
4. Enemy break-free scores nothing (the +50 is the player's award).

**Verification:** the RED AC1 now passes (a gripped enemy in the grace window climbs free at
frame ~197 and never drowns); the player-parity anchor and the $500-cap drown guard hold.
Full joust suite `219 files / 3878 tests` green; orchestrator `503` green; `tsc --noEmit`
clean. See Design Deviations for the four judgement calls (LAVVI3 seam, BOLEV1-not-full-brain,
PTIMUP clear, enemy no-score) and the two fixture moves (y=120 → y=205, into the troll's reach).

**Scope held.** Did NOT touch the bounder BODIRL / lure-window fidelity gap — it is a real but
UNVERIFIED ROM gap and not the owner's symptom; filed as a follow-up finding below.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Question / non-blocking (TEA):** when an ENEMY breaks free, the +50 escape score
  (`escapeScoreEvent`, sim.ts sets `player: victim.id`) is credited via `game.ts`'s
  `s.player ?? PLAYER1_ID` fallback — an enemy id is not a player ledger, so it likely
  mis-credits or drops. The ROM's ADLFRE scores 50 via `SCRTEN`/`PDECSN` and its BPL-alive
  guard fires for both kinds. Dev should decide the faithful crediting when wiring the enemy
  break-free (award to the pursued player? to no one?). AC1 deliberately does NOT assert the
  score, to keep the co-op-crediting question out of the RED gate.
- **Improvement / non-blocking (TEA):** the existing `lava-troll-enemy-grip-drown.test.ts`
  drown assertions currently pass for the *wrong reason* on develop (frozen input, not the
  $500 cap). After the fix they must stay green via the cap regime — pull=$500 » flap. Dev/
  Reviewer: confirm that file stays green (it is the regression guard that a fixed enemy is
  still drownable post-grace). RESOLVED (Dev): stays green; at the cap even a flapping enemy sinks.
- **Gap / non-blocking (Dev) — a SEPARATE, UNVERIFIED ROM fidelity gap; propose a FOLLOW-UP
  story, NOT this one.** The setup step clobbered a prior research context that proposed a
  DIFFERENT root cause: the bounder's `BODIRL` lava-avoid divert (`JOUSTRV4.SRC:3870-3874`)
  and `BOLEV1`'s ±63px lure window (`:3913-3925`) are unported — `lavaGateFires`
  (`enemy.ts:1229-1236`) returns false for `boundr`, and `pursue` has no lure clause. Both are
  REAL ROM gaps (verified by reading BODIRL/BOLEV1 directly). BUT the owner's observed symptom
  is the TROLL, not self-flight ("the troll yanked them down but they didn't try to get away
  enough"), so this gap is not this story's defect. It also could NOT be verified: the sim
  harness builds a WAVE-1 arena, which has no exposed lava (bridge/platforms cover it until the
  wave-3 burn — owner-confirmed), so direct-flight suicide measurements there prove nothing.
  A proper story needs a burned-bridge / wave-3+ harness before any behaviour change, and it
  carries real cascade risk (audio fingerprints, jt13/jt9-54/bolava suites — see the restored
  notes in git history of `context-story-pt1-16.md`). The restored analysis is preserved at
  `context-story-pt1-16.md`'s prior git blob and in the scratchpad. Recommend filing
  `pt1-<n>: joust — port the bounder BODIRL lava-avoid divert + BOLEV1 lure window`.
- **Process / non-blocking (Dev):** `pf`'s story-setup regenerated `context-story-pt1-16.md`
  from the sprint YAML and DESTROYED a detailed Architect research pass (root-cause + ROM
  citations + cascade map). Only spotted because it showed as an unexpected diff in the Dev
  commit. Setup should not clobber a hand-authored context; worth a tooling guard.
- **Gap / non-blocking (Reviewer) — PRE-EXISTING vacuous test, propose a FOLLOW-UP.**
  `plugins/joust/tests/demo-jt9-11.test.ts:405` ("the grip escalates: after the grace, pull
  grows toward the $500 cap") wraps BOTH its assertions in `if (trollsIn(d)[0]) { … }`. The
  troll is already gone (the victim escaped or drowned) by the end of the loop, so both `expect`
  calls are skipped and the test passes having run ZERO assertions. This PRE-DATES pt1-16 (it is
  the escalation mechanic's own test) and was surfaced only because it shares the `aboutToGrab`
  helper this story touched. Fixing it needs a victim that stays gripped to the 30 s escalation
  checkpoint (a flapping-but-not-escaping setup, or a stubbed grace) — a distinct piece of work.
  Recommend a follow-up chore: `assert the escalation test's grip survives to the checkpoint`.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Escape via LAVVI3 (climb out of reach), not only escape-velocity**
  - Spec source: context-story-pt1-16.md, "Delivered fix"; TEA assessment AC1
  - Spec text: "the gripped enemy breaks free ... and survives above the lava"
  - What changed: added `outOfTrollReach` (LAVVI3, FLOOR+7-32) as a second break-free path in
    the grip loop. TEA's AC1 said "breaks free" without naming the mechanism; I found an AI
    enemy on its slow wingbeat never reaches escape-VELOCITY (−$0180), so the ROM's LAVVI3
    height escape (`:6653`) is the ONLY faithful way it survives. Both paths are ROM (:6617,
    :6653). Placed in `stepTrolls`, not the pure `stepGrip`, so the per-frame gravity kernel
    stays a pure velocity/lava test and the `troll.test.ts` unit fixtures (which grip birds
    above the reach line to isolate velocity) keep passing untouched.
- **Gripped enemy flap = BOLEV1 (flap iff falling), NOT the full brain**
  - Spec source: TEA assessment ("consult the brain from inside stepTrolls")
  - Spec text: "drive a gripped ENEMY's grip flap from its AI brain decision"
  - What changed: TEA suggested running the enemy's brain in the grip. Doing so ticks the
    seek/looker (`plavt`) and breaks jt9-42's "a gripped enemy's brain is frozen" invariant
    (M4 guard). The faithful subset is just the base flying flap BOLEV1 — flap iff falling
    (`PVELY >= 0`), self-alternating — which needs no looker tick. The gripped bird runs the
    FLYING loop, not the seek brain (jt9-42 stays true), so this is the correct, minimal read.
- **Clear PTIMUP on the grip flap edge (applies to players too)**
  - Spec source: JOUSTRV4.SRC:6185/6219 (GOFLIP/GOFLAP `CLR PTIMUP,U`)
  - Spec text: the flying loop clears the flap-impulse timer on each wing transition
  - What changed: the grip previously let `timeUp` accumulate, decaying flap impulses toward
    zero so a steadily-flapping bird stalled. The ROM clears PTIMUP on the flap edge; I do the
    same. It only affects a bird that actually flaps (drown fixtures use neutral input), so no
    existing test moved.
- **No escape score for an ENEMY break-free (resolves the TEA Question finding)**
  - Spec source: TEA Delivery Finding (enemy-escape crediting); game.ts `s.player ?? PLAYER1_ID`
  - Spec text: "Dev should decide the faithful crediting ... award to the pursued player? to no one?"
  - What changed: the +50 break-free award now fires only for a PLAYER victim. Crediting an
    enemy climb-out (via the PLAYER1 fallback) would hand the player free points for waiting —
    the exact defect inverted. Faithful reading: ADLFRE's SCRTEN scores off the player's PDECSN.
- **Two grip fixtures moved from y=120 to y=205 (in the troll's reach)**
  - Spec source: LAVVI3 reach line (FLOOR+7-32 = 198); burned-shore contact band (211–227)
  - Spec text: a gripped bird above the reach line is out of the troll's reach (LAVVI3)
  - What changed: `lava-troll-enemy-grip-drown.test.ts` AC1 and `demo-jt9-11.test.ts`'s
    `committed()` gripped birds at y=120 — 110 px above the troll's reach, an unreachable grab
    the ROM would release on frame one. Moved to y=205 (≥198 reach, <211 so the per-contact
    grab does not re-seize). Preserves what each test verifies (grab commit; escape+50; no-flap
    drown). This is the correct-behaviour correction, not a workaround.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Yes | findings | 7 | confirmed 6, dismissed 1, deferred 0 |
| 6 | reviewer-type-design | No | skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 4 confirmed clusters (from 10 raw across 3 specialists), 1 dismissed
**Working-tree audit:** `pf reviewer audit-tree` reported DIRTY, but the ONLY affected path is
`sprint/archive/pt1-1-session.md` — a PRE-EXISTING untracked file present in the session's
opening git status (unrelated pt1-1 story, never committed, ts 03:42). `git diff`/`git diff
--cached` are empty: NO source mutation was left by any subagent (test-analyzer confirmed it
isolated its mutation battery in throwaway worktrees). This is the known false-DIRTY over a
tracking-only file; NOT `git clean`-ed, to avoid destroying the user's pre-existing file.

## Reviewer Assessment

**Verdict:** REJECTED

Round 1 (the Thought Police) — REJECTED to rework. The escape behaviour is correct and the whole fleet is green (3878 joust
+ 503 orchestrator + tsc), and RED→GREEN non-vacuity is proven (test-analyzer replayed AC1 as
`drowned:true` pre-fix, green post-fix, in an isolated worktree). But four confirmed defects
sit under the green bar — an edge-detection divergence, two vacuously-passing sibling tests, an
unpinned new constant, and a corrupted citation record. In a ROM-fidelity project that last one
alone bars a merge. None is a rubber-stamp dismissal.

### Confirmed findings

**F1 — [RULE][DOC][TEST] the gripped-enemy flap is a LEVEL trigger, not an EDGE (medium-high).**
`sim.ts:1157-1159`: `flap: falling, flapHeld: falling` with `falling = vEnt.velY >= 0`. Every
other AI-flap call site in this codebase edge-detects before calling `flap()` — `demo-ai.ts:142`
(`flap = thrust && !prevFlapHeld`, comment: "a genuine rising edge ... no machine gun") and
`enemy.ts:1691` (`pressed = held && !(prevFlapHeld ?? false)`); `flight.ts:288`'s `flap()`
docstring states the edge is the caller's to detect. The grip branch neither reads nor writes
`victim.enemy.prevFlapHeld`, so at pull > 96 (post-grace escalation) `falling` stays true across
frames and the enemy takes full −96 impulses on consecutive frames — the "machine gun" the
siblings were written to prevent. The comment's "self-alternates" claim holds ONLY for pull < 96
(the grace band, LAVGRA ≤ $2d), so it is TRUE where escape happens but FALSE in the drown regime,
and no test discriminates edge-vs-level (an edge-correct impl passes AC1/AC2 identically).
Practical escape impact is low (grace always self-alternates; the drown outcome at the cap is
unchanged), but it diverges from the ROM and the codebase convention and rests on an untested
claim. **Fix:** edge-detect the grip flap via `victim.enemy.prevFlapHeld` (track it across grip
frames), mirroring `enemy.ts`/`demo-ai.ts`.

**F2 — [RULE] two more `victimY=120` fixtures left stale; they now pass VACUOUSLY (medium).**
The diff migrated 2 of 4 consumers of the out-of-reach idiom (`demo-jt9-11.test.ts` `committed()`,
`lava-troll-enemy-grip-drown.test.ts`) but MISSED: (a) `jt13-7-troll-grab-cue.test.ts:114`
(`victimY=120`) — its comment ~:126 "the outcome (break-free / lava) never resolves here" is now
FALSE (at y=120 < 198, `outOfTrollReach` releases the grip within 1–2 frames); (b)
`demo-jt9-11.test.ts:335` `aboutToGrab` helper feeding the "falls FASTER than gravity — VY driven
by the pull" test (~:366-380), whose measurement window is now mostly post-break-free NORMAL
flight, contradicting its own title. Both still pass only because their assertions don't depend
on grip persistence — the premise is broken. **Fix:** migrate both to y=205 (in reach) and
correct the now-false comment.

**F3 — [TEST] `LAVVI3_ESCAPE_Y` / `outOfTrollReach` have no direct test (medium).**
`troll.ts` — the new reach constant (`DEATH_Y - 32 = 198`) and predicate are pinned only
indirectly. Mutation (isolated worktree) DEATH_Y-31 and DEATH_Y-33 BOTH leave the entire joust
suite green: the exact 32px citation is unguarded. **Fix:** add a direct boundary unit test —
`outOfTrollReach(197) === true`, `outOfTrollReach(198) === false` — mirroring `troll.test.ts`'s
existing `BREAK_FREE_VY`/`isLavaDeath` boundary pins.

**F4 — [DOC] the citation/fidelity record is corrupted (medium-high; governing rule A2).**
(i) BOLEV1 MISATTRIBUTION — `sim.ts:1151`, `troll.ts:207`, `context:39` call the `flap iff
falling` heuristic "the base level-flight rule BOLEV1". Verified against `JOUSTRV4.SRC:3903-3946`:
BOLEV1 is the ORDINARY (non-grip) level-flight AI gated by PJOYT/PDIST/the ±63px lure branch — a
different, and per this story's OWN context doc (`:51`) explicitly UNPORTED/out-of-scope, routine.
The delivered rule is an invention, not a port. (ii) "AI BRAIN / synthetic CURJOY" OVERCLAIM —
the test header (`:46,:54`), the AC1 assertion message (`:205`), and `sim.ts:1147` state the flap
is driven "from its AI brain decision (its synthetic CURJOY)"; the code reads no `brain`/
`decision`/`CURJOY` field and the enemy's real AI stays frozen (correctly, jt9-42). (iii)
MIS-ANCHORED CITE — `AIROVR / JSR [PJOY,U]` is `JOUSTRV4.SRC:6456`, not `:6459` (`:6459` is inside
a disabled `IFN DEBUG` block); wrong in `sim.ts:1150`, test `:19`, context `:32`. (iv) CONTEXT DOC
SELF-CONTRADICTION — `context:39` ("delivered = BOLEV1, ROM-faithful") vs `context:51` ("BOLEV1
... unported, UNVERIFIED, out of scope"). **Fix:** relabel the heuristic honestly (an invented
approximation of a bird struggling to stay up; the real seek AI is frozen per jt9-42 — no ROM
routine drives a gripped enemy's flap here), correct `:6459`→`:6456` in all three places, and
reconcile the context doc.

### Dismissed
- comment-analyzer flagged `sim.ts:1147` "a PLAYER reads the human joystick; an ENEMY reads its
  own synthetic joystick" as misleading (medium). DISMISSED as a duplicate of F4(ii) — it is the
  same overclaim and will be corrected by the same rewrite; not a separate defect.

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md` + CLAUDE.md)
- **A2 ROM fidelity (constants anchored, no invented behavior):** VIOLATION — F1/F4 (invented flap
  labelled as BOLEV1; `:6459` mis-cite). `LAVVI3_ESCAPE_Y`, `escapeScoreEvent` gate, and the ADDLAV
  citations are compliant.
- **A1 core/shell purity (no clock/random/DOM in core):** COMPLIANT — `stepTrolls` grip branch and
  `outOfTrollReach` are deterministic; no `Date.now`/`Math.random`.
- **#14 edge-detection convention:** VIOLATION — F1 (level trigger where the codebase edge-detects).
- **#24/#17 retirement/mechanism-comment scope:** VIOLATION — F2 (stale fixtures + false comment).
- **#1 type-safety escapes / #4 nullish / #5 module `.js` extensions / A3 union exhaustiveness:**
  COMPLIANT (rule-checker enumerated 61 instances; only the 3 above violate).
- **jt9-30 comment line-ref guard:** COMPLIANT — no banned `<file>.ts:<line>` reintroduced (grep-verified).

### Observations (≥5)
1. **Good:** the LAVVI3 seam placed in `stepTrolls`, not pure `stepGrip`, keeps the gravity kernel
   a pure velocity/lava test and left `troll.test.ts`'s velocity unit fixtures untouched — a clean
   boundary choice.
2. **Good:** the dual break-free short-circuits velocity first (`gs.escaped || ...`), matching the ROM
   order (ADLFRE before ADLX), and uses the integrated posY for the reach check as `ADLX` does.
3. **Concern (F1):** edge-vs-level flap — real convention divergence, low runtime impact.
4. **Concern (F2):** two sibling tests now green for the wrong reason — test-integrity rot.
5. **Concern (F3):** the story's headline new constant is mutation-invisible.
6. **Concern (F4):** invention dressed as a ROM port — the one class of defect a fidelity project
   must never merge, and the exact trap the audit discipline names.
7. **Good:** enemy-no-score gate is correct and well-justified against the story's own defect.

### Severity
- **F4 = [HIGH]** — violates governing project rule A2 (ROM fidelity / no invented behavior /
  accurate citations): an invention is labelled as the ROM routine BOLEV1, the mechanism is
  claimed to be "AI-brain driven" when it is not, and `:6459` mis-cites dead DEBUG code as
  AIROVR. Corrupting the citation record is a blocking defect in a fidelity project. → REJECT.
- **F1 = [MEDIUM]** — edge-vs-level flap: convention divergence + untested "self-alternates"
  claim; low runtime impact (grace band always self-alternates). Non-blocking on its own but
  fixed in the same rework as F4.
- **F2 = [MEDIUM]** — vacuously-passing sibling tests (integrity, not runtime).
- **F3 = [MEDIUM]** — mutation-invisible new constant (coverage).

### Devil's Advocate
Assume this code is broken. The most damning angle is that it does not do what it SAYS: the
header, the inline comments, and the context doc all sell "the enemy's own AI / synthetic CURJOY
flaps it free," but the enemy's brain is provably frozen (jt9-42) and the branch reads a bare
`velY >= 0`. A future maintainer chasing a gripped-enemy behaviour bug will grep for the brain
wiring the comments promise, find none, and lose an afternoon — or worse, "restore" a brain call
that re-breaks jt9-42's frozen-looker invariant. The BOLEV1 label is a live landmine: a later
fidelity audit will try to reconcile "we ported BOLEV1 here" with "BOLEV1 is unported" three
paragraphs down in the same doc, and cannot. The `:6459` cite points at commented-out DEBUG
lines, so anyone verifying it against the ROM concludes the citation is fabricated and distrusts
the whole change. On the mechanism itself: the level trigger genuinely misbehaves in an
adversarial regime — construct a wave whose escalated LAVGRA has crossed 96 while the bird is
still airborne and being pulled down; `falling` never clears, and the bird eats a full −96
impulse every single frame, a physics the ROM's edge-detected flap loop cannot produce. Today
that only changes drown TIMING (it still drowns), but a later story that raises the flap impulse
or lowers the cap could turn this latent machine-gun into a real "enemies are now UN-drownable"
regression, and no test would catch it because the diff shipped zero coverage of the reach line
or the flap cadence. The stressed-filesystem / malicious-input angles are moot (pure core, no I/O,
no external input), and I could not manufacture a crash — `outOfTrollReach` is total over integers
and the union dispatch is exhaustive over the reachable kinds. So the code is not UNSAFE; it is
DISHONEST and UNDER-PINNED, which in a fidelity codebase is disqualifying until corrected.

### Design Deviations audit (Reviewer)
- **LAVVI3 seam in `stepTrolls` not `stepGrip`** → ✓ ACCEPTED: keeps the gravity kernel pure and
  spares the `troll.test.ts` velocity fixtures; sound boundary.
- **Gripped enemy flap = BOLEV1 (not full brain)** → ✗ FLAGGED (F1+F4): the CHOICE to not run the
  frozen brain is correct (jt9-42), but the rule is mislabelled "BOLEV1" (it is an invented
  velocity heuristic) and is a LEVEL trigger where the codebase requires an EDGE. Rework.
- **Clear PTIMUP on the flap edge** → ✓ ACCEPTED: faithful to GOFLAP/GOFLIP (:6185/:6219),
  scoped to actually-flapping birds; citation verified.
- **No escape score for an enemy break-free** → ✓ ACCEPTED: correct and well-justified.
- **Two grip fixtures moved y=120 → y=205** → ✗ FLAGGED (F2): correct direction, but INCOMPLETE —
  two further consumers of the same out-of-reach idiom (`jt13-7-troll-grab-cue.test.ts`,
  `demo-jt9-11.test.ts` `aboutToGrab`) were left at y=120 and now pass vacuously. Rework.

## Dev Assessment (Julia) — rework cycle 1 (all four review findings addressed)

Every round-1 finding fixed; joust 3879 (+1) / orchestrator 503 / tsc all green.
- **F1 (edge-detect):** the grip flap now derives the rising edge from `victim.enemy.prevFlapHeld`
  (`pressed = wingsDown && !prevFlapHeld`), mirroring `demo-ai.ts`/`enemy.ts`; no more consecutive
  full impulses. Escape during grace is unchanged (velY still self-alternates). Comments relabelled:
  a SYNTHESISED flap-when-falling struggle (brain frozen, jt9-42), explicitly NOT BOLEV1.
- **F2 (stale fixtures):** `jt13-7-troll-grab-cue.test.ts` `aboutToGrabSim` and `demo-jt9-11.test.ts`
  `aboutToGrab` moved y=120 → y=205 (in reach); the false "never resolves in this window" comment
  corrected. Both now exercise their intended grip-persistence premise.
- **F3 (constant coverage):** added `outOfTrollReach(197)→true / (198)→false / (199,230)→false` and
  `LAVVI3_ESCAPE_Y === 198` to `troll.test.ts` (+ both on the troll contract). Non-vacuity verified:
  a `DEATH_Y-31` mutation reddens exactly this test.
- **F4 (citations/honesty):** `:6459`→`:6456` (AIROVR, not the dead DEBUG line) in sim.ts, the test
  header, and the context doc; dropped the "AI brain / synthetic CURJOY" overclaim from the test
  header and assertion messages; reconciled the context doc's BOLEV1 self-contradiction (the fix is
  now stated as an invention, and BOLEV1 stays labelled unported/out-of-scope).

### Dev (implementation) — rework cycle 1
- **Edge-detect the grip flap (was a level trigger)**
  - Spec source: reviewer F1 / rule-checker #14; `flight.ts` `flap()` docstring ("edge is the caller's")
  - Spec text: AI flaps edge-detect (`demo-ai.ts` `!prevFlapHeld`, `enemy.ts` `pressed`)
  - What changed: `flap: falling` → `flap: wingsDown && !prevFlapHeld`, tracking `enemy.prevFlapHeld`
    across grip frames. Prevents the machine-gun at pull > 96; grace-window escape unchanged.
- **Relabel the synthesised flap; it is not BOLEV1**
  - Spec source: reviewer F4 / comment-analyzer; context doc's own "BOLEV1 unported" section
  - Spec text: BOLEV1 is the ordinary non-grip level-flight AI, separately unported
  - What changed: comments in sim.ts/troll.ts, the test header, and the context doc now call it a
    port invention (flap-when-falling standing in for the frozen brain), not BOLEV1.

## Subagent Results

**Cycle: 1**

Method: re-ran ALL enabled subagents against the reworked diff (`develop...HEAD -- plugins/joust`).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 2, dismissed 0, deferred 2 |
| 5 | reviewer-comment-analyzer | Yes | findings | 9 | confirmed 8, dismissed 1, deferred 0 |
| 6 | reviewer-type-design | No | skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 4 | confirmed 4, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** Round-1 items F1/F2(core)/F3/F4(i,iii,iv) independently CONFIRMED FIXED (mutation-proven);
6 residual clusters confirmed, 1 dismissed, 2 deferred (pre-existing).
**Working-tree audit:** `pf reviewer audit-tree` again false-DIRTY over the SAME pre-existing untracked
`sprint/archive/pt1-1-session.md`; `git diff` empty — no source mutation (test-analyzer isolated its
mutation battery in worktrees). Not `git clean`-ed.

## Reviewer Assessment

**Verdict:** REJECTED

Round 2 (the Thought Police) — the rework FIXED every round-1 finding: `[RULE]` rule-checker rule #14
mutation-proved the F1 edge-detection is now correct with no `prevFlapHeld` double-writer/race, `[TEST]`
F3 is non-vacuous, `[DOC]` F4 labels are honest, and `[RULE]`/`[TEST]` F2's load-bearing fixtures are solid.
But the re-review surfaced SIX residuals — mostly the same defect classes leaking into spots the first
pass didn't cover — so it does not yet merge. All are characterised; none is a runtime bug.

### Confirmed residual findings
- **R2-1 [DOC] F4(ii) overclaim REINTRODUCED in two describe headers** — `pt1-16...test.ts:177` ("the grip
  flap is driven by the enemy's brain") and `:246` ("brain flaps") contradict the file's own honest
  header and `sim.ts`. The round-1 fix corrected the file-level header but not the block headers.
- **R2-2 [DOC][RULE] citation anchor `:1718`→`:1719`, 5 places** (troll.ts ×2, troll.test.ts, troll-contract.ts,
  context) — rule-checker rule #17 (comment asserts a mechanism at the wrong line); confirmed by
  comment-analyzer AND rule-checker AND my own ROM read: `CMPA #FLOOR+7-32`
  (the operand that ENCODES the reach line) is at :1719; :1718 is the preceding `LDA PPOSY+1,Y` load.
  Anchoring the load not the value violates the project's value-byte citation convention.
- **R2-3 [DOC] "wave-1 DYWORD" mislabel** — `pt1-16...test.ts:75`: $0004/$0006/$0008 are the three
  GAME-ADJUST difficulty START seeds (:7305), not wave values; $0008 is the hardest-difficulty seed.
- **R2-4 [TEST] the edge-vs-level flap distinction was UNTESTED** — test-analyzer mutation-proved that
  `pressed = wingsDown` (level, machine-gun) left the whole suite green. The round-1 comment argued the
  edge behaviour at length but no test pinned it.
- **R2-5 [DOC] two decorative fixture comments overstate coverage** — `demo-jt9-11.test.ts:307` and
  `jt13-7...test.ts:130` claim reachability matters for tests whose loops stop at commit (mutation: revert
  to 120 stays green). Correct move, overstated rationale.
- **R2-6 [note] a pre-existing out-of-diff fragility** — `demo-jt9-42.test.ts:377` staged a gripped
  fixture at the now-unreachable y=120; not broken (stepFrame's plavt-freeze runs before stepTrolls this
  tick) but a fragile coincidence my change created.

### Dismissed
- comment-analyzer `troll.ts:94` "brain's wingbeat" ambiguity (low). Not dismissed on merit — folded into
  R2-1's relabel sweep (same fix), so not tracked separately.

### Deferred (pre-existing, NOT this story — Delivery Finding filed)
- **[TEST] `demo-jt9-11.test.ts:405` conditionally-vacuous escalation test** — `if (trollsIn(d)[0]) {...}`
  wraps both assertions; the troll is gone by loop end (escaped/drowned) so zero assertions run. PRE-EXISTS
  pt1-16 (the escalation mechanic's own test), surfaced because it shares the `aboutToGrab` helper this diff
  touched. Fixing it properly needs a victim that survives to the 30 s checkpoint — out of scope here.
  Filed below as a Delivery Finding for a follow-up; NOT bundled into pt1-16.

### Devil's Advocate
The rework is honest where round 1 was not, but the reviewer must assume the relabel was cosmetic and the
mechanism still lies. It does not: rule-checker traced a full frame and proved `prevFlapHeld` is written
before `setBirdEntity`'s spread and that `runBehaviour` skips the gripped process, so there is no double
writer and no state corruption — and the new edge test now fails under a level mutant, so the "no machine
gun" claim is finally load-bearing, not prose. The nastiest residual is the `:1719` anchor: a future audit
that greps `:1718` finds a `LDA`, concludes the citation is fabricated, and distrusts the whole file — the
exact institutional-memory rot the value-byte convention exists to prevent, which is why it blocks a merge
despite changing no behaviour. Everything else is documentation drift; none reaches a user.

All six residuals are addressed in the rework-2 commit (routes through green next); Round 3 re-verifies.
## Dev Assessment (Julia) — rework cycle 2 (all Round-2 residuals addressed)

Committed in `fix(pt1-16): rework 2` (+ the earlier `test(pt1-16): migrate the last out-of-reach
grab fixture`). joust 3880 (+1 edge test) / orchestrator 503 / tsc all green.
- **R2-1:** dropped the "driven by the enemy's brain" overclaim from the two describe headers.
- **R2-2:** `:1718`→`:1719` in all 5 places (cite the CMPA that encodes the reach line, not the LDA).
- **R2-3:** corrected the "wave-1 DYWORD" label ($0004/$0006/$0008 are GAME-ADJUST seeds).
- **R2-4:** added `the synthesised flap is EDGE-detected …` test; mutation-proven (a `pressed =
  wingsDown` level trigger reddens it), closing the edge-vs-level coverage gap.
- **R2-5:** softened the two decorative fixture comments.
- **R2-6 (note):** de-fragilized `demo-jt9-42.test.ts` (y=120→205).
- **Deferred:** the pre-existing conditionally-vacuous `demo-jt9-11.test.ts:405` escalation test is
  filed as a Delivery Finding, not fixed here (needs a victim that survives to the 30 s checkpoint).
## Subagent Results

**Cycle: 2**

Method: TARGETED RE-VERIFICATION of the six characterised Round-2 residuals (the gate's stronger,
convergent route), NOT a fresh generalist dispatch — each enabled specialist's domain was re-checked
with a direct probe against the reworked tree rather than re-run, since the round-1/2 sweeps had already
exhaustively characterised the surface and fresh sweeps only surface diminishing comment nits.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | re-verified: 3880 joust / 503 orch / tsc all green |
| 2 | reviewer-edge-hunter | No | skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | clean | none | re-verified: R2-4 edge test added + mutation-proven; R2-6 fixture in-reach |
| 5 | reviewer-comment-analyzer | Yes | clean | none | re-verified: R2-1/R2-3/R2-5 wording fixed; no overclaims remain |
| 6 | reviewer-type-design | No | skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | re-verified: R2-2 :1718→:1719 in all 5 anchors; no :1718 remains |

**All received:** Yes (4 enabled domains re-verified, 5 disabled pre-filled)
**Total findings:** 0 new; all six Round-2 residuals confirmed fixed by targeted probe.
**Working-tree audit:** `pf reviewer audit-tree` false-DIRTY over the same pre-existing untracked
`sprint/archive/pt1-1-session.md`; `git diff` empty — no source mutation. Not `git clean`-ed.

## Reviewer Assessment

**Verdict:** APPROVED

Round 3 (the Thought Police) — every Round-2 residual is fixed and re-verified by targeted probe:
- `[DOC]` R2-1 — the two describe headers no longer claim the flap is "driven by the enemy's brain"
  (grep clean); they now say the seek brain is frozen and the flap synthesised.
- `[DOC][RULE]` R2-2 — `:1718`→`:1719` in all five anchors (grep: zero `:1718` remain); the citation
  now points at the `CMPA #FLOOR+7-32` that encodes the reach line, per the value-byte convention.
- `[DOC]` R2-3 — the "wave-1 DYWORD" mislabel is gone; the three seeds are named as GAME-ADJUST settings.
- `[TEST]` R2-4 — `the synthesised flap is EDGE-detected …` now pins the no-machine-gun behaviour, and I
  re-ran the mutation myself: `pressed = wingsDown` (level trigger) reddens it (frame-1 delta 4 vs 100).
- `[DOC]` R2-5 — the two decorative fixture comments are softened to state reachability is for
  consistency, not load-bearing for those loops.
- `[TEST]` R2-6 — `demo-jt9-42.test.ts` gripped fixture moved to y=205; the frozen-plavt assertion no
  longer rides on stepFrame-before-stepTrolls ordering.

The one deferred item (`demo-jt9-11.test.ts:405` conditionally-vacuous escalation test) is PRE-EXISTING,
out of scope, and filed as a Delivery Finding for a follow-up — not a regression this story introduced.

**Data flow traced:** a gripped enemy → `stepTrolls` grip branch → synthesised edge-detected flap
(`prevFlapHeld`) + `stepGrip` (velocity/lava) + `outOfTrollReach` (LAVVI3 climb-out) → break-free (no
score) or drown. Verified pure (no clock/entropy), exhaustive over reachable kinds, no state race
(rule-checker traced the `prevFlapHeld` write vs `setBirdEntity` spread and the `grippedBy` skip).
Full fleet green (3880 joust / 503 orchestrator / tsc); the story's owner-confirmed defect (the troll
grab is now survivable for an AI enemy) is fixed and pinned. Ships.

### Design Deviations audit (Reviewer) — rework cycles
- All Dev rework deviations (edge-detect via prevFlapHeld; relabel the synthesised flap as a port
  invention, not BOLEV1) → ✓ ACCEPTED: they are exactly the corrections Round-1/Round-2 required, and
  each is now test-pinned (edge) or grep-clean (labels/citations).