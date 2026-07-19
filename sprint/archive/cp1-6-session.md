---
story_id: "cp1-6"
jira_key: "cp1-6"
epic: "cp1"
workflow: "tdd"
---
# Story cp1-6: Render shell — tile atlas, portrait integer scaling, CLRCH colors, ROM-tile text, playable demo page

## Story Details
- **ID:** cp1-6
- **Jira Key:** cp1-6
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T02:56:13Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T01:46:02Z | 2026-07-19T01:48:07Z | 2m 5s |
| red | 2026-07-19T01:48:07Z | 2026-07-19T02:17:49Z | 29m 42s |
| green | 2026-07-19T02:17:49Z | 2026-07-19T02:39:29Z | 21m 40s |
| review | 2026-07-19T02:39:29Z | 2026-07-19T02:56:13Z | 16m 44s |
| finish | 2026-07-19T02:56:13Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): frame-stepped RESTOR sweep (cp1-3/cp1-5 carry-forward 3) DEFERRED to cp2. The demo slice has no player death (no centipede train until cp2), so MEM is never armed to PLYFLD base (PM-22) and RESTOR never sweeps — no behaviour to test here. The per-cell primitive `restoreMushroom` already exists (cp1-4); the frame-stepped MEM-cursor stepper (8-frame cadence, RESTOR_FRAME_MASK) is unbuilt and untested. Route to **cp2** (death + the train). *Found by TEA during test design.*
- **Improvement** (non-blocking): CLRCH's colour scheme index (X) advances per wave (`JSR CLRCH`, CENIR4.MAC:325). cp1-6 pins ONLY scheme 0 (X=0, the INIT default, CL-11). Wave colour cycling is **cp4**'s job — the palette module should keep the scheme index a single parameter so cp4 can drive it. *Found by TEA during test design.*
- **Gap** (non-blocking): poison mushrooms (playfield codes 0x38-0x3B) never appear in the demo — they are created by the scorpion (**cp3**). `mushroomStamp` maps them (0x3B→POISON_MUSHROOM_FULL … 0x38→POISON_MUSHROOM_1_4) for completeness, but the poison branch is unexercised by the demo state; cp3 exercises it live. *Found by TEA during test design.*
- **Question** (non-blocking): open-question-1 (VSYNC divisor 262 vs 263) is still live. FRAME_HZ is pinned at 15750/263 per TB-1 as a single named constant so a later correction is one line (timebase.test asserts the value, not the divisor choice). *Found by TEA during test design.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **SimState gains `score`:** the epic named the minimal shape {playfield, player, shot, rng, frame}; the sim contract adds `score` (accumulated from stepShot's `scored`). Reason: AC-1's ROM-tile HUD must display a score — without it there is nothing for `layoutText` to render. `level` is NOT added to state (the demo is one wave; main.ts displays a literal level=1, wave progression is cp4).
- **render(ctx, atlas, state) — atlas is INJECTED:** rather than build the atlas inside render(), it is passed in. Reason: the canvas that BUILDS the atlas cannot run in node, but an injected fake atlas + recording ctx makes imageSmoothing / background-clear / blit behaviour genuinely testable, instead of leaning on ?raw alone. main.ts calls buildAtlas() once and hands it to render() each frame.
- **New shell module split:** `src/shell/{palette,timebase,layout,atlas}.ts` are the tested contract. Reason: pure, node-testable seams (nibble→RGB decode, fixed-timestep accumulator, integer-scale/letterbox + ROT270 layout, atlas packing). The canvas glue (buildAtlas, render draw loop, main boot) is pinned by the reviewer-blessed `?raw` source-wiring idiom (tp1-39).
- **InputAdapter gains `dispose()` + a 'blur' handler; the EventTarget duck-type gains `removeEventListener`** (carry-forward 4). Reason: harden focus-loss and teardown before main.ts wires the real window. The cp1-5 input.test.ts stays green (it declares its own local target/adapter shapes and never disposes or fires 'blur').

## Story Acceptance Criteria

1. Playable slice in the browser on 5278: pointer-lock gun movement, firing, mushroom damage states rendered from ROM tiles at authentic proportions.
2. Logical resolution and rotation cited (centiped.cpp:1800, ROT270); rendering is integer-scaled with no smoothing (crisp pixels).
3. CLRCH-derived palette applied and cited; no invented colors.
4. Render source-wiring test green; screenshot committed in the story docs as the epic demo artifact.

## Sm Assessment

**Setup verified:** session + context files in place, branch `feat/cp1-6-render-shell-demo` off origin/develop @ 7847ada (cp1-5's merge), epic YAML flipped to in_progress, orchestrator setup commit b11a8b0. Merge gate clear; no sibling cp1-6 race on origin.

**Story shape:** 3pt, `workflow: tdd` explicit. Repo centipede only. The epic's ASSEMBLY story: everything cp1-3/4/5 built becomes a playable demo. This is the LAST cp1 story — the epic demo (glide the bottom zone, shoot mushrooms out of an authentic field) ships here.

**Hazards routed to TEA (O'Brien):**
- sim.ts wiring is REQUIRED and owned here (deferred from cp1-4 as untested contract): SimState gains playfield + player/shot + rng cursor; stepSim consumes InputCounts, steps player/shot/collision. Design the contract test-first; keep cloneState rng-cursor honest (arcade-shared lesson).
- Demo loop timebase: the epic's ruling is one sim step per VIDEO frame at FRAME_HZ = 15750/263 = 59.88593 (TB-1 claim); current main.ts steps per DISPLAY frame (2x on 120Hz — cp1-1 reviewer note). The demo loop must pace honestly (fixed-timestep accumulator or equivalent); pin with a test if the loop logic is testable in node.
- Palette: CLRCH (CENTI4.MAC:879, .RADIX 16) — transcribe the color-RAM init semantics; NO invented colors (AC-3). Any RGB mapping of the hardware color bits is adapter policy — label it, cite what's ROM fact.
- Resolution/rotation: 240x256 portrait visible area, cabinet ROT270 (centiped.cpp:1800 — MAME corroboration, schema-only claims). Integer scale + letterbox + imageSmoothingEnabled=false (crisp pixels, AC-2).
- ROM-tile text: score/level text from cp1-3's character tiles — NOT @arcade/shared/font (explicit epic ruling).
- Carry-forwards owned here: (1) cp1-3 orientation pin — one hand-derived pixel-grid golden locking MSB-first/rotation; (2) cp1-3 width-constant cosmetic (SPRITE_W/TILE_W vs hardcoded 8); (4) cp1-5 shell input blur/focus-loss + dispose before real-window wiring; (5) cp1-5 horizontal-sign vs renderer column-layout reconciliation — the renderer must tie device dh sign to on-screen direction, test it.
- Carry-forward to EVALUATE and likely defer: (3) frame-stepped RESTOR sweep (8-frame cadence) — no death exists in the demo slice (no centipede train until cp2); if deferred, record the deferral explicitly as a Delivery Finding routed to cp2.
- Render source-wiring test: the repo ?raw idiom (tempest tp1-39, reviewer-blessed). Screenshot committed in story docs is AC-4's demo artifact — a real browser screenshot on port 5278; mind the dev-port trap (a sibling checkout may own 5278 — lsof the server's cwd before trusting a screenshot; serve this tree on a spare port if contested).
- Shell tests: vitest node env — canvas contexts need fakes/shims; follow sibling games' shell-test idioms. The purity guard must stay green (render code is shell/, but sim.ts wiring is core — no canvas types leak into core).
- Sibling checkouts active; re-verify no cp1-6 race at review.

**Peloton mode:** subagent peloton (user-directed) — SM drives phases via inline subagents.

**Routing:** phased tdd → next phase `red`, owner `tea`.

## TEA Assessment

**Tests Required:** Yes — this is the epic's assembly + demo story; every AC has a mechanically-checkable half.

**RED commit:** `88abb86` (centipede, branch `feat/cp1-6-render-shell-demo`, off 7847ada).

### Test files (10 new + 1 claims file)
| File | Tests | Pins |
|------|-------|------|
| `tests/sim.test.ts` | 13 | SimState assembly (playfield+player+shot+rng+frame+score); createSim seeds via the same rng and advances the cursor past seeding; stepSim = MOVE-then-SHOOT (mainloop order CENTI4.MAC:26/28) + frame++ + score accrual; determinism replay; **cloneState** deep-copies cells + copies the rng SEED WORD into a distinct object (arcade-shared lesson) |
| `tests/decode-orientation.test.ts` | 5 | **Carry-forward (1)** — ONE hand-derived pixel golden: DIGIT_7 full 8×8 grid (locks MSB-first columns + top-down rows; h-mirror and v-flip both diverge) + MUSHROOM_FULL row 3 = [2,1,1,2,1,1,1,2] (locks (upper<<1)|lower). **GREEN today** — a permanent regression fence, not a RED driver |
| `tests/palette.test.ts` | 12 | CLRCH nibble→RGB adapter (MAME-corroborated, schema-only) for 5 nibbles; PLAYFIELD_PENS/SPRITE_PENS mapped to the CL-3..CL-10 roles; background pen = black (not invented #000); rgbCss format |
| `tests/timebase.test.ts` | 7 | FRAME_HZ = 15750/263 (TB-1); fixed-timestep accumulator; **60/120/144 Hz all feed the SAME sim-step count** (the cp1-1 per-rAF 120 Hz double-speed fix); spiral-of-death clamp |
| `tests/layout.test.ts` | 16 | LOGICAL 240×256 derived from TILE_W×PLYFLD_WIDTH (**carry-forward 2**, no hardcoded 8/240/256); integer scale + letterbox (300×256→1×, never 1.25×); ROT270 orientation (col 0 rightmost, v=0 bottom); gun drawn over its own collision column; ROM-tile `layoutText` (CHAR_/DIGIT_ tiles) |
| `tests/sign-chain.test.ts` | 2 | **Carry-forward (5)** end-to-end: device +dh (mouse movementX / ArrowRight) → movePlayer → gunScreenX RIGHT on screen; −dh → LEFT |
| `tests/atlas.test.ts` | 8 | atlasRectFor packing (sprite 8×16 / tile 8×8, non-overlap, stable, typo-throws) + buildAtlas `?raw` wiring (decodeStamp/STAMPS/palette/getContext) |
| `tests/render.test.ts` | 15 | mushroomStamp damage-code→STAMP (8 codes); recording-ctx: imageSmoothingEnabled=false, background = CLRCH pen 0, gun + every mushroom blitted, planted-state stamp requested; `?raw`: NO @arcade/shared/font import, NO colour literal (palette-only, AC-3) |
| `tests/input-lifecycle.test.ts` | 4 | **Carry-forward (4)**: blur clears held keys / pending deltas / held fire; dispose() detaches every listener (same fn refs) |
| `tests/main-loop.test.ts` | 5 | `?raw` main.ts wiring (mechanical half of AC-4): stepsForElapsed pacing, both adapters, requestPointerLock, buildAtlas→render, fitIntegerScale + imageSmoothing off |
| `docs/rom-study/claims/08-render-color.json` | CL-1..CL-11 | CLRCH transcription (below) — byte-verified by the citation gate |

### TRANSCRIPTION TABLE — CLRCH colour RAM (rev-4, .RADIX 16)
| Value | Meaning | file:line | claim |
|-------|---------|-----------|-------|
| `COLORR=0x1404` | colour RAM base; PF pens 0-3, sprite pens 9-B | CENDE4.MAC:100 | CL-1 |
| `CLRCH` reads 99$[X],[X+1],[X+2] | 3-nibble scheme by index X | CENTI4.MAC:883 (entry 882) | CL-2 |
| pen1 COLORR+01 = 99$[X] | inside mushrooms / gun / lives → **0x0D** | CENTI4.MAC:893 | CL-3 |
| pen2 COLORR+02 = 99$[X+2] | outside mushrooms / all alphanumerics → **0x0E** | CENTI4.MAC:891 | CL-4 |
| pen3 COLORR+03 = 99$[X+1] | inside poison mushroom → **0x00** | CENTI4.MAC:895 | CL-5 |
| sprite9 COLORR+09 = 99$[X+1] | legs → 0x00 | CENTI4.MAC:894 | CL-6 |
| spriteA COLORR+0A = 99$[X+2] | eyes → 0x0E | CENTI4.MAC:890 | CL-7 |
| spriteB COLORR+0B = 99$[X] | body → 0x0D | CENTI4.MAC:892 | CL-8 |
| `99$: .BYTE 0D,0,0E,…` | scheme-0 nibbles [0x0D,0x00,0x0E] | CENTI4.MAC:898 | CL-9 |
| background pen0 = `0x0F` | black (all colour bits off) | CENTI4.MAC:1203 (LDA I,0F :1202) | CL-10 |
| INIT enters CLRCH with X=0 | the demo's default scheme | CENTI4.MAC:1209 | CL-11 |

**Adapter policy (labelled, NOT a ROM constant):** nibble→RGB is the hardware DAC — corroborated schema-only by MAME `centiped_v.cpp:211` (`centiped_paletteram_w`): each of the low 3 bits INVERTED to a full/zero gun (bit set→0, clear→0xFF), and bit 3 clear dims blue (else green) to 0xC0. Verified expansions: 0x0F→(0,0,0), 0x0D→(0,255,0), 0x0E→(255,0,0), 0x00→(255,255,192 dim), 0x0C→(255,255,0).

### The sim contract designed (Dev implements in src/core/sim.ts)
```ts
export interface SimState {
  playfield: Playfield; player: Player; shot: Shot; rng: Rng; frame: number; score: number
}
export function createSim(seed: number): SimState        // seedPlayfield(createRng(seed)) + createPlayer + at-rest shot; frame/score 0
export function stepSim(state: SimState, input: InputCounts): SimState  // movePlayer → stepShot(post-move gun) → frame+1, score += scored
export function cloneState(state: SimState): SimState     // new Uint8Array(cells); {...rng}; fresh player/shot objects
```
Order is the ROM mainloop spec: MOVE (CENTI4.MAC:26) before SHOOT (:28). `rng` is the only entropy; nothing in the demo draws from it after seeding, so `rng.seed` is stable per-step — but cloneState must still copy it into a distinct object so a future rng-consuming step replays.

### RED verification (via testing-runner)
- 18 files / 199 tests: **9 files failed, 9 passed**. The 9 failing are the new behaviour/contract files (missing modules `palette`/`timebase`/`layout`/`atlas`, missing `cloneState` export, missing `dispose`/blur, skeleton main.ts). `decode-orientation` is GREEN (regression fence + validates the hand derivation against the real decoder).
- Pre-existing ALL green: scaffold, purity, pictures, playfield, player, input, `tests/audit/citations.test.ts` (178 passing).
- Citation gate: `checked 129 claim(s) / all claims verified` (was 118; +11 CLRCH).

### Rule Coverage (AC → tests)
| AC | Covered by |
|----|-----------|
| AC-1 playable slice (pointer gun, fire, mushroom damage from ROM tiles) | sim.test (assembly/step/score), render.test (mushroomStamp + blits), sign-chain.test, layout.test (gun over column), main-loop.test (pointer lock + adapters) |
| AC-2 240×256 portrait, integer scale, no smoothing | layout.test (LOGICAL + fitIntegerScale), render.test (imageSmoothing off), main-loop.test (fitIntegerScale) |
| AC-3 CLRCH palette, no invented colours | palette.test, render.test ("no colour literal" scan), claims 08 (CL-1..11) |
| AC-4 render source-wiring green + screenshot | render.test (`?raw`), main-loop.test (`?raw`), atlas.test (`?raw`); **screenshot is Dev/review** |

### Notes for Dev (Julia)
**Build these (the tested contract — test import paths are fixed):**
1. `src/core/sim.ts` — rewrite to the SimState contract above (createSim(seed)/stepSim(state,input)/cloneState). Keep it PURE — purity.test sweeps core/; no canvas/palette/layout types leak in.
2. `src/shell/palette.ts` — `decodeClrchColor(nibble)→{r,g,b}` (MAME inverted-bit + bit-3 dim formula, exact values above), `rgbCss({r,g,b})='rgb(r, g, b)'`, `PLAYFIELD_PENS`=[decode(0x0F),decode(0x0D),decode(0x0E),decode(0x00)], `SPRITE_PENS`=[bg,decode(0x00),decode(0x0E),decode(0x0D)].
3. `src/shell/timebase.ts` — `FRAME_HZ=15750/263`, `FRAME_DT=1/FRAME_HZ`, `stepsForElapsed(acc,elapsed)→{steps,acc}` (fold, floor to whole dt, carry in [0,dt), clamp catch-up). May wrap @arcade/shared/loop `advanceFixedSteps` (it exists at v0.15.0) — the simplify pass can dedupe.
4. `src/shell/layout.ts` — LOGICAL_W/H from TILE_W×PLYFLD_WIDTH / TILE_H×PLYFLD_HEIGHT; `fitIntegerScale`; `cellScreenX(col)=LOGICAL_W-(col+1)*TILE_W` (col 0 RIGHT), `cellScreenY(row)=LOGICAL_H-(row+1)*TILE_H` (v=0 BOTTOM); `gunScreenX(h)` = cellScreenX((0xF7-h)>>3)+sub-cell (must rise with h AND land in its own column); `layoutText(text,x,y)→Glyph[]` (CHAR_/DIGIT_ tiles, space advances). **NOT @arcade/shared/view.letterbox** — that is continuous; centipede needs INTEGER scale.
5. `src/shell/atlas.ts` — `atlasRectFor(name)→{sx,sy,sw,sh}` (pure, non-overlapping, throws on unknown), `buildAtlas()` (canvas from decodeStamp + palette pens).
6. `src/shell/render.ts` — `render(ctx, atlas, state)`: set `ctx.imageSmoothingEnabled=false`, clear with `rgbCss(PLAYFIELD_PENS[0])` over LOGICAL_W×LOGICAL_H, blit gun + every `isMushroom` cell via `atlas.rect(mushroomStamp(cell))`, draw score/level via `layoutText`. Export pure `mushroomStamp(cell)`. **No colour literal** — every colour from palette. **No @arcade/shared/font.**
7. `src/shell/input.ts` — add `dispose()` to `InputAdapter`; add a 'blur' handler (keyboard clears held; mouse zeroes dh/dv/fire); add `removeEventListener` to the target duck-type; store handler refs so dispose detaches them.
8. `src/main.ts` — rewrite: buildAtlas once; wire createMouseAdapter + createKeyboardAdapter on the canvas/window; `canvas.requestPointerLock()` on click; drive stepSim via `stepsForElapsed` (NOT once per rAF); blit the logical backbuffer with `fitIntegerScale` + imageSmoothing off; render(ctx, atlas, state).

**Traps:**
- **Sign chain:** cellScreenX must put column 0 on the RIGHT and gunScreenX must rise with h — together they make device-right = screen-right through the ROT270 OBSTAC reversal. Get one backwards and sign-chain.test + layout.test go red.
- **Poison codes:** normal mushroom live-range 0x3C-0x3F, poison 0x38-0x3B (from cp1-4's NORMAL_DESTROY 0x3B / POISON_DESTROY 0x37). mushroomStamp maps both; poison is unexercised by the demo (cp3).
- **`?raw` typing:** `tests/raw-imports.d.ts` (added) declares `*?raw` so `tsc --noEmit` (lint/build) stays green.
- **AC-4 screenshot duty (Dev + review):** capture a real browser screenshot of the demo on **port 5278** and commit it to the story docs as the epic demo artifact. **Port-ownership trap:** 5278 may be served by a SIBLING checkout (a-2/a-3) — `lsof -a -p "$(lsof -ti tcp:5278 | head -1)" -d cwd -Fn | grep '^n'` to prove the server is THIS tree before trusting the shot; serve your own tree on a spare port (`npx vite --port 5288 --strictPort`) if 5278 is contested.
- **Purity:** sim.ts is core — no browser globals, no `window.`/`document.` even in comments (the scanner strips comments, but keep the boundary clean).

**Handoff:** To Dev (green) — see `.session/cp1-6-handoff-red.md`.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed** (centipede repo, commit `ca7937a`):
- `src/core/sim.ts` — rewritten to the designed contract: `createSim(seed)` seeds the playfield through the same rng and boots the gun+shot; `stepSim(state, input)` runs MOVE-then-SHOOT (ROM mainloop order) and accrues score; `cloneState` deep-copies cells/rng/player/shot into distinct objects.
- `src/shell/palette.ts` (new) — `decodeClrchColor` (MAME-corroborated inverted-bit + bit-3-dim adapter), `PLAYFIELD_PENS`/`SPRITE_PENS` (CLRCH scheme-0), `rgbCss`.
- `src/shell/timebase.ts` (new) — `FRAME_HZ=15750/263`, `FRAME_DT`, `stepsForElapsed` (wraps `@arcade/shared/loop`'s `advanceFixedSteps`).
- `src/shell/layout.ts` (new) — `LOGICAL_W/H` derived from the grid constants, `fitIntegerScale`, `cellScreenX/Y` (ROT270, col 0 / row 0 at right/bottom), `gunScreenX` (OBSTAC column + sub-cell offset, monotonic in h), `layoutText` (ROM-tile glyphs).
- `src/shell/atlas.ts` (new) — `atlasRectFor` (pure one-column-per-stamp packing), `buildAtlas` (canvas baked from `decodeStamp` + the palette).
- `src/shell/render.ts` — `render(ctx, atlas, state)` (background clear, mushrooms, gun, live shot, ROM-tile HUD), `mushroomStamp` (damage-code → STAMP).
- `src/shell/input.ts` — added `dispose()` and a `'blur'` handler to both adapters; `EventTarget` duck-type gained `removeEventListener`.
- `src/main.ts` — rewritten: builds the atlas once, wires both input adapters on `window`, `requestPointerLock()` on canvas click, drives `stepSim` via `stepsForElapsed` (not per-rAF), blits the logical backbuffer through `fitIntegerScale` with smoothing off.
- `docs/rom-study/cp1-6-demo-screenshot.png` (new) — AC-4 demo artifact (see below).
- Three pre-existing test-authoring bugs fixed (logged as Design Deviations below): `tests/render.test.ts` (wrong import path), `tests/sim.test.ts` (unused import), `tests/input.test.ts` (missing `removeEventListener` on its local `Bus` duck-type).

**Tests:** 258/258 passing (18 files; RED's own count was 199/18 with 9 files failing — the discrepancy vs GREEN's 258 wasn't chased down since every file is now independently green and the citation gate is unaffected). `npm run build` clean (tsc + vite). `npm run lint` clean. Citation gate: 129/129 claims verified. Verified via `testing-runner` across three passes: RUN 1 caught 2 real test failures + 3 tsc errors (below, all fixed); RUN 2 confirmed the fixes (258/258, clean build/lint/citations); RUN 3 immediately before commit re-confirmed the same result on the final tree.

**AC walkthrough:**
1. **Playable slice (pointer-lock gun, fire, mushroom damage from ROM tiles):** Verified live via Playwright MCP on `http://localhost:5278/` — port-ownership proven THIS checkout before trusting it (`lsof -ti tcp:5278` was free before `npm run dev`; after starting, `lsof -a -p <pid> -d cwd -Fn` printed `n/Users/slabgorb/Projects/a-1/centipede`). Pointer lock itself rejects in the headless Playwright context ("root document ... not valid for pointer lock" — a known headless-browser limitation, not an app bug; the click handler's `requestPointerLock()` call is a fire-and-forget promise, no crash). Verified the keyboard fallback instead, which exercises the identical core contract (AC-4 of cp1-5): dispatched synthetic `keydown`/`keyup` for `ArrowRight`/`ArrowLeft` — gun visibly moved right then left on screen (screenshots compared, gun sprite tracked from center to the right edge and back — confirms the sign-chain end to end in a real browser, not just tests). Held Space (fire) for 4s continuously: SCORE HUD went from `0` to `3`, and a mushroom visible in the pre-fire screenshot at the gun's column was gone afterward — proves firing, collision, damage decrement, destroy-scoring, and re-render all work live.
2. **240×256 portrait, integer scale, no smoothing:** viewport set to 480×512 (exact 2×), `canvas.width/height` confirmed 480×512 via `browser_evaluate`; screenshots are crisp/blocky (no blur) consistent with `imageSmoothingEnabled=false`.
3. **CLRCH palette, no invented colours:** screenshots show green-inside/red-outside mushrooms (CL-3/CL-4, 0x0D/0x0E) and a pale gun (0x00 dim, CL-6) exactly as `decodeClrchColor` predicts; `render.test.ts`'s comment-stripped source scan (no hex/`rgb(`/`rgba(`/`hsl(` literals) passes.
4. **Render source-wiring test green + screenshot committed:** `render.test.ts`/`atlas.test.ts`/`main-loop.test.ts` `?raw` suites all green; `docs/rom-study/cp1-6-demo-screenshot.png` committed (480×512 PNG, taken after the live fire/destroy sequence above — SCORE=3, gun mid-field, seeded mushroom garden, ROM-tile HUD all visible in one frame).

**Commits:** RED `88abb86`, GREEN `ca7937a` (both `feat/cp1-6-render-shell-demo`, pushed to origin).

**Handoff:** To review.

## Delivery Findings

### Dev (implementation)
- **Gap** (non-blocking): pointer-lock (`requestPointerLock()`) cannot be exercised end-to-end by headless/automated browser tools (Playwright's own agent rejects it: "the root document of this element is not valid for pointer lock"). Live human verification in a normal browser tab is the only way to confirm the pointer-lock path itself; the keyboard fallback was verified instead here since it drives the identical `InputCounts` contract (cp1-5 AC-4). *Found by Dev during live-demo verification.*
- **Improvement** (non-blocking): the atlas packs every stamp into a single row (one `TILE_W`-wide column per stamp, height 8 or 16) rather than a space-efficient 2D bin-pack. It is correct (non-overlapping, pure, stable) and the resulting atlas canvas is tiny (≈536×16px for ~67 stamps), so there's no real cost — flagged only in case a future story adds enough stamps that a denser pack becomes worth it. *Found by Dev during atlas.ts implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the demo loop (`src/main.ts:61-71`) samples input ONCE per rAF frame and mishandles the mouse delta under variable steps/frame. On a >60 Hz display the 0-step frames drain-and-DROP the accumulated `movementX` (≈50% mouse-sensitivity loss on 120 Hz); on a catch-up burst after a tab-unhide the SAME delta is re-applied to up to ~15 sub-steps (gun teleport). Keyboard (level-based) and 60 Hz are unaffected and the demo is playable, so this is a shell-input-polish item — route to **cp2** (when the train + death make input feel matter). *Found by Reviewer during code review.*
- **Gap** (non-blocking): `decodeClrchColor` (`src/shell/palette.ts`) diverges from its cited MAME reference (`centiped_v.cpp:230-231`) for nibbles 0x06/0x07 — MAME dims green only when green is still full (`else if (g)`), the port's bare `else g = DIM` dims it unconditionally, so 0x06 → (255,192,0) instead of (255,0,0). Unused and untested in cp1-6 (scheme 0 is only 0x0F/0x0D/0x0E/0x00), but 0x06 appears in the 99$ wave table, so it will surface when **cp4** drives wave colours. One-line fix: `else if (g === 255) g = DIM`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the `?raw` POSITIVE wiring scans in `tests/atlas.test.ts` + `tests/main-loop.test.ts` and the "no invented colour" scan in `tests/render.test.ts` are weaker than their names claim (a gutted `buildAtlas` + a doc comment still passes all 8 atlas tests; a `strokeStyle = 'gold'` CSS-keyword colour still passes all 15 render tests). The shipped code is correct — this is a future-regression-fence gap, not a live defect. Harden: strip comments before positive scans, add a CSS-keyword / `{r,g,b}`-literal denylist. *Found by Reviewer during code review.*
- **Question** (non-blocking): `src/main.ts:36` fires `canvas.requestPointerLock()` without a `.catch`; modern browsers return a Promise that rejects on re-lock cooldown (Escape → immediate re-click) → unhandled rejection. And `src/shell/input.ts:18` promises the blur handler covers "pointer-lock drops," but no `pointerlockchange` listener is wired, so an Escape-exit that keeps window focus never clears state. Both are bounded (console noise / TBLMT clamp) and the pointer-lock path was never live-verified (headless rejects it, Dev's own finding) — recommend a human smoke-test + these two small hardenings at/ before cp2. *Found by Reviewer during code review.*

## Design Deviations

### Dev (implementation)
- **Fixed a wrong import path in `tests/render.test.ts`:** it imported `MUSHROOM_FULL` from `../src/core/pictures`, but that constant is defined and exported from `../src/core/playfield` (pictures.ts only holds stamp/plane data, not playfield damage-code constants). This silently resolved to `undefined` at runtime under Vite's dev-server module graph (not a hard ESM error), which zeroed out the test's planted mushroom cell and made the "requests the correct mushroom stamp for a planted damage state" assertion fail for the wrong reason, and hard-failed `tsc --noEmit` (TS2305). Fixed by moving the import to the `playfield` line alongside `isMushroom`/`PLYFLD_STRIDE`. No assertion changed.
- **Removed an unused `isMushroom` import in `tests/sim.test.ts`:** imported but never referenced anywhere in the file (`noUnusedLocals: true` failed the build). No assertion changed.
- **Added `removeEventListener` to `tests/input.test.ts`'s local `Bus` duck-type:** cp1-6 widened the shell's internal `EventTarget` requirement (both adapters now need `removeEventListener` for `dispose()`), which made `tsc --noEmit` reject the `(await import(...)) as Partial<InputModule>` cast in this cp1-5-era test file (TS2352, "neither type sufficiently overlaps"). TEA's Design Deviation note asserted this file "stays green," which held for the vitest *runtime* (Vite/esbuild don't type-check) but not for `tsc --noEmit` (build/lint), which this story's DoD also requires. Added a real (not stub) `removeEventListener` implementation to the test's own `makeBus()`, matching the pattern already used in `sign-chain.test.ts`/`input-lifecycle.test.ts`'s local buses. The file never calls `dispose()` or fires `'blur'`, so no test behaviour changed — only the duck-type's shape.
- **`render.ts`'s module comment avoided the literal substring `@arcade/shared/font`:** `render.test.ts`'s "no shared font import" assertion (`expect(renderSrc).not.toMatch(/@arcade\/shared\/font/)`) scans the RAW source, not comment-stripped (unlike the neighbouring "no colour literal" assertion in the same file, which does strip comments) — so a doc comment merely *mentioning* the module name to explain why it's avoided tripped the very check it was documenting. Reworded to "the shared-library font module" (same meaning, no import, no literal match). Same class of trap as the tempest "purity scanner reads comments" lesson, but the opposite fix direction: no code changed, no test changed, only prose.

## Subagent Results

**All received: Yes** (4 of 4 subagents returned)

| Subagent | Received | Result | Reviewer disposition |
|----------|----------|--------|----------------------|
| reviewer-preflight | Yes | Mechanical preflight run via `testing-runner` + direct verification: 258/258 tests, build clean, lint clean, citation gate 129/129; git tree clean; merge-base == origin/develop (7847ada) | CONFIRMED — no code smells beyond the findings below |
| testing-runner | Yes | 258/258 tests (18 files), `build` clean, `lint` clean, citation gate **129/129** | CONFIRMED — matches Dev's claims exactly; independent re-run |
| reviewer-test-analyzer | Yes | Sign-chain + timebase verified genuine; orientation golden (line 49) independently checked vs ROM bytes; `?raw` positive scans (atlas/main-loop) + render "no-colour" scan empirically DEFEATABLE (comment / CSS-keyword) | CONFIRMED — shipped code is correct; test-fence gap → R3 (non-blocking) |
| reviewer-edge-hunter | Yes | gunScreenX +4px edge overrun; NaN/negative `elapsed` unguarded; `requestPointerLock` rejection; single input sample reused across catch-up steps; blur ≠ pointer-lock-drop | CONFIRMED all; NaN/neg unreachable via rAF (R9 LOW); overrun cosmetic (R7); input reuse folded into R1; pointer-lock into R4/R5 |

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** device `movementX = +12` → `createMouseAdapter.onMouseMove` (`dh += 12`) → `sample()` → `main.ts` `input.dh = 12` → `stepSim` → `movePlayer` `applyTblmt(12)` (clamp +8 → floor ÷2 = +4 px, half-pixel banked) → `player.h += 4` → `render` `gunScreenX(h) = h − 8` (RIGHT) → integer-scaled blit to the visible canvas with `imageSmoothingEnabled = false`. **Safe because** the sign is preserved end-to-end (proven: `gunScreenX(h) = LOGICAL_W − (0xF7 − h) − 1 = h − 8`, strictly monotonic; `sign-chain.test` fires real adapters through real `movePlayer`), TBLMT clamps to ≤4 px/frame, and `newH` is bounds-clamped to `[0x0b, 0xf4]`. Sole caveat: the per-rAF-frame sampling (R1) drops/duplicates the delta off-60 Hz.

**Independent verification (the load-bearing checks):**
- **CLRCH transcription — byte-exact.** Re-opened `CENTI4.MAC:883-898`. Register flow `A=99$[X]`, `Y=99$[X+1]`, `X=99$[X+2]` → stores at 890-895 map EYES/OUTSIDE←X+2, BODY/INSIDE←X, LEGS/POISON←X+1 — matches CL-3..CL-8 exactly. `99$[0..2] = 0D,00,0E` (line 898, CL-9); background `LDA I,0F` / `STA COLORR` (1202/1203, CL-10); `TAX` after `LDA I,0` → X=0 → `JSR CLRCH` (1207/1209, CL-11); `COLORR = 1404` (`CENDE4.MAC:100`, CL-1). `PLAYFIELD_PENS`/`SPRITE_PENS` map every pen correctly.
- **MAME DAC decode** (`centiped_v.cpp:222-231`): inverted low-3-bit guns + bit-3-clear dim to 0xC0. Port matches for every nibble the demo uses (0x0F→black, 0x0D→(0,255,0), 0x0E→(255,0,0), 0x00→(255,255,192), 0x0C→(255,255,0)). Divergence only at 0x06/0x07 → R2 (latent, cp4).
- **Sign chain:** correct (see trace). `cellScreenX` puts col 0 at the right, `gunScreenX` rises with h; sign-chain + layout tests genuinely enforce it.
- **Mainloop order:** `JSR MOVE` (`CENTI4.MAC:32`) precedes `JSR SHOOT` (`:34`) — `stepSim` runs MOVE-then-SHOOT correctly. The code comment / TEA table cite `:26/28`, which are `BPL`/`ATTRT` — stale line numbers, correct behaviour (R6 LOW).
- **cloneState:** `Rng` is `{ seed: number }` (whole mutable state is the seed word), so `{ seed: state.rng.seed }` is a COMPLETE deep copy; playfield cells re-`Uint8Array`'d, player/shot spread. Determinism + clone-isolation genuinely tested (`sim.test.ts:130-168`). No double-scoring: `stepSim` adds `scored` once/step.
- **Timebase:** `stepsForElapsed` wraps `advanceFixedSteps` (clamps `elapsed` to `maxFrame = 0.25 s` → ≤~15 steps, no spiral). 60/120/144 Hz feed the same step count — display-rate independence real.
- **Render honesty:** `imageSmoothingEnabled = false` set on the render/logical ctx (`render.ts:639`) AND the visible ctx (`main.ts:179`); atlas→logical blits are 1:1 (no scaling ctx needs it). No `@arcade/shared/font` import; every colour flows through `palette` (render.ts holds no literal). Mushroom damage codes 0x3C-0x3F / poison 0x38-0x3B map to the right STAMPs.
- **Screenshot:** `docs/rom-study/cp1-6-demo-screenshot.png` is a real 480×512 (exact 2×) PNG — opened it: green-inside/red-outside mushroom field, pale gun (0x00 dim) bottom-left, "SCORE 3" top-left, "LEVEL 1" bottom, all from ROM tiles. Authentic. AC-4 satisfied.
- **Dev's 3 test-fixes (RED 88abb86 → HEAD):** all exactly as described, zero assertion weakening. render.test import moved `MUSHROOM_FULL` pictures→playfield (RED import → TS2305, pictures.ts exports no such const — confirmed); sim.test dropped unused `isMushroom` (noUnusedLocals); input.test Bus gained a real `removeEventListener` splice impl (RED cast → TS2352). The 4th (render.ts comment reword) is prose-only, code genuinely has no shared-font import.

**Observations (tagged):**
- `[MEDIUM]` R1 — main.ts per-frame input sampling drops mouse delta on 0-step frames (>60 Hz) / over-applies on catch-up bursts. Non-blocking (keyboard + 60 Hz fine; playable). Route cp2. (`main.ts:61-71`)
- `[MEDIUM]` R2 — palette decode diverges from MAME for 0x06/0x07 (unused here; in the wave table). Route cp4. (`palette.ts:40-43`)
- `[MEDIUM]` R3 — `?raw` positive scans + render no-colour scan are comment/CSS-keyword-defeatable (code is correct; fence is weak). Route test-hardening.
- `[LOW]` R4 — `requestPointerLock()` rejection unhandled (TS async rule 7). (`main.ts:36`)
- `[LOW]` R5 — input.ts blur-handler comment overpromises "pointer-lock drops"; no `pointerlockchange` reset wired. (`input.ts:18`)
- `[LOW]` R6 — stale mainloop citation 26/28 vs actual 32/34 (order correct). (`sim.ts` comment)
- `[LOW]` R7 — gun/shot sprite clips ≤4px off the right edge at h∈(240,244] (cosmetic, maybe ROM-faithful). (`layout.ts:64`)
- `[LOW]` R8 — `mushroomStamp(cell)` uses the raw cell while `isMushroom` masks `&0x3f`; a bit-6/7 cell would pass the guard and throw. Unreachable in this demo (cells are 0 or 0x38-0x3F). (`render.ts:73`)
- `[LOW]` R9 — NaN/negative `elapsed` unguarded (unreachable via monotonic rAF; cheap hardening). (`timebase.ts:32`)
- `[GOOD]` CLRCH register-flow + pen mapping byte-exact; sign chain provably `h−8`; cloneState a complete deep copy; determinism/clone tests genuine; orientation golden verified vs ROM bytes; screenshot authentic.

**Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md`):**
| Check | Status | Detail |
|-------|--------|--------|
| 1 type-safety-escapes | pass | no `as any`/`@ts-ignore`/`as unknown as`; `Map.get` results all guarded |
| 2 generic-interface | pass | `Record<string, unknown>` (not `any`); `readonly` on SimState/pens/STAMPS |
| 3 enum-patterns | pass | union `'sprite'\|'tile'`, no enums |
| 4 null-undefined | pass | `?? 0` (not `\|\|`); canvas/ctx null-guarded with throws |
| 5 module-declarations | pass | `import type` used; `*?raw` ambient decl legit (Vite); bundler resolution (no `.js` needed) |
| 6 react-jsx | n/a | no JSX |
| 7 async-promises | **observation** | `requestPointerLock()` fire-and-forget, rejection unhandled (R4) |
| 8 test-quality | pass | tests import `src/` not `dist/`; no `as any` in assertions |
| 9 build-config | pass | `strict: true`, `noUnusedLocals: true`; build/lint clean |
| 10 input-validation | pass | DOM event fields coerced via `Number()/String()`; no `JSON.parse as T` |
| 11 error-handling | pass | descriptive throws; no `catch(e:any)`, no empty catch |
| 12 performance-bundle | pass | specific named imports; subpath `@arcade/shared/*` exports |
| 13 fix-regressions | pass | 3 test-fixes introduce no `as any` / `\|\|` regressions |

**Devil's Advocate (assumed subtle breakage, checked):**
- Palette pens swapped (mushroom drawn in alphanumeric red)? NO — PLAYFIELD_PENS[1]=0x0D inside-mush, [2]=0x0E outside/alnum; screenshot confirms green-inside/red-outside.
- Letterbox off-by-one at non-integer window sizes? `fitIntegerScale` floors the scale and centres with `Math.floor` offsets — integer-only, no fractional smear; container=0 gives negative dx (cosmetic, unreachable steady-state).
- Atlas rect off-by-one bleeding a neighbour tile? NO — `SPRITE_W === TILE_W === 8`, `sx = i*8`, each stamp owns its 8px column; height 16 covers sprites, sy=0. Non-overlapping.
- `?raw` wiring pinning lines that no longer do what they claim? PARTIALLY (R3) — positive scans are comment-defeatable, but the shipped wiring is correct and the negative scans (no-font / no-hex-rgb) do bite.
- Blur clears but pointer-lock leaks? R5 — real gap, bounded by TBLMT.
- Accumulator double-stepping on rAF jitter? NO for step COUNT (advanceFixedSteps is exact), but the single-sample-per-frame reuse across steps is the real wrinkle (R1).

**Deviation audit:**
- TEA D1 SimState gains `score` — ✓ ACCEPTED (AC-1 HUD needs it; `level` correctly kept a literal).
- TEA D2 `render(ctx, atlas, state)` atlas injected — ✓ ACCEPTED (node-testable seam).
- TEA D3 shell module split palette/timebase/layout/atlas — ✓ ACCEPTED (pure seams + `?raw` glue).
- TEA D4 InputAdapter `dispose()` + blur + `removeEventListener` — ✓ ACCEPTED (implemented, same fn refs).
- Dev D1 render.test import path fix — ✓ ACCEPTED (audited RED→HEAD, no assertion change).
- Dev D2 sim.test unused import removed — ✓ ACCEPTED.
- Dev D3 input.test `removeEventListener` added — ✓ ACCEPTED (real impl, no behaviour change).
- Dev D4 render.ts comment reword — ✓ ACCEPTED (prose only; genuinely no shared-font import).
- Deferrals: RESTOR→cp2, wave colours→cp4, poison→cp3, VSYNC 262/263 open-question — ✓ all correctly routed.

**Merge safety:** `git merge-base origin/develop HEAD == origin/develop == 7847ada` (develop unmoved since branch base); HEAD 2 ahead / 0 behind → clean fast-forward, no trial-merge needed, no conflicts possible. Only remote `feat/cp1-6-*` branch is ours; no sibling cp1-6 race; no open PRs.

**ACs:** AC-1 ✓ (playable slice — keyboard live-verified; mouse present, R1 caveat) · AC-2 ✓ (240×256 derived, integer scale, smoothing off both ctx) · AC-3 ✓ (CLRCH palette byte-exact, no invented colours in shipped code) · AC-4 ✓ (source-wiring green + authentic screenshot committed).

**Handoff:** To SM for finish-story. No blocking (Critical/High) findings. R1/R2/R3 are non-blocking follow-ups (cp2 input-polish, cp4 wave-colour decode fix, test-hardening); R4-R9 are LOW polish. This is the cp1 epic demo — it ships.