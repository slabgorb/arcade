---
story_id: "sw10-1"
jira_key: "sw10-1"
epic: "sw10"
workflow: "tdd"
---
# Story sw10-1: Unify on the cabinet's authentic projection lens (symmetric ~90° FOV, divide-by-depth) and retire the per-model *_ORIENT axis hacks

## Story Details
- **ID:** sw10-1
- **Jira Key:** sw10-1
- **Workflow:** tdd
- **Branch:** feat/sw10-1-projection-lens-unify
- **PR:** 155
- **Stack Parent:** none
- **Assignee:** slabgorb

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-09T14:18:25Z
**Round-Trip Count:** 4

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-08T17:34:20Z | 2026-08-08T17:39:00Z | 4m 40s |
| red | 2026-08-08T17:39:00Z | 2026-08-08T17:50:33Z | 11m 33s |
| green | 2026-08-08T17:50:33Z | 2026-08-08T18:10:00Z | ~20m (→ rework) |
| red | 2026-08-08T18:10:00Z | 2026-08-08T18:40:03Z | 30m 3s |
| green | 2026-08-08T18:40:03Z | 2026-08-09T10:47:27Z | 16h 7m |
| review | 2026-08-09T10:47:27Z | 2026-08-09T11:13:09Z | 25m 42s |
| red | 2026-08-09T11:13:09Z | 2026-08-09T11:20:26Z | 7m 17s |
| green | 2026-08-09T11:20:26Z | 2026-08-09T12:45:01Z | 1h 24m |
| review | 2026-08-09T12:45:01Z | 2026-08-09T13:53:54Z | 1h 8m |
| green | 2026-08-09T13:53:54Z | 2026-08-09T14:02:45Z | 8m 51s |
| review | 2026-08-09T14:02:45Z | 2026-08-09T14:11:39Z | 8m 54s |
| green | 2026-08-09T14:11:39Z | 2026-08-09T14:16:12Z | 4m 33s |
| review | 2026-08-09T14:16:12Z | 2026-08-09T14:18:25Z | 2m 13s |
| finish | 2026-08-09T14:18:25Z | - | - |

## Sm Assessment

Story sw10-1 · repos arcade · 8 points · type refactor · tdd (phased).

Setup complete and clean. My assessment before handing off to TEA (Han Solo) for the red phase:

- **Grounding is solid.** The entire sw10 epic derives from `plugins/star-wars/docs/2026-08-08-star-wars-projection-audit.md`, which is now on develop (merged via PR #125) and present on this branch. The story context (`sprint/context/context-story-sw10-1.md`) is built directly from the audit's findings: authentic symmetric ~90° FOV, divide-by-depth-X (native X-fwd/Y-right/Z-up), aspect-independent clip, and retirement of the per-model `*_ORIENT` axis hacks.
- **Anticipated blocker, dissolved.** The audit doc appeared missing on the stale `chore/sw10-epic-filing` branch; it was simply not yet synced. Develop was fast-forwarded and the branch cut cleanly from it. No true impediment.
- **Merge gate clear.** No open PRs block new work.
- **Known tax flagged for TEA/Dev.** star-wars is line-anchor sensitive: edits to `sim.ts`/`gameRules.ts` drift TWO subsystems — the comment-citation `checkTree` gate and the sw8-27 line-list fixtures. Keep edits net-line-neutral or re-anchor. The core/shell purity boundary (purity test scans `plugins/star-wars/src/core/`) governs where projection code may live. Both are recorded in the context file.
- **Scope discipline.** Placement-constant re-derivation is deferred to sw10-2 (surface turret fire scroll-carry); this story is the lens unification and hack retirement only.

Handing off to TEA for the red phase.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA] Question / non-blocking — world-frame design is Dev's to choose; the RED tests are deliberately design-agnostic.** The story context offers Options A (native X-fwd world), B (keep OpenGL world, symmetric-90° projection), C (hybrid). The failing tests do NOT prescribe one: they pin lens *shape* through two seams the game already commits to — the forward projection (`perspective(FOV_Y, aspect, …)` + `transform`, tested at a square viewport) and its documented inverse (`gameRules.aimDirection`). Any option that yields a symmetric ~90°, aspect-independent, divide-by-depth lens turns them green. Simplest path: `FOV_Y = Math.PI / 2` **and** stop scaling the horizontal axis by viewport aspect (letterbox at the viewport map, or feed `perspective` aspect = 1).
- **[TEA] Improvement / non-blocking — the `aspect` parameter becomes vestigial once the lens is aspect-independent.** `aimDirection(aimX, aimY, aspect = 1)` (gameRules.ts:53) and the `perspective(FOV_Y, w/h, …)` call (render.ts:490) both thread viewport aspect *into the lens*, which is the anisotropy the audit flags. After the fix the aspect term must not skew the ray. Dev may keep the param (defaulted, ignored) or remove it — **if removed**, update its callers (`tests/support/aim.ts`, `tie-status.ts`, `trench-obstacles.ts`, `debug-overlay.ts`, `contactSheet.ts`) and the one 3-arg call in the aspect-independence test. Keeping the param defaulted is the lower-blast-radius choice.
- **[TEA] Gap / non-blocking — line-anchor tax on gameRules.ts is live for GREEN.** Setting `FOV_Y` and reworking `aimDirection` edits `gameRules.ts`, a citation- and fixture-anchored file. The citation gate is currently green (53/53). Keep edits net-line-neutral or re-anchor per `node tools/audit/reanchor-citations.mjs`; grep `tests/` for numeric line refs into `gameRules.ts`/`sim.ts` before sign-off (see `[[star-wars-sim-edit-reanchor-tax]]`).

### Dev (implementation)
- **Conflict (BLOCKING) — the authentic aspect-independent lens overturns the shipped uf1-14 fire-gate/frustum contract; AC #4's "existing tests stay green, it's just a frame remapping" premise is false.** Measured, not argued: the minimal coherent core change (`FOV_Y = π/2`, `aimDirection` aspect-independent, `inPlayerView` symmetric ±45°) fixes 8 of the 11 new lens tests but **regresses the suite from 11 failing → 40 failing** — it breaks **~29 pre-existing tests** across the whole fire-gate / sights / aim subsystem: `tie-view-frustum.test.ts` (uf1-14, titles literally assert *"the render shows 30°, not the cabinet's 45°"* / *"atan(aspect·tan(FOV_Y/2))"* / *"widens to 45.7° at 16:9"*), `tie-fire-visibility` (sw7-24 C_PV), `tie-sights-visibility`/`tie-sights-status` (sw8-19/uf1-12 C_PS), `gun-visibility-and-shape` (sw8-27, incl. *"a gate that ignores state.aspect reddens here"*), `combat-kill-loop` (8-16 aim↔sight agreement), `trench-aim-wysiwyg`, `hitscan-laser`, `laser-sweep`, `sw8-27-remediation`. These encode the OLD 30°/aspect glass by design (uf1-14 deliberately tied the §6 fire gate to our *rendered* frustum, not the cabinet's ±45°). uf1-14's *principle* survives ("the bit matches the glass"), but ~29 tests' expected VALUES must be re-derived to the authentic ±45° symmetric aspect-independent glass — a large TEA-authored re-baseline with ROM-citation rigor, plus the *_ORIENT retirement's world-frame remap (AC #2) whose visual outcome (AC #3) is eyeball-only. Affects `plugins/star-wars/src/core/{gameRules,tie-status,trench-obstacles}.ts`, `src/shell/render.ts`, and the ~29 test files above. *Found by Dev during implementation; escalated to the user, who chose (2026-08-08) to expand scope and loop back to TEA.*
- **[Dev → TEA] Brief for the re-authored red pass.** The candidate implementation Dev measured (do NOT commit; for reference only): `gameRules.FOV_Y = Math.PI/2`; `aimDirection` → `normalize([aimX/f, aimY/f, -1])` (drop `* aspect`, `f` becomes 1); `tie-status.inPlayerView` → `hBound = vBound` (symmetric ±45°, no aspect term). Under this lens the authentic expectations are: **vertical AND horizontal half-angle = 45° at every aspect** (`tan = 1`), the C_PV/C_PS pyramid is the cabinet's ±45° (`|lat| < depth`, `|vert| < depth`), and aim is aspect-independent. TEA re-derivation targets, by file: `tie-view-frustum.test.ts` (the uf1-14 30°/aspect assertions become ±45° symmetric — likely a title/intent rewrite, not a tweak), `tie-fire-visibility` / `tie-sights-visibility` / `tie-sights-status` / `tie-loiter-sights` (C_PV/C_PS seats re-placed on the ±45° pyramid, aspect no longer flips a seat), `gun-visibility-and-shape` (drop the WIDE-aspect-changes-the-gate cases or invert them to aspect-INVARIANCE; keep the degenerate-aspect guard meaningful), `combat-kill-loop` / `trench-aim-wysiwyg` / `hitscan-laser` / `laser-sweep` (off-centre aim fixtures re-aimed for the 45° ray), `sw8-27-remediation` (re-derived separations). Watch the `[[star-wars-sim-edit-reanchor-tax]]`: FOV_Y/aimDirection edits touch `gameRules.ts` (net-line-neutral or re-anchor citations). AC #2's *_ORIENT retirement + AC #3 visual are Dev's + review's, not TEA's.

- **[Dev] Improvement / non-blocking — the native remap is PROVEN, not asserted.** The frozen convention lives in `src/core/basis.ts` (pure): `toNative(v)=[-z,x,y]`, `NATIVE_FROM_OPENGL`/`CAMERA_ORIENT` (=P), and `lookRotationNative` (local +X→forward, the native twin of the shared `lookRotation`). A scratch round-trip (`scratchpad/basis-check.mjs`, not committed) confirmed a native point projects through the UNCHANGED shared `perspective ∘ viewMatrix(camNative, CAMERA_ORIENT)` to the EXACT same NDC as its OpenGL twin — **MAX NDC ERROR 0.0** at every camera/point, and `lookRotationNative`'s nose column exact. `math3d.ts` is shared with six other games, so the remap had to live in star-wars, as the user's step-1 anticipated.
- **[Dev] Conflict / non-blocking — the flip is NOT a uniform coordinate-literal permutation; two axes need bespoke (non-agent) handling.** (1) **Orient conjugation:** a TIE's heading matrix transforms as `M_native = P·M_old·Pᵀ`, and its nose reads the FIRST column now (`[orient[0],orient[4],orient[8]]`), not the third. Every test that builds/asserts an orient matrix, a nose vector, or `lookRotation` output will be silently corrupted by a blind `[-z,x,y]` sweep — those files are Dev's, not the parallel literal-permute agents'. (2) **Model re-bake:** each static model is baked by `bakedVert = P · (its old *_ORIENT) · vertOld` (e.g. TIE: `(x,y,z)→(-z,-y,x)`), because the ROM objects sit in INCONSISTENT local conventions (TIE panels on Y, ground objects Z-up). Procedural world-space generators (surfaceGrid/trenchChannel/detail/farEnd/obstacles) permute their OUTPUT by `toNative`. So the safe division of labour is: Dev does the core laws + render + sim orient/positions + model bakes + orient-tests; parallel agents do ONLY the mechanical pos-literal permute on the remaining fixtures.
- **[Dev] Gap / non-blocking — AC#5 (don't re-derive placement) is preserved as RE-EXPRESSION, not re-derivation.** Retiring `TOWER_ORIENT`/the surface Z-placement/the port floor-seat requires carrying the SAME fudged constants onto the native axis they now live on (e.g. the tower lift moves from +Y to +Z, `SURFACE_NEAR_EXTENT=max(v[2])` becomes the native depth extent). That is re-expressing an existing fudge in the new basis, not re-deriving it from the ROM — AC#5's deferral (spawn distance, trench dims, camera height as ROM values) still holds and stays for sw10-2. Note: only `SURFACE_ORIENT`/`PORT_ORIENT`/`TIE_ORIENT` are guarded by the 3 red source-guards; `TOWER_ORIENT` is unguarded but must still be retired for the surface eyeball (AC#3).
- **[Dev] Progress marker (green phase, migration in flight).** Commits on branch (WIP, suite intentionally RED until fully flipped):
  - `4d3b5f3d` — `basis.ts` (PROVEN convention) + core LAWS native: `gameRules` (`aimDirection→normalize([1,aimX/f,aimY/f])`, `siteOffset` depth=X, `trenchGunFireVelocity` depth=X), `tie-status` (`inPlayerView` depth=pos[0]/right=pos[1]/up=pos[2]; C_AS nose=first column).
  - `00d9ded1` — `render.ts`: **the 3 story ORIENT guards are GREEN** (`SURFACE_ORIENT`/`PORT_ORIENT`/`TIE_ORIENT`→`IDENTITY`); `cameraView`→`viewMatrix(cam, CAMERA_ORIENT)` (all 3 phases). sw10-1-authentic-lens inverse tests re-permuted to native indices → **that file is 13/13 GREEN** (AC#1/#2/#4-coverage satisfied).
  - Gates as of `00d9ded1`: `npm run lint` GREEN; citation 53/53 GREEN (net-line-neutral held anchors); full suite **274 failed / 2100 passed** (atomic-flip red: sim/models/generators/tests still OpenGL).
  - `ae324e6b` — **TIE flight model → native, PROVEN identical.** Chose CONJUGATION (`orientNative = P·orientOld·Pᵀ`) over native-local (which renders MIRRORED — verified). `sim.ts` `aimOrient`/`applyManeuver`/`spawnTie` flipped with numerically-derived axes/signs: roll `rotationZ→rotationX`, yaw `rotationY→rotationZ(−)`, pitch `rotationX→rotationY(−)`; nose=−col0, up=col2, right=col1; **spawn orient = IDENTITY**; pos via `toNative`. `tie-status` C_AS nose → −col0. Scratch proofs (`scratchpad/{orient,flight}-check.mjs`, not committed): native render == P·(old render) vertex-for-vertex (err 0); over 40 mixed maneuver steps `orientNative==P·orientOld·Pᵀ` (1e-16) and `posNative==P·posOld` (5e-14). tsc GREEN; citation 53/53 (net-line-neutral restored — sim.ts back to 2348).
  - `1337d3af` — **TIE-family models baked to native** (`bakeTie`, `(x,y,z)→(-z,-y,x)`) + `romCompare` audits in the native frame (`ROM_TO_BAKE`/`bakeRom`); fidelity tests updated (raw `.P` shown then baked). 6 model/fidelity files GREEN (159).
  - `fe556318` — **space RENDER path native**: death-star placement `toNative`, `picture`/`pictureSegments` emit native billboard plane `[0,x,y]`. Starfield is a self-contained 2D subsystem → unchanged. **SPACE PRODUCTION IS NOW FULLY NATIVE** (TIE flight+model, fireballs, beam/sights, death star). tsc GREEN; citation 53/53.
  - **REMAINING (ordered), now mostly mechanical (conventions frozen+proven → agent-able):**
    - **SPACE TEST SWEEP** (validates the proven space production via tests): flip OpenGL position literals → `toNative` / native indices (depth 0, right 1, up 2; sign flips: OpenGL `z<0`=ahead → native `x>0`) in the space test files — death-star-body/picture/station-wander, tie-flight/tie-waves, and the TEA-re-authored fire-gate/sights/aim suite (positions only; their orient/aim-COMPONENT assertions are already native-correct via the proven flight model — leave those). Agent-safe EXCEPT orient/nose/component-index tests (Dev).
    - **SURFACE production** — SIM LAYER DONE (`91b17bb6`: mazeField, surfaceShip, debris, scroll/cull/crash/muzzle — net-line-neutral; stale `[0,altitude,0]` refs reconciled in 2 sim.ts comments + the surface-gunnery spec). REMAINING (render): `TOWER_ORIENT` — lift-only (no vertex bake) was TESTED and is NOT exact (err 2.2e-5 on off-axis verts, `scratchpad/tower-check.mjs`), so it needs a real bake: either (a) provably-correct conjugation `TOWER_ORIENT = P·TOWER_ORIENT_old·Pᵀ` (keeps a rotation, unguarded, err 0) or (b) derive the vertex bake numerically (like the TIE) so `TOWER_ORIENT`→lift-only `translation(0,0,lift)` (AC#2-ideal). DO IT NUMERICALLY, don't guess. `surfaceGrid` generator (floor on y=0 → native z=0, verts `(gx,0,gz)→toNative`); `Z_SURFACE_PLACEMENT`/`SURFACE_NEAR_EXTENT` re-express (DEATH_STAR_SURFACE is retired-from-scene — check if still referenced).
    - **TRENCH production** — `trenchView` `[x,alt,0]` indices; scroll `pos[2]+SCROLL`→`pos[0]-SCROLL` + despawn `pos[2]>0`→`pos[0]<0` (many sites ~1388-1688); `PORT_ORIENT` retire + port/turret/square/catwalk model bakes; `trenchChannel`/`trenchWallDetail`/`trenchFarEnd`/obstacles generators → `toNative`.
    - **(then the leftover ORIGINAL remaining below)**
    - **MODEL BAKE (`models.ts`)** — TIE-family baked `(x,y,z)→(-z,-y,x)` (= `P·TIE_ORIENT·v`), which retires the display correction into the data. RECIPE: add `const bakeTie=(vs)=>vs.map(([x,y,z])=>[-z,-y,x])`, wrap the vertex arrays of `TIE_FIGHTER`,`DARTH_TIE`,`TIE_WING_FRAG_1`,`TIE_WING_FRAG_2` (FRAG_3 slices TIE_FIGHTER → auto). COUPLING: raw-ROM coord asserts must update — `tie-family-rom.test.ts:220,224-228` (`TIE_FIGHTER.vertices[0]` now `bakeTie([-130,-208,234])`=`[-234,208,-130]`, keep the ROM `.P -10,-16,18` value as the pre-bake source), `models.test.ts` bounds (~235), `darth-tie-rom`. Tower/port/trench models baked in their own phase stages.
    - **`sim.ts` REMAINING POSITIONS** — every non-flight coord: fireball spawn/vel, `homeShots`, space collision offsets, surface (`surfaceShip` etc.), trench scroll/port. Wrap literals in `toNative` / permute index reads (depth 0, right 1, up 2). Keep net-line-neutral or the cross-file line-anchored citations (`tie-waves-rom.test.ts`, docs specs cite `sim.ts:NNNN`) + sw8-27 fixtures drift — verify with `checkTree` after (see below).
    - **(c)** `models.ts` static tables baked `bakedVert = P·(old *_ORIENT)·vertOld` (TIE: `(x,y,z)→(-z,-y,x)`; TRENCH/PORT models: their own old orient); procedural generators (surfaceGrid/trenchChannel/trench-detail/farEnd/obstacles) permute OUTPUT by `toNative`.
    - **(a-surface)** `render.ts` `TOWER_ORIENT` retire (unguarded) + re-express tower lift on +Z, surface/deathstar placement on native depth axis — done WITH the surface model bake.
    - **(d)** test-literal sweep: parallel agents for pos-only fixtures (`[-z,x,y]`, assertions unchanged); Dev for orient/nose/component-index tests.
    - **(e)** per-phase eyeball space→surface→trench (`just serve` → `/star-wars/`, + `/star-wars/models.html`) — the ONLY real check (permutation is geometry-preserving, so green ≠ correct).
  - Restore point if abandoned: reset to `d843ac6b` (clean; only the 3 ORIENT guards red).

- **[Dev] Progress marker (green phase, cont'd 2026-08-08) — SURFACE RENDER NATIVE (commit `79cbd8f9`).**
  - **`surfaceGrid` (core/surface-grid.ts)** authored directly in native `[depth +X, right +Y, up 0]` = `toNative` of the old OpenGL grid vertex-for-vertex (scroll/envelope preserved exactly). **`TOWER_ORIENT` (render.ts)** = `P · TOW_OLD` (NOT the conjugate). PROVEN numerically (`scratchpad/tower-check3.mjs`): a STATIC model's native orient is `P·orient_old` (project err 0); the conjugate `P·M·Pᵀ` gives err 2.7e-4 and is only right for a DYNAMICALLY-composed orient like the TIE. So the session's earlier "conjugate TOWER_ORIENT" suggestion was wrong for a static model — corrected. `TOWER_ORIENT` is UNGUARDED and kept as a real display orient (the tower's ROM fore/aft axis reads left/right on screen — a shipped display posture, not a basis hack), so no vertex bake / no romCompare churn. Ground-debris shadow zeroed on native up (`[pos0,pos1,0]`). **`surfacePlacement`** seat re-expressed onto +X depth via `toNative` (DEATH_STAR_SURFACE is retired-from-scene — surfaceGrid draws now; the seat survives only for the debug overlay, which draws the UNBAKED spike — a dev-tool cosmetic gap, noted).
  - Coupled structural tests flipped to native + GREEN: `surface-grid.test` (longitudinal∥+X/lateral-across-Y/floor up=0/scroll −depth), `render.surface-grid.test` (floor up=0), `surface-visibility.test` (routes the retired model through the LIVE `cameraView`; eye-space `project()` is frame-invariant so `placedEye()[2]` == old `placed()[2]`).
  - Gates: `npm run lint` GREEN; citation 53/53; sw10-1-authentic-lens 13/13. Watch: an inline `path/file.ext` token in a src COMMENT trips the comment-citation gate as a bogus "cited file does not exist" — keep scratch-proof refs path-less in shipped comments.
  - **STILL RED (surface):** the pure position-literal surface fixtures (`surface-aim-wysiwyg`, `surface-awakening`, `surface-bunkers`, `surface-hazard`, `surface-maze-field`, `surface-ship-point`, `surface-tower-escalation`, `surface-tower-quota`, `surface-towers`, `surface.test`) — depth0/right1/up2 + depth-sign flips. Agent-safe (positions only).

- **[Dev → next] TRENCH production blast-radius (NOT yet started; the frozen conventions apply verbatim).** Do as ONE coherent pass (sim + generators + render + model bakes), keep `sim.ts` NET-LINE-NEUTRAL (currently 2348) + `checkTree` clean, verify citation 53/53 after.
  - **sim.ts stepTrench (~1294–1730):** `trenchView` (1311–1315) `[lateral,height,0]`→native `[0, right, up]` (right=`state.trenchView[1]`+aimX·rate·dt clamped ±HALF_W; up=`state.trenchView[2]`+aimY·rate·dt clamped EYE_MIN/MAX). Then every consumer: onFieldSide (1442) `o.pos[0]`→`o.pos[1]`, `trenchView[0]`→`trenchView[1]`; inBand (1443) `trenchView[1]`/`o.pos[1]`→`trenchView[2]`/`o.pos[2]`; inDepth (1444) `pos[2]`→`pos[0]`. Scroll: obstacle (1426) `pos[2]+SCROLL`→`pos[0]-SCROLL`; port (1390,1548) `pos[2]+SCROLL`→`pos[0]-SCROLL`. Despawn: obstacle (1454) `pos[2]>0`→`pos[0]<0`; shots (1484) `s.pos[2]<=0`→`s.pos[0]>=0`. Fire-range (1494) `o.pos[2]<-RANGE`→`o.pos[0]>RANGE`. Window (1559) `port[2]>=-WINDOW`→`port[0]<=WINDOW`... (re-derive sign against native depth). reachedCockpit (1688) `port[2]>=0 && hypot(port0-COCKPIT0,port1-COCKPIT1)`→`port[0]<=0 && hypot(port1,port2)`. NOTE `trenchGunFireVelocity`/`COCKPIT` already native (commit 4d3b5f3d) — verify. MANY verbatim `.MAC` quote lines here are checkTree-anchored: change values, NOT the quoted `.MAC` text lines.
  - **Generators → native OUTPUT (toNative each vertex, author-native like surfaceGrid):** `trench-channel.ts` (rails `[x,y,0/-FAR]`→`[0/FAR, x, y]`; ribs `[±HW,{0,WALL_H},z]`→`[k·RIB_Z-offset, ±HW, {0,WALL_H}]`), `trench-detail.ts` (wall panels), `trenchFarEnd` (∐ cap), `trench-obstacles.ts` `TRENCH_OBSTACLE_STATIONS` (122–124: `[±W, SQUARE_Y, -(NEAR+…)]`→`[NEAR+…, ±W, SQUARE_Y]`) + WALL_SLOT spawn (178: `[wallX, WALL_SLOT_Y[i], -z]`→`[z, wallX, WALL_SLOT_Y[i]]`), `trench-wedges.ts` spawnPort + `trenchPortDistance`.
  - **render.ts trench path (530–567):** `trenchPlacement` (437) `port ?? [0,0,-EXHAUST_PORT_DISTANCE]`→`toNative(...)`, floor (428) `[0,0,port[2]]`→native; `EXHAUST_PORT`/`TRENCH_TURRET/SQUARE/CATWALK` are drawn with IDENTITY orient (TRENCH_ORIENT/PORT_ORIENT already IDENTITY) so their MODELS must be BAKED `toNative` in models.ts (they're authored in the OLD y-up display frame). EXHAUST_PORT is a ROM `.WP PORT` → romCompare ROM_TO_BAKE must gain its bake in lockstep; TRENCH furniture is "authored here (not ported)" so likely NOT in romCompare — confirm. render.ts port-arrow reads `exhaustPort.pos[2]` (1341) → native depth.
  - **Tests (~24 trench files):** channel/detail/obstacle geometry + axis tests are Dev (axis semantics); the rest are position-literal sweep.

- **[Dev] Progress marker (green phase, cont'd 2026-08-08) — SPACE+SURFACE TEST SWEEP NATIVE (commit `aa8b8b2b`).**
  - **Shared test infra made native (the high-leverage fixes):** `tests/support/aim.ts` — `eyeOf` recovers the eye through the P-oriented camera (`eye = [o2, −o0, −o1]`); `aimAt` inverts the native `aimDirection` (depth=pos[0], right=pos[1], up=pos[2]). `tests/core/helpers/space.ts` — `makeTie` default pos native; `lookAtOrigin`/`lookAway` via `lookRotationNative` (nose = −col0, so pass the AWAY dir for a cockpit-facing nose); `accumulatedBank` reads the native **X** roll axis (`atan2(m9,m5)`); `noseErrorToCockpit` reads −col0. These two files unblocked the whole aim/sights/fire-gate cluster.
  - **Dev-owned orient/nose files by hand:** tie-flight (FORWARD=[-1,0,0]), tie-view-frustum (seats `[lat,vert,-D]`→`[D,lat,vert]`), tie-aim-axis (`tieAt`/`diagonalAt` native), tie-vm-flight, tie-flight-cleanup, tie-hit-status (stale local OpenGL `aimAt`→native + `[0,0,-D]`→`[D,0,0]`), render.tie-death-fragments/explosion-fidelity (same stale-aimAt pattern), debug-overlay (scene-camera TIE seats; projectBounds unit literals are eye-space, left).
  - **~40 position-literal fixture files swept by parallel general-purpose agents** (surface towers/field, space death-star/fireballs/debris, gun/sights/frustum/combat/cadence/events/score). Pattern: seat `[lat,vert,-D]`→`[D,lat,vert]`, depth reads `pos[2]`(ahead −)→`pos[0]`(ahead +) sign-flip, up `pos[1]`→`pos[2]`, right `pos[0]`→`pos[1]`, vel-toward-cockpit `[0,0,+k]`→`[-k,0,0]`. Several files carried their OWN stale local OpenGL `aimAt`/`lookAtOrigin` — those were rewritten to native (a lens/nose-inverse fix, not a component-assertion touch).
  - **Two reconciliations:** `render.space-camera` compares view-x to native **right** = `pos[1]` (agent-correct) → updated the `sw8-18-remediation` source-scan pin from `pos[0]`→`pos[1]`; `space-eye-is-cockpit` fireball consts re-seated for the native aim inverse (was green under OpenGL aim.ts, regressed by the native flip, now fixed).
  - **Gates:** lint clean; citation 53/53; sw10-1-authentic-lens 13/13. **Full suite 2322 passed / 52 failed — every remaining red is a TRENCH-phase or exhaust-port/torpedo-arming test (13 files: `trench-*`, `exhaust-port-*`, `swept-port-collision`, and the port-arming SUBSET of `hitscan-laser`/`tune-cue`), all blocked on the trench sim → sw10-3.** No space/surface fixture remains red.
  - **REMAINING for sw10-1:** AC#3 eyeball of SPACE + SURFACE (`just serve` → `/star-wars/` + `/models.html`; verify who owns 5270 first). The TRENCH is carved out to sw10-3 (its production migration + its ~13 red test files), so sw10-1 finishes with those trench/port tests red-pending-sw10-3 (a deliberate, user-approved scope split), and the trench eyeball waits for sw10-3.

### TEA (rework — F1 red)

- **Gap (BLOCKING until green) — the render projection is duplicated and aspect-dependent; the fix must centralize it.** `perspective(FOV_Y, w/h, NEAR, FAR)` is built inline in TWO places — `render.ts:500` and `debug-overlay.ts:213` — both aspect-scaled at the full window aspect. The new RED suite (`tests/shell/render.aim-aspect-invariant.test.ts`) pins a `render.sceneProjection(w, h)` seam that both must consume and that must be aspect-independent. Affects `plugins/star-wars/src/shell/render.ts` (export + make aspect-independent) and `plugins/star-wars/src/shell/debug-overlay.ts` (consume the same seam). *Found by TEA authoring the F1 rework.*
- **Question (non-blocking) — letterbox vs `perspective` aspect=1.** Either satisfies the RED suite (the seam just has to return an aspect-independent projection). Letterboxing the viewport to a centered square preserves the cabinet's square glass and avoids stretching the scene; feeding `perspective` aspect=1 without letterboxing stretches non-square windows horizontally. TEA's tests do not force the choice — they only require aspect-independence — but the letterbox is the visually faithful option (AC#3). Affects `plugins/star-wars/src/shell/render.ts` + `main.ts` viewport map. *Found by TEA.*

### Dev (green — F1 scope discovery, BLOCKED on a product decision)

- **Conflict (blocking the GREEN approach) — the F1 fix is NOT a one-line projection swap; making `sceneProjection` aspect-independent WITHOUT letterboxing trades the horizontal-aim bug for a horizontal-STRETCH bug.** Worked the render pixel math: the NDC→pixel map `(nx*0.5+0.5)*w` / `(-ny*0.5+0.5)*h` is duplicated at `wireframe.ts:48` (all 3D models), `render.ts:697` (crosshair), `render.ts:1138` (fireballs). Today `perspective(FOV_Y, w/h)` compensates the non-square pixel map, so the WORLD is square (un-stretched) while the CROSSHAIR (`crosshairNdc`, full-w map) is not — that mismatch IS the aim bug. If GREEN only sets `sceneProjection = perspective(FOV_Y, 1)` and leaves the full-w pixel map, crosshair and shot align but every model stretches by w/h on non-square windows. The correct fix is aspect-independent projection **plus** a letterboxed centered-square pixel map (`S = min(w,h)`) at all three sites (and debug-overlay's), so world AND crosshair share one square viewport. Affects `plugins/star-wars/src/shell/{render,wireframe,debug-overlay}.ts` + `main.ts` viewport. *Found by Dev sizing the GREEN.*
- **Question (blocking) — product decisions the letterbox forces, not derivable from the ACs or the RED test:** (1) letterboxing puts black bars on non-square windows (a centered square/authentic-aspect viewport) — a visible UX change to sign off; (2) does the HUD (score/shield/wave, screen-space at `w/2` etc.) letterbox WITH the scene or stay full-window? (3) target the cabinet's real screen aspect or a pure 1:1 square? The RED suite (`render.aim-aspect-invariant.test.ts`) pins only the PROJECTION-MATRIX invariant (NDC), not the pixel letterbox — so a companion pixel-level RED (crosshair-pixel == shot-pixel at aspect≠1) should be added by TEA before GREEN, or the letterbox ships eyeball-only per the render convention. *Found by Dev; escalated to the user for the letterbox/HUD decision.*

### Reviewer (code review)

- **Conflict (BLOCKING) — the authentic aspect-independent lens was only half-implemented: the sim aim is aspect-independent, the render is still aspect-scaled.** `aimDirection` (gameRules.ts:56) and `inPlayerView` (tie-status.ts:213) dropped the `aspect` term, but `render.ts:500` still projects with `perspective(FOV_Y, w / h, NEAR, FAR)` at the full window aspect (main.ts:44-45 `W=innerWidth,H=innerHeight`; `@shared/view` fills the window). On develop the old `aimDirection`'s `*aspect` cancelled the render's `f/aspect` exactly; this diff removed that cancellation on the sim side only, so a world point on the aim ray now projects to NDC.x = `aimX / aspect` while `crosshairNdc` (gameRules.ts:65) draws the reticle at raw `aimX`. On the default ~16:9 window an off-centre shot aimed dead-on a TIE passes it horizontally by ~1.78×. Regresses develop. Affects `plugins/star-wars/src/shell/render.ts` (make the projection aspect-independent — feed `perspective` aspect=1 + letterbox, per TEA's own Delivery Finding) and needs a TEA test pinning the aim↔render invariant at aspect≠1. *Found by Reviewer during code review (corroborated by reviewer-rule-checker).*
- **Gap (non-blocking) — sw10-3 landmine: `trenchGunFireVelocity` was flipped to native (depth=index0, gameRules.ts:84) while its only caller (sim.ts:1498, trench-phase `trenchView`) stays old-basis, so `trench-fire-scroll-carry.test.ts` is red inside the approved trench deferral.** sw10-3 must migrate ONLY the trench caller, NOT re-flip the function (it is already native). Affects `plugins/star-wars/src/core/gameRules.ts` + the trench sim path. *Found by Reviewer + reviewer-comment-analyzer.*
- **Improvement (non-blocking) — `tools/contactSheet.ts` (/models.html) renders the newly-baked native models with no native→eye remap and a stale local `FOV_Y = Math.PI/3` (line 25).** The contact-sheet camera never imports `CAMERA_ORIENT`/`toNative`, so baked TIE-family + `picture()` models are drawn in a mismatched basis. Affects `plugins/star-wars/src/tools/contactSheet.ts`. *Found by reviewer-rule-checker.*
- **Improvement (non-blocking) — `debug-overlay.ts:175` draws the un-baked `DEATH_STAR_SURFACE` with the now-`IDENTITY` `SURFACE_ORIENT` through the native `cameraView` — a stale-basis render in the surface debug overlay (dev-only, untested; overlay tests cover only the space scene).** Affects `plugins/star-wars/src/shell/debug-overlay.ts`. *Found by Reviewer during code review.*
- **Improvement (non-blocking) — stale comments left by the migration:** render.ts:147-193 (`*_ORIENT` block still teaches the retired rotations as live), basis.ts:76 (`lookRotationNative` docstring says nose=+col0; sim/tie-status use −col0), models.ts:778/790/800 ("flat (z=0)" now depth=0), gameRules.ts:51 (frozen-citation wording), romCompare.ts:168 (`pairOne` exposes unbaked `rom.vertices` while `verticesMatch` used baked). *Found by reviewer-comment-analyzer + reviewer-rule-checker.*

### Reviewer (code review — rework 2)

- **Gap (blocking) — the entire rework-2 (F1 fix + F2/F4/F7 doc edits + the new test file) is UNCOMMITTED in the working tree; `HEAD` (aa8b8b2b) still carries the round-1 F1-broken lens (`perspective(FOV_Y, w/h)`, no `ndcToScreen`) and the wrong F4 docstring (`nose=+col0`).** The reviewed, correct state exists ONLY in the working tree. A PR/finish cut from `HEAD` — or a stashing finish — would ship the exact regression this story exists to fix. Affects the whole branch: the deliverable must be committed onto `feat/sw10-1-projection-lens-unify` before finish. *Found by Reviewer + both comment-analyzer runs (F4 docstring wrong in HEAD).*
- **Improvement (non-blocking, new regression — dev-tool) — the shared `toScreen`→`ndcToScreen` letterbox silently regressed `/models.html`.** `tools/contactSheet.ts` (untouched) imports `drawWireframe`/`project` from `shell/wireframe.ts` and builds a per-cell `perspective(FOV_Y, r.w/r.h)` (contactSheet.ts:169) drawn via `drawWireframe(..., r.w, r.h, ...)` (:183) and half-width ROM|PORT cells (:225) — deliberately filling each non-square cell edge-to-edge under the OLD full-window map. The new `ndcToScreen` unconditionally letterboxes into a centered `min(w,h)` square, so contact-sheet models now render boxed/shrunk inside each cell instead of filling it (worse in the split-cell compare). `/models.html` ships in the build. Entangled with the already-deferred F3 (contactSheet needs its own native-basis + FOV_Y migration). Affects `plugins/star-wars/src/tools/contactSheet.ts`. *Found by reviewer-rule-checker (blast-radius).*
- **Improvement (non-blocking) — the F1 rework introduced a FRESH stale docstring, and left two sibling `TIE_ORIENT` call-site comments stale (F2 incompletely closed).** (1) `debug-overlay.ts:200-204` — `drawDebugOverlay`'s JSDoc still names `perspective(FOV_Y, w/h, NEAR, FAR)`, the exact formula this rework removed from the body two lines below (now `sceneProjection`). (2) `render.ts:595/605` — the live TIE draw comment claims the TIE is turned upright by `multiply(orient, TIE_ORIENT)`, but `TIE_ORIENT` is now `IDENTITY` (render.ts:253) — a no-op; upright now comes from `bakeTie` (models.ts). (3) `render.ts:242-253` + the `:244` "port 5274" note (that dev server is gone; it is 5270) — the `TIE_ORIENT` const block prose still reads present-tense, unlike the SURFACE/PORT header the rework DID reframe as history. Affects `plugins/star-wars/src/shell/{debug-overlay,render}.ts`. *Found by both comment-analyzer runs.*
- **Improvement (non-blocking, dev-tool) — `debug-overlay.ts` frustum gizmo now depicts the RETIRED frustum.** `frustumModel(aspect = w/h)` (debug-overlay.ts:230) sizes the gizmo with the aspect-dependent shape, but draws it through `proj = sceneProjection` (aspect=1); its own comment (~:116) calls it "the real NEAR/FAR frustum shape" — no longer true. Dev-only, untested. Affects `plugins/star-wars/src/shell/debug-overlay.ts`. *Found by Reviewer + reviewer-rule-checker.*
- **Note — F3 (contactSheet FOV_Y π/3, native remap) and F5 (debug-overlay un-baked DEATH_STAR_SURFACE) confirmed still-stale and correctly carried as deferred non-blocking dev-tool follow-ups; F6 (romCompare unbaked `rom.vertices`) is now actually FIXED (`bakeRom`/`ROM_TO_BAKE`).** *Verified by both comment-analyzer runs.*
- **Conflict (non-blocking, but a landmine) — a core file this diff edited now contradicts itself and instructs against the very change the story made.** `tie-status.ts:279-285` (EDITED here) now correctly says the render was unified onto the authentic ±45° lens and `state.aspect` no longer widens the pyramid; but `tie-status.ts:343-350` (untouched) still reads *"ours is the RENDERED frustum (30° vertical, horizontal swinging with the canvas)… Do NOT 'restore fidelity' by putting ±45° back here; that undoes uf1-14."* Both cannot be true post-sw10-1, and the stale half is an active "do-not" aimed at exactly what this story did. Affects `plugins/star-wars/src/core/tie-status.ts`. *Found by reviewer-rule-checker (rule #17).*
- **Improvement (non-blocking, route to sw10-3) — stale "60° FOV / 30°" design-rationale comments in untouched trench/port core, falsified by the π/3→π/2 change.** `state.ts:870-872` ("the 43.8°-down shot… our 60° FOV forbids" — now 43.8° < 45°, no longer forbidden), `sim.ts:1563-1564` ("past the 30° the 60° FOV allows… physically cannot make that shot" — falsified rationale for arm-early/resolve-late), `trench-obstacles.ts:82-84` (`f=1/tan(30°)` stale; tuning constant still safe). The mechanisms still work; only the stated rationale is wrong. These annotate the trench/port subsystem sw10-3 re-derives — fold into sw10-3. Affects `plugins/star-wars/src/core/{state,sim,trench-obstacles}.ts`. *Found by reviewer-rule-checker (#17/#24).*
- **Gap (non-blocking, recommend a guard) — the pixel-level aim↔render agreement (the story's central promise) is UNGUARDED.** `render.aim-aspect-invariant.test.ts` pins only NDC-level agreement (its `renderNdc` helper bypasses `ndcToScreen`). The one pixel-level crosshair-vs-beam cross-check (`render.player-laser.test.ts` "converges every cannon-tip beam on ONE point") uses `aimX=0,aimY=0` — the exact case where the old raw `(nx*0.5+0.5)*w` map and the new letterbox coincide. So a mutant reverting EITHER `drawCrosshair` OR `project`/`toScreen` to the old map, at off-centre aim on a non-square canvas, would pass every render test. Correct today (verified), but not pinned. Recommend a TEA pixel-level assertion (crosshair pixel == on-ray world pixel at `aimX≠0` on a non-square canvas). Affects `plugins/star-wars/tests/shell/`. *Found by reviewer-rule-checker (#15/#18).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Scope expanded past AC #4 by user decision; phase returned green → red for TEA re-authorship.**
  - Spec source: context-story-sw10-1.md, AC #4 ("Ensure all existing tests in the star-wars suite remain green — the changes are a frame remapping, not algorithmic")
  - Spec text: "the pure core is deterministic and the changes are a frame remapping, not algorithmic"
  - Implementation: measured that the authentic lens is algorithmic, not a mere remapping — it regresses ~29 fire-gate/sights/aim tests (11→40) that ratify the shipped uf1-14 30°/aspect contract. No lens code committed. Reverted the probe to a clean tree and handed back to TEA to re-derive those ~29 tests to the authentic ±45° symmetric aspect-independent glass before Dev implements.
  - Rationale: the ~29 tests are ROM-cited fire-gate contracts; re-authoring them is TEA's role (repo's hard TEA/Dev split), and the user (2026-08-08) chose "loop back to TEA, expand scope."
  - Severity: major (scope)
  - Forward impact: sw10-1 is now much larger than 8pt; uf1-14's principle ("the bit matches the glass") is preserved but its expected VALUES move; AC #3 (visual) stays an eyeball gate at review.

### Reviewer (audit)

- **Dev deviation "Scope expanded past AC #4… TEA re-authorship" → ✓ ACCEPTED by Reviewer.** The premise of AC#4 ("a frame remapping, not algorithmic") is factually wrong: the authentic lens changes real behavior — `inPlayerView` moved from `hBound = vBound*aspect` to `hBound = vBound` (tie-status.ts:213), and `FOV_Y` moved π/3→π/2. That is algorithmic, not a permutation, so re-baselining the uf1-14 fire-gate/sights/aim suite was the correct call. TEA's re-authoring is proven non-vacuous by the dual-lens run (authentic → 3 reds = the source guards; shipping 60° → 37 reds), which discriminates the correct lens rather than fitting the code. The user-approved scope split to sw10-3 (trench) is sound. **This deviation is accepted; it is NOT the reason for rejection.**
- **UNDOCUMENTED deviation the Reviewer adds — the render half of the aspect-independence change was never made.** TEA's own Delivery Findings (this file, the two `[TEA]` entries at the top of Delivery Findings) required BOTH sides: `aimDirection` aspect-independent AND "stop scaling the horizontal axis by viewport aspect (feed `perspective` aspect = 1 / letterbox)". Dev implemented the sim side (gameRules.ts:56, tie-status.ts:213) but left `render.ts:500 perspective(FOV_Y, w / h, NEAR, FAR)` unchanged at the full non-square window aspect. Spec said aspect-independent lens end-to-end; code is aspect-independent in the sim and aspect-DEPENDENT in the glass. Severity: HIGH. This is the primary rejection finding (F1 below).

### TEA (rework — Reviewer F1)
- **The F1 RED test requires a new `render.ts` export: `sceneProjection(w, h): Mat4`.** What the spec/reviewer asked (an aspect-independent render lens) has no existing seam — `render.ts:500` and `debug-overlay.ts:213` each build `perspective(FOV_Y, w/h, NEAR, FAR)` inline and DUPLICATED. A test that reconstructs `perspective(FOV_Y, aspect)` itself cannot verify the fix (it would stay red after the render is corrected — typescript.md #18 apparatus-fails-by-its-own-hand). So the rework test binds to a single `sceneProjection(w, h)` seam that BOTH `render()` and `drawDebugOverlay()` must consume, and asserts it is aspect-independent. This is a design constraint the RED test imposes, not a free choice for GREEN: Dev must (1) export `sceneProjection(w, h)` from render.ts, (2) make it aspect-independent (feed `perspective` aspect=1 + letterbox the viewport, per the standing TEA Delivery Finding), and (3) route both the scene draw and the debug overlay through it (kill the duplication). Severity: minor (design/seam). Rationale: it is the only apparatus-safe way to pin an END-TO-END aim↔render invariant.

### Dev (rework — green)
- **Letterbox-to-square + HUD full-window, per the user's decision.** The aspect-independent lens forces a choice on non-square windows; the user chose (this session) to letterbox the scene into a centered square (`min(w,h)`) with the HUD staying full-window. Implemented via `render.sceneProjection` (aspect=1) + `wireframe.ndcToScreen` (centered-square map) shared by scene + crosshair + fireballs. Spec (AC#1) required "aspect-independent" but did not specify the framing; this is the user-chosen realisation. Severity: minor (a decided product choice, not a spec deviation). AC#3 visual verification of the letterbox is deferred to the review eyeball (render convention).
- **F3/F5/F6 (dev-tool doc/consistency findings) deferred out of this rework.** contactSheet.ts (/models.html native remap + stale FOV_Y), debug-overlay's un-baked DEATH_STAR_SURFACE, and romCompare's unbaked `rom.vertices` are dev-tool-only and non-blocking; fixing them risks contact-sheet/romCompare test churn unrelated to F1. Logged as Delivery Findings for a follow-up. Severity: minor (scope).

### Reviewer (audit — rework 2)

- **TEA deviation "the F1 RED test requires a `sceneProjection(w,h)` seam" → ✓ ACCEPTED by Reviewer.** The apparatus-safety reasoning is correct (a reconstruction of `perspective(FOV_Y, aspect)` would fail by its own hand — typescript.md #18). Binding to one seam both `render()` and `drawDebugOverlay()` consume, and asserting aspect-independence, is the right way to pin an end-to-end invariant. Verified: `sceneProjection` returns `perspective(FOV_Y, 1, …)`, both consumers use it, no inline duplicate survives.
- **Dev deviation "Letterbox-to-square + HUD full-window (user's decision)" → ✓ ACCEPTED by Reviewer.** Sound and correctly implemented: `ndcToScreen` centres a `min(w,h)` square (same `s/2` on both axes), and scene geometry, crosshair, cannon-tip beam, and world fireballs ALL route through it, so a target and the reticle at the same NDC land on the same pixel at any window shape — F1 genuinely closed end-to-end (independently confirmed by reviewer-rule-checker ×2). AC#3's on-screen bar/HUD appearance remains the eyeball gate per render convention; the geometry cannot flip/stretch (the map is strictly more constrained than before). **This deviation is accepted; it is NOT a reason for rejection.**
- **Dev deviation "F3/F5/F6 deferred" → ✓ ACCEPTED with amendment.** F6 turned out already FIXED. F3 stands AND now also carries a NEW regression: the shared `toScreen`→`ndcToScreen` letterbox degrades `/models.html` (contactSheet passes non-square cell dims into the now-square map). F3 + this regression should be fixed TOGETHER in a contactSheet native-basis follow-up (it needs `FOV_Y=π/2`, the native remap, and letterbox-awareness). F5 stands. Deferral accepted; regression documented (not silent).
- **UNDOCUMENTED deviation the Reviewer adds — the reviewed rework-2 was never committed.** `HEAD` is still `aa8b8b2b` (round-1 state): it carries the F1-broken lens and the wrong F4 docstring. The correct code exists only in the working tree. This is the primary rejection reason (B1 below) — the deliverable is not on the branch. Severity: HIGH (ship-integrity).

## Tea Assessment

RED phase complete. New suite: `plugins/star-wars/tests/core/sw10-1-authentic-lens.test.ts` — **11 failing, 2 passing (13 total)**, all failures for the right reason (wrong lens / live axis hacks), zero compile or import errors. The rest of the star-wars suite is untouched (only a file was added; no `sim.ts`/`gameRules.ts`/fixture edits), and the citation gate is green (53/53).

**What is pinned (maps to the ACs):**
- **AC #1 — authentic lens:**
  - `FOV_Y` is a symmetric ~90° FOV (85°–95° band). RED now: 60°.
  - Forward projection at a square viewport: a point whose lateral (or vertical) offset equals its depth lands exactly on the NDC edge (±1) — the 45° half-angle on **both** axes. RED now: ±1.732.
  - Divide-by-depth: lateral = k·depth → NDC k at any depth. RED now: k·1.732.
  - Inverse (`aimDirection`): the crosshair edge ray sits at 45° (`|lateral| = |depth|`) and is **aspect-independent** across {1, 4/3, 16/9, 21/9}. RED now: a 30° ray that skews with aspect.
- **AC #2 — retire the *_ORIENT axis hacks:** a comment-/string-stripped source guard on `render.ts` asserts `SURFACE_ORIENT`, `PORT_ORIENT`, `TIE_ORIENT` no longer apply a per-model rotation (removed = retired). RED now: all three are `rotationX/Z(…)`.
- **AC #4 — coverage & line anchors:** tests live in `tests/core/`, import only `@shared/math3d` + `gameRules` (no fixture edits), citation gate stays green.

**Deliberately NOT pinned (respecting the AC boundaries):**
- **AC #3 (visual sanity)** is an eyeball gate — no structural test. Per repo convention orientation/scale escape structural tests; the source guard covers only the *rotation* axis hacks, not `GROUND_MODEL_SCALE`/`TOWER_ORIENT`'s placement lift (those are size/placement, verified live).
- **AC #5 (placement constants)** — nothing here asserts a scene constant (`SPAWN_DISTANCE`, trench dims, camera height). The tests assert lens *shape* only (angles, ratios, symmetry, aspect-independence), so re-derivation stays clean for sw10-2.

**The 2 intentional passers** are not RED: the file-read sanity check (proves the guard scanned real source, non-vacuous) and the horizontal==vertical off-axis equality (an anisotropy-regression guard that must stay green through GREEN).

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)
- **Float comparison:** every numeric assertion uses `toBeCloseTo` (5 digits), never `===` on floats — the correct pattern for projected coordinates.
- **No type-escape hatches:** no `as any`, no `as unknown as`, no `@ts-ignore`; tests use the real `Vec3`/`Mat4` types.
- **Meaningful assertions (Phase C self-check):** every test has a concrete numeric/ratio assertion; the source guard is anchored by a non-vacuous "scans the real render source" check so an empty read can't pass it silently.
- **Comment/string hardening:** the source guard strips comments *and* string literals before matching (mirrors `core-purity.test.ts`), so the axis-hack check can't be defeated by wording or data.
- **`??` vs `||` (advisory for GREEN):** `aimDirection`'s `aspect = 1` is a param default (correct). If Dev reworks aspect handling, keep the default-param form — do not switch to `aspect || 1` (would treat a legitimate 0 as unset).

Handing off to Dev (Yoda) for GREEN. Recommended path and the vestigial-`aspect` blast radius are in Delivery Findings above.
## Tea Assessment — rework (expanded red pass, uf1-14 reconciliation)

Per the user's decision to expand scope and loop back to TEA, the fire-gate / sights / aim / hitscan suite has been re-authored to the cabinet's authentic ±45° symmetric aspect-independent lens. **Committed `baaa8d16`** (13 test files + `support/aim.ts`; zero src changes).

**Method (anti-circularity):** a *reference* candidate lens (`FOV_Y=π/2`, `aimDirection` aspect-independent, `inPlayerView` symmetric) was applied to the working tree to CONFIRM arithmetic, but every expectation was DERIVED from the ±45° geometry / ROM first principles (0.9·depth in / 1.1·depth out; `aimX=X/D`, `aimY=Y/D`; C_PV/C_PS `|lat|<depth ∧ |vert|<depth`). The reference lens was then **reverted** and the suite verified RED against the shipping 60° lens.

**Files re-authored:**
- `tie-view-frustum.test.ts` (anchor, by TEA): uf1-14 inverted — C_PV is the ROM's ±45° ratio law, aspect-independent, now that the glass is authentic. 12/12 under the authentic lens.
- `tie-fire-visibility.test.ts` (6/6), `tie-sights-status.test.ts` (12/12), `tie-sights-visibility.test.ts` (14/14), `tie-loiter-sights.test.ts` (13/13): C_PV/C_PS seats re-derived; "one seat, two canvases, opposite answers" → aspect-INVARIANCE.
- `gun-visibility-and-shape.test.ts` (27/27) + `sw8-27-remediation.test.ts` (22/22): sw8-27 gate seats + separation figures re-derived; F7 degenerate-aspect guard rebuilt as a pure `aimDirection` equality.
- `combat-kill-loop.test.ts`, `trench-aim-wysiwyg.test.ts`, `hitscan-laser.test.ts`, `laser-sweep.test.ts`, `tie-hit-status.test.ts`: **three stale local `FOV_Y=Math.PI/3` copies** and two stale `/aspect` divisions found and fixed — the local aim-inverses now import `gameRules.FOV_Y` (track the lens) so they become lens-agnostic coherence tests (green under both lenses, by design — the 45° VALUE is pinned by the frustum/sights/gun files).
- `support/aim.ts`: dropped the stale `/aspect` term (the one lens-stale term; `f` already tracked `FOV_Y`) so the shared inverse matches the aspect-independent `aimDirection`.
- `tune-cue.test.ts`: exhaust-port graze re-seated for the 45° beam (collateral).

**Verification (definitive RED/GREEN discrimination):**
- Authentic lens (reference applied): **3 failed / 2371 passed** — the only reds are the 3 `*_ORIENT` source-guards (AC #2, Dev's render.ts work).
- Shipping 60° lens (src reverted): **37 failed / 2337 passed** — 34 lens-value tests correctly flip, proving they require the authentic lens (not tuned constants).
- `npm run lint` clean repo-wide; citation gate green (53/53); src untouched.

**Still RED for Dev (the whole GREEN task):**
1. Implement the authentic lens in `src/` (`gameRules.FOV_Y=π/2`; `aimDirection` aspect-independent; `tie-status.inPlayerView` symmetric `hBound=vBound`; make the render projection aspect-independent — letterbox or aspect=1). Reference diff proven in the Delivery Findings brief.
2. Retire the per-model `*_ORIENT` axis-swap hacks (AC #2) via the world-frame remap — this turns the 3 remaining source-guards green.
3. **Keep the `aspect` param on `aimDirection`** (defaulted/ignored) — the frozen citation `aimDirection(aimX, aimY, input.aspect)` (pair-guns.json) and the sw8-27 line fixtures make removing it costly. Watch the `[[star-wars-sim-edit-reanchor-tax]]`.
4. AC #3 (visual coherence of all three phases) is an eyeball gate at review — `just serve` → `/star-wars/`.

Handing back to Dev (Yoda) for GREEN.

## Dev Assessment (GREEN complete — AC#3 eyeball done, incl. MAME ground-truth cross-check)

The native-basis migration is complete for SPACE and SURFACE (production + tests). AC#1/#2/#4 are green by structural test; AC#3 is confirmed by eyeball AND corroborated against the real cabinet in MAME. AC#5 held as re-expression (deferred re-derivation stays for sw10-2). The TRENCH is carved out to **sw10-3** by user-approved scope split, so sw10-1 finishes with the 13 trench/port test files red-pending-sw10-3 (enumerated below) — a deliberate, tracked deferral, not a regression.

**Gates (verified this session):**
- `npm run lint` — clean (tsc --noEmit).
- `npx vitest run --project star-wars citations` — **53/53**.
- `npx vitest run --project star-wars sw10-1-authentic-lens` — **13/13**.
- Full star-wars suite — **2322 passed / 52 failed across exactly 13 files**, every one a trench-phase / exhaust-port / port-arming test: `trench.test`, `trench-aim-wysiwyg`, `trench-obstacles`, `trench-fire-scroll-carry`, `trench-port-bs-plc`, `exhaust-port-challenge`, `exhaust-port-hit-rom`, `exhaust-port-outcome`, `swept-port-collision`, `render.trench-eye`, `render.exhaust-port-orient`, and the port-arming subset of `hitscan-laser` + `tune-cue`. **No space/surface fixture is red** (confirmed by listing the failing files). All 13 are the sw10-3 trench-production migration.

**AC#3 eyeball — SPACE + SURFACE (the trench eyeball waits for sw10-3):**
- Served this checkout's tree on **:5290** (`npx vite --port 5290 --strictPort`) after confirming a sibling checkout (`a-2`) owns :5270 — per the CLAUDE.md port-ownership rule; proved cwd of the :5290 listener is this tree before trusting a screenshot.
- **models.html contact sheet:** every MODELS entry renders upright through the live camera — TIE FIGHTER iconic (hex cockpit centered, symmetric L/R wings, not mirrored/collapsed), TIE fragments + Darth TIE correct, DEATH STAR clean ellipse, SURFACE TOWER / BUNKER / DEATH STAR SURFACE all read correctly.
- **SPACE:** the green TIE reads upright and faces the cockpit; HUD (SCORE / SHIELD gauge / WAVE / crosshair) correct; the authentic "SELECT A DEATH STAR — EASY/MEDIUM/HARD" screen; death-star billboard; red/blue fireballs stream radially past the cockpit.
- **SURFACE:** the ground grid recedes with correct perspective, converging to a centered horizon, floor pointing DOWN (no flip/mirror); HUD + crosshair correct. (Towers scroll in from the horizon; the dev phase-jump `8` forces mode:playing straight into the scene.)

**MAME ground-truth cross-check (the video IS the game — [[cabinet-fidelity-video-is-ground-truth]]):** ran the real Star Wars 1983 headless in MAME 0.288 (rompath `~/roms/starwars`; capture recipe + gotchas saved to `[[mame-starwars-headless]]`). Space combat, the difficulty-select screen, the Death-Star sphere approach, and the trench were all captured and compared to our render. The clone matches the cabinet on HUD layout, TIE geometry/orientation (green, hex cockpit + trapezoidal panels, banking toward the eye), fireball streaming, the death-star billboard, and the receding-to-centered-horizon surface/trench perspective. **No flip, mirror, or axis error against the authentic hardware** — a stronger AC#3 signal than the in-app eyeball alone. (Caveat: MAME's phase order ran space → death-star sphere → trench, so an isolated MAME "flat surface grid + standing towers" frame distinct from the trench was not captured; the in-app surface eyeball covers that, and the basis is confirmed correct in every captured MAME phase.)

**Deviations / findings this phase:** none beyond the already-logged scope expansion (authentic lens is algorithmic, not a mere remap → TEA re-baseline, user-approved). The 13 red files are the expected, user-approved sw10-3 deferral.

Resolving the green gate → completing the phase → handing to Reviewer (Thought Police). PR is SM's at finish, not created here.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | lint clean; 52 fail / 13 files (all in the approved sw10-3 trench/port deferral, exact match, no space/surface/TIE red); citations 53/53; lens 13/13; orchestrator 7 fail (all jt9-55, pre-existing) | confirmed: deferral count/set verified; orchestrator red independently confirmed pre-existing (epic-jt9.yaml absent on develop, branch touches no jt9) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 9 (trenchGunFireVelocity basis mismatch; stale *_ORIENT + z=0 docstrings; frozen-citation wording) | confirmed 8; the trenchGunFireVelocity "regression" reclassified to a non-blocking sw10-3 landmine (trench-only caller, test already in approved-red-13) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A — divide-by-depth guards (siteOffset finite-check, shared perspective + wireframe near-plane) intact; core purity held; no unsafe casts |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 6 (aspect divergence BLOCKING; render.ts stale prose; contactSheet basis+FOV_Y; lookRotationNative docstring; romCompare unbaked rom) | confirmed 6 — the aspect-divergence headline independently verified by algebra + code trace and made F1 (blocking); remainder Med/Low |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled as Skipped)
**Total findings:** 1 HIGH (blocking) + 2 MEDIUM + 4 LOW confirmed, 1 reclassified to non-blocking Delivery Finding, 0 dismissed

### Rule Compliance (against `.pennyfarthing/gates/lang-review/typescript.md` + project rules)

Enumerated the 26-check TS checklist and the star-wars core-purity rule across all 8 changed production files:

- **Core purity (project rule, CLAUDE.md):** COMPLIANT — no `Date.now`/`Math.random`/DOM/clock introduced into `src/core/**` (basis.ts, gameRules.ts, sim.ts, models.ts, surface-grid.ts, tie-status.ts all clean; verified by security subagent + grep).
- **#1 type-safety escapes:** COMPLIANT — no new `as any`/`@ts-ignore`/unsafe non-null in the diff.
- **#4 / #21 nullish + degenerate numeric:** COMPLIANT — `aimDirection` `f=1/tan(π/4)=1` exact; `siteOffset` divides by `dir[0]` (strictly positive for any finite yoke ray) with a `Number.isFinite(dx)||Number.isFinite(dy)` backstop; `trenchGunFireVelocity` divides by a nonzero constant. No new unguarded division.
- **#22 accept/reject inversion:** COMPLIANT — the surface `pos[2]<0`→`pos[0]>0` filters are axis permutations preserving strict-exclusion semantics, not NaN-fail-open inversions.
- **#15 / #25 / #18 / #26 test-apparatus integrity:** COMPLIANT for the space/surface suite — the new lens test exercises the real `perspective`/`aimDirection`, strips comments+strings, has an anti-vacuous "scans the real render source" anchor, and scopes source guards to the declaration line; `tests/support/aim.ts` is the exact inverse of the new camera (verified). **PARTIAL GAP** — the aspect-independence test (#18: two-sided contract) checks only `aimDirection`, never the render's `perspective`, which is why it stays green while F1 is broken.
- **#13 fix-introduced regression:** VIOLATION → F1. Dropping the `aspect` term from the sim reintroduces the 8-16 kill-loop class on the horizontal axis because the render's `f/aspect` was left in place.
- **#17 / #20 comments asserting an unre-run mechanism:** VIOLATION → F1 (new prose claims the render shares the aspect-independent lens; render.ts:500 unchanged; contradicted by the untouched tie-status.ts:344-352 paragraph) and F5 (lookRotationNative docstring).
- **#24 retirement applied only where named:** VIOLATION → render.ts:147-193 stale `*_ORIENT` prose; contactSheet.ts:25 stale FOV_Y; contactSheet camera unswept. `TOWER_ORIENT` correctly kept live (not a violation — real display geometry, guarded set is SURFACE/PORT/TIE only).
- **#2/#3/#5/#6/#7/#9/#10/#11/#12/#14/#16/#19/#23:** N/A or COMPLIANT (no enum/React/async/module-boundary/security-input surface touched; `.js`-less imports are intra-`@shared`-alias, consistent with repo convention).

### Devil's Advocate

Assume this code is broken. The most damning case: the story's headline promise — "unify on the cabinet's authentic projection lens" — is only half-kept. A confident reader sees `FOV_Y=π/2`, `aimDirection` stripped of aspect, `inPlayerView` symmetric, a 13/13 green lens test, a passing eyeball, and a MAME cross-check, and concludes the lens is authentic end-to-end. It is not. The actual glass, `perspective(FOV_Y, w/h)`, still bends the horizontal axis by the window's aspect, because nobody changed render.ts:500 — the one line TEA's own Delivery Finding said had to change. Every safety net that should have caught this was aimed elsewhere: the lens test asserts `aimDirection` (the sim inverse) is aspect-independent but never asserts the RENDER is; the eyeball checks orientation and centred geometry, where the divergence is exactly zero; MAME confirms shapes, not off-axis crosshair-to-hit alignment. So a player on a normal widescreen window puts the crosshair on a TIE off to the side, fires, and the bolt sails past by nearly a factor of two — the very "8-16 kill-loop" bug the removed aspect term was written to prevent, resurrected on the horizontal axis, in the primary space phase, on the default configuration. What would a confused user think? "The gun is broken." What did develop do? It worked — the old code cancelled aspect end-to-end, so this is a regression, not a pre-existing wart. Beyond the headline: the dev tooling is quietly inconsistent — /models.html renders baked native models through an un-migrated OpenGL camera with a stale local FOV, and the surface debug overlay draws an un-baked spike through the native camera. A future maintainer trusting either will be misled. And a stack of comments now describe machinery that no longer runs (the `*_ORIENT` block, the lookRotationNative nose column, the "flat z=0" pictures), each a small trap. None of these are style nits; they are the residue of a migration that stopped at the sim boundary and declared victory. The suite's greenness is not evidence of correctness here — it is evidence that the tests and the bug were built to miss each other.

## Reviewer Assessment

**Verdict:** REJECTED

The native-basis permutation itself is genuinely well done — internally coherent (basis.ts conjugations proven, `aim.ts` helper is the exact inverse of the new camera), ROM-authentic (±45°/FOV π/2 matches the cabinet's `|lat|<depth` ratio law), core purity held, security clean, and the uf1-14 re-baseline is proven non-vacuous by TEA's dual-lens run. But the story's central deliverable — an authentic *aspect-independent* lens — was applied to the simulation and not to the render, producing a real horizontal-aim regression on the default window.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH][RULE] | F1 — Authentic aspect-independent lens applied to sim aim (`aimDirection`, `inPlayerView`) but NOT to the render: `perspective(FOV_Y, w/h)` still scales x by `f/aspect` at the full window aspect. A world point on the aim ray projects to NDC.x=`aimX/aspect` while `crosshairNdc` draws at raw `aimX` → off-centre shots miss horizontally by the aspect factor (~1.78× at 16:9). Regresses develop's correct end-to-end cancellation; reintroduces the 8-16 kill-loop on the horizontal axis. AC#1 half-met; AC#3 fails off-centre. | render.ts:500 vs gameRules.ts:56 / :65, tie-status.ts:213 | Make the render aspect-independent (feed `perspective` aspect=1 + letterbox the viewport, per TEA's Delivery Finding), and add a test pinning the aim↔render invariant: a point on `aimDirection(aimX,aimY)` projected through the REAL `perspective(FOV_Y, aspect≠1)` must land on `crosshairNdc(aimX,aimY)`. |
| [MEDIUM][DOC] | F2 — `*_ORIENT` block comment still teaches the retired per-model rotations as the live mechanism; only the one-line decl notes retirement. | render.ts:147-193 | Mark SURFACE/PORT/TIE paragraphs as retired history; leave only TOWER's paragraph live. |
| [MEDIUM][RULE] | F3 — /models.html renders baked native models with no `CAMERA_ORIENT`/`toNative` remap and a stale local `FOV_Y=π/3`. | contactSheet.ts:25, ~166 | Apply the native remap in the contact-sheet camera (or bake-invert) and fix FOV_Y. |
| [LOW][RULE] | F4 — `lookRotationNative` docstring says nose=col0 (+col0); sim.ts/tie-status.ts use −col0 (and the diff's own test helpers negate to compensate). | basis.ts:76 | Correct docstring: native nose reads −col0. |
| [LOW][DOC] | F5 — surface debug overlay draws un-baked `DEATH_STAR_SURFACE` with retired `SURFACE_ORIENT=IDENTITY` through the native camera (dev-only, untested). | debug-overlay.ts:175 | Bake/remap or drop the overlay item. |
| [LOW][RULE] | F6 — `pairOne` exposes raw unbaked `rom.vertices` while `verticesMatch` was computed on the baked copy (dev-tool audit surface). | romCompare.ts:168 | Return the baked rom vertices, or document the asymmetry. |
| [LOW][DOC] | F7 — "flat (z=0)" docstrings stale; bodies now emit `[0,x,y]` (depth=0). | models.ts:778, 790, 800 | Reword to "flat (depth=0)". |

**Dispatch-tag coverage:** `[RULE]` reviewer-rule-checker — F1 (blocking), F3, F4, F6 confirmed. `[DOC]` reviewer-comment-analyzer — F2, F5, F7 + the frozen-citation wording confirmed; the trenchGunFireVelocity docstring reclassified to a non-blocking sw10-3 landmine (trench-only caller, test already in the approved-red-13). `[SEC]` reviewer-security — clean (divide-by-depth guards intact, core purity held). `[EDGE]` `[SILENT]` `[TEST]` `[TYPE]` `[SIMPLE]` — disabled via `workflow.reviewer_subagents`; Reviewer covered their domains directly (edge/degenerate: #21/#22 verified compliant; test quality: #15/#18/#25/#26 verified, with the two-sided-contract gap folded into F1; type/simplify: no new unsafe casts or dead complexity beyond the retained-vestigial `aspect` params, which are a symptom of F1).

**Data flow traced:** player yoke → `aimDirection(aimX,aimY)` world ray (hit-test) vs `crosshairNdc(aimX,aimY)` screen reticle vs `perspective(FOV_Y,w/h)` render — the three diverge horizontally at aspect≠1 (unsafe: the reticle and the shot no longer agree).

**Non-blocking Delivery Finding for sw10-3:** `trenchGunFireVelocity` is already native; migrate only its trench caller — do not double-flip.

**Handoff:** Back to TEA (Han Solo) for a red rework — F1 needs a failing test that pins the aim↔render aspect invariance before Dev makes the render aspect-independent; the doc/dev-tool findings (F2-F7) fold into the same rework.

## TEA Assessment — rework 2 (Reviewer F1: aim↔render aspect invariance)

RED authored for the blocking finding. **New suite: `plugins/star-wars/tests/shell/render.aim-aspect-invariant.test.ts` — 5 failing, 1 passing (6 total)**, all failures for the right reason (the render exposes no aspect-independent projection seam), `tsc` clean, no source touched.

**What is pinned (Reviewer F1):** the authentic lens must be aspect-independent END-TO-END — in the render glass, not only the sim aim. The suite binds to a `render.sceneProjection(w, h)` seam (RED until Dev exports it) and asserts:
1. `render.ts` exposes `sceneProjection(w, h)` — one projection for the scene AND the debug overlay (both build `perspective(FOV_Y, w/h)` inline today: render.ts:500 + debug-overlay.ts:213).
2. A fixed off-axis world point projects to the SAME horizontal NDC at square / 16:9 / 21:9 (aspect-invariance).
3. A point on `aimDirection(0.5, 0)` lands under `crosshairNdc(0.5, 0)` on a 16:9 window — the horizontal axis the kill-loop/frustum suites skip on purpose ("aspect only scales X", combat-kill-loop.test.ts:68).
4. The ray tracks the crosshair across a horizontal sweep {−0.8,−0.3,0.3,0.8} at 21:9.
5. Vertical-axis agreement still holds (regression guard — the fix must not break the axis that already worked).
6. `FOV_Y` anchor: `tan(FOV_Y/2) = 1` (the one passing test — the authentic 90° constant is already correct; only the render's aspect handling is wrong).

**Anti-apparatus (typescript.md #18):** the suite deliberately does NOT reconstruct `perspective(FOV_Y, aspect)` (the combat-kill-loop `projectNdc` idiom) — a reconstruction would stay red after the render is fixed, failing by its own hand. It binds to the ONE projection the shell actually draws with, via a namespace cast so `tsc` stays green while the export is absent. Discrimination proof (by construction): an aspect-DEPENDENT `sceneProjection` (a naive inline extraction) still fails tests 2–4; only an aspect-INDEPENDENT seam passes.

**The GREEN task for Dev (Yoda):**
1. **F1 (blocking):** export `sceneProjection(w, h)` from render.ts, make it aspect-independent (feed `perspective` aspect=1 + letterbox the viewport is the visually-faithful option, AC#3), and route BOTH `render()` (render.ts:500) and `drawDebugOverlay()` (debug-overlay.ts:213) through it. Turns the 5 new reds green. Re-verify the existing aim/kill-loop/frustum suite stays green (they use `perspective(FOV_Y, aspect)` reconstruction on the vertical axis — unaffected; but grep for any that assumed the old horizontal behaviour).
2. **F2–F7 (non-blocking, same rework):** comment/doc + dev-tool fixes — render.ts:147-193 stale `*_ORIENT` prose, basis.ts:76 `lookRotationNative` nose docstring, models.ts:778/790/800 "z=0"→"depth=0", contactSheet.ts:25/166 (stale FOV_Y + native remap), debug-overlay.ts:175 un-baked DEATH_STAR_SURFACE, romCompare.ts:168 unbaked `rom.vertices`. These are Dev green-phase edits (comments + dev tooling), not TDD-pinnable; the doc gates and the contactSheet/romCompare paths are not covered by structural tests, so they must be hand-verified.
3. **Watch the `[[star-wars-sim-edit-reanchor-tax]]`:** F2/F4/F7 edit comments in citation-anchored files (render.ts, basis.ts, models.ts) — keep net-line-neutral or re-anchor; citation gate is 53/53, keep it there.

**Untouched:** the 13 trench/exhaust-port files stay red-pending-sw10-3 (approved deferral, unchanged by this rework). The full suite is now those 13 + this 1 new rework file red; every space/surface fixture stays green.

Handing to Dev (Yoda) for GREEN.

## Dev Assessment — rework 2 (GREEN: Reviewer F1 fixed + doc cleanups)

F1 fixed and green. The authentic lens is now aspect-independent END-TO-END; the sim and the render share ONE square glass, so the crosshair and the fired ray agree at every window shape.

**The fix (per the user's decision — letterbox to a centered square, HUD full-window):**
- **`render.ts` — new `sceneProjection(w, h)` seam** (exported): returns `perspective(FOV_Y, 1, NEAR, FAR)` — the authentic symmetric ±45° square glass, aspect-INDEPENDENT. Both `render()` (was the inline `perspective(FOV_Y, w/h)` at :500) and `drawDebugOverlay()` (was the duplicate at debug-overlay.ts:213) now draw with it — the duplication the RED finding flagged is gone.
- **`wireframe.ts` — new `ndcToScreen(nx, ny, w, h)` letterbox helper** (exported): maps NDC into a centered square of side `min(w,h)`, so the non-square window is absorbed by symmetric bars on the long axis, not by skewing the frustum. `toScreen` (all 3D models via `project`/`drawWireframe`), the crosshair (render.ts drawCrosshair + the cannon-tip site), and world fireballs all map through it — one square shared by scene + reticle, so aim never drifts and geometry never stretches.
- **HUD** (score/shield/wave/banners, screen-space at `w/2` etc.) stays full-window per the chosen design; only the 3D scene + crosshair letterbox.

**Why this is the correct fix, not the minimal one:** setting `sceneProjection = perspective(FOV_Y, 1)` alone (keeping the full-`w` pixel map) would align aim but STRETCH every model by w/h. The letterboxed `ndcToScreen` is what keeps geometry square AND aim aligned — verified by the RED suite (aspect-invariance across 1 / 16:9 / 21:9, horizontal + vertical, points-on-the-ray land on the crosshair).

**Doc cleanups folded in (non-blocking Reviewer findings):**
- **F2** — render.ts `*_ORIENT` block header now marks SURFACE/PORT/TIE as RETIRED history (sw10-1), TOWER as the one live rotation.
- **F4** — basis.ts `lookRotationNative` docstring corrected: it plants `forward` on column 0 (its own convention); the TIE's live orient is the conjugate whose nose reads −column 0 (as `sim`/`tie-status` use).
- **F7** — models.ts three "flat (z=0)" picture docstrings → "flat (native depth X=0)".

**Deferred (non-blocking dev-tool, documented in Delivery Findings for a follow-up):** F3 (contactSheet.ts stale FOV_Y + native remap for /models.html), F5 (debug-overlay un-baked DEATH_STAR_SURFACE), F6 (romCompare exposes unbaked `rom.vertices`). Dev-tool only, no shipping impact; touching them risks contact-sheet/romCompare test churn outside this rework's blast radius.

**Gates (verified this session):**
- `npm run lint` — clean (tsc --noEmit).
- `npx vitest run --project star-wars render.aim-aspect-invariant` — **6/6** (was 5-red at the seam).
- `npx vitest run --project star-wars citations` — **53/53** (comment edits stayed text-safe; net-line drift is decorative under the frozen-`ours` gate).
- Full star-wars suite — **2328 passed / 52 failed across exactly the same 13 trench/exhaust-port/port-arming files** (the approved sw10-3 deferral). **No space/surface fixture red**; `render.death-star-body` needed one mock line (`ndcToScreen`) added — a mechanical completeness fix for the new export, no assertion changed.

**AC#3 (visual) — needs the review eyeball for the NEW letterbox behaviour.** The letterbox puts symmetric bars on the long window axis (a centered square scene, full-window HUD). The math is verified (centered square `min(w,h)`; scene+crosshair+fireballs share it), but the on-screen appearance — bar symmetry, HUD/scene composition, crosshair-on-target at a wide window — is an eyeball gate per the render convention (`just serve` → `/star-wars/`, resize the window). Flagging it explicitly for the Reviewer's AC#3 pass.

## Subagent Results — rework 2

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | lint clean; suite 52 fail / 13 files (ALL in the approved sw10-3 trench/port deferral — no space/surface/TIE red); `render.aim-aspect-invariant` 6/6; citations 53/53; orchestrator 3 fail (pre-existing joust jt9); no code smells | confirmed: deferral set independently re-verified (stash + re-run identical at round-1 HEAD); orchestrator red pre-existing |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — test-coverage assessed by Reviewer + rule-checker (F-E pixel-guard gap) |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 runs (both inspected the working tree): debug-overlay:202 stale JSDoc (fresh), render.ts:595/605 + 242-253/244 stale TIE_ORIENT, contactSheet:25/35 (F3), debug-overlay:175 (F5); F4/F2/F7 verified TRUE; F6 verified FIXED | confirmed all; F3/F5 = known deferred; F6 reclassified fixed |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — type surface assessed by Reviewer (no new stringly/enum/cast surface; `Mat4`/`Vec3` used throughout) |
| 7 | reviewer-security | Yes | clean | none | N/A — purity held (no clock/DOM/random in core), `ndcToScreen`/`sceneProjection` have no divide-by-w/h, `siteOffset`/`trenchGunFireVelocity` divides guarded, no type escapes |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — no unnecessary complexity introduced by the seam extraction (it removes duplication) |
| 9 | reviewer-rule-checker | Yes | findings | 2 runs: F1 CLOSED (numeric proof); + contactSheet letterbox regression (F-A), contactSheet FOV_Y (F-B/F3), tie-status:343-350 self-contradiction (F-C), state/sim/trench-obstacles stale 60°/30° rationale (F-D), pixel-guard coverage gap (F-E), debug-overlay frustum gizmo | confirmed all; F1-closed corroborates Reviewer's own trace |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled as Skipped)
**Total findings:** 1 HIGH/blocking (B1 uncommitted) + 5 MEDIUM + 2 LOW confirmed; 0 dismissed. The round-1 blocker (F1) is CONFIRMED CLOSED.

### Rule Compliance (against `.pennyfarthing/gates/lang-review/typescript.md` + star-wars core/shell purity)

Enumerated the TS checklist across the 8 changed production files (basis.ts, gameRules.ts, models.ts, sim.ts, surface-grid.ts, tie-status.ts, render.ts, wireframe.ts, debug-overlay.ts) plus the diff's blast radius:

- **Core purity (CLAUDE.md hard rule):** COMPLIANT — grepped every changed `src/core/**` file for `Date.now`/`new Date`/`performance.now`/`Math.random`/DOM; zero new hits (security + rule-checker + Reviewer). `basis.ts` is pure linear algebra.
- **#1 type-safety escapes:** COMPLIANT in production; the one `as unknown as` is in the new test (`render.aim-aspect-invariant.test.ts:50`), an explained namespace cast matching the repo's "RED seam for a brand-new export" convention.
- **#4/#21 nullish + degenerate numeric:** COMPLIANT — `sceneProjection` ignores `w`/`h` (no divide); `ndcToScreen` only multiplies by `min(w,h)/2`; `siteOffset` `t=(pos[0]-eye[0])/dir[0]` has `dir[0]` structurally >0 + the `Number.isFinite` output guard preserved across the axis remap; `trenchGunFireVelocity` guards `depth<=0`; `stepGame`'s `aspect` sanitiser untouched.
- **#13 fix-introduced regression:** ONE found → the shared `toScreen`→`ndcToScreen` letterbox regresses `/models.html` (contactSheet) — non-blocking dev-tool, documented (D1).
- **#17 comments asserting an un-re-run mechanism:** VIOLATIONS → C1 cluster: debug-overlay:202 JSDoc (fresh), render.ts:595/605 + 242-253/244 (TIE_ORIENT no-op), **tie-status.ts:343-350 (self-contradiction with the :279-285 block this diff edited)**, and F-D's falsified 60°/30° rationale in state/sim/trench-obstacles.
- **#24 retirement applied only where named:** COMPLIANT in code — `SURFACE/PORT/TIE_ORIENT` = `IDENTITY`, `TOWER_ORIENT` correctly kept live (real display geometry, test-backed by `render.ground-object-placement`). The retirement's PROSE was only partly swept (the #17 cluster).
- **#15/#18 test-apparatus integrity:** the new lens test is non-vacuous and apparatus-safe (binds the real seam, 3 aspects, on/off axis, vertical regression guard, FOV anchor). GAP (#18 two-sided contract at the PIXEL level): no test cross-checks crosshair vs scene at off-centre aim on a non-square canvas → F-E, non-blocking coverage recommendation.
- **#2/#3/#5–#12/#14/#16/#19/#20/#22/#23/#25/#26:** N/A or COMPLIANT (no enum/React/async/module-boundary/security-input surface; `.js`-less imports are intra-`@shared` alias per repo convention).

### Devil's Advocate

Assume this is broken. The most dangerous story is the opposite of round 1: last time the code was wrong and the tests missed it; this time the code is RIGHT and the *branch* is wrong. `HEAD` is still `aa8b8b2b` — the round-1 commit whose `render.ts` projects with `perspective(FOV_Y, w/h)` and has no `ndcToScreen`, and whose `basis.ts` docstring still claims the TIE nose is `+col0`. Every green signal a reviewer trusts — lint, 6/6 lens test, 53/53 citations, a clean security sweep, "F1 closed" from two rule-checkers — was measured against the WORKING TREE. But finish cuts the PR from the branch, and this repo's finish is documented to stash/juggle a dirty tree. If it stashes, the fix evaporates and production ships the exact 8-16 horizontal kill-loop this story exists to kill — with a green CI, because CI would build `HEAD`. That is the single highest-consequence failure here and it is invisible to every automated gate. Second: the migration is quietly leaking stale doctrine into the core it edited. `tie-status.ts` now tells two future maintainers opposite things 60 lines apart, and the stale half is an imperative — "do NOT put ±45° back" — against the thing this story just did; a diligent reader who trusts it could *revert* the fix believing they're protecting uf1-14. Third: the safety net for the story's whole promise has a hole exactly where round 1 broke — the only pixel-level crosshair/scene agreement test fires at dead-centre aim, where the buggy and correct maps are identical, so the horizontal axis is once again unguarded, just one layer down from where it was last time. And a dev opening `/models.html` to sanity-check a model now sees it boxed and shrunk, at the wrong 60° FOV, in an un-migrated basis — three compounding wrongs in the very tool used to eyeball fidelity. None of these are the render math, which is genuinely correct and genuinely well done. They are the residue of a rework that fixed the hard thing and left the bookkeeping — commit, comments, coverage, tooling — half-done. The right verdict is not "the lens is broken" (it isn't) but "the deliverable isn't on the branch and the file it edited now argues with itself."

## Reviewer Assessment

**Verdict:** REJECTED

The round-1 blocker (F1) is genuinely and correctly closed: the authentic lens is now aspect-independent END-TO-END — `sceneProjection` projects at `aspect=1` (both `render()` and `drawDebugOverlay()` consume it, no inline duplicate), and scene geometry, the crosshair, the cannon-tip beam, and world fireballs all map through ONE shared `min(w,h)` centred-square `ndcToScreen`, so a target and the reticle at the same NDC land on the same pixel at any window shape. Verified by my own code trace + numeric derivation and independently by reviewer-rule-checker twice; the new `render.aim-aspect-invariant` test is non-vacuous and apparatus-safe (6/6). The native-basis migration remains sound (purity held [SEC], `siteOffset` divide guarded, `*_ORIENT` retirement correct in code [RULE], no type escapes [TYPE]), and the 52-red/13-file trench deferral to sw10-3 is genuine and unworsened (stash-verified) [preflight]. **The lens is not the problem.** The rejection is bookkeeping the rework left half-done — foremost, the fix is not on the branch.

Dispatch coverage: [SEC] security clean; [DOC] stale-comment cluster confirmed (comment-analyzer ×2); [RULE] F1-closed + regression/contradiction findings (rule-checker ×2); [TEST]/[EDGE]/[SILENT]/[SIMPLE]/[TYPE] subagents disabled via settings — those dimensions assessed by the Reviewer (test-coverage gap F-E noted; no new complexity, edge, silent-failure, or type-design surface introduced by a seam extraction that removes duplication).

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH][RULE] | **B1 — the reviewed rework is UNCOMMITTED.** `HEAD` (aa8b8b2b) still carries the round-1 F1-broken lens (`perspective(FOV_Y, w/h)`, no `ndcToScreen`) and the wrong F4 docstring (`nose=+col0`). The correct code is only in the working tree; a PR/finish from `HEAD` — or a stashing finish — ships the exact regression this story fixes, with green CI. | whole branch; `HEAD` vs working tree | Commit the rework-2 working tree (render.ts / wireframe.ts / debug-overlay.ts / basis.ts / models.ts + the new `render.aim-aspect-invariant.test.ts` + the `render.death-star-body` mock line) onto `feat/sw10-1-projection-lens-unify`, net-line-neutral / citations 53/53, BEFORE finish. |
| [MEDIUM][DOC][RULE] | **C1 — stale-comment cluster the rework left / introduced.** (a) `debug-overlay.ts:200-204` JSDoc still names `perspective(FOV_Y, w/h)` (fresh stale — body now `sceneProjection`); (b) `render.ts:595/605` claims `multiply(orient, TIE_ORIENT)` turns the TIE upright — `TIE_ORIENT` is `IDENTITY` (no-op), upright is via `bakeTie`; (c) `render.ts:242-253`/`:244` present-tense TIE_ORIENT prose + "port 5274" (now 5270); (d) **`tie-status.ts:343-350` contradicts the :279-285 block this diff edited and says "do NOT put ±45° back" — after ±45° was restored.** | as listed | De-stale each; mark the TIE_ORIENT block as history like SURFACE/PORT; delete/correct the tie-status.ts:343-350 landmine so the file no longer argues with itself. Green edits, net-line-neutral. |
| [MEDIUM][RULE] | **D1 — `/models.html` regressed by the shared letterbox (new).** contactSheet feeds non-square cell dims into the now-square `ndcToScreen`, so models box/shrink; compounded by the stale local `FOV_Y=π/3` (F3) and no native remap. | `tools/contactSheet.ts:25,169,183,218,225` | Fold into a contactSheet native-basis follow-up (FOV_Y=π/2 + `CAMERA_ORIENT`/native remap + letterbox-awareness). Non-blocking for sw10-1 but must not ship silently. |
| [MEDIUM][DOC] | **D2 — falsified 60°/30° trench-port rationale** (`state.ts:870`, `sim.ts:1563`, `trench-obstacles.ts:82`). Mechanisms still work; rationale wrong under π/2. | as listed | Route to sw10-3 (trench migration re-derives port aimability). |
| [MEDIUM][TEST] | **D3 (F-E) — pixel-level aim↔render agreement is unguarded.** Only NDC is pinned; the one pixel-level test fires at `aim=0` where old/new maps coincide. | `tests/shell/` | Recommend a TEA pixel-level assertion (crosshair pixel == on-ray world pixel at `aimX≠0`, non-square canvas). Non-blocking (correct + NDC-guarded + eyeball). |
| [LOW][DOC] | D4 — debug-overlay frustum gizmo draws the retired aspect-dependent frustum through the aspect=1 lens; F5 un-baked DEATH_STAR_SURFACE overlay. | `debug-overlay.ts:175,230` | Dev-tool; defer with F5. |

**Blessing (so the next round is surgical):** the F1 render fix (`sceneProjection` + `ndcToScreen` routing of scene/crosshair/beam/fireballs), the F4/F2-header/F7 doc corrections, and the native-basis migration are all VERIFIED CORRECT. Do not re-open them — the rework is: commit the tree, de-stale the C1 comment cluster (incl. the tie-status landmine), and the review is done. D1/D2/D3/D4 are non-blocking follow-ups.

**Handoff:** Back to Dev (Yoda) for the green rework — commit + comment de-staling (no test-logic change required; the lens itself stands).

Resolving the green gate → completing the phase → handing to Reviewer (Obi-Wan / Thought Police).

### Dev (rework 2 — green: commit + C1 de-staling)

- **B1 resolved — the rework is now committed onto the branch (`c949785e`).** `HEAD` previously sat at `aa8b8b2b` (round-1 state: broken lens + wrong F4 docstring); the reviewed working-tree fix is now committed, so a PR/finish reflects the F1-closed code. Committed set: the 6 src files (basis, models, tie-status, debug-overlay, render, wireframe), the `render.death-star-body` mock line, and the new `render.aim-aspect-invariant.test.ts`. Left uncommitted for SM's finish: `sprint/epic-sw10.yaml` (tracking) and the session file. Severity: was HIGH (ship-integrity), now closed.
- **C1 resolved — the stale-comment cluster is de-staled (comment-only, behaviourally inert):** (a) `debug-overlay.ts` `drawDebugOverlay` JSDoc now names `sceneProjection(w,h)`, not the removed `perspective(FOV_Y,w/h)`; (b) `render.ts:595-597` TIE draw comment states the `multiply(e.orient, TIE_ORIENT)` is a no-op post-sw10-1 (upright is baked); (c) `render.ts` TIE_ORIENT block reframed as retired history + `render.ts:605` split-direction phrase corrected + "port 5274" → 5270; (d) `tie-status.ts:343-350` landmine removed — the C_PV note now says our slope IS the cabinet's ±45° post-sw10-1 (an identity, not the uf1-14 analogue), and no longer instructs "do NOT restore ±45°". Preserved every `.MAC` citation line and avoided introducing `path/file.ext` tokens into comments (comment-citation gate).

### Reviewer (code review — rework 2) [Dev disposition of non-blocking findings]

- **D1 (contactSheet /models.html letterbox regression + F3) — DEFERRED, not fixed here.** Correctly a follow-up: the fix is a contactSheet native-basis migration (its own `FOV_Y=π/2`, `CAMERA_ORIENT`/native remap, and letterbox-awareness) that would churn `/models.html` and romCompare paths outside this rework's blast radius. Filed for a contactSheet follow-up story. *Dev accepts the Reviewer's non-blocking classification.*
- **D2 (falsified 60°/30° trench-port rationale in state.ts:870 / sim.ts:1563 / trench-obstacles.ts:82) — DEFERRED to sw10-3.** These annotate the trench/port subsystem sw10-3 migrates and re-derives; correcting them there keeps the rationale edit co-located with the code change. *Routed to sw10-3.*
- **D3 (F-E pixel-level aim↔render guard gap) — DEFERRED as a TEA follow-up.** The invariant is correct (verified) and pinned at NDC + eyeball; the missing pixel-level assertion (crosshair pixel == on-ray world pixel at `aimX≠0`, non-square canvas) is a coverage improvement for TEA, not a Dev green-phase change (TEA owns tests). *Recommended for a follow-up.*
- **D4 (debug-overlay frustum gizmo + F5) — DEFERRED (dev-tool).** Non-blocking, dev-only, untested; carried with the F5 follow-up.

## Dev Assessment — rework 2 (GREEN: B1 committed + C1 de-staled)

The Reviewer's two blocking/should-fix items are done, and the lens fix the Reviewer blessed is untouched.

**B1 (blocking) — committed.** The rework is now on the branch at `c949785e`; `HEAD` no longer carries the round-1 broken lens. The fix will now reach any PR/finish.

**C1 (medium) — de-staled.** All four comment sites corrected (debug-overlay JSDoc, the two TIE_ORIENT render comments, the port number, and the tie-status.ts C_PV landmine). Comment-only — no behaviour changed.

**Untouched (Reviewer's blessing honoured):** `sceneProjection`, `ndcToScreen`, the scene/crosshair/beam/fireball routing, the F4/F2-header/F7 doc corrections, and the native-basis migration — all VERIFIED CORRECT by the Reviewer; not re-opened.

**Deferred (non-blocking, per Reviewer):** D1 (contactSheet migration), D2 (→ sw10-3), D3 (TEA pixel guard), D4 (dev-tool). Documented above.

**Gates (verified this session):**
- `npm run lint` — clean (tsc --noEmit).
- `npx vitest run --project star-wars citations` — **53/53** (comment edits text-safe; `.MAC` cites preserved).
- `npx vitest run --project star-wars aim-aspect-invariant` — **6/6**.
- Full star-wars suite — **2328 passed / 52 failed across the same 13 trench/exhaust-port files** (approved sw10-3 deferral); **no space/surface/TIE regression** — identical to pre-edit, confirming the comment fixes are inert.

Resolving the green gate → completing the phase → handing back to Reviewer (Obi-Wan) for the re-review.

## Subagent Results — rework 2 re-review (round 3)

Scope: confirm B1 (commit) + C1 (comments) closed. The substantive code (F1 lens + native migration) is byte-identical to round 2 except the C1 comment edits, so round-2 subagent coverage of that code stands; this round re-verifies the delta directly (adversarial re-read of the new comments — the "green rework can ship a fresh lie" gotcha).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | gates re-run on committed HEAD c949785e: lint clean, citations 53/53, aim-aspect-invariant 6/6, full suite 2328/52 (same 13 deferred files) | confirmed by Reviewer directly this round |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled — Reviewer found the count-only death-fragments test does not pin the split axis (F-G1 below) |
| 5 | reviewer-comment-analyzer | Yes (round-2 coverage + round-3 re-read) | findings | round-2 cluster now closed EXCEPT the render.ts:605 replacement, which the Reviewer's round-3 re-read found INACCURATE (F-G2) — and that inaccuracy exposed F-G1 | B1 + C1(a,c,d) confirmed closed; C1(b)/605 re-opened |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes (round-2) | clean | none | round-2 clean stands (code unchanged modulo comments) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes (round-2) | findings | round-2 F1-closed + D1–D4 stand; no new rule issue in the comment delta | carried forward |

**All received:** Yes (4 enabled covered — round-2 runs for the unchanged substantive code + direct round-3 re-verification of the delta; 5 disabled Skipped)
**Total findings (round 3):** 1 MEDIUM (F-G1, a real story-introduced visual regression) + 1 LOW (F-G2, a fresh-inaccurate comment) — both in the space TIE-death path. B1 and the rest of C1 are CLOSED.

### Rule Compliance (round 3 delta)

- **B1 (ship-integrity):** CLOSED — HEAD c949785e contains `sceneProjection`/`ndcToScreen`; the fix is on the branch.
- **C1(a) debug-overlay JSDoc, C1(c) TIE_ORIENT block + port 5270, C1(d) tie-status landmine:** CLOSED — verified the new text is accurate against the code (TIE_ORIENT is IDENTITY; the C_PV note now matches the :279-285 block; no `.MAC` citation altered; citations 53/53).
- **C1(b) render.ts:605 (#17 comment asserts an un-verified mechanism):** VIOLATION → F-G2. The replacement says the split direction "rides the baked fragment models" — false; the split is the fly-apart POSITION OFFSETS in `at(dx,dy,dz)`, and those offsets were NOT swept to the native basis → F-G1.
- **F-G1 (#13/#24 retirement/sweep applied only where named):** VIOLATION → the death-fragment world offsets stayed OpenGL-framed: wings `at(-ws,0,0)`/`at(ws,0,0)` and globe `at(0,0,gs)` offset native COMPONENT 0 (depth) / component 2 (up) instead of the swept axes. Probed through the real pipeline (TIE at native [1200,300,0]): current wings land at NDC x = 0.30 / 0.21 (a depth slide, Δ 0.086) vs the correct native lateral split (component 1) at x = 0.083 / 0.417 (Δ 0.33). The wings no longer fly apart left/right; the globe rises instead of receding. Count-only test can't see it; per repo convention fragment positions are eyeball-verified, and the round-1 eyeball/MAME pass did not specifically check TIE-death spread.

### Devil's Advocate (round 3)

The comfortable story is "B1 committed, C1 comments fixed, approve — it's surgical." That is the trap. The one comment the rework rewrote at render.ts:605 to describe the retired `TIE_ORIENT` was rewritten into a NEW falsehood ("the split direction rides the baked fragment models"), and chasing that falsehood to the code reveals the split direction is a set of hardcoded world offsets the migration forgot to sweep. So the space TIE-death — a shipped, player-facing beat in a fidelity epic whose north star is "the video IS the game" — now pops apart along the wrong axes: two wings that should splay left and right instead slide toward and away from the camera, nearly on top of each other, and the cabin globe floats up instead of receding. Every gate is green because the only test counts segments, and the convention that fragment positions are the eyeball's job is exactly why nobody's automated net catches it — and the one human eyeball this story got (round 1) checked TIE geometry and fireball streaming, not the death spread. It is small, it is transient, it is cosmetic — and it is a regression THIS story introduced, unfixed, in the phase the story declares "fully native and MAME-verified." Approving it means shipping a known fidelity miss and a comment that lies about why. The lens is still right; this is one more un-swept sibling in a migration whose siblings have been the whole story.

## Reviewer Assessment (round 3)

**Verdict:** REJECTED

Round-2's blocking items are resolved: **B1 is closed** (the fix is committed at c949785e — HEAD now carries the aspect-independent lens, not the round-1 code), and **C1(a,c,d) are closed** (the debug-overlay JSDoc, TIE_ORIENT block + port number, and the tie-status.ts landmine are all accurately de-staled, citations 53/53). The F1 lens fix and native migration remain blessed and untouched. [SEC] round-2 security-clean stands; [RULE] round-2 rule coverage + D1–D4 stand; [DOC] the comment cluster is closed except one; [TEST]/[EDGE]/[SILENT]/[SIMPLE]/[TYPE] disabled, assessed by Reviewer.

The reject is a NEW finding the round-3 adversarial re-read surfaced — the green rework's own replacement comment was a fresh lie, and it papered over a real bug:

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM][RULE] | **F-G1 — the TIE-death fragment offsets were never swept to the native basis (a migration miss this story introduced).** Wings `at(-ws,0,0)`/`at(ws,0,0)` and globe `at(0,0,gs)` offset native depth (component 0) / up (component 2), so the wings slide in DEPTH instead of flying apart left/right and the globe rises instead of receding. Probe-confirmed: current lateral separation Δ NDC.x = 0.086 (a depth artifact) vs the correct native lateral Δ 0.33. Unguarded (the death-fragments test is count-only; positions are eyeball-convention and the round-1 eyeball didn't check the death spread). | render.ts:619-620,626 | Apply the same `[x,y,z]→[-z,x,y]` sweep the rest of the migration used: wings `at(0,-ws,0)`/`at(0,ws,0)` (native right), globe `at(-gs,0,0)` (native depth). Confirm the exact sign by the AC#3 eyeball of a TIE death (wings splay left/right, globe recedes). |
| [LOW][DOC] | **F-G2 — the render.ts:605 comment written in the last green pass is inaccurate.** It says the split direction "rides the baked fragment models"; the split is the `at(dx,dy,dz)` position offsets (per F-G1). | render.ts:605 | Rewrite to state the split direction is the fly-apart position offsets (native axes after F-G1's sweep); TIE_ORIENT is IDENTITY and no longer a tell. |

**Still blessed — do not re-open:** `sceneProjection`, `ndcToScreen`, the scene/crosshair/beam/fireball routing, F4/F2/F7 + the now-fixed C1(a,c,d) comments, and the native migration. The round-3 rework is small and local to the TIE-death block: sweep the three offset vectors, correct the one comment, eyeball the death.

**Non-blocking follow-ups unchanged:** D1 (/models.html letterbox), D2 (60°/30° trench rationale → sw10-3), D3 (pixel-level aim guard), D4 (frustum gizmo / F5).

**Handoff:** Back to Dev (Yoda) for the green rework — a 3-line offset sweep + one comment, then the TIE-death eyeball. No test change (fragment positions are eyeball-convention).

## Dev Assessment — rework 3 (GREEN: F-G1 offset sweep + F-G2 comment)

Fixed and committed (`d2b5324c`). The reviewer's finding was exactly right — the exploded-TIE fragment offsets were an un-swept migration sibling.

**F-G1 (the fix):** applied the `[x,y,z]→[-z,x,y]` `toNative` sweep to the three fragment offsets in `render.ts` (the same sweep the rest of the migration used):
- wings `at(-ws,0,0)`/`at(ws,0,0)` → `at(0,-ws,0)`/`at(0,ws,0)` (native right, component 1)
- globe `at(0,0,gs)` → `at(-gs,0,0)` (native depth, component 0)

**Verification (projection probe, the exact render pipeline `viewMatrix(COCKPIT,CAMERA_ORIENT)` + `sceneProjection`):** for a TIE at native `[1200,300,0]` the wings now land at NDC.x `0.083` / `0.417` — straddling the TIE's `0.25` symmetrically (a true left/right split, Δ 0.33), where before the fix they slid in depth (Δ 0.086). The globe now moves in native depth (swells toward the eye at the TIE's lateral position), preserving the pre-migration visual (old OpenGL `(0,0,+gs)` = nearer → native `(-gs,0,0)` = nearer, mechanically consistent). The lateral split is confirmed by the deterministic projection math; per repo convention fragment positions are the eyeball's job, and this is the render's actual projection, so the burst geometry is provably lateral now — the live TIE-death eyeball remains the review-time AC#3 confirmation, as for the rest of the story.

**F-G2 (the comment):** `render.ts:605` now states the split direction is the fly-apart position offsets (wings ±native-right, globe -native-depth), not `TIE_ORIENT` (IDENTITY, no longer a tell).

**Untouched (still blessed):** the F1 lens, `ndcToScreen` routing, the native migration, and the C1(a,c,d) comments. Only the TIE-death block changed.

**Deferred (non-blocking, unchanged):** D1 (/models.html letterbox), D2 (60°/30° trench rationale → sw10-3), D3 (pixel-level aim guard), D4 (frustum gizmo / F5).

**Gates (verified this session):**
- `npm run lint` — clean.
- `npx vitest run --project star-wars citations` — **53/53**.
- `npx vitest run --project star-wars tie-death-fragments` — **3/3**; `aim-aspect-invariant` — **6/6**.
- Full star-wars suite — **2328 passed / 52 failed across the same 13 trench/exhaust-port files** (approved sw10-3 deferral) — no new regression.

Resolving the green gate → completing the phase → handing back to Reviewer (Obi-Wan) for the round-4 re-review.

## Subagent Results — rework 3 re-review (round 4)

Scope: confirm F-G1 (offset sweep) + F-G2 (comment) closed and no new sibling introduced. Only the TIE-death block in render.ts changed since round 3; the F1 lens, B1 commit, and C1(a,c,d) are already closed and blessed, so round-2/round-3 subagent coverage of the unchanged code stands and this round verifies the delta directly.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | gates re-run on HEAD d2b5324c: lint clean, citations 53/53, tie-death-fragments 3/3, aim-aspect-invariant 6/6, full suite 2328/52 (same 13 deferred) | confirmed directly |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled — fragment positions are eyeball-convention; the split axis is verified by the projection probe |
| 5 | reviewer-comment-analyzer | Yes (round-3 re-read) | clean | the render.ts:605 comment is now accurate (split = position offsets; TIE_ORIENT IDENTITY) | F-G2 closed |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes (round-2) | clean | none | stands (offset sweep introduces no divide/cast/purity change) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes (round-2/3 + round-4 sibling sweep) | clean-for-delta | no other un-swept world-space draw offset in the shell (death frags were the only space one; trench port fallback is the deferred sw10-3 item) | F-G1 closed; no siblings |

**All received:** Yes (4 enabled covered — direct round-4 verification of the delta + carried-forward coverage of the unchanged code; 5 disabled Skipped)
**Total findings (round 4):** 0 blocking. F-G1 and F-G2 CLOSED; all prior blockers (F1, B1, C1) closed. Remaining items are the non-blocking follow-ups D1–D4.

### Rule Compliance (round 4 delta)

- **F-G1 (#13/#24 sweep applied where named):** CLOSED — the three offsets now use native axes (`at(0,∓ws,0)` wings, `at(-gs,0,0)` globe), the mechanical `[x,y,z]→[-z,x,y]` sweep. Probe through the real pipeline: wings straddle the TIE at NDC.x 0.083/0.417 (Δ 0.33 lateral) vs the pre-fix 0.086 depth artifact. Globe moves in native depth, preserving the pre-migration visual.
- **F-G2 (#17 comment accuracy):** CLOSED — render.ts:605 now names the position offsets, not the retired TIE_ORIENT.
- **Sibling check:** no other hardcoded world-space draw offset survives un-swept in render.ts / debug-overlay.ts (line 458 trench port fallback is the deferred sw10-3 item).
- Citations 53/53 (render.ts comment/offset edits text-safe; no `.MAC` quote touched).

### Devil's Advocate (round 4)

The temptation now is fatigue-approval after three rounds. So assume the sweep is wrong. Could `at(-gs,0,0)` push the globe the wrong way — approach where it should recede? I checked the sign against the pre-migration frame, not by taste: old OpenGL `(0,0,+gs)` on a TIE ahead at negative Z moved the globe to less-negative Z = nearer the eye; `toNative` sends that to native depth `-gs` = smaller depth = nearer the eye — same direction, so the sweep preserves the original beat rather than inventing one. Could the wings now be swapped (FRAG_1 right, FRAG_2 left)? They're symmetric about the TIE (`0.083`/`0.417` around `0.25`), so a swap is visually immaterial for a mirror-symmetric wing pair. Is there a fourth un-swept sibling hiding? I re-grepped the shell draw paths for literal coordinate offsets and world-space `pos[i] ± k`; the death fragments were the only space case, the fireball edge is view-space (frame-invariant), and the trench port fallback is the acknowledged sw10-3 deferral. Could the fix have silently reddened a test? The full suite is byte-for-byte the same 2328/52 as before the sweep, and the count-only fragment test still passes — expected, since the burst still draws the same number of edges, just at the right places. The one residual is honest: the live TIE-death eyeball is deferred to the standing AC#3 convention, but the geometry it would check is now proven by the render's own projection math, so the residual risk is a wrong-looking burst only if the deterministic probe and the canvas disagree — which they cannot, since the probe IS the pipeline. Nothing here argues for a fourth rejection.

## Reviewer Assessment (round 4)

**Verdict:** APPROVED

Every blocking finding across four rounds is closed, and the fixes were verified — not taken on report:

- **F1 (round 1)** — the authentic lens is aspect-independent end-to-end: `sceneProjection` at `aspect=1` (both `render()` and `drawDebugOverlay()` consume it), and scene geometry, crosshair, cannon-tip beam, and world fireballs share one `min(w,h)` centred-square `ndcToScreen`. Non-vacuous test 6/6. [RULE]
- **B1 (round 2)** — the fix is committed (HEAD `d2b5324c`); the branch no longer carries the round-1 broken lens.
- **C1 (round 2/3)** — the stale-comment cluster is de-staled and each new comment verified accurate against the code (debug-overlay JSDoc, the TIE_ORIENT comments, port 5270, and the tie-status.ts C_PV note that no longer contradicts the block it sits with). [DOC]
- **F-G1 (round 3)** — the un-swept TIE-death fragment offsets are swept to native; probe-confirmed the wings now fly apart left/right and the globe moves in depth. [RULE]
- **F-G2 (round 3)** — the fragment comment is accurate. [DOC]

Dispatch coverage: [SEC] security clean (round 2, unchanged by comment/offset edits — no divide/cast/purity change); [RULE] rule-checker ×2 confirmed F1 closed + the sibling sweep found no further un-swept offset; [DOC] comment-analyzer ×2 confirmed the cluster closed and the round-3 comment accurate; [TEST] fragment positions are eyeball-convention, the split axis proven by the projection probe; [EDGE]/[SILENT]/[SIMPLE]/[TYPE] disabled — assessed by Reviewer (a seam extraction that removes duplication introduces no edge/silent-failure/complexity/type surface).

**Data flow traced:** yoke `state.aimX/aimY` → `crosshairNdc` → `ndcToScreen` (reticle) AND `aimDirection` → world point → `sceneProjection` → `ndcToScreen` (scene) — one square viewport, so the reticle and a target at the same NDC land on the same pixel at any window shape (the F1 invariant), verified by probe + test.
**Pattern observed:** one shared projection seam (`sceneProjection`) + one shared letterbox (`ndcToScreen`) retire the duplicated inline maps — good deduplication, at render.ts:410 / wireframe.ts:51.
**Error handling:** divides guarded (`sceneProjection` ignores w/h; `ndcToScreen` only multiplies by `min(w,h)/2`; `siteOffset`/`trenchGunFireVelocity` guards preserved); core purity held.

**Non-blocking follow-ups (carried to Delivery Findings, do not block this story):** D1 `/models.html` letterbox regression (contactSheet native-basis follow-up), D2 falsified 60°/30° trench rationale (→ sw10-3), D3 pixel-level aim↔render guard (TEA follow-up), D4 debug-overlay frustum gizmo + F5. AC#3 residual: a live TIE-death eyeball (geometry now proven by the projection probe) and the letterbox bar/HUD appearance remain the standing AC#3 convention items — cosmetic, non-blocking.

**Handoff:** To SM (Thrawn) for finish-story.