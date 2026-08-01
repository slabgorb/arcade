---
story_id: "jt8-3"
jira_key: "jt8-3"
epic: "jt8"
workflow: "tdd"
---
# Story jt8-3: Cliff look-ahead (B2XLEN/SHXLEN) plus shadow-lord SHLEP player-line tracking

## Story Details
- **ID:** jt8-3
- **Jira Key:** jt8-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** none

## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Phase:** finish
**Phase Started:** 2026-08-01T19:23:33Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-01T18:23:00Z | 2026-08-01T18:26:58Z | 3m 58s |
| red | 2026-08-01T18:26:58Z | 2026-08-01T19:05:39Z | 38m 41s |
| green | 2026-08-01T19:05:39Z | 2026-08-01T19:13:08Z | 7m 29s |
| review | 2026-08-01T19:13:08Z | 2026-08-01T19:23:33Z | 10m 25s |
| finish | 2026-08-01T19:23:33Z | - | - |

## Background

**Epic:** jt8 — Joust playability: enemies hunt (full pursuit AI) and eggs can be caught

**Story Type:** Feature

**Points:** 3

**Description:** The hunter/shadow navigation and the deadliest brain. B2DIR (:4104-4159) projects B2XLEN = 27+4 = 31 px ahead in the travel direction (scaled by PVELY), samples the arena solid-mask (BCKXTB plus/minus B2XLEN AND BCKYTB) — our arena.groundMaskAt is that BCKXTB/BCKYTB analog — and on a cliff ahead flips PFACE and slows (B2AV). The plain bounder lacks this look-ahead (B2XLEN :3969, SHXLEN :4228 = 31). Shadow lord (SHADOW :4230): SHDN free-fall on descent (NO FLAPING WINGS, :4246), SHLEP tracks the PLAYER line directly (:4277), flaps only to escape the lava below dollar-D3. Extend the hunter/shadow brains (enemy.ts b2undr/shadow) with the look-ahead turn and the shadow player-line track (bounder unchanged). BUILDS ON jt8-1/jt8-2. Radix-cited plus claims entries.

### Measured Facts (SM-verified 2026-08-01)
Citation file: `reference/williams-source/joust/JOUSTRV4.SRC`

- `B2DIR` :4104-4159 — hunter cliff look-ahead: samples `BCKXTB-B2XLEN,X` (:4119, moving left) or `BCKXTB+B2XLEN,X` (:4137, moving right), ANDs with `BCKYTB,Y` where Y is offset by (PVELY<<3)'s high byte (three ASLB/ROLA pairs — the "scaled by PVELY" projection); nonzero mask → `CLR PFACE` FACE RIGHT :4122 / `#-1 STA PFACE` FACE LEFT :4140-4141, then `B2DICL` slows with `#B2AV` :4142-4145.
- `B2XLEN EQU 27+4` :3969; `SHXLEN EQU 27+4` :4228 (both = 31).
- `SHDIR` :4330-4377 — the SHADOW'S OWN copy of the direction routine, using SHXLEN at :4350/:4368 and slowing with `#SHAV` :4373. It has an extra pre-check the hunter lacks: :4330-4334 compares `PPOSY+1` to `#$D0` (NOT $D3) and routes to `BOLAVA` when falling — two DIFFERENT lava thresholds exist, do not conflate them.
- `SHADOW` :4230; `SHDN` :4246-4248 no-flap drop (`CLRB` WINGS UP); flap-to-escape :4249-4254 gated on `PPOSY+1 >= $D3`.
- `SHLEP` :4277-4284 — stores the targeted player's line (`LDB PPOSY+1,X / STB PDIST+1,U` :4279-4280) AND the player's velX (`LDA PVELX,X / STA PPVELX,U` :4281-4282), with an 8+1-frame decision timer (`SHUPTM` → `PJOYT` :4283-4284). `SHLEP1` :4286-4298 is the tracking loop.
- **Code scope delta (measured):** `plugins/joust/src/core/enemy.ts:362` states the horizontal cliff look-ahead is "provenance-only" (documented, NOT implemented); `enemy.ts:491-497` explicitly assigns the B2DIR/SHDIR steering to jt8-3. The shadow's VERTICAL flap logic (SHDN / SHUPRG / SHLEP-as-live-line / $D3 lava escape) already exists in `shadow()` (enemy.ts:471-487, from uf1-8). The story's delta is the horizontal steering plus whatever SHLEP line-tracking refinement TEA judges the ROM demands (ROM stores line+velX at decision time on an 8+1-frame timer; current code tracks the LIVE line each wake).

### Inherited Handoff Items (from jt8-2 session)

1. The toward-the-target steering jt8-2 descoped is jt8-3's: `B2DIR`'s PFACE writes :4122/:4141 and `SHDIR`'s pair :4353/:4372.
2. Copy `plugins/joust/tests/homing-wiring.test.ts` AC-4 (the in-play guard) — but READ ITS ROUND-2 COMMENTS FIRST and repair the fixture's overclaim (jt8-2 Reviewer [MEDIUM]: the pass condition is the ~90-frame TARTIM aggro grace expiring, not varied play; use seeds that place the enemy differently and a non-matching starting velXIndex so a match is reached through flap-driven convergence).
3. `loadClaims`/`claimCovers` reaches 3× duplication at this story — extract to `tests/helpers/` NOW, as part of jt8-3.

### Open Questions (hand to TEA labelled as CLAIMS TO VERIFY, not facts)

(a) **Code/comment mismatch at :4252:** Reads `PVELX` while its own comment says "FALLING?" — a comment/code mismatch in the 1982 source. SM did not determine which the port should follow; TEA must decide (does the flap-escape gate test X-velocity as written, or was PVELY intended?) and record the ruling in the claims entries.

(b) **Lava threshold difference:** The $D0 (SHDIR pre-check) vs $D3 (SHDN/SHLEP) threshold difference — verify before reusing LAVA_ESCAPE_Y for both.

## Acceptance Criteria

- The hunter/shadow look-ahead turns the enemy (flip PFACE plus slow) when a cliff is B2XLEN=31 px ahead in its travel direction, and does NOT turn in open air — both cases pinned against arena.groundMaskAt; the plain bounder does NOT look ahead. Claims entry (:4104-4159, B2XLEN :3969 / SHXLEN :4228).
- The shadow lord free-falls on descent (no brake) and tracks the targeted player line via SHLEP; lava-escape below dollar-D3 holds; pinned plus mutation-checked (:4230-4277).
- Radix-cited constants plus claims entries; the citations suite is green.
- Determinism: a seeded hunter navigating a cliff and a shadow hunting a player replay bit-for-bit; purity guard plus npm test green.

## Sm Assessment

**Setup complete; routing to TEA for RED.** The phase pointer read `setup` on arrival
and advances to `red` at handoff.

**Pre-setup measurements (all run before sm-setup was spawned):**
- Sibling probes: no `jt8-3` branch on origin; live sessions elsewhere are a-2 on
  uf1-13 (lobby-only) and a-3 on sw8-16 (star-wars) — no contention with joust's
  `enemy.ts` neighbourhood. Main was pulled current (`d8502a9`) before setup.
- Prerequisites: jt8-1 and jt8-2 are both `done` in the epic YAML — the story's
  "BUILDS ON" premise holds.
- **Description citation sweep: NO corrections needed.** Every ROM citation in the
  epic description was re-opened against `reference/williams-source/joust/JOUSTRV4.SRC`
  and verified (B2DIR :4104-4159; B2XLEN :3969 and SHXLEN :4228 both `EQU 27+4`;
  SHADOW :4230; SHDN :4246-4248; SHLEP :4277-4284; the `NO FLAPING WINGS` comment
  at :4246 is verbatim). Recorded so the next reader does not re-run the sweep.
  Two observations the sweep could NOT settle are handed to TEA as labelled open
  questions (see Background), not asserted as facts: the `:4252` PVELX/"FALLING?"
  comment/code mismatch, and the `$D0` (SHDIR :4330-4334) vs `$D3` (SHDN/SHLEP)
  lava-threshold split.
- Scope delta measured in code: the horizontal look-ahead is "provenance-only"
  (`enemy.ts:362`) and the steering is explicitly assigned to this story
  (`enemy.ts:491-497`); the shadow's vertical flap logic already exists from uf1-8.

**sm-setup verification (per sidecar rules):** all four ACs byte-exact in both the
session and the context (python `in`-parse, not grep); story genuinely stamped
`in_progress` this time; exactly one phase-pointer token in the file. Two repairs
were needed: the session header omitted `**Repos:**` (cp5-1 recurrence — added), and
the context's Technical Approach/Scope were generation filler (cp5-2 pattern —
replaced by SM with measured pointers only; the Problem paragraph is the verified
description, left verbatim, fronted by a ✅ note in Technical Approach).

**Claim visibility:** stamp + context pushed to `main` (`b84b5d4`); empty claim
branch `feat/jt8-3-cliff-lookahead-shlep` pushed (tip == main) so the sibling
branch probe lights.

**For TEA, in priority order:** the Background's Measured Facts, then the three
Inherited Handoff Items (steering scope; copy `homing-wiring.test.ts` AC-4 only
after repairing its overclaiming fixture per the jt8-2 Reviewer [MEDIUM]; extract
the now-3× `loadClaims`/`claimCovers` to `tests/helpers/`), then the two Open
Questions. jt8-2's archive (`sprint/archive/jt8-2-session.md`) is the richer spec
if anything here reads ambiguous.

## TEA Assessment

**Tests Required:** Yes

**Test Files:**
- `plugins/joust/tests/helpers/steering-contract.ts` — the jt8-3 contract: demands `B2XLEN`,
  `SHXLEN`, `SHDIR_LAVA_Y` and `steerWake()` from `enemy.js` via the loadHoming-pattern runtime
  shape check; carries the full ROM routing map (which wakes steer, per brain) in its header.
- `plugins/joust/tests/steering.test.ts` — behaviour: turn/no-turn/mirror/idempotency at
  BCK-table-derived fixtures, the `(velY×8)>>8` projection, the `$D3` (hunter) vs `$D0` (shadow)
  lava gates, the per-route steering map (shadow steers ONLY with no target; SHLEP/SHDN/SHUP never;
  bounder/linet never), the SHDN velX-gated escape, the SHLEP falling-gated `$D3` term, and the
  turn-wake flip+slow through `stepEnemy` (facing −1 AND FLYX 8→6 on one wake, staged rising so the
  brain's own law contributes no flap).
- `plugins/joust/tests/steering-source.test.ts` — provenance: 55 vendored-line law pins (skip on
  CI), the PFACE/PPVELX write-set enumerations, the four-revision `:4252` consistency proof, the
  SHLEPB-consults-no-mask proof, and the JT83-* claims-coverage gates (15 ranges + 4 content gates).
- `plugins/joust/tests/steering-wiring.test.ts` — the jt8-2 AC-4 pattern copied WITH its round-2
  repairs: staged-hunter seeded demos under idle input, steering-ATTRIBUTED turn counting (facing
  changed + `homing` structurally unchanged + same physical bird), per-turn mask justification, the
  bounders-only zero control, and the replay-determinism hashes.
- `plugins/joust/tests/helpers/claims.ts` — the jt8-2 handoff item: the HARDENED claims loader
  extracted; `homing-source.test.ts` refactored onto it (78/78 green).

**Tests Written:** 135 across the three suites, covering all 4 ACs.
**Status:** RED (verified by testing-runner, run id `jt8-3-tea-red`): joust **19 failed |
2186 passed | 41 skipped**, the only failing files the three new ones; shared **528/528 green**.

### The ORACLE / RED split (jt5-10 discipline)

75 tests pass on arrival and that is BY DESIGN, stated in each file's header: the vendored-line
law pins are the EVIDENCE BASE (the ROM already says what it says), and the labelled controls
(SHDN rightward escape, SHLEP below-line flap, SHLEV protective flap, bounders-only attribution
zero) pin current behaviour the re-seat must not regress. The 19 reds split three ways: feature
absent (`loadSteering()` throws → 41 gated tests + 6 file-level errors), three assertion reds
against `shadow()`'s blanket pre-branch lava flap, and the JT83-* claims gates.

### Satisfiability + mutation table (the jt8-2 discipline; throwaway in the scratchpad, src restored byte-identical, md5-verified, control run red)

A throwaway implementation turned **119/135 green** — the 16 remaining are the claims registry,
which is Dev's deliverable, so the RED is satisfiable and pins ONE coherent machine. Eleven
mutants against the throwaway, each anchored (`count==1`) before applying, source restored from
the `cp` backup after each:

| mutant | extra red | what it establishes |
|---|---|---|
| M1 sample the LANDING pair instead of BCK | 12 | the fixtures sit where the two maps disagree — the sampler choice is pinned |
| M2 drop the velY projection | 6 | the `(velY×8)>>8` offset is load-bearing, not decoration |
| M3 face TOWARD the cliff | 13 | away-ness is pinned on both branches |
| M4 toggle facing instead of absolute set | 1 | the idempotency test alone catches a COM-style flip — precise |
| M5 every brain steers | 8 | the bounder/linet negatives bite |
| M6 a hunting shadow steers | 2 | the SHLEP no-look-ahead negative + its positive control |
| M7 shadow gate $D3 not $D0 | 2 | the two lava thresholds are discriminated, not asserted |
| M8 turn wake does not flap | 2 | the "slow" half is observable independently of the flip |
| M9 SHDN escape loses its velX gate | 1 | the :4252 law has exactly one guard — precise |
| M10 SHLEP lava term unconditional | 1 | the falling gate has exactly one guard — precise |
| M11 steering never reaches stepEnemyDetailed | 7 | the wiring/in-play guards see the pipeline, not the unit |

### Open questions from SM — both resolved early (the jt5-10 rule)

- **(a) `:4252` reads `PVELX` under a "FALLING?" comment.** Measured across ALL FOUR vendored
  revisions (RV1:4178 / RV2:4213 / RV3:4230 / RV4:4252) — identical instruction in both shipped
  label families. Ruling: the port follows the CODE (the jt8-6 precedent — pin the machine, not
  the prose, even the ROM's own). Pinned by a four-revision consistency test and a claims content
  gate that demands the mismatch be stated in the JT83-* entry.
- **(b) `$D0` vs `$D3`.** Both real, different owners: `$D3` is the hunter's B2DIRL gate
  (:4097-4102) AND the SHDN/SHLEP escape line; `$D0` is the shadow's OWN SHDIR pre-check
  (:4330-4334). Discriminated behaviourally (same fixture, two brains, opposite outcomes) and by a
  claims gate demanding both be stated together.

### Rule Coverage (lang-review/typescript.md)

| Rule | Enforcement in this RED | Status |
|------|------------------------|--------|
| #15 token-vs-claim anchors | every law pin anchors line+instruction tokens, write sets are ENUMERATED (`[4122, 4141, 4150]`), and all guards mutation-tested (11/11 killed) | enforced |
| #14 derived edges | n/a to test code; flagged to Dev — the turn is computed where every route is visible (steerWake before the brain), not inside one branch | handoff note |
| #1 type-safety escapes | no `as any`/double-casts; contract loaders narrow `catch (e)` via `instanceof Error` | enforced |
| #4 null/undefined | `??` throughout; `homing ?? null` JSON-stable | enforced |
| #5 modules | `.js` extensions on every relative import; `export type` re-exports | enforced |
| #8 test quality | fixtures typed against contract interfaces; premises asserted in-test | enforced |
| #10 input validation | claims JSON narrowed by `asClaim` (the extracted hardened loader) | enforced |

**Self-check:** no vacuous assertions found on final review; every absence guard carries a
positive control in the same fixture family; the three measured windows (100 wakes, 600 frames)
carry their measured values in comments.

### Handoff — to Bicycle Repair Man (Dev), for GREEN

1. Implement `B2XLEN`/`SHXLEN`/`SHDIR_LAVA_Y`/`steerWake` in `src/core/enemy.ts` per the
   contract's law list; sample `BCK_X_TABLE` (flight.ts) & `BCK_Y_TABLE` (arena.ts) — NOT
   `groundMaskAt` (see Deviation 1). Wire into `stepEnemyDetailed`: homing → steer → seek →
   brain, turn wake forces the flap. (The throwaway's order worked; its shape is reference, not
   the design — it lives at the scratchpad's `jt8-3-backup/enemy-throwaway.ts`.)
2. Re-seat `shadow()`: SHLEV keeps the protective lava flap; SHDN's escape is
   `pixelY ≥ $D3 && velXIndex ≥ 0`; SHLEP adds the falling-gated `$D3` term. The suite pins each
   law's gate separately — do not share one lava helper across branches (M9/M10 red exactly that).
3. Write `docs/rom-study/claims/steering.json` (JT83-*) satisfying the 15 range gates and 4
   content gates — including stating the `:4252` comment/code mismatch and the `$D0`/`$D3` split.
   The `verbatim` fields must byte-match for `tests/audit/citations.test.ts` (AC-3).
4. Reword `enemy.ts:91-93` — "PPVELX is written in exactly one place" is false as a universal
   (three brain sites: :3908 BOLEV, :4059 B2LEV, :4282 SHLEP — enumerated in steering-source);
   scope it to the BOUNDR brain.
5. Purity: the BCK tables are pure data; keep `steerWake` clock-free and the purity suite green
   (AC-4's second half).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/joust/src/core/enemy.ts` — `B2XLEN`/`SHXLEN`/`SHDIR_LAVA_Y` cited constants;
  `bckMaskAt` (the BCKXTB/BCKYTB point sample, landMaskAtX-indexed); `steerWake` (the B2DIR/SHDIR
  per-wake collapse: FLYX-sign travel direction, `(velY×8)>>8` projection, absolute away-facing
  write, `$D3`/`$D0` gates, per-brain routing); `shadow()` re-seated to per-branch lava laws
  (SHDN velX-gated inclusive-`$D3` escape, SHLEP falling-gated term, SHLEV protective stand-in);
  `stepEnemyDetailed` wired homing → steer → seek → brain with the turn-wake forced flap; three
  stale comments repaired (`PPVELX` one-site claim → the enumerated three sites; "provenance-only"
  → points at `steerWake`; "That steering is jt8-3's" → landed).
- `plugins/joust/docs/rom-study/claims/steering.json` — JT83-001..015, verbatims generated
  byte-exact from the vendored lines (never hand-typed).

**Tests:** joust 2246/2246 · shared 528/528 · orchestrator 359/359 · citations 72/72 · tsc clean
(testing-runner run id `jt8-3-dev-green`). The purity suite is inside the joust total — the BCK
tables are pure data and `steerWake` is clock-free (AC-4).

**Landed on:** trunk-based `main` — GREEN commit `f87a318`, pushed. (Label reworded from
the literal Branch token at finish: the finish parser scrapes `Branch:` fields by pattern
anywhere in the file, and this prose line is not the branch field.)

**Implementation notes for the Reviewer:**
- `steerWake` runs on the ALREADY-homed enemy and its write wins the wake — the ROM's throttle
  blocks fall INTO the direction routines, so B2DIR/SHDIR read (and may overwrite) the
  freshly-COMplemented facing. The order is pinned by the stepEnemy-level tests.
- The turn-wake flap rides `decision.flap || steered.turned` into BOTH `flap` and `flapHeld` —
  a held wing on the turn wake matches `LDB #1` writing the CURJOY low byte as a LEVEL, the same
  convention `stepEnemy` already used for brain flaps.
- TEA's throwaway sampled the same tables with the same laws; this implementation differs from it
  in placement and documentation, not mechanism — the mutation table's kill map applies as-is.

**Handoff:** To the Reviewer (review phase) per the tdd workflow's resolve-gate.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (one stderr anomaly traced to a pre-existing citations-suite fixture) | N/A |

All received: Yes
(The other eight specialists are disabled in `workflow.reviewer_subagents`; their domains were
assessed directly — see Specialist Domain Coverage in the Reviewer Assessment below.)

## Reviewer Assessment

**Verdict: APPROVED** (round 1, with three in-round repairs — 1 Medium, 2 Low — each fixed,
committed (`82d9da4`) and mechanically re-verified; no Critical or High findings).

**Reviewed:** `b84b5d4..f87a318` plus the round-1 repair commit; relay review, so the leverage
was independent RE-DERIVATION (every gate/branch re-read fresh from JOUSTRV4.SRC this round, all
15 claims audited prose-vs-ROM, and four NEW mutants run that TEA's battery did not contain).

### Specialist Domain Coverage (8 disabled specialists — domains assessed directly)

| Subagent | Received | Summary |
|----------|----------|---------|
| preflight | Yes | diff stat 8 files +1515/−87; joust 2246/2246, shared 528/528, lint clean; no debug leftovers; claims JT83-001..015 well-formed; no conflict markers; one stderr anomaly traced to the citations suite's own error-path fixture (`check-citations.mjs:323`, the jt1-9 empty-set message — pre-existing, not this story's) |
| edge_hunter | Disabled in settings | domain covered directly: boundary mutants R1-R4 below — two edges found and fixed |
| silent_failure_hunter | Disabled in settings | covered directly: out-of-table mask reads return 0 by the landMaskAtX convention (jt1-5-reviewed), never throw/NaN; `steerWake` has no failure path to swallow |
| test_analyzer | Disabled in settings | covered directly: ORACLE/RED split stated per file; absence guards carry positive controls; measured windows carry their measurements; the one coverage gap found (gate boundaries) is the Medium below |
| comment_analyzer | Disabled in settings | covered directly: 15/15 claims audited against fresh ROM context — 14 true, JT83-003 reworded (Low); one stale test comment fixed (Low); two PRE-EXISTING stale line-refs noted as a finding, not this story's regression |
| type_design | Disabled in settings | covered directly: no casts/`as any`; `SteerResult` readonly; contract types declared in helpers per house pattern |
| security | Disabled in settings | covered directly: no user input, no auth surface, no external I/O in core; claims JSON runtime-narrowed by `asClaim` (rule #10); tenant isolation n/a to a pure sim |
| simplifier | Disabled in settings | covered directly: `steerWake` is one guard-chain + one sample + one write; no speculative abstraction; the only helper added (`bckMaskAt`) has two call-free consumers (steer left/right share it) |
| rule_checker | Disabled in settings | covered directly: Rule Compliance table below |

All received: Yes

### Observations

1. `[VERIFIED]` **The gates match the ROM branch-for-branch.** Re-derived fresh: `B2DIRL`
   (:4097-4102) `CMPA #$D3 / BLO B2DIR / LDA PVELY / BMI B2DIR / JMP BOLAVA` ⇒ steer iff
   `pixelY < $D3 || velY < 0` ≡ the implementation's `if (pixelY >= LAVA_ESCAPE_Y && velY >= 0)
   return held`; `SHDIR` (:4330-4334) identically with `$D0` and the extra `target !== null`
   routing (SHLEPB/SHDIRB proven mask-free by the structural test). Complies with rule #15 —
   the write-set enumerations anchor declarations, not tokens.
2. `[VERIFIED]` **The away-write is absolute and direction-true.** Travel −1 samples −31 and
   sets facing +1, matching `CLR PFACE FACE RIGHT` :4122; travel +1 mirrors :4140-4141. The
   idempotency test kills a COM-style flip (TEA mutant M4, 1 precise red).
3. `[MEDIUM][TEST]` → **Fixed in round.** Both lava-gate BOUNDARIES were unguarded: reviewer
   mutants R2 (`$D0` `>=`→`>`) and R3 (`$D3` `>=`→`>`) each survived all 2246 tests — the
   207/209/212 fixtures behave identically under either comparison. One boundary test added
   (both brains dived at their exact gate scanline, premises asserted against the BCK tables);
   both mutants re-run RED. Suite is now 2247.
4. `[LOW][DOC]` → **Fixed in round.** JT83-003's prose used "below $D3" in the numeric sense and
   "at or below $D3" in the screen sense in one sentence — the ambiguity class that cost jt8-6
   three rounds. Reworded to numeric comparisons; id/line/verbatim untouched, citations 72/72.
5. `[LOW][DOC]` → **Fixed in round.** `steering-source.test.ts`'s PPVELX test comment described
   the pre-GREEN enemy.ts wording as current ("currently claims") after GREEN had reworded it.
6. `[LOW][DOC]` **Pre-existing, not this story's:** `audio-flap.test.ts:536` ("enemy.ts:540") and
   `difficulty-wiring.test.ts:27` ("enemy.ts:115/118") were stale BEFORE jt8-3 (verified against
   `b84b5d4`) and drifted further as the file grew — the comment-body line-ref category. Filed
   as a Delivery Finding for SM to route.
7. `[VERIFIED]` **The shadow's per-branch laws are the ROM's.** SHDN: `BMI` skips only negative
   PVELX, so the port's `velXIndex >= 0` (zero flaps) is exact; inclusive `$D3` via `BLO`.
   SHLEP: strict-greater line term (`BLS` wings-up on lower-or-same) + falling-gated lava term
   (`LDA PVELY / BPL SHFAST`), two different gates in two branches — implementation reads
   `enemyY > player.pixelY || (enemyY >= LAVA_ESCAPE_Y && velY >= 0)`, exact. TEA mutants
   M9/M10 red each gate individually.
8. `[VERIFIED]` **No hollowing.** The pre-story shadow guards (enemy.test.ts:343/:356-:361)
   still bind: their fixtures default `velXIndex` 0, which the new SHDN law flaps ⇒ the escape
   is still demanded; the free-fall guards assert flap-false states unchanged by the re-seat.
9. `[VERIFIED]` **Wiring end-to-end.** `frame.ts:347` passes `{ player: target ?? null, wave }`
   into `stepEnemyDetailed`, whose homing → steer → seek → brain order is pinned at the
   stepEnemy level (turn-wake flip AND FLYX 8→6 in one wake); the in-play guard observed
   steering turns through `stepDemo` on all four seeds with every turn mask-justified, and the
   bounders-only control counted zero. Reviewer mutant R1 (sampler origin off-by-one) red ×4.
10. `[VERIFIED]` **Determinism/purity (AC-4).** Replay hashes equal per seed and differ across
    seeds; the purity suite is green over the grown core file — `steerWake` reads only its
    arguments and two frozen tables.

### Rule Compliance (lang-review/typescript.md vs the diff)

| Rule | Judgment |
|------|----------|
| #1 type-safety escapes | compliant — no `as any`/`@ts-ignore`/non-null-assertions; loaders narrow `catch (e)` via `instanceof Error` |
| #2 generics/interfaces | compliant — `SteerResult` readonly fields; `readonly number[]` tables consumed, not mutated |
| #3 enums | n/a — union types throughout (`SmartBrain`), no enums added |
| #4 null/undefined | compliant — `??` used (`ctx?.player ?? null`); no `\|\|`-on-falsy in the diff |
| #5 modules | compliant — `.js` extensions on all relative imports; `export type` re-exports in contracts |
| #6 React/JSX | n/a |
| #7 async/promises | compliant — the only async is the contract loaders' dynamic import, awaited in `beforeAll` |
| #8 test quality | compliant — no `as any` in assertions; fixture premises asserted in-test; one gap found and fixed (obs. 3) |
| #9 build/config | n/a — no config changes |
| #10 input validation | compliant — claims JSON narrowed by `asClaim` before use |
| #11 error handling | compliant — `catch (e: unknown)`-equivalent narrowing in both contract loaders |
| #12 perf/bundle | compliant — table lookups O(1); no barrel imports |
| #13 fix-regressions | round-1 fixes re-scanned: one test + one JSON string + one comment; no new escapes/gates introduced |
| #14 derived edges | compliant — the turn is computed at `stepEnemyDetailed`'s single pre-brain seam where every route is visible; the forced flap ORs at the single input construction, not inside a branch |
| #15 token-vs-claim anchors | compliant — law pins anchor line+instruction; write sets enumerated as exact lists; every guard mutation-tested (TEA 11/11 + reviewer 4/4 after repair) |

### Devil's Advocate

Suppose this is broken anyway. The likeliest fracture is the sample itself: `bckMaskAt` returns
0 outside either table, so a hunter at x 289-292 travelling right samples past the table's
+319 edge and sees open air where the 1982 machine would read whatever ROM bytes happen to
follow `BCKXS1` — deterministic garbage that could occasionally steer a real cabinet's bird.
The port's convention (out-of-range ⇒ no ground) is `landMaskAtX`'s, reviewed at jt1-5 and used
by the flight core every frame, and the wrap teleports x out of that band within a few wakes —
I judge the divergence unobservable in play and the convention correct to keep, but it is a
real, undocumented micro-divergence and I am saying it out loud rather than quietly believing
it. Second fracture: the in-play attribution could theoretically miss a steering turn that
lands on the same wake as a homing counter TICK (prdir changed, no flip) — the filter would
exclude it. That is an undercount by construction, and the fires-guard only needs one turn per
seed; the bounders-only zero-control catches the opposite failure (overcounting), so the pair
holds. Third: the forced `flapHeld` on a turn wake makes the wing-cue path emit a wing-down
edge at cliffs — is that ROM-true? Yes: `LDB #1` writes the CURJOY low byte the ROM's own
FLIPLP reads as the wing level, so a 1982 bird's wings visibly beat on the turn too. Fourth:
could `steerWake` fight `homingWake` — a COM flip toward a cliff immediately re-set away,
oscillating? The ROM has the same composition (throttle blocks fall INTO the direction
routines) and the steer write is idempotent-away, so the pair converges rather than thrashes;
the 100-wake brake test walks exactly that composition. The boundary gap the mutants exposed
was the one place this code could genuinely misport unnoticed, and it is now pinned.

### Deviation Audit

All five entries audited; stamps appended in place under Design Deviations. Summary: four TEA
deviations ACCEPTED (the BCK-pair correction is proven in-suite; the per-wake collapses follow
the uf1-8/jt8-2 precedent and their timers are uf1-9's named rows; the BOLAVA suppression and
routing pins match the re-derived ROM), one Dev deviation ACCEPTED (the held-level flap matches
the CURJOY low-byte convention the ROM itself uses).

**Impact summary:** the four TEA Gap findings (SHDIRB coast, BOLAVA, PBUMPX, vertical YLEN) and
the claims-loader sweep remain OPEN for SM to file/route at finish, plus one new Reviewer
finding (pre-existing stale line-refs). Nothing blocks.

## Delivery Findings

### Reviewer (review)

- **Improvement** (non-blocking): `audio-flap.test.ts:536` and `difficulty-wiring.test.ts:27`
  carry `enemy.ts:<line>` refs that were already stale before jt8-3 and drift further every
  time the file grows. Affects `plugins/joust/tests/audio-flap.test.ts`,
  `plugins/joust/tests/difficulty-wiring.test.ts` (replace comment-body line refs with symbol
  refs). Candidate to fold into the same sweep as TEA's claims-loader finding. *Found by
  Reviewer during review.*

### Dev (implementation)

- No upstream findings during implementation. (The four Gap findings and the claims-loader sweep
  TEA filed above were confirmed in-scope-adjacent and remain SM's to route at finish; nothing
  new surfaced during GREEN.)

### TEA (test design)

- **Gap** (non-blocking): `SHDIRB` (:4388-4392) COASTS a moving shadow on SHDN/SHUP wakes
  (CURJOY dir = 0); the port returns `dir = facing` on those wakes. Real ROM behaviour, outside
  this story's steering scope. Affects `plugins/joust/src/core/enemy.ts` (`shadow()` dir
  channel). Needs an owner story at finish. *Found by TEA during test design.*
- **Gap** (non-blocking): `BOLAVA` (:3953+), the lava-avoid episode the `$D3`/`$D0` steer gates
  divert to, is unmodelled — gated wakes fall through to the existing brain laws, and SHLEV's
  protective flap stands in for it. Affects `plugins/joust/src/core/enemy.ts` (a future
  lava-avoid law). Needs an owner story at finish. *Found by TEA during test design.*
- **Gap** (non-blocking): `PBUMPX` bump-facing (:4148-4150 / :4379-4381) — collision-driven
  facing inside B2DIRA/SHDIRA, enumerated in the write-set tests — is unmodelled. Affects
  `plugins/joust/src/core/enemy.ts`. Needs an owner story at finish. *Found by TEA during test
  design.*
- **Gap** (non-blocking): the vertical `B2YLEN`/`SHYLEN` overhead-cliff checks gating the UP-seek
  arms (:4030-4034, :4259-4262, :4418-4422) are separate from this story's horizontal look-ahead
  and unmodelled. Affects `plugins/joust/src/core/enemy.ts` (`seekWake`'s up-arm). Needs an owner
  story at finish. *Found by TEA during test design.*
- **Improvement** (non-blocking): 27 legacy `-source` suites still carry their own pre-hardening
  `loadClaims`/`claimCovers` copies now that `tests/helpers/claims.ts` exists (the jt8-2 note's
  "3×" undercounted — it is 28 definitions). Affects `plugins/joust/tests/*-source.test.ts` (a
  mechanical import sweep). Needs a filed chore at finish. *Found by TEA during test design.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **The look-ahead sampler is the BCK pair, not `arena.groundMaskAt`**
  - Spec source: epic YAML AC-1 / story description
  - Spec text: "both cases pinned against arena.groundMaskAt; … our arena.groundMaskAt is that BCKXTB/BCKYTB analog"
  - Implementation: tests demand sampling of `BCK_X_TABLE`/`BCK_Y_TABLE` (the actual BCKXTB/BCKYTB transcriptions), with fixtures placed where the LANDING pair reads zero; `groundMaskAt` is the CKGND/LNDXTB/LNDYTB analog by its own docstring
  - Rationale: `B2DIR` samples `BCKXTB±B2XLEN AND BCKYTB` (:4119-4120); pinning the AC's named symbol would pin the wrong map and the look-ahead would almost never fire (thin landing strips vs tall cliff boxes). Pin the machine, deviate the prose — proven in `steering-source.test.ts` ("two different maps") and by mutant M1 (12 reds)
  - Severity: minor
  - Forward impact: Dev builds a BCK sampler; the description's mapping sentence must not be quoted forward as fact
  - → ✓ ACCEPTED by Reviewer: proven in-suite — the fixtures sit where the pairs disagree and mutant M1 (sampler swap) reds 12 tests; the AC's named symbol was port-side prose, the ROM lines are the spec
- **Per-wake collapse of the B2AV/SHAV slow episodes and SHLEP's stored line/velX**
  - Spec source: story description ("flip PFACE and slows (B2AV)", "SHLEP tracks the PLAYER line")
  - Spec text: the ROM installs B2AV/SHAV for 8 wakes (PJOYT) and stores the player's line+velX at the SHLEP decide on an 8+1-wake SHUPTM timer
  - Implementation: the turn wake keeps its `LDB #1` flap (pinned: FLYX 8→6) and the slow collapses to "dir = the new facing while the drift decays" (pinned over 100 wakes); SHLEP tracks the LIVE line (stored ≡ live when re-deciding every wake)
  - Rationale: PJOYT/SHUPTM are "TIME UNTIL NEXT DECISION" rows — uf1-9's family, per the jt8-2/uf1-8 precedent; B2DIR is idempotent so the collapse is stable
  - Severity: minor
  - Forward impact: uf1-9 revisits the timers; none owed here
  - → ✓ ACCEPTED by Reviewer: the collapsed timers are uf1-9's named rows (BOLETM-family precedent from jt8-2/uf1-8); the turn-wake flap is kept and pinned, which is the observable half
- **The steer gates suppress rather than divert (BOLAVA unmodelled)**
  - Spec source: story description scope ("the look-ahead turn and the shadow player-line track")
  - Spec text: the ROM's `$D3`/`$D0` gates route to BOLAVA, the lava-avoid episode
  - Implementation: gated wakes fall through to the existing brain decision; SHLEV keeps uf1-8's protective lava flap as the stand-in
  - Rationale: BOLAVA is its own mechanism (bounder-family, unowned); modelling it here would expand a 3-point story into the whole lava-avoid system
  - Severity: minor
  - Forward impact: the BOLAVA Delivery Finding must get an owner at finish
  - → ✓ ACCEPTED by Reviewer: suppress-not-divert matches the re-derived gates exactly (steer iff pixelY < line OR rising); building BOLAVA here would be scope creep; the finding is on the board for SM
- **The shadow's look-ahead is pinned to the no-players route ONLY**
  - Spec source: epic YAML AC-1 ("The hunter/shadow look-ahead turns the enemy…")
  - Spec text: reads as if both brains steer on all wakes
  - Implementation: tests pin the ROM's routing — hunter on every airborne wake, shadow only via SHLEV→SHDIR; a HUNTING shadow is pinned to NOT steer (with its positive control)
  - Rationale: SHLEPB exits to SHDIRA and the seeks to SHDIRB — no mask read on any of them (proven mechanically: "the SHLEPB → SHDIRA block consults NO background mask")
  - Severity: minor
  - Forward impact: none — the machine, as shipped, is what AC-1's outcome sentence describes
  - → ✓ ACCEPTED by Reviewer: SHLEPB→SHDIRA and SHDIRB are proven mask-free by the structural test; pinning the ROM's routing over the AC's summary sentence is the house rule

### Dev (implementation)

- **The turn-wake flap is applied as a held LEVEL, not a bare edge**
  - Spec source: session file (TEA contract, `SteerResult.turned` doc) and JOUSTRV4.SRC:4146/:4377
  - Spec text: "A turned wake flaps (`LDB #1`) — stepEnemyDetailed must route that into the entity input"
  - Implementation: `steered.turned` ORs into both `flap` and `flapHeld`, exactly as brain flaps already do
  - Rationale: `LDB #1` writes the CURJOY low byte, which the shared airborne step reads as both the edge and the wings-held level — the existing `stepEnemy` convention for every brain flap; diverging for the turn wake would give it a unique half-wake wing state no ROM route has
  - Severity: minor
  - Forward impact: none — the wingEdge cue path sees a turn-wake flap like any brain flap; jt5-3's cue tests stay green
  - → ✓ ACCEPTED by Reviewer: LDB #1 writes the CURJOY low byte, which the ROM's FLIPLP reads as the wing LEVEL — the held-level treatment is the ROM's own convention, not a shortcut
- No other deviations from spec — the mechanism follows the TEA contract as written.

## Impact Summary

**Final state: APPROVED, zero blocking issues; every Delivery Finding routed at finish
(2026-08-01, SM), preflight `blocking_count: 0`.**

### Review round complete (round 1, the only round)
- **Verdict:** APPROVED with three in-round repairs (1 Medium: unguarded lava-gate
  boundaries; 2 Low: JT83-003 wording, one stale test comment) — each fixed in the round,
  committed (pushed as `1019265`; the session's `82d9da4` is the same change pre-rebase)
  and mechanically re-verified.
- **Tests at finish:** joust 2247 (2246 + the round-1 boundary test) · shared 528/528 ·
  orchestrator 359/359 · citations 72/72 · tsc clean.
- **Critical/High findings:** none in any round.

### Delivery Findings — final routing
- **TEA Gap — SHDIRB coast** (:4388-4392, dir 0 on SHDN/SHUP wakes vs the port's
  `dir = facing`) → **filed as jt8-9**.
- **TEA Gap — BOLAVA** (:3953+, the lava-avoid episode the `$D3`/`$D0` gates divert to;
  jt8-3 suppresses instead, Reviewer-accepted deviation) → **filed as jt8-10**.
- **TEA Gap — vertical B2YLEN/SHYLEN** overhead-cliff checks gating the UP-seek arms
  (:4030-4034, :4259-4262, :4418-4422) → **filed as jt8-11**.
- **TEA Gap — PBUMPX bump-facing** (B2DIRA :4148-4150 / SHDIRA :4379-4381) → **routed to
  existing owner jt5-13**, whose description now states the finding explicitly (the arms
  consume the PBUMPX field jt5-13 creates).
- **TEA Improvement — claims-loader sweep** (27 legacy `-source` suites / 28 definitions
  onto `tests/helpers/claims.ts`) → **filed as jt8-12** (chore, trivial).
- **Reviewer Improvement — pre-existing stale comment-body line refs**
  (`audio-flap.test.ts:536`, `difficulty-wiring.test.ts:27`) → **folded into jt8-12**,
  per the Reviewer's own suggestion to sweep both together.

### Recorded non-issue (Devil's Advocate)
- `bckMaskAt` returns 0 outside either BCK table where the 1982 machine would read
  adjacent ROM bytes — a real, documented micro-divergence following `landMaskAtX`'s
  jt1-5-reviewed convention, judged unobservable in play (the wrap leaves the band within
  a few wakes). Retained deliberately; not a finding.

### Acceptance criteria — all met
- AC-1 hunter/shadow horizontal look-ahead on the BCK pair, bounder unchanged ✓
- AC-2 shadow free-fall, SHLEP line track, `$D3` lava-escape ✓ (per-branch laws pinned)
- AC-3 radix-cited constants + claims JT83-001..015, citations suite green ✓
- AC-4 determinism per seed + purity guard green ✓