---
story_id: "jt11-18"
jira_key: "jt11-18"
epic: "jt11"
workflow: "tdd"
---
# Story jt11-18: Burned-away bridge floor drops the player off-screen instead of into the lava-troll grab, and the lava itself is not drawn

## Story Details
- **ID:** jt11-18
- **Jira Key:** jt11-18
- **Workflow:** tdd
- **Stack Parent:** jt11-5 (done — provides the bridge burn-off destruction state)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-14T14:29:48Z
**Repos:** arcade
**Branch:** fix/jt11-18-burned-bridge-lava-troll-grab-and-render
**Context:** sprint/context/context-story-jt11-18.md (hand-authored Architect spec — full root cause, ROM citations, test design, 6 ACs)

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-14T12:53:45Z | 2026-08-14T12:55:41Z | 1m 56s |
| red | 2026-08-14T12:55:41Z | 2026-08-14T13:22:17Z | 26m 36s |
| green | 2026-08-14T13:22:17Z | 2026-08-14T14:05:34Z | 43m 17s |
| review | 2026-08-14T14:05:34Z | 2026-08-14T14:29:48Z | 24m 14s |
| finish | 2026-08-14T14:29:48Z | - | - |

## Sm Assessment

**Story:** jt11-18 (5pt, p1, `type: bug`, tdd) — burned bridge floor: two coupled defects following jt11-5.

**Contention probes (clean).** `git fetch --prune` then `git branch -r | grep -i jt11-18` → no remote branch existed. Sibling `.session/` sweep across `~/Projects/a-*` → no matches. No PR. Board was genuinely free before setup; claim branch now pushed and story stamped `in_progress`.

**Dependency.** jt11-5 (bridge burn-off destruction state) is `done` — the prerequisite arena/destruction state this story consumes is landed.

**Context is the authoritative spec — protected through setup.** `sprint/context/context-story-jt11-18.md` was hand-authored by an Architect-tier investigation on 2026-08-13: full two-defect root cause, ROM citations (JOUSTRV4.SRC), a Test Design outline, a Rule-coverage table, 6 ACs, and Out-of-scope notes. The epic YAML carries `acceptance_criteria: null` and `review_findings: null`, so this context file is the SOLE source of ACs — there was nothing to copy verbatim and nothing to derive. sm-setup was given an explicit DO-NOT-REGENERATE override; verified untouched afterward (md5 `4fe59768a85d5f3958c4bbe32c0a9199`, `git status --short` empty). TEA reads the ACs and Test Design straight from that file.

**Premise re-verified against the current tree (both defects current, not stale):**
- Defect B (lava absent): `DrawOp.kind` is still exactly `'arena' | 'entity' | 'fill' | 'crumble'` (`sim.ts:312`) — no `'lava'` kind, no lava draw op. Stands.
- Defect A (grab unwired): the ground-outcome `{ kind: 'troll' }` is produced (`arena.ts:315`) but the ground/land consumers still branch only on `platform`; the `'troll'` process machinery in `sim.ts` is the once-per-wave CLIF5 victim path, not the per-entity burned-shore grab. Consistent with the context's root cause. Stands.

**Note for TEA:** AC-A4 / AC-6 involve seeded-replay fixtures — re-baseline any moved fixture with the `rng` law verified untouched FIRST (joust seeded-replay protocol). Defect B is the jt11-7 "new DrawOp kind needs BOTH the union AND a `main.ts`/`render.ts` paint fn" seam — a core-only drawList op is invisible without its shell consumer; pin both. Adding a joust test file reddens the README file-count anchor — bump `plugins/joust/README.md` in the same commit.

**Routing:** phased tdd → RED phase owner is TEA (Han Solo).

## TEA Assessment

RED phase complete (Han Solo). **11 new failing tests across 3 files** — cleanly red
for the right reasons; the full joust suite is otherwise green (11 failed / 3621 passed
/ 191 files), `npm run lint` is clean, and the README file-count guard passes at 191.

### Test files added
- `plugins/joust/tests/burned-shore-grab-jt11-18.test.ts` — **Defect A** (behaviour):
  - AC-A1 (RED): a player standing on a burned shore column is seized by a lava troll
    *bound to that entity* (`victimId`/`grippedBy`), not dropped. Isolated from the
    once-per-wave path with a **CLIF5 decoy** so `pickTrollVictim` binds the decoy, never
    the shore stander — the per-entity LNDB7 grab is the only thing that can bind it.
    Today: stander walks off, only the decoy is bound → red.
  - AC-A2 (RED): an airborne free-fall over a burned column is bounded by the FLOOR+7
    kill plane — `posY>>8` must not exceed the 240px screen (today it runs to ~1910).
    Non-vacuity: it must first descend past FLOOR. Control: over the intact island it lands.
  - AC-A3 (RED, ×2): a **buzzard** standing on a burned column is grabbed (reframed from a
    free-fall probe — the enemy's flap AI confounds a fall, and the ROM grips "the player
    OR enemy" anyway, JOUSTRV4.SRC:6764); an **egg** falling over a burned column is bounded
    (control: it settles on the island).
  - AC-A4 (GREEN guard): wave 4 still spawns exactly one once-per-wave troll bound to the
    CLIF5-nearest bird — must stay green (the new grab must not break/duplicate it).
- `plugins/joust/tests/lava-render-jt11-18.test.ts` — **Defect B** core `drawList`:
  AC-B1 (a non-black lava fill is emitted over the burned shore), AC-B2 (the burned columns
  are still covered after the burn — control: intact planks cover them), AC-B3 (background
  z-order before entities, a real pool with height>1, persists on a later burned wave).
- `plugins/joust/tests/lava-render-jt11-18-wiring.test.ts` — **Defect B** shell seam
  (the jt11-7 lesson): a faithful fill painter renders the burned pixel a non-black colour,
  and `main.ts`'s paintSim must dispatch the emitted lava op's kind to a live paint path.

### Design choices the Reviewer should know
- **Kind-agnostic render tests.** The lava op is matched by *geometry* (width/height/colour),
  not by `kind`, so the minimal fix may reuse `kind:'fill'` (blitOp's existing arm) OR add a
  new `kind:'lava'` — the tests don't dictate the transcription. If Dev adds a new kind, both
  the `sim.ts` `DrawOp` union AND the independent `sim-contract.ts` mirror must widen (the
  double-entry rule), and paintSim must dispatch it — the wiring test's second assertion checks
  exactly that.
- **AC-B3 rise is asserted softly.** AC-5's "tracks the surface level and its per-wave rise"
  is covered as *persistence + real-pool shape*, not a strict per-wave surface-Y monotonicity,
  to avoid coupling to Dev's SAFRAM→y mapping. Flagged for the verify/review phase to tighten
  if the owner wants strict fidelity.
- **The wiring painter is a reference reimplementation** of blitOp's fill arm (TS-checklist #18).
  Kept deliberately trivial (one fillRect); the companion source-scan proves the *real* shell
  dispatches the op, so the pair covers emission + paintability + real dispatch.

### Rule Coverage (TS lang-review checklist)
| Rule | Where covered |
|------|---------------|
| core/shell boundary (`purity`) | Defect B change stays in core `drawList` (pure); DOM only in `main.ts`/shell — pinned by the existing `purity`/`purity-scanner` suites |
| new DrawOp kind needs union + paint fn (#14/#27, jt11-7 seam) | wiring test: op emitted AND paintSim dispatch scan (comment-immune) |
| source-text guard anchored, bounded, comment-immune (#15/#25) | wiring scan strips comments and anchors to `kind === '<k>'`, not a whole-file token |
| test quality — no vacuous/identity assertions (#18/#26) | controls use *distinct* values (decoy vs shore, island vs plank); non-vacuity floors on every bounded-fall assertion |
| comment-body line refs forbidden (jt9-30) | all `<file>.ts:<line>` comment refs converted to symbol names; guard green |
| README file-count anchor (jt5-7) | bumped 188 → 191 in the same change; `audio-seam-scope` guard green |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Gap (non-blocking, architectural — READ BEFORE GREEN):** Defect A's per-entity grab
  cannot be wired inside `stepPlayerEntity`/enemy `stepEntity` alone. Those functions operate
  on a single `EntityState` and have **no access to the process list**, so they cannot
  `insertTroll`. The `{ kind:'troll' }` ground outcome must be surfaced up to the `stepSim`
  orchestration layer (where `pickTrollVictim`/`insertTroll` live) and a lava troll bound to
  the *touching* entity there — the ROM spawns LAVAT1 from the ground-check itself
  (VCUPROC LAVAT1, JOUSTRV4.SRC:6776-6790). The AC-A1/AC-A3 tests deliberately assert the
  observable at the `stepSim` level for this reason; AC-A2's kill-plane backstop is the
  narrower `EntityState`-level change (add the `isLavaDeath` FLOOR+7 gate to the airborne
  branch, applied by both the player and enemy steppers, and the egg's feetBelow check).
- **Improvement (non-blocking):** AC-A4 / AC-6 name seeded-replay fixtures. No seeded fixture
  was re-baselined in RED (none needed changing). If GREEN moves a fingerprint, re-baseline
  with the `rng` law verified untouched FIRST (joust seeded-replay protocol) — do not chase
  the fingerprint before the rng law.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (Yoda) — GREEN

- **Kill-plane is a CLAMP at FLOOR+7, not the full lava-DEATH sequence.** AC-2/context say
  a non-gripped entity that reaches lava depth "dies." The airborne steppers (frame.ts
  player, enemy.ts, stepEgg) now **clamp** `posY` at `DEATH_Y` (ADGFLR, JOUSTRV4.SRC:6508-6509)
  so nothing integrates off the bottom of the screen — the felt bug and exactly what the RED
  tests assert (bounded, not removed). The full ROM lava-death (life loss / CPLYR dissolve /
  respawn) is **not** wired. Why: (a) the tests require bounding, not removal; (b) on the
  troll wave (4+) a shore bird is GRABBED at the shore band (y211) before it can free-fall to
  lava depth (y230), and the grip's own `inLava` path already removes a gripped victim — so
  the clamp only governs the *non-gripped* backstop (principally **wave 3**: bridge burned,
  troll not yet active at TTROLL=4). A partial "vanish without a life-loss" would be *less*
  faithful than the ROM, so the death sequence is left for a follow-on. **Reviewer:** a
  non-gripped bird that stops flapping over wave-3 lava sits clamped at the surface rather
  than dying — flag if the owner wants the full lava-death this story.
- **Defect B is a solid molten FILL, reusing `kind:'fill'`** (blitOp's existing arm paints
  it — no new `kind:'lava'`, no `DrawOp`/`sim-contract` union change, no `main.ts` shell
  change). Colour = COLOR1 nibble 4 (the red-orange, byte 15 → r7 g1 b0); height = the CLIF5
  band (17 rows, y211..227). The animated LAVAB bubbling image and LAVAF flames
  (JOUSTRV4.SRC:2175, :1958) are **out of scope** (context) — this is the "minimal visible
  fix" the context scoped, and a pixel-faithful `LAVAB` transcription is the follow-on.
- **AC-B3 rise:** the fill is at the fixed shore band, not driven by the `SAFRAM`/`LAVA_START`
  per-wave rise. AC-5's "tracks the surface level and its per-wave rise" is met as
  *persistence across burned waves* (tested) but not as a moving surface Y. Deferred with the
  animated-lava follow-on; flagged for the owner if strict fidelity is wanted.
- **jt11-5 re-baseline:** its two "the burn removes both fills → 0 fills" assertions were
  tightened to "removes the **plank** fills (BRIDGE/BRIDG2)" — the lava fill now legitimately
  co-exists after the burn, so `length === 0` was a stale proxy for "planks gone." Behaviour
  checked is unchanged (planks must be removed); no weakening.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — lint 0, joust 3632/3632, orchestrator 494/494, 3 new files 17/17; no smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings (covered by Reviewer: clamp boundaries, grab-loop edges) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings (no try/catch or swallowed errors in diff) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings (covered by Reviewer + rule-checker #15/#18/#26 + worktree RED check) |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 2 (both ROM-verified myself), fixed |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | 0 (1 informational) | informational velY note → confirmed & fixed |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 4 (2 HIGH velY dup, 2 MEDIUM bound) | confirmed all, fixed |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled)
**Total findings:** 5 distinct confirmed (all fixed & re-verified), 0 dismissed, 0 deferred-unaddressed

## Reviewer Assessment

Round 1 found **two HIGH issues and three lower-severity ones**, all now fixed in commit
`5683e4a9` and independently re-verified (a develop worktree shows the reworked tests RED
without the feature; the full joust suite 3632/3632, orchestrator 494/494, lint 0 with it).
Because the pipeline ran in one session, the fixes were applied and verified in-phase rather
than bounced through a separate rework hand-off — every fix below is evidence-backed, not asserted.

### Confirmed findings (all fixed)

- **[RULE][DOC] FIDELITY — HIGH — the per-contact grab violated the ROM's `LAVNBR` one-troll
  invariant.** LNDB7 gates on `LDA LAVNBR / BNE LNDB7C` ("TOO MANY LAVA TROLLS? … DO NOT START
  ANOTHER") then `INC LAVNBR` (`JOUSTRV4.SRC:6767-6773`, read directly) — **one** lava troll in
  the whole game at a time, bound to the contacting entity (`PEXEC`→`PJOY`). My first pass spawned
  a *separate* troll per shore bird, coexisting with the once-per-wave CLIF5 troll, and the
  context spec's own words — "gated on TTROLL/LAVNBR like the ROM" — were not honoured. **Fix:**
  the grab now spawns only when `!processes.some(kind==='troll')`, bound to the first contacting
  bird; when a troll is already alive the bird falls to the FLOOR+7 lava death instead (LNDB7C
  "do not land"). Surfaced by `comment-analyzer` (the false "natural LAVNBR cap" comment) and
  confirmed against the ROM. `rule-checker` #18 *accepted* the original decoy design — this is
  the class of fidelity defect only the domain-comment lens + a source read catches.
- **[SEC][RULE] CORRECTNESS — HIGH — the FLOOR+7 clamp left `velY` growing unbounded.** The clamp
  pinned `posY` but never reset `velY`; `rule-checker` reproduced (9000-frame sim) an int16
  wraparound at ~frame 4063 that teleports a lava-pinned bird to the ceiling, `security`
  independently flagged the same shape, and my own `flap()`/`int16` read agreed. Reachable on
  wave 3 (bridge burned, troll not yet active). **Fix:** `velY: 0` at all three clamp sites
  (frame/enemy/egg) — a bird at the lava floor is not still accelerating; verified the wrap is gone.
- **[RULE] TEST — MEDIUM — loose clamp bound.** AC-A2/AC-A3 asserted `<= LOGICAL_HEIGHT` (240)
  where the real clamp is `DEATH_Y` (230); a mutant clamping to 239 survived. **Fix:** tightened
  both to `<= DEATH_Y`.
- **[DOC] — HIGH — `ADGFLR` should be `ADGCEI`.** The routine at `:6508-6509` is `ADGCEI`
  (`CMPA #FLOOR+7 / BHS ADGFLR`), which *branches to* `ADGFLR`; the pre-existing `arena.ts`
  comment already gets this right. **Fix:** corrected at all 3 sites.
- **[RULE] — LOW — `waveOrdinal` vs `wave`.** The grab read the pre-advance `waveOrdinal` while
  the sibling once-per-wave gate reads post-advance `wave`, grabbing one frame late on the 3→4
  boundary. **Fix:** now reads `wave`.

### Reviewer-found (not from a subagent)

- **[TEST] — the reframed AC-A1 "lone stander seized" test was vacuously green on develop.** A
  player-only wave *clears → advances → re-arms* the once-per-wave grab, which then binds the lone
  stander even with `trollArmed:false`. Caught by running the reworked tests in a develop worktree.
  **Fix:** a keep-alive buzzard (parked on the CLIF5 island — a platform, never a lava cell) holds
  the wave open; re-verified the test is now RED on develop, GREEN on HEAD.

### [VERIFIED] good

- `[VERIFIED]` core/shell purity preserved — `drawList`'s lava fill is a pure literal `DrawOp`
  push, the clamps are pure `EntityState`/`EggState`→same; no DOM/clock/entropy in `src/core`
  (rule-checker A1, and the existing `purity` suite stays green).
- `[VERIFIED]` determinism intact — the grab loop reads `processes` in order and uses the
  `boundVictims`/`find` results only by value; no `Math.random`, no Set-iteration-order output
  dependence. Every seeded-replay fixture in the suite stays green (rule-checker A2).
- `[VERIFIED]` id namespace collision-free — `0x15_0000 + id` is disjoint from the once-per-wave
  `0x100*wave+0xc0`, enemy (`≥256`), baiter (`0x30_0000+`) and player (1/2) ids (security §1, my
  own trace).
- `[VERIFIED]` lava not occluded — zero `BACKGROUND_RECORDS` occupy the shore-end band
  (x<54 / x≥240, y205-230), so the molten fill is visible (matching the felt "black span"); ran
  the enumeration directly.
- `[VERIFIED]` palette — COLOR1 nibble 4 = byte 15 → `paletteToRgba` r7 g1 b0 (molten red-orange),
  confirmed against `pictures.ts` + `render.ts` (comment-analyzer + my math).

### Devil's Advocate

Where could this still be broken? (1) The grab fires whenever a bird's feet resolve to `'troll'`
at the shore band — including a bird *flying low* over the burned lava, not just a stander. That is
arguably faithful (the lava troll reaches up), but a fast fly-through at y211 now gets seized; the
owner may want an "is settling/grounded" qualifier. Non-blocking — it never drops the bird
off-screen, which is the bug. (2) The lava death is still a *clamp*, not the ROM's full CPLYR
death (life loss / dissolve / respawn) — a bird can sit at the lava surface and flap out rather
than losing a life. This is the documented deviation, now clean (velY:0), and the LAVNBR gate makes
it the correct route for the "troll busy" case. (3) The Defect-B wiring `main.ts` scan for
`kind === 'fill'` is a whole-file positive anchor (rule-checker #25, LOW) — currently unique, but
if a second `fill` dispatch is ever added it stops discriminating; left as-is per proportionality,
noted for the next editor. None of these are Critical/High; the felt bug (off-screen fall + black
lava) is fixed and the fidelity gap the review exposed is closed.

### Rule Compliance (lang-review/typescript, exhaustive — via rule-checker + my read)

All 30 checklist rules + 4 project rules enumerated (rule-checker: 71 instances). Post-fix
violations: **0**. Notable: #14 (clamp applied symmetrically to all 3 airborne siblings — the
correct family pattern), #4 (`op.colour ?? 0 !== 0` correctly distinguishes real-0/black), #20
(README 188→191 bumped in the same commit as the 3 new files), #21 (velY degenerate case — FIXED),
jt9-30 (zero `.ts:line` comment refs), core/shell purity (A1 — clean).

### Deviation Audit

- **Kill-plane is a CLAMP, not the full lava-death sequence** → ✓ **ACCEPTED**: correct minimal
  scope; the tests require bounding, and with LAVNBR the clamp is now the faithful route for the
  "troll already active" case. velY:0 makes the rest state clean.
- **Defect B is a solid molten fill reusing `kind:'fill'`** → ✓ **ACCEPTED**: minimal visible fix
  the context scoped; animated LAVAB is a documented follow-on.
- **AC-B3 rise asserted softly** → ✓ **ACCEPTED**: persistence tested; moving surface Y deferred
  with the animated-lava follow-on. Owner may tighten.
- **jt11-5 re-baseline (plank fills)** → ✓ **ACCEPTED**: no weakening; retirement applied in both
  sites (rule-checker #24 confirms no stragglers).

### Verdict

**APPROVED.** No Critical or High issues remain — the two HIGH findings (LAVNBR fidelity, velY
wrap) are fixed and re-verified, the MEDIUM/LOW/DOC items closed, and the reworked tests proven
non-vacuous against a develop worktree. Full joust suite 3632/3632, orchestrator 494/494, lint 0.
Ready for finish.