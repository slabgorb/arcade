---
story_id: jt3-3
jira_key: jt3-3
epic: jt3
workflow: tdd
---
# Story jt3-3: Lava troll — PADGRA->ADDLAV grip, break-free VY threshold, RV4 30s-grace + escalating pull cap, LNDB7 dispatch, escape-scores-50 event

## Story Details
- **ID:** jt3-3
- **Jira Key:** jt3-3
- **Workflow:** tdd
- **Stack Parent:** jt3-2

## Workflow Tracking
**Workflow:** tdd
**Phase:** review
**Phase Started:** 2026-07-21T15:29:00Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-21T15:29:00Z | - | - |

## Story Context

### Acceptance Criteria (VERBATIM from sprint YAML)
- "The troll spawns only after the bridge has burned (TTROLL gate), off CLIF5's landing path; the LNDB7 troll-grip dispatch reserved in jt1-4 is now reachable and exercised by test."
- "The grip repoints gravity (PADGRA->ADDLAV); break-free requires sustained VY < -$0180; a clean escape emits a 50-point score event (caveat carried); all cited + claims entries."
- "RV4 escalation: after the 30s grace, pull grows +1/frame to the $500 cap and is inescapable at cap; each patch preserves its pre-patch instruction as a ******** comment; proven by test at and below the cap."
- "Determinism: seeded grab->struggle->escape and grab->cap->death both replay bit-for-bit; citations + purity guard green."

## Technical Approach

### Carried-Forward Obligation from jt3-2 (BINDING)
jt3-2 shipped the arena-state seam via `src/core/arena-state.ts` but left `DemoState.arena` WRITE-ONLY. The physics path still calls the arena-unaware `groundOutcome`; the `applyWaveDestruction` call-site is UNPINNED. 

**jt3-3's troll gate structurally must consume `arena.bridgeBurned` from that seam** — so this story MUST:
1. Pin the demo call-site that applies wave destruction
2. Read the `arena.bridgeBurned` seam for the spawn gate (TTROLL = TBRIDGE + 1)

Do NOT re-derive the bridge-burn condition; consume the jt3-2 seam directly.

### Story Anchors (Binding ROM Cites — Do NOT Resolve)

**Spawn Gate & Landing Dispatch:**
- TTROLL spawn gate: JOUSTRV4.SRC:954-957 (TBRIDGE = wave 3, TTROLL = TBRIDGE + 1)
- LNDB7 troll-grip landing dispatch: reserved by jt1-4 (seventh landing outcome, TTROLL-gated) — jt3-3 makes it reachable

**Grip Mechanics:**
- PADGRA->ADDLAV gravity repoint: JOUSTRV4.SRC:1651-1652
- Break-free VY threshold: JOUSTRV4.SRC:6616-6617 (sustained VY < -$0180)
- Escape score event: JOUSTRV4.SRC:6666-6670 (50 points, verify-in-emulation caveat carried, SCRTEN backwards trap open-questions §4, ruling C)

**RV4 Patches (Red-Label Behaviour, Each Preserves Displaced Instruction as ******** Comment):**
- PATCH1/2/3 troll 30s grace + escalating pull: JOUSTRV4.SRC:6374-6396
  - 30-second grace period
  - +1 pull/frame after grace, capped at $500
  - Arithmetically inescapable at the $500 cap

**Troll Hand Frames:**
- 6 image blocks already transcribed in jt1-3

### Implementation Plan

1. **Pin the demo call-site** (Step 1)
   - Locate where `applyWaveDestruction` is called in the physics path
   - Ensure the call reads `arena.bridgeBurned` from the jt3-2 seam
   - Verify determinism through seeded replay

2. **Implement troll spawning** (Step 2)
   - Gate spawn condition on `TTROLL` (TBRIDGE + 1 wave)
   - Consume `arena.bridgeBurned` for the gating logic
   - Off CLIF5's landing path per ROM

3. **Implement grip mechanics** (Step 3)
   - Repoint victim gravity from PADGRA to ADDLAV
   - Implement break-free check: sustained VY < -$0180
   - Emit 50-point score EVENT on clean escape (verify-in-emulation caveat)

4. **Implement RV4 patches** (Step 4)
   - 30-second grace period from spawn
   - After grace: +1 pull/frame capped at $500
   - Each patch must preserve its displaced instruction as ******** comment
   - Verify inescapability at cap through test

5. **Exercise landing dispatch** (Step 5)
   - Wire LNDB7 troll-grip landing outcome (reserved by jt1-4)
   - Test that troll spawning and grip activation reach this dispatch
   - Use existing jt1-3 troll hand frames (6 blocks)

6. **Radix discipline** (Step 6)
   - Every constant gets radix-cited comment + claims entry
   - Follow Motorola syntax: bare DECIMAL, $ hex, @ octal, % binary

7. **Determinism** (Step 7)
   - Seeded grab->struggle->escape replay bit-for-bit
   - Seeded grab->cap->death replay bit-for-bit
   - Purity guard green

## Delivery Findings

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **30-second grace frame math (traced, not assumed 60 Hz):** PATCH1 seeds
  `LAVKLL` with the literal `#30*60` (`JOUSTRV4.SRC:6393`) — the operand is
  written `SECONDS*RATE`, so 30 s × 60 = **1800 frames**. PATCH2 re-naps the
  patch process with `LDA #1 / JMP VNAPTIM` (`JOUSTRV4.SRC:6384-6385`), i.e. it
  wakes every video field, so `LAVKLL` decrements **once per frame** at the
  60 Hz field rate (contrast the baiters' `SECONDS*60/8` nap, jt3-5). The
  `troll-source` suite pins the `30*60` operand and the VNAPTIM #1 nap so the
  math is on the wire, not inferred. `GRACE_FRAMES === 1800`.
- **VY-sustain semantics (the "sustained" in break-free):** ADDLAV
  (`JOUSTRV4.SRC:6608-6617`) folds the troll pull `CLVGRA` into VY (`SEX / ADDD
  CLVGRA / ADDD PVELY`), **stores** the new VY, and only THEN does
  `CMPD #-$0180 / BLT ADLFRE` (a **signed** compare). Because the pull is added
  BEFORE the test, break-free needs the **post-pull** VY < -$0180 — a raw
  single-frame spike to the threshold gets +pull and stays above it, so only
  SUSTAINED flapping accumulates VY below `-$0180 - pull`. Model:
  `escape ⇔ velY + gravInput + pull < -$0180` each frame; on escape ADLFRE
  branches BEFORE `ADDD PPOSY+1` so **posY is frozen** that frame (the grip
  releases without an integrate). `gravInput` is 0 wings-down / 4 wings-up
  (`CLRB`/`LDB #$04`, `:6170/:6197`) — ADDLAV keeps no `GRAV`, `CLVGRA` replaces
  it.
- **How the demo call-site is pinned (the carried jt3-2 obligation):**
  `tests/demo-troll.test.ts` `forceAdvance()` strips the live enemies/eggs to
  force a wave clear and steps the REAL `stepDemo` across the wave-3 burn;
  `demo.arena.bridgeBurned` must flip true (the `applyWaveDestruction` call-site
  at `demo.ts:583`). `trollSpawnable(demo.arena, demo.wave)` then goes false→true
  only because the LIVE arena carries the burn; a stale (call-site-deleted) arena
  keeps it false at wave 4. Deleting the call-site reddens `THE CALL-SITE` +
  `THE GATE`. Added `arena: ArenaState` to `demo-contract.ts`'s `DemoState` (it
  was omitted at jt2-7, predating the field).
- **$500 cap OVERSHOOTS to $501 — keep it (open question for Dev):** PATCH2's
  `CMPD #$500 / BHI` (`JOUSTRV4.SRC:6378-6379`) is unsigned-STRICTLY-higher, so
  the pull increments while `CLVGRA <= $500` — it lands on $501 then holds. Tests
  pin the exact BHI edge ($4FF→$500, $500→$501, $501→$501). `PULL_CAP === $500`
  is the COMPARISON constant; do NOT clamp the terminal pull to $500. (Both $500
  and $501 are proven inescapable — 1280/1281 ≫ the break-free margin.)
- **`escapeScoreEvent` reason lives in troll.ts, not demo.ts:** jt3-3 defines the
  `{ kind:'score', value:50, reason:'escape' }` event at the core seam; the demo
  wiring of the live grab (spawning the troll, emitting the event in the frame
  loop) is jt3-7's playable-slice job. The 50 is `$50` **BCD** via SCRTEN
  (`:6668-6670`) — the verify-in-emulation caveat rides in claim JT33-011; no test
  gates on an emulator (ruling C).
- **`beginGrip(baseGravity)` takes the pull as a parameter:** `LAVGRA` is itself
  a jt3-1 `DYTBL` difficulty row (starts `$04/$06/$08` by GA1 tier, end `$02d`;
  `difficulty.ts` `DIFFICULTY_TABLE`). jt3-3 keeps the grip pure by taking the
  base pull in; a later story may source it from the difficulty walk.
- **Test files added:** `tests/troll.test.ts` (behaviour, 4 ACs),
  `tests/troll-source.test.ts` (vendored re-derivation + JT33 claims + provenance),
  `tests/demo-troll.test.ts` (call-site pin), `tests/helpers/troll-contract.ts`
  (module contract + loader), `docs/rom-study/claims/troll.json` (22 JT33-*
  claims, all byte-verified by the citations gate). *Found by TEA during test
  design.*

### Dev (implementation)

- **Built (Improvement, non-blocking):** `src/core/troll.ts` — the whole lava-troll
  hand as pure core (190 lines, one file). `trollSpawnable` (reads `arena.bridgeBurned`
  && `wave >= TROLL_WAVE`), `beginGrip`/`escalateGrip` (PATCH1/2 grace+escalation),
  `stepGrip` (ADDLAV), `escapeScoreEvent`, plus the constants (BREAK_FREE_VY -$0180,
  PULL_CAP $500, GRACE_FRAMES 1800, ESCAPE_SCORE 50, TROLL_WAVE 4, GRIP/NORMAL routine
  names). Imports `BRIDGE_WAVE`/`TROLL_DELAY`/`isLavaDeath` from `arena.js` (core→core,
  single source of truth); no shell import, no clock, no entropy. *Found by Dev.*
- **TEA trap #1 ($501 overshoot) — implemented cleanly against source (JOUSTRV4.SRC:6374-6386):**
  PATCH2 is `LDD LAVKLL / ADDD #-1 / BGT 10$ … LDD CLVGRA / CMPD #$500 / BHI 5$ / ADDD #1`.
  `escalateGrip` mirrors it exactly: `pull = grip.pull > PULL_CAP ? grip.pull : grip.pull + 1`,
  so $4FF→$500, $500→$501 (BHI is unsigned-STRICTLY-higher, $500 is not "higher"), $501/$600
  hold. PULL_CAP stays the $500 comparison constant; nothing clamps to $500. The BGT boundary
  also gives the timer semantics the tests pin: killTimer decrements while `killTimer-1 > 0`
  (grace, pull frozen), then holds at 1 and escalates every frame after (LDD #1). *Found by Dev.*
- **TEA trap #2 (sustained-before-check) — implemented cleanly against source (JOUSTRV4.SRC:6608-6617):**
  ADDLAV folds `gravInput (SEX REG.B: 0 down / 4 up) + CLVGRA + VY` into the stored VY BEFORE
  the signed `CMPD #-$0180 / BLT`. `stepGrip` computes `newVelY = int16(velY + gravInput + pull)`
  then tests `newVelY < BREAK_FREE_VY`; a raw single-frame spike to −$0181 gets +pull and stays
  above, so only SUSTAINED flapping escapes. On escape the position is FROZEN (return before the
  `posY + newVelY` integrate), matching ADLFRE branching before `ADDD PPOSY+1`. posY is NOT
  int16-wrapped (kept a whole-pixel 8.8 number like `flight.stepFlight`) so the unsigned FLOOR+7
  lava test via `arena.isLavaDeath` reads right above 0x8000. *Found by Dev.*
- **Carried jt3-2 obligation — the demo call-site pin passes (confirmed):** the
  `applyWaveDestruction` call-site (demo.ts:583) already existed from jt3-2; `trollSpawnable`
  is now its READER, so `tests/demo-troll.test.ts` (all 4 rows, incl. THE CALL-SITE + THE GATE +
  the stale-arena counterfactual) is green. Per TEA/handoff, NO live troll was wired into
  `stepDemo` (that is jt3-7) — demo.ts/arena.ts/flight.ts were NOT modified. *Found by Dev.*
- **Determinism (AC-4) holds:** `stepGrip`/`escalateGrip` are pure transforms returning new
  objects, no argument mutation, no clock/entropy — the seeded escape and seeded cap-death
  replay bit-for-bit (the AC-4 suite deep-equals two runs). Purity scanner sweeps the new file
  green. *Found by Dev.*

### Reviewer (code review)
- **Gap** (non-blocking): `stepGrip` integrates `posY` without a 16-bit wrap, and
  `isLavaDeath` uses a SIGNED `posY >> 8` — so a victim driven to a negative `posY`
  (flying off the top while gripped but never crossing the -$0180 escape threshold)
  is never registered as a lava death. The ROM stores `PPOSY+1` as a 16-bit value
  (`STD`) and reads the high byte with an UNSIGNED `CMPA #FLOOR+7 / BHS`
  (JOUSTRV4.SRC:6618-6621), so plain-integer `posY` in [-6656,-1] → high byte
  0xE6..0xFF ≥ 230 → death. Unreachable in jt3-3's pure-core scope (no live grip;
  every seeded trajectory escapes or dies within a few frames), but the live grip in
  **jt3-7** must reapply the ceiling / 16-bit-wrap the lava test so this ROM artifact
  (off-the-top-of-screen = lava death) is preserved. Affects `src/core/troll.ts`
  (`stepGrip`) + `src/core/arena.ts` (`isLavaDeath`). *Found by Reviewer during code review.*
- **Gap** (non-blocking): `escapeScoreEvent()` does not model ADLFRE's
  `LDA PID,U / BPL 33$` aliveness gate (JOUSTRV4.SRC:6666-6667) — the ROM scores 50
  ONLY when the gripped person is still alive. jt3-3 defines the event constructor at
  the core seam (correct scope); the aliveness condition is the **jt3-7** caller's job
  when it emits the event in the live frame loop. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): two source-suite assertions are weaker than they
  read. (1) `tests/troll-source.test.ts:230-239` (provenance survives into the port)
  is a bare whole-file substring match — satisfiable by `CLVGRA`/`LAVGRA`/`********`
  appearing anywhere, disconnected. The provenance IS correctly present in
  `troll.ts` and is ALSO structurally pinned against the real ROM line by
  `troll-source.test.ts:207-216` + claim JT33-007, so the discipline holds — but this
  particular check should anchor `LAVGRA` adjacent to a `\*{6,}` marker. (2) The
  per-range loop `troll-source.test.ts:262-271` passes even with `troll.json` deleted
  (cross-file claims from earlier epics cover the ranges); its teeth actually come
  from the sibling "≥12 JT33-* claims" + "PATCH3 ******** on 6613" assertions. Scope
  the loop to `id =~ /^JT33-/`. *Found by Reviewer during code review.*

## Design Deviations

None at setup.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

## TEA Assessment

**Tests Required:** Yes
**Reason:** —

**Test Files:**
- `tests/troll.test.ts` — behaviour across all 4 ACs: the `trollSpawnable`
  gate (AC-1), the PADGRA→ADDLAV grip + sustained break-free + escape event
  (AC-2), the 30s-grace/+1-per-frame/$500-cap escalation (AC-3), and the seeded
  escape/cap-death bit-for-bit replays (AC-4).
- `tests/troll-source.test.ts` — independent re-derivation of every troll
  constant from the vendored 1982 source, the PATCH `********` provenance, and
  JT33-* claim coverage (runs everywhere; source blocks `skipIf(!vendored)`).
- `tests/demo-troll.test.ts` — the carried jt3-2 obligation: the demo
  `applyWaveDestruction` call-site is pinned, and `trollSpawnable` reads the LIVE
  `demo.arena.bridgeBurned`.
- `tests/helpers/troll-contract.ts` — the `src/core/troll.ts` module contract +
  self-describing loader.
- `tests/helpers/demo-contract.ts` (edit) — added `arena: ArenaState` to
  `DemoState` (write-only field made readable).
- `docs/rom-study/claims/troll.json` — 22 `JT33-*` claims (byte-verified by the
  citations gate; all 704 committed claims still re-open clean).

**Tests Written:** 32 failing across all 4 ACs (RED — "troll module not built
yet"); the source re-derivations, claim coverage, and the demo call-site pin are
green (they prove the ROM facts / guard the existing seam).
**Status:** RED (failing — ready for Dev)
**Full suite:** 32 failed | 1164 passed (1196); no regressions; typecheck clean;
working tree clean; no `src/` written.

**Handoff:** To Dev (Julia) to create `src/core/troll.ts` satisfying
`tests/helpers/troll-contract.ts`.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/troll.ts` (NEW) — pure lava-troll core: `trollSpawnable` spawn gate
  (reads `arena.bridgeBurned`), `beginGrip`/`escalateGrip` (PATCH1/2 grace + $500-cap
  escalation, overshoots to $501), `stepGrip` (ADDLAV grip, sustained break-free,
  frozen posY on escape, lava death), `escapeScoreEvent` (50), and the cited constants.

No test / contract / claim / other-src file was touched (demo.ts, arena.ts, flight.ts
untouched — the demo call-site from jt3-2 is now READ, not re-written; no live troll
wired into stepDemo, per jt3-7 scope).

**Tests:** full suite 1197/1197 passing (GREEN); story files 51/51
(`troll.test.ts` + `troll-source.test.ts` + `demo-troll.test.ts`). Citations gate +
purity scanner green. (RED was 32 failed | 1164 passed.)
**Build:** `tsc --noEmit && vite build` green.
**Branch:** `feat/jt3-3-lava-troll` (committed e8758b4; not pushed — SM's task block
specified commit only, awaiting SM finish/PR).

**Handoff:** To review (Thought Police).

## Reviewer Assessment

**Verdict:** APPROVED

**Specialist gate:** [TEST] PASS · [RULE] PASS · [SEC] N/A (pure deterministic core —
no I/O, no auth, no entropy, no user-facing surface) · [EDGE] PASS (all boundary
findings out-of-domain or unreachable) · [PREFLIGHT] PASS

**Independent verification (source read, not trusted from the diff):**
- **$500 cap → $501 terminal (AC-3).** Re-read JOUSTRV4.SRC:6374-6396. PATCH2 is
  `LDD CLVGRA / CMPD #$500 / BHI 5$ / ADDD #1` — BHI is unsigned-strictly-higher, so
  `$500` is NOT "higher" and still increments to `$501`, which then holds. Dev's
  `escalateGrip` (`pull > PULL_CAP ? pull : pull + 1`) mirrors it exactly; the terminal
  pull is genuinely `$501`, not clamped to `$500`. Both `$500` (1280) and `$501` (1281)
  dwarf the break-free margin (floor = -$0180 - $500 = -$0680), so the cap is truly
  inescapable. Grace = `LDD #30*60` (:6393) with `VNAPTIM #1` renap every field
  (:6384-6385) = **1800 frames** — traced as SECONDS*RATE on the wire, not assumed.
- **Sustained break-free (AC-2).** ADDLAV (:6608-6617) folds `SEX(B) + CLVGRA + PVELY`
  into VY, `STD PVELY`, THEN `CMPD #-$0180 / BLT ADLFRE`. The pull is added BEFORE the
  SIGNED compare, so a single-frame spike to -$0181 gets +pull and stays above -384 —
  only sustained flapping escapes. `-$0180 = -384` exact; `<` is strict (matches BLT).
  On escape ADLFRE branches before `ADDD PPOSY+1` → posY frozen. Wings offset 0/4
  confirmed at :6170 (`CLRB`) / :6197 (`LDB #$04`). Lava death `CMPA #FLOOR+7 / BHS`
  (:6620) = `(posY>>8) >= 230` matches.
- **Escape-50 + caveat (ruling C).** `LDA #$50 / JSR SCRTEN` (:6668-6670); SCRTEN
  decimal-adjusts (DAA, :7363). Value 50 cited (JT33-010) and the verify-in-emulation
  caveat recorded (JT33-011) — `escapeScoreEvent()` gates on NO emulator.
- ********** provenance (architect ruling).** PATCH3's displaced `ADDD LAVGRA` is
  preserved as a `********` comment in source (:6613), in claim JT33-007, in the source
  re-derivation test (:207-216), AND in the `troll.ts` header. PATCH1's `OLD
  INSTRUCTION` (`STD PPICH,Y`, :6392) is preserved via JT33-012.
- **Carried jt3-2 obligation.** `bridgeBurned` is set in exactly ONE place
  (`applyWaveDestruction`, arena-state.ts:158), called from demo.ts:345 (initial) and
  :583 (per-wave). `trollSpawnable` reads `arena.bridgeBurned` DIRECTLY (troll.ts:121),
  not a re-derived condition. The demo call-site pin has real teeth (deleting demo.ts:583
  reddens THE CALL-SITE + THE GATE — confirmed by the test-analyzer's live mutation).

**Data flow traced:** flap input → `velY += impulse` → `stepGrip` (velY+gravInput+pull,
int16-wrapped) → `< -$0180` ? escape (posY frozen) : integrate → `isLavaDeath`. And:
demo wave-clear → `nextWaveBcd` → `applyWaveDestruction(arena, wave, …)` (demo.ts:583) →
`arena.bridgeBurned` latches at wave≥3 → `trollSpawnable(arena, wave≥4)` → LNDB7
`{kind:'troll'}` dispatch (reachable from real geometry, troll.test.ts:116-129).

**Test quality:** mutation-resistant where it counts — the break-free raw-velocity
mutant, the -$0181 off-by-one, the clamp-to-$500 mutant, the `>=`/`>` BHI mutant, and
the killTimer grace-expiry mutant were all independently confirmed to redden. The
source re-derivation is a genuine double-entry (the `joust-source` raw reader is
repo-enforced un-importable from `src/`), and it ACTUALLY RAN here (vendored tree
present — 21 source-block tests, not skipped).

**Preflight (run independently):** vitest **1197/1197** pass (39 files); `tsc --noEmit
&& vite build` clean; working tree clean. (The 3 "citation errors" printed are the
intentional `jt1-9-empty` negative test proving the linter refuses an empty claims set.)

**Live-spawn deferral — explicit call: ACCEPTED.** AC-1's bar is "the LNDB7 dispatch is
now REACHABLE and EXERCISED BY TEST" — not a live grab in `stepDemo`. That bar is met:
`groundOutcome(0x80)→{kind:'troll'}` (and `0xA0`→platform, so it is off CLIF5's path),
and troll.test.ts:116-129 proves a real `(x,y)` through `groundMaskAt` lands on the
troll band. The playable live grab ("the troll grabs off CLIF5 after the bridge burns,
playable on 5279") is verbatim **jt3-7's** AC. This mirrors the jt3-2 seam-deferral
(jt3-2 built the arena seam write-only; jt3-3 is its reader; jt3-7 wires the live
slice) — a deliberate, consistent epic decomposition, not a gap.

**Blocking findings:** NONE.

**Non-blocking (recorded under Delivery Findings for jt3-7 / follow-up):**
1. posY not 16-bit-wrapped → the ROM's off-the-top-of-screen lava death is unreachable
   in the port (deep corner; live grip + ceiling is jt3-7). *[RULE]*
2. `escapeScoreEvent` omits ADLFRE's aliveness gate (`BPL 33$`) — jt3-7 caller's job. *[RULE]*
3. Two source-suite assertions weaker than they read (provenance whole-file substring
   match; per-range claim loop passes cross-file) — the guarded facts are still pinned
   by stronger sibling assertions; tighten when convenient. *[TEST]*
4. No input validation on the troll functions (NaN/null/huge/negative) — diverges from
   arena.ts's throw-on-invalid-domain convention, but every in-domain caller is safe
   (LAVGRA base pull is $04..$2d per the DYTBL row). *[RULE, nit]*

**Deviation audit:** session `## Design Deviations` = "None at setup." No undocumented
deviations found — the two scope deferrals (live spawn → jt3-7; grip pull param instead
of sourcing LAVGRA) are both explicitly ruled/handoff-documented, not silent.

**Handoff:** To SM for finish-story.

## Sm Assessment

**Outcome:** APPROVED and merging — RED `f35705d`, GREEN `e8758b4`. Full suite 1197/1197, build green.

**Pipeline (peloton, subagents):** setup → TEA RED (32 reds, all "troll module not built yet"; TEA traced two load-bearing traps + pinned the carried call-site) → Dev GREEN (built `src/core/troll.ts`; implemented both traps against source) → Reviewer APPROVED (independently re-read all five load-bearing citations against JOUSTRV4.SRC; ran suite+build; test-analyzer live-mutation confirmed the VY threshold, $500/$501 cap, and call-site pin are mutation-resistant, and the source re-derivation is genuine double-entry).

**Load-bearing facts verified (Reviewer, against source):** RV4 cap is `BHI` unsigned → pull overshoots to `$501` (NOT clamped to $500), inescapable at cap (floor −$0680 vs +$500/frame); 30s grace = 1800 frames (`#30*60`, VNAPTIM #1 renap); break-free = SUSTAINED VY < −$0180 (−384 exact) with pull folded in BEFORE the signed check (single-frame spike can't escape); escape-50 event cited with the SCRTEN verify-in-emulation caveat recorded (ruling C, no emulator gating); PATCH `********` provenance present.

**Carried jt3-2 obligation DISCHARGED (I mutation-proved it):** `trollSpawnable` reads `arena.bridgeBurned` directly; neutralizing ONLY the per-wave `applyWaveDestruction` call-site (demo.ts:583) reddens exactly `THE CALL-SITE` + `THE GATE` in demo-troll.test.ts, restore → 1197 green. The unpinned-call-site gap the jt3-2 reviewer flagged is now closed with teeth.

**Live-spawn deferral ACCEPTED** (Reviewer's explicit call): AC-1's bar is the LNDB7 dispatch reachable + exercised by test (met: `groundOutcome(0x80)→{kind:'troll'}`, real (x,y) through `groundMaskAt`); the playable live grab off CLIF5 is jt3-7's verbatim AC. Same seam-deferral pattern as jt3-2→jt3-3.

**CARRIED-FORWARD OBLIGATIONS → jt3-7 (I am threading these into jt3-7 setup):** (1) `stepGrip` integrates `posY` without a 16-bit wrap and `isLavaDeath` uses SIGNED `posY>>8`, whereas the ROM reads the high byte UNSIGNED (`CMPA #FLOOR+7 / BHS`) — a victim driven off the top of the screen while gripped would not register a lava death. Unreachable in jt3-3's pure-core scope; jt3-7 MUST reapply the ceiling / 16-bit-wrap the lava test when it wires the live grip. (2) jt3-7 still owes routing physics/render through the arena seam (the original jt3-2 carry). Non-blocking nits logged: missing aliveness gate on `escapeScoreEvent`; two source-suite assertions weaker than they read (facts still pinned by stronger siblings); absent NaN/null/huge input validation.
