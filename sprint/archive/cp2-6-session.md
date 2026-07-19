---
story_id: "cp2-6"
jira_key: "cp2-6"
epic: "cp2"
workflow: "tdd"
---
# Story cp2-6: Gun/shot vertical is drawn through the collision cell — six 8px rows instead of pixel resolution; add gunScreenY mirroring gunScreenX

## Story Details
- **ID:** cp2-6
- **Jira Key:** cp2-6
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** fix/cp2-6-gun-vertical-pixel-render
- **Branch Strategy:** gitflow (fix/cp2-6-gun-vertical-pixel-render)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T10:08:53Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T09:33:52.254231+00:00 | 2026-07-19T09:35:01Z | 1m 8s |
| red | 2026-07-19T09:35:01Z | 2026-07-19T09:46:10Z | 11m 9s |
| green | 2026-07-19T09:46:10Z | 2026-07-19T09:55:42Z | 9m 32s |
| review | 2026-07-19T09:55:42Z | 2026-07-19T10:08:53Z | 13m 11s |
| finish | 2026-07-19T10:08:53Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): cp2-7's `gunScreenX` (horizontal) and this story's `gunScreenY` (vertical) now form the COMPLETE pixel-accurate sprite-placement pair — both re-derive pixel resolution from the OBSTAC cell + sub-cell offset and both centre the rotated gun/shot sprite on the collision cell. Once cp2-6 lands, a future cleanup could fold them into one `spritePlacement(h,v)` helper. Affects `src/shell/layout.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking): the recording-ctx render harness (`makeRecorder`) is now duplicated near-verbatim in `tests/hitbox-alignment.test.ts` (cp2-7, captures dx/dw) and `tests/gun-vertical.test.ts` (cp2-6, captures dx/dy/dw/dh). A shared `tests/helpers/recorder.ts` would remove the duplication; left inline for now (disjoint stories, no test infra yet). Affects the tests dir. *Found by TEA during test design.*
- **Question** (non-blocking, for Dev): confirmed no existing test pins the current cell-snapped vertical draw (grep of all 26 baseline files: `cellScreenY(obstacleCell(...).v)` has zero test pins) — so the fix is low-risk exactly as the SM/context predicted; the two `render.ts` gun/shot draw sites (`cellScreenY(gunRow)` / `cellScreenY(shotRow)`) are the ONLY consumers to re-point at `gunScreenY`. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): confirms TEA's finding — `gunScreenX` (cp2-7) and `gunScreenY` (cp2-6) are now structurally identical mirrors (same OBSTAC-cell + sub-cell-offset + sprite-half-width composition, one per axis). A future `spritePlacement(h,v)` fold-together is a reasonable cleanup candidate but out of scope here (no test demands it). Affects `src/shell/layout.ts`. *Found by Dev during implementation.*
- No blocking upstream findings during implementation.

### Reviewer (code review)
- **Improvement** (non-blocking): the live shot's rendered `v` is UNCLAMPED (unlike gun `v∈[0x08,0x30]`) and `stepShot` re-arms on the pre-advance `v`, so one `+SHOT_SPEED(7)` overshoot past `SHOT_OFFTOP(0xf3)` commits and renders — max rendered live `shot.v` = 249 → `gunScreenY(249) = 247−249 = −2`, clipping the top 1–2px of the 8px SHOT sprite for one frame as it exits the top edge. This is pixel-accurate, CORRECT top-exit behaviour (a clamp would reintroduce the plateau bug cp2-6 removes and violate AC-1), so it is NOT a defect — but a future story could add an explicit test asserting the top-exit clips (never plateaus/NaNs) to document the intent. Affects `tests/gun-vertical.test.ts` (shot walk stops at `0x80`, leaving `v∈[0x81,0xf9]` untested). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

None

### Dev (implementation)
- No deviations from spec.

## Sm Assessment

**Setup complete, ready for RED.** cp2-6 (2pt bug, tdd) — user-reported vertical grid-step:
gun/shot screen-Y routed through the collision cell (six 8px rows) instead of pixel PLAYV.
Fix design (investigated in cp2-2's session): pixel-accurate gunScreenY in layout.ts,
consumed at the gun/shot draws; ROM authority PS-2/PS-8 (slot 15 draws at full pixel PLAYV).

- **Branch:** `fix/cp2-6-gun-vertical-pixel-render` off origin/develop (cp2-4 tip).
- **Freshness fences in context:** cp2-7 moved gunScreenX to h−16 with strict draw-path pins
  (must stay green; mirror its centering philosophy vertically as geometry demands);
  diagnosis line numbers may have drifted — relocate by content.
- **Scope fence:** vertical draw path only; horizontal + OBSTAC/core settled.
- **Jira:** skipped — none on this project.
- **Mode:** peloton subagent mode — tea/reviewer→opus, dev→sonnet; merges user-authorized.

## Tea Assessment

**Tests Required:** Yes — a user-reported vertical grid-step; the fix is render-side and
must be pinned against the pixel-accurate mapping so the draw cannot silently re-route
through the collision cell again.

**RED commit:** `bad19f2` on `fix/cp2-6-gun-vertical-pixel-render` (off `8934a2f` = cp2-4 tip).
Working tree clean; NO implementation written; NO cited file touched (gate stays 177/177).

### Root cause (hand-derived, then swept over the whole PLAYV band)
The COLLISION is already faithful. `render.ts` draws the gun/shot vertical through the
collision cell: `cellScreenY(obstacleCell(h,v).v)` where `obstacleCell(h,v).v =
(v + OBSTAC_ROW_ROUND) >> 3 = (v+4)>>3` (PS-16, round-to-nearest — mushroom lookups only).
Across the ROM-faithful ~40px band (PLAYV `0x08..0x30`, PS-5/6) `(v+4)>>3` takes only SIX
values `{1..6}`, so the sprite snaps to six 8px rows (screen-Y ∈ `{240,232,224,216,208,200}` —
swept, exactly six). Horizontal escaped this because `gunScreenX` rebuilds pixel resolution
from the OBSTAC column + sub-cell offset; there is no `gunScreenY` counterpart. ROM authority:
the gun is motion-object slot 15 drawn at FULL pixel PLAYV (PS-2/8) — vertical must be
pixel-accurate.

### The hand-derived vertical anchor (unique mirror of cp2-7's horizontal)
cp2-7 centres the `SPRITE_H`(16)-wide sprite so its CENTRE is the pixel-accurate anchor `h-8`,
inside the collision column's tile at offset `7-((0xF7-h)&7)`. The bottom-referenced vertical
mirror for the `SPRITE_W`(8)-tall rotated sprite:

    centreY(v) = LOGICAL_H - OBSTAC_ROW_ROUND - 1 - v        = 251 - v
    blit-Y(v)  = centreY(v) - SPRITE_W/2                     = 247 - v
               = cellScreenY((v+4)>>3) + (7-((v+4)&7)) - SPRITE_W/2   (structured mirror)

`251` is the UNIQUE integer constant whose centre stays strictly inside the collision ROW tile
`[cellScreenY((v+4)>>3), +TILE_H)` for EVERY `v` (requiring centre ∈ tile for all
`r=(v+4)&7 ∈ [0,7]` forces the constant into `[251,252)`). Verified by exhaustive sweep:
monotonic `-1`px per `+1`v (no plateaus), centre-in-collision-tile for all v, and the
structured form `== 247-v` for all v in `[0,0xf7]`.

### Test file (1 new, 9 tests) — `tests/gun-vertical.test.ts`, all via the render() draw path
- **AC-1 gun (RED×2):** walk `player.v` one pixel across the whole PLAYV band and assert the
  rendered gun Y rises by exactly 1px/step (no 8px plateaus); assert the drawn gun CENTRE ==
  `251-v` at every v. Driven through real `render()` + a recording ctx (dx/dy/dw/dh).
- **AC-1 shot (RED×2):** same monotonic + exact-centre pins for a LIVE shot walked across its
  flight band (`PLAYV_MIN..0x80`).
- **Independence (RED×1):** two gun v's in the SAME collision row collide identically
  (`obstacleCell` equal) yet must DRAW 1px apart — the bug draws both at one Y.
- **Guards (GREEN×4, must stay green):** the collision band is still exactly six rows (cell
  count unchanged); the drawn gun centre stays inside its collision-row tile (alignment
  preserved); `gunScreenX` X is constant as v varies and `== gunScreenX(h)`, sprite footprint
  `SPRITE_H`×`SPRITE_W` unchanged (horizontal untouched); `obstacleCell.v == (v+4)>>3`
  round-to-nearest is UNTOUCHED (AC-2, PS-16/17).

**Tests Written:** 9 (5 RED + 4 green guards). **Status:** RED.
- Isolated file: `5 failed | 4 passed (9)`. Full suite: `Test Files 1 failed | 26 passed (27)`,
  `Tests 5 failed | 349 passed (354)` — the one failed file is the new one; all 26 baseline
  files (incl. `sign-chain`, `layout`, `render`, `hitbox-alignment`, `gun-block`) stay green.
- `npm run build`: **clean** (`tsc --noEmit && vite build`) — no unused imports, no missing
  symbols (all imports exist today; the fix is pinned via `render()`, not a not-yet-existent
  `gunScreenY` import). `check-citations`: **177/177**.

### The Dev contract (build in GREEN — render side ONLY)
1. Add `gunScreenY(v: number): number` to `src/shell/layout.ts`, mirroring `gunScreenX`'s
   philosophy — pixel-accurate, bottom-referenced. Closed form: **`247 - v`**. Recommended
   structured form (self-documenting, uses the same constants as the collision + `gunScreenX`):

        export function gunScreenY(v: number): number {
          const vv = v + OBSTAC_ROW_ROUND        // v + 4 (round-to-nearest bias, matches collision)
          const row = vv >> 3                     // = (v+4)>>3 = collision row
          const subCell = 7 - (vv & 7)            // pixel offset within the cell (mirrors gunScreenX)
          return cellScreenY(row) + subCell - SPRITE_W / 2
        }

   (`SPRITE_W` is imported from `../core/pictures`; `OBSTAC_ROW_ROUND` from `../core/player`
   re-export or `../core/playfield`. Any form returning `247 - v` passes the pins.)
2. Consume it at BOTH `render.ts` draw sites — replace `cellScreenY(gunRow)` (gun) and
   `cellScreenY(shotRow)` (shot) with `gunScreenY(state.player.v)` / `gunScreenY(state.shot.v)`.
   The `gunRow`/`shotRow` locals (and their `obstacleCell(...).v` calls) then become dead — drop
   them so `tsc --noEmit` stays clean (the cp2-7 unused-symbol RED lesson).
3. Do NOT touch `obstacleCell`/`obstacleCellFor`/OBSTAC constants or `cellScreenY` itself, and
   do NOT touch `gunScreenX` / the horizontal path (cp2-7). No new claims entry (no new ROM fact —
   derived from PS-2/8 + PS-16 + the geometric mirror of cp2-7). Expect all baseline tests +
   `sign-chain` + `hitbox-alignment` to stay green.

### Rule Coverage (AC → tests)
| AC | Requirement | Tests |
|---|---|---|
| AC-1 | pixel-accurate vertical (no 8px plateaus) for gun AND live shot; `gunScreenX` unchanged | gun monotonic+centre (2) + shot monotonic+centre (2) + independence (1) + gunScreenX guard (1) |
| AC-2 | OBSTAC `(v+4)>>3` collision mapping UNCHANGED; core files untouched; citations 177 green | AC-2 guard (1) + centre-in-collision-tile guard (1); citations run 177/177 |
| AC-3 | human/screenshot verification from THIS checkout | Dev artifact — noted, NOT attempted (port 5278) |

**Self-check:** every RED test drives the real `render()` and fails for the RIGHT reason
(cell-snapped Y / equal draws instead of pixel-accurate), with a self-describing message naming
the offending v and pixel value; the 4 guards are green-by-design (pin no-regression, not
vacuous); no harness/import errors; build verified clean.

**Handoff:** To Dev (Julia) for GREEN — add `gunScreenY`, re-point the two `render.ts` draws,
drop the dead cell-row locals.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/shell/layout.ts` - added `gunScreenY(v)` (247-v, structured form per TEA's contract:
  `cellScreenY((v+OBSTAC_ROW_ROUND)>>3) + (7-((v+OBSTAC_ROW_ROUND)&7)) - SPRITE_W/2`), imports
  `SPRITE_W` and `OBSTAC_ROW_ROUND`.
- `src/shell/render.ts` - both draw sites (gun, live shot) re-pointed from
  `cellScreenY(obstacleCell(...).v)` to `gunScreenY(state.player.v)` / `gunScreenY(state.shot.v)`;
  dropped the dead `gunRow`/`shotRow` locals and the now-unused `obstacleCell` import
  (`noUnusedLocals` clean).
- `docs/rom-study/cp2-6-vertical-pixel-render.png` - AC-3 visual artifact: before/after crop from
  the port-5288 dev server (confirmed via `lsof` cwd = this checkout) showing the gun sprite before
  (v=0x08) and after an ~80ms held ArrowUp (v shifted ~19px — measured from canvas pixel data at
  4x integer scale, confirmed non-multiple-of-8, i.e. not landing on the old six-row grid).

**Contract fidelity:** implemented exactly as TEA's Dev contract specified — no OBSTAC/
obstacleCell/cellScreenY/gunScreenX/core changes, no new ROM claim (pure geometric mirror of
cp2-7, PS-2/8 + PS-16 authority already cited).

**Tests:** 354/354 passing (GREEN) — the 5 previously-RED tests in `tests/gun-vertical.test.ts`
now pass, all 349 baseline tests (incl. `sign-chain`, `hitbox-alignment`, `gun-block`, `layout`,
`render`) stay green. Citations: 177/177 (`node tools/audit/check-citations.mjs`, unchanged —
no cited file touched). Build: clean (`npm run build` = `tsc --noEmit && vite build`, no unused
imports/locals).

**Branch:** `fix/cp2-6-gun-vertical-pixel-render` (pushed to origin, commit `d6debec`)

**Handoff:** To next phase (review)

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight (run inline by Reviewer) | Yes | clean | `npm test` 354/354, `check-citations` 177/177, `npm run build` clean; working tree clean; branch == origin; zero core diff | N/A — all green, personally observed |
| 2 | reviewer-edge-hunter | Yes | findings | Live shot max rendered v=249 → blit-Y −2 (top 1–2px clip for one frame on top-exit); gun fully on-canvas; no negative-operand/bitwise concern; no crash | DISMISSED as defect — CORRECT pixel-accurate edge clip; suggested `Math.max(0,…)` clamp would reintroduce the plateau bug + violate AC-1. Logged LOW/non-blocking. |
| 3 | reviewer-test-analyzer | Yes | findings | Shot walk stops at 0x80, top-exit band untested (HIGH); `expectedCentreY` is reduced form of impl not 2nd derivation (LOW); AC-2 pin re-derives shift (LOW) | Coverage gap DOWNGRADED to LOW/non-blocking (gunScreenY branchless-linear, proven over full domain); tautology nits are non-vacuous accepted pins. Logged as Delivery Finding. |
| 4 | reviewer-simplifier | Yes | findings | gunScreenX/gunScreenY structural mirror (LOW); structured form justified; dead code cleanly removed; no unused imports; not over/under-engineered | ACCEPTED as deliberate two-axis mirror, deferred `spritePlacement(h,v)` fold (matches TEA/Dev note). Non-blocking. |

**All received: Yes** (4/4 subagents returned; 0 Critical, 0 High, 0 Medium after Reviewer confirm/dismiss).

## Reviewer Assessment

**Verdict:** APPROVED

**Diff scope (personally observed):** 4 files — `src/shell/layout.ts` (+19/−2: new `gunScreenY`),
`src/shell/render.ts` (+6/−5: two draw sites re-pointed, dead `obstacleCell` import + `gunRow`/`shotRow`
locals dropped), `tests/gun-vertical.test.ts` (new, 255 lines), `docs/rom-study/cp2-6-vertical-pixel-render.png`.
**Zero `src/core/` diff** (`git diff --stat …-- src/core/` empty) — collision path genuinely untouched.
Branch off `8934a2f` (cp2-4 tip, correct base); local == `origin` (`d6debec`); no cp2-6 race in origin log.

**Geometry audit (re-derived independently, not taken from TEA):**
- `gunScreenY(v) = cellScreenY((v+4)>>3) + (7−((v+4)&7)) − SPRITE_W/2` reduces to **exactly `247 − v`
  for all v ≥ 0** — proven via the divmod identity `(vv>>3)*8 + (vv&7) == vv`. No piecewise divergence
  anywhere in `[0,0xf7]`, so the structured and closed forms are algebraically identical (not just on the band).
- **Monotonic, no off-by-one at the half-cell crossings:** spot-checked the two boundaries where the row
  index steps — v=3→4 (248→247? no: `gunScreenY(3)=244`, `gunScreenY(4)=243`, −1) and v=7→8 (240→239, −1).
  The row jump (0→1) is exactly cancelled by the subCell reset (0→7). Clean −1px/step throughout.
- **Centre `251 − v` is the UNIQUE integer** keeping the sprite centre in the collision-row tile: rem=0
  forces C∈[244,252), rem=7 forces C∈[251,259) → intersection {251}. Confirms TEA's derivation.
- **On-canvas:** gun clamped to v∈[0x08,0x30] → blit-Y∈{239,199}, sprite always fully within [0,256).

**The shot-at-high-v question (the one real adversarial finding — DISMISSED as correct, not a defect):**
The live shot's `v` is unclamped and `stepShot` re-arms on the pre-advance `v`, so one `+SHOT_SPEED(7)`
overshoot past `SHOT_OFFTOP(0xf3=243)` commits and renders. Exhaustive simulation over every seed
`player.v∈[0x08,0x30]` gives max rendered `shot.v = 249` → `gunScreenY(249) = −2`: the top 1–2px of the
8px SHOT sprite clip off the canvas for ONE frame as the shot exits the top. `drawImage` with negative
dest-y silently clips (no crash, no NaN — bounded at −2). This is **pixel-accurate, physically correct
top-exit behaviour**: the projectile is genuinely 2px above the visible field top (Y=0 ≡ v=247). The
edge-hunter's suggested `Math.max(0, 247−v)` clamp is REJECTED — it would force v=247/248/249 all to Y=0,
a 3-value plateau at the top, reintroducing the exact "steps on a grid" defect class this story removes and
violating AC-1. The OLD code's blit-Y=0 (row-31 floor saturation) was strictly LESS faithful (shot froze
fully-visible at the top edge). ROM motion objects clip at the raster boundary; the new code matches.

**Data flow traced:** `input (ArrowUp)` → `movePlayer` clamps `player.v` to `[0x08,0x30]` (core) →
`render()` → `gunScreenY(state.player.v)` → `blit` dest-y `247−v` → Canvas. Safe: input bounded by the
core clamp; the only unbounded feed (`shot.v`) is bounded by `SHOT_OFFTOP+SHOT_SPEED` → correct edge clip.

**Pattern observed:** `gunScreenY` (layout.ts:91) is the deliberate vertical mirror of `gunScreenX`
(layout.ts:72), anchored to the shared `OBSTAC_ROW_ROUND` constant rather than a magic 247 — good,
keeps the draw legibly coupled to the collision row it must stay inside.

**Error handling / no-regression:** only `tests/gun-vertical.test.ts` added — NO baseline test modified
(`git diff --name-only … -- tests/`). Baseline greens are unaffected, not weakened: no baseline test pins
the vertical DRAW-Y (grep confirms every `obstacleCell` reference is horizontal `.h` or core-collision `.v`;
`layout.test.ts`'s `f.dy` is the letterbox fit; its `cellScreenY` pins the unchanged helper). Citation gate
177/177 unaffected by design (no claim cites shell layout/render).

**Findings by severity:**

| Severity | Issue | Location | Disposition |
|----------|-------|----------|-------------|
| — | (none Critical/High/Medium) | — | — |
| [LOW] | Shot top-exit renders at blit-Y −1/−2 for one frame (v=248/249) | `render.ts:79` / `layout.ts:91` | CONFIRMED but CORRECT (pixel-accurate edge clip). Dismissed as defect; a clamp would regress AC-1. Non-blocking. |
| [LOW] | Shot test walk stops at `0x80`; top-exit band `v∈[0x81,0xf9]` untested | `gun-vertical.test.ts:199` | Non-blocking — `gunScreenY` is branchless-linear, proven correct over the whole domain; covered range + algebraic proof suffice. Logged as Delivery Finding for a follow-up. |
| [LOW] | `expectedCentreY` is the reduced form of the impl (not a 2nd derivation); AC-2 pin re-derives the shift expr | `gun-vertical.test.ts:130,248` | Non-vacuous (dh fixed independently at the call site); accepted-pattern regression pins. Doc nit only. |

**Verification personally observed:** `npm test` → **354/354** (27 files). `node tools/audit/check-citations.mjs`
→ **177/177** all verified. `npm run build` (`tsc --noEmit && vite build`) → **clean**, no unused imports/locals.
Screenshot `docs/rom-study/cp2-6-vertical-pixel-render.png` viewed: gun shifts ~19px (non-multiple-of-8) on an
~80ms ArrowUp hold — consistent with gunScreenY(8)=239→gunScreenY(27)=220 (Δ19), confirming pixel resolution.

**Deviation audit:** Design Deviations = "None" (Dev: "No deviations from spec"). Implementation matches
TEA's Dev contract exactly (structured `gunScreenY`, both draws re-pointed, dead locals dropped, no core
touch, no new claim). ACCEPTED — no undocumented deviations found.

**Handoff:** To SM for finish-story (PR opened against `develop`, NOT merged — human-authorized merge gate).