---
story_id: "mc10-1"
jira_key: "mc10-1"
epic: "mc10"
workflow: "tdd"
---
# Story mc10-1: Absolute-aim cursor

## Story Details
- **ID:** mc10-1
- **Jira Key:** mc10-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 2
- **Type:** bug

**Branch:** feat/mc10-1-absolute-aim-cursor
**PR:** https://github.com/slabgorb/arcade/pull/182

## Technical Specification

**Problem:** Missile Command's aim cursor is twitchy and never tracks the mouse accurately because:
- main.ts (line 42) feeds RELATIVE pointer `movementX`/`movementY` into the cursor
- No pointer lock is active
- 1 screen pixel = 1 cabinet unit across a ~2000px canvas
- This means ~256 units are stretched across the canvas, making the cursor ~8x twitchier than intended

**Solution:** Replace relative motion tracking with absolute canvas-position mapping:
1. Read clientX/clientY from mouse events
2. Convert canvas-relative coordinates to cabinet field coordinates via the inverse of `render.project`
3. Preserve the V-flip behavior (bottom-origin cabinet coords match top-origin canvas)
4. Clamp the result to field bounds

**Implementation Scope:**
- **Core (pure/deterministic):** Create `placeCursor(cursor, canvasX, canvasY, fieldSize)` in `plugins/missile-command/src/core/cursor.ts`
  - Inverse of render.project's mapping logic
  - Applies V-flip (matches render.project's flip)
  - Clamps to [0, fieldSize.x] × [0, fieldSize.y]
  - NO DOM/window references (purity test will scan source text)
  
- **Shell (render/input):** Update `plugins/missile-command/src/main.ts` (line 42)
  - Replace `applyPointerMotion(game.cursor, event.movementX, event.movementY)` with call to `placeCursor`
  - Extract canvas bounding rect and map clientX/clientY to canvas-relative coordinates
  - Pass scaled result to placeCursor

**Reference:**
- Current relative aim: `plugins/missile-command/src/main.ts:42`
- Existing cursor module: `plugins/missile-command/src/core/cursor.ts` (holds `applyPointerMotion`)
- Render mapping: `plugins/missile-command/src/shell/render.ts:50` (`render.project` — the function to invert)

## Acceptance Criteria

1. **Core function exists and passes unit tests:**
   - placeCursor(cursor, x, y, fieldSize) correctly maps canvas coords → cabinet coords
   - V-flip is preserved (cabinet y-axis is inverted relative to canvas)
   - Clamping at boundaries works for all four edges
   - Unit tests cover boundary cases: (0,0), (max,max), off-canvas negative, off-canvas beyond max

2. **Main.ts wiring is correct:**
   - Mouse move events call placeCursor with canvas-relative clientX/clientY
   - Canvas bounding rect is used to convert clientX/clientY to canvas-relative
   - Cursor position updates immediately without lag/twitchiness
   - Manual testing: cursor tracks the mouse smoothly at all canvas positions

3. **Purity gates pass:**
   - Core-boundary scan finds no DOM references (window/document/canvas) in `plugins/missile-command/src/core/cursor.ts`
   - Existing suite `vitest run --project missile-command` passes (all tests green)

4. **No other code affected:**
   - `applyPointerMotion` remains in cursor.ts for other potential uses (not removed, just not called from main.ts)
   - Palette, HUD, ground, aspect ratio (mc10-2..5) remain untouched

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-10T00:01:58Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-09T23:31:31Z | 2026-08-09T23:33:40Z | 2m 9s |
| red | 2026-08-09T23:33:40Z | 2026-08-09T23:40:33Z | 6m 53s |
| green | 2026-08-09T23:40:33Z | 2026-08-09T23:44:08Z | 3m 35s |
| review | 2026-08-09T23:44:08Z | 2026-08-10T00:01:58Z | 17m 50s |
| finish | 2026-08-10T00:01:58Z | - | - |

## Delivery Findings

No upstream findings

## Design Deviations

None yet

## Dev Assessment

**GREEN complete.** All 15 target tests pass; full `missile-command` project **1077/1077**, `purity` gate **29/29** (placeCursor is DOM-free core), `npm run lint` clean, `build-app missile-command` ok. Commit `4f36448c`.

### What I built (minimal, to the TEA contract)
- **`core/cursor.ts`**: added pure `placeCursor(x, y, width, height): Cursor` — `h=clamp((x/width)*LOGICAL_WIDTH, HMIN, HMAX)`, `v=clamp(LOGICAL_HEIGHT-(y/height)*LOGICAL_HEIGHT, VMIN, VMAX)`, the exact inverse of `render.project` with the V-flip. Added core constants `LOGICAL_WIDTH=0x100`, `LOGICAL_HEIGHT=222` (cabinet facts, cited; core owns them so the inverse never imports the shell). Reused the existing `clamp` and HMIN/HMAX/VMIN/VMAX.
- **`main.ts`**: pointermove now maps `clientX/clientY` (made canvas-relative via `getBoundingClientRect()`) through `placeCursor(relX, relY, rect.width, rect.height)`. Dropped the `applyPointerMotion` import (kept `fireOrStart`). `moveCursor`/`applyPointerMotion` remain defined (AC4).

### Notes for the Reviewer
- **Divisor choice = `rect.width/height` (CSS px), deliberately.** `placeCursor` normalizes position as a *fraction* of the canvas, so it inverts `project` regardless of devicePixelRatio or the per-frame `canvas.width=clientWidth` buffer sizing — the fraction is identical in CSS-px and buffer-px space. Using the same rect the pointer is measured in keeps it self-consistent and avoids a rect-vs-buffer mismatch.
- **Float exactness**: verified the interior test points ((100,100,256,222)→122, (200,300,512,666)→122, etc.) are IEEE754-exact, so no rounding was added (minimalist). Cabinet cursor stays a plain number as `moveCursor` already did.
- **Comment-scan trap**: the AC2 test scans main.ts source text; an early comment literally containing "movementX/movementY" reddened it. Reworded the comment (no behavior change) — flagging so it's not re-introduced.
- **`LOGICAL_WIDTH/HEIGHT` duplicated** in core and render.ts by design (core-can't-import-shell). `place-cursor.test.ts`'s "source ground truth" anchor reddens if render.ts's basis ever drifts from core's.

## Reviewer Assessment

**Verdict: APPROVED** (after in-review remediation, commit `9a1e023a`).

**What was reviewed:** the mc10-1 diff vs `origin/develop` — `placeCursor` in `core/cursor.ts` (pure inverse of `render.project`, V-flip + clamp), the `main.ts` pointermove rewiring, and `place-cursor.test.ts`. 4 enabled specialist subagents ran; the 5 disabled ones I analyzed directly and confirmed with a mutation battery.

Four legitimate findings surfaced; **all four were remediated in-review and re-verified** (missile-command 1078/1078, citations gate 151/151, lint clean, and a fresh mutation battery re-run). No finding was dismissed.

### Findings & disposition
- `[TEST]` `[EDGE]` `[SILENT]` — **rules 15/25 vacuous wiring asserts** (place-cursor.test.ts:216,221-223): `toMatch(/placeCursor/)`, `/clientX/`, `/clientY/` matched my own comment PROSE, not code — test-analyzer PROVED it by replacing the handler with a no-op (comment intact) and 4/5 AC2 checks still passed. **CONFIRMED → FIXED**: anchored to code shapes (`cursor:\s*placeCursor\(`, `event\.clientX/Y`, `canvas\.getBoundingClientRect\(\)`). Re-ran the same no-op mutation: the two AC2 tests now FAIL on the mutant, pass on real code.
- `[EDGE]` `[SILENT]` `[RULE]` — **rule 21 NaN on degenerate canvas** (cursor.ts): `0/0` → NaN, and `clamp` lets NaN through both comparisons, so a 0-size canvas could return `{h: NaN}`, breaking the `Cursor` `[HMIN,HMAX]×[VMIN,VMAX]` invariant. Flagged independently by me, test-analyzer, and rule-checker. **CONFIRMED → FIXED**: divisor guarded (fraction falls back to 0 when width/height≤0); result always finite and in range. + guard test.
- `[DOC]` — **misleading main.ts comment** claimed "DPR and buffer scaling cancel," but no `devicePixelRatio` exists anywhere in the plugin. **CONFIRMED → FIXED**: reworded to the real invariant (the frame loop keeps `canvas.width/height == clientWidth/clientHeight`, so rect size == the buffer size `project` used). *Challenged:* rule-checker's rule 17 called this comment "compliant on inspection" (scale-invariance argument); I side with comment-analyzer — naming a DPR mechanism that isn't present misleads a reader — and reworded rather than dismissing.
- `[RULE]` — **rule 29 un-cited `LOGICAL_WIDTH = 0x100`** in core: the AC3 citations gate passes only coincidentally (256 exists via the unrelated ICBM-speed-scale claim), and the literal named no W3COMN line unlike its siblings. **CONFIRMED → PARTIAL FIX + FILED**: no honest single-line ROM cite exists for 256 (verified: no width/screen constant in W3COMN.MAC — it is 2^8, the 8-bit H byte-space size), so I documented it honestly as STRUCTURAL in the JSDoc, and filed the deeper gate weakness (global value-membership vs symbol-anchored citation) as **mc10-6** (chore, 3pt). Downgraded to non-blocking: gate is green, value is structural, resolution is a cross-cutting citations-gate change, not this aim fix.

### Reviewer-verified (with rule citations)
- `[VERIFIED]` **placeCursor is pure core** — `cursor.ts:71-93`, no DOM/clock/entropy/shell import; `purity.test.ts` src/core sweep green (29/29). Complies with the CLAUDE.md core/shell purity rule.
- `[VERIFIED]` **DOM work confined to the shell** — `getBoundingClientRect`/`clientX/Y` only in `main.ts:48-52`, passed as plain numbers into core. Complies with the same purity rule.
- `[VERIFIED]` **`.js` ESM import extension** — `main.ts:11 import { placeCursor } from './core/cursor.js'`. Complies with typescript.md #5.
- `[VERIFIED]` **AC4 retirement scope** — `applyPointerMotion` (input.ts:40) and `moveCursor` (cursor.ts) retained, only the main.ts call dropped. Complies with typescript.md #24 (retire only where the AC names it).
- `[VERIFIED]` **tests are discriminating (mutation-proven)** — my battery killed: V-flip (6), h-clamp (3), clamp-bounds (5), width/height-scale (1 each); and post-fix the no-op wiring mutant fails 2 AC2 tests. Complies with typescript.md #8/#15/#25 test-quality. `[TYPE]`/`[SEC]`/`[SIMPLE]`: placeCursor's 4 positional `number` args mirror `project(pos,width,height)` (acceptable, consistent); pure client-side geometry (no injection/auth/secret surface); minimal, no dead code.

### Rule Compliance
**Rule: src/core purity — no DOM/clock/entropy/shell import (CLAUDE.md)**
- `placeCursor` (cursor.ts:81-93) — compliant (pure arithmetic; purity gate green)
- `LOGICAL_WIDTH`/`LOGICAL_HEIGHT` (cursor.ts:57,64) — compliant (plain numeric constants)
- `main.ts` DOM access (getBoundingClientRect/clientX/Y) (main.ts:48-52) — compliant (in the shell, not core)

**Rule: .js extension on relative ESM imports (typescript.md #5)**
- `main.ts:11` placeCursor import — compliant; `input.ts:13` fireOrStart — compliant; test CURSOR_SPECIFIER — compliant

**Rule: readonly / no mutation of returned data (typescript.md #2)**
- `Cursor` (readonly h/v), `placeCursor` returns a fresh object — compliant

**Rule: no `as any` / `@ts-ignore` / unsafe non-null (typescript.md #1)**
- cursor.ts, main.ts, place-cursor.test.ts — compliant (none present)

**Rule: degenerate numeric input reaching geometric code (typescript.md #21)**
- `placeCursor` divisor — WAS violation (NaN via 0/0) → FIXED (guarded), now compliant

**Rule: source-text guard must anchor to the claim, not a bare token (typescript.md #15/#25)**
- AC2 wiring asserts (place-cursor.test.ts:216,221-223) — WAS violation (matched prose) → FIXED (anchored to code), now compliant
- negative movementX/movementY guard (place-cursor.test.ts:211-212) — compliant (negative whole-file guard is the safe case)

**Rule: mc citation convention — core numeric literals backed by a real claim**
- `LOGICAL_HEIGHT = 222` — compliant (MC-TOPSCR, W3COMN.MAC:107)
- `LOGICAL_WIDTH = 0x100` — gate-green but coincidental; documented structural + filed mc10-6 (see above)

## Subagent Results

| Subagent | Received | Decision |
|----------|----------|----------|
| reviewer-preflight | Yes | N/A — green (1552 tests, lint pass, 0 smells) |
| reviewer-edge-hunter | Skipped (disabled) | reviewer-analyzed: confirmed 1 (NaN 0-size) → fixed |
| reviewer-silent-failure-hunter | Skipped (disabled) | reviewer-analyzed: confirmed 1 (silent NaN, same site) → fixed |
| reviewer-test-analyzer | Yes | confirmed 3 (2 vacuous-wiring, 1 NaN) → 3 fixed |
| reviewer-comment-analyzer | Yes | confirmed 1 (DPR comment) → fixed |
| reviewer-type-design | Skipped (disabled) | reviewer-analyzed: 0 (positional args mirror project(), acceptable) |
| reviewer-security | Skipped (disabled) | reviewer-analyzed: 0 (pure client geometry, no attack surface) |
| reviewer-simplifier | Skipped (disabled) | reviewer-analyzed: 0 (minimal, no dead code) |
| reviewer-rule-checker | Yes | confirmed 4 (rules 15,25,21,29) → 3 fixed, 1 (rule29) partial+filed mc10-6 |

**All received: Yes** (4 enabled received; 5 skipped via `workflow.reviewer_subagents` and covered by reviewer analysis + mutation battery).

## Tea Assessment

**RED complete — handing to Dev for GREEN.** 15 failing tests in `plugins/missile-command/tests/place-cursor.test.ts`, 2 green-by-design anchors; full mc project 1062 pass / 15 fail (only this file), `npm run lint` clean. Commit `f4af0549`.

### The contract Dev implements
Add a PURE `placeCursor(x, y, width, height): Cursor` to `plugins/missile-command/src/core/cursor.ts` — the exact inverse of `shell/render.ts::project(pos, width, height)`:
- `h = (x / width) * 256` then clamp to `[HMIN=8, HMAX=247]`
- `v = 222 - (y / height) * 222` (the **V-flip**) then clamp to `[VMIN=45, VMAX=206]`
- Logical basis: `LOGICAL_WIDTH=256 (0x100)`, `LOGICAL_HEIGHT=222 (TOPSCR, W3COMN.MAC:107)` — the same basis render.ts projects over. Reuse cursor.ts's existing HMIN/HMAX/VMIN/VMAX and its `clamp`.
- **Absolute**: result is a function of `(x, y, width, height)` alone — it takes NO prior cursor (that is the fix; relative motion is what made it twitchy).

Then rewire the shell (`src/main.ts` pointermove handler, ~line 41-43):
- Replace `applyPointerMotion(game.cursor, event.movementX, event.movementY)` with an absolute path: take the canvas rect (`getBoundingClientRect()`), make `clientX/clientY` canvas-relative, and feed them to `placeCursor(relX, relY, canvas.width|rect.width, canvas.height|rect.height)`.
- **Watch the width/height source**: `project` is called with the drawing-buffer `canvas.width/height` (set to `clientWidth/clientHeight` each frame). The pointer rect from `getBoundingClientRect()` is in CSS px. On this canvas they coincide (buffer sized to client size each frame), but if you scale `clientX` by `rect.width`, place with `rect.width`; keep the divisor consistent so the inverse stays exact.
- `applyPointerMotion` / `moveCursor` **stay defined** (AC4) — main.ts just stops calling `applyPointerMotion`.
- Import `placeCursor` from `../core/cursor.js` with the **`.js`** extension.

### Rule Coverage (TS lang-review + project rules)
- **Core/shell purity** (SOUL / `purity.test.ts`): placeCursor is pure arithmetic in `src/core` — no DOM/window/clock. Auto-swept by `purity.test.ts`; the shell rect/clientX work stays in main.ts.
- **`.js` ESM import extension** (typescript.md:48): pinned by the "imported with .js" wiring test (scoped to a `placeCursor` binding so it reddens until wired).
- **`readonly` params / no mutation** (typescript.md:26): placeCursor returns a fresh `Cursor`; the determinism test asserts a fresh object (`not.toBe`).
- **Meaningful assertions** (TEA self-check): every test asserts a concrete value or an inequality; no `assert(true)`/`is-*`-only/`let _ =`. Interior points are strictly inside the clamp so the raw mapping (not a clamp) is what's pinned.

### Traps flagged for Dev (do not silently trip)
1. **Do NOT drop the V-flip.** Canvas top (y=0) → cabinet `v=VMAX=206`; bottom (y=height) → `v=VMIN=45`. Getting this backwards passes nothing.
2. **Do NOT ignore width/height.** The 512×666 interior test fails any impl that hardcodes the unit canvas.
3. The `~8×/256/2000px` figures in the Technical Specification are motivation, not pinned — don't try to satisfy a twitchiness ratio.
4. Clamp is inclusive on all four edges and both off-canvas directions per the off-canvas tests.

## Sm Assessment

**Ready for RED (tea).** Title-only story; the title IS the spec, and SM verified each of its claims against the code before setup:
- `render.project` exists at `plugins/missile-command/src/shell/render.ts:50` and flips V (confirmed by the comment at :205). `placeCursor` is its inverse.
- `main.ts:42` currently does `applyPointerMotion(game.cursor, event.movementX, event.movementY)` — the relative aim to replace.
- `plugins/missile-command/src/core/cursor.ts` is the pure-core home for `placeCursor`; the core-boundary scan reads that file's source text, so no DOM/window references.

**Handoff notes for TEA (RED phase):**
- **Derive expected values from `project()`, do not re-derive its formula.** `render.ts` is a shell module but its erased `CanvasRenderingContext2D` types import fine under node/vitest — import the REAL `project` (or the shared scale it uses) and assert `placeCursor` is its exact inverse (round-trip `project(placeCursor(x,y)) ≈ (x,y)` within field-quantisation). A test that hand-copies the H-scale / V-flip constants can silently disagree with the renderer.
- **The "~8×/256-units/2000px" figures in the Technical Specification are SM's derived estimate, not a measured constant** — treat them as motivation, not an assertion to pin. Pin the mapping (inverse of project + V-flip + clamp), not the twitchiness ratio.
- **Clamp is part of the spec** — cover all four edges plus off-canvas negative and beyond-max in both axes.
- Leave `applyPointerMotion` in place (AC#4); if it becomes unreferenced, that's a dev/reviewer call, not a RED concern.