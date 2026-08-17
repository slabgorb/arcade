---
story_id: "jt13-2"
jira_key: "jt13-2"
epic: "jt13"
workflow: "tdd"
---
# Story jt13-2: Players and enemies warp-in spawn animation

## Story Details
- **ID:** jt13-2
- **Jira Key:** jt13-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/jt13-2-warp-in-spawn-animation
- **PR:** https://github.com/slabgorb/arcade/pull/518 (MERGED, mergeCommit 683e1916)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Repos:** arcade
**Phase Started:** 2026-08-17T22:59:14Z

<!-- Reviewer verdict round 1 = REJECTED (see Reviewer Assessment). complete-phase
     mis-stamped the pointer to `finish`; corrected to `green` for the rework round
     (recovery_config reviewer-verdict → target_phase: green). Dev applies the fix
     table, then review re-runs. -->

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-17T21:47:55Z | 2026-08-17T21:50:17Z | 2m 22s |
| red | 2026-08-17T21:50:17Z | 2026-08-17T22:16:33Z | 26m 16s |
| green | 2026-08-17T22:16:33Z | 2026-08-17T22:36:08Z | 19m 35s |
| review | 2026-08-17T22:36:08Z | 2026-08-17T22:51:45Z | 15m 37s (round 1: REJECTED) |
| green | 2026-08-17T22:51:45Z | 2026-08-17T22:58:13Z | 6m 28s |
| review | 2026-08-17T22:58:13Z | 2026-08-17T22:59:14Z | 1m 1s |
| finish | 2026-08-17T22:59:14Z | - | - |

## Background (SM Correction — fold into TEA's investigation)

**Scope boundary (user-verified at setup 2026-08-17):** Visible animation only. Do NOT re-implement the transporter spawn logic.

### Existing Infrastructure (Already Complete)

The **materialisation window** (spawn timing, collision-disable, queue) already exists in `plugins/joust/src/core/transporter.ts` (story jt2-6, GREEN status):
- Four transporter pads by tier (TR1ID..TR4ID)
- Take-a-number ticket queue (players served before enemies)
- **Timed materialisation window**: collisions disabled while spawning; any control input aborts early; else times out; PLYINT re-enables collisions on exit
- ROM-cited: JOUSTRV4.SRC:5828-5892, 5923-5925
- Status: Tested, live, measuring against the ROM

### What Is Missing

**Zero visible spawn/warp-in animation.** The transporter is timing-only; there is no literal `warp` anywhere in `plugins/joust/src` (verified by grep at setup).

### Delivery Scope & Pattern

**Deliverable:** Visible spawn/warp-in animation for BOTH player spawns AND enemy spawns.
- Driven off the existing transporter materialisation window
- Implemented in render/shell (or core animation frame sequence feeding shell, mirroring the dissolve.ts death-side pattern)
- Do NOT alter transporter core logic (timing, queue, collision abort, respawn)

**Fidelity anchor (ROM-derived, Architect/TEA own the read):** The render effect should correspond to the ROM's materialisation blink over the existing window. Mirror the pattern of `plugins/joust/src/core/dissolve.ts` (jt3-6, death dissolve 3-frame ASH animation) — a sibling "spawn is core-timed, animation is a frame sequence" pattern, on the birth side rather than death.

**Related precedent:** `dissolve.ts` unifies death animation as a core-side frame-sequence state machine feeding the shell render — review that pattern for spawn-side architecture.

## Delivery Findings

No upstream findings — scope measured at setup.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (Tyr) — RED investigation, 2026-08-17

Four parallel scouts + a personal ROM read established ground truth. The warp-in
was **never a ghost, and never fully absent**:

- **The materialisation WINDOW already exists** (jt2-6): `SimProcess.mat`,
  `beginMaterialise`/`stepMaterialise`, a 120-nap collision-safe window seeded on
  BOTH spawn paths (`respawnPlayerProcess`, `enemyProcess`). Spawn *timing* is done.
- **The AUDIO already exists and is ROM-cited** — `player-materialise` /
  `enemy-materialise` cues, the manifest quoting *"PLAYER FADING IN (TRANSPORTER)"*.
  Only the *visual* half was never built (grep: zero literal `warp` in src).
- **The code already flags this exact story**: the `STAND_FRAMES=30` comment in
  `sim.ts` (:503-512) reads *"drawn lit on the pad, TREFF, :5734-5745; the render
  of that lit pad is a separate story."*
- **The ROM effect is `TREFF`** (JOUSTRV4.SRC:5726-5803), verified line-by-line by
  me against the vendored source (both scouts agreed; I re-read every cited line):
  a 30-frame `PFRAME` window (= `STAND_FRAMES`, `LDA #30` :5726-5727), a solid
  owner-coloured lit pad (`DCONST` :5739), and a vertically-growing silhouette
  whose height derives from `PFRAME` (`COMA "VERT SIZE"/ASRA/ANDA #$0F/EORA #$04`
  :5753-5757), feet pinned (WCY shift :5763-5783), bird drawn only for `PFRAME<=20`
  (`CMPA #20` :5742), one nap per frame (`TREFF2 PCNAP 1` :5792), ending at `PLYINT`
  (:5923-5925).
- **The sharpest gap — a player asymmetry**: `enemyProcess` is served with
  `nap:STAND_FRAMES` (a 30-frame window), but `respawnPlayerProcess` inherits
  `nap:1` — the re-materialising PLAYER has NO window to animate over at all.

**Correction to the setup Background:** there is **no `MATER` label** in the ROM.
The chain is `GOTTR → TREFF/TREFF2 → wait-loop → PLYINT`; `MATERIALISE_WINDOW` is
the clone's own demo-tuned (120) name. The provenance suite cites the real labels.

## Design Deviations

None yet (scope lock at setup).

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (Tyr) — ACs derived (epic YAML had none) + a Phase-2 descope

- **The epic YAML recorded no `acceptance_criteria`, so I DERIVED them in RED** (the
  jt8-6 precedent). They are encoded directly as the five test suites, not as prose;
  the ROM is the spec.
- **Phase 2 is descoped and MUST be filed.** The ROM's materialisation has a SECOND
  phase after the 30-frame grow: a *wait-for-first-move* idle (JOUSTRV4.SRC:5805-5890)
  where the full-size bird colour-cycles owner/white/grey (`TREPL1/2/3`) at an
  ACCELERATING rate (every 16→8→4→2→1 naps) until the player flaps or it times out
  (~375 naps). This story builds **Phase 1 only** (the grow-in "warp-in" the report
  is about) — already a full 5-point four-suite build. **Owner: SM to file a jt13
  follow-up** ("Joust transporter wait-for-first-move idle colour-cycle", ROM
  :5805-5890) before this epic closes.

### Dev (implementation)
- **Warp-in REPLACES the mount+rider entity ops during the TREFF window; updated jt9-46 AC-1/AC-4 accordingly**
  - Spec source: tests/demo-jt9-46.test.ts, AC-1 and AC-4
  - Spec text: "the fresh-wave enemy is drawn as a mount + rider, not a bare bird"
  - Implementation: drawList emits a single kind:'warpin' op (the growing silhouette) INSTEAD of the [mount, rider] entity ops while warpIn is active; jt9-46 AC-1/AC-4 now assert the rider-stacking on the LIVE (post-warp-in) enemy and add coverage that the fresh arrival warps in (kind:'warpin', zero entity ops).
  - Rationale: the ROM constant-fills the standing silhouette IN PLACE OF the opaque bird during TREFF — an additive overlay would leave the bird popping in fully opaque, defeating the entire story.
  - Severity: major
  - Forward impact: none — jt9-46's invariant (a live enemy draws mount+rider) is preserved verbatim; no downstream story assumes a materialising enemy emits entity ops.
- **Extended the sim-contract SimProcess/DrawOp to mirror production's new warpIn/warpin/owner**
  - Spec source: tests/helpers/sim-contract.ts, the SimProcess and DrawOp interfaces
  - Spec text: "kind: 'arena' | 'entity' | 'fill' | 'crumble'"
  - Implementation: added warpIn? to SimProcess and 'warpin' to DrawOp.kind plus owner? to DrawOp, mirroring src/core/sim.ts, so jt9-46 (and future tests) type-check against the new fields.
  - Rationale: the contract is the test-side mirror of the production types and must carry any field production added.
  - Severity: minor
  - Forward impact: none

## Sm Assessment

**Setup complete — routing to TEA (red).** The pointer read `setup` on arrival.

**Premise measured before setup (per SM discipline).** The story's description hedges "User suspects this was never implemented ... Investigate whether a warp-in ever existed." I measured the tree rather than copying the suspicion forward as fact:
- **Partly refuted:** `plugins/joust/src/core/transporter.ts` (jt2-6, GREEN) already implements the spawn *timing* — transporter pads, take-a-number queue, and the timed materialisation window with collisions disabled (ROM JOUSTRV4.SRC:5828-5892,5923-5925). Spawn state/timing is DONE and ROM-cited.
- **Confirmed missing:** the *visible* warp-in animation. Zero literal `warp` in `plugins/joust/src` (grep, non-test). The transporter is timing-only.

**User ruling (2026-08-17):** scope is **just the animation** — the visible render effect over the existing materialisation window, for both player and enemy spawns. Do NOT touch the transporter core. No either/or fork in the deliverable, so no further ruling was required; the one open question (is this a ghost / does the core already do it?) was answered by measurement + the user's confirmation.

**Board:** clean. Sibling probes at setup — no `jt13` branch on origin, no sibling `.session/` files. Merge gate clean (no open PRs). Claim committed and branch `feat/jt13-2-warp-in-spawn-animation` pushed for sibling visibility; status stamped `in_progress`.

**For TEA:** the Background section carries the full scope lock and the `dissolve.ts` (jt3-6) architectural precedent — a core-side frame-sequence state machine feeding the shell render, to mirror on the birth side. The RED test should prove there is no visible spawn animation today and pin the intended materialisation-blink behaviour off the existing transporter window. Architect/TEA own the ROM read for the exact frame cadence.

## Tea Assessment

**RED complete — routing to Dev (Loki Silvertongue) for GREEN.** Five new files, four
failing suites, mirroring the jt11-7 crumble four-suite shape. RED verified by direct
runs: only the four warpin suites are red (31 feature-absence failures); the other 199
joust files stay green (3710 pass), the orchestrator suite is 505/505, and
`npm run lint` (repo-wide tsc) is clean.

**What Dev builds (GREEN):**
1. `src/core/warpin.ts` — a PURE core state machine (`WarpInState {frame,nap,done}`,
   `startWarpIn`/`stepWarpIn`, `WARPIN_FRAME_COUNT=30`, `WARPIN_FRAME_NAPS=1`,
   `WARPIN_BIRD_VISIBLE_PFRAME=20`). NOT the dissolve, NOT the crumble, NOT the jt2-6
   `Materialisation` collision window — a separate module importing none of them. The
   jt1-7 purity scanner will sweep it.
2. Carry it on `SimProcess.warpIn?` and seed it on BOTH spawn paths — this is the
   player-asymmetry fix: `respawnPlayerProcess` must give the player a real window.
3. Surface it through `drawList` as a `kind:'warpin'` `DrawOp` (add the kind, reuse
   `frame`; owner colour for `DCONST`), stepped in `frame.ts`, removed when `done`.
4. `render.paintWarpIn` — the shell painter: a vertical-grow silhouette (height from
   frame), FEET PINNED (grows upward), over a lit owner-coloured pad, PALETTE colours
   only. Wire it in `main.ts`'s `paintSim` dispatch (the render-crumble/paintCrumble
   precedent is the exact template).
5. Commit `docs/rom-study/claims/warpin.json` with `JT132-*` claims covering the
   TREFF laws (:5726-5925), verbatim-matching the source.

**The precedent to copy verbatim:** jt11-7 (`crumble.ts` + `crumble-contract.ts` +
`crumble-source` + `render-crumble` + `crumble-wiring`). Same shape, birth side.

### Rule Coverage (typescript.md lang-review)

- **#29 (magnitude ≠ ordering):** the whole-effect duration is pinned as an exact
  magnitude (`naps === WARPIN_FRAME_COUNT * WARPIN_FRAME_NAPS === 30`), not merely
  "it ends" — a too-fast warp-in reddens. The render "grows" check is ordering, which
  is correct for a grow, but the *count* is pinned in core + source.
- **#27 (a gate in a mode that never creates the thing):** the enemy-surfacing tests
  DRIVE the real wave until an enemy is actually served materialising (the premise
  floor passes), rather than assuming frame-0 state; the player path is exercised via
  the exported constructor. Both modes are reached.
- **#15 / #25 / #26 (source-text guards anchored, scoped, non-vacuous):** the source
  suite reads SPECIFIC lines (never whole-file scans); claims coverage is a POSITIVE
  span bounded to :5726-5925; the bird-visibility relationship is tied to the imported
  module constants (drift reddens), and the source suite proves the literals are the
  ROM's.
- **#18 (apparatus fails by passing):** `loadWarpIn` is the RED mechanism (self-
  describing throw when absent); every driven-sim test asserts its premise floor
  before the feature check, so a setup failure cannot masquerade as feature-absence.
- **Purity (#core-boundary):** `warpin.ts` is specified pure — the behaviour suite
  pins determinism (replay) and no-mutation, and the module lands under the jt1-7
  purity scanner.

### Follow-ups routed to SM
- **Phase 2 (descoped):** file a jt13 story for the wait-for-first-move idle colour-
  cycle (ROM :5805-5890) — see Design Deviations. Owner: SM.
## Dev Assessment

**GREEN complete — routing to Reviewer (Heimdall).** The TREFF warp-in is built and
every warpin suite passes.

**What shipped:**
- `src/core/warpin.ts` — the pure 30-frame PFRAME state machine (`WarpInState`,
  `startWarpIn`/`stepWarpIn`, `WARPIN_FRAME_COUNT=30`/`_FRAME_NAPS=1`/
  `_BIRD_VISIBLE_PFRAME=20`). Purity scanner-clean.
- `src/core/sim.ts` — `SimProcess.warpIn`, seeded on BOTH spawn paths
  (`respawnPlayerProcess` fixes the nap:1 player asymmetry; `enemyProcess`),
  `advanceWarpIn` stepped beside `advanceMaterialisation`, `DrawOp.kind:'warpin'` +
  `owner`, and a `warpInOp` that REPLACES the mount+rider while active.
- `src/shell/render.ts` — `paintWarpIn`: an owner-coloured (DCONST) silhouette that
  grows up out of a lit pad, feet pinned, bird appearing only past PFRAME 20.
- `src/main.ts` — `paintSim` dispatches `kind:'warpin'` to `paintWarpIn`.
- `docs/rom-study/claims/warpin.json` — seven JT132-* claims, verbatim-matched.

**Verification (evidence, not assertion):**
- warpin suites: 40/40 pass (core behaviour, ROM provenance, render, wiring).
- full joust vitest: **3743/3743** (203 files) — no regressions.
- `npm run lint` (repo-wide tsc): clean.
- orchestrator suite: **505/505**.
- `node scripts/build-app.mjs joust`: builds (180.92 kB).

**One behavioural change worth the Reviewer's eye** (logged as a major deviation):
drawList REPLACES the opaque mount+rider with the warpin silhouette during the
30-frame window — the ROM's actual behaviour, and required or the bird pops in
opaque and the story is defeated. jt9-46 AC-1/AC-4 were updated to assert the
rider-stacking on the LIVE (post-warp-in) enemy; the invariant is preserved and new
coverage pins that the fresh arrival warps in first.

**Recommended before finish (not blocking GREEN):**
- **Visual playtest** — this is a VISUAL feature the user reported; a human/owner
  screenshot of a spawn confirms the silhouette reads well (the render is procedural
  bars, pixel-accurate WCLENY silhouette deferred like paintCrumble's FIRSTI debris).
- **Phase 2 follow-up** (SM to file) — the wait-for-first-move idle colour-cycle
  (ROM :5805-5890), descoped from this story. See TEA Design Deviations.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (3743/3743 joust, 505/505 orch, lint clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — I compensated with mutation testing (advanceWarpIn no-op → demo-jt11-4 reddens; surfacing → wiring+jt9-46 redden) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no swallowed errors in diff (state machine is pure returns; render is fillRect) |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 1 (advancement not pinned by story tests — DOWNGRADED to Medium, see below), deferred 2 (Low), 1 note |
| 5 | reviewer-comment-analyzer | Yes | findings | 8 | confirmed 4 (F1 PLYINT, F2 over-broad cite ×4, F4 stale STAND_FRAMES; F3 enemy-white DOWNGRADED — citation exists), rest are the ×4 duplicates of F2 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — I checked DrawOp.owner union + WarpInState myself (rule-checker #3 also PASS) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — N/A (no user input, no auth, no secrets; pure sim + canvas) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — I reviewed for over-engineering myself (paintWarpIn mirrors paintCrumble; no dead code) |
| 9 | reviewer-rule-checker | Yes | findings | #1 FAIL (2 cast instances) | confirmed 1 (unnecessary `as unknown as Warpish` casts — Medium; the render-contract cast is a pre-existing repo idiom) |

**All received:** Yes (4 enabled returned, 5 disabled skipped)
**Total findings:** 6 confirmed (1 High-prose→treated Medium, 5 Medium), 1 dismissed (F3, citation located), 3 deferred (Low)

## Rule Compliance

Enumerated the TypeScript lang-review checklist (`.pennyfarthing/gates/lang-review/typescript.md`) against every changed type/function, cross-referenced with rule-checker's exhaustive pass:

- **#3 Union exhaustiveness — COMPLIANT.** `DrawOp.kind` gained `'warpin'`; the only production consumer is `main.ts` `paintSim` (`:331`), updated to dispatch `'warpin'` before the `blitOp` fallback. Every other `.kind ===` is a `SimProcess.kind` or test filter — none misses the case. (Verified independently by grep + rule-checker.)
- **#4 `??` vs `||` — COMPLIANT.** `op.width ?? WARPIN_DEFAULT_W`, `op.frame ?? 0` — both fields legitimately take `0`; `??` passes `0` through. `render.ts:271,275`.
- **#14 Derived edge at single exit — COMPLIANT.** `advanceWarpIn` is called once, in `stepSim`'s uniform `.map` over every process (`sim.ts:2376`), not inside a branch. Both seed sites (`respawnPlayerProcess`, `enemyProcess`) mirror `mat`. Traced by rule-checker across every spawn path.
- **#21 Degenerate numeric input — COMPLIANT.** `paintWarpIn` guards `if (w<=0||h<=0) return`; `frame` is bounded by `stepWarpIn`; `span` is a constant (no div-by-zero). Second-reader check: `warpInOp` never sets width/height, so production always hits the default path (defensive guard never trips) — but see the coverage note below.
- **#15/#25/#26/#29 Test guards — COMPLIANT.** Source suite anchors to specific lines; magnitude (30 naps) pinned to imported constants; bird-visibility threshold tied to module constants + independent literal.
- **#30 Verbatim vs source — COMPLIANT.** All 7 `warpin.json` verbatim fields byte-match the ROM (independently re-verified by rule-checker AND by me during comment triage).
- **#1 Type-safety escapes — VIOLATION (Medium).** `warpin-wiring-jt13-2.test.ts` `as unknown as Warpish` casts are now unnecessary (the contract `SimProcess` carries `warpIn` as a first-class field). See fix table.
- **#17 Comment mechanism — VIOLATION (Medium).** The `done` docstring's "PLYINT runs" claim is false ROM-mechanism. See fix table.

## Observations

- `[VERIFIED]` No missed `DrawOp.kind` consumer — evidence: `main.ts:330-332` dispatches crumble/warpin before `blitOp`; grep of all `.kind ===` sites shows no other production reader. Complies with #3.
- `[VERIFIED]` The player-asymmetry fix has teeth — evidence: RED phase proved `respawnPlayerProcess(...).warpIn` was `undefined` before the seed; `sim.ts:681` now seeds `startWarpIn()`. Mutation (neutralise surfacing) reddens wiring + jt9-46.
- `[VERIFIED]` The animation advancement is CI-protected — evidence: my `advanceWarpIn`→`return p` mutation reddens `demo-jt11-4` in the full suite (a served enemy that never completes its warp-in is caught). Complies with #14.
- `[MEDIUM][DOC]` False ROM-mechanism claim: `WarpInState.done` doc says "the effect ends and PLYINT runs" at `warpin.ts:73` (+ contract `:71`), but per the ROM `done` (PFRAME 0) precedes an unmodeled wait-for-first-move phase (`:5805-5890`); `PLYINT` is at `:5904/:5910`. Contradicts the file's own header. Confirmed against JOUSTRV4.SRC.
- `[MEDIUM][DOC]` Over-broad citation `:5763-5783` for "feet planted" (`warpin.ts:25`, `render.ts:269`, `warpin-contract.ts:34`, `render-warpin-jt13-2.test.ts:14`) — `:5763-5772` is the WCY shift; `:5774-5783` is a separate WCLENY length clamp. Confirmed against source.
- `[MEDIUM][DOC]` `warpin-contract.ts:22` cites STAND_FRAMES at `:503-512`; this diff itself pushed it to `:527` — a self-staled line-ref in the same commit (#20-shaped).
- `[MEDIUM][TEST]` The warp-in advancement/completion is not pinned by the story's OWN tests — the "once live" jt9-46 assertions use a `{...fresh, warpIn: undefined}` fixture (a state no real process reaches), and `driveToMaterialisingEnemy` stops at frame ~0. CI catches a broken advance via `demo-jt11-4`, but the story should pin it directly. (test-analyzer High → downgraded: it cannot "ship broken" since CI's full suite reddens; the gap is coverage robustness.)
- `[MEDIUM][RULE]` `as unknown as Warpish` double-casts in `warpin-wiring-jt13-2.test.ts:67,81,82,108` are dead weight now that `warpIn` is on the contract `SimProcess`.
- `[VERIFIED / dismissed]` comment-analyzer F3 "enemy white ($1) uncited" — dismissed: the citation exists at `FCB WHI*$11` in the enemy decision blocks (`JOUSTRV4.SRC:5561,5565`); DCONST is a per-process field seeded from that FCB data, not a `STA`. Claim is correct; adding the cite is a nicety (folded into the fix list).
- `[LOW][TEST]` Growth test checks only the two extreme frames; intermediate monotonicity unchecked. Deferred.
- `[LOW][TEST]` `paintWarpIn` default width/height path (the one production uses) is untested. Deferred.

## Devil's Advocate

Suppose this feature is broken in a way the green suite hides. The strongest case: the *animation never plays in the real game*. The render tests drive `paintWarpIn` with hand-built ops and explicit frames — they never prove that a live, stepped sim produces a growing sequence on screen. The wiring tests confirm a `kind:'warpin'` op exists at spawn but stop at frame ~0, and the jt9-46 "live" assertions fake the post-animation state by deleting the `warpIn` field, a state `advanceWarpIn` never produces. So the entire integration — that `stepSim` advances `warpIn` frame-by-frame, that the silhouette grows over ~30 frames, and that it then *stops* and yields to the normal bird — rests on `demo-jt11-4` reddening incidentally. If a future edit changed `demo-jt11-4`, a frozen-at-frame-0 warp-in (only the lit pad, no bird ever) would ship green. A confused player would see enemies materialise as a stubby coloured bar that never becomes a bird — and no story-owned test would fail. That is a real, if CI-mitigated, hole, and it is why the advancement finding stays on the fix list rather than being waved through. On correctness proper: I could not break the state machine — `stepWarpIn` is pure, bounded, idempotent-at-done, and mutation-resistant; `paintWarpIn` guards degenerate sizes; the union dispatch is complete. The exposure is coverage and prose, not logic. A malicious input has nowhere to enter (no user data, pure sim). The verdict rejects on the prose falsehood + the coverage/hygiene cluster, not on a logic defect.

## Design Deviations — Reviewer audit

### Reviewer (audit)
- **Dev: warp-in REPLACES mount+rider during TREFF; jt9-46 AC-1/AC-4 updated** → ✓ ACCEPTED. The REPLACE is ROM-faithful (additive would leave the bird opaque, defeating the story); the jt9-46 change STRENGTHENS coverage (adds "warps in first") rather than weakening the invariant — mutation-confirmed. But the "once live" half relies on a `warpIn: undefined` fixture; see the test finding.
- **Dev: extended sim-contract with warpIn/warpin/owner** → ✓ ACCEPTED, correct mirror. Note: it makes the `as unknown as Warpish` casts obsolete (fix-list item).
- **TEA: Phase-2 descope (wait-for-first-move idle)** → ✓ ACCEPTED, correctly scoped; SM to file. NB: this descope is exactly why the `done`→PLYINT docstring is wrong — `done` stops at the boundary of the descoped phase, not at PLYINT.

## Reviewer Assessment

**Verdict:** APPROVED

**Round 2 (re-review after rework, commit `2465b1ab`).** All seven round-1 findings are resolved and independently re-verified; the code was correct throughout, so the rework was prose/citation + one test, with no logic change. Data flow re-traced: a materialising `SimProcess` → `advanceWarpIn` (single `.map` seam in `stepSim`) → `drawList` `kind:'warpin'` op → `paintWarpIn` silhouette → after 30 frames `warpIn.done` → normal mount+rider ops. Verification of each fix:
- `[DOC]` `WarpInState.done` no longer claims "PLYINT runs" — reworded in `warpin.ts:73` + `warpin-contract.ts` to say the grow-in ends (PLYINT/wait-phase unmodeled; collisions stay `mat`'s job). Header "ending at PLYINT" bullet corrected too.
- `[DOC]` the over-broad `:5763-5783` citation narrowed to `:5763-5772` at all 5 sites; `:5774-5783` now noted as the separate WCLENY clamp. `grep 5763-5783` → none.
- `[DOC]` the self-staled `STAND_FRAMES :503-512` ref dropped (symbol named instead).
- `[DOC]` JT132-02 now cites the located enemy-white value (`FCB WHI*$11`, `:5561`); JT132-07 softened to "the full materialisation sequence ends at PLYINT", not the 30-frame warp-in. All 7 `verbatim` fields still byte-match (warpin-source green).
- `[TEST]` added the stepSim-driven completion test — **mutation-verified by me**: freezing `advanceWarpIn` (`return p`) now reddens it directly (was only caught incidentally by demo-jt11-4). The advancement is pinned by the story's own suite.
- `[RULE]` the obsolete `as unknown as Warpish` casts dropped; `warpIn`/`kind:'warpin'` read off the mirrored contract types. Lint clean.
- `[LOW]` deferred (intermediate-growth loop, default-size test) — accepted as deferred per round 1.

Re-run after rework: full joust **3744/3744** (203 files; +1 completion test), orchestrator **505/505**, `npm run lint` clean, comment-line-refs guard **7/7**, joust builds. No new regressions; the `demo-jt9-46` behavioural change and the sim-contract mirror stand as accepted deviations.

---

**Round 1 (REJECTED) — findings, now all resolved above. Confirmed findings by specialist:** `[DOC]` ×4 (comment-analyzer — the `done`→PLYINT false claim, the over-broad `:5763-5783` citation, the self-staled `STAND_FRAMES` line-ref, the uncited enemy-white value), `[TEST]` ×1 blocking + 2 deferred (test-analyzer — the advancement/completion not pinned by the story's own tests; intermediate-growth and default-size deferred), `[RULE]` ×1 (rule-checker #1 — the obsolete `as unknown as Warpish` double-casts). Preflight: clean. Disabled specialists (edge/silent/type/security/simplifier) compensated by my own mutation testing and manual review — see Observations.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] | `done` docstring falsely says "PLYINT runs" when `done` flips — PLYINT is after the (descoped) wait phase | `warpin.ts:73`, `warpin-contract.ts:71`, and the header "ending at PLYINT" bullet (`warpin.ts` TREFF2 bullet) | Reword: `done` = the 30-frame grow-in ends; the ROM's wait-for-first-move + PLYINT (unmodeled here) still follow. Do NOT imply collisions enable at frame 30 (that is `mat`'s job). |
| [MEDIUM] | Citation `:5763-5783` folds a separate WCLENY length-clamp into "feet planted" | `warpin.ts:25`, `render.ts:269`, `warpin-contract.ts:34`, `render-warpin-jt13-2.test.ts:14` | Narrow to `:5763-5772` (the WCY shift), or describe `:5774-5783` separately as the length clamp. |
| [MEDIUM] | `STAND_FRAMES` cited at `:503-512`; this diff moved it to `:527` | `warpin-contract.ts:22` | Drop the line range (name `STAND_FRAMES` only) or update to `:527`. |
| [MEDIUM] | Animation advancement/completion not pinned by the story's own tests (CI-caught via demo-jt11-4 only; "live" asserted via a `warpIn:undefined` fixture a real process never reaches) | `warpin-wiring-jt13-2.test.ts` (drive helper), `demo-jt9-46.test.ts:250,307` | Add a wiring test: seed a materialising enemy (or player), step `stepSim` ≥30 frames, assert `warpIn.done` flips AND `drawList` stops emitting `kind:'warpin'` and resumes the mount+rider entity ops. Prefer this over the `warpIn:undefined` fixture. |
| [MEDIUM] | `as unknown as Warpish` double-casts now obsolete (warpIn is a first-class contract field) | `warpin-wiring-jt13-2.test.ts:67,81,82,108` | Drop the casts; read `p.warpIn` off the imported `SimProcess` directly (keep `LooseOp` only where `kind:'warpin'` filtering still needs it, or add it to the contract DrawOp too — it is already there, so the cast can go). |
| [LOW] | JT132-02 asserts "enemy white ($1)" as free text without a source cite (claim is CORRECT) | `warpin.json` JT132-02, mirrors | Add the citation `FCB WHI*$11` (JOUSTRV4.SRC:5561) to close the loop. Optional. |
| [LOW] | Growth checked only at the two extreme frames; default width/height path untested | `render-warpin-jt13-2.test.ts` | Optional: loop visible frames for monotonic growth; add a default-size paint test. |

**Handoff (round 1):** To Dev (Loki) for a fix round — prose/citation corrections + one integration test. No logic changes.
**Handoff (round 2):** APPROVED → to SM (Baldur) for finish-story. The Phase-2 wait-for-first-move follow-up (TEA deviation) must be filed by SM before the epic closes; a visual playtest of the spawn silhouette is recommended (owner, non-blocking).
## Impact Summary

**Delivery:** Visible spawn/warp-in animation for player and enemy spawns — phase 1, the 30-frame TREFF grow-in silhouette (ROM JOUSTRV4.SRC:5726-5803). The transporter materialisation WINDOW and audio already existed (jt2-6); this shipped the missing VISUAL.

**Architectural changes:**
- New pure-core `src/core/warpin.ts` — WarpInState + startWarpIn/stepWarpIn, the 30-frame PFRAME sequence (WARPIN_FRAME_COUNT=30, _FRAME_NAPS=1, _BIRD_VISIBLE_PFRAME=20).
- `SimProcess.warpIn` seeded on BOTH spawn paths (fixes the player nap:1 asymmetry), advanced by `advanceWarpIn` at stepSim's single per-process seam.
- `DrawOp.kind` gains `'warpin'` + an `owner` field; `render.paintWarpIn` paints the owner-coloured (DCONST) silhouette growing up out of a lit pad, feet pinned; wired in `main.ts`.
- ROM provenance: `docs/rom-study/claims/warpin.json` (7 JT132-* claims, byte-verified).

**Behavioural change:** `drawList` emits a `kind:'warpin'` op INSTEAD of the opaque mount+rider during the 30-frame window (ROM-faithful; additive overlay would defeat the story). `demo-jt9-46` AC-1/AC-4 updated to assert rider-stacking on the LIVE enemy + new coverage that the fresh arrival warps in first.

**Coverage:** warpin suites 40/40; full joust 3744/3744; orchestrator 505/505; lint clean; joust builds. The advancement/completion is pinned by the story's own stepSim-driven test (mutation-verified).

**Review:** 2 rounds. Round 1 REJECTED on prose/citation accuracy (a false `done`→PLYINT claim, an over-broad :5763-5783 citation ×4, a self-staled line-ref, an uncited value) + one test-hardening gap (advancement not pinned by story tests) + obsolete type-casts. All 7 findings resolved and re-verified; round 2 APPROVED (commit 2465b1ab). No code-logic changes in the rework.

**Deviations (all accepted):** (1) warp-in REPLACES mount+rider during TREFF; (2) sim-contract mirrors the new fields; (3) Phase 2 (wait-for-first-move idle colour-cycle, ROM :5805-5890) descoped → filed as a jt13 follow-up.

**Merged:** PR #518 → develop (mergeCommit 683e1916). **Blocking findings: 0.**
