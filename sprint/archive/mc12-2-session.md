---
story_id: "mc12-2"
jira_key: "mc12-2"
epic: "mc12"
workflow: "tdd"
---
# Story mc12-2: Render fidelity round 3 (two fixes on one render.ts surface — grouped per the file-by-surface habit so they share one review). (a) DROP the incoming-ICBM 'lollipop': render.ts:175 fills a headR disc (ctx.arc) at each ICBM head; the cabinet draws incoming missiles as a trail with a flashing 1px tip like the ABM ('TIP OF MISSILE TRAIL IS FLASH' W3DSUP.MAC:931; DRAW MISSILE W3DSUP.MAC:1221), no disc. (b) AUTHENTIC bomber/satellite: render.ts:186-189 draws each sputnik/plane as a fillRect wing/box placeholder ('pixel-authentic plane sprite ... are mc9', which mc9-1 never did); port the plane (bomber) and satellite (sputnik) stamp geometry from the W3DSUP stamp layer as mc9-1 did for cities (WRITE A STAMP W3DSUP.MAC:587; locate the plane/satellite stamp label; sputnik.json claim exists). Shell-only; enemy hue (COL010) unchanged; purity stays green.

## Story Details
- **ID:** mc12-2
- **Jira Key:** mc12-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/mc12-2-render-fidelity-icbm-tip-and-enemy-stamps
- **PR:** https://github.com/slabgorb/arcade/pull/500 (MERGED → develop, merge commit 44fa2609)
- **Repos:** arcade

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-17T10:40:52Z

<!-- REJECT ROUTING REPAIR (Heimdall, Reviewer): the approval gate's complete-phase
     defaulted the transition to `finish` even though the Reviewer verdict is REJECTED
     (recovery_config: reviewer-verdict → action: rework, target_phase: green). Per the
     known "reviewer reject misroute" trap, the phase is repaired back to `green` so Dev
     reworks F1+F2 before any finish. This is rework attempt 1 of max 3. -->

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-17T09:16:17Z | 2026-08-17T09:18:45Z | 2m 28s |
| red | 2026-08-17T09:18:45Z | 2026-08-17T10:07:46Z | 49m 1s |
| green | 2026-08-17T10:07:46Z | 2026-08-17T10:20:33Z | 12m 47s |
| review | 2026-08-17T10:20:33Z | 2026-08-17T10:35:07Z | 14m 34s |
| green | 2026-08-17T10:35:07Z | 2026-08-17T10:39:15Z | 4m 8s |
| review | 2026-08-17T10:39:15Z | 2026-08-17T10:40:52Z | 1m 37s |
| finish | 2026-08-17T10:40:52Z | - | - |

## SM Assessment

**Setup complete — ready for TEA (RED phase).**

**Premise verification.** The story cites `render.ts:175` / `:186-189` for two placeholders to fix; both
were measured live against develop and found TRUE and current:
- **(a)** `plugins/millipede/../missile-command/src/shell/render.ts:175` draws `ctx.arc(head.x, head.y, headR)` + `ctx.fill()`
  in the `for (const icbm of state.icbms)` loop — the ICBM head "lollipop" to drop. Its own comment says
  "plus a head dot." The ABM flash-tip model to mirror (AC1) already lives in the same file (~:196+),
  citing `W3DSUP.MAC:925/931/1221`.
- **(b)** `render.ts:189` draws `ctx.fillRect(…, planeW, wingH)` per `state.sputniks` (comment: pixel-authentic
  sprite deferred to mc9) — the placeholder AC2 replaces. Authentic stamps go in `src/shell/stamps.ts`
  (mc9-1's city-stamp home). `sputnik.json` and `reference/source/W3DSUP.MAC` both exist.

**One path correction (not staleness):** the story writes bare `render.ts`; the real file is
`src/shell/render.ts` — the ACs already say "src/shell", so they're internally consistent. Passed to setup.

**Shell-only / purity:** no `src/core` change; enemy hue (`SLOT.ICBMS` / COL010) unchanged; `purity.test.ts`
stays green. missile-command has a CITATIONS gate — new source must cite W3DSUP lines with `//` (JSDoc `/** */`
leaks the scanner).

**Open discovery (non-blocking, logged):** the plane/satellite stamp LABEL in W3DSUP.MAC is not yet located —
Architect/Dev work, flagged by the story itself. Not a setup blocker.

**Probes clean.** No mc12-2 branch or session anywhere (a-2 runs mc12-3, a-3 runs df4-3); zero open PRs; tree
clean on develop. **No file contention:** mc12-2 edits `render.ts`/`stamps.ts`; a-2's mc12-3 edits
`main.ts`/`input.ts`/pointer-lock — disjoint surfaces (render.ts last touched by mc7-4/mc6-5/mc10-3). Claim
committed + branch pushed.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **Type:** Question | **Urgency:** non-blocking | The plane/satellite stamp LABEL in W3DSUP.MAC is marked as "open discovery item" in the story — Architect/Dev must locate this in ROM source; the claim sputnik.json exists but the exact stamp geometry label is unknown.

### Reviewer (code review — Heimdall)
- **Improvement** (non-blocking): the enemy-plane silhouette is the PLACOL **leading-edge contour** (front-weighted), not a filled swept body, and the mirror uses `-dh` where the ROM's `EOR 0FF` is exactly `-dh-1` (a 1px shift facing left). Affects `plugins/missile-command/src/shell/{render.ts,stamps.ts}` — **route to mc12-4** (on-screen screenshot arbitrates whether the contour reads correctly / needs the swept-fill + exact 1px offset). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `plugins/missile-command/tests/render-battle.test.ts` `icbmSection` slice ends at `state.sputniks`, over-including the preceding "Enemy planes" comment (no false pass today). Tighten the end-anchor if that section is next edited. *Found by Reviewer during code review.*
- **Conflict** (non-blocking): `sprint/epic-mc12.yaml` AC2 still cites the WRONG routine — "WRITE A STAMP (W3DSUP.MAC:587)" (the CITY blitter). The plane is drawn by **OUTLST** (W3MAIN.MAC:5925/:5947) from the DOT LIST OUTPUT TABLES (:6073-6175). **SM: correct the epic AC2 citation** (also flagged by TEA). *Found by Reviewer during code review.*

### TEA (RED phase — ROM discovery in progress)
- **Type:** Conflict | **Urgency:** non-blocking | **AC2's citation premise needs correction.** AC2 says port the plane/satellite geometry from "the W3DSUP stamp layer (WRITE A STAMP, W3DSUP.MAC:587)". Measured: WRITE A STAMP is the CITY/arrow 8×8 blitter (mc9-1's `CITY_STAMPS`); the PLANE is drawn by a different routine — **`OUTLST`** (W3MAIN.MAC:5893, `PROPLA` "WRITE OUT NEW LEADING EDGE OF PLANE AND ERASE TRAILING EDGE"), a leading-edge column blitter. So the authentic geometry lives in OUTLST's picture data, and the AC2/render citation should point there, NOT (only) at WRITE A STAMP:587. A ROM-fidelity study (Architect) is extracting the exact plane/satellite pixel geometry + whether bomber≠satellite in the ROM, per the user's ruling ("do the ROM archaeology now").
- **CORRECTION to my own earlier note (verify-your-verifier):** an initial plain-`grep` sweep returned empty for `plane|sputnik|stamp` across the reference source and I briefly concluded "no plane sprite exists — AC2 refuted." That was a **grep binary-detection artifact** — the `.MAC` files carry a few control bytes. `grep -a` finds STAMP 31× (W3DSUP) and plane/sputnik 44× (W3MAIN). The premise is NOT refuted; the geometry is real and (very likely) transcribable from ASCII source. Always `grep -a` these files.

## ROM Ground Truth (Architect study — the spec GREEN transcribes)

**AC2 citation CORRECTED (flag for SM):** the plane/satellite are NOT drawn by WRITE A STAMP (W3DSUP:587 — that is the CITY/arrow 8×8 blitter, mc9-1's `CITY_STAMPS`). They are drawn by **`OUTLST`**, a dot-list renderer:
- `OUTLST` — `.SBTTL MOVE AN OBJECT 1 DOT HORIZONTAL`, W3MAIN.MAC:5925 / routine :5947; called from `PROPLA` (`.SBTTL PROCESS THE PLANE`, :5853; `JSR OUTLST`, :5895).
- `DOT LIST OUTPUT TABLES` — W3MAIN.MAC:6073-6175 (LISTRT :6081, DOTCOL :6095, ENDFLG :6105; satellite HPLEAD/VPLEAD :6109/:6143; bomber HBMLEA/VBMLEA :6131/:6167).
- Colours PLACOL/FLASH/BLUE/BCKGND — W3COMN.MAC:469-479. Variant select SOBJID — W3MAIN.MAC:5807; speeds PLARAT :5921.
- **⚠ NAMING INVERSION:** the ROM's `PL*` tables hold the **SATELLITE** geometry; `BM*` holds the **BOMBER**. Do NOT bind `HPLEAD` to the bomber in tests.
- No stamp #, nothing in `A35820.1C.bin` — the geometry is entirely these ASCII dot tables.

**Decoded steady-state silhouettes** (`P`=enemy/PLACOL, `B`=blue, `F`=flash, `·`=bg; facing right; sim: scratchpad/decode_plane.py):
- SATELLITE (object 0, 13×13 + flash corners): round body, 4 diagonal antennae with FLASH tips at (±6,±6), two BLUE 2×3 porthole bands; H+V symmetric (no mirror needed).
- BOMBER (object 1, 16×11, all PLACOL): swept shape, nose at (+7,0) facing travel, tail fin upper-rear, lower wing swept back; **mirror horizontally when facing left** (authentic EOR-0xFF).

**Bomber vs satellite are distinct** by SHAPE, by speed (PLARAT 1 vs 2), and by colour detail — AC3 needs no rescope.

### TEA scope call (records a real decision)
- **THIS story:** render both as their authentic distinct SHAPE **in the enemy hue** (the PLACOL silhouettes), positioned by `project()`, replacing the fillRect placeholder. Geometry lives in `src/shell/stamps.ts` beside `CITY_STAMPS`, citing **W3MAIN** (OUTLST/DOT-LIST), not W3DSUP. This satisfies AC2 ("enemy hue COL010 unchanged", distinct shapes) and AC3 (distinct, non-vacuous).
- **FILED as follow-up (out of scope here):** the satellite's authentic TWO-TONE detail — FLASH antenna tips + BLUE portholes. AC2 explicitly holds "enemy hue unchanged", so the multi-register detail belongs to a separate story (render tips via the existing FLASH_SLOTS pick, portholes in the blue slot). Recorded so the finding is not lost.

## TEA Assessment (RED complete — handing to Dev)

**RED confirmed.** 7 failing tests added to `plugins/missile-command/tests/render-battle.test.ts`
(reusing the sibling `recordingCtx`/`paint`/`projectX/Y` harness — DRY). 2 sanity guards green,
11 prior tests green, `lint` (tsc --noEmit) green, `purity.test.ts` green (29). Commit
`test(mc12-2): RED …` pushed on the story branch.

**What each test pins (and why it reddens today):**
- **AC2/AC3 — silhouettes (3 RED, behavioural):** a bomber / a satellite each draw a multi-pixel
  silhouette near their `project()`ed position (bomber ≥12 marks, satellite ≥8), and bomber vs
  satellite draw a **distinct** mark signature. Today the sputnik loop draws ONE `fillRect` per
  plane and the mock drops the height arg, so both variants collapse to the *same single mark* —
  all three fail. Thresholds are conservative (safely > 1, safely < a faithful silhouette's count).
- **AC2 — source (2 RED):** the shell (`render.ts`+`stamps.ts`) must name **OUTLST** and cite a
  **W3MAIN dot-list** line (`:59xx`/`:60xx`/`:61xx`). Neither string exists today.
- **AC1 — source (2 RED, scoped to the ICBM section):** the ICBM path must cite the flash tip
  (W3DSUP.MAC:931) + DRAW MISSILE (W3DSUP.MAC:1221), and must reference the FLASH mechanism
  (`FLASH_SLOTS`/`abmTip`) in code — so a comment-only "citation added, disc kept" decoy still
  reddens (mc10-7). The colour-blind mock can't see the hue, so AC1's "drop the enemy disc" is
  enforced structurally, as recorded in the scope call.

**Non-vacuity guards (green, deliberately):** "the empty field draws nothing where the plane will
be" proves the silhouette window is clean (the RED is the plane, not field noise); "the ICBM
section anchors resolve" proves the source slice isn't silently empty.

**Rule coverage:** the applicable local rule here is the **missile-command CITATIONS gate** (new
src must cite ROM lines with `//`, not `/** */`). The AC1/AC2 source tests enforce that the new
geometry/tip code carries `//` citations; Dev must keep them single-line.

**⚠ FLAG FOR SM — epic-mc12.yaml AC2 citation is WRONG.** AC2 says port the plane geometry from
"WRITE A STAMP (W3DSUP.MAC:587)". That routine is the CITY/arrow 8×8 blitter (mc9-1's
`CITY_STAMPS`). The plane/satellite are drawn by **OUTLST** (`W3MAIN.MAC:5925`/`:5947`) from the
**DOT LIST OUTPUT TABLES** (`W3MAIN.MAC:6073-6175`). The AC2 citation in `sprint/epic-mc12.yaml`
should be corrected to the OUTLST / W3MAIN dot-list cites. (⚠ ROM NAMING INVERSION: `PL*` tables =
SATELLITE, `BM*` = BOMBER — see ROM Ground Truth above; do not bind `HPLEAD` to the bomber.)

**For Dev (GREEN):** transcribe the two PLACOL silhouettes into `src/shell/stamps.ts` beside
`CITY_STAMPS` (the decoded grids + line cites are in **ROM Ground Truth** above), cite W3MAIN with
`//`; replace the `render.ts` sputnik `fillRect` with a `stampPixels`-style blit positioned by
`project()` (bomber mirrors horizontally when `dir === -1`). For AC1, drop the `ctx.arc(head…,
headR)` disc and render the ICBM head with the ABM's flash-tip treatment. The satellite's two-tone
FLASH tips + BLUE portholes are a **filed follow-up** (enemy hue unchanged this story).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (GREEN) — Loki

- **Geometry re-derived from primary ROM source, not the Architect's grid.** The session's
  "ROM Ground Truth" said GREEN transcribes the Architect's decoded grids, but those grids lived
  only in `scratchpad/decode_plane.py`, which was lost with the scratchpad on a context clear. I
  re-derived the geometry directly from the primary source: the paired H/V DOT LIST OUTPUT TABLES
  (`W3MAIN.MAC:6109/6143` satellite HPLEAD/VPLEAD, `:6131/6167` bomber HBMLEA/VBMLEA), transcribed
  verbatim into `stamps.ts` (`SATELLITE_DOTS` 23 dots, `BOMBER_DOTS` 13 dots). Confirmed each
  object's list selection by reading OUTLST's list-walk (`W3MAIN.MAC:5947-6069`): it re-stamps the
  PLACOL LEADING-EDGE list every frame (BCKGND trailing list erases only the 1-px motion smear), so
  the PLACOL leading-edge contour IS the visible per-frame silhouette.
- **FIDELITY NUANCE for Reviewer + mc12-4:** the rendered shape is that leading-edge **contour** —
  front-weighted / directional (rounded leading edge, flatter trailing edge), NOT a filled symmetric
  body. The Architect's prose ("round body, H+V symmetric") most likely reflects a full-SWEEP
  accumulation simulated by the lost `decode_plane.py`, not a single OUTLST frame. Per the ROM code,
  a single frame's PLACOL = this contour, and AC3 (distinct, multi-pixel, OUTLST-derived) + the tests
  are satisfied. Whether the on-screen result needs the swept-fill / trailing-edge treatment is
  **mc12-4's screenshot call**; if so, that is a follow-up (the trailing-edge tables HPLTRA/VPLTRA
  `:6119/6155` and HBMTRA/VBMTRA `:6135/6171` are the raw material). I did not guess a fill.
- **AC1 tip unified (DRY):** the incoming-ICBM head and the outgoing-ABM tip now share one
  `missileTip` (FLASH register) + `tipR`, computed once in the ICBM section and reused by the ABM
  loop — replacing the removed duplicate `abmTip`. The mc3-5 solid enemy-hue head disc is gone.

### Reviewer (audit) — Heimdall

- **Dev deviation 1 (geometry re-derived from primary ROM, not the lost Architect grid)** → ✓ ACCEPTED:
  the paired H/V tables are byte-for-byte faithful to `W3MAIN.MAC:6109/6143` (satellite) and
  `:6131/:6167` (bomber) — independently re-verified by comment-analyzer and rule-checker. Primary
  source is authoritative; re-deriving was the right call.
- **Dev deviation 2 (leading-edge CONTOUR, not filled body; swept-fill deferred to mc12-4)** → ✓ ACCEPTED:
  OUTLST re-stamps the PLACOL leading-edge list each frame, so a single frame's PLACOL IS the contour;
  the deviation text is accurate. ⚠ BUT its inline realisation contradicts itself — the deviation
  correctly says "front-weighted / directional," yet the per-array comment (`stamps.ts:123`) and
  `render.ts:194` say "H+V symmetric / the satellite is symmetric." That contradiction is FLAGGED below.
- **Dev deviation 3 (AC1 tip unified, DRY)** → ✓ ACCEPTED: `missileTip`/`tipR` shared by the ICBM +
  ABM loops; no duplicate `abmTip`; behaviour preserved (full suite green).
- **UNDOCUMENTED deviation (Reviewer-found):** the diff added directional mirroring but only for the
  bomber (`render.ts:199 mirror = variant==='bomber' && dir<0`). Spec/ROM: OUTLST's `EOR PLAVEL`
  mirror (`W3MAIN.MAC:5997-5999`) is UNCONDITIONAL per object — the satellite mirrors too. Because the
  satellite dot-list is H-asymmetric (6/23 dots unmirrored), an un-mirrored left-flying satellite faces
  BACKWARD. Not logged by Dev, not tested. Severity: Medium. See Finding F2.

## Acceptance Criteria

AC1: incoming ICBMs render as a trail plus an authentic flashing tip and NO filled head disc — a render-mock test asserts no head-circle is drawn for an ICBM head and that the tip matches the ABM tip treatment; the render source cites DRAW MISSILE (W3DSUP.MAC:1221) and the flash tip (W3DSUP.MAC:931).

AC2: live bomber and satellite render from authentic W3DSUP-derived stamp geometry (not a fillRect wing/box), positioned by the existing project() mapping at the plane's position and in the enemy hue; the stamp data lives in src/shell (no src/core change) and cites WRITE A STAMP (W3DSUP.MAC:587) plus the located plane/satellite stamp label / sputnik.json.

AC3: render tests assert bomber vs satellite draw DISTINCTLY against the canvas-mock harness and that the guards are non-vacuous (a decoy that references the symbol without drawing it reddens — the mc10-7 lesson); purity.test.ts stays green. On-screen confirmation is carried by mc12-4.

## Implementation Notes

**Scope:** Shell-only work on `plugins/missile-command/src/shell/render.ts` and `plugins/missile-command/src/shell/stamps.ts` — no src/core changes.

**Verified Premises:**
- (a) ICBM head disc exists at `render.ts:166` (headR definition) and `:175` draws `ctx.arc(...)` then `ctx.fill()`
- (a) ABM tip treatment already exists at `render.ts:196+` with correct citations
- (b) Plane placeholder is at `render.ts:189` drawing `ctx.fillRect(...)` in the sputnik loop
- (b) Stamp home is `src/shell/stamps.ts` where mc9-1 put city stamps
- ROM refs: `plugins/missile-command/reference/source/W3DSUP.MAC`
- Missile Command has a CITATIONS gate — new render/stamp source must cite W3DSUP lines with `//` comments, NOT `/** */` (JSDoc leaks the scanner)

**Constraints:**
- Enemy hue (COL010 / SLOT.ICBMS) unchanged
- `purity.test.ts` stays green (no core changes)

**Branch Strategy:** gitflow (feat/mc12-2-render-fidelity-icbm-tip-and-enemy-stamps)
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | self-run | none | Ran manually: diff vs origin/develop, `npm run lint` clean, 1434/1434 suite green, purity 29/29 — clean |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 4 (1 real, 3 info) | confirmed 1 (untested bomber/satellite dir<0 mirror), noted 3 (slice over-include; citation-grep; distinctness=count-driven) |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 2 (same root: false "symmetric" claim at stamps.ts:123 + render.ts:194) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (false symmetry comment + untested left-satellite; all other rules compliant) |

**All received:** Yes (3 enabled returned, 5 disabled skipped, preflight self-run)
**Total findings:** 2 confirmed (one root cause, two sites + behaviour), 0 dismissed, 2 noted-non-blocking (LOW)

### Rule Compliance

- **Core/shell boundary (the #1 project rule)** — COMPLIANT. `git diff --name-only origin/develop...HEAD`
  touches only `src/shell/*` + `tests/*`; no `src/core` file changed. `purity.test.ts` 29/29 green. No new
  `../core/*` import beyond the pre-existing `GameState`/`FieldPos` type imports. Confirmed by rule-checker.
- **stamps.ts shell-data purity (no canvas/clock/core import)** — COMPLIANT. `SATELLITE_DOTS`,
  `BOMBER_DOTS`, `zipDots`, `PlaneDot` are plain data + a pure zip; zero imports; matches the
  `MISSILE_STACK`/`CITY_STAMPS` idiom.
- **Citations gate** — COMPLIANT. The un-cited-numeric-literal guard (`citations.test.ts §4`) scans
  `readdirSync(src/core)` ONLY — it never walks `src/shell`, so the new dot-table literals cannot trip it
  (confirmed by rule-checker reading the guard). Every new `.MAC:NNNN` reference is a `//` line comment,
  not JSDoc — compliant even under the stricter core convention.
- **ROM-citation accuracy** — COMPLIANT. All line numbers (`5853/5925/5947/6073/6081/6105/6109/6131/6143/6167`,
  `W3DSUP.MAC:587/925/931/1221`) verified exact against the vendored source; all four dot arrays byte-faithful;
  the object↔table mapping (`LISTRT`/`DOTCOL`/`ENDFLG` trace: object 0→PLEAD, object 1→BMLEA) verified.
- **TypeScript checklist** — COMPLIANT. No `as any`/`as unknown`/`@ts-ignore`/`!`; `readonly` used correctly;
  `?? FLASH_SLOTS[0]` guard preserved; test imports from `src` not `dist`; `HPLEAD/VPLEAD` both len 23,
  `HBMLEA/VBMLEA` both len 13 so `zipDots`'s `v[i]` never reads past the shorter array.
- **Test non-vacuity** — COMPLIANT. test-analyzer differentially verified: the 7 AC assertions FAIL against
  the real pre-story placeholder and PASS now; thresholds (bomber ≥12 vs 13 actual, satellite ≥8 vs 23)
  sit strictly between 1 and the true counts.

### Observations

- `[VERIFIED]` Core/shell boundary intact — evidence: `git diff --name-only` shows only `src/shell` + `tests`; purity 29/29. Complies with the CLAUDE.md core-purity rule.
- `[VERIFIED]` AC1 disc→flash-tip — evidence: `render.ts:184` `ctx.fillStyle = missileTip` (was `hue(SLOT.ICBMS)` disc); `missileTip` derives from `FLASH_SLOTS` (`render.ts:167`). Trail body stays `hue(SLOT.ICBMS)` (`render.ts:179`). Matches AC1.
- `[VERIFIED]` DRY tip unification — evidence: single `missileTip`/`tipR` at `render.ts:167-168` reused at `:184` (ICBM) and `:221` (ABM); removed duplicate `abmTip`; suite green.
- `[VERIFIED][TEST]` Silhouette guards non-vacuous — evidence: test-analyzer differential run (7 fail on placeholder, pass now); bomber=13/satellite=23 dots all inside the r=22 window.
- `[MEDIUM][DOC][RULE]` **F1 — false, load-bearing "symmetric" comment** at `stamps.ts:123` ("H+V symmetric (no mirror)") and `render.ts:194` ("the satellite is symmetric"). Set-comparison (mine + comment-analyzer + rule-checker) proves 6 of 23 dots — `(3,3),(3,2),(3,-2),(3,-3),(1,4),(1,-4)` — have no `(-dh,dv)` partner: the satellite is V-symmetric ONLY, H-asymmetric (front-weighted). This directly contradicts the module header two lines up ("directional, front-weighted, not a filled body").
- `[MEDIUM][RULE][TEST]` **F2 — satellite not mirrored when facing left** at `render.ts:199` (`mirror = variant==='bomber' && dir<0`). OUTLST's `EOR PLAVEL` mirror (`W3MAIN.MAC:5997-5999`) is UNCONDITIONAL per object, so the ROM mirrors the satellite too; because its dot-list is H-asymmetric, a left-flying satellite (a reachable state — `spawnSputnik` picks direction independent of variant) renders BACKWARD. Untested: every mc12-2 test uses `dir:1`.
- `[LOW]` bomber mirror uses `-dh`; the ROM's `EOR 0xFF` is exactly `-dh-1` (a 1px horizontal shift when facing left). Sub-pixel fidelity — route to mc12-4's screenshot, not blocking.
- `[LOW][TEST]` `render-battle.test.ts:399-401` `icbmSection` slice ends at `state.sputniks`, so it over-includes the preceding "Enemy planes" comment. No false pass today (that block never names `FLASH_SLOTS`/`abmTip`); tighten the end-anchor if touched again.

### Devil's Advocate

Assume this render is broken. The most dangerous move here is the one the author already half-made: directional
mirroring. The diff proudly adds a `mirror` flag — but scopes it to `variant === 'bomber'` on the strength of a
comment that says the satellite is "H+V symmetric (no mirror)". That comment is not a harmless nicety; it is the
*justification* for a branch that silently renders one of the two enemy types backward whenever it flies leftward.
A confused future maintainer reading `render.ts:194` would conclude the satellite is symmetric and never think to
mirror it — the false comment actively defends the bug from being noticed. That is the worst kind of documentation:
wrong AND load-bearing. Worse, nothing tests the mirrored path at all — a stray sign flip (`-dv` instead of `-dh`,
or dropping the branch) sails through 1434 green tests, because every fixture is `dir:1`. A malicious or merely
unlucky wave that spawns a leftward satellite gets a backward sprite, and the only guard is a screenshot story that
hasn't run yet. What about the ICBM change? If `FLASH_SLOTS` were ever empty, `?? FLASH_SLOTS[0]` would yield
`undefined` → `hue(undefined)` → a crash; but that array is a fixed palette constant, so unreachable — VERIFIED, not
a finding. Could the dot loop overrun? `zipDots` reads `v[i]` for `i` over the H array; if the two arrays ever
desynced in length a trailing `undefined` dv would poison a dot — but both pairs are equal length (23/23, 13/13),
VERIFIED. Could a huge `pos.h/pos.v` push dots off-canvas? `project()` clamps nothing, but that is pre-existing
behaviour shared with every other entity and out of scope. The real, actionable rot is F1+F2: a false fidelity claim
guarding an untested backward-facing entity, in a story whose entire purpose is fidelity. That is not shippable as-is.

## Reviewer Assessment

**Verdict:** APPROVED

**Rework verified (round 1 of max 3).** Both REJECT findings are fixed and re-verified; no new issues.

- **F1 (false comment) — FIXED.** `[DOC]` (comment-analyzer) + `[RULE]` (rule-checker, TS checklist #17):
  `stamps.ts:122-129` and `render.ts:190-200` now state the satellite is V-mirror symmetric ONLY,
  H-asymmetric (6/23 fuselage dots unmirrored), and mirrors when facing left — matching the module header
  and the actual dot data. Grep confirms no surviving "H+V symmetric" / "the satellite is symmetric" claim.
- **F2 (satellite faces backward) — FIXED.** `[RULE]` (rule-checker: ROM `EOR PLAVEL` fidelity) + `[TEST]`
  (test-analyzer: untested mirror branch): `render.ts:202` is now `const mirror = plane.dir < 0` (both
  variants), matching OUTLST's unconditional `EOR PLAVEL` (W3MAIN.MAC:5997). A `dir:-1` regression test
  (`render-battle.test.ts`, `it.each(['bomber','satellite'])`) closes the `[TEST]` coverage gap for EACH variant.
- **Non-vacuity of the new test — differentially proven:** restoring the old bomber-only mirror makes the
  SATELLITE arm redden (bomber arm passes), confirming the test catches exactly F2, not a tautology.
- **Regression sweep:** full missile-command suite 1436/1436 green (was 1434 + the 2 new mirror cases),
  `npm run lint` (tsc) clean, `build-app.mjs` clean. Shell-only; `purity.test.ts` 29/29 — core untouched.

**Data flow traced:** `state.sputniks[i]` (core, `{pos,dir,variant}`) → render selects `BOMBER_DOTS`/`SATELLITE_DOTS`,
mirrors dh when `dir<0`, projects each dot via `project()`, paints in the enemy hue — safe: read-only over core data,
no mutation, arrays fixed-length so no index overrun.

**Pattern observed:** authentic ROM dot-list transcription beside `CITY_STAMPS` in `stamps.ts`, reusing the
city `pw`/`ph` stamp-pixel sizing and the shared `project()` — consistent with the mc9-1 city-stamp idiom.

**Non-blocking (routed, unchanged):** the `-dh` vs ROM `-dh-1` (EOR 0xFF) 1px mirror offset → mc12-4 screenshot;
the leading-edge-contour-vs-swept-body fidelity question → mc12-4 (Dev deviation 2, accepted); the `icbmSection`
slice end-anchor imprecision (LOW, no false pass today) → tighten if the section is next touched. Filed below.

**Everything else — core/shell boundary, purity, citations-gate scope, shell-data purity, byte-exact ROM
transcription, the TS checklist, and test non-vacuity — is confirmed compliant** by the three specialists
(round 1) plus my direct re-verification of the rework.

**Handoff:** To SM for finish-story.