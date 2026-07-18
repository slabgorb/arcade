---
story_id: "bz3-9"
jira_key: "bz3-9"
epic: "bz3"
workflow: "trivial"
---
# Story bz3-9: COLLISION BOUNCE — the ROM jolts the view and bobs the mountains on a hard hit; the clone does neither

## Story Details
- **ID:** bz3-9
- **Jira Key:** bz3-9
- **Workflow:** trivial
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** trivial
**Phase:** setup
**Phase Started:** 2026-07-18T08:08:18Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T08:08:18Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Verified BOUNCE citations** (all confirmed byte-exact against `~/Projects/battlezone-source-text/BZONE.MAC` before pinning): trigger `LDA I,3F / STA BOUNCE` (:2681-2682), gated by the OBJCOL rising edge (`LDA OBJCOL / BNE M.10$` :2677-2678 — first contact only, the SAME edge BOING already used); decay `LDA BOUNCE / BEQ 20$ / LSR BOUNCE` (:2132-2134, BOUND), unconditional `>>1` per game frame — 63,31,15,7,3,1,0 over exactly 6 frames, confirmed by direct arithmetic and by a test that walks the real sequence; Z-jolt `SEC / LDA DDEND / SBC BOUNCE` (:2110-2113, KLUDGE, `.SBTTL KLUDGE MOVEMENT IN Z-AXIS` :2086) — subtracts BOUNCE from every drawn vertex's depth before the perspective divide, confirmed uniform (called once per vertex inside `PNTPUT`, BZONE.MAC:1993/2068); mountain bob `LDA BOUNCE` + four `LSR` (:1265-1270) then `SBC` onto the beam Y register XCOMP+2 (:1271-1277, MOUNTS) — BOUNCE>>4, a stricter (higher) threshold than the jolt's raw BOUNCE, so the bob stops mattering (>>4 floors to 0) several decay-steps before the jolt does; this is authentic ROM behavior, not a bug (see the sync test in bounce.test.ts, which asserts bob⇒jolt, not jolt⇔bob).
- **One core value, two independent ROM scalings, one shared trigger:** `state.ts`'s `bounce` (0-63) is set in `sim.ts`'s `stepBattle` on the exact `motionBlocked && !motionBlockedLatch` rising edge already wired for BOING (bz3-10), and decayed in `sim.ts`'s `advanceRadar`'s existing 15.625 Hz game-frame `while` loop (bz3-7/bz3-11's accumulator) — reused infra per the story's method, no new clock. `camera.ts`'s `tankView(pose, bounce)` applies the Z jolt by translating the EYE forward along its own facing by `bounce` world units (proven algebraically equivalent to KLUDGE's per-vertex `SBC BOUNCE`: for any fixed world point, pushing the eye forward by `d` reduces that point's eye-space depth by exactly `d` — a single-function change instead of touching every `projectModel` call's per-vertex math). `horizon.ts`'s `panoramaToNdc(..., bounce)` applies the mountain bob as a pre-projection elevation shift of `(bounce >> 4) * VECTOR_UNIT_RAD` (reusing the file's own existing vector-generator-unit→radian conversion, since MOUNTS's beam-Y register and the MTN_SEGMENTS stroke deltas share that same ROM coordinate space) — verified this rides the SAME core value as the jolt in an explicit sync test.
- **Wiring is real, not just unit-tested:** `main.ts`'s `renderFrame` passes `game.bounce` into `skylineSegments`, `obstacleSegments`, and all 4 `projectModel` call sites (hostile, saucer, both shells) — the whole rendered scene jolts together, matching M-009's "of the whole view" framing, not a single entity.
- **Citation gate:** re-anchored 2 shifted `ours` lines that my edits pushed down (`pair-cadence.json` C-002, `src/main.ts` 301→315; `pair-horizon.json` H-004, `src/core/horizon.ts` 201→222 — both line-only, content unchanged). Set `remediated_by: "bz3-9"` on M-009 (`pair-tank-motion.json`) and H-007 (`pair-horizon.json`) only. M-009 is `NO_COUNTERPART` — per the checker's allowed alternative, gave it a fresh `ours` (`src/core/camera.ts:86`, the `eyeX = pose.x + fwd[0] * bounce` line) naming the code that now implements the rule, rather than leaving `ours: null`. H-007 is `DIVERGENCE` — its `ours` (`horizon.ts:191`) is left FROZEN at its pre-fix text per the checker's rule (a remediated DIVERGENCE keeps its historical quote). Ran `node tools/audit/reanchor-citations.mjs` (dry) after: 118 already correct, 0 re-anchored, 0 lost — confirms nothing else moved. No other bz3-9 stamps touched; every other finding in the 4 edited JSON files is untouched content, line-bump-only where it appears in the diff.

### Reviewer (code review)
- **Gap** (non-blocking): the ROM's BOUNCE register has a SECOND, LARGER trigger that bz3-9 (M-009, obstacle-ram only) does not cover — `LDA I,-1 / STA BOUNCE` = **0xFF (255)** on player death / windshield crack (`BZONE.MAC:2337-2339`, right before `DEC LIVES`) and on mutual player-enemy kill (`BZONE.MAC:3363-3364`). This is the "getting-hit jolt", a sibling of M-009's obstacle-ram (0x3F) jolt, and appears to be an unfiled finding. Affects a future death-jolt story: `state.ts`'s `bounce` is documented+scoped to 0-63, but the ROM value reaches 255 (255>>4 = 15 for the mountain bob; decay 255→127→63→… is more frames), and the free-running/reset question must be reconciled with the death path SETTING BOUNCE (not clearing it). *Found by Reviewer during code review — out of scope for bz3-9, no defect in shipped code.*
- **Improvement** (non-blocking): the `state.ts` doc comment and the "free-running" Design Deviation both assert "*there's no ROM evidence BOUNCE resets on death*" — this is factually wrong (the death path WRITES BOUNCE=0xFF, above). The chosen free-running carry-forward is a fine placeholder given the death-jolt is out of scope, but the stated rationale should be corrected. *Found by Reviewer.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Horizon line NOT bobbed, only the ridge/moon:** the ROM's MOUNTS shifts ONE shared beam origin (XCOMP+2) that the horizon stroke, ridge, and moon are ALL drawn relative to — technically the flat horizon line bobs too. The story/H-007 both frame the finding narrowly ("mountain silhouette"/"mountain range"), so `skylineSegments` forwards `bounce` to every `panoramaToNdc` call (ridge+moon) but leaves the horizon-line segment (`{x1:-1,y1:0,x2:1,y2:0}`) untouched. Reviewer: confirm this narrower scope matches intent, or flag for a follow-up if the horizon line should bob too.
- **Mountain-bob scale — pre-projection elevation shift, not a raw NDC add:** H-007's own reasoning text suggests "add a vertical NDC offset" (post-projection), but I modeled it as a PRE-projection elevation shift (`elevation - (bounce>>4)*VECTOR_UNIT_RAD`, riding the existing `tan()` mapping) instead. Reason: BOUNCE>>4 is a beam-Y-register value in the SAME vector-generator coordinate space `VECTOR_UNIT_RAD` already converts for the MTN_SEGMENTS stroke deltas (both come from the same VGVTR2/VCTR beam-position units) — reusing that established conversion is more source-consistent than inventing a fresh NDC-pixel scale with no ROM anchor. Net visual effect is small either way (max shift ≈ 3 · 2π/4096 ≈ 0.0046 rad); flagging so the Reviewer can judge if the informal "NDC offset" phrasing was meant literally.
- **Z jolt implemented as a camera-eye translation, not a per-vertex depth tweak:** rather than subtracting `bounce` from each `eyePoint[2]` inside `projectModel` (mirroring KLUDGE's per-vertex form most literally), `tankView(pose, bounce)` shifts the EYE's world position forward by `bounce` along its own facing. Proven algebraically equivalent (see the Delivery Finding above) and confines the change to one function instead of a per-vertex map in every `projectModel` call — same visible result, less surface area.
- **`bounce` is free-running, never reset on respawn/game-over** (mirrors `frameCount`'s existing convention, not `motionBlockedLatch`/`enemyInRangeLatch`'s reset-on-respawn rule): a jolt already decaying when the player dies keeps decaying through the teleport to `SPAWN_POSE` rather than snapping to 0 or carrying stale suppression — there's no ROM evidence BOUNCE resets on death, and unlike the two latches, a lingering `bounce` value doesn't suppress any future event, so there's no correctness reason to zero it. Covered by an explicit test.
- **Same-instant set+decay is a known, undocumented-in-ROM timing edge:** `bounce` is SET in `stepBattle` (driven by the 60 Hz sub-step `dt`) but DECAYED in `advanceRadar`'s separate 15.625 Hz accumulator, called on the SAME `dt` immediately after. Depending on the accumulator's carried phase, the very step that sets `bounce = 0x3F` could also cross a game-frame boundary and halve it to `0x1F` within that same call — the ROM's own single 15.625 Hz main loop doesn't have this two-clock split, so which happens "first" within one ROM frame isn't decoded here. Cosmetic, `size: s` per both findings; flagging rather than guessing at a tie-break rule with no source citation.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/state.ts` — new `readonly bounce: number` field on `GameState` (0-63, the ROM's live BOUNCE magnitude), initialized to 0 in `initGame`.
- `src/core/sim.ts` — `stepBattle` sets `bounce = 0x3f` on the `motionBlocked && !motionBlockedLatch` rising edge (BOING's own edge, bz3-10), carried through all 3 return paths (game-over, respawn, normal); `advanceRadar`'s existing 15.625 Hz game-frame `while` loop now also halves `bounce` (`>> 1`) once per iteration, alongside `frameCount`.
- `src/core/camera.ts` — `tankView(pose, bounce = 0)`: translates the eye forward along `pose.heading` by `bounce` world units (the KLUDGE-equivalent Z jolt), default-0 backward compatible.
- `src/core/scene.ts` — `projectModel`/`obstacleSegments` gained a trailing `bounce = 0` parameter forwarded to `tankView`; the ROM cull distance check is judged against the un-jolted pose, only the projection eye carries the jolt.
- `src/core/horizon.ts` — `panoramaToNdc`/`skylineSegments` gained a trailing `bounce = 0` parameter; `panoramaToNdc` subtracts `(bounce >> 4) * VECTOR_UNIT_RAD` from `elevation` before the existing `tan()` mapping (the mountain/moon bob); the flat horizon-line segment is deliberately left unshifted (see Design Deviations).
- `src/main.ts` — `renderFrame` threads `game.bounce` into `skylineSegments`, `obstacleSegments`, and all 4 `projectModel` call sites (hostile, saucer, player shell, enemy shell) — the whole rendered scene jolts/bobs together from one value.
- `tests/core/bounce.test.ts` (new) — 14 tests: core trigger/decay (boot at 0, sets 63 on first contact, does not re-arm while jammed, decays only at the game-frame rate not the render sub-step, the exact 63→31→15→7→3→1→0 sequence, free-running through a respawn), the Z jolt (bounce=0 no-op, KLUDGE-equivalence proof, `projectModel`/`obstacleSegments` wiring), the mountain bob (sub-16 no-op, exact elevation-shift formula, `skylineSegments` wiring + horizon-line exemption), and one integration test proving both effects derive from the SAME `bounce` through a real collision-and-decay run.
- `docs/audit/findings/pair-tank-motion.json` — `remediated_by: "bz3-9"` + fresh `ours` (`src/core/camera.ts:86`) on M-009.
- `docs/audit/findings/pair-horizon.json` — `remediated_by: "bz3-9"` on H-007 (its `ours` left frozen, per the DIVERGENCE rule); re-anchored H-004's `ours.line` (201→222, content unchanged).
- `docs/audit/findings/pair-cadence.json` — re-anchored C-002's `ours.line` (301→315, content unchanged).

**Tests:** 999/999 passing (GREEN, 69 files). Citation gate (`npm test -- citations`): 12/12. `node tools/audit/reanchor-citations.mjs` (dry): 118 already correct, 0 re-anchored, 0 lost. `tsc --noEmit` / `npm run lint`: clean. `npm run build`: clean.
**Branch:** feat/bz3-9-collision-bounce (pushed, commit `05a7008`)

**Handoff:** To review phase

## Reviewer Assessment

**Verdict:** APPROVED

**Independent verification (Reviewer's own runs):**
- `npx vitest run` → **999 passed (69 files), 0 failed**.
- `npm test -- citations` → **12 passed, 0 failed**.
- `npx tsc --noEmit` → exit **0**, clean.

**Trigger + decay vs source (CONFIRMED byte-exact against `~/Projects/battlezone-source-text/BZONE.MAC`):**
- Trigger: `LDA I,3F / STA BOUNCE` (:2681-2682), gated by `LDA OBJCOL / BNE M.10$` (:2677-2678) — first-contact rising edge only, the SAME OBJCOL edge that fires BOING one instruction earlier. Port wires it to `motionBlocked && !motionBlockedLatch`; the "does NOT re-arm while jammed" test proves the edge behaviour. Correct.
- Decay: `BOUND: LDA BOUNCE / BEQ 20$ / LSR BOUNCE` (:2132-2134) — unconditional `>>1` per BOUND call. BOUND is called EXACTLY once per game frame in the main move loop (`JSR BOUND`, :621, between SAUCMV and MOTION → JMP MAIN). Port decays in `advanceRadar`'s 15.625 Hz accumulator loop (the same one driving `frameCount`), NOT the 60 Hz sub-step. Sequence 63,31,15,7,3,1,0 confirmed. Correct cadence, correct clock.

**Z-jolt equivalence — the key judgment call (VERIFIED EQUIVALENT):**
- ROM KLUDGE (:2108-2113): `SEC / LDA DDEND / SBC BOUNCE` — subtracts BOUNCE from every drawn vertex's depth before the perspective divide.
- Port: `tankView` pushes the EYE forward by `bounce` along `forwardFromHeading(heading)`.
- Proof: `viewMatrix(E,R)=Rᵀ·translation(−E)`, so eye-space `P_eye = Rᵀ(P−E)`. With `E' = E + b·fwd`, `P_eye' = P_eye − b·(Rᵀ·fwd)` — a CONSTANT delta for every point P. Because `fwd` is the camera's own view axis, `Rᵀ·fwd = [0,0,−1]`, so the delta is purely `+b` on eye-z and ZERO on eye-x/eye-y. Depth = −eye_z, so depth drops by exactly `b` — identical to the ROM's per-vertex `DDEND−BOUNCE`, uniformly, whole-view. Sign matches (objects appear closer). Empirically confirmed by the KLUDGE-equivalence test (off-axis pose 1.1 rad, off-axis world point: `jolted[2]≈unjolted[2]+bounce`, x/y unchanged to 6dp). Near-plane clipping is NOT affected differently — since the two forms are byte-identical in eye space, the `EYE_EPSILON_Z` guard sees the same values either way; and at max `bounce`=63 vs `NEAR_CULL`=1023 it is never triggered in practice. Equivalence holds.

**Mountain bob vs source (CONFIRMED):** MOUNTS (:1265-1277) `LDA BOUNCE` + four `LSR` (>>4) then `SBC` onto beam-Y `XCOMP+2` — port subtracts `(bounce>>4)*VECTOR_UNIT_RAD` from elevation. Right amount, right direction (down), and the pre-projection elevation shift (judgment #2) is the FAITHFUL choice: `XCOMP+2` (beam origin) and the MTN stroke `dy` deltas live in the same vector-generator unit space that `VECTOR_UNIT_RAD` already converts, and the ROM shifts the beam origin BEFORE drawing — so a pre-`tan()` shift mirrors it exactly. Reusing `VECTOR_UNIT_RAD` is more source-consistent than an invented NDC scale. Approved over the finding's informal "NDC offset" phrasing.

**Synchronization (CONFIRMED):** ONE `state.bounce` drives both effects — `main.ts` threads `game.bounce` into `skylineSegments` (bob) and every `projectModel`/`obstacleSegments` (jolt). Cannot desync. Carried through all 3 `stepBattle` return paths (game-over/respawn/normal), initialised to 0. Free-running (never zeroed on respawn) does NOT strand a harmful value — a lingering `bounce` suppresses no event and decays to 0 on its own within ~6 frames; benign.

**Regression + purity (CONFIRMED):** all new params default to 0 → every pre-existing call site is byte-identical; 999/999 pass, no projection/render test regressed. `bounce` is deterministic sim state (a number from inputs; no DOM/time/random); applications are pure render-side functions. Core boundary intact.

**Citation honesty (CONFIRMED):** `remediated_by: bz3-9` on M-009 + H-007 only. M-009 (`NO_COUNTERPART`) got a fresh valid `ours` → `camera.ts:86` = `const eyeX = pose.x + fwd[0] * bounce` (matches file). H-007 (`DIVERGENCE`) `ours` left frozen at `horizon.ts:191` per the checker's rule. Re-anchors C-002 (main.ts 301→315) and H-004 (horizon.ts 201→222) are line-only, verbatim unchanged. Gate genuinely 12/12.

**Deviation audit:**
- Z-jolt as eye-translation — **ACCEPTED** (proven equivalent above).
- Mountain bob as pre-projection elevation shift — **ACCEPTED** (source-consistent unit space).
- `bounce` free-running (never reset on respawn) — **ACCEPTED as code, rationale FLAGGED**: the deviation's premise ("no ROM evidence BOUNCE resets on death") is factually wrong — the ROM SETS BOUNCE=0xFF on death (:2337-2338). The carry-forward is a fine placeholder, but see Delivery Findings (Improvement) to correct the justification.
- Horizon line left un-bobbed — **FLAGGED (Low, non-blocking)**: see finding below.
- Same-instant set+decay timing edge — **ACCEPTED (Low, cosmetic)**: see finding below.

**Findings by severity:**

| Severity | Issue | Location | Note |
|----------|-------|----------|------|
| [MEDIUM] | ROM MOUNTS draws the horizon line from the SAME bounced beam origin as the ridge (`JSR VGVTR2` with bounced `XCOMP+2` at :1279, then `ADD HORIZON LINE` :1280-1282), so the ROM bobs the horizon WITH the mountains; the port leaves the flat horizon fixed at NDC y=0 and bobs only ridge/moon → a brief (~2 frame / ~128 ms) relative detachment where the mountains dip ~10px below the horizon, which the ROM does not have. | `horizon.ts:222` (horizon segment) / `skylineSegments` | Non-blocking. H-007 scopes to the "mountain silhouette"; magnitude tiny & brief; dev flagged it. Confirm the narrower scope is intended, or file a follow-up to bob the horizon line too for full fidelity. |
| [LOW] | Doc/deviation claim "no ROM evidence BOUNCE resets on death" is contradicted by BZONE.MAC:2337-2338 / 3363-3364 (death SETS BOUNCE=0xFF). Code correct; rationale wrong. | `state.ts` bounce JSDoc + Design Deviation | Correct the wording; no code change needed. |
| [LOW] | `stepGame` runs `stepBattle` (set) BEFORE `advanceRadar` (decay); the ROM runs BOUND (decay, :621) BEFORE MOTION (collision/set, :622). On the trigger frame, if the accumulator crosses a boundary that sub-step, the port can show 0x1F instead of 0x3F for one frame; worst case still non-zero (visible jolt). | `sim.ts` stepGame order | Cosmetic two-clock artifact; dev flagged; accept or reorder decay-before-set-edge for exactness. |

**Data flow traced:** obstacle ram → `stepBattle` sets `bounce=0x3F` on the `!motionBlockedLatch` edge → `advanceRadar` halves it per 15.625 Hz frame → `main.ts` reads `game.bounce` → `tankView` eye-shift (jolt) + `panoramaToNdc` elevation-shift (bob), one value, both effects. Safe: pure, deterministic, decays to 0.

**Handoff:** To SM for finish-story (trivial workflow — no rework loop; findings are all non-blocking Medium/Low).
