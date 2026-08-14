---
story_id: "ml7-8"
jira_key: "ml7-8"
epic: "ml7"
workflow: "tdd"
---
# Story ml7-8: Enemy PRESENCE voices + secondary ROM-input threading

## Story Details
- **ID:** ml7-8
- **Jira Key:** ml7-8
- **Workflow:** tdd
- **Epic:** ml7 (Millipede — phase machine, runtime wiring, HUD, showcase)
- **Stack Parent:** none
- **Branch:** feat/ml7-8-enemy-presence-voices
- **PR:** #394 (code PR feat/ml7-8-enemy-presence-voices → develop; awaiting user merge)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-14T21:40:22Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-14T20:19:55Z | 2026-08-14T20:21:07Z | 1m 12s |
| red | 2026-08-14T20:21:07Z | 2026-08-14T20:45:49Z | 24m 42s |
| green | 2026-08-14T20:45:49Z | 2026-08-14T21:28:48Z | 42m 59s |
| review | 2026-08-14T21:28:48Z | 2026-08-14T21:40:22Z | 11m 34s |
| finish | 2026-08-14T21:40:22Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA] Gap, non-blocking — AC4 BEETLA is a depleting per-wave budget, not modeled.** The context AC4 ("only the allowed number of beetles live at once") describes the CONCURRENCY cap, which `enemies/beetle.ts` already enforces via `beetleAllowed(score2)` — my `beetle-quota.test.ts` pins it green. BUT the ROM's BEETLA (`beetle.ts:69` "beetles still allowed **this wave**") is a SEPARATE quantity: a per-wave budget that decrements on each spawn (`beetle.ts:151`, :288) and resets each wave. The adapter recomputes `counts.allowed = beetleAllowed(view.score2)` **every frame** (`enemies/beetle.ts:72`), so the decrement is thrown away and BEETLA never depletes across a wave. GameState/sim persist no beetle budget (grep confirmed). Threading a real per-wave BEETLA needs the ROM's per-wave reset value — **route to Architect/Dev to confirm scope**: is AC4 satisfied by the concurrency cap (context's wording), or does the title's "thread the BEETLA per-wave quota" require persisting+resetting the budget on GameState? I did not fabricate a RED test against unpinned semantics.
- **[TEA] Note — AC3 is documentation + regression guard, no code RED.** The four fliers (bee/dragonfly/mosquito/earwig) already correctly share MOBJ slot 12 and are each a one-element MOBJ (`flier-slot-sharing.test.ts` green). Dev's AC3 work is the reconciling comment in the module headers; the guard reddens if a flier is renumbered off 12.
- **[TEA] Note — AC2 has a compile-time half (intended RED in `npm run lint`).** `secondary-inputs.test.ts` references `view.score1/dead/slow/mushTop/beetles`, which do not yet exist on `EnemyView` (contract.ts:21) — so `tsc --noEmit` is RED until Dev extends the contract. This is deliberate: the failing compile IS the "EnemyView must carry these inputs" assertion. When Dev adds the fields AND threads them from `sim.ts`'s view builder (sim.ts:139) into each adapter (replacing every `: 0, // TODO(ml7-2 fidelity)`), lint goes green and the behavior tests pass.

### Reviewer (code review)

- **[Reviewer] Improvement, non-blocking — `PRESENCE_VOICES` element type should be `LoopVoice`, not `string`.** `sim.ts:78` types the table `ReadonlyArray<readonly [keyof Roster, string]>`; widening the root to `string` is the sole reason the `event(\`${root}-start\` as GameEventKind)` / `-stop` casts at `sim.ts:212-213` are needed. Confirmed by `reviewer-rule-checker` (probe-compiled with the 2nd element retyped `LoopVoice` against the real `tsconfig.json` → zero errors, casts removable) and `reviewer-security` (a future root typo degrades safely — `audio-dispatch.ts:32` `if (sound === undefined) continue`, no crash). The in-repo sibling **centipede** already does this cast-free: `plugins/centipede/src/core/sim.ts:406-411` `loopEdges(voice: LoopVoice, …)`. Non-blocking because all seven roots are spelled correctly today (zero current defect), but the sim-side per-creature emission is liveness-tested only for `beetle` (`presence-voices.test.ts`), so the type is the only guard on the other six roots — and it is currently absent. **Fix:** change `sim.ts:78` to `readonly [keyof Roster, LoopVoice]` (import `LoopVoice` from `./events`) and drop both `as GameEventKind` casts. Affects `plugins/millipede/src/core/sim.ts`. *Found by Reviewer during code review.*
- **[Reviewer] Note — `EVENT_SOUND`/`EVENT_KINDS` exhaustiveness is enforced; `PRESENCE_VOICES` is NOT.** `Record<GameEventKind, EffectName>` makes a missing shell mapping a compile error, but `PRESENCE_VOICES` (sim.ts) is a plain literal array — a future 8th roster creature would compile fine while silently getting no presence voice. Roster is ROM-fixed at 7, so this is low risk; recorded for the same follow-up as the type finding above. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **[Dev] DEAD and CENTIN are threaded from the SAME live-segment count.** The port's GameState models the centipede as a `segments` array only — there is no separate configured-length CENTIN vs live-count DEAD. Both `spider.ts:94` and `EnemyView.centin` cite "remaining/live centipede segments", so the sim threads `dead = centin = state.segments.filter(isLive).length`. Consequence: the bee's BE-5..7 bombing-mode direct-spawn (`dead===0 && beetles!==0 && centin>=10`) can never fire (dead===0 ⇒ live===0 contradicts centin>=10) — but it never fired before either (beetles was hardcoded 0), and the ROM branch is a rare edge. Faithful to the port's single-quantity model.
- **[Dev] bee's `mush` (lower-band MUSH[0]) left at 0 — out of ml7-8 scope.** ml7-8's named field is `mushTop` (MUSH+2, top band). The bee's mushroom-need gate (BE-8/9) reads the LOWER band, a different quantity EnemyView doesn't carry. Re-tagged `TODO(ml7-8 fidelity)` in `bee.ts` as a precise follow-up; unchanged behaviour (was already 0).
- **[Dev] mushTop is recomputed by a full-field scan each frame** (`countTopMushrooms`, sim.ts). The ROM keeps a running MUSH register (musher INC / mushdc DEC); the port derives the same quantity from `field` (960 cells, trivial). Simplest correct source.
- **[Dev] SLOW modeled as a GameState countdown.** Added `GameState.slow` (init 0), armed to `INCHWORM_SLOW` (0xE0) on an inchworm SHOT kill (detected by a live-count drop across shootRoster, distinct from an offscreen exit), decremented 1/frame. Threaded to `view.slow`. This realizes the seam inchworm.ts flagged as "emitted by sim.ts".
- **[Dev] AC4 depleting per-wave BEETLA NOT implemented** — per TEA's finding, scope belongs to the Architect. The concurrency cap (already enforced) is guarded green; the per-wave budget rework is untouched.
- **[Dev] Existing enemy-test fixtures + 3 ml7-2 inchworm cases updated** for the extended (now required) EnemyView contract: every `enemies/*.test.ts` view() gains `score1/dead/slow/mushTop/beetles: 0` defaults, and the three inchworm spawn cases pass the real DEAD byte (`dead: 1`) instead of relying on the retired CENTIN proxy. Test INTENT preserved.

### Reviewer (audit)

- **[Dev] DEAD ≡ CENTIN single-quantity model** → ✓ ACCEPTED by Reviewer: faithful to the port's `segments`-only model; the unreachable bee BE-5..7 branch never fired before either, so no behavioural regression. Agrees with author reasoning.
- **[Dev] bee's lower-band `mush` left at 0** → ✓ ACCEPTED by Reviewer: `mushTop` (MUSH+2, top band) is a genuinely different quantity from the bee gate's MUSH[0] (lower band); verified against `mushroom.ts:46-49` (`lower` vs `top`). Correct to re-tag as a precise `TODO(ml7-8 fidelity)` rather than mis-thread the top count.
- **[Dev] mushTop recomputed by full-field scan each frame** → ✓ ACCEPTED by Reviewer: `countTopMushrooms` uses the canonical `addr & 0x1f` row extraction (matches `mushroom.ts:52-53 rowOf`) and `>= TOP_MIN`; O(960)/frame, pure, deterministic. Equal to the ROM's running MUSH[2] under normal play. (Low-interest edge: a full mushroom at row 0x1f would be counted here but `musher` never places one there — not reachable in practice; noted, not flagged.)
- **[Dev] SLOW as a GameState countdown, armed by a live-count drop across shootRoster** → ✓ ACCEPTED by Reviewer: the heuristic is sound — `shootRoster` removes at most one creature, so an inchworm-band drop between post-step and post-shot is unambiguously a SHOT kill (offscreen exits already happened in `stepRoster`). `inchwormKill`'s own `slow` return is dropped at the roster aggregation (pre-existing, ml7-2), so the sim's independent recompute is the correct realization of the seam. Matches ROM re-arm to 0xE0.
- **[Dev] AC4 depleting per-wave BEETLA NOT implemented** → ✓ ACCEPTED by Reviewer: the concurrency ceiling AC4's context wording describes IS enforced (`beetleAllowed`, guarded green by `beetle-quota.test.ts`); the depleting per-wave budget is a separate quantity correctly routed to the Architect (TEA Delivery Finding). Legitimate, documented descope — not an oversight.
- **[Dev] enemy-test fixtures + inchworm proxy cases updated** → ✓ ACCEPTED by Reviewer: mechanical contract extension; the three inchworm cases now pass the real `dead: 1` instead of the retired CENTIN proxy — test intent preserved, verified in the diff.
- **[Reviewer audit] UNDOCUMENTED — AC3 body text ("singleton, not shared by any other creature") is contradicted by the ROM and by the implementation.** The context AC3 sub-bullet says to document slot 12 as a dragonfly SINGLETON, but the ROM shares BEEC+12 across all four fliers (bee/dragonfly/mosquito/earwig, all `_SLOT === 12`, verified) — which is what the story TITLE ("reconcile the fliers SHARING MOBJ slot 12") and the implementation (`roster.ts` deviation header + `flier-slot-sharing.test.ts`) correctly capture. The AC3 body's "singleton" wording is a sm-setup artifact; the code followed the ROM (ROM always wins). Also: AC3 said "add a comment in dragonfly.ts" — the doc went to `roster.ts` instead (the flier-threading home, a better placement; `dragonfly.ts:41` already carries the BEEC+12 cite). Severity: L — correct per ROM, documented, guarded; recording the AC-vs-ROM discrepancy so it is not read as an implementation miss.

## Dev Assessment

GREEN phase complete for ml7-8. Implementation committed at 374a3a80 on `feat/ml7-8-enemy-presence-voices`.

**Verified green (real command output):**
- `npx vitest run --project millipede` → **1176 passed / 0 failed** (was 9 RED).
- `npx vitest run` (whole fleet) → **16308 passed, 1 todo, 0 failed** — no cross-app regression.
- `npm run lint` (tsc --noEmit, repo-wide) → **clean** (the intended AC2 compile-time RED is now resolved by the contract extension).
- `npm run test:orchestrator` → **498 passed / 0 failed**.

**What shipped (20 files, +223/-49):**
- **AC1** — `events.ts` (7 creature `-start`/`-stop` pairs + `LoopVoice`), `audio.ts` (`EVENT_SOUND` maps both edges → the creature's own CHAN slot), `sim.ts` (edge emission: snapshot each band's live-state BEFORE `stepRoster` because the reducers mutate slots in place — the aliasing bug I hit and fixed — then compare to the final roster).
- **AC2** — `contract.ts` (`EnemyView.score1/dead/slow/mushTop/beetles`), `sim.ts` view builder threads them from real state + the SLOW timer + `GameState.slow`, and the five adapters READ them (spider, bee, dragonfly, mosquito, inchworm).
- **AC3** — the shared-slot-12 deviation documented in `roster.ts` (guarded by the flier test).
- **AC4** — left as the guarded concurrency cap; the per-wave BEETLA budget is a flagged Architect-scope follow-up (Delivery Findings), deliberately NOT implemented.

**Deviations logged above** — the load-bearing ones for the reviewer: DEAD≡CENTIN (single-quantity port model), bee's lower-band `mush` still 0 (out of the mushTop scope), SLOW as a GameState countdown, and the fixture/inchworm-proxy test updates the required-contract extension forced.

**For the Reviewer (Zorg):** the presence-emission aliasing (snapshot-before-mutate) is the subtlest bit — worth a hard look. AC4's non-implementation is intentional and flagged, not an oversight. Ready for review.

## Tea Assessment

RED phase complete for ml7-8. Four new test files on `feat/ml7-8-enemy-presence-voices`, committed at 01a71bf1.

**Suite state:** full millipede project = 9 failed / 1164 passed (the 9 are exactly the new RED tests; no regressions). New files in isolation: 9 fail, 11 pass.

### AC coverage

- **AC1 — per-creature PRESENCE voices** (`presence-voices.test.ts`, 4 RED / 2 green):
  - RED: `EVENT_KINDS` must declare `<creature>-start`/`-stop` pairs for all seven creatures (events.ts); `EVENT_SOUND` must map both edges of each to that creature's own CHAN slot (audio.ts); and — the LIVENESS anchor (memory: "a feature must be observed in play") — `stepGame` must emit `beetle-start` on the vacant→live edge and `beetle-stop` on the live→vacant edge. The two sim tests are DETERMINISTIC (forced beetle spawn via the BEETL gate; forced beetle offscreen-exit) with a vacuity guard proving the edge actually occurred — an earlier random-play version was flaky (idle play rarely spawns before the player dies) and was replaced.
  - Green: the existing march `-start`/`-stop` pair-balance invariant still holds with the new voices; loop-voice classification roots each edge at the creature name.
- **AC2 — secondary ROM-input threading** (`secondary-inputs.test.ts`, 5 RED / 1 green): EnemyView must carry `score1/dead/slow/mushTop/beetles` (compile-time RED in `tsc`), and each adapter must READ them so the reducers' already-proven gates fire: SLOW → mosquito & dragonfly wing-flap on an even frame (MQ-11/DF-13/14/15), DEAD/BEETLS/MUSH+2 → dragonfly glut spawn-veto (DF-5..8), and the real DEAD byte → the inchworm entry gate (IW-8), which the ml6-2 CENTIN proxy gets wrong BOTH ways (admits when DEAD=0 & CENTIN>0; refuses when DEAD≠0 & CENTIN=0). Black-box seam tests — no GameState internals named.
- **AC3 — slot-12 reconciliation** (`flier-slot-sharing.test.ts`, 2 green guards): pins the shared-slot identity + one-MOBJ-per-flier shape. Documentation task for Dev; see Delivery Findings.
- **AC4 — beetle quota** (`beetle-quota.test.ts`, 3 green guards): concurrency ceiling never exceeded across a 4000-frame run at two score tiers, non-vacuous. **The depleting per-wave BEETLA budget is a genuine gap — see Delivery Findings; scope confirmation needed before Dev.**

### For Dev (Korben)
The AC1/AC2 wiring is the real work; AC3/AC4 are guards + one doc comment + a scope question. Adding EnemyView fields turns `tsc` green and unblocks the AC2 behavior tests. Thread the view fields from `sim.ts:139` and replace every `: 0, // TODO(ml7-2 fidelity)` in `enemies/*.ts`. Emit the presence edges in `sim.ts` alongside the march edges (step 12), comparing prev vs stepped per-creature live counts. **Do not start the AC4 budget rework until the Architect confirms scope.**

Ready for the green phase.

## Sm Assessment

Setup complete for ml7-8 — enemy PRESENCE voices + secondary ROM-input threading, a phase 6-7 fidelity follow-up carved out of ml7-2/ml6-2. Four ACs written to `sprint/context/context-story-ml7-8.md`:

1. Per-creature PRESENCE voices (CHAN0/3/4/5/7/8/9) start when creatures are live (today only CHAN1 march + CHAN2 kill/explosion emit).
2. Secondary EnemyView inputs (score1/dead/slow/mushTop/beetles…) threaded from real core state (today hardcoded 0).
3. Fliers/dragonfly MOBJ slot 12 deviation reconciled + documented.
4. BEETLA per-wave quota threaded into beetle spawning.

**TEA (Leeloo), verify against source before pinning:** the context file cites specific ROM/code anchors (`dragonfly.ts:11`, `BEEC+12`, score→quota thresholds `0/1/2 @ 0/5K/10K`). sm-setup is known to fabricate citations — start from `grep TODO(ml7-2 fidelity) plugins/millipede/src/core/enemies/` to enumerate the real unwired seams, and confirm the CHAN table / sweep order against `plugins/millipede` ml6 sound driver (memory: sweep order is REVERSED; MLSUB.MAC is .RADIX 16 so thresholds are hex). Ready for red phase.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 1674 tests green, lint clean, orchestrator green; 5 type-assertions (event casts + fixtures) | confirmed 0, dismissed 0, deferred 0 — mechanical baseline GREEN |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered by Reviewer (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered by Reviewer (see [SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered by Reviewer (see [TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered by Reviewer (see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered by Reviewer (see [TYPE]) |
| 7 | reviewer-security | Yes | findings | 1 (LOW): `as GameEventKind` cast unchecked; downstream degrades safely | confirmed 1 (non-blocking), dismissed 0 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered by Reviewer (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | findings | 2 (HIGH conf): both = the `PRESENCE_VOICES: string` root cause → the two casts; all else (purity, rng order, EVENT_SOUND exhaustiveness, `slow` field) clean | confirmed 1 issue (non-blocking, same root cause as SEC), dismissed 0 |

**All received:** Yes (3 enabled returned; 6 disabled pre-filled as Skipped and hand-covered)
**Total findings:** 1 confirmed (non-blocking — three independent sources converge on one root cause), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

Three enabled subagents (preflight, security, rule-checker) plus hand-coverage of the six disabled specialists. Preflight is fully green (1674 tests, lint clean, orchestrator clean). No Critical or High issues. One confirmed, non-blocking type-safety finding, corroborated independently by security, rule-checker, and my own reading.

**Observations (≥5, tagged by source):**

- **[VERIFIED] Presence-emission snapshot-before-mutate is correct** — `sim.ts` computes `presenceBefore = PRESENCE_VOICES.map(([key]) => liveSlots(state.roster[key]) > 0)` (eager, reduces to booleans) BEFORE `stepRoster`, which mutates the slot arrays in place and returns the same references. The snapshot therefore captures the pre-step live-state even though `state.roster[key]` aliases the stepped roster. This was Dev's flagged "subtlest bit" — it is handled correctly. Evidence: the `.map` at the line above `const stepped = stepRoster(...)`.
- **[VERIFIED] Determinism / rng call order preserved** — the five new `EnemyView` fields (`score1/dead/slow/mushTop/beetles`) are pure derivations of `state` (score, live-segment count, `state.slow`, a field scan, a roster count); none draw rng. `countTopMushrooms`, `liveSlots`, and `presenceBefore` read `state.field`/`state.roster` only. No `nextInt` call sites added or reordered (rule-checker grep-confirmed; roster fixed step order unchanged). RNG stream is byte-identical per frame.
- **[VERIFIED] SLOW arming is sound** — `inchwormShotKilled = liveSlots(roster.inchworms) < inchwormsAfterStep` where `inchwormsAfterStep` is captured post-`stepRoster`/pre-shot. `shootRoster` removes at most one creature, so a drop across it is unambiguously a shot kill (offscreen exits already happened in `stepRoster`). Re-arms to `INCHWORM_SLOW` (0xE0), else `Math.max(0, state.slow - 1)`. Matches ROM IW-34/37. `game-state.ts:122` initializes `slow: 0`.
- **[SEC] Core purity preserved (LOW: unchecked event cast — non-blocking)** — no `Date.now`/`Math.random`/DOM/audio/storage in any touched core file (grep + the `purity|core-boundary|sim-clock-free` suite, 51 passed). The one security note is the `as GameEventKind` cast; security confirmed the downstream `audio-dispatch.ts:32` `if (sound === undefined) continue` degrades safely (a bad kind = a silently-missing sound cue, never a crash, no visual flash → no epilepsy-gate impact).
- **[RULE] / [TYPE] `PRESENCE_VOICES` element typed `string` instead of `LoopVoice` (MEDIUM, non-blocking, confirmed)** — `sim.ts:78`. Rule-checker matched typescript.md #1 (type-safety escapes) and #2 (imprecise types), proved the fix compiles clean against the real tsconfig, and cited the in-repo sibling `centipede` (`plugins/centipede/src/core/sim.ts:406-411`, `loopEdges(voice: LoopVoice, …)`) doing it cast-free. Confirmed (a rule-matching finding cannot be dismissed), rated MEDIUM: all seven roots are correct today so there is no current defect, and the value degrades safely — but it does not meet the Critical/High blocking bar. Filed as a non-blocking Delivery Finding with the exact one-line fix.
- **[TEST] Sim-side presence emission is liveness-tested only for `beetle`** — `presence-voices.test.ts` proves `stepGame` emits `beetle-start`/`beetle-stop` on the real edges (with vacuity guards), and the vocabulary/mapping tests cover all seven on the `events.ts`/`audio.ts` side — but the sim's `PRESENCE_VOICES` table (that it emits the correct root per creature) is exercised only for beetle. A typo in a non-beetle root would ship silently. This is the coverage gap that makes the [TYPE] finding worth doing; non-blocking (the type-tightening closes it more cheaply than six more sim tests). `beetle-quota.test.ts` and `secondary-inputs.test.ts` are non-vacuous (peak>0 / control-vs-treatment guards) and their constants match source (`beetleAllowed(0)=1`, `(0x10)=2`).
- **[DOC] Comments and citations accurate** — the ml7-8 TODO re-tags are precise (bee's lingering `mush:0` correctly re-scoped to lower-band MUSH[0], distinct from `mushTop`); the `roster.ts` slot-12 deviation header is factually correct (all four fliers = slot 12, verified) and matches `flier-slot-sharing.test.ts`. No lying/stale comments in the diff.
- **[SILENT] No swallowed errors introduced** — the only silent path is the intended `audio-dispatch.ts:32` degrade-not-throw (pre-existing contract, clause 4). No empty catches or dropped errors in the diff.
- **[SIMPLE] No new complexity** — `liveSlots`/`countTopMushrooms` are minimal. Note: `inchwormKill`'s returned `slow` is unused at the roster level (pre-existing, ml7-2), which is why the sim recomputes SLOW independently; not introduced here, not worth churn.

### Devil's Advocate

Suppose this is broken. The most dangerous surface is the presence-voice edge logic, because it is new control flow in the hottest function (`stepPlay`). Could a stale voice ring forever? The events array is rebuilt per frame (confirmed fresh `events` local, security check #2), so a `-start` never re-fires; and a `-stop` is emitted on the live→vacant band edge, so the shell's `stopLoop` runs when the last creature of a type leaves. The one residual: if the player dies while creatures are still live, `stepPlay` emits no `-stop` (they didn't vacate) and the next frame is a non-`play` phase that clears events — so the loops rely on the shell tearing down on phase exit, exactly as the pre-existing march voice already does. That is not a regression this diff introduces; it's the established loop-teardown contract. Could a malicious/confused future edit break it silently? Yes — and that is precisely the [TYPE] finding: a typo'd root in `PRESENCE_VOICES` compiles (string-typed) and emits an unknown kind that `audio-dispatch` swallows, so a creature would go mute with zero test failure (only beetle is liveness-tested). That is a real net-erosion risk, but it is latent (no current typo) and safely-degrading (mute, not crash), so it is a MEDIUM hardening, not a blocker. What about a stressed field scan — `countTopMushrooms` over a hostile field? The index is masked `& 0x1f` before use and the loop is bounded by `field.length` (fixed 960), so no OOB and no unbounded work. What if `state.slow` underflows? `Math.max(0, …)` floors it. What about the AC-vs-ROM slot-12 contradiction — did the code quietly ignore an AC? No: it followed the ROM (four fliers share slot 12) against a fabricated "singleton" AC body, and documented + guarded it. The convincing failure modes all resolve to the single MEDIUM finding; nothing rises to blocking.

**Data flow traced:** `state.slow`/`state.field`/`state.roster` → `EnemyView` (sim.ts view builder) → per-creature adapters read the secondary inputs → reducers' already-proven gates fire (SLOW flap, DEAD entry, MUSH+2 glut veto); and `state.roster` band live-state → `presenceBefore` vs post-step/post-shot roster → `${root}-start`/`-stop` events → `EVENT_SOUND` → `audio-dispatch` `startLoop`/`stopLoop`. Both paths are deterministic and pure in core.

**Pattern observed:** edge-signalled sustained-voice pairs mirroring the existing march voice — `plugins/millipede/src/core/sim.ts` PRESENCE_VOICES + events.ts, the same model centipede uses (`plugins/centipede/src/core/sim.ts:406-411`).

**Error handling:** unknown event kind → `audio-dispatch.ts:32` degrades (never throws); `slow` underflow floored by `Math.max`; field index masked before read. No null/OOB paths.

**Rule Compliance:** typescript.md #1/#2 → one confirmed violation (`PRESENCE_VOICES` string type + the two derived casts), non-blocking MEDIUM, fix filed. #3 exhaustiveness → `EVENT_SOUND: Record<GameEventKind, EffectName>` compliant (all 14 keys present, each a real EFFECT_NAMES slot). Core/shell purity → clean (51-test purity suite). Determinism → clean (no rng reorder). `-start`/`-stop` balance → clean (7 balanced pairs, mechanically pinned). `game-state.slow` init/doc/cite → compliant.

**Handoff:** To SM (Ruby Rhod) for finish-story.