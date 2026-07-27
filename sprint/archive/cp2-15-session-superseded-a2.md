---
story_id: "cp2-15"
jira_key: "cp2-15"
epic: "cp2"
workflow: "tdd"
---
# Story cp2-15: Frame order — reproduce the ROM mainloop sequence so PLAY precedes SHOOT and SHOOT scans slot 13 first

## Story Details
- **ID:** cp2-15
- **Jira Key:** cp2-15
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** review
**Phase Started:** 2026-07-27T07:41:42Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-27T06:59:17Z | 2026-07-27T07:01:37Z | 2m 20s |
| red | 2026-07-27T07:01:37Z | 2026-07-27T07:28:02Z | 26m 25s |
| green | 2026-07-27T07:28:02Z | 2026-07-27T07:41:42Z | 13m 40s |
| review | 2026-07-27T07:41:42Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): CT-70's corroboration note cites MOTION's per-segment PLAY
  call at `:1447`; the verified line is `:1449` (`JSR PLAY ;SEGMENT AND PLAYER
  COLLISION?` — re-checked against the vendored source this session). The citation
  gate only byte-checks the claim's `source` field (`:39`, which passes), so this is
  prose-only, but the next reader who greps `:1447` finds whitespace.
  Affects `centipede/docs/rom-study/claims/09-centipede-train.json` (CT-70
  corroboration.note: 1447 → 1449, while Dev is in the dossier anyway).
  *Found by TEA during test design.*

- **Improvement** (non-blocking): AC-3's bookkeeping target located — the two cp3-1
  Delivery Findings this story fixes live in `sprint/archive/cp3-1-session.md`
  (the Gap "PLAY runs after SHOOT in the sim…" and the Gap "SHOOT's scan priority is
  inverted…"). Mark BOTH resolved there with the fixing commit at finish. The THIRD
  finding sitting between them (Improvement: the SHOOT-tail delay gate `:2305-2307`
  keeps ticking a killed spider's COUNT during the death/wave pauses; our
  `stepDeathFrame` does not) is NOT covered by cp2-15's ACs and stays open — do not
  fold it into this fix silently.
  Affects `sprint/archive/cp3-1-session.md` (resolution annotations at finish).
  *Found by TEA during test design.*

### Dev (implementation)

- **Conflict** (non-blocking): the RED cut's slow-flea guard asserted the killing flea
  SURVIVES (`pic < 0x20`) — it pinned today's stampless contact check, not the ROM.
  PLAYEX stamps `X,MOBJP` with X still 12 from ANTMV's `LDX I,12. / JSR PLAY`
  (`:107-108`, `:1805-1806`), so the flea dies with the player. Corrected in commit
  `253d1e3` before implementing; the Reviewer should verify the correction against
  those ROM lines firsthand rather than trusting either cut.
  Affects `centipede/tests/frame-order.test.ts` (already corrected).
  *Found by Dev during implementation.*

- **Improvement** (non-blocking): the death/wave PAUSE still freezes more than the ROM
  does — the ROM's pause frames keep running SCORP's picture machine (no gun gate in
  its head, `:2001-2007`), EXPLOD's countdowns, and SHOOT's tail (the open cp3-1
  Improvement about the spider COUNT). cp2-15 fixed the ordering WITHIN a playing
  frame only; `stepDeathFrame`'s freeze is pre-existing and shared by the flea and
  scorpion. Same bucket as the open cp3-1 finding — one successor story could close
  the whole family.
  Affects `centipede/src/core/sim.ts` (`stepDeathFrame`).
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Conflict** (blocking for cp2-16 scope): upstream's merged cp2-15 (`156430e`)
  resolves the slot-12 dual-window frame AGAINST the ROM — its pre-SHOOT player check
  includes the (pre-step) flea, so a fast flea in both windows kills the PLAYER where
  the cabinet kills the FLEA for 200, and a slow flea is never sped up. Proven by
  running this branch's frame-order suite against `156430e`: `expected +0 to be 200`,
  `expected 1 to be 4`. The ROM's slot-12 PLAY is inside ANTMV (`:107-108`), mainloop
  `:37`, after its own move (`:105`) and after SHOOT (`:34`); upstream's in-code
  comment defending the pre-step check must be corrected or it will fight the fixer.
  Affects `centipede/src/core/sim.ts` on develop (cp2-16 scope amendment: stamps AND
  the slot-12 PLAY phasing).
  *Found by Reviewer during code review.*

- **Gap** (non-blocking): upstream's new dossier claims propagate the CT-70 note error
  — `156430e`'s `09-centipede-train.json` carries FOUR `1447` occurrences where the
  verified MOTION `JSR PLAY` line is `:1449`. This branch's fix covered only CT-70;
  cp2-16 should sweep all four.
  Affects `centipede/docs/rom-study/claims/09-centipede-train.json` (on develop).
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Slot 12 pinned as SHOT-first, not player-first — AC-1's "written so cp3-2/cp3-3 creatures inherit it" corrected to the ROM**
  - Spec source: epic-cp2.yaml cp2-15 AC-1 / context-story-cp2-15.md
  - Spec text: "kills the PLAYER and awards NO points … pinned by test for the spider, and written so cp3-2/cp3-3 creatures inherit it"
  - Implementation: PLAY-before-SHOOT is pinned for the spider AND the segments (the ROM's two pre-SHOOT PLAY callers, `:417` in BUGMV `:33` and `:1449` in MOTION `:30`); slot 12 is pinned as the OPPOSITE, by two keep-behavior guards — the fast flea dies to the shot (+200) without ever reaching PLAY, and the slow flea survives its no-score first hit and still kills the player from ANTMV's own post-shot PLAY (`:108`).
  - Rationale: PLAY has exactly THREE callers (`grep "JSR\s*PLAY"` → :108 ANTMV, :417 BUGMV, :1449 MOTION) and SCORP has none; ANTMV runs at mainloop `:37`, AFTER SHOOT `:34`. So "inherit" can only mean AC-2's descending scan (which slot 12 does join at scan position 12), never player-first. The ROM outranks the story prose; a fix that moves every player check before SHOOT overshoots and the two guards go red.
  - Severity: minor
  - Forward impact: Dev must keep the slot-12 shot resolutions before stepScorp/stepFlea and the flea's player check after them; the Reviewer should read the guards as corrected spec, not missing coverage.

### Dev (implementation)
- **Slow-flea guard corrected: the killing flea is stamped 0xFF (test edit in GREEN)**
  - Spec source: tests/frame-order.test.ts (TEA's RED cut), AC-1 contrast guard
  - Spec text: "expect(after.flea.pic < 0x20, 'the flea survives the first hit (FL-21 live band)')"
  - Implementation: replaced with `expect(after.flea.pic).toBe(FLEA_EXPLODE_PIC)` — commit `253d1e3`, before any src change
  - Rationale: PLAYEX runs with X still 12 from ANTMV's `LDX I,12. / JSR PLAY` (`:107-108`), so `:1805-1806 LDA I,0FF / STA X,MOBJP` stamps the flea; ANTMV (`:37`) runs after EXPLOD (`:31`), so the 0xFF holds to frame end. A Dev normally may not edit TEA's tests; this one pinned anti-ROM behavior on a fidelity story, verified firsthand, and is fully papered (Conflict finding above).
  - Severity: minor
  - Forward impact: none — the corrected assert is the ROM contract; the flea's return path (EXPLOD countdown → SCORP revival) already handles a stamped slot 12.
- **newhd-factory lone-head staging re-seated off the gun's column (h 0x80 → 0x40)**
  - Spec source: tests/newhd-factory.test.ts (cp2-10), "a lone head descending to the bottom row arms newd"
  - Spec text: staging `segs: [{ h: 0x80, v: 0x0a, … }]` with the gun at its default (0x80, 8)
  - Implementation: head re-seated to h 0x40; assertions untouched; proven 13/13 green under the OLD code too (stash run), so the re-seat only moved the staging into a region both codes accept
  - Rationale: the old staging descended straight through the gun's PLAY diamond and only reached the bottom because contact deaths were stampless; under the ROM order that head correctly dies WITH the player (`:1805-1806`) before arming. The test's intent — a live head at v=8 arms NEWD — is position-orthogonal.
  - Severity: minor
  - Forward impact: none.
- **MOTION's kill granularity: whole-train step, then one contact scan**
  - Spec source: CENTI4.MAC MOTION (`:1281` walk, `:1449-1450 JSR PLAY / BCC 35$`)
  - Spec text: the ROM tests PLAY per segment inside the walk and bails MID-LOOP on a kill — segments after the killer do not move that frame
  - Implementation: stepCentipede moves the whole train, then `playerContactIndex` scans once (descending, matching the walk order for tie-breaks)
  - Rationale: the mid-loop bail is unobservable one frame later (the pause freezes the train), no test pins it, and threading a per-segment kill through stepCentipede would fork cp2-4's shipped walker for zero pinned behavior
  - Severity: minor
  - Forward impact: none known; if a future fidelity story pins the mid-frame freeze, the seam is `playerContactIndex` moving inside stepCentipede's loop.
- **stepFleaExplosion's revival draw moved earlier in the frame (replay-cursor note)**
  - Spec source: src/core/sim.ts header — "the ordering between [rng] consumers is part of the replay contract"
  - Spec text: adding or reordering a draw shifts every later one
  - Implementation: the slot-12 explosion step (which embeds SCORP's revival draw, `:2072-2075`) now runs at the EXPLOD position, BEFORE the spider's draws; previously it ran after them
  - Rationale: the decrement must precede SHOOT (the cp3-2 explosion-frame contract); the embedded revival rides along. No replay is persisted across code versions, and same-seed determinism (what the tests pin) is unaffected.
  - Severity: minor
  - Forward impact: recorded seeds from pre-cp2-15 builds replay differently on frames where both slot 12 revives and the spider draws — none are stored anywhere today.

### Reviewer (audit)

All five deviations audited in the SUPERSEDED context — they now document the cp2-16
reference branch rather than a shipping cp2-15:

- **TEA: slot 12 pinned as SHOT-first** → ✓ ACCEPTED by Reviewer: the ROM derivation is
  sound (three PLAY callers, ANTMV at `:37` after SHOOT `:34`), and the probe run
  against upstream's merged code proves the guard has teeth — upstream fails it.
- **Dev: slow-flea guard corrected (flea stamped 0xFF)** → ✓ ACCEPTED by Reviewer:
  verified firsthand — PLAY's contract preserves X (`:1772-1774`), ANTMV enters with
  `LDX I,12.` (`:107`), PLAYEX stamps `X,MOBJP` (`:1805-1806`). The correction is the
  ROM; the paperwork (separate commit before src changes, Conflict finding) is the
  right shape for a Dev-edited test.
- **Dev: newhd-factory re-seat** → ✓ ACCEPTED by Reviewer: intent preserved
  (position-orthogonal), proven green under BOTH codes (13/13 stash run).
- **Dev: MOTION whole-train step + single contact scan** → ✓ ACCEPTED by Reviewer:
  the mid-loop bail is unobservable one frame later; the descending tie-break matches
  the walk order. Fine granularity for cp2-16 to inherit.
- **Dev: stepFleaExplosion revival draw moved earlier (replay-cursor)** → ✓ ACCEPTED
  by Reviewer: no persisted replays exist; note upstream's implementation explicitly
  chose the opposite trade (no rng-order change) — cp2-16 must reconcile the two
  positions when it lands the stamps on upstream's base.

Setup complete and verified on disk. cp2-15 is a 3-point p2 bug in centipede (workflow tdd):
the sim frame runs SHOOT before PLAY, inverting the ROM mainloop (CENTI4.MAC :33-34 — PLAY via
BUGMV :417 precedes SHOOT), and the SHOOT slot scan does not walk DESCENDING from slot 13
(:2171/:2292-2294), so dual-window frames resolve to the wrong victim and the wrong score.

Key setup facts for TEA (Leeloo):

- **Scope shift since filing:** cp3-2 (flea, e82a4de), cp3-4 (caa3a7b), and cp3-3 (scorpion,
  56826ba) are already merged on develop (HEAD dd2beba, v0.0.5). The "land before cp3-2" window
  is closed — the descending-scan fix must pin spider, flea (slot 12), and scorpion as they
  exist today, not future-proof for them.
- **Bug re-verified 2026-07-27:** sim.ts:322-324 still documents MOVE, SHOOT, MOTION, EXPLOD,
  then PLAY; no develop commit references cp2-15.
- **AC-3 carries a bookkeeping tail:** the two cp3-1 Delivery Findings (same root cause, filed
  non-blocking there) must be marked resolved with the fixing commit.
- Story context: sprint/context/context-story-cp2-15.md (ROM citations transcribed verbatim
  from the epic YAML — treat as byte-verified, do not re-derive).
- Branch `fix/cp2-15-frame-order` created from develop and checked out in centipede/.

Routing: phased tdd → next phase red, owner tea.

## TEA Assessment

**Tests Required:** Yes

**Test Files:**
- `centipede/tests/frame-order.test.ts` — 10 tests: 7 RED + 3 keep-behavior guards
  (commit `45e799e` on `fix/cp2-15-frame-order`)

**Tests Written:** 10 tests covering 3 ACs
**Status:** RED (7 failing, each for its designed reason — audited per-test failure
messages, not just redness). Full suite: **905 tests / 48 files — 7 failed, all in
frame-order.test.ts, zero collateral**; `tsc --noEmit` clean. testing-runner's grand
total (905/48) cross-checked against my own direct `npx vitest run` — no scope
narrowing (the rb4-15 lesson).

### What the suite pins

- **AC-1 (dual-window → the player dies, nothing scores):** spider (PLAY via BUGMV
  `:33`/`:417`) and segment (PLAY via MOTION `:30`/`:1449`) dual-window frames must
  arm PLAYEX (delay `0x30`, playerExplode `0x20`), award ZERO points, stamp the
  killing slot 0xFF (`:1805-1806`), and blank the in-flight shot (`:1807-1808`) — a
  third test isolates the shot-blank with the shot far away, so its only red is the
  missing blank. RED today: the shot wins every one of these frames (+900/+100).
- **AC-1 contrast (guards, green today AND after):** slot 12 resolves AFTER the shot
  (SCORP `:36`/ANTMV `:37` vs SHOOT `:34`) — see the Design Deviation. These two
  guards are the overshoot detectors.
- **AC-2 (descending scan from 13, first match ends it — CT-32):** spider-over-segment
  (+600 band, head survives), scorpion-over-segment with slot 13 parked (+1000, head
  survives — also proves the `:2177-2178` ≥0xF8 skip walks DOWN past a parked slot),
  and a spider-over-scorpion guard (green today). RED today: the segment scan runs
  first and steals both kills for 100.
- **CT-70 (MOTION and EXPLOD precede SHOOT):** a mirror pair — a shot in window only
  of the POST-move head kills; in window only of the PRE-move head misses and the head
  marches on to 0x46 — both halves in one test so neither passes alone. Plus the
  explosion-frame pin: a shot-killed segment holds 0xFF to its kill frame's end and
  steps to 0xFE the NEXT frame (today stepExplosions runs after the hit and eats the
  first frame). This is the same treatment cp3-1/cp3-2 already give the spider/flea.

### Staging discipline (for Dev and the Reviewer)

Every dual-window fixture is **valid under BOTH frame orders** — segment actors sit
2px (one CENTIS step) from the shot's meeting point so pre- AND post-MOTION positions
are inside the ±6 window, the spider is staged at its exact post-BUGMV landing (odd h,
count2 high, empty playfield), and slot 12 is checked pre-move under both orders. So
every red discriminates on ORDER alone, never on geometry. Two asserts in the segment
dual-window test pass today COINCIDENTALLY (seg pic 0xFE, shot dead — today via the
shot kill, post-fix via PLAY+EXPLOD) — they are contract pins, not discriminators.

### Sibling survey — no re-seats needed

Full-suite run confirms zero collateral. Surveyed the order-sensitive suites:
sim-assembly's and bonus-lives' kill fixtures stage the shot at the meeting point with
the seg's ±2 step inside the ±6 window (survive the reorder); spider.test's death-chain
(:848) and comeback (:1238) tests assert order-neutral observables; attract-demo pins
are coarse (`some`/self-replay-equality); death-restor/flea/scorpion contact tests are
unit-level or shot-free. **If any sibling reddens during GREEN it is a real regression,
not a stale staging — do not re-seat it, fix the code.**

### Fix surface (routing, not prescription)

The reorder lands in `stepPlayingFrame` (src/core/sim.ts): MOTION (+ per-segment PLAY
that identifies the killer), EXPLOD, MOVE, BUGMV (+ spider PLAY), SHOOT (shot move +
mushroom priority + the 13→0 scan with the ≥0xF8 skip), NEWHD, SCORP, ANTMV (+ flea
PLAY), wave-clear, RESTOR. `checkPlayerContact`'s bare boolean cannot stamp the killer
— the contact seam needs to say WHO. PLAYEX must blank the shot. AC-3's bookkeeping:
mark the two cp3-1 findings resolved in `sprint/archive/cp3-1-session.md` (located —
see Delivery Findings; the third finding there stays open, out of scope).

### Rule Coverage

| Rule (lang-review/typescript.md) | How it's honoured | Status |
|---|---|---|
| #1 type-safety escapes | zero casts in the new suite — typed `Partial<Spider>`/`Partial<Flea>` builders, typed `IDLE: InputCounts` (the cp3-4 NaN lesson) | n/a-clean |
| #8 test quality | no `as any`, no vacuous asserts; every `expect` carries a message naming its ROM line; boolean asserts wrap real predicates | self-checked |
| #4 null/undefined | no `||`-on-nullable; fixtures build complete objects, no optional-field traps | n/a-clean |
| others (#2,3,5,6,7,9-13) | no source files changed in RED; checklist re-runs at GREEN on Dev's diff | deferred to GREEN |

**Self-check:** 0 vacuous tests found. The 3 pre-GREEN passes are exactly the 3
designed guards — audited the pass list, not just the fail count.

**Handoff:** To Dev (Korben Dallas) for implementation.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `centipede/src/core/sim.ts` — stepPlayingFrame rewritten to the ROM mainloop order
  (CT-70): MOTION+PLAY, EXPLOD, MOVE, BUGMV+PLAY, SHOOT (descending 13→0 scan, tail
  kill-timer), SCORP (ungated), ANTMV+PLAY, single PLAYEX return that blanks the shot.
  BUGMV/ANTMV gated on the live gun per the ROM's own heads (`:289-291`, `:50-52`).
- `centipede/src/core/centipede.ts` — new `playerContactIndex` (MOTION's descending
  walk, returns the killing slot); `checkPlayerContact`'s segment half delegates to it
  so the PLAY diamond still lives in exactly one place (the cp3-1 source-scan guard
  stays satisfied — one PLAYEX construction in sim.ts).
- `centipede/tests/frame-order.test.ts` — slow-flea guard corrected (deviation logged).
- `centipede/tests/newhd-factory.test.ts` — lone-head staging re-seated (deviation logged).
- `centipede/docs/rom-study/claims/09-centipede-train.json` — CT-70 note `:1447`→`:1449`
  (TEA's finding), 2-line diff, citations gate green.

**Tests:** 905/905 passing (GREEN) — was 8 failed (7 RED + 1 corrected guard); zero
remaining collateral; `tsc --noEmit` clean; citations gate 26/26.
**Branch:** `fix/cp2-15-frame-order` (pushed; commits `45e799e` RED, `253d1e3` test
correction, `7babb64` implementation).

**AC status:** AC-1 ✓ (dual-window kills the player, stamps the killer, blanks the
shot, scores nothing — spider AND segments; slot 12's ROM asymmetry guarded). AC-2 ✓
(scan descends from 13, first match ends it, parked slots skipped). AC-3 ✓ suite-wise
(every inherited test re-pinned or re-seated with proof, none weakened; the two cp3-1
findings' resolution annotations in `sprint/archive/cp3-1-session.md` are the finish
ceremony's bookkeeping — SM's step, commit hash now exists: `7babb64`).

**Handoff:** Per the tdd workflow — next phase owner via the gate (review).

## Reviewer Assessment

**Verdict:** SUPERSEDED — a sibling checkout merged cp2-15 mid-flight; upstream wins,
this branch's unique delta re-scopes onto cp2-16.

**Discovery (the sidecar's mandatory first step):** `git fetch` + grep for the story id
found `156430e "cp2-15: frame order — PLAY before SHOOT, SHOOT descends from slot 13
(#35)"` on centipede `origin/develop`, and the orchestrator's `origin/main` carries the
full finish ceremony: `5506924` (complete cp2-15), `ed788a9` (cp3-1 findings marked
resolved by their commit `fe9a9aa`), `02a65ad` (follow-up **cp2-16** filed: "PLAYEX
collider stamp + shot blank", 2 pts, p3, backlog). The story is DONE upstream; this
session's review must not ship a second cp2-15. No full subagent fan-out was run —
reviewing a branch that will not merge as-is is waste; the delta gets its own TDD cycle
in cp2-16 where review independence applies to the code that actually lands.

**Implementation comparison (this branch `7babb64` vs upstream `156430e`):**

Both implement: the mainloop reorder (MOTION/EXPLOD before SHOOT), PLAY-before-SHOOT
for segments and spider, the descending 13→12→segments scan with first-match-wins, and
a shot-blank on gun contact. Upstream additionally repaired two `flea.test.ts`
stagings (malformed InputCounts) and added dossier claims CT-102/103/104.

**Probe evidence (my frame-order suite run against upstream's merged tree, worktree of
`156430e`): 6/10 pass, 4 fail —**

1. `expected 20 to be 255` — upstream's spider stays WALKING after killing the player;
   no PLAYEX stamp. (cp2-16's declared scope.)
2. `expected +0 to be 254` — upstream's killing segment survives contact unstamped.
   (cp2-16's declared scope.)
3. `expected +0 to be 200` — **fast-flea dual-window: upstream kills the PLAYER where
   the ROM kills the FLEA for 200.** Root cause: upstream's single pre-SHOOT
   `checkPlayerContact(segs, player, spider, state.flea)` includes slot 12, but the
   ROM's slot-12 PLAY lives inside ANTMV (`:107-108`), mainloop `:37` — AFTER SHOOT
   (`:34`) — and ANTMV's head (`:50-52`) gates it off once the flea is dead. On the
   cabinet, SHOOT saves the gun by killing the flea first.
4. `expected 1 to be 4` — slow-flea dual-window: upstream's pre-check blanks the shot
   before the scan, so the flea is never sped up (the ROM's no-score first hit,
   `:2223`). Same root cause as 3.

Items 3-4 are OUTSIDE cp2-16's declared scope and are defended by an upstream comment
("Do not 'fix' this by passing the post-step flea") that cites OVRLAP's pre-step
phasing — correct for BUGMV's reading of slot 12, wrong for ANTMV's own PLAY, which
runs after ANTMV's move (`27$: STA ANTV` at `:105`, `JSR PLAY` at `:108`). cp2-16's
scope should be amended to cover the slot-12 phasing, or a separate story filed.

**Also carried by this branch, not upstream:** the ROM's death-frame gates (BUGMV
`:289-291` and ANTMV `:50-52` skip once the gun is dead — upstream deliberately keeps
every stepper running for replay stability and says so); the `playerContactIndex`
killer-identification seam; the newhd-factory re-seat (only needed once stamps exist);
the CT-70 note fix `:1447`→`:1449` — upstream's new claims propagate the wrong line
(their dossier now has FOUR `1447` occurrences).

**Disposition (the tp1-9 precedent):** upstream wins the API — do NOT hand-merge two
implementations. Branch `fix/cp2-15-frame-order` (pushed to origin) becomes the
REFERENCE for cp2-16: its stamp implementation, its T6a/T6b ROM-asymmetry guards, the
probe results above, and the death-frame gates are the seed. The two flea-phasing
failures are new information upstream does not have — they must reach cp2-16's scope.

**Handoff:** To SM (Ruby Rhod) for reconciliation — sync the orchestrator and
centipede develop, archive this session as superseded (the `tp1-9-session-superseded-a1`
naming precedent), seed cp2-16 with this assessment, and close cp2-15 locally WITHOUT a
second finish ceremony (the upstream archive already exists; finish is not idempotent).