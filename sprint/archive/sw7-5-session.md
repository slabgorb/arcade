---
story_id: "sw7-5"
jira_key: "sw7-5"
epic: "sw7"
workflow: "tdd"
---
# Story sw7-5: R5 Surface hazard — bunkers fire (GDBNKGN) and flying into a standing tower/bunker costs a shield; the maze fights back

## Story Details
- **ID:** sw7-5
- **Jira Key:** sw7-5
- **Epic:** sw7 (Star Wars — primary-source fidelity)
- **Workflow:** tdd
- **Points:** 5
- **Priority:** p2
- **Stack Parent:** sw7-1

## Subsumes
- **D-016:** Bunkers fire — object type .BYTE 3 SHORTY dispatches GDBNKGN via LBHI at WSGRND:1200; ours silences via kind !== 'bunker'
- **D-020:** Ship-into-tower/bunker costs a shield + rolls the ship (GDVIEW BG1GLW+AUDCR); ours has NO ship-object collision

## House Rules (Accepted Deviations)
The following deviations from the authentic ROM are ACCEPTED — the clone's current
behavior stands; do not "fix" these toward the ROM. (Source of truth:
`star-wars/docs/audit/findings/pair-surface.json`.)

- **D-015:** Clone gives wave 1 a surface phase; the ROM has NO wave-1 ground phase. Keep the clone's wave-1 surface (sw2-3/sw3-11 depend on it).
- **D-017:** Ground return-fire model stays the clone's single homing fireball; the ROM uses per-object directional guns. When bunkers start firing (D-016 fix), they fire within the clone's model.
- **D-019:** Surface may also end early on all-towers-killed; the ROM ends by traversal only (GD.SEQ>=5).
- **D-021:** Low altitude charges a shield as a "terrain crash"; the ROM merely clamps the ship's height with no penalty.
- **D-022:** Surface forward pacing stays the clone's fixed scroll; the ROM accelerates the pilot $100→$400 (≈5250–21000 u/s at the 20.508 Hz timebase).

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-15T21:54:55Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-15T20:50:43Z | 2026-07-15T20:54:20Z | 3m 37s |
| red | 2026-07-15T20:54:20Z | 2026-07-15T21:20:57Z | 26m 37s |
| green | 2026-07-15T21:20:57Z | 2026-07-15T21:40:50Z | 19m 53s |
| review | 2026-07-15T21:40:50Z | 2026-07-15T21:54:55Z | 14m 5s |
| finish | 2026-07-15T21:54:55Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- House rules D-015/D-017/D-019/D-021/D-022 logged in Story Details above; see audit findings in star-wars/docs/audit/findings/ for remediation evidence.

### TEA (test design)

- **Improvement** (non-blocking): ROM bunker fire is distance-weighted — chance rises as the bunker closes (`LDA #40 / SUBA 4+M.X0 / CMPA P.RND1`, WSGRND.MAC:1294-1296). Not pinned: house rule D-017 keeps the clone's cadence model wholesale; grafting the chance onto it needs a ruling.
  Affects `star-wars/src/core/sim.ts` (optional per-shooter weighting inside the cadence).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): the ROM crash also ROLLS the ship — S.ROL = ±$20 (tower, WSGRND.MAC:914-924) / ±19. decimal (bunker, :954-962), away from the struck side, armed only while S.ROL == 0 ("BE POLITE"). Pinned here: shield + event only.
  Affects `star-wars/src/core/state.ts` + `src/shell/render.ts` (roll state + cockpit-roll feel, a future story).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): the ROM plays a near-miss "pffft" (AUDPF) when closing on a tower (WSGRND.MAC:899) or skimming a bunker top (:931) — a warning cue the clone lacks entirely.
  Affects `star-wars/src/core/sim.ts` + shell audio (a proximity event, out of this story's scope).
  *Found by TEA during test design.*
- **Gap** (non-blocking): the ROM tower-crash branch has NO demolished gate — a shot tower's standing STUB still collides (WSGRND.MAC:894-925; contrast the bunker's TYP$DM check :937-939). The clone removes killed objects outright, so stubs neither render nor collide; the crash tests pin LIVE objects only.
  Affects `star-wars/src/core/sim.ts` (only if a future story adds stub entities).
  *Found by TEA during test design.*
- **Question** (non-blocking): GREEN must mark `D-016`/`D-020` `remediated_by: sw7-5` and keep `npm test -- citations` green (epic sw7 ruling). D-016's `ours` quote cites sim.ts:492 — editing the armed filter moves it; run the reanchor tool rather than hand-editing quotes.
  Affects `star-wars/docs/audit/findings/pair-surface.json`.
  *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): TEA's RED left the GameEvent census un-extended for `'object-crash'` — closed here: events.test.ts (ALL_EVENTS entry, discriminant arm, count 16→17, exact set) and main.ts's pump arm (the known two-spot exhaustiveness gotcha).
  Affects nothing further — recorded so the Reviewer knows the census edit is Dev's, inside the RED file's sibling.
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): `object-crash` currently plays the terrainCrash sample; the ROM's AUDCR is a distinct crash sound. A bespoke sample story swaps one arm in main.ts.
  Affects `star-wars/src/main.ts` (the event→sound pump) + an audio asset.
  *Found by Dev during implementation.*
- **Note** (non-blocking): the core purity guard (`events.test.ts` ~:292, `/\bwindow\s*\./`) matches the English word "window." in comments — a testing-runner helper hot-fixed one such comment word in sim.ts during the GREEN run; the edit was verified by diff (one word, comment-only) and is committed. Sidecar learning recorded.
  Affects `star-wars/src/core/*` comments (avoid ending sentences on "window").
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (non-blocking): tests/shell/audio.test.ts:297's pump-exhaustiveness test omits `'object-crash'` — deleting the main.ts arm leaves the audio suite green (mutation-proven; tsc still catches full deletion, so the exposure is a miswired/emptied arm only). One line adds it to the REQUIRED-type list.
  Affects `star-wars/tests/shell/audio.test.ts` (extend the type list for the new pump arm).
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): bishop — the third `Turret.kind` — is untested in BOTH new behaviors: a bishops-immune-to-crash mutation and a bishops-fire-from-floor mutation each pass the full suite. Code is correct today (non-bunker ⇒ tower semantics); two small tests (bishop-ahead crash; armed-bishop muzzle ≈ TOWER_HEIGHT) lock it in.
  Affects `star-wars/tests/core/surface-hazard.test.ts` (add the bishop halves).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): BUNKER_CRASH_CEILING's boundary direction (crash strictly below 56; `>=` overflies) is untested at the boundary — worth one pin at altitude == 56 since this is a derived house-rule constant that future tuning may move.
  Affects `star-wars/tests/core/surface-hazard.test.ts` (one boundary test).
  *Found by Reviewer during code review.*
- **Question** (non-blocking): a deliberate deck-dive at the exact frame a center-line tower crosses charges TWO shields in one frame (scrape + crash) where the cabinet's GS.GLW would collapse to one — but the scrape penalty is itself the clone's invention (house rule D-021), so there is no ROM truth for its stacking; flagging for a future ruling only if playtest finds it harsh.
  Affects `star-wars/src/core/sim.ts` (only if ruled; a shared per-frame damage latch would be the shape).
  *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** (rebuilt by SM — the auto-writer's multiline-findings regex missed all twelve wrapped entries)
- ROM's distance-weighted bunker fire chance (GDBNKGN, WSGRND.MAC:1294-1296) recovered but unported — needs a ruling before grafting onto the house-ruled D-017 cadence model (`star-wars/src/core/sim.ts`).
- Two recovered-but-unported feel features for follow-up stories: ship ROLL on crash (S.ROL ±$20 tower / ±19. bunker) and the AUDPF near-miss "pffft" cue (`star-wars/src/core/state.ts` + shell render/audio).
- ROM stub collision (a demolished tower's stub still collides) is unportable until some story adds stub entities — crash semantics pin LIVE objects only (`star-wars/src/core/sim.ts`).
- `object-crash` reuses the terrainCrash sample; a bespoke AUDCR swap is one pump arm in `star-wars/src/main.ts`.
- Reviewer's mutation-proven test-coverage follow-ups (all non-blocking): audio pump-exhaustiveness list lacks `object-crash` (`tests/shell/audio.test.ts:297`); bishop is untested in both the crash and fire blocks; BUNKER_CRASH_CEILING's `>=` boundary is unpinned (`tests/core/surface-hazard.test.ts`).
- Deck-dive + tower-cross same-frame double charge flagged as a playtest Question (no ROM truth — the scrape penalty is house rule D-021's invention).
- Process learnings recorded in sidecars: core purity guard matches the English word "window." in comments (Dev gotchas).
**Blocking:** None — every finding is non-blocking; D-016/D-020 are remediated and cited.

## Sm Finish Note (2026-07-15)

Finish is PAUSED awaiting the Stranger's merge — everything else is done:
- PR **star-wars#95** (feat/sw7-5-surface-hazard → develop) is OPEN, pipeline-approved
  (Reviewer verdict APPROVED recorded; 1263/1263 tests, build + citations green).
- The merge itself was correctly blocked by policy: the user merges PRs themselves.
- Impact Summary above was REBUILT by hand (the auto-writer's multiline bug hit, as
  the memory predicts — do not re-run the auto-writer).
- Preflight's two "blockers" were script false-positives (wrong-repo PR lookup +
  orchestrator-context lint); manual verification in the preflight report confirms
  all real conditions green.

**To resume after the merge:** run `/pf-sm` → finish flow: `pf sprint story finish sw7-5`
(its merge_pr step will no-op harmlessly — the PR is already merged), verify the archive
+ sprint YAML on disk, then commit at the orchestrator root:
`git add sprint/ .session/ && git commit -m "chore(sprint): complete sw7-5 — surface hazard (star-wars#95)" && git push origin main`.
If the merge gate blocks other work first, the recorded resolution is
`pf sprint story update sw7-5 --status in_review`.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Bunker-crash reachability ruling — the low band is re-based on the clone's flight floor** → ✓ ACCEPTED by Reviewer: independently re-derived (ROM floor 512 < bunker top 720 is exactly why the ROM band exists; 40×720/512 = 56.25); a 1:1 port is provably dead code under house rule D-021, and the clone's `>=` gate direction matches the ROM's IFLT.
  - Spec source: D-020 (pair-surface.json) + WSGRND.MAC:940-946
  - Spec text: bunker collision requires ship height below the bunker top (`M$TZ+M.U1 - 6*120.*2 IFLT`) — 720 raw ROM units = 24 at the sim's 1/30 height scale
  - Implementation: RED stages the bunker crash at MIN_SKIM_ALTITUDE (40) and requires it to bite; overfly is pinned safe at SKIM_ALTITUDE (128). The clone's bunker-crash ceiling must land in (40, 128]; Dev picks the constant (proportional candidate: 40 × 720/512 ≈ 56), cited.
  - Rationale: the clone's flight floor (40, house rule D-021) sits ABOVE the raw-scaled bunker top (24), so a 1:1 port makes the story's bunker hazard dead code. The ROM band exists only because its floor (GD$MNT=512) is below its bunker top (720). The story title demands the maze fight back.
  - Severity: minor
  - Forward impact: the rendered bunker (24 tall) is shorter than the crash ceiling — same shape as the ROM's own cruise-clears-it proportions; revisit only if a future story re-bases the altitude model.
- **Altitude ceiling (GD$MXT) pulled into scope** → ✓ ACCEPTED by Reviewer: `GD$MXT ==1C00` re-verified at WSMAIN.MAC:2598 this review; without the clamp the tower crash is trivially bypassed by climbing, which contradicts the story title — in-scope.
  - Spec source: story title ("the maze fights back") + WSMAIN.MAC:2597-2598
  - Spec text: `GD$MNT ==200 / GD$MXT ==1C00` — the ROM surface flight band (512..7168 raw, ≈17..238 at 1/30)
  - Implementation: RED pins a hard clamp under sustained climb, strictly below TOWER_HEIGHT (352); the exact ceiling value is Dev's, with the citation (≈238)
  - Rationale: the clone had no ceiling; an unclamped climb (200 u/s) hops every tower within seconds, reducing D-020's tower crash to decoration
  - Severity: minor
  - Forward impact: existing yoke tests climb ≤ ~10 units — unaffected; HUD/render never see the removed altitudes
- **ROM stub collision not ported** → ✓ ACCEPTED by Reviewer: the clone has no stub entity (killed objects are removed — accepted D-011/D-018 model); porting stub collision would require new entities, out of a 5-point story; Delivery Finding routes it.
  - Spec source: WSGRND.MAC:894-925 (tower crash branch carries no TYP$DM gate)
  - Spec text: a demolished tower's standing stub still collides in the ROM
  - Implementation: crash tests pin LIVE `state.turrets` entries only; a destroyed object must NOT collide (guard test)
  - Rationale: the clone has no stub entity (killed objects are removed — the accepted D-011/D-018 object model); adding stubs is beyond a 5-point story
  - Severity: minor
  - Forward impact: if a future story adds stub entities, extend `standing` semantics then (Delivery Finding logged)
- **Distance-weighted bunker fire chance not pinned** → ✓ ACCEPTED by Reviewer: house rule D-017 accepts the clone's fire model wholesale; porting only the chance curve would mix the rejected model into the kept one — agrees with author reasoning; Delivery Finding routes the curve for a future ruling.
  - Spec source: D-016 reasoning + WSGRND.MAC:1294-1296
  - Spec text: "a faithful fix also adds the distance-weighted fire chance (`LDA #40; SUBA 4+M.X0; CMPA P.RND1`)"
  - Implementation: bunkers fold into the clone's existing cadence (grace + ENEMY_FIRE_INTERVAL + uniform shooter pick); no per-object chance pinned
  - Rationale: house rule D-017 keeps the clone's return-fire model wholesale; porting one organ of the rejected model (the chance curve) onto the kept one mixes models without a ruling
  - Severity: minor
  - Forward impact: Delivery Finding routes the chance curve for a future ruling if bunker fire feels wrong
- **Ship roll (S.ROL) not pinned** → ✓ ACCEPTED by Reviewer: the audit's own recommendation stops at "spends a shield"; roll is new state + render feel, cleanly separable; the Delivery Finding carries the exact ROM roll values for the follow-up.
  - Spec source: D-020 claim + WSGRND.MAC:914-924 / 954-962
  - Spec text: the crash "rolls the ship (S.ROL)" — ±$20 tower / ±19. bunker, away from the struck side
  - Implementation: RED pins shield loss + exactly one 'object-crash' event per hit; no roll state
  - Rationale: the audit's own recommendation stops at "spends a shield"; roll is new state + render feel, a separable slice
  - Severity: minor
  - Forward impact: Delivery Finding carries the ROM roll values for a follow-up story
- **Sibling re-seat: surface-towers.test.ts cube-top muzzle pin** → ✓ ACCEPTED by Reviewer: intent (TOWER muzzle) preserved; verified green on pre-fix code (RED run) and post-fix code (GREEN run) — the correct-re-seat proof.
  - Spec source: sw2-3 contract (tests/core/surface-towers.test.ts header)
  - Spec text: "Fireballs originate from the tower cube-top elevation (TOWER_HEIGHT)"
  - Implementation: the pin sampled the FIRST shot of a real maze run; once bunkers join the armed pool that sample can be a bunker's low shot. Re-seated onto an explicit tower fixture (kind 'tower', age past grace, cooldown 0) — intent unchanged
  - Rationale: TEA owns test maintenance; the re-seat is green on current code AND after the fix (verified green now by the RED run)
  - Severity: minor
  - Forward impact: none — the bunker muzzle is pinned by surface-hazard.test.ts

### Dev (implementation)

- **Crash detection on the cull edge, not the ROM's pre-contact window** → ✓ ACCEPTED by Reviewer: mutation-proven exactly-once (widening the edge to a window fails 5 tests); my maze scan shows no family has two center-band (|x|≤1024) objects at the same depth and the tightest center-band spacing is 2048 y-units ≈ 3.4 s — outside even the ROM's GS.GLW gauge refractory, so the semantics are observably identical on all authored content.
  - Spec source: D-020 + WSGRND.MAC:901-912 / 940-946
  - Spec text: ROM crashes while the object is still in FRONT (`M.XP - $200 - speed <= 0`), latched by GS.GLW
  - Implementation: the crash registers on the single frame an object's scrolled z crosses the cockpit plane (the frame the cull filter drops it) — one frame per object, so the once-per-crash latch is structural, with zero new state
  - Rationale: gives exactly the GS.GLW once-per-hit semantics the tests pin, dt-independent (a large step can't tunnel past the crossing), and the simplest code that passes
  - Severity: minor
  - Forward impact: the AUDPF near-miss cue (TEA's Delivery Finding) will need a separate pre-contact proximity check when a future story takes it
- **Constant choices within TEA's pinned bands** → ✓ ACCEPTED by Reviewer: all four independently re-derived this review (12 = 3×120/30 per GDHTBK; 56 = 40×720/512; 238 = ⌊0x1C00 / 30⌋ = ⌊7168/30⌋; 1024 = $400 per WSGRND:944); each sits inside TEA's pinned band.
  - Spec source: TEA ACs (session) — bands left to Dev with citations
  - Spec text: muzzle ≤ 24; bunker-crash ceiling in (40, 128]; climb clamp < 352; lateral window < 2048
  - Implementation: BUNKER_MUZZLE_HEIGHT=12 (GDHTBK 3×120 mid-body), BUNKER_CRASH_CEILING=56 (the proportional 40×720/512), MAX_SKIM_ALTITUDE=238 (GD$MXT 7168/30), OBJECT_CRASH_LATERAL=1024 ($400 mid-band) — each documented at its declaration in state.ts
  - Rationale: every value is the ROM-derived candidate TEA's ruling named; none is a new invention
  - Severity: minor
  - Forward impact: none
- **object-crash reuses the terrainCrash audio cue** → ✓ ACCEPTED by Reviewer: the repo's standing no-new-asset pattern (fireball-destroyed, tower-bonus, death-star-destroyed all reuse cues); the event stays distinct so a bespoke AUDCR swaps in one pump line. Note: the pump arm is uncovered by the audio suite — see my [TEST] finding.
  - Spec source: TEA AC-2 (its own EVENT, distinct from terrain-crash)
  - Spec text: the crash "emits ONE 'object-crash' GameEvent per hit (its own cue …)"
  - Implementation: the EVENT is distinct (union member + census); the shell pump maps it to the existing terrainCrash sample — the repo's standing no-new-asset pattern (fireball-destroyed, tower-bonus, …)
  - Rationale: no AUDCR sample exists yet; the dedicated event lets a bespoke one swap in without touching the core
  - Severity: minor
  - Forward impact: a bespoke AUDCR sample story can re-map main.ts's arm in one line

## Sm Assessment

Setup complete and verified on disk: session file created, story sw7-5 moved to
in_progress in sprint YAML, branch `feat/sw7-5-surface-hazard` created from
develop and checked out in star-wars (clean tree), story + epic context files
present. Merge gate clear — no open PRs on star-wars. No Jira in this project;
jira_key is the story id (explicitly skipped).

SM corrected the House Rules section after setup: sm-setup's initial glosses
mis-mapped the deviation IDs (e.g. labeled D-017 with D-021's content) and
stated several backwards. Rewrote all five from
`star-wars/docs/audit/findings/pair-surface.json` with direction made explicit:
these are ACCEPTED deviations — the clone's behavior stands.

Scope for the phases ahead: fix D-016 (bunkers fire — GDBNKGN dispatch, ours
silences via `kind !== 'bunker'`) and D-020 (ship-into-standing-tower/bunker
costs a shield + rolls the ship — GDVIEW BG1GLW+AUDCR; ours has no ship-object
collision), while respecting the five house rules above (notably D-017: bunker
fire uses the clone's homing-fireball model, not ROM directional guns).
Acceptance criteria are not in the sprint YAML — TEA defines them in RED.

Routing: workflow `tdd` (phased) → handoff to TEA (Imperator Furiosa) for the
red phase.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Core gameplay contract change — two ROM fidelity fixes (D-016 bunkers fire, D-020 ship↔object collision) plus the GD$MXT ceiling that makes the tower hazard unavoidable.

**Test Files:**
- `star-wars/tests/core/surface-hazard.test.ts` — NEW: the sw7-5 contract (16 tests: 10 RED + 6 pass-by-design guards)
- `star-wars/tests/core/surface-towers.test.ts` — re-seated the sw2-3 cube-top muzzle pin onto an explicit tower fixture (green both sides; deviation logged)

**Tests Written:** 16 tests covering the TEA-defined ACs (sprint YAML carried only the title)
**Status:** RED verified by testing-runner (run sw7-5-tea-red): 1263 total, 1253 passed, **10 failed — all in surface-hazard.test.ts, each on its designed assertion**. The 6 passers are the intended keep-behavior guards (bunker grace, tower muzzle, bunker overfly at cruise, off-lane pass, destroyed-object pass, determinism). `tsc --noEmit` clean (event names compared as widened strings — no type-level RED, repo builds stay green pre-GREEN).

### Acceptance Criteria (TEA-defined)

1. **D-016:** a standing bunker past TOWER_FIRE_GRACE fires through the clone's cadence (house rule D-017: the homing-fireball model, NOT the ROM's directional guns); muzzle at its LOW body (≤ 24 = 6×120/30 raw), never TOWER_HEIGHT; real wave-1 maze runs produce bunker shots (integration).
2. **D-020 tower:** a standing tower dead ahead costs exactly ONE shield per pass (latched — the ROM GS.GLW machine), emits exactly one `'object-crash'` GameEvent (its own cue; never terrain-crash/player-death/enemy-death; never scores; does NOT destroy the object), bites at any legal altitude (no height gate — WSGRND:901-912), kindless `{pos}` entries crash as towers, last-shield crash → gameOver.
3. **D-020 bunker:** low flight (MIN_SKIM_ALTITUDE) crashes into a standing bunker; default cruise (SKIM_ALTITUDE) overflies it safely — the crash ceiling lands in (40, 128], Dev's constant (candidate ≈56; see reachability-ruling deviation).
4. **Ceiling:** sustained climb hard-clamps strictly below TOWER_HEIGHT (GD$MXT ≈238 at 1/30; exact value Dev's with citation).
5. **Scope guards:** destroyed objects neither fire nor collide; off-lane objects (|x| = 2048, the tightest authored lane) pass harmlessly; determinism holds through the crash frames.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| lang-review #4 nullish default (absent kind == tower) | `a kindless legacy { pos } entry crashes as a tower` | failing (RED) |
| lang-review #8 test quality (no casts; no vacuous asserts) | whole suite self-checked; event types via legal widening, zero `as any` | pass |
| lang-review #3 exhaustiveness (new GameEvent member) | routed to Dev: adding `'object-crash'` to the union forces the shell pump switch via tsc | Dev/GREEN |
| CLAUDE.md core purity (dt-only time, seeded RNG) | `same seed, same crashes … deep-equal` guard | passing guard |

**Rules checked:** 3 of 3 applicable lang-review checks have coverage (+1 repo boundary rule)
**Self-check:** 0 vacuous tests found (audited every pre-GREEN pass is an intended guard; RED failures verified fails-for-the-right-reason — the climb numbers 4128/6128 match hand arithmetic exactly)

### Notes for Dev (The Word Burgers)

- The armed filter is `src/core/sim.ts:491-493`; the muzzle spawn is :497. Bunker muzzle ≤ 24 (the model's own top; ROM centers the bunker blast at 3×120 → 12 — either works).
- `'object-crash'` is a NEW GameEvent — add the union member (events.ts) and a shell cue mapping (the ROM sound is AUDCR; TerrainCrashEvent is the "own cue" precedent). Payload is unpinned — type name only.
- The crash must be LATCHED (one shield per pass, count===1 across ~17 in-window frames) — the terrain-crash altitude-bump is the repo's existing latch idiom; a per-object `crashed` flag or z-window edge both work.
- Mark D-016/D-020 `remediated_by: sw7-5` in pair-surface.json and keep `npm test -- citations` green — the reanchor tool handles the shifted `ours` quotes (sim.ts:492 moves).
- Commit 48b95fe on `feat/sw7-5-surface-hazard` carries the RED suite + re-seat.

**Handoff:** To Dev for implementation (GREEN)

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `star-wars/src/core/state.ts` — four new ROM-derived constants (BUNKER_MUZZLE_HEIGHT 12, BUNKER_CRASH_CEILING 56, MAX_SKIM_ALTITUDE 238, OBJECT_CRASH_LATERAL 1024), each documented with its WSGRND/WSMAIN citation
- `star-wars/src/core/sim.ts` — stepSurface: altitude ceiling clamp; cull-edge ship↔object crash (one shield + one `object-crash` event per standing object passed; towers altitude-blind, bunkers overfliable at/above the ceiling); armed filter drops the bunker exclusion; kind-aware muzzle height
- `star-wars/src/core/events.ts` — `ObjectCrashEvent` union member
- `star-wars/src/main.ts` — pump arm for `object-crash` (reuses terrainCrash cue; see deviation)
- `star-wars/tests/core/events.test.ts` — census extended 16→17 (TEA left it; see finding)
- `star-wars/docs/audit/findings/*.json` — D-016/D-020 `remediated_by: sw7-5`; 40 citations re-anchored by the tool, 0 lost

**Tests:** 1263/1263 passing (GREEN, full suite, run sw7-5-dev-green); surface-hazard 16/16, events 45/45, citations 12/12. `npm run build` (tsc + vite) clean.
**Branch:** feat/sw7-5-surface-hazard (pushed; commits 48b95fe RED, cd46786 GREEN)

**Notes for the Thought Police (Reviewer):**
- No PR opened (SM's finish-phase job).
- The testing-runner helper made ONE edit during verification: a comment word in sim.ts ("window." → "time-window —") to clear the purity guard's `/\bwindow\s*\./` false positive. Verified by diff before committing.
- Reanchor diff across 9 pair files is pure `"line": N` shifts (44+/42−) — no verbatim changes; D-016's historical quote is frozen per the remediated-DIVERGENCE rule.

**Handoff:** To Reviewer (review phase — the tdd workflow routes green → review)

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 1 flag (findings-JSON churn) | confirmed 0, dismissed 0, resolved 1 (semantic diff proves 40 line-renumbers + 2 remediated_by only) |
| 2 | reviewer-edge-hunter | Yes | skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Yes | skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 4 (3 Medium, 1 Low — all coverage gaps, no behavior defects; each mutation-proven) |
| 5 | reviewer-comment-analyzer | Yes | skipped | disabled | Disabled via settings (own pass: cadence comment correctly retires the stale "open ROM question"; citations current) |
| 6 | reviewer-type-design | Yes | skipped | disabled | Disabled via settings (rule-checker #1-#5 covered type concerns: 0 violations) |
| 7 | reviewer-security | Yes | clean | none | N/A (purity boundary intact; event kind is a closed union; pump plays a fixed literal; findings JSON verified honest) |
| 8 | reviewer-simplifier | Yes | skipped | disabled | Disabled via settings (own pass: crash loop is zero-new-state; no dead code added) |
| 9 | reviewer-rule-checker | Yes | clean | 1 awareness note | confirmed 0, dismissed 0, noted 1 (pre-existing `shot!` non-null assertions in unchanged lines, guarded by toBeDefined — repo test idiom, out of diff scope) |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 4 confirmed, 0 dismissed, 1 noted (pre-existing, out of scope)

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` #1–#13 + star-wars CLAUDE.md core-boundary + the two repo-specific rules (event-census growth; spread-preserved optional fields). The rule-checker enumerated 16 rules across 44 instances in all 7 changed .ts files — 0 violations. Spot-confirmed myself:

- #1 type-safety: only `as Vec3` tuple-literal casts (pre-existing idiom, e.g. sim.ts:172/244); zero `as any`/`@ts-ignore` in the diff.
- #3/#15 exhaustiveness: 'object-crash' grew all five touch-points together — events.ts union, main.ts:176 pump case (never-guard intact), ALL_EVENTS, discriminant(), census 16→17.
- #4/#16 nullish handling: `passed.kind ?? 'tower'` (sim.ts crash loop), `(shooter.kind ?? 'tower')` (muzzle), `(turret.age ?? 0)` — all `??`, no `||`; the scroll map keeps spread-plus-override so optional `kind` survives rebuilds.
- #8 test quality: new tests import from src/, no mocks, no `as any`.
- Core purity (CLAUDE.md): new code touches only dt/state/rng; the `?raw` purity guard still covers sim/state/events; the determinism test spans the crash frames.

### Devil's Advocate

Assume this is broken. The harshest corner I can construct: dive into the deck at the exact frame a center-line tower crosses the plane — the terrain scrape charges one shield, the tower crash charges another: two shields in one frame, where the cabinet's GS.GLW latch would likely have collapsed them to one. Reachable? Yes, by deliberate low flight into a tower crossing. But the terrain-scrape penalty is itself the clone's invention (house rule D-021 — the ROM clamps height with NO penalty), so there is no ROM truth for how an invented penalty stacks; and both charges correspond to two real, distinct hazards the pilot flew into. I log it as a Question finding, not a defect. Next attack: two objects crossing the same frame double-charge — my scan of every authored family found zero same-depth center-band pairs, and 2048 y-units (~3.4 s) is the tightest center spacing; unreachable without hand-built fixtures. Next: can the pilot cheese the ceiling? Fixtures can stage altitude above 238, but a single step clamps it; in play the yoke can never exceed the clamp, and 238 < 352 keeps towers lethal. Next: does the bunker gate read stale altitude? No — the crash loop reads post-scrape altitude, so a scrape-bounce (to 128) correctly overflies a same-frame bunker rather than double-charging. Next: a maze tower at y=0 (one family authors one) crosses at 2.0 s; the player has 1.25 s after fire-grace and a 0.24 s bolt flight to kill it — tight, but the ROM authored that maze and the ROM is the ceiling we don't retune. Finally, the confused-user angle: bunkers now shoot back and the wave-2 BUNK maze becomes genuinely hostile — is that a difficulty regression? It is the story's title working as intended; cruise altitude still clears every bunker crossing. What survives this section as real findings: the four test-coverage gaps the analyzer mutation-proved, already confirmed above.

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** yoke aimY → altitude (clamped to [0, MAX_SKIM_ALTITUDE=238] before any gate reads it) → bunker-crash gate → damage → lives → gameOver/mode. Second flow: maze typeDigit (closed 1|2|3 from surfaceMazes.ts) → Turret.kind → ObjectCrashEvent.kind → main.ts:176 pump → audio.play('terrainCrash') — a fixed literal; event.kind never reaches the audio dispatch, so no string can escape the union (safe, [SEC] clean).
**Pattern observed:** cull-edge crash detection (sim.ts stepSurface crash loop) — the object that leaves the in-flight set this frame IS the crash set: exactly-once semantics with zero new state, the same latch shape as the terrain-scrape altitude-bump idiom.
**Error handling:** kindless `{pos}` fixtures ride `?? 'tower'` (sim.ts crash loop + muzzle); ageless ride `?? 0`; a scrape-bounce frame reads post-bounce altitude so bunker overfly can't double-charge; gameover mode short-circuits stepGame before stepSurface, matching the ROM's S.GAS ≥ 0 gate.

Observations (tags plain-text for the approval gate; disabled specialists noted):

1. [VERIFIED] One-shield-per-pass latch — surface-hazard.test.ts pins count === 1 and lives-delta === 1 across a 40-step pass; the analyzer's window-widening mutation failed 5 tests. Complies with core-purity (no new state) and the D-020 contract.
2. [VERIFIED] Audit-record integrity — my semantic diff over all 9 findings files: 42 field changes = 40 `ours.line` renumbers + `remediated_by: sw7-5` on exactly D-016/D-020; both findings' `source.verbatim` re-verified byte-for-byte against WSGRND.MAC:1200 and :912 in the quarry. No laundering.
3. [VERIFIED] ROM-refractory parity — no authored maze family has two center-band (|x| ≤ 1024) entries at one depth; minimum center spacing 2048 y-units ≈ 3.4 s at 600 u/s, outside the ROM's GS.GLW gauge window — the per-object latch is observably identical to the cabinet's on authored content.
4. [VERIFIED] Event exhaustiveness [RULE] — all five touch-points grew together; tsc's never-guards (main.ts + census) make a dropped arm a compile error.
5. [VERIFIED] Core purity [SEC] — no Date/random/DOM in new core code (security specialist + rule-checker + the `?raw` guard + the 1600-step determinism test through the crash frames).
6. [TEST] [MEDIUM] tests/shell/audio.test.ts:297 claims pump exhaustiveness but omits 'object-crash' — deleting the pump arm leaves the audio suite green (mutation-proven). tsc still catches full deletion via the never-guard; the uncovered residue is a miswired/emptied arm. Routed as a Delivery Finding.
7. [TEST] [MEDIUM] Bishop (the third kind) is untested in the crash block — a bishops-are-immune mutation passes the suite. Code is correct today (non-bunker ⇒ tower semantics); coverage gap routed.
8. [TEST] [MEDIUM] Bishop muzzle untested in the fire block — a bishops-fire-from-floor mutation passes. Same routing.
9. [TEST] [LOW] BUNKER_CRASH_CEILING boundary direction (>= at exactly 56) untested — an off-by-one mutation passes; the staged altitudes (40/128) sit far from the boundary by TEA's design. Routed.
10. [SIMPLE] (specialist disabled — own pass) The implementation adds no state fields, no helpers beyond four cited constants, and deletes the stale bunkers-don't-fire comment block — minimal for the contract. [EDGE] and [SILENT] specialists likewise disabled; my own edge pass (dt sweep 0.001–0.5, exact-zero crossing, boundary altitudes, gameover interplay) and silent-failure pass (no swallowed paths — every gate `continue`s to an explicit outcome) found nothing beyond observation 6-9. [DOC] (disabled) — own pass: the rewritten cadence comment correctly retires sw3-11's "open ROM question" and every new constant carries its ROM citation; [TYPE] (disabled) — rule-checker #1-#5 enumeration returned 0 violations.

**Handoff:** To SM for finish-story