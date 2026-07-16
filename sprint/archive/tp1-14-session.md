---
story_id: "tp1-14"
jira_key: "tp1-14"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-14: THE SUPERZAPPER — 19-frame window, kills every OTHER frame (8 kills, not 19), and takes tankers

## Story Details
- **ID:** tp1-14
- **Jira Key:** tp1-14
- **Epic:** tp1
- **Workflow:** tdd
- **Repo:** tempest
- **Points:** 3
- **Priority:** p1
- **Stack Parent:** tp1-1 (the window is a frame count)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-16T00:49:11Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-16T00:04:42Z | 2026-07-16T00:06:33Z | 1m 51s |
| red | 2026-07-16T00:06:33Z | 2026-07-16T00:35:04Z | 28m 31s |
| green | 2026-07-16T00:35:04Z | 2026-07-16T00:43:46Z | 8m 42s |
| review | 2026-07-16T00:43:46Z | 2026-07-16T00:49:11Z | 5m 25s |
| finish | 2026-07-16T00:49:11Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Gap** (blocking): the citation gate WILL go red on GREEN — fixing these findings
  falsifies their own `ours` quotes. Verified by probe. Dev must, before committing:
  (1) mark `"remediated_by": "tp1-14"` on W-042, W-043, B-001, B-019, S-012;
  (2) reconcile **FR-014** (`pair-11-framerate-adjudication.json`) — an OUT-OF-SCOPE
  timebase finding that also cites `src/core/rules.ts:173` `= 13`; tp1-14 fixes the
  frame COUNT but not the timebase, so FR-014 is NOT remediated — its `ours` verbatim
  must be re-quoted to the new line (`= 19`), NOT marked fixed;
  (3) `node tools/audit/reanchor-citations.mjs --write` for citations that merely
  row-shifted below the sim.ts edit (W-001, B-007, B-008, …). Affects
  `docs/audit/findings/*.json`. *Found by TEA during test design.*
- **Gap** (non-blocking): the ROM's first-press wipe targets by SLOT order (EXIKIL
  scans DOWN from WINVMX, ALWELG.MAC:3548); our port targets nearest-the-rim. W-043
  documents this but the tp1-14 ACs do not scope it — left unpinned (tests assert kill
  COUNT/cadence, never WHICH enemy). Affects `src/core/sim.ts` runZapFrame targeting.
  Recommend a follow-up story if slot-order fidelity is wanted. *Found by TEA during test design.*
- **Improvement** (non-blocking): `superzapper-activate.killCount` (sim.ts:724) still
  filters `e.kind !== 'tanker'` and does not cap at 8 — after tp1-14 the first press
  kills up to 8 incl. tankers, so the audio-payload count is now understated. Left as-is
  (out of AC scope; changing it risks `sim.events.test.ts`). Affects `src/core/sim.ts`
  (killCount) — an audio-fidelity follow-up. *Found by TEA during test design.*
- **Question** (non-blocking): FR-014/B-001's two-part note — 19 frames at the sim's
  1/60 step is 0.317 s, still short of the ROM's 0.67 s (28.44 fps). The timebase rebase
  is a GAME-WIDE concern, not this story. Affects `src/shell/loop.ts` STEP — its own
  future story. *Found by TEA during test design.*

### Reviewer (code review)
- No new upstream findings. TEA's blocking citation-gate finding was resolved in GREEN
  (remediated_by on the 6 + reanchor, 0 lost, gate 25/25). The non-blocking targeting-order
  and killCount findings are accepted as out-of-scope/inert. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **First-press targeting order left unpinned**
  - Spec source: context-story-tp1-14.md, AC-2; finding W-043
  - Spec text: "It kills every OTHER frame — 8 kills, not 19. A test counts the kills."
  - Implementation: cadence tests assert kill COUNT (8), stride (2), window (19), and
    that tankers die — never WHICH enemy dies. W-043 also notes ROM slot-order vs our
    nearest-rim targeting; that ORDER divergence is not pinned.
  - Rationale: the AC scopes count/cadence/tankers, not targeting order; pinning order
    would over-couple and exceed scope. Logged as a Delivery Finding for a follow-up.
  - Severity: minor
  - Forward impact: none for tp1-14; a future slot-order story owns it
- **Timebase pinned as a FRAME COUNT, not wall-clock seconds**
  - Spec source: context-story-tp1-14.md, AC-1; findings B-001, FR-014
  - Spec text: "The first-press window is 19 frames, not 13."
  - Implementation: assert 19 FRAMES (activeFrames + ZAP_WINDOW_FIRST===19), dt-independent.
    The 60 Hz-vs-28.44 fps duration error (FR-014) is NOT tested.
  - Rationale: the frame count is base-independent (audit's own words); the timebase is a
    game-wide rebase, a separate story. Pinning seconds here would fail for reasons tp1-14
    cannot fix.
  - Severity: minor
  - Forward impact: none; FR-014 remains open for the timebase story
- **Re-seated 9 sibling tests in sim.superzapper.test.ts (test maintenance)**
  - Spec source: findings W-042 (first-press spares→takes tankers), W-043/B-001 (13→19),
    B-019/S-012 (per-frame→every-other-frame)
  - Spec text: the 10-2 suite encoded "tankers SPARED / ~13-frame / one-kill-per-frame" —
    all three now refuted by primary source.
  - Implementation: inverted the tanker-spared assertions, bumped the window bounds to
    18–20, changed the board-alive anchor from a spared tanker to a `py:30000` nymph
    spawn budget (the wipe now kills tankers, so the old anchor collapses).
  - Rationale: a contract-change RED breaks sibling tests staged on the old contract; TEA
    owns re-seating them so Dev is not caught between the new AC and a stale test.
  - Severity: minor
  - Forward impact: none — verified GREEN under a probe of the real fix

### Dev (implementation)
- **FR-014 marked `remediated_by: tp1-14` despite its residual timebase concern**
  - Spec source: TEA Delivery Finding (blocking, citation gate); `docs/audit/findings/pair-11-framerate-adjudication.json`
  - Spec text: FR-014 is a CONFIRMED divergence whose `ours` cites `ZAP_WINDOW_FIRST = 13`;
    its claim spans BOTH the frame count (13 vs 19) AND the 60 Hz-vs-28.44-fps timebase.
  - Implementation: marked FR-014 `remediated_by: tp1-14` (alongside W-042/W-043/B-001/
    B-019/S-012), because its `ours` line — the exact `= 13` — is what tp1-14 corrects to
    `= 19`, matching the reanchor tool's own definition of remediation ("we changed what it
    says because the finding told us to"). Did NOT re-quote it to `= 19` (that would leave a
    "divergence" pointing at a now-correct line and require rewriting its claim).
  - Rationale: the frame-count line FR-014 pins is genuinely fixed; the residual timebase
    divergence lives at the 60/s tick (FR-012 / loop.ts STEP), a game-wide rebase story, not
    this line. Marking it here keeps the gate honest about THIS line without a phantom fix of
    the timebase (which stays open under FR-012).
  - Severity: minor
  - Forward impact: a future timebase-rebase story owns the wall-clock duration (FR-012);
    Reviewer should confirm this reading of FR-014 rather than a re-quote.
- **`superzapper-activate.killCount` left excluding tankers / uncapped**
  - Spec source: context-story-tp1-14.md ACs; TEA Delivery Finding (Improvement)
  - Spec text: ACs pin the window/cadence/tanker behavior; they do not mention the activate
    event's `killCount` field.
  - Implementation: left sim.ts killCount as `enemies.filter(e => e.kind !== 'tanker').length`,
    unchanged — no test requires it and touching it risks `sim.events.test.ts`.
  - Rationale: minimalist scope — the AC's "count the kills" is satisfied by counting
    enemy-death events (8), not this pre-window audio-payload field.
  - Severity: minor
  - Forward impact: the audio payload count understates the (now tanker-inclusive, ≤8) kills;
    an audio-fidelity follow-up owns it.

### Reviewer (audit)
- **TEA #1 (targeting order left unpinned)** → ✓ ACCEPTED. Slot-order vs nearest-rim is
  genuinely out of the AC scope and changes WHICH enemy dies, not the count/cadence/tanker
  behavior the story pins. Correctly captured as a non-blocking Delivery Finding.
- **TEA #2 (timebase pinned as a frame COUNT)** → ✓ ACCEPTED. Verified: the timebase family
  FR-001/FR-012 is already `remediated_by: tp1-1` (fleet posture = frame-counted, ticked at
  1/60). Pinning the frame count and leaving wall-clock alone is exactly right.
- **TEA #3 (re-seated 9 sibling tests)** → ✓ ACCEPTED. The 10-2 suite encoded the refuted
  tanker-spared/13-frame/one-per-frame contract; re-seating was mandatory. Anchor switch to a
  `py:30000` nymph budget is the proven idiom (sim.events.test.ts). Verified GREEN.
- **Dev #1 (FR-014 marked `remediated_by` rather than re-quoted)** → ✓ ACCEPTED, with a
  rationale correction. Marking is CORRECT and consistent with the whole FR family (FR-001/
  FR-012 → tp1-1, FR-013 → tp1-7): FR-014's `ours` pins the exact `ZAP_WINDOW_FIRST = 13` line
  tp1-14 fixes. Dev's note that the residue "lives in FR-012, a future story" is the only slip
  — FR-012 is ALREADY closed by tp1-1; the timebase posture is settled, so there is no orphan.
  Re-quoting (the TEA finding's suggestion) would have been WORSE — it would leave a
  "divergence" pointing at a now-correct `= 19` line. Dev chose the better path.
- **Dev #2 (`killCount` left tanker-excluding/uncapped)** → ✓ ACCEPTED. Verified INERT: the
  shell's `superzapper-activate` handler is SILENT by design (S-011); no consumer reads
  `killCount`. The zap's audio is the per-kill `enemy-death` bursts, which now correctly
  include tankers on the every-other-frame cadence — more faithful, no regression.

**Undocumented deviations:** none. The implementation matches the ACs and the five findings
exactly; no spec divergence slipped through unlogged.

## TEA Phase Notes (RED)

**CRITICAL AUDIT-STORY VERIFICATION BEFORE RED:**

This story subsumes W-042, W-043, B-001, B-019, S-012. The subsumes labels are UNVERIFIED guesses and frequently mislabeled in this repo's audit-story tracking.

**Before writing failing tests:**

1. Pull each finding (W-042, W-043, B-001, B-019, S-012) from `tempest/docs/audit/findings/*.json`
2. Read the full claim AND reasoning — the reasoning's `[REFUTATION]` or `[CORRECTION]` can flip or narrow the claim
3. Check each finding's `remediated_by` field — some may already be fixed by prior stories and must NOT be re-implemented
4. Carve any misfiled finding to its real story rather than forcing it in here

**Known correction (from story description):**
- For W-042: our SECOND zap press is ALREADY correct — only the sustained first-press cadence is wrong

**Core mechanic to verify against ROM/audit:**
- Superzapper has a 19-frame active window (frame count, per tp1-1 which is completed)
- During this window, it kills every OTHER frame → 8 kills total, not 19
- Should also destroy/take tankers
- TEA must verify these numbers against the ROM/audit findings, not against this paraphrase

## Sm Assessment

Setup complete for tp1-14 (Superzapper cadence/window/tanker fidelity). Ready to hand off to TEA for RED.

**Verified before handoff:**
- Merge gate clear — no open PRs on tempest.
- No parallel-checkout race — no `tp1-14` commits on `origin/develop` and no remote branch for it.
- Dependency `tp1-1` (window is a frame count) is `done`, so this story can build on the frame-count window.
- Branch `feat/tp1-14-superzapper-cadence` created off tempest `develop` (gitflow).
- Session + context files present; ACs written.

**Routing note for TEA (RED):** This is a tempest audit-story. The "Subsumes W-042, W-043, B-001, B-019, S-012" labels are UNVERIFIED — pull each finding from `tempest/docs/audit/findings/*.json`, read claim + reasoning ([REFUTATION]/[CORRECTION] can flip a claim), and check `remediated_by` before writing tests. Preserve the W-042 correction: the SECOND zap press is already correct — do not change it (that is a regression). Carve any misfiled finding to its real story.

**Decision:** Confirm — proceed to RED with TEA (O'Brien).

## TEA Assessment

**Phase:** finish
**Tests Required:** Yes

**Primary-source verification (audit-story gate).** Pulled all five findings from
`docs/audit/findings/*.json` and read claim + reasoning. All CONFIRMED, none has a
`remediated_by` (none pre-fixed). They cohere into ONE mechanism (ALWELG.MAC PROSUZ/
KILENE/EXIKIL, 3490-3567):
- **W-043 / B-001** — TIMAX[1] = CSUSTA + <8*<CSUINT+1>> = 3+16 = **19 frames** (book's
  literal `.BYTE 00,13,05` is wrong). TIMAX[2] = 5 (second window — CORRECT, do not touch).
- **B-019 / S-012 / W-043** — KILENE gates the kill on `SUZTIM >= 3 AND SUZTIM even` →
  fires at SUZTIM {4,6,8,10,12,14,16,18} = **8 kills, every OTHER frame** (not one-per-frame).
- **W-042** — EXIKIL takes the first live invader of ANY kind, strips INVCAR (no split),
  explodes it → the first-press wipe **KILLS tankers, cargo-stripped**; ours skips them.
  Note the refuter's [CORRECTION]: only the FIRST-press sustained wipe is wrong; the SECOND
  press already kills tankers without splitting — leave it alone.

**Test Files:**
- `tests/core/tp1-14.superzapper-cadence.test.ts` (NEW, 17 tests) — the authoritative
  tp1-14 contract: 19-frame window, 8 kills every-other-frame (stride 2, CSUSTA warm-up),
  tankers taken cargo-stripped (no split, scored), second-press regression guard, purity.
- `tests/core/sim.superzapper.test.ts` (RE-SEATED, 9 tests) — moved off the refuted 10-2
  contract (tanker-spared / 13-frame / one-per-frame). Board-alive anchor switched from a
  spared tanker to a `py:30000` nymph budget (the wipe kills tankers now, so the old anchor
  collapses). See Design Deviations.

**Tests Written:** 17 new + 9 re-seated, covering AC-1 (19 frames), AC-2 (8 kills, every
other frame), AC-3 (tankers taken, cargo stripped), AC-4 (second press unchanged), AC-6
(citations — flagged for Dev). AC-5 (depends on tp1-1) is satisfied structurally (window is
a frame count).

**Status:** RED — 21 failing / 39 passing across both files. Every failure is the absent
new behavior; every pass is a keep-behavior/regression guard.

**Fix probed (then reverted).** Applied a minimal faithful fix (`ZAP_WINDOW_FIRST=19`;
KILENE cadence gate + `nearestRimIndex(() => true)` in runZapFrame) to source, ran the full
tempest suite, then `git checkout`'d it away. Result: **tp1-14 file 17/17 GREEN, existing
superzapper suite 43/43 GREEN** — the tests are reachable, not over-pinned. The only
collateral was the citation gate (2 findings-files) — expected, and Dev's to remediate
(see the blocking Delivery Finding).

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| lang-review TS #8 — meaningful assertions (no vacuous checks) | every test asserts concrete counts/frames/scores; self-checked for `toBeTruthy`/`not.toThrow`/`let _ =` — none | pass |
| lang-review TS #1 — no type-safety escapes | no `as any`/`as unknown`; typed event guards; `tsc --noEmit` clean | pass |
| tempest core rule — pure & deterministic (no Date/rng/rAF) | `identical board → identical per-frame trace`; `dt-independent (frame-counted)` | failing (RED) |
| AC-1 — 19-frame window | `ZAP_WINDOW_FIRST===19`; `flashes … 19 active frames` | failing (RED) |
| AC-2 — 8 kills, every other frame | `removes exactly 8`; `stride 2`; `CSUSTA warm-up`; `≤1 kill/frame` | failing (RED) |
| AC-3 — tankers taken, cargo-stripped | `vaporises tankers`; `never splits`; `scores 4×100`; `tanker death per kill` | failing (RED) |
| AC-4 — second press unchanged | `ZAP_WINDOW_SECOND===5`; `weak shot kills one, spends`; `5-frame window` | pass (guard) |

**Rules checked:** 7 of 7 applicable rules have test coverage.
**Self-check:** 0 vacuous tests found. `tsc --noEmit` clean.

**Handoff:** To Dev (Julia) for GREEN. The whole fix is small — `ZAP_WINDOW_FIRST=19` in
rules.ts + gate runZapFrame's kill on `SUZTIM>=3 && SUZTIM even` (SUZTIM = ZAP_WINDOW_FIRST+1
- zapTimer) and drop the `e.kind !== 'tanker'` filter (use `() => true`). Then the citation
dance: `remediated_by` on the 5, re-quote FR-014, reanchor the row-shifted rest. Do NOT
touch the second press or `killCount`.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/rules.ts` — `ZAP_WINDOW_FIRST` 13 → 19 (TIMAX[1] = CSUSTA+8*(CSUINT+1)); doc
  comment rewritten with the ROM derivation.
- `src/core/sim.ts` — `runZapFrame` gates the kill on KILENE's cadence
  (`suztim = ZAP_WINDOW_FIRST + 1 - zapTimer; if (suztim >= 3 && (suztim & 1) === 0)`) and
  targets ANY kind (`nearestRimIndex(() => true)`) so tankers die cargo-stripped via the
  existing split-free `zapKillAt`. Doc comments (runZapFrame + stepZap) updated. Second
  press and `killCount` untouched.
- `docs/audit/findings/*.json` — `remediated_by: tp1-14` on W-042, W-043, B-001, B-019,
  S-012, **and FR-014** (see Dev deviation); 21 row-shifted citations re-anchored via
  `tools/audit/reanchor-citations.mjs --write` (0 lost).

**Approach.** The whole fix is two lines of behavior: the constant and the cadence gate.
SUZTIM is reconstructed from the existing down-counting `zapTimer` (no new state), so the
window still self-runs and the 10-2/10-14 machinery is untouched. Dropping the tanker
filter is all AC-3 needs — `zapKillAt` already scores without splitting (EXIKIL's declaw).

**Tests:** 1485/1485 passing (GREEN). Superzapper suites 60/60. Citations 25/25. `tsc
--noEmit` clean; `vite build` clean.

**Scope held:** did not change the second press (W-043 — already correct), the
activate-event `killCount`, or the sim timestep (FR-014's timebase half — a separate story).
Both left as logged Dev deviations / TEA findings.

**Branch:** `feat/tp1-14-superzapper-cadence` (pushed to origin).

**Handoff:** To Reviewer (The Thought Police) for code review. Two judgment calls to
sanity-check: (1) FR-014 marked remediated vs re-quoted (Dev deviation); (2) first-press
targeting left as nearest-rim, not the ROM's slot order (TEA Delivery Finding, out of scope).

## Subagent Results

**All received:** Yes

| # | Subagent | Status | Findings | Severity | Notes |
|---|----------|--------|----------|----------|-------|
| 1 | reviewer-preflight | Complete | 0 | N/A | tests 1485/1485, tsc clean, build ok, citations 25/25, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer's own edge read (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (see [SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (see [TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (see [TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (see [SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (see [RULE]) |

All 8 specialist subagents are disabled via `workflow.reviewer_subagents`; only preflight ran.
The Reviewer performed each dimension's analysis directly (tags below).

## Reviewer Assessment

**Verdict:** APPROVED

The fix makes the first-press superzapper faithful to Theurer's ROM on all three CONFIRMED
divergences, and does so with a minimal, pure-core change (a constant + a cadence gate).
Verified independently against ALWELG.MAC (PROSUZ/KILENE/EXIKIL, 3490-3567).

**Correctness (traced):** press → `stepZap` sets `zapTimer = ZAP_WINDOW_FIRST(19)` →
`runZapFrame` per frame reconstructs `SUZTIM = 20 - zapTimer` (1..19) and kills when
`SUZTIM >= 3 && (SUZTIM & 1) === 0` → kills at SUZTIM {4,6,…,18} = 8, every other frame,
window closes at SUZTIM 19. `nearestRimIndex(() => true)` takes any kind; `zapKillAt` scores
and never splits → tankers die cargo-stripped (EXIKIL's INVCAR declaw). SECOND press untouched
(kill guarded by `superzapper === 'used-once'`, so the spent window never re-enters the gate).
Fully deterministic — SUZTIM is pure arithmetic on existing state; no new state, no RNG, no
clock. Matches the 60 tests exactly (incl. the every-other-frame stride and CSUSTA warm-up).

**[EDGE]** Boundary walk: press frame SUZTIM=1 (no kill ✓, matches ROM "SUZTIM=1, no KILENE");
SUZTIM=3 odd (no kill ✓); SUZTIM=18 last kill; SUZTIM=19 deactivation (odd → no 9th kill ✓);
board smaller than 8 → all die, no over-kill (`idx < 0` guard); tanker-only board → wipe kills
them (was zero); board > 8 → exactly 8 die, rest survive → no auto-warp. The SUZTIM formula
uses `ZAP_WINDOW_FIRST` but is unreachable in the 5-frame second window (guarded). No off-by-one.
**[SILENT]** No swallowed errors/empty catches/silent fallbacks introduced; `idx < 0` is an
explicit no-target guard, not a silent skip. **[TEST]** 17 new + 9 re-seated; assertions are
concrete (exact counts/frames/scores), none vacuous; the stride-2 + count-8 + window-19 trio is
tight (consecutive or every-3rd-frame both fail); the tanker no-split test bites a split via
seenKinds. Re-seated tests verified to fail on old code and pass on new (RED→GREEN probe by TEA).
**[DOC]** Comments rewritten to the ROM truth (TIMAX derivation, KILENE gate, EXIKIL declaw);
no stale "spares tankers"/"~13 frames" left; the `window.` purity-scanner trip was caught and
fixed. **[TYPE]** No `as any`/casts; typed event guards; `tsc --noEmit` clean. **[SEC]** N/A —
pure client sim, no I/O, no injection surface; no secrets. **[SIMPLE]** Minimal: 2 behavioral
lines; SUZTIM reconstructed from the existing down-counter rather than adding state — the right
call. **[RULE]** lang-review TS #8 (meaningful assertions) ✓, #1 (no type escapes) ✓; tempest
core-purity rule ✓ (no Date/random/rAF); citation-gate convention followed (remediated_by +
reanchor, 0 lost).

**Findings:** none blocking. Both author-flagged judgment calls verified correct (FR-014
remediation is consistent with the FR family and better than a re-quote; `killCount` is inert —
the activate cue is silent by design, zap audio is the enemy-death bursts). All 5 logged
deviations ACCEPTED (see Design Deviations → Reviewer audit).

**Handoff:** To SM (Winston Smith) for finish-story.