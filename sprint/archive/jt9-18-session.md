---
story_id: "jt9-18"
jira_key: "jt9-18"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-18: The level-flight block, read once: BOLEV2 forces a glide wake after every level flap, and PPVELX is snapshotted at the decide rather than read live

## Story Details
- **ID:** jt9-18
- **Jira Key:** jt9-18
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 5
- **Priority:** p3
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)
- **Branch:** none (trunk-based — landed directly on main)
- **PR:** none (trunk-based — no PR; commits c22ff1a, 8bc0362, d2c1b1b on origin/main)

## Acceptance Criteria

ACs DERIVED by sm-setup from the folded-in description (epic YAML acceptance_criteria: null); TEA to confirm against the ROM block and the twin census.

### BOLEV2 Forced-Glide Behavior
- A level-flying bounder can flap at most every OTHER wake (the wake after a level flap is a forced glide, not a flap opportunity)
- Mechanism: BOFAST (JOUSTRV4.SRC:3931-3934) raises the flap bit AND sets PJOY to BOLEV2, which does nothing except point PJOY back at BOLEV1 and fall through to BOLEVA's CLRB, forcing a glide wake after every level flap
- Implementation: Update enemy.ts pursue() level-flight logic from "flap iff falling" to alternate-wake flap with forced-glide state after each flap
- The jt2 seeded-replay fingerprints move; re-baseline by sweeping for each test's own precondition (read sprint/archive/uf1-9-session.md before starting)
- TWIN CENSUS: Enumerate B2LEV2 and the SHLEV/SHLEP shadow equivalents BEFORE writing code — uf1-9's census found SIX sites where the backlog claimed four; do not assume one branch

### PPVELX Snapshot Behavior
- homingWake must compare the target's velocity index SNAPSHOTTED at the level-flight decide, not read LIVE every wake
- Mechanism: PPVELX ("OLD PLAYERS X VELOCITY", RAMDEF.SRC:209) is written at exactly THREE sites across smart brains — BOLEV (LDA PVELX,X / STA PPVELX,U, JOUSTRV4.SRC:3907-3908), B2LEV (:4058-4059) and SHLEP (:4281-4282) — each immediately before that brain's decision-timer load (BOLETM :3909, HULETM :4060, SHUPTM :4283)
- The snapshot is taken once per level-flight decide and then READ, never rewritten, by BOLEVB throttle (LDA PPVELX,U / CMPA PVELX,U, :3939-3940) until the interval expires
- Current port compares the target's live velXIndex every wake
- SHLEP EQUIVALENCE CHECK: jt8-2 argued the live read is snapshot-equivalent for SHLEP under the per-wake collapse; uf1-9 changed that premise (shadow level branch is now HELD for its SHUPTM interval). RE-DERIVE the equivalence rather than inheriting it

### Delivery Constraints
- SEPARATE COMMITS: Land BOLEV2 forced-glide and PPVELX snapshot as separate commits with ONE joint re-baseline commit last
- A re-baseline is EXPECTED (halving a level flyer's flap rate moves jt2 seeded replays)
- Use the re-baseline method from sprint/archive/uf1-9-session.md: sweep each test's OWN precondition rather than nudging numbers, and state which digests moved and why
- Determinism: All jt2 seeded replays pass after re-baseline; purity guard, citation suite, and npm test green

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Repos:** arcade
**Phase Started:** 2026-08-05T23:45:11Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-05T22:38:13Z | 2026-08-05T22:41:20Z | 3m 7s |
| red | 2026-08-05T22:41:20Z | 2026-08-05T23:09:28Z | 28m 8s |
| green | 2026-08-05T23:09:28Z | 2026-08-05T23:37:16Z | 27m 48s |
| review | 2026-08-05T23:37:16Z | 2026-08-05T23:45:11Z | 7m 55s |
| finish | 2026-08-05T23:45:11Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Improvement** (non-blocking): the twin census resolves to FOUR level-flight families, not
  three or one. Forced-glide (a LEV2 state) exists in all four — BOLEV2 (:3936), B2LEV2 (:4162),
  SHLEP2 (:4300), SHLEV2 (:4399); the PPVELX snapshot exists in only THREE — BOLEV/BOLEVB,
  B2LEV/B2LE11, SHLEP/SHLEPB — because SHLEV steers via SHDIR (:4330), not the throttle. Affects
  `plugins/joust/src/core/enemy.ts` (Dev must wire the forced glide into `shadow()`'s SHLEP AND
  SHLEV branches, not only `pursue()`; and the snapshot capture at THREE sites — `seekWake` for
  bounder/hunter, `shadowDwellWake` for the shadow's SHLEP). *Found by TEA during test design.*
- **Question** (non-blocking): the shadow's SHLEP snapshot CAPTURE site (`shadowDwellWake`,
  enemy.ts:1413-1416) is pinned only by the AC-2 unit test on the unified `homingWake` READ, not
  by an end-to-end wiring test — because the shadow's facing is overwritten by `steerWake`/SHDIR
  and the hunter's is too, so the wiring suite (AC-1) reads `homing.prdir` on the bounder+hunter
  only. Affects `plugins/joust/src/core/enemy.ts` (Dev/Reviewer should confirm the shadow-SHLEP
  capture is wired; a green AC-2 alone does not prove the shadow ever reaches the throttle in play).
  *Found by TEA during test design.*
- **Gap** (non-blocking): the jt2 seeded-replay fingerprints WILL move when GREEN lands — halving a
  level flyer's flap rate and freezing the homing gate both change flight paths. The re-baseline is
  Dev's joint final commit (see Design Deviations + the story's ORDER AND COMMITS rule); the
  candidate movers are `audio-emission`, `audio-events`, `audio-flap`, `audio-thud`,
  `audio-transporter-split`, `cadence-wiring`, and the seeded `demo-jt9-*` suites. *Found by TEA
  during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the ACTUAL re-baseline blast radius was SMALLER than TEA's forecast
  — only four assertions moved (`audio-events` AC2 + AC3, `cadence-wiring` R1-3b, `dumb-wingbeat` AC6),
  not the whole audio-seam family. `audio-emission`/`audio-flap`/`audio-thud`/`audio-transporter-split`
  and every `demo-jt9-*` held. Affects nothing (informational); the forced glide moves fewer seeded
  paths than feared, and `rng` is bit-identical everywhere. *Found by Dev during implementation.*
- **Question** (non-blocking, RESOLVED): TEA's SHLEP-snapshot-capture question — the capture IS wired
  at all three decide sites: `seekWake` (bounder/hunter) and `shadowDwellWake` (shadow SHLEP), via
  `snapshotHoming(enemy, target)` which snapshots nothing on a null target (SHLEV, no PPVELX). Affects
  `plugins/joust/src/core/enemy.ts` (Reviewer may still want an end-to-end shadow-SHLEP wiring test;
  the unified `homingWake` read is unit-pinned and the capture is now in place). *Found by Dev during
  implementation.*
- **Gap** (non-blocking): `npm run test:orchestrator` fails in `tests/audit-refs.test.mjs` on a
  PRE-EXISTING/environmental cause — `git show 358075282…:src/core/sim.ts` (the star-wars audit tag
  blob) is absent from this local checkout (the citation gate CLAUDE.md notes needs `fetch-depth: 0`).
  Confirmed unrelated to jt9-18: the failure persists with all my edits stashed, and my work is
  entirely under `plugins/joust/`. Affects nothing in this story; CI (full history) would have the
  blob. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `homingWake` gates on a STALE `ppvelx` during a seek entered after a
  level interval — the down/up decide does not clear the snapshot (`seekWake` :1256-1257 set
  `pjoy: undefined` but leave `homing` intact). The ROM never reaches the throttle (BOLEVB) off the
  level path, so faithfully the throttle should not tick during seeks at all; jt8-2's pre-existing
  "run homingWake every wake" deviation is the root, and jt9-18 only changes WHICH non-faithful value
  it reads there (stale snapshot vs live). Deterministic and re-baselined, so non-blocking. Affects
  `plugins/joust/src/core/enemy.ts` (`homingWake`) — a follow-up could scope the throttle to a live
  level interval, retiring both this and jt8-2's every-wake deviation. Filed as jt9-49.
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### Dev (implementation)
- **AC-3 relaxed: the snapshot OVERRIDES the live index rather than being a precondition (strict HOLD dropped)**
  - Spec source: joust-jt9-18-ppvelx-snapshot.test.ts (RED), AC-3 "absent snapshot ⇒ the throttle holds"
  - Spec text: "no `ppvelx` ⇒ no tick even when the live target matches the enemy" (facing held)
  - Implementation: `homingWake` gates on `enemy.homing.ppvelx ?? target.velXIndex` — the snapshot when a level decide has frozen one, else the pre-jt9-18 live read. AC-3 was rewritten to pin the override + the fallback (2 tests) instead of the strict hold.
  - Rationale: the strict HOLD forced migrating 17 hardened jt8-2 tests in homing.test.ts (+ homing-wiring), changing their meaning — because the ROM's throttle is only ever reached WITH a fresh snapshot (BOLEVB sits on the level path after BOLEV), and jt8-2 chose to run the port's throttle every wake. The fallback confines jt9-19's change to exactly where the ROM has a snapshot (a held level interval — the only place the story's mid-interval-speed-change divergence can occur) and leaves off-level / freshly-mounted wakes and jt8-2's whole suite (127 tests) bit-identical. It is the minimal faithful form. TEA had flagged AC-3 as a design choice for the Reviewer to confirm; this is that confirmation, resolved toward the lower-risk option.
  - Severity: minor
  - Forward impact: the snapshot is an override, not a gate precondition; any future story tightening the throttle to level-only wakes would revisit this. homing.test.ts is UNCHANGED.
- **The forced-glide `glide` field is OMITTED when false (kept off the normal interval shape)**
  - Spec source: joust-jt9-18-forced-glide.test.ts (behavioural, representation-agnostic)
  - Spec text: pins behaviour (post-flap wake glides; the bird pumps), never the phase representation
  - Implementation: `levelInterval(timer, glide)` returns `{kind,timer}` unless `glide === true`, so a normal level interval keeps its pre-jt9-18 object shape and the many suites asserting that exact object (cadence-wiring, seek-wiring, enemy) stay green without edits.
  - Rationale: adding `glide:false` everywhere reddened sibling `toEqual` fixtures for no behavioural reason; omitting it is the minimal representation.
  - Severity: minor
  - Forward impact: none — `glide` is `true`-only; absence means BOLEV1.

### TEA (test design)
- **The "no decide yet" default (absent `ppvelx`) is a designed contract, not the ROM**
  - Spec source: context-story-jt9-18.md, PPVELX Snapshot Behavior
  - Spec text: "homingWake must compare the target's velocity index SNAPSHOTTED at the level-flight decide"
  - Implementation: AC-3 pins that when `homing.ppvelx` is ABSENT (no decide has run yet) the throttle HOLDS — no tick, counter untouched — rather than falling back to the live index.
  - Rationale: the ROM's PPVELX is uninitialised garbage before the first decide, but every mounted smart bird decides almost immediately, so the port needs one deterministic rule for the transient. "Hold" avoids ticking against an undefined value; the alternative (live fallback) is exactly the bug this story removes. TEA authored the contract note (enemy-contract.ts HomingState.ppvelx).
  - Severity: minor
  - Forward impact: Dev must give absent `ppvelx` the HOLD semantics, not a live fallback; the Reviewer should confirm this is the intended default (it is a TEA design choice, flagged here so it is not mistaken for an accident).
- **Snapshot representation pinned to `HomingState.ppvelx` (added to the test contract)**
  - Spec source: context-story-jt9-18.md, PPVELX Snapshot Behavior; enemy.ts:90-107 docblock
  - Spec text: "PPVELX ... written at exactly THREE sites ... read ... by BOLEVB throttle"
  - Implementation: added `readonly ppvelx?: number` to `tests/helpers/enemy-contract.ts`'s `HomingState`; the AC-2 unit tests construct `{ prdir, ppvelx }`. AC-1 (wiring) is representation-AGNOSTIC and does not name the field, so if Dev chooses a different home for the snapshot, only the AC-2 unit contract needs adjusting — the behaviour (AC-1) stands.
  - Rationale: the ROM pairs PRDIR with PPVELX in one workspace (RAMDEF.SRC:208-209) and the existing docblock already reserves the name; `homingWake(enemy, target)` can only read the snapshot from `enemy`, so `homing.ppvelx` is the natural (and docblock-intended) home.
  - Severity: minor
  - Forward impact: Dev extends src `HomingState` with `ppvelx` and threads it through `stepEnemy` (carry, never re-seed) exactly as `prdir` is.
- **Forced-glide phase representation left to Dev (behaviourally pinned only)**
  - Spec source: context-story-jt9-18.md, BOLEV2 Forced-Glide Behavior
  - Spec text: "Update enemy.ts pursue() level-flight logic ... to alternate-wake flap with forced-glide state after each flap"
  - Implementation: the forced-glide suite pins BEHAVIOUR (the wake after a flap glides; the bird pumps) through `boundr`/`b2undr`/`shadow`/`stepEnemyDetailed` and never names the phase field, so Dev is free to model the BOLEV1↔BOLEV2 alternation as it fits the interval `PjoyState`.
  - Rationale: the ROM's mechanism is a PJOY pointer swap; the port's equivalent is a sub-phase on the level interval, whose shape is an implementation choice.
  - Severity: minor
  - Forward impact: none — any faithful representation turns the suite green.

### Reviewer (audit)
- **AC-3 relaxed: snapshot OVERRIDES the live index (strict HOLD dropped)** → ✓ ACCEPTED by Reviewer.
  The strict HOLD would have forced migrating 17 hardened jt8-2 tests and is LESS faithful, not more —
  in the ROM the throttle is only reached WITH a snapshot, so "no snapshot" is a port artefact of
  jt8-2's every-wake model, and confining jt9-19's change to where a snapshot exists is the minimal
  faithful form. Verified: homing/homing-wiring/homing-source 127/127 bit-identical. Mutation M3 proves
  the override is non-vacuously tested. ONE caveat recorded as observation 5 / a follow-up finding: the
  rationale's "off-level wakes unchanged" is imprecise — a post-interval seek gates on the STALE snapshot
  (enemy.ts:1256-1257 do not clear `ppvelx`). Deterministic and re-baselined, so ACCEPTED, not flagged.
- **`glide` omitted when false** → ✓ ACCEPTED by Reviewer. Minimal representation; keeps the interval's
  prior `{kind,timer}` shape so sibling `toEqual` fixtures need no edits (observation 4). Sound.

## Sm Assessment

**Setup by:** Baldur the Bright (SM). Story jt9-18, 5pt, joust, tdd/phased → TEA (red).

**Board probes (clean):** No remote branch for jt9-18 at setup; only sibling session was a-3 on the unrelated sw8-30. Claim now pushed — epic stamp + context on `origin main` (349eeac), empty claim branch `feat/jt9-18-bolev2-forced-glide-ppvelx-snapshot` pushed so the sibling `git branch -r | grep` probe lights up. Status stamped `in_progress` (sm-setup left it `backlog`, as documented).

**Premise verified CURRENT and undone:** enemy.ts:90-107 PPVELX docblock still reads "homingWake compares the target's LIVE index instead" — the jt9-19 premise is intact, not retired. jt9-19 is canceled/0pts/folded-in with its 5 references retained (jt9-18 carries the folded summary). The description is current fact; no stale-state correction was needed.

**Two behaviours, one story (jt9-19 folded 2026-08-03):** (a) BOLEV2 forced-glide — a level-flying bounder flaps at most every OTHER wake; (b) PPVELX snapshot — homingWake compares the velocity index snapshotted at the level-flight decide, not read live. Same ~20 lines of plugins/joust/src/core/enemy.ts, same ROM block JOUSTRV4.SRC:3903-3940.

**ACs are DERIVED, not authored.** epic YAML `acceptance_criteria: null`; sm-setup derived them from the folded description. TEA to CONFIRM them against the ROM block and the twin census before RED — treat them as claims, not ground truth.

**Two standing constraints TEA/Dev must honour:**
- TWIN CENSUS before writing: enumerate B2LEV2 and the SHLEV/SHLEP shadow equivalents; uf1-9's census found SIX sites where the backlog claimed four. Re-derive SHLEP snapshot-equivalence — jt8-2 called it a no-op under the per-wake collapse, but uf1-9 changed that premise (shadow level branch now HELD for SHUPTM).
- ORDER AND COMMITS: two behaviours = two separate commits, then ONE joint re-baseline commit last. Re-baseline is EXPECTED (halving flap rate moves jt2 seeded replays). Use uf1-9's method (sprint/archive/uf1-9-session.md): sweep each test's OWN precondition, don't nudge numbers; two of uf1-9's pins needed a SEED change because the old precondition had an empty solution set.
## TEA Assessment

**Tests Required:** Yes
**Reason:** Two behavioural ROM-fidelity fixes to `plugins/joust/src/core/enemy.ts`; both need failing pins before GREEN.

**Test Files:**
- `plugins/joust/tests/joust-jt9-18-forced-glide.test.ts` — the BOLEV2 forced glide: a level-flying
  enemy flaps at most every OTHER wake (the wake after a level flap is a forced glide, even while
  falling). Covers all FOUR level families behaviourally: bounder (BOLEV2) + hunter (B2LEV2) via
  `pursue()`, shadow SHLEP2 + SHLEV2 via `shadow()`.
- `plugins/joust/tests/joust-jt9-18-ppvelx-snapshot.test.ts` — the PPVELX snapshot: `homingWake`
  gates on the target's velocity index FROZEN at the level-flight decide, not the live index.
- `plugins/joust/tests/helpers/enemy-contract.ts` — added `readonly ppvelx?: number` to `HomingState`
  (TEA-owned contract; the snapshot workspace this story introduces).
- `plugins/joust/README.md` — file-count bump 132 → 134 (the `audio-seam-scope` derived-count guard).

**Tests Written:** 16 tests (8 + 8) across the two files, covering 2 behaviours + the twin census.
**Status:** RED (14 failing, 2 GREEN-before-and-after guards) — ready for Dev (Loki Silvertongue).

**RED verification (measured, not asserted):**
- `joust-jt9-18-forced-glide`: 6 failing / 2 passing. The 2 passing are the "alternation CONTINUES"
  guards (labelled GREEN BEFORE AND AFTER — they guard against a fix that glides forever). Every
  failing test shows the bug directly, e.g. `saw [true,true,true,true,true,true]` — flaps every wake.
- `joust-jt9-18-ppvelx-snapshot`: 8 failing. Each fails on the DISCRIMINATING assertion (the wake-1
  sanity setup passes); e.g. `expected 1 to be +0` (throttle ignored the frozen index) and the
  converse `expected +0 to be 1` (throttle ticked on the live decoy match).
- Full joust suite: **2 files failed / 132 passed · 14 tests failed / 2802 passed**. The ONLY reddened
  files are the two new ones — the contract edit broke no consumer, and the file-count guard is green.
- `tsc --noEmit`: clean repo-wide.

**Both-directions hardening (this suite's discipline):**
- Forced glide is pinned as the DECISION (post-flap wake glides while falling), as the INTEGRATION
  (≥2 distinct wing-down edges over 6 forced-falling wakes — the bird PUMPS where the buggy hold
  gives one edge), and it re-flaps after the glide (not glide-forever).
- The snapshot is pinned in BOTH directions: matched-to-frozen-but-not-live ⇒ tick (Case A), and
  matched-to-live-but-not-frozen ⇒ hold (Case B, the live match is a decoy). Plus a same-live-target
  pair that a live-reading throttle literally cannot tell apart.

**Two seam traps caught during RED (recorded so Dev/Reviewer inherit them):**
- `steerWake`/B2DIR overwrites the HUNTER's (and the shadow's) `facing` every airborne wake, so a
  facing-based homing observable is contaminated for them. The wiring suite reads `homing.prdir`
  (the throttle's sole writer) instead — clean for both bounder and hunter.
- The shadow's null-target SHLEV escape-flap is POSITION-dependent (`enemyY > LAVA_ESCAPE_Y`); a
  first draft passed VACUOUSLY because one flap lifted the bird clear of the lava, turning the flap
  off for the wrong reason. Fixed by pinning altitude across the step (`keepFallingAt`).

### Rule Coverage

| Rule / discipline | Test(s) | Status |
|-------------------|---------|--------|
| Every test asserts something meaningful | all 16 (no `let _=`, no `assert(true)`) | enforced |
| Both-directions hardening | Case A/B snapshot; decision+integration forced glide | enforced |
| Non-vacuity controls | "alternation continues" (GREEN B&A); wake-1 sanity; same-live decoy pair | enforced |
| Twin census (story standing rule) | all four families pinned: BOLEV2/B2LEV2/SHLEP2/SHLEV2 | enforced |
| Purity / core-boundary | no new src edits (tests only); full suite's purity guard green | green |
| Citation gate (audit/citations) | no new claims added; suite green | green |
| Determinism (jt2 seeded replays) | UNTOUCHED by TEA — Dev's joint re-baseline (see Delivery Findings) | deferred |

**Rules checked:** the applicable joust disciplines above (no lang-review checklist file for TS in
this repo; the project's rubric is the source-scan purity/citation gates + the suite's own
hardening conventions, all satisfied).
**Self-check:** 0 vacuous tests shipped (one vacuous SHLEV draft was caught and fixed before commit).

**Handoff:** To Dev (Loki Silvertongue) for GREEN. Land the two behaviours as SEPARATE COMMITS
(forced glide; PPVELX snapshot) then ONE joint re-baseline commit last, per the story's ORDER AND
COMMITS rule. Read `sprint/archive/uf1-9-session.md` for the re-baseline method (sweep each pin's
OWN precondition; expect some to need a new SEED where the old precondition has an empty solution
set). The twin census and the two seam traps above are in the Delivery Findings / Design Deviations.
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/joust/src/core/enemy.ts` — the two behaviours:
  - BOLEV2 forced glide: `glide` sub-phase on the level-flight interval `PjoyState`, read in
    `pursue()` (bounder/hunter) and `shadow()` (both SHLEP + SHLEV branches), advanced from each
    wake's flap decision in `stepEnemyDetailed`, carried across the countdown (`seekWake`,
    `shadowDwellWake`) via the `levelInterval` helper (glide omitted when false).
  - PPVELX snapshot: `HomingState.ppvelx`, captured at the three level decides via `snapshotHoming`
    (`seekWake` bounder/hunter, `shadowDwellWake` shadow-SHLEP; null-target SHLEV snapshots nothing),
    read by `homingWake` (`ppvelx ?? live` — override, not precondition; see Design Deviation).
- `plugins/joust/tests/joust-jt9-18-ppvelx-snapshot.test.ts` — AC-3 rewritten to the override+fallback
  (Design Deviation).
- Re-baselines (joint final commit): `tests/audio-events.test.ts` (AC2 4370→4714, AC3 digest — rng
  unmoved), `tests/cadence-wiring.test.ts` (R1-3b held = alternate-wake flap), `tests/dumb-wingbeat.test.ts`
  (AC6 counts).

**Commits (the story's ORDER AND COMMITS rule — two behaviours, one joint re-baseline last):**
- `c22ff1a` feat(jt9-18): BOLEV2 forced glide
- `8bc0362` feat(jt9-18): PPVELX snapshot
- `d2c1b1b` test(jt9-18): joint re-baseline of the level-flap-cadence movers

**Tests:** joust project **2817/2817 GREEN** (was 2801 pre-story; +16 new jt9-18 tests, all sibling
suites green after re-baseline). `tsc --noEmit` clean repo-wide. Determinism invariant held: `rng`
bit-identical in every seeded fingerprint (the forced glide moves the birds, not the numbers drawn).

**Verification (measured):**
- `joust-jt9-18-forced-glide` 8/8, `joust-jt9-18-ppvelx-snapshot` 9/9.
- `homing` + `homing-wiring` + `homing-source` 127/127 UNCHANGED (the fallback design left jt8-2's
  hardened suite bit-identical — no migration).
- Four re-baselined assertions, each re-swept for its OWN precondition (uf1-9 method), never nudged;
  which digest moved and why is in each test's comment and the commit message.

**Known non-blocker:** `npm run test:orchestrator` reddens on a pre-existing environmental cause
(`tests/audit-refs.test.mjs` — a star-wars audit blob absent from this local checkout; needs
`fetch-depth: 0`). Confirmed unrelated to jt9-18 (persists with my edits stashed; my work is
joust-only). See Delivery Findings.

**Self-review:** the two behaviours are wired end-to-end through `stepEnemyDetailed` (not just the
pure decisions); code follows the file's existing PjoyState/HomingState idioms; both ACs met; the
snapshot's absent-case has explicit fallback semantics.

**Handoff:** To Reviewer (Heimdall) for code review.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | joust 2817/2817, tsc clean, orch 390/392 (2 pre-existing star-wars audit-blob failures), no debug/TODO/console | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — covered by mutation battery |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — covered by mutation battery |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — covered by mutation battery |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — comments audited by hand |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — types audited by hand |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — N/A (pure deterministic sim, no I/O) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — simplicity audited by hand |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — rules audited by hand |

**All received:** Yes (1 enabled subagent returned; 8 disabled via `workflow.reviewer_subagents`, covered by the mutation battery below)
**Total findings:** 1 confirmed (non-blocking follow-up), 0 dismissed, 1 deferred (follow-up story)

### Mutation battery (the substitute for the 8 disabled specialists)

Eight of nine subagents are disabled on this project, so per the standing lesson I proved
non-vacuity by DEFEATING each mechanism and confirming a test reddens (file restored clean after each):

| # | Mutation | Tests reddened |
|---|----------|----------------|
| M1 | `pursue` forced-glide read defeated (`glide===true` → `false`) | 4 (bounder+hunter decision + pump) |
| M2 | `shadow` forced-glide read defeated | 2 (SHLEP + SHLEV) |
| M3 | snapshot gate ignored (`snapshot ?? live` → `live`) | 8 (all snapshot AC-1/AC-2/AC-3) |
| M4 | forced-glide advancement defeated (`decision.flap` → `false`) | 6 (all forced-glide behaviour) |
| M5 | snapshot CAPTURE defeated (`snapshotHoming` never writes) | 4 (AC-1 wiring only — AC-2/AC-3 set ppvelx directly, correctly unaffected) |

Every mechanism is guarded, and M5's PRECISION (it reddens only the capture-dependent wiring tests,
not the fixture-driven unit tests) is itself evidence the suite is layered correctly.

## Rule Compliance

- **Pure core / core-boundary** (CLAUDE.md — `src/core` is the deterministic sim): the two new helpers
  `levelInterval` and `snapshotHoming` are pure (return fresh objects, no I/O, no `window`/`document`,
  no clock). `homingWake` still returns a new enemy, never mutates its argument. `plugins/joust/tests/purity*`
  green (75). COMPLIANT.
- **Extract only on real duplication** (CLAUDE.md): `levelInterval` is used at three sites (seekWake carry,
  shadowDwellWake carry, stepEnemyDetailed advance) — genuine shared shape, not premature. `snapshotHoming`
  at two sites. COMPLIANT.
- **ROM citations in comments** (joust convention): every new comment cites JOUSTRV4.SRC lines
  (BOLEV2 :3936, B2LEV2 :4162, SHLEP2 :4300, SHLEV2 :4399; PPVELX :3907-3908/:3939-3940 + twins). Spot-checked
  against the vendored source during the TEA census — all accurate. COMPLIANT.
- **Determinism / rng invariant** (jt2 seeded replays): `rng` bit-identical in every re-baselined fingerprint
  (audio-events AC3 still 2_006_456_271). The change moves birds, not draws. COMPLIANT.
- **README file-count guard** (audio-seam-scope): bumped 132→134 for the two new test files; guard green. COMPLIANT.

## Reviewer Observations

1. **[VERIFIED]** Forced-glide state machine is faithful — evidence: `pursue`/`shadow` read `glide===true`
   (enemy.ts:738,864), `stepEnemyDetailed` advances `glide = decision.flap` (:1339), carried by
   `levelInterval` at seekWake:1243 / shadowDwellWake:1483. Proven non-vacuous by M1/M2/M4.
2. **[VERIFIED]** Snapshot gate + capture are faithful — evidence: `homingWake` gates on
   `snapshot ?? target.velXIndex` (enemy.ts:987-990), captured at the three decides via `snapshotHoming`
   (seekWake:1264, shadowDwellWake:1501; null-target snapshots nothing). Proven by M3/M5.
3. **[VERIFIED]** No prdir reset regression — `snapshotHoming` spreads `...enemy.homing` and only sets
   `ppvelx`, seeding `seedHoming()` (prdir=1) ONLY when homing is absent (enemy.ts:633). A mid-cadence
   prdir is preserved; homing.test.ts's "stepEnemy CARRIES the homing workspace" stays green (127/127).
4. **[VERIFIED]** `glide` omitted-when-false keeps the interval's prior shape — `levelInterval` returns
   `{kind,timer}` unless glide (enemy.ts:619); sibling `toEqual` fixtures (cadence-wiring, seek-wiring)
   unaffected without edits. Confirmed by the full suite staying green.
5. **[LOW]** The Dev deviation's rationale "off-level / freshly-mounted wakes are unchanged" is IMPRECISE:
   a down/up seek does NOT clear `ppvelx` (enemy.ts:1256-1257), so a seek ENTERED AFTER a level interval
   gates `homingWake` on the STALE snapshot, not the live index. This is deterministic and re-baselined
   (suite green), and it stems from jt8-2's pre-existing "throttle runs every wake" deviation, not from
   jt9-18 — but the claim as written overstates the containment. See follow-up finding below. Non-blocking.
6. **[VERIFIED]** Re-baselines are honest — each of the four (audio-events AC2 4370→4714, AC3 digest,
   cadence-wiring R1-3b, dumb-wingbeat AC6) re-swept its OWN precondition and states which digest moved
   and why; `rng` unmoved throughout. Directions match the mechanism (birds pump → more wing-down edges;
   slower climb → later wave clear).

### Devil's Advocate

Suppose this code is broken. The most dangerous shape would be a forced-glide that leaks into a route it
should not: if `phased` set `glide` on a non-level interval, a climbing or diving bird would spuriously
glide. Checked — `phased` guards `pjoy.kind === 'interval'`, and an interval is armed ONLY on a level
route (seekWake:1259-1264 arms it after the down/up returns; shadowDwellWake:1495-1501 only when `level`);
up/down carry a `wing` phase, cliff turns a `dwell`. So `glide` cannot attach off-level. A second attack:
the advancement reads `decision.flap`, which for a forced-glide wake is `false` (pursue forced it), so the
state self-clears — but could a NON-forced glide (bird above its line, not flapping) wrongly set glide=false
and thus never force a glide? That is correct behaviour: a bird that glides naturally at BOLEV1 stays at
BOLEV1 (the ROM's BOLEVA path does not touch PJOY), so only a FLAP arms BOLEV2. Verified against the ROM
(:3931 BOFAST vs :3938 BOLEVA). Third: could the snapshot fallback let a stale snapshot cause a WRONG flip
in play? Yes, off-level after an interval (observation 5) — but the direction was already non-faithful
pre-jt9-18 (live gate off-level), it is deterministic, and the seeded replays pin it. A confused maintainer
might read "off-level unchanged" and not realise the stale snapshot persists; the follow-up finding records
it. Fourth: null/empty inputs — `target === null` short-circuits homingWake before the snapshot read;
`snapshotHoming(enemy, null)` returns `enemy.homing` untouched (SHLEV captures nothing, matching the ROM).
Huge inputs / overflow — `prdir` stays 8-bit masked; `ppvelx` is a small FLYX index, no arithmetic on it.
No filesystem, no config, no concurrency — this is a pure reducer. Nothing here corrupts state or throws.

## Reviewer Assessment

**Verdict:** APPROVED

**Summary:** Two ROM-fidelity behaviours implemented faithfully and non-vacuously tested. The BOLEV2
forced glide (all four level families — BOLEV2/B2LEV2/SHLEP2/SHLEV2) and the PPVELX homing snapshot
(three decide sites) are each proven by a mutation battery that reddens a test when the mechanism is
defeated (M1-M5 all positive, M5 precisely reddening only the capture-dependent wiring). Preflight:
joust 2817/2817, tsc clean; the two orchestrator failures are pre-existing star-wars audit-blob
absences, confirmed unrelated. jt8-2's hardened homing suite (127) is bit-identical — the AC-3
relaxation (snapshot overrides, live fallback) confined the change to where the ROM has a snapshot.

**Data flow traced:** target velocity → snapshot frozen at the level decide (`snapshotHoming`,
seekWake:1264 / shadowDwellWake:1501) → `homing.ppvelx` → read by `homingWake` gate (:989) against the
enemy's own velXIndex. Forced-glide: `decision.flap` → `pjoy.glide` (stepEnemyDetailed:1339) → carried
(`levelInterval`) → read by `pursue`/`shadow` next wake. Both wired end-to-end through
`stepEnemyDetailed`, not just the pure decisions.

**Pattern observed:** clean sub-phase-on-interval + snapshot-on-workspace, mirroring the existing
uf1-9/jt8-2 idioms; `glide` omitted-when-false to preserve sibling fixture shapes (enemy.ts:619).

**Error handling / edge cases:** null target short-circuits before the snapshot read; SHLEV (null
target) captures nothing, matching the ROM; `prdir` stays 8-bit masked; no I/O, no concurrency (pure
reducer). Devil's Advocate found only the off-level stale-snapshot nuance (observation 5), filed
non-blocking as jt9-49.

**Deviations:** both Dev deviations ACCEPTED (audit above); the AC-3 relaxation is the lower-risk,
more-faithful choice.

**Non-blocking follow-up filed:** jt9-49 (scope the throttle to a live level interval).

**Handoff:** To SM for finish-story.
## Impact Summary

**Delivery Round:** 1 (APPROVED first pass) · **Blocking:** 0 · **Non-blocking:** 6

Two ROM-fidelity behaviours shipped in `plugins/joust/src/core/enemy.ts`: the BOLEV2 forced glide
(all four level families — BOLEV2/B2LEV2/SHLEP2/SHLEV2) and the PPVELX homing snapshot (three decide
sites, `snapshot ?? live` fallback). Landed as two behaviour commits + one joint re-baseline, per the
story's ORDER AND COMMITS rule.

- **Tests:** joust 2817/2817 GREEN; `tsc` clean; `rng` bit-identical across the re-baseline. jt8-2's
  homing suite (127) bit-identical. Re-baseline touched only 4 assertions (audio-events AC2/AC3,
  cadence-wiring R1-3b, dumb-wingbeat AC6).
- **Deviations (both ACCEPTED):** AC-3 relaxed to snapshot-override + live-fallback (avoids migrating
  17 hardened jt8-2 tests, more faithful); `glide` omitted-when-false (preserves interval shape).
- **Non-blocking follow-up filed:** jt9-49 (scope the homing throttle to a live level interval —
  retires the off-level stale-`ppvelx` nuance and jt8-2's every-wake read).
- **Known non-blocker:** `test:orchestrator` reddens only on a pre-existing environmental cause
  (star-wars audit-tag blob absent from this local checkout; needs `fetch-depth: 0`). Unrelated to joust.
