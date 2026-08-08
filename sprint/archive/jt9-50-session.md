---
story_id: "jt9-50"
jira_key: "jt9-50"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-50: joust bounder BOUP cliff-above diverts to BOLEV: model the blocked-climb level flight (no BOUP3)

## Story Details
- **ID:** jt9-50
- **Jira Key:** jt9-50
- **Repos:** arcade
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/jt9-50-bounder-boup-cliff-diverts-bolev
- **Branch Strategy:** gitflow (feat/jt9-50-bounder-boup-cliff-diverts-bolev)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-07T11:47:50Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-07T11:07:04Z | 2026-08-07T11:10:54Z | 3m 50s |
| red | 2026-08-07T11:10:54Z | 2026-08-07T11:23:57Z | 13m 3s |
| green | 2026-08-07T11:23:57Z | 2026-08-07T11:42:24Z | 18m 27s |
| review | 2026-08-07T11:42:24Z | 2026-08-07T11:47:50Z | 5m 26s |
| finish | 2026-08-07T11:47:50Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Improvement** (non-blocking): jt9-23's `climb-prep-wiring.test.ts` F3 (line 238-247) carries the
  comment "the cliff does not change the bounder at all" and stages the bounder at `velY = 0`. That
  comment becomes FALSE when GREEN lands — jt9-50 DOES change the bounder over a cliff, just not at
  `velY = 0` (where BOLEV and the blind climb both flap). F3's ASSERTIONS stay green (velY=0 cannot
  see the divert; that is why the RED here uses velY<0), so nothing breaks, but the prose is stale.
  When Dev lands GREEN, update F3's comment to "the cliff does not change the bounder AT velY=0 (BOLEV
  and the climb both flap there); the divert is observable only while rising — see
  climb-prep-bounder.test.ts". Affects `plugins/joust/tests/climb-prep-wiring.test.ts:238-247`.
  *Found by TEA during RED.* (comment_analyzer is disabled in this project's reviewer_subagents, so
  this prose gap has no specialist — flagging it here.)
  → **RESOLVED by Dev + verified by Reviewer:** F3's comment/messages were rewritten
  (`climb-prep-wiring.test.ts:238-253`) to say the bare-`pursue` flap law is unchanged over a cliff
  and the divert lives at the decide (visible only while rising). Accurate — the bare `boundr()` path
  does not run `seekWake`, so it genuinely has no divert. Confirmed green.

### Reviewer (code review)
- No upstream findings. The mutation battery (M1-M4, all KILLED) and the `rng`-bit-identical proof
  leave nothing unaddressed; the bounder BOLEV divert's interval-LENGTH is covered by the existing
  BOLEV interval tests (it is not a new hold state, so jt9-51's hunter/shadow follow-up does not
  extend here). *Reviewer, jt9-50.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **No spec deviation.** The fix implements exactly what the context/TEA specified: a
  cliff one DYLEN above diverts the bounder to plain BOLEV level flight, not the
  B2UP3/SHUP3 hold. Recorded here only because the placement and the re-baseline blast
  radius are worth the Reviewer's attention (both are faithful, not shortcuts).
  - **Placement:** the divert lives at the up-seek DECIDE (`seekWake`, enemy.ts ~:1384),
    NOT in the per-wake flap law (`pursue` :786) where jt9-23 put the hunter's hold. This
    is because the ROM behaviours genuinely differ: BOUP `BNE BOLEV` (:3850) changes the
    ROUTE (abandons the climb for level flight, before arming BOUPDI), whereas B2UP3/SHUP3
    only override the flap law within the up-seek. Arming the BOLEV level interval makes
    `currentRoute` return `'level'` for every downstream consumer (the `pjoy.kind ===
    'interval'` rule), so one change flows to both the wing cadence and the brain, and the
    bare `pursue`/`boundr` path is untouched (F3 stays green).
  - **Re-baseline (six sibling fingerprints), each RE-MEASURED not guessed:** bounders are
    the wave-1 staple, so diverting them under platforms reshapes seeded replays.
    dumb-wingbeat AC6 (enemy-wing-down beef 302→143, 0x2468 370→325, face 159→164; knight
    cues 154 UNMOVED, floors hold); audio-events AC3 beef-2400 fingerprint (scores/lives/
    procs move, `rng` bit-identical) and AC2 0xface wave-advance frame (4182→4047);
    audio-thud/audio-flap beef digests (only the bounder `enemy#256` row moves — players
    and the other two enemies bit-identical); audio-transporter-split 0xbeef knight-2
    re-entry (2110→2103). Each carries a jt9-50 note. **The RNG cursor is bit-identical
    through the change** (audio-events AC3, 2_006_456_271) — the decisive proof no draw was
    added and this is a faithful behaviour change.

### Reviewer (audit)
- **Dev's "No spec deviation" + placement + re-baseline entry** → ✓ ACCEPTED by Reviewer. The
  seekWake placement is the correct faithful model (BOUP `BNE BOLEV` is a ROUTE change to level, not
  a hold flap-law override — the ROM behaviours genuinely differ, and there is no BOUP3). The six
  re-baselines are all RE-MEASURED with the `rng`-bit-identical proof (2_006_456_271 unmoved), not
  nudged. No undocumented deviations found: the diff touches only the bounder up-decide path and the
  fingerprints downstream of it.

## Tea Assessment

**RED delivered — one new test file, exactly one failing test.**
`plugins/joust/tests/climb-prep-bounder.test.ts` (behaviour + green source oracle).

**RED evidence (verified directly):**
- `npx vitest run --project joust` → **3024 passed, 1 failed (149 files)** — the single failure is
  the story's RED: `RED — with a cliff ONE DYLEN ABOVE, a rising bounder flies BOLEV level` expected
  `0`, received `3` (the blind climb flaps 3× up into the cliff).
- `npm run lint` (tsc --noEmit) → clean.
- All 6 supporting tests pass: FIXTURE PREMISE (geometry), the CLEAR-climb CONTROL, the falling-slow
  GUARD, and the 3 source-oracle assertions.

**The distinguishing input — READ THIS, it is the whole trick.** The bounder's blind climb and BOLEV
level flight are INDISTINGUISHABLE at `velY = 0`: both flap when `velY >= 0`. They diverge only while
RISING (`velY < 0`): the up-seek wing cadence is not velY-gated for the bounder (`BOUP1` flaps at
expiry unconditionally; `wingRows.upVy = null`), so a blind climb keeps flapping, while BOLEV glides.
The RED stages a RISING bounder over a cliff (`velY = -0x40`) and asserts 0 flaps. This is also why
jt9-23's F3 (a `velY = 0` bare-call control) stays green — see the Delivery Finding above.

**What GREEN looks like (implementation guidance, not a spec — Dev owns the design):**
- At the bounder up-seek DECIDE, when `route === 'up'` and `cliffBlocksClimb(enemy)` is true, divert
  to **plain BOLEV level flight** — NOT the B2UP3/SHUP3 fall-fast hold. Concretely: the wake should
  land on the LEVEL route (no wing cadence armed; the interval/BOLEV1↔BOLEV2 glide law), so `flap iff
  velY >= 0`. The blind up-climb path is `pursue()` line 789 + `wingWake` route `'up'`; the fix is to
  make a `boundr` cliff-above wake resolve as level instead.
- **Reuse `cliffBlocksClimb` as-is.** The oracle proves `DYLEN == B2YLEN == SHYLEN == $14-6`, so the
  existing `CLIMB_PREP_YLEN` (`0x14-6`) is already the correct offset — no new bounder constant.
- **Do NOT touch jt9-23's `b2undr` climb-prep gate (`pursue` line 786) or `shadow()`'s hold.** The
  bounder gets its OWN path (level divert), not the hold. The GUARD test reddens if you give the
  bounder the B2UP3 hold (it would glide at `velY = 0x20`, but BOLEV must flap there).
- Pure core boundary: the change is in `plugins/joust/src/core/enemy.ts`; keep it deterministic and
  free of `window.`/`document.` (the purity scanner reads comment text too).
- Cite the ROM line(s) with radix on any new/changed constant, per the file's convention.

### Rule Coverage (TypeScript lang-review checklist)
- **#15 (source-text token vs CLAIM):** the oracle asserts the MECHANISM (`ANDA BCKYTB-DYLEN,Y` →
  `BNE BOLEV`), and the "no BOUP3" search is made non-vacuous by also asserting B2UP3/SHUP3 DO exist —
  the search can find a label when one is there.
- **#26 (all-local assertion terms):** behaviour reads `stepEnemyDetailed(...).prevFlapHeld` (code
  under test) against the ROM background tables (`BCK_X_TABLE`/`BCK_Y_TABLE`); the oracle reads the
  vendored `.SRC`. No assertion is arithmetic about test-local values.
- **Non-vacuity (TEA critical):** every test asserts a concrete value; the CLEAR-climb CONTROL proves
  the RISING sign does not trivially kill all flaps, and the fixture genuinely climbs when unobstructed.
- **Purity / citation rules:** enforced against the code Dev will write — the oracle sets the citation
  bar (BOUP→BOLEV, `:3846-3850`) and the finding names the pure-core boundary.

**Handoff:** to Loki Silvertongue (Dev) for GREEN.

## Dev Assessment

**GREEN delivered.** Full joust suite **3025 passed (149 files)**, orchestrator **408
pass / 0 fail**, lint (tsc --noEmit) clean.

**The fix (one production edit):** `plugins/joust/src/core/enemy.ts`, in `seekWake`'s
up-seek decide — a `boundr` with `cliffBlocksClimb(enemy)` true falls through to the
BOLEV level-interval arm instead of arming the up-seek (`seek: {mode:'up'}`). Faithful
to `BOUNUP → BOUP → BNE BOLEV` (JOUSTRV4.SRC:3844-3850): the cliff sample sits at the
LONG up-decide (route==='up' == delta ≤ BOUPRG), before BOUPDI would arm, and diverts
to plain level flight. Reused `cliffBlocksClimb`/`CLIMB_PREP_YLEN` unchanged (the ORACLE
proved DYLEN==B2YLEN==$14-6). Bounder-gated; the `b2undr` hold (:786) and `shadow()` are
untouched. See the Dev deviation note above for why this is placed at the decide, not in
`pursue`.

**How I verified this is faithful, not an over-fire (the 53% flap-drop scare):**
1. Measured the cliff-above density over the whole BCK map: 11% overall, concentrated in
   real bands 14px BELOW the arena platforms (y=0x6d-0x7a, 0x9f-0xb2, 0xbe-0xcb) — exactly
   where bounders up-seek toward players near ledges. `bckMaskAt` is bounds-safe (returns
   0 off-table), so there is no ceiling/OOB spurious hit.
2. The decisive check: **the sim's `rng` cursor is bit-identical** (audio-events AC3,
   2_006_456_271) — a BOLEV divert draws no randomness, so only play-dependent fields move.
   This is the same signature as this fingerprint's seven prior faithful re-baselines.
3. Knight WING cues stay 154/154 across all three dumb-wingbeat seeds (enemy-only change);
   only knight DEATH/re-entry TIMING moves (play-dependent, expected).

**RED tests now green:** `climb-prep-bounder.test.ts` 7/7 (the rising-bounder RED, both
controls, the falling-slow BOLEV-not-hold guard, 3 ROM oracles).

**Reviewer, audit these:** (a) the seekWake placement is the faithful BOUP model vs. a
fidelity-fake — the divert is a route change (BOLEV), not a hold, and there is no BOUP3;
(b) the six re-baselines are all RE-MEASURED (probes deleted) with the `rng`-unmoved proof,
not nudged numbers; (c) `cliffBlocksClimb` reuse is correct (DYLEN==B2YLEN); (d) F3's
updated comment is accurate (the bare-`pursue` path genuinely has no divert). 8 of 9
reviewer subagents are disabled here, so a mutation battery on the seekWake gate is the
right tool.

**Handoff:** to Heimdall (Reviewer).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (joust 3025 pass, orchestrator 408 pass, lint clean; 0 console.log/skip/TODO smells) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — edges covered by my mutation battery (M3/M4 KILLED) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no error paths in a pure decide; N/A |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — assessed test quality myself (non-vacuity controls verified) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — assessed comments/citations myself (F3 comment fix verified, :3850/:786/:970 accurate) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — no new types; a `SeekRoute` route change only |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — pure sim, no auth/IO/tenant surface; N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — the edit is minimal (one gated fall-through) |
| 9 | reviewer-rule-checker | No | Skipped | disabled | Disabled via settings — rule compliance done by hand below |

**All received:** Yes (1 enabled returned; 8 disabled via `workflow.reviewer_subagents`)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

Because 8 of 9 specialists are disabled here, I read the diff myself and ran a MUTATION
BATTERY against the `seekWake` divert (patch → run → revert; enemy.ts is tracked).

### Mutation battery (the coverage proof) — all four KILLED
- **M1** `brain === 'boundr'` → `!== 'boundr'`: **KILLED** (8 failures) — the brain gate is pinned.
- **M2** drop the brain guard (`cliffAbove = cliffBlocksClimb(enemy)`, divert hunter too):
  **KILLED** by jt9-23's hunter B2UP3 test — a hunter diverted to BOLEV FLAPS at velY=0 (the
  freeze harness), where the correct hold GLIDES. So "bounder-only" is genuinely covered: the
  bounder's level-flap law is distinguishable from the hunter's hold.
- **M3** `cliffBlocksClimb(enemy)` → `false` (never divert): **KILLED** by climb-prep-bounder's RED.
- **M4** `!cliffAbove` → `cliffAbove` (invert): **KILLED** by the RED + the CLEAR-climb control.

### Observations (≥5)
- **[VERIFIED]** Faithful placement — the divert is at the up-seek DECIDE (`enemy.ts:1384-1394`),
  inside `route === 'up'` (== delta ≤ BOUPRG == BOUP's reach) and BEFORE arming BOUPDI, matching
  `BOUNUP → BOUP → BNE BOLEV` (JOUSTRV4.SRC:3844-3850; :3850 confirmed `BNE BOLEV`). Arming the
  level interval makes `currentRoute` return `'level'` (the `pjoy.kind==='interval'` rule at :765),
  so one edit flows to both the wing cadence (`withWingCadence` :1814 returns unchanged on level)
  and the brain. M3/M4 KILLED confirm it is exercised.
- **[VERIFIED]** `cliffBlocksClimb` reuse is correct — the ORACLE proves `DYLEN==B2YLEN==SHYLEN==$14-6`,
  so `CLIMB_PREP_YLEN` (0x14-6, :614) is the right offset; `bckMaskAt` (:1137-1141) is bounds-safe
  (returns 0 off-table), so there is NO ceiling/OOB spurious divert. Density measured: 11% overall,
  concentrated in real bands 14px below the arena platforms — not a pathological over-fire.
- **[VERIFIED]** The six re-baselines are faithful, not masking — the sim's `rng` cursor is
  bit-identical (audio-events AC3, 2_006_456_271); only play-dependent fields (scores/lives/procs/
  wave-frame/enemy trajectory) move, and each value was re-measured (probes deleted, suite green).
  Knight WING cues stay 154/154 across all three dumb-wingbeat seeds (enemy-only change); only knight
  DEATH/re-entry TIMING moved (2110→2103), which is legitimate downstream play.
- **[VERIFIED]** Pure core boundary — the change is a deterministic function of enemy state; no
  `window.`/`document.` in the added text (grep clean; purity.test.ts green).
- **[VERIFIED]** Test non-vacuity — climb-prep-bounder's two controls (a rising CLEAR climb flaps; a
  falling-slow bounder over a cliff flaps) prove the RED is the cliff suppressing the climb, not a
  dead fixture; the "no BOUP3" oracle is made non-vacuous by asserting B2UP3/SHUP3 DO exist.
- **[VERIFIED]** Citation self-refs `:786` (b2undr gate) / `:970` (shadow gate) are accurate enemy.ts
  lines (unshifted — my insertion is at :1384, after them); comment-line-refs.test.ts green.
- **[LOW]** The comment's bare `:786/:970` are enemy.ts self-refs while the file's ROM convention is
  `JOUSTRV4.SRC:NNNN`; mildly terse but consistent with sibling jt9-* self-refs. Not worth a rework.

### Rule Compliance
- **Pure-core boundary (jt1-7 purity):** the divert, `cliffBlocksClimb`, and the constants are pure
  functions of enemy state — COMPLIANT (purity.test.ts green).
- **Cited constants carry `JOUSTRV4.SRC:line` + radix:** no NEW constant added (reuses
  `CLIMB_PREP_YLEN`); the new comment cites `:3846-3850` and the DYLEN=$14-6 radix — COMPLIANT.
- **Citation accuracy (jt8-6 class):** the comment's mechanism claim (BOUP samples one DYLEN above,
  `BNE BOLEV`, no BOUP3) is a MEASUREMENT in the oracle, not a paraphrase — COMPLIANT.
- **TS lang-review #15 (token vs claim) / #26 (all-local terms):** the oracle asserts the mechanism
  with a non-vacuity control; the behaviour reads code-under-test against the ROM tables — COMPLIANT.

### Devil's Advocate
Could the divert strand bounders flying level forever under a wide ledge? No: the divert is at the
DECIDE, re-evaluated when the BOLETM interval expires, and a bounder moves horizontally (dir=facing)
out from under the ledge, at which point `cliffBlocksClimb` clears and route→up resumes the climb —
the same self-correction the ROM has. Could it draw RNG differently and desync replays? The decisive
evidence says no: `rng` is bit-identical through the change (a level-vs-climb route decision consumes
no randomness), so the fingerprint moves are pure trajectory, not stream drift. Could a re-baseline
hide a real regression? Each was re-measured, and the invariants that WOULD expose a bug held: `rng`
unmoved, knight wing cues 154 unmoved, non-vacuity floors (>50) intact, and in the point digests only
the single BOUNDER `enemy#256` row moved while both players and the other two enemies stayed
bit-identical. Could the divert fire where the ROM would not? It is gated to `route === 'up'` (long
up-seek, BOUP's exact reach), `brain === 'boundr'` (M1/M2 pin this), and a solid `BCKYTB-DYLEN` sample
(bounds-safe, M3/M4 pin this) — every axis of the ROM condition is present and mutation-covered. Could
a confused maintainer collapse the bounder into the hunter/shadow hold? The GUARD test (falling-slow
over a cliff must FLAP, not glide) reddens on exactly that, complementing jt9-23's F3. I find no
Critical or High issue.

**Data flow traced:** enemy state (posX/posY, brain, route) → `seekWake` up-decide → `cliffBlocksClimb`
sample of `BCKYTB-DYLEN` → on hit, BOLEV level-interval arm → `currentRoute`='level' → BOLEV1 flap law
(`velY >= 0`). Safe: pure, deterministic, no external input.
**Pattern observed:** faithful ROM port with a green source-oracle pinning the mechanism — enemy.ts:1384.
**Error handling:** N/A (pure sim; `bckMaskAt` bounds-guards off-table samples to 0).
**Handoff:** To SM for finish-story.

## Sm Assessment

**Setup outcome:** clean. Story jt9-50 set up for the Joust bounder BOUP cliff-above
divert (BOLEV). Sibling probes clean at setup (no remote branch, no sibling sessions);
claim pushed on `feat/jt9-50-bounder-boup-cliff-diverts-bolev` and stamped in_progress.

**ROM citation verified before setup (not stale).** I opened
`reference/williams-source/joust/JOUSTRV4.SRC` and confirmed the story's citation
verbatim: BOUP at :3846 samples the collision map one DYLEN above (BCKXTB,X AND
BCKYTB-DYLEN,Y, :3848-3849); on a hit BNE BOLEV (:3850) diverts to level flight; the
clear branch loads BOUPDI and falls to BOUP1A (:3851-3853). "no BOUP3" = the bounder
has no separate up-climb subroutine, distinct from hunter B2UP3 / shadow SHUP3 (jt9-23).
The full listing is captured in the context file's "ROM ground truth" section.

**Acceptance criteria:** `null` in the epic YAML. Per the tdd RED phase, TEA derives
them from the ROM mechanism (documented in the context: blocked cell above → level
flight; clear cell → climb). I did NOT fabricate ACs into the YAML.

**Setup-subagent corrections applied:** sm-setup omitted the Repos field (added: arcade)
and left status at backlog (stamped in_progress). The generated context was a bare stub
— I enriched it with the verified ROM ground truth and technical approach so TEA has a
real primary input rather than the title line alone. Bounder logic is pure sim →
`plugins/joust/src/core/` (core boundary rule).

**Handoff:** to TEA (Tyr One-Handed) for the RED phase.