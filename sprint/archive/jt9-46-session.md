---
story_id: "jt9-46"
jira_key: "jt9-46"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-46: Enemy buzzards are drawn RIDERLESS — draw the DPLYR knight rider per enemy species (the buzzards carry PLYR3/4/5, JOUSTRV4.SRC:109)

## Story Details
- **ID:** jt9-46
- **Jira Key:** jt9-46
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)
- **Branch:** main
- **PR:** none (trunk-based — commits d913b42 landed directly on origin/main)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-05T20:28:34Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-05T20:08:28Z | 2026-08-05T20:10:25Z | 1m 57s |
| red | 2026-08-05T20:10:25Z | 2026-08-05T20:21:30Z | 11m 5s |
| green | 2026-08-05T20:21:30Z | 2026-08-05T20:24:04Z | 2m 34s |
| review | 2026-08-05T20:24:04Z | 2026-08-05T20:28:34Z | 4m 30s |
| finish | 2026-08-05T20:28:34Z | - | - |

## SM Assessment

Story jt9-46 is well-specified and ready for RED. It is a render-selection port: add a
pure `enemyDrawList(p)` mirroring `playerDrawList` so every `kind:'enemy'` process draws
its DPLYR rider stacked on the buzzard mount, fixing both playtest reports (no riders;
"only buzzards") in one mechanism.

**Critical for TEA (RED phase):**
- The bounder/hunter/shadow-lord → PLYR3/4/5 mapping MUST be read from the vendored
  PxDEC DPLYR fields (JOUSTRV4.SRC field 6 / offset 10, rows :5560/:5564/:5568/:5572),
  NOT transcribed from the filing. Vendored tree lives in the sibling **a-2** checkout;
  suites degrade to committed fixtures on CI via `vendoredAvailable` (see the joust-source
  helper and the sibling oracle audio-ptero-wing-source.test.ts:132-139).
- AC-5's on-buzzard alignment (POSOFF word 751, authored over ostrich/stork) is a HUMAN
  visual-verification point — the reviewer needs a `just serve` screenshot at `/joust/`,
  not a unit-test claim.

**Descope to file at finish (SM owns):** `remountEnemyProcess` (demo.ts:1056-1082)
hardcodes `type:'bounder'`, so a hatched hunter/shadow-lord remounts — and now visibly
re-rides — as a bounder. That is a SIM bug this story makes more visible but must not
absorb. Recommended follow-up **jt9-47**; file it if AC-4 confirms the descope.

Routing to TEA (Tyr One-Handed) for RED.

## TEA Assessment

RED committed (8175ca1). New suite `plugins/joust/tests/demo-jt9-46.test.ts`: **10 tests,
3 pass (the vendored oracle), 7 red on the absent `enemyDrawList` export.** Full joust
project: 7 failed / 2793 passed — no collateral. `npm run lint` clean.

**THE MAPPING WAS READ FROM THE ROM, not the filing.** The vendored tree IS present in
this checkout (`reference/williams-source/joust`), so Group 1 passed on arrival. I read
each buzzard decision block's DPLYR field (offset 10 / field 6, verified by walking the
DJOY..DPLYR RMB run) directly out of JOUSTRV4.SRC:
- **P4DEC** DSMART=BOUNDR (bounder brain :3787) → DPLYR = **PLYR3**
- **P5DEC** DSMART=B2UNDR (hunter brain :3971) → DPLYR = **PLYR4**
- **P6DEC** DSMART=SHADOW (shadow-lord brain :4230) → DPLYR = **PLYR5**
- **P7DEC** DSMART=PTERO → DPLYR = **0** (the ptero has no rider — the control)

This matches the port's own `brainFor` (bounder→boundr, hunter→b2undr, shadowLord→shadow,
demo.ts:541-549), so the species↔block correspondence is sound. PLYR3/4/5 already exist in
ENTITY_RECORDS at position word 751 (pictures.ts:1696-1698) — no new pixel data needed.

**What GREEN (Dev) must build** — a pure `enemyDrawList(p): string[]` in demo.ts returning
`[enemyFrame(p), <PLYR3|4|5 by p.enemyType>]`, and change `drawList`'s enemy branch
(demo.ts:2352-2354) to LOOP it (like the player branch :2347-2351) so both ops are emitted,
each `entityOp`-placed and facing-tagged. The remount buzzard (`remountEnemyProcess`) is a
`kind:'enemy'` process, so it is covered with no special case (AC-4). Export
`enemyDrawList`; `posOffset`/`enemyFrame`/`drawList` already exist.

**Mutation coverage:**
- AC-1 (drop the rider op → single mount op): `drawList emits BOTH ops` asserts exactly 2
  entity ops per enemy → reddens. Facing varied both directions.
- AC-2 (swap two species' riders): Group 3 pins each exact rider + distinctness → reddens.
- AC-5 (rider at feet / zero offset): asserts `riderOp.{x,y} === feet ± posOffset(rider)`
  AND `off.yoff !== 0` control → a feet-drawn rider reddens.

**Rule Coverage:** No `.claude/rules/*.md` or lang-review checklist for TS in this repo
beyond the core-purity boundary — `enemyDrawList` lives in the pure render-SELECTION seam
(returns frame-name DATA, no `window.`/`document.`), so the existing purity scanner guards
it. The story authors zero new pixel data (AC-3), so the byte-gate/denylist are untouched;
no new rule test was warranted beyond the AC rails.

**Carried forward for the Reviewer:** AC-5's EXACT on-buzzard alignment (751 was authored
over the ostrich/stork mount, not the BR* body) is a HUMAN visual-verification point — the
unit test pins the POSOFF is applied, NOT that it looks right. Needs a `just serve`
screenshot at `/joust/`. And SM owns filing the **jt9-47** remount-species descope at finish.

Routing to Dev (Loki Silvertongue) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/joust/src/core/demo.ts` — added pure `enemyDrawList(p)` + `ENEMY_RIDER` map
  (bounder→PLYR3, hunter→PLYR4, shadowLord→PLYR5), and changed `drawList`'s enemy branch
  to LOOP it (mount + rider), each `entityOp`-placed and facing-tagged — mirroring the
  player branch. 37 insertions, 1 deletion.

**Tests:** 10/10 jt9-46 green. Full joust project **2800/2800** (132 files) — no regressions.
`npm run lint` clean.
**Commits:** 8175ca1 (RED, TEA) · d913b42 (GREEN) — both pushed to origin/main.
**Branch:** main (trunk-based).

**How it was kept minimal:** exactly the TEA-specified shape. The rider map is the ROM's
DPLYR field; PLYR3/4/5 already existed in ENTITY_RECORDS at position 751, so zero new pixel
data (AC-3 holds — purity scanner and byte-gate untouched). No existing render test counted
enemy ops (they assert `> 0` on the facing), which is why 2-ops-per-enemy caused no drift.

**⚠ OPEN FOR REVIEW — the human visual check (AC-5).** The unit tests pin that the rider op
carries PLYR*'s POSOFF (position 751), NOT that it looks aligned on the buzzard. 751 was
authored over the ostrich/stork mount, not the BR* body, so the exact on-buzzard placement
needs eyes: `just serve` → `/joust/`, start a game (wave 1 = three bounders, riders visible
immediately), confirm a red knight sits ON each buzzard, not at its feet or floating. I did
NOT run this — it is the Reviewer/human obligation the story called out.

**Handoff:** To Reviewer (Heimdall).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 (a data-note, not a defect) | confirmed 0, dismissed 1, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — done by hand (enemy-constructor enumeration) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — assessed by hand (the `?? 'bounder'` default) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — replaced by a 5-mutation battery (M1–M5) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — docstring checked by hand |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — assessed by hand |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — n/a (pure render selection, no I/O) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — assessed by hand |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — purity/AC-3 checked by hand |

**All received:** Yes (1 enabled subagent returned; 8 disabled via settings, covered by hand + mutation battery)
**Total findings:** 0 confirmed, 1 dismissed (with rationale), 0 deferred

### Mutation battery (replacing the disabled test-analyzer — MEMORY: reviewer subagents disabled → mutate)
Every AC guard proven non-vacuous by reverting the fix and confirming the intended test reddens; unmutated control stays 10/10 green:
- **M1** — `enemyDrawList` returns `[enemyFrame(p)]` (drop the rider, the exact pre-story regression): **7 red** (all port-side rails). Proves AC-1.
- **M2** — swap bounder↔hunter in `ENEMY_RIDER`: **1 red** (AC-2 exact-mapping test). Proves AC-2 mapping.
- **M3** — all species → `PLYR3` (one rider for everyone): **2 red** (AC-2 mapping + distinctness). Proves AC-2 distinctness.
- **M4** — hardcode the enemy op facing to `1`: **1 red** (AC-1 facing, left case). Proves facing is data, both directions.
- **M5** — draw enemy sprites AT THE FEET (bypass `entityOp`/POSOFF): **1 red** (AC-5). Proves the rider's POSOFF-751 lift is asserted, not decorative.

### Rule Compliance
Applicable rules (CLAUDE.md, no `.claude/rules/*.md` or TS lang-review checklist in this repo):
- **Core purity boundary** (the single most important rule; scanned mechanically per game): `enemyDrawList` and `ENEMY_RIDER` live in `plugins/joust/src/core/demo.ts`, return frame-name DATA, and contain no `window.`/`document.`/DOM/clock reference. The purity/`sim-clock-free` scanner is part of the 2800 green. **Compliant.**
- **No new pixel data (AC-3):** `ENEMY_RIDER` references the already-transcribed `PLYR3/4/5` ENTITY_RECORDS (pictures.ts:1696-1698); the diff adds zero byte/colour literals. Byte-gate and denylist untouched. **Compliant.**
- **Extract-only-on-second-use / minimalism (CLAUDE.md):** the change mirrors the existing `playerDrawList` seam exactly rather than inventing an abstraction. **Compliant.**

### Devil's Advocate
Let me argue this code is broken. First: the `p.enemyType ?? 'bounder'` default is a silent fallback — if any code path builds a `kind:'enemy'` process WITHOUT setting `enemyType`, the game silently draws a bounder's red knight on what might be a hunter or lord, and no error fires. That is exactly the class of bug the silent-failure-hunter exists to catch. Is it real? I enumerated every `kind:'enemy'` construction in `src/core`: `enemyProcess` (demo.ts:580, sets `enemyType: type`) and `remountEnemyProcess` (demo.ts:1092, sets `enemyType: type`='bounder'). There are no others — frame.ts:104 is a type comment. So the default is unreachable today; it is defensive on an optional field, matching the sibling precedent `p.mount ?? 'ostrich'` in `playerDrawList`. Not a defect.

Second: the preflight noted "mount and rider share identical posX/posY/facing — no POSOFF-751 offset applied in code." If true, the rider draws at the mount's exact origin and AC-5 is a lie. But `entityOp` (demo.ts:2314-2318) applies `posOffset(name)` PER NAME: `x = posX + xoff, y = feetY − yoff`. Mount and rider are handed the same FEET but resolve DIFFERENT offsets by their own record — the mount its BR* offset, the rider PLYR3's (2, 17). M5 confirms it: forcing a feet-draw reddens AC-5. The preflight read the call site and missed the helper. Dismissed.

Third: could the two ops draw in the wrong z-order (rider under mount)? `enemyDrawList` returns `[mount, rider]` and the loop pushes in that order into `entities`, which `drawList` concatenates back→entities→fore — so the rider is pushed AFTER the mount and blits on top, matching the player path and the ROM's "bird then rider." Correct.

Fourth: a confused user seeing the wrong-coloured knight? The colour is the transcribed COLOR1 nibble baked in the existing atlas records, not authored here. Fifth, the real residue: whether xoff=2/yoff=17 — authored over the ostrich/stork mount, position 751 — places the knight PLEASINGLY on the *buzzard* body is not decidable by any unit test. That is the one genuine open item, and the story already scoped it as a human check. Nothing here rises to Critical/High.

### Observations
- **[VERIFIED]** POSOFF-751 lift is applied to the rider — evidence: `entityOp` (demo.ts:2314-2318) computes `x=posX+xoff, y=feetY−yoff` from `posOffset(name)`; `posOffset('PLYR3')` = {xoff:2, yoff:17} (position word 751). AC-5 asserts exactly this and M5 (feet-draw) reddens it. Refutes the preflight's "no offset applied" note.
- **[VERIFIED]** every `kind:'enemy'` process sets `enemyType` — evidence: demo.ts:580 (`enemyProcess`) and :1092 (`remountEnemyProcess`); grep found no other constructor. The `?? 'bounder'` default is unreachable, so no species is mis-rendered.
- **[VERIFIED]** the species→rider map is the ROM's, not a guess — evidence: the vendored oracle (Group 1, passing in this checkout) reads DPLYR out of P4DEC/P5DEC/P6DEC directly; `ENEMY_RIDER` matches (bounder→PLYR3, hunter→PLYR4, shadowLord→PLYR5).
- **[VERIFIED]** z-order mount-under-rider — evidence: `enemyDrawList` returns `[mount, rider]`, pushed in order; matches `playerDrawList` and the ROM's bird-then-rider.
- **[VERIFIED]** AC-4 remount coverage with no special case — evidence: the enemy branch loops `enemyDrawList` for ALL `kind:'enemy'` processes; the AC-4 test drives a real egg→remount and finds 2 ops. `remountEnemyProcess` gets its rider free.
- **[VERIFIED]** AC-3 no new pixel data — evidence: diff adds only string references to existing PLYR3/4/5 records; purity scanner + byte-gate green in the 2800.
- **[LOW / carried forward, NOT blocking]** AC-5 exact on-buzzard *visual* alignment (751 authored over ostrich/stork) is a HUMAN check — needs `just serve` → `/joust/`, wave 1 (three bounders, riders visible at once), confirm the red knight sits on the buzzard body. The transcribed POSOFF is applied correctly; only the aesthetic fit is unprovable by unit test.

### Not from this story (noted, not blocking)
The joust vitest run's citation-gate step emitted 3 errors from a `jt1-9-empty-*` temp directory — pre-existing tooling noise, outside this diff, no effect on the 132/132 file pass.

## Reviewer Assessment

**Verdict:** APPROVED
**Data flow traced:** a wave enemy's `enemyType` → `enemyDrawList` picks `ENEMY_RIDER[type]` → `drawList` loops `[mount, rider]` → `entityOp` applies each name's own POSOFF and the enemy's facing → two `entity` DrawOps the shell blits (rider on top, mirrored for a left-facer). Safe because the selection is pure DATA and every enemy constructor supplies `enemyType`.
**Pattern observed:** faithful mirror of the `playerDrawList` seam (demo.ts:2269-2278) — the minimal, convention-matching fix; no new abstraction.
**Error handling:** the only branch is `p.enemyType ?? 'bounder'`, a defensive default on an optional field that is unreachable in practice (both constructors set it) — matches the `p.mount ?? 'ostrich'` precedent.
**Required human follow-up (non-blocking):** AC-5 visual alignment via `just serve` at `/joust/`.
**SM finish obligation:** file **jt9-47** (remount hardcodes `type:'bounder'`, now visibly re-rides wrong) per the descoped-findings rule.
**Handoff:** To SM (Baldur the Bright) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Reviewer (code review)
- **Gap** (blocking-at-finish, SM-owned): `remountEnemyProcess` hardcodes `type:'bounder'`
  (demo.ts:1066-1068), so a hatched hunter/shadow-lord remounts — and now, after this story,
  VISIBLY re-rides — as a bounder, losing its species (the ROM keeps PID/PEGG, :3251-3252).
  A SIM bug this story makes more visible but correctly did NOT absorb. File as **jt9-47** at
  finish per the descoped-findings rule. *Found by Reviewer during code review.*
- **Question** (non-blocking): AC-5's exact on-buzzard alignment (POSOFF word 751, authored
  over the ostrich/stork mount, not the BR* body) needs a HUMAN `just serve` screenshot at
  `/joust/` — the unit tests prove the POSOFF is applied, not that it looks right.
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- No deviations from spec. Implemented the TEA-specified `enemyDrawList` shape exactly;
  the `p.enemyType ?? 'bounder'` default only handles the type-optional field (every enemy
  process — including the remount — sets enemyType), it does not alter any specified behaviour.
  → ✓ ACCEPTED by Reviewer: confirmed both `kind:'enemy'` constructors (demo.ts:580, :1092)
    set `enemyType`, so the default is unreachable and matches the `p.mount ?? 'ostrich'`
    precedent in `playerDrawList`. No undocumented deviations found in the diff.

### Reviewer (audit)
- No undocumented spec deviations. The implementation matches every AC and the TEA spec; the
  one residual (AC-5 exact visual alignment) is a scoped human check, not a deviation.